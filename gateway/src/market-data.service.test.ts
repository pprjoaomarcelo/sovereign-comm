import axios from 'axios';
import { getBtcPriceUsd } from './market-data.service.js';
import logger from './logger.service.js';

// Mock the logger
jest.mock('./logger.service', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getBtcPriceUsd', () => {
  // Use jest.resetModules() to clear the module cache between tests
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); 
  });

  it('should fetch and return the BTC price', async () => {
    const price = 65000;
    mockedAxios.get.mockResolvedValue({
      data: { bitcoin: { usd: price } },
    });

    const result = await getBtcPriceUsd();

    expect(result.price).toBe(price);
    expect(result.isStale).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('[MarketData] Fetching fresh BTC/USD price from CoinGecko...');
  });

  it('should return a cached price on subsequent calls', async () => {
    const price = 65000;
    mockedAxios.get.mockResolvedValueOnce({
      data: { bitcoin: { usd: price } },
    });

    await getBtcPriceUsd(); // First call
    const result = await getBtcPriceUsd(); // Second call

    expect(result.price).toBe(price);
    expect(result.isStale).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not fetch again
  });

  it('should return the fallback price and log an error when the API fails without a cache', async () => {
    const errorMessage = 'API is down';
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));

    const result = await getBtcPriceUsd();

    expect(result.price).toBe(70000); // Fallback price
    expect(result.isStale).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      '[MarketData] Failed to fetch BTC price. Using cached or fallback value.',
      { error: errorMessage }
    );
  });

  it('should return the stale cached price and log an error when the API fails with a cache', async () => {
    const cachedPrice = 65000;
    // First, successfully cache the price
    mockedAxios.get.mockResolvedValueOnce({ data: { bitcoin: { usd: cachedPrice } } });
    await getBtcPriceUsd();

    // Now, make the API fail
    const errorMessage = 'API is down';
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));

    const result = await getBtcPriceUsd();

    expect(result.price).toBe(cachedPrice); // Stale cached price
    expect(result.isStale).toBe(true);
    expect(logger.error).toHaveBeenCalledWith(
      '[MarketData] Failed to fetch BTC price. Using cached or fallback value.',
      { error: errorMessage }
    );
  });
});