import axios from 'axios';
import { getRecommendedFees, FeeRates } from './bitcoinfees.js';
import logger from './logger.service.js';

// Mock the logger to prevent console output during tests
jest.mock('./logger.service', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockFeeRates: FeeRates = {
  fastestFee: 100,
  halfHourFee: 50,
  hourFee: 20,
  economyFee: 10,
  minimumFee: 1,
};

describe('getRecommendedFees', () => {
  // Reset modules before each test to clear cache
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should fetch and return fee rates on the first call', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockFeeRates,
    });

    const fees = await getRecommendedFees();

    expect(fees).toEqual(mockFeeRates);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('[BitcoinFees] Fetching recommended fee rates...');
  });

  it('should return cached fee rates on subsequent calls', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: mockFeeRates,
    });

    await getRecommendedFees(); // First call to cache
    const fees = await getRecommendedFees(); // Second call

    expect(fees).toEqual(mockFeeRates);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1
    expect(logger.info).toHaveBeenCalledWith('[BitcoinFees] Returning cached fee rates.');
  });

  it('should throw an error if the API response is not 200', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 500,
      data: 'Internal Server Error',
    });

    await expect(getRecommendedFees()).rejects.toThrow('Failed to fetch Bitcoin fee rates.');
    expect(logger.error).toHaveBeenCalledWith(
        '[BitcoinFees] Error fetching fee rates.',
        expect.objectContaining({
            error: 'Invalid response from mempool.space API: 500'
        })
    );
  });

  it('should throw an error if the axios request fails', async () => {
    const errorMessage = 'Network Error';
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));

    await expect(getRecommendedFees()).rejects.toThrow('Failed to fetch Bitcoin fee rates.');
    expect(logger.error).toHaveBeenCalledWith(
        '[BitcoinFees] Error fetching fee rates.',
        expect.objectContaining({
            error: errorMessage
        })
    );
  });
});