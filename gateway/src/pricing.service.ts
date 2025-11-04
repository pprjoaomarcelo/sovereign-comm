/**
 * @file pricing.service.ts
 * @description This service is responsible for calculating dynamic gateway fees.
 */

import { getRecommendedFees } from './bitcoinfees.service.js';
import logger from './logger.service.js';
import { getBtcPriceUsd } from './market-data.service.js'; // getStoragePricePerMbUsd is no longer needed
import { BATCH_SIZE } from './config.js';

// --- Constants for Pricing Model ---

// Estimated size of a Bitcoin transaction with 1 input and 2 outputs (OP_RETURN + change).
const ANCHOR_TX_VBYTES = 154;

// A base fee in satoshis to cover operational costs (amortized hardware, electricity, etc.).
// This is a simplified representation of the fixed costs we discussed.
const BASE_OPERATIONAL_FEE_SATS = 10;

// A small fixed fee per attachment to account for processing overhead.
const FEE_PER_ATTACHMENT_SATS = 5;

// Estimated cost for the gateway to store 1 byte for 1 year on its own infrastructure.
// This covers electricity, hardware amortization, bandwidth, etc.
const SATS_PER_BYTE_STORED = 0.002; // 1 MB = ~2000 sats

// A safety margin (in percent) to add to costs when using stale market data.
// This protects the gateway operator from price volatility when offline.
const STALE_DATA_RISK_MARGIN_PERCENTAGE = 5; // 5%

// A fallback on-chain fee in satoshis to use if the fee estimation API fails.
const ONCHAIN_ANCHOR_FEE_SATS_FALLBACK = 3000;

/**
 * Represents the basic information about an attachment needed for pricing.
 */
export interface AttachmentInfo {
  sizeBytes: number;
}

/**
 * Calculates the base cost for the gateway to process a single message.
 * This dynamic model considers payload size and current Bitcoin network fees,
 * amortizing the on-chain cost across the batch size.
 * @param payloadSize The size of the payload in bytes.
 * @param attachments An array of objects representing the attachments, each with a size in bytes.
 * @returns The **base cost** in satoshis for the gateway to process the message.
 */
export async function calculateFee(payloadSize: number, attachments: AttachmentInfo[] = []): Promise<number> {
  // 1. Calculate total data size
  const totalAttachmentSize = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0);
  const totalDataSize = payloadSize + totalAttachmentSize;

  // 2. Calculate data-related cost (storage, bandwidth)
  const { isStale } = await getBtcPriceUsd();
  if (isStale) {
    logger.warn('[Pricing] Using stale BTC price data. A risk margin will be applied.');
  }
  let dataCost = totalDataSize * SATS_PER_BYTE_STORED;
  // Apply risk margin if data is stale
  if (isStale) {
    dataCost *= (1 + (STALE_DATA_RISK_MARGIN_PERCENTAGE / 100));
  }

  // 3. Calculate a fixed cost per attachment
  const attachmentCountFee = attachments.length * FEE_PER_ATTACHMENT_SATS;

  // 4. Calculate on-chain anchoring cost for the entire batch
  let onChainAnchorFeeSats = ONCHAIN_ANCHOR_FEE_SATS_FALLBACK;
  try {
    const feeRates = await getRecommendedFees();
    // We aim for a confirmation within about 30 minutes.
    onChainAnchorFeeSats = Math.ceil(ANCHOR_TX_VBYTES * feeRates.halfHourFee);
  } catch (error) {
    logger.warn(`[Pricing] Could not fetch live fee rates. Using fallback value of ${onChainAnchorFeeSats} sats.`, { error: (error as Error).message });
  }

  // 5. Amortize the on-chain cost per message in the batch
  const perMessageAnchorCost = onChainAnchorFeeSats / BATCH_SIZE;

  // 6. Calculate total base cost for the gateway operator
  const totalCost = BASE_OPERATIONAL_FEE_SATS + dataCost + attachmentCountFee + perMessageAnchorCost;

  // Return a whole number of satoshis
  return Math.ceil(totalCost);
}