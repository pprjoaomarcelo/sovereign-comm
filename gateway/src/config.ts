/**
 * @file config.ts
 * @description Centralized configuration for the gateway.
 */

import 'dotenv/config';

export const PORT = process.env.PORT || 3000;
export const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10);
export const BATCH_TIMEOUT_MS = parseInt(process.env.BATCH_TIMEOUT_MS || '60000', 10); // 1 minute
export const MAX_ANCHOR_RETRIES = parseInt(process.env.MAX_ANCHOR_RETRIES || '3', 10); // Maximum number of retries for anchoring
export const INITIAL_RETRY_DELAY_MS = parseInt(process.env.INITIAL_RETRY_DELAY_MS || '300000', 10); // 5 minutes initial delay

// A unique identifier for this gateway instance.
export const GATEWAY_ID = process.env.GATEWAY_ID || 'gateway_alpha';

// --- Gateway Business Logic Configuration ---

// The fee percentage the gateway operator charges on top of the base cost. 20% = 0.20
export const GATEWAY_FEE_PERCENTAGE = parseFloat(process.env.GATEWAY_FEE_PERCENTAGE || '0.20');

// --- Pricing Model Configuration ---

// Estimated size of a Bitcoin transaction with 1 input and 2 outputs (OP_RETURN + change).
export const ANCHOR_TX_VBYTES = parseInt(process.env.ANCHOR_TX_VBYTES || '154', 10);

// A base fee in satoshis to cover amortized operational costs (hardware, electricity, etc.).
export const BASE_OPERATIONAL_FEE_SATS = parseInt(process.env.BASE_OPERATIONAL_FEE_SATS || '10', 10);

// A small fixed fee per attachment to account for processing overhead.
export const FEE_PER_ATTACHMENT_SATS = parseInt(process.env.FEE_PER_ATTACHMENT_SATS || '5', 10);

// Estimated cost in USD for the gateway to store 1 byte for 1 year.
export const USD_PER_BYTE_STORED = parseFloat(process.env.USD_PER_BYTE_STORED || '0.0000003'); // $0.30 per MB/year

// A safety margin (in percent) to add to costs when using stale market data.
export const STALE_DATA_RISK_MARGIN_PERCENTAGE = parseInt(process.env.STALE_DATA_RISK_MARGIN_PERCENTAGE || '5', 10);

// A fallback on-chain fee in satoshis to use if the fee estimation API fails.
export const ONCHAIN_ANCHOR_FEE_SATS_FALLBACK = parseInt(process.env.ONCHAIN_ANCHOR_FEE_SATS_FALLBACK || '3000', 10);