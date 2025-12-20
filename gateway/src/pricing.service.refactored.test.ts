import { calculateFee } from './pricing.service.js';
import * as marketDataService from './market-data.service.js';
import * as bitcoinFeesService from './bitcoinfees.service.js';
import logger from './logger.service.js';

// Mock the external dependencies
jest.mock('./market-data.service.js');
jest.mock('./bitcoinfees.service.js');
jest.mock('./config.js', () => ({
  // Mock all config values used by the pricing service
  BATCH_SIZE: 100,
  BASE_OPERATIONAL_FEE_SATS: 10,
  FEE_PER_ATTACHMENT_SATS: 5,
  USD_PER_BYTE_STORED: 0.0000003, // $0.30/MB
  STALE_DATA_RISK_MARGIN_PERCENTAGE: 5,
  ONCHAIN_ANCHOR_FEE_SATS_FALLBACK: 3000,
  ANCHOR_TX_VBYTES: 154,
  GATEWAY_FEE_PERCENTAGE: 0.2, // 20%
}));
jest.mock('./logger.service.js');

const mockedMarketData = marketDataService as jest.Mocked<typeof marketDataService>;
const mockedBitcoinFees = bitcoinFeesService as jest.Mocked<typeof bitcoinFeesService>;

describe('Pricing Service (Refactored)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock for a happy path (live, non-stale data)
    mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 60000, isStale: false });
    mockedBitcoinFees.getRecommendedFees.mockResolvedValue({
      fastestFee: 50,
      halfHourFee: 30,
      hourFee: 20,
      economyFee: 10,
      minimumFee: 5,
    });
  });

  describe('calculateFee (Integration)', () => {
    it('should calculate a final fee correctly with live data', async () => {
      const payloadSize = 1000; // 1 KB
      const fee = await calculateFee(payloadSize, []);

      // --- Calculation Breakdown ---
      // 1. Data Cost (USD) = 1000 bytes * $0.0000003/byte = $0.0003
      // 2. Data Cost (sats) = ($0.0003 / $60000) * 100,000,000 = 0.5 sats
      // 3. Anchor Cost = (154 vBytes * 30 sat/vB) / 100 batch size = 46.2 sats
      // 4. Attachment Fee = 0 (no attachments)
      // 5. Base Operational Fee = 10 sats
      // 6. Total Base Cost = 0.5 + 46.2 + 0 + 10 = 56.7 sats
      // 7. Final Fee (with 20% profit) = 56.7 * 1.20 = 68.04 sats
      // 8. Ceil = 69 sats
      expect(fee).toBe(69);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should correctly add fees for multiple attachments', async () => {
      const payloadSize = 1000; // 1 KB
      const attachments = [{ sizeBytes: 500 }, { sizeBytes: 500 }]; // 2 attachments, total 1KB
      const fee = await calculateFee(payloadSize, attachments);

      // --- Calculation Breakdown ---
      // 1. Data Cost (sats) for 2KB = 1 sat
      // 2. Anchor Cost = 46.2 sats
      // 3. Attachment Fee = 2 attachments * 5 sats/attachment = 10 sats
      // 4. Base Operational Fee = 10 sats
      // 5. Total Base Cost = 1 + 46.2 + 10 + 10 = 67.2 sats
      // 6. Final Fee (with 20% profit) = 67.2 * 1.20 = 80.64 sats
      // 7. Ceil = 81 sats
      expect(fee).toBe(81);
    });
  });

  describe('getDataCostSats (via calculateFee)', () => {
    it('should apply a risk margin when market data is stale', async () => {
      // ARRANGE: Override the mock to return STALE data
      mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 60000, isStale: true });

      // ACT: Calculate the fee
      const fee = await calculateFee(1000, []);

      // --- Calculation Breakdown ---
      // 1. Data Cost (sats) = 0.5 sats
      // 2. Data Cost with 5% margin = 0.5 * 1.05 = 0.525 sats
      // 3. Anchor Cost = 46.2 sats
      // 4. Total Base Cost = 0.525 + 46.2 + 10 = 56.725 sats
      // 5. Final Fee (with 20% profit) = 56.725 * 1.20 = 68.07 sats
      // 6. Ceil = 69 sats
      expect(fee).toBe(69);
      expect(logger.warn).toHaveBeenCalledWith(
        '[Pricing] Using stale BTC price data. A risk margin will be applied.'
      );
    });
  });

  describe('getAnchorTransactionCostSats (via calculateFee)', () => {
    it('should use the fallback fee rate if the fee API fails', async () => {
      // ARRANGE: Mock the fee service to throw an error
      mockedBitcoinFees.getRecommendedFees.mockRejectedValue(new Error('API Down'));

      const fee = await calculateFee(1000, []);

      // --- Calculation Breakdown ---
      // 1. Data Cost (sats) = 0.5 sats
      // 2. Anchor Cost = 3000 (fallback) / 100 batch size = 30 sats
      // 3. Total Base Cost = 0.5 + 30 + 10 = 40.5 sats
      // 4. Final Fee (with 20% profit) = 40.5 * 1.20 = 48.6 sats
      // 5. Ceil = 49 sats
      expect(fee).toBe(49);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch live fee rates'),
        expect.any(Object)
      );
    });
  });
});