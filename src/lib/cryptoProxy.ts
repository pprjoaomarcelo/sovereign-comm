/**
 * Crypto proxy for secure key derivation and encryption
 */
import { deriveKeyFromPin, encryptData, decryptData } from '@/hooks/crypto';

let derivedKey: CryptoKey | null = null;

export const cryptoProxy = {
  async deriveKey(pin: string, salt: Uint8Array): Promise<void> {
    derivedKey = await deriveKeyFromPin(pin, salt);
  },

  async encrypt(data: string): Promise<string> {
    if (!derivedKey) {
      throw new Error('Key not derived. Call deriveKey first.');
    }
    return encryptData(data, derivedKey);
  },

  async decrypt(encryptedData: string): Promise<string> {
    if (!derivedKey) {
      throw new Error('Key not derived. Call deriveKey first.');
    }
    return decryptData(encryptedData, derivedKey);
  },

  clearKey(): void {
    derivedKey = null;
  },
};
