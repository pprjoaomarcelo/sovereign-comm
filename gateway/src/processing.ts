import pako from 'pako';
import CryptoJS from 'crypto-js';

/**
 * Compresses and then encrypts a message string.
 * @param message The raw string message to process.
 * @param secret The secret key for encryption.
 * @returns A base64 string representing the encrypted and compressed data.
 */
export function compressAndEncrypt(message: string, secret: string): string {
  // 1. Compress the message using pako (zlib)
  const compressed = pako.deflate(message);

  // 2. Convert compressed data (Uint8Array) to a WordArray for CryptoJS
  const wordArray = CryptoJS.lib.WordArray.create(compressed as any);

  // 3. Encrypt using AES
  const encrypted = CryptoJS.AES.encrypt(wordArray, secret);

  // 4. Return as a base64 string
  return encrypted.toString();
}

/**
 * Decrypts and then decompresses a message string.
 * @param encryptedBase64 The base64 string of the encrypted data.
 * @param secret The secret key for decryption.
 * @returns The original, raw string message.
 */
export function decryptAndDecompress(encryptedBase64: string, secret: string): string {
  try {
    // 1. Decrypt from base64 string using AES
    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, secret);

    // 2. Convert the decrypted WordArray back to a Uint8Array
    const decryptedArray = new Uint8Array(decrypted.words.length * 4);
    for (let i = 0; i < decrypted.words.length; i++) {
      const word = decrypted.words[i];
      decryptedArray[i * 4] = (word >> 24) & 0xff;
      decryptedArray[i * 4 + 1] = (word >> 16) & 0xff;
      decryptedArray[i * 4 + 2] = (word >> 8) & 0xff;
      decryptedArray[i * 4 + 3] = word & 0xff;
    }

    // Trim the array to the actual size of the decrypted data
    const trimmedArray = decryptedArray.slice(0, decrypted.sigBytes);

    // 3. Decompress the data using pako
    const decompressed = pako.inflate(trimmedArray, { to: 'string' });

    return decompressed;
  } catch (error) {
    console.error("Decryption/Decompression failed:", error);
    throw new Error("Failed to decrypt or decompress message. The secret may be incorrect or the data corrupted.");
  }
}