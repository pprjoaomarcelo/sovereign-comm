import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axios from 'axios';
import { createLnBitsInvoice, checkInvoice } from './lnbits';

// Mock the entire axios module
vi.mock('axios');

describe('LNbits Service', () => {
  const VITE_LNBITS_URL = 'https://legend.lnbits.com';
  const VITE_LNBITS_INVOICE_KEY = 'test_invoice_key';

  beforeEach(() => {
    // Mock environment variables for Vite
    vi.stubGlobal('import.meta.env', {
      VITE_LNBITS_URL,
      VITE_LNBITS_INVOICE_KEY,
    });
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  // --- Tests for createLnBitsInvoice ---
  describe('createLnBitsInvoice', () => {
    it('should create an invoice successfully and return payment details', async () => {
      const mockResponse = {
        payment_hash: 'mock_payment_hash_123',
        payment_request: 'lnbc_mock_payment_request_456',
      };
      // Make axios.post return our mock response
      (axios.post as vi.Mock).mockResolvedValue({ data: mockResponse });

      const amount = 150;
      const memo = 'Test sovereign-comm invoice';
      const result = await createLnBitsInvoice(amount, memo);

      // Check if axios.post was called with the correct arguments
      expect(axios.post).toHaveBeenCalledWith(
        `${VITE_LNBITS_URL}/api/v1/payments`,
        { out: false, amount, memo },
        {
          headers: {
            'X-Api-Key': VITE_LNBITS_INVOICE_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      // Check if the function returns the correct data
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if the invoice amount is zero or less', async () => {
      await expect(createLnBitsInvoice(0, 'Invalid amount')).rejects.toThrow(
        'Invoice amount must be greater than zero.'
      );
      await expect(createLnBitsInvoice(-100, 'Negative amount')).rejects.toThrow(
        'Invoice amount must be greater than zero.'
      );
    });

    it('should throw a generic error if the API call fails', async () => {
      // Simulate a network error
      (axios.post as vi.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(createLnBitsInvoice(100, 'Test')).rejects.toThrow(
        'Failed to communicate with the LNbits API to create the invoice.'
      );
    });
  });

  // --- Tests for checkInvoice ---
  describe('checkInvoice', () => {
    it('should return the paid status of an invoice', async () => {
      const mockPaymentHash = 'mock_payment_hash_abc';
      const mockResponse = { paid: true };
      (axios.get as vi.Mock).mockResolvedValue({ data: mockResponse });

      const result = await checkInvoice(mockPaymentHash);

      // Check if axios.get was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        `${VITE_LNBITS_URL}/api/v1/payments/${mockPaymentHash}`,
        {
          headers: { 'X-Api-Key': VITE_LNBITS_INVOICE_KEY, 'Content-Type': 'application/json' },
        }
      );
      // Check if the function returns the correct status
      expect(result).toEqual(mockResponse);
    });
  });
});