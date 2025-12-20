/**
 * @file bitcoinfees.service.ts
 * @description Fetches and caches recommended Bitcoin fee rates from multiple providers (mempool.space, blockstream).
 */

import axios from 'axios';
import logger from './logger.service.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PROVIDER_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_PROVIDER_FAILURES = 3; // Tenta 3 vezes antes de acionar o circuit breaker

// Valores de segurança para o caso de falha total das APIs e sem cache (Cold Start).
// Estes valores representam a taxa da rede Bitcoin em satoshis por vByte (sat/vB).
// Ex: Uma transação de ancoragem (~154 vB) a 40 sat/vB custaria ao gateway ~6160 sats.
const HARDCODED_FALLBACK: FeeRates = {
  fastestFee: 50,
  halfHourFee: 40,
  hourFee: 20,
  economyFee: 10,
  minimumFee: 1,
};

let cachedFeeRates: { rates: FeeRates; timestamp: number } | null = null;

export interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

/**
 * Defines the structure for a fee rate provider.
 */
interface FeeProvider {
  name: string;
  fetch: () => Promise<FeeRates>;
  failureCount: number;
  lastFailure?: number;
}

const feeProviders: FeeProvider[] = [
  {
    name: 'Mempool.space',
    fetch: async () => {
      const { data } = await axios.get<FeeRates>('https://mempool.space/api/v1/fees/recommended');
      return data;
    },
    failureCount: 0,
  },
  {
    name: 'Blockstream',
    fetch: async () => {
      const { data } = await axios.get<Record<string, number>>('https://blockstream.info/api/fee-estimates');
      return {
        fastestFee: Math.ceil(data['1'] || 1),
        halfHourFee: Math.ceil(data['3'] || 1),
        hourFee: Math.ceil(data['6'] || 1),
        economyFee: Math.ceil(data['144'] || 1),
        minimumFee: 1,
      };
    },
    failureCount: 0,
  },
];

/**
 * Fetches the recommended fee rates from the mempool.space API.
 * It uses an in-memory cache to avoid fetching on every single request and to provide
 * fallback data in case of an API failure.
 * @returns A promise that resolves with the current fee rate recommendations.
 * @throws An error only if the API call fails and there is no cached data available.
 */
export async function getRecommendedFees(): Promise<FeeRates> {
  const now = Date.now();

  // 1. Check for a valid, non-stale cache first for performance.
  if (cachedFeeRates && now - cachedFeeRates.timestamp < CACHE_TTL_MS) {
    logger.info('[BitcoinFees] Returning cached fee rates.');
    return cachedFeeRates.rates;
  }

  logger.info('[BitcoinFees] Fetching fresh recommended fee rates...');
  const providerErrors: string[] = [];

  for (const provider of feeProviders) {
    // Circuit Breaker: Skip if recently failed
    if (provider.lastFailure && now - provider.lastFailure < PROVIDER_COOLDOWN_MS) {
      const msg = `Skipping provider ${provider.name} due to recent failure (Circuit Breaker).`;
      logger.warn(`[BitcoinFees] ${msg}`);
      providerErrors.push(msg);
      continue;
    }

    try {
      const rates = await provider.fetch();
      cachedFeeRates = { rates, timestamp: now };
      // Em caso de sucesso, zera o contador de falhas e o circuit breaker
      provider.failureCount = 0;
      provider.lastFailure = undefined;
      logger.info(`[BitcoinFees] Fetched rates from ${provider.name}: ${rates.halfHourFee} sat/vB (30m)`);
      return rates;
    } catch (error: any) {
      const errorMessage = `Provider ${provider.name} failed: ${error.message}`;
      logger.warn(`[BitcoinFees] ${errorMessage}`);
      providerErrors.push(errorMessage);
      provider.failureCount++; // Incrementa o contador de falhas
      if (provider.failureCount >= MAX_PROVIDER_FAILURES) {
        logger.error(`[BitcoinFees] Provedor ${provider.name} falhou ${MAX_PROVIDER_FAILURES} vezes. Acionando circuit breaker.`);
        provider.lastFailure = now; // Aciona o circuit breaker
      }
    }
  }

  logger.error('[BitcoinFees] All fee providers failed or were skipped.');

  // 2. If fetch fails, but we have a (stale) cached value, return it as a fallback.
  if (cachedFeeRates) {
    logger.warn('[BitcoinFees] Using stale fee rates as fallback due to API errors.');
    return cachedFeeRates.rates;
  }

  // 3. Last Resort: If no cache, use hardcoded values instead of throwing.
  logger.error(`[BitcoinFees] CRITICAL: Could not fetch fees from any source and no cache available. Using hardcoded fallback. Errors: [${providerErrors.join(', ')}]`);
  return HARDCODED_FALLBACK;
}