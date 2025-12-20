/**
 * This module acts as a proxy to the crypto Web Worker.
 * It abstracts away the message passing logic, providing a clean
 * async/await API for the rest of the application to use.
 * The actual cryptographic operations are performed in the sandboxed worker.
 */

import CryptoWorker from '@/workers/crypto.worker.ts?worker';

let worker: Worker;

function getWorker(): Worker {
  if (!worker) {
    worker = new CryptoWorker();
  }
  return worker;
}

/**
 * A generic function to send a command to the worker and await a response.
 * @param type The action type for the worker to perform.
 * @param payload The data required for the action.
 * @returns A promise that resolves with the worker's response payload.
 */
function callWorker<T>(type: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const workerInstance = getWorker();

    const messageHandler = (event: MessageEvent) => {
      // Remove the listener to avoid memory leaks
      workerInstance.removeEventListener('message', messageHandler);

      if (event.data.type.endsWith('_SUCCESS')) {
        resolve(event.data.payload);
      } else if (event.data.type === 'CRYPTO_ERROR') {
        reject(new Error(event.data.payload.message));
      }
    };

    workerInstance.addEventListener('message', messageHandler);
    workerInstance.postMessage({ type, payload });
  });
}

export const cryptoProxy = {
  deriveKey: (pin: string, salt: Uint8Array): Promise<void> => {
    return callWorker('DERIVE_KEY', { pin, salt });
  },

  encrypt: async (data: string): Promise<string> => {
    const result = await callWorker<{ encryptedData: string }>('ENCRYPT', { data });
    return result.encryptedData;
  },

  decrypt: async (encryptedData: string): Promise<string> => {
    const result = await callWorker<{ decryptedData: string }>('DECRYPT', { encryptedData });
    return result.decryptedData;
  },

  clearKey: (): Promise<void> => {
    return callWorker('CLEAR_KEY', {});
  },

  terminate: (): void => {
    if (worker) {
      worker.terminate();
    }
  },
};