/**
 * @file bitcoinfees.service.ts
 * @description Fetches recommended Bitcoin fee rates.
 */

import axios from 'axios';
import logger from './logger.service.js';

const FEE_API_URL = 'https://mempool.space/api/v1/fees/recommended';

export interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export async function getRecommendedFees(): Promise<FeeRates> {
  try {
    const { data } = await axios.get<FeeRates>(FEE_API_URL);
    return data;
  } catch (error) {
    logger.error('[BitcoinFees] Failed to fetch recommended fee rates.', { error: (error as Error).message });
    throw new Error('Could not fetch Bitcoin fee rates.');
  }
}