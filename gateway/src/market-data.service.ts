/**
 * @file market-data.service.ts
 * @description Fetches and caches market data like cryptocurrency prices from multiple sources for resilience.
 */

import axios from 'axios';
import logger from './logger.service.js';
import { AppError } from './error.classes.js';

// How long to consider the price "fresh" (Time-To-Live)
const FRESH_TTL_MS = 5 * 60 * 1000; // 5 minutes

// How long we can use a stale price while revalidating (Stale-While-Revalidate TTL)
const STALE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedPrice {
  price: number;
  timestamp: number;
}

/**
 * Defines the structure for a price provider. Each provider knows how to fetch
 * the BTC price from a specific API.
 */
interface PriceProvider {
  name: string;
  fetch: () => Promise<number>;
}

// Array of price providers, ordered by preference.
const priceProviders: PriceProvider[] = [
  {
    name: 'CoinGecko',
    fetch: async () => {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      if (response.data?.bitcoin?.usd) {
        return response.data.bitcoin.usd;
      }
      throw new Error('Invalid response structure from CoinGecko');
    },
  },
  {
    name: 'CoinCap',
    fetch: async () => {
      const response = await axios.get('https://api.coincap.io/v2/assets/bitcoin');
      if (response.data?.data?.priceUsd) {
        return parseFloat(response.data.data.priceUsd);
      }
      throw new Error('Invalid response structure from CoinCap');
    },
  },
];

let btcPriceCache: CachedPrice | null = null;
let isRevalidating = false; // A lock to prevent multiple simultaneous fetches

/**
 * Fetches a fresh BTC price by trying a list of providers in order.
 * The first successful fetch updates the cache.
 */
async function revalidatePrice(): Promise<void> {
  if (isRevalidating) {
    return; // Another process is already fetching the price
  }
  isRevalidating = true;
  logger.info('[MarketData] Revalidating BTC/USD price...');

  const providerErrors: string[] = [];

  for (const provider of priceProviders) {
    try {
      const price = await provider.fetch();
      btcPriceCache = { price, timestamp: Date.now() };
      logger.info(`[MarketData] Cache updated with new price from ${provider.name}: ${price} USD`);
      isRevalidating = false;
      return; // Success, exit the loop
    } catch (error) {
      const errorMessage = `Provider ${provider.name} failed: ${(error as Error).message}`;
      logger.warn(`[MarketData] ${errorMessage}`);
      providerErrors.push(errorMessage);
    }
  }

  logger.error('[MarketData] All price providers failed. Cache remains stale.');
  isRevalidating = false;
  // Throw an error with details about each provider failure.
  throw new Error(`All market data providers failed. Errors: [${providerErrors.join(', ')}]`);
}

/**
 * Fetches the current BTC to USD price from CoinGecko.
 * Implements a "stale-while-revalidate" caching strategy for resilience and performance.
 * @returns An object containing the price and a flag indicating if the data is stale.
 */
export async function getBtcPriceUsd(): Promise<{ price: number; isStale: boolean }> {
  const now = Date.now();

  // 1. If we have a fresh cache, return it immediately.
  if (btcPriceCache && (now - btcPriceCache.timestamp < FRESH_TTL_MS)) {
    return { price: btcPriceCache.price, isStale: false };
  }

  // 2. If the cache is stale but still within the extended tolerance (STALE_TTL_MS),
  // return the stale data immediately and trigger a revalidation in the background.
  if (btcPriceCache && (now - btcPriceCache.timestamp < STALE_TTL_MS)) {
    logger.info('[MarketData] Returning stale price and revalidating in background.');
    // Fire-and-forget: we don't wait for this to complete.
    revalidatePrice().catch(error => {
      logger.error('[MarketData] Background revalidation failed.', { error: (error as Error).message });
    });
    return { price: btcPriceCache.price, isStale: true };
  }

  // 3. If there's no cache or the cache is excessively old, perform a blocking fetch.
  // This only happens on the very first call or if the API has been down for over an hour.
  logger.warn('[MarketData] No cache or cache is too old. Performing a blocking fetch.');
  try {
    await revalidatePrice(); // Wait for the fetch to complete.
  } catch (error: any) {
    // If revalidation fails and we still have no cache, it's a critical failure.
    if (!btcPriceCache) {
      throw new AppError(`Could not retrieve BTC/USD market price. ${error.message}`, 503);
    }
  }

  return { price: btcPriceCache.price, isStale: !btcPriceCache };
}