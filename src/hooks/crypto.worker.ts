/// <reference lib="webworker" />

import { deriveKeyFromPin, encryptData, decryptData } from '@/lib/crypto';

let derivedKey: CryptoKey | null = null;

/**
 * Handles messages sent from the main thread to the worker.
 * This acts as a router for cryptographic operations.
 */
self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'DERIVE_KEY': {
        const { pin, salt } = payload;
        if (!pin || !salt) throw new Error('PIN and salt are required to derive key.');
        derivedKey = await deriveKeyFromPin(pin, salt);
        self.postMessage({ type: 'DERIVE_KEY_SUCCESS' });
        break;
      }

      case 'ENCRYPT': {
        if (!derivedKey) throw new Error('Key not derived. Cannot encrypt.');
        const { data } = payload;
        const encryptedData = await encryptData(data, derivedKey);
        self.postMessage({ type: 'ENCRYPT_SUCCESS', payload: { encryptedData } });
        break;
      }

      case 'DECRYPT': {
        if (!derivedKey) throw new Error('Key not derived. Cannot decrypt.');
        const { encryptedData } = payload;
        const decryptedData = await decryptData(encryptedData, derivedKey);
        self.postMessage({ type: 'DECRYPT_SUCCESS', payload: { decryptedData } });
        break;
      }

      case 'CLEAR_KEY': {
        derivedKey = null;
        self.postMessage({ type: 'CLEAR_KEY_SUCCESS' });
        break;
      }

      default:
        throw new Error(`Unknown crypto worker action: ${type}`);
    }
  } catch (error) {
    // If any operation fails, post an error message back to the main thread.
    self.postMessage({
      type: 'CRYPTO_ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'An unknown error occurred in the crypto worker.',
      },
    });
  }
};

// This is a trick to make TypeScript happy about this file being a module.
export {};