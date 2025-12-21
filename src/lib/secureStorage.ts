import { StateStorage } from 'zustand/middleware';
import { cryptoProxy } from '@/lib/cryptoProxy';

/**
 * A simple in-memory cache for the PIN to avoid asking for it on every page load.
 * In a real app, this would be managed more securely, perhaps with a short-lived
 * session token or a more sophisticated caching strategy.
 */
let sessionPin: string | null = null;

export const getSessionPin = (): string | null => sessionPin;
export const setSessionPin = (pin: string | null): void => {
  sessionPin = pin;
};

const STORAGE_KEY = 'sovereign-comm-session';

/**
 * A custom storage object for Zustand's persist middleware.
 * It encrypts the session state before storing it in localStorage and
 * decrypts it upon retrieval, using the crypto worker.
 */
export const secureStorage: StateStorage = {
  /**
   * Retrieves and decrypts the state from localStorage.
   */
  getItem: async (name: string): Promise<string | null> => {
    console.log('[SecureStorage] getItem:', name);
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return null;

    try {
      const currentPin = getSessionPin();
      if (!currentPin) {
        console.warn('[SecureStorage] No PIN in session. Cannot decrypt.');
        // Returning null forces the app to treat the user as logged out.
        return null;
      }

      const { iv, ciphertext } = JSON.parse(storedValue);

      // The stored IV and ciphertext are likely plain arrays or objects.
      // We need to convert them back to Uint8Array for the crypto API.
      const ivArray = new Uint8Array(Object.values(iv));
      const ciphertextArray = new Uint8Array(Object.values(ciphertext));

      const decryptedState = await cryptoProxy.decryptWithPin({ iv: ivArray, ciphertext: ciphertextArray }, currentPin);

      const jsonString = new TextDecoder().decode(decryptedState);
      console.log('[SecureStorage] Decryption successful.');
      return jsonString;
    } catch (error) {
      console.error('[SecureStorage] Failed to decrypt state:', error);
      // If decryption fails (e.g., wrong PIN), clear the corrupt data and treat as logged out.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  /**
   * Encrypts and sets the state in localStorage.
   */
  setItem: async (name: string, value: string): Promise<void> => {
    console.log('[SecureStorage] setItem:', name);

    const currentPin = getSessionPin();
    if (!currentPin) {
      console.error('[SecureStorage] No PIN in session. Cannot encrypt and save state.');
      return;
    }

    const dataToEncrypt = new TextEncoder().encode(value);
    const encryptedData = await cryptoProxy.encryptWithPin(dataToEncrypt, currentPin);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedData));
    console.log('[SecureStorage] State encrypted and saved successfully.');
  },

  /**
   * Removes the state from localStorage.
   */
  removeItem: (name: string): void => {
    console.log('[SecureStorage] removeItem:', name);
    localStorage.removeItem(STORAGE_KEY);
    setSessionPin(null); // Clear the cached PIN on logout
  },
};