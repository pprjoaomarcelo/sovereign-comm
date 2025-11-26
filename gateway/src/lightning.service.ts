import axios from 'axios';
import logger from './logger.service.js';

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
  const apiKey = process.env.VOLTAGE_API_KEY;
  const nodeId = process.env.VOLTAGE_NODE_ID;

  if (!apiKey) {
    logger.error('[Lightning] VOLTAGE_API_KEY is not set.');
    throw new Error('VOLTAGE_API_KEY is not configured on the gateway.');
  }
  if (!nodeId) {
    logger.error('[Lightning] VOLTAGE_NODE_ID is not set.');
    throw new Error('VOLTAGE_NODE_ID is not configured on the gateway.');
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
    return { ...response.data, payment_hash: response.data.r_hash };
  } catch (error) {
    logger.error('[Lightning] Error creating invoice via Voltage API:', { error: (error as any).response?.data || (error as Error).message });
    throw new Error('Failed to create Lightning invoice via Voltage API.');
  }
}