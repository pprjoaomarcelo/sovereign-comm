/**
 * @file pricing.service.ts
 * @description This service is responsible for calculating dynamic gateway fees.
 */

import { getRecommendedFees } from './bitcoinfees.service.js';
import logger from './logger.service.js'; // getStoragePricePerMbUsd is no longer needed
import { getBtcPriceUsd } from './market-data.service.js';
import { config } from './config.service.js';
import { AppError } from './error.classes.js';

/**
 * Represents the basic information about an attachment needed for pricing.
 */
export interface AttachmentInfo {
  sizeBytes: number;
}

/**
 * Fetches the current on-chain fee rate, with a fallback mechanism.
 * @returns The estimated cost in satoshis for a single anchor transaction.
 * @throws {AppError} If live fee rates cannot be fetched and no cached data is available.
 */
async function getAnchorTransactionCostSats(): Promise<number> {
  try {
    const feeRates = await getRecommendedFees();
    // We aim for a confirmation within about 30 minutes.
    return Math.ceil(config.anchorTxVBytes * feeRates.halfHourFee);
  } catch (error: any) {
    // This catch block is now for a catastrophic failure where getRecommendedFees
    // could neither fetch live data nor return a stale cached value.
    logger.error(
      `[Pricing] CRITICAL: Could not get fee rates from bitcoinfees.service.`,
      { error: error.message }
    );
    throw new AppError('Could not retrieve live Bitcoin fee rates to calculate cost.', 503);
  }
}

/**
 * Calculates the cost related to data storage, converting from USD to satoshis.
 * Applies a risk margin if the BTC/USD price data is stale.
 * @param totalDataSize The total size of the data in bytes.
 * @returns The cost of data storage in satoshis. * @throws {AppError} If the BTC/USD price cannot be fetched.
 */
async function getDataCostSats(totalDataSize: number): Promise<number> {
  let priceResult;
  try {
    priceResult = await getBtcPriceUsd();
  } catch (error: any) {
    // Propagate the detailed error from the market data service.
    throw error;
  }

  const { price: btcPrice, isStale } = priceResult;

  if (isStale) {
    logger.warn(
      '[Pricing] Using stale BTC price data. A risk margin will be applied.'
    );
  }

  // Calculate storage cost in USD first, then convert to sats
  const dataCostUsd = totalDataSize * config.usdPerByteStored;
  let dataCostSats = (dataCostUsd / btcPrice) * 100_000_000; // Convert USD to Sats

  // Apply risk margin if data is stale
  if (isStale) {
    dataCostSats *= 1 + config.staleDataRiskMarginPercentage / 100;
  }

  return dataCostSats;
}

/**
 * Calculates the base cost for the gateway to process a single message.
 * This dynamic model considers payload size and current Bitcoin network fees,
 * amortizing the on-chain cost across the batch size.
 * @param payloadSize The size of the payload in bytes.
 * @param attachments An array of objects representing the attachments, each with a size in bytes.
 * @returns The **base cost** in satoshis for the gateway to process the message.
 */
export async function calculateFee(
  payloadSize: number,
  attachments: AttachmentInfo[] = []
): Promise<number> {
  // 0. Check for Emergency Mode
  if (config.emergencyMode) {
    logger.warn('[Pricing] Emergency Mode active. Using fixed emergency fee.');
    return config.emergencyFeeSats;
  }

  // 1. Calculate individual cost components
  const totalAttachmentSize = attachments.reduce(
    (sum, attachment) => sum + attachment.sizeBytes,
    0
  );
  const totalDataSize = payloadSize + totalAttachmentSize;

  const dataCostSats = await getDataCostSats(totalDataSize);
  const onChainAnchorFeeSats = await getAnchorTransactionCostSats();

  // 2. Calculate fixed and per-message costs
  const attachmentCountFee = attachments.length * config.feePerAttachmentSats;
  const perMessageAnchorCost = onChainAnchorFeeSats / config.batchSize;

  // 3. Calculate total base cost for the gateway operator
  const totalBaseCost =
    config.baseOperationalFeeSats + dataCostSats + attachmentCountFee + perMessageAnchorCost;

  // 4. Add operator's profit margin
  const finalFee = totalBaseCost * (1 + config.gatewayFeePercentage);

  // Return a whole number of satoshis
  return Math.ceil(finalFee);
}