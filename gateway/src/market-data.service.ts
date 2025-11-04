/**
 * @file market-data.service.ts
 * @description Fetches and caches market data like cryptocurrency prices.
 */

import axios from 'axios';
import logger from './logger.service.js';

const BTC_PRICE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedPrice {
  price: number;
  timestamp: number;
}

let btcPriceCache: CachedPrice | null = null;

/**
 * Fetches the current BTC to USD price from CoinGecko.
 * Implements a simple in-memory cache to avoid rate-limiting.
 * @returns An object containing the price and a flag indicating if the data is stale.
 */
export async function getBtcPriceUsd(): Promise<{ price: number; isStale: boolean }> {
  const now = Date.now();

  if (btcPriceCache && (now - btcPriceCache.timestamp < BTC_PRICE_CACHE_TTL_MS)) {
    return { price: btcPriceCache.price, isStale: false };
  }

  try {
    logger.info('[MarketData] Fetching fresh BTC/USD price from CoinGecko...');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const price = response.data.bitcoin.usd;
    btcPriceCache = { price, timestamp: now };
    return { price, isStale: false };
  } catch (error) {
    logger.error('[MarketData] Failed to fetch BTC price. Using cached or fallback value.', { error: (error as Error).message });
    // If we have a cached value, use it but flag it as stale. Otherwise, fallback to a safe, high number.
    return { price: btcPriceCache?.price || 70000, isStale: true };
  }
}