import { calculateFee } from './pricing.service.js';
import * as marketDataService from './market-data.service.js';
import * as bitcoinFeesService from './bitcoinfees.service.js';
import * as config from './config.js';
import logger from './logger.service.js';

// Mock the external dependencies
jest.mock('./market-data.service.js');
jest.mock('./bitcoinfees.service.js');
jest.mock('./config.js', () => ({
  BATCH_SIZE: 100, // Use a fixed value for predictable tests
}));
jest.mock('./logger.service.js');

const mockedMarketData = marketDataService as jest.Mocked<typeof marketDataService>;
const mockedBitcoinFees = bitcoinFeesService as jest.Mocked<typeof bitcoinFeesService>;

describe('Pricing Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock for a happy path (live, non-stale data)
    mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 60000, isStale: false });
    mockedMarketData.getStoragePricePerMbUsd.mockReturnValue(0.0052);
    mockedBitcoinFees.getRecommendedFees.mockResolvedValue({
      fastestFee: 50,
      halfHourFee: 30,
      hourFee: 20,
      economyFee: 10,
      minimumFee: 5,
    });
  });

  it('should calculate a base fee correctly with live data', async () => {
    const payloadSize = 1024 * 1024; // 1 MB
    const fee = await calculateFee(payloadSize);

    // --- Calculation Breakdown ---
    // Base Op Fee: 10 sats
    // Data Cost: (0.0052 USD/MB / 1MB) * (100,000,000 sats / 60000 USD) = ~8.67 sats
    // Anchor Cost: (154 vBytes * 30 sat/vB) / 100 batch size = 46.2 sats
    // Total = 10 + 8.67 + 46.2 = 64.87 => Math.ceil = 65
    expect(fee).toBe(65);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should apply a risk margin when using stale market data', async () => {
    // ARRANGE: Override the mock to return STALE data
    mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 60000, isStale: true });

    const payloadSize = 1024 * 1024; // 1 MB

    // ACT: Calculate the fee
    const fee = await calculateFee(payloadSize);

    // --- Calculation Breakdown ---
    // Base Op Fee: 10 sats
    // Data Cost (base): ~8.67 sats
    // Data Cost with 5% margin: 8.67 * 1.05 = ~9.10 sats
    // Anchor Cost: 46.2 sats
    // Total = 10 + 9.10 + 46.2 = 65.3 => Math.ceil = 66
    expect(fee).toBe(66);

    // ASSERT: Verify that a warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      '[Pricing] Using stale BTC price data. A risk margin will be applied.'
    );
  });
});