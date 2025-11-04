import axios from 'axios';
import fs from 'fs/promises';
import { createSign } from 'crypto';
import { getBtcPriceUsd } from './market-data.service.js';
import logger from './logger.service.js';

// Mock the dependencies
jest.mock('axios');
jest.mock('fs/promises');
jest.mock('./logger.service.js');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

// Use the same placeholder keys as in the service to generate a valid signature for tests
const TEST_PRIVATE_KEY = process.env.GATEWAY_SIGNING_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIL6p2k/Xv2bV8Yg0Z7E5t7y5a5a5a5a5a5a5a5a5a5a5\n-----END PRIVATE KEY-----';
const FALLBACK_PRICE = 60000;

describe('Market Data Service - Security', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should reject a tampered cache file and use the fallback price', async () => {
    // 1. SETUP: Simulate network failure to force cache usage
    mockedAxios.get.mockRejectedValue(new Error('Network is down'));

    // 2. SETUP: Create a valid signature for an *original* payload
    const originalPrice = 50000;
    const originalTimestamp = Date.now() - 10000; // A time in the past
    const originalPayload = `${originalPrice}|${originalTimestamp}`;

    const sign = createSign('SHA256');
    sign.update(originalPayload);
    sign.end();
    const validSignatureForOriginalData = sign.sign(TEST_PRIVATE_KEY, 'hex');

    // 3. SETUP: Create the TAMPERED cache object.
    // The price is altered, but the signature is for the original price.
    const tamperedCache = {
      btcPriceUsd: 99999, // Maliciously altered price!
      timestamp: originalTimestamp,
      signature: validSignatureForOriginalData, // Signature no longer matches the payload
    };

    // 4. SETUP: Mock fs.readFile to return the tampered cache content
    mockedFs.readFile.mockResolvedValue(JSON.stringify(tamperedCache));

    // 5. EXECUTION: Call the function
    const result = await getBtcPriceUsd();

    // 6. ASSERTION: Verify that the service rejected the bad data and used the safe fallback
    expect(result.price).toBe(FALLBACK_PRICE);
    expect(result.isStale).toBe(true);

    // Also, verify that a critical error was logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not read from file cache'),
      expect.objectContaining({
        fileError: expect.any(Error),
      })
    );
  });
});