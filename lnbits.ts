import axios from 'axios';

/**
 * Gets a required environment variable.
 * Throws an error if the variable is not defined.
 * @param key - The name of the environment variable.
 * @returns The value of the environment variable.
 */
const getEnv = (key: string): string => {
  // On the client-side (Vite), environment variables are accessed via import.meta.env
  // On the server-side (gateway), it would be process.env.
  // This implementation assumes a Vite environment.
  const value = import.meta.env[key];
  if (!value) {
    console.error(`Variável de ambiente obrigatória não definida: ${key}`);
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value as string;
};

/**
 * Creates a Lightning invoice using the LNbits API.
 *
 * @param amount - The invoice amount in satoshis.
 * @param memo - The invoice description (memo).
 * @returns A promise that resolves to an object containing payment_request and payment_hash.
 */
export const createLnBitsInvoice = async (
  amount: number,
  memo: string
): Promise<{ payment_request: string; payment_hash: string }> => {
  const lnbitsUrl = getEnv('VITE_LNBITS_URL');
  const invoiceKey = getEnv('VITE_LNBITS_INVOICE_KEY');

  if (amount <= 0) {
    throw new Error('Invoice amount must be greater than zero.');
  }

  try {
    const { data } = await axios.post(
      `${lnbitsUrl}/api/v1/payments`,
      {
        out: false, // 'out: false' to create a receivable invoice
        amount,
        memo,
      },
      {
        headers: {
          'X-Api-Key': invoiceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return data; // The LNbits API already returns { payment_request, payment_hash, ... }
  } catch (error: any) {
    console.error('Error creating LNbits invoice:', error.response?.data || error.message);
    throw new Error('Failed to communicate with the LNbits API to create the invoice.');
  }
};

/**
 * Checks the status of a Lightning invoice using the LNbits API.
 *
 * @param payment_hash - The payment hash of the invoice to check.
 * @returns A promise that resolves to an object containing the payment status.
 */
export const checkInvoice = async (payment_hash: string): Promise<{ paid: boolean }> => {
  const lnbitsUrl = getEnv('VITE_LNBITS_URL');
  const invoiceKey = getEnv('VITE_LNBITS_INVOICE_KEY');

  const { data } = await axios.get(`${lnbitsUrl}/api/v1/payments/${payment_hash}`, {
    headers: { 'X-Api-Key': invoiceKey, 'Content-Type': 'application/json' },
  });

  return data; // The API returns an object that includes the 'paid' property
};