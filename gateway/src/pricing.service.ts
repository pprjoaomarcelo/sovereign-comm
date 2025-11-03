/**
 * @file pricing.service.ts
 * @description This service is responsible for calculating dynamic gateway fees.
 */

import { getRecommendedFees } from './bitcoinfees.service.js';
import logger from './logger.service.js';

// --- Constants for Pricing Model ---

// Estimated size of a Bitcoin transaction with 1 input and 2 outputs (OP_RETURN + change).
const ANCHOR_TX_VBYTES = 150;

// A base fee in satoshis to cover operational costs for every request.
const BASE_FEE_SATS = 10;

// A small fee per byte to account for IPFS/Filecoin storage and bandwidth.
const SATS_PER_BYTE = 0.001;

// A fallback on-chain fee in satoshis to use if the fee estimation API fails.
const ONCHAIN_ANCHOR_FEE_SATS_FALLBACK = 250;

/**
 * Calculates the fee for processing a message payload.
 * This dynamic model considers payload size and current Bitcoin network fees.
 * @param payloadSize The size of the payload in bytes.
 * @returns The fee in satoshis.
 * @returns The **base cost** in satoshis for the gateway to process the message.
 */
export async function calculateFee(payloadSize: number): Promise<number> {
  // 1. Calculate data-related cost
  const dataCost = payloadSize * SATS_PER_BYTE;

  // 2. Calculate on-chain anchoring cost
  let onChainAnchorFeeSats = ONCHAIN_ANCHOR_FEE_SATS_FALLBACK;
  try {
    const feeRates = await getRecommendedFees();
    // We aim for a confirmation within about 30 minutes.
    onChainAnchorFeeSats = Math.ceil(ANCHOR_TX_VBYTES * feeRates.halfHourFee);
  } catch (error) {
    logger.warn(`[Pricing] Could not fetch live fee rates. Using fallback value of ${onChainAnchorFeeSats} sats.`, { error });
  }

  // 3. Calculate total base cost for the gateway operator
  const totalCost = BASE_FEE_SATS + dataCost + onChainAnchorFeeSats;

  // Return a whole number of satoshis
  return Math.ceil(totalCost);
}