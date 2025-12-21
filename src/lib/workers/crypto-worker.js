/**
 * @file This is the Web Worker for cryptographic operations.
 * It runs in a separate thread from the main UI, ensuring that heavy
 * cryptographic functions do not block the user interface.
 * It uses Comlink to expose its methods to the main thread.
 */

import * as Comlink from 'comlink';
import { pbkdf2, sha256, hkdf } from 'noble-hashes';

const SALT = new TextEncoder().encode('sovereign-crypto-salt-v1');
const KEY_INFO = 'aes-256-gcm-key';

/**
 * Derives a 32-byte master key from a user-provided PIN using PBKDF2.
 * This is a computationally intensive operation, which is why it's in a worker.
 * @param {string} pin The user's PIN.
 * @returns {Promise<Uint8Array>} The derived master key.
 */
async function deriveMasterKeyFromPin(pin) {
  console.log('[CryptoWorker] Deriving master key from PIN...');
  const pinBytes = new TextEncoder().encode(pin);
  const masterKey = await pbkdf2(sha256, pinBytes, SALT, { c: 200000, dkLen: 32 });
  console.log('[CryptoWorker] Master key derived.');
  return masterKey;
}

/**
 * Derives an AES-GCM CryptoKey from the master key using HKDF.
 * @param {Uint8Array} masterKey The 32-byte master key from PBKDF2.
 * @returns {Promise<CryptoKey>} The AES-GCM key for encryption/decryption.
 */
async function getAesGcmKey(masterKey) {
  const derivedKey = await hkdf(sha256, masterKey, SALT, KEY_INFO, 32);
  return crypto.subtle.importKey('raw', derivedKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

const cryptoApi = {
  /**
   * Encrypts data using a key derived from the user's PIN.
   * @param {Uint8Array} data The data to encrypt.
   * @param {string} pin The user's PIN.
   * @returns {Promise<{iv: Uint8Array, ciphertext: Uint8Array}>} The IV and ciphertext.
   */
  async encryptWithPin(data, pin) {
    const masterKey = await deriveMasterKeyFromPin(pin);
    const key = await getAesGcmKey(masterKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return { iv, ciphertext: new Uint8Array(ciphertext) };
  },

  /**
   * Decrypts data using a key derived from the user's PIN.
   * @param {{iv: Uint8Array, ciphertext: Uint8Array}} encryptedData The IV and ciphertext.
   * @param {string} pin The user's PIN.
   * @returns {Promise<Uint8Array>} The decrypted plaintext data.
   */
  async decryptWithPin(encryptedData, pin) {
    const masterKey = await deriveMasterKeyFromPin(pin);
    const key = await getAesGcmKey(masterKey);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: encryptedData.iv }, key, encryptedData.ciphertext);
    return new Uint8Array(decrypted);
  },
};

// Expose the API to the main thread via Comlink
Comlink.expose(cryptoApi);

console.log('[CryptoWorker] Worker initialized and API exposed.');

// We need to export the type for the main thread to use with Comlink.wrap
/** @typedef {typeof cryptoApi} CryptoWorkerApi */
export {};