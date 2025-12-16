/**
 * Derives an encryption key from a PIN and a salt using PBKDF2.
 * @param pin The PIN string.
 * @param salt The salt for key derivation.
 * @returns A CryptoKey for AES-GCM encryption/decryption.
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a data string using a given CryptoKey.
 * @param data The string to be encrypted.
 * @param key The CryptoKey derived from the PIN.
 * @returns A base64 string representing the IV and the encrypted data.
 */
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is recommended for AES-GCM
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypts a base64 encoded string using a given CryptoKey.
 * @param encryptedData The base64 string to be decrypted.
 * @param key The CryptoKey derived from the PIN.
 * @returns The original decrypted string.
 */
export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedContent);
}