import axios, { AxiosError } from 'axios';
import logger from './logger.service.js';
import { AppError } from './error.classes.js';

const VOLTAGE_API_URL = 'https://backend.voltage.cloud/api/v1';

/**
 * Represents the structure of a Lightning invoice.
 */
export interface Invoice {
  payment_hash: string;
  payment_request: string;
  expires_at: string;
  memo: string;
  amount_msat: number;
}

/**
 * Creates a Lightning invoice using the Voltage.cloud API. This function now
 * expects the amount in millisatoshis to align with the Lightning Network standard.
 * @param amountMsat The amount for the invoice in millisatoshis.
 * @param memo A description for the invoice.
 * @returns A promise that resolves with the invoice details.
 * @throws {Error} If environment variables are not set or API call fails.
 */
export async function createLightningInvoice(amountMsat: number, memo: string): Promise<Invoice> {
  const { VOLTAGE_API_KEY: apiKey, VOLTAGE_NODE_ID: nodeId } = process.env;

  if (!apiKey) {
    logger.error('[Lightning] VOLTAGE_API_KEY is not set.');
    // This is a critical server misconfiguration.
    throw new AppError('Lightning service is not configured on the gateway.', 500);
  }
  if (!nodeId) {
    logger.error('[Lightning] VOLTAGE_NODE_ID is not set.');
    throw new AppError('Lightning service is not configured on the gateway.', 500);
  }

  const voltageApi = axios.create({
    baseURL: VOLTAGE_API_URL,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  logger.info(`[Lightning] Creating Voltage invoice for ${amountMsat} msats with memo: "${memo}"`);

  try {
    const response = await voltageApi.post(`/node/${nodeId}/invoices`, {
      msatoshi: amountMsat,
      description: memo,
      expiry: 3600, // 1 hour
    });

    // A resposta da API do Voltage já corresponde à nossa interface 'Invoice'.
    // O 'r_hash' é o payment_hash.
    return { ...response.data, payment_hash: response.data.r_hash as string };
  } catch (err) {
    const error = err as AxiosError;
    logger.error('[Lightning] Error creating invoice via Voltage API:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Propagate specific errors to the gateway
    if (error.response?.status === 401) {
      throw new AppError('Lightning provider authentication failed. Check API Key.', 500);
    }

    // For other errors (5xx, network timeout), treat as a temporary service unavailability.
    throw new AppError('The Lightning payment provider is temporarily unavailable.', 503);
  }
}