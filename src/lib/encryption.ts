// Client-side encryption for private messages
import { cryptoProxy } from './cryptoProxy';

export interface EncryptionResult {
  encryptedMessage: string;
  isEncrypted: boolean;
}

/**
 * Request wallet signature to derive encryption key
 */
export async function requestWalletSignature(walletAddress: string): Promise<string> {
  console.log(`[Encryption] Requesting wallet signature...`);
  
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Carteira não detectada. Por favor, instale MetaMask ou outra carteira.');
  }

  try {
    const message = `Sign this message to encrypt/decrypt your private messages on ChainChat.\n\nAddress: ${walletAddress}\nTimestamp: ${Date.now()}`;
    
    // Request signature from wallet
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    });

    console.log(`[Encryption] Signature obtained successfully`);
    return signature;
  } catch (error) {
    console.error(`[Encryption] Signature request failed:`, error);
    throw new Error('Assinatura negada. Você precisa assinar para enviar mensagens privadas.');
  }
}

/**
 * Encrypt message content using wallet signature
 * This function now delegates the heavy lifting to the crypto worker.
 */
export async function encryptMessage(
  message: string,
  signature: string
): Promise<EncryptionResult> {
  console.log(`[Encryption] Delegating message encryption to worker...`, { messageLength: message.length });

  try {
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // The PIN here is the wallet signature, which acts as the secret
    const { iv, ciphertext } = await cryptoProxy.encryptWithPin(messageData, signature);

    // Combine IV and ciphertext for storage/transmission
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv);
    combined.set(ciphertext, iv.length);

    // Convert to base64 to safely store or transmit as a string
    const encryptedMessage = btoa(String.fromCharCode(...combined));
    
    console.log(`[Encryption] Message encrypted successfully`);
    
    return {
      encryptedMessage,
      isEncrypted: true
    };
  } catch (error) {
    console.error(`[Encryption] Encryption failed:`, error);
    throw new Error(`Falha na criptografia: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Decrypt message content using wallet signature.
 * This function now delegates the heavy lifting to the crypto worker.
 */
export async function decryptMessage(
  encryptedMessage: string,
  signature: string
): Promise<string> {
  console.log(`[Encryption] Delegating message decryption to worker...`);

  try {
    // Decode from base64 and separate IV from ciphertext
    const combined = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // The PIN here is the wallet signature, which acts as the secret
    const decryptedData = await cryptoProxy.decryptWithPin({ iv, ciphertext }, signature);

    const decoder = new TextDecoder();
    const decryptedMessage = decoder.decode(decryptedData);
    
    console.log(`[Encryption] Message decrypted successfully`);
    
    return decryptedMessage;
  } catch (error) {
    console.error(`[Encryption] Decryption failed in worker:`, error);
    throw new Error(`Falha na descriptografia. A assinatura da carteira pode estar incorreta ou os dados corrompidos.`);
  }
}
