// Client-side encryption for private messages
import { cryptoProxy } from './cryptoProxy';
import { bech32 } from 'bech32';

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
 * Implements LNURL-auth flow to get a stable secret from Alby.
 * This secret will be used similarly to the signature for key derivation.
 */
export async function requestAlbySignature(backendUrl: string): Promise<string> {
  console.log('[Alby] Starting LNURL-auth flow...');
  try {
    // In a real app, the backend would generate a unique k1 and the full LNURL-auth URL.
    // For this example, we'll simulate a LNURL-auth string.
    // The backend would return something like: `https://yourbackend.com/api/lnurl-auth?tag=login&k1=SOME_RANDOM_HEX`
    // which we would encode.
    const lnurl = bech32.encode('lnurl', bech32.toWords(Buffer.from(`${backendUrl}?tag=login&k1=mock-k1-for-alby`, 'utf8')), 1023);

    if (!window.webln) {
      throw new Error('WebLN (Alby) not detected.');
    }
    await window.webln.enable();

    // The `verifyMessage` in WebLN with a LNURL string triggers the auth flow.
    // Alby will sign the `k1` from the LNURL and return its public key.
    const { publicKey, signature } = await window.webln.signMessage(lnurl);

    // In a real app, we would now send the publicKey and signature to our backend to verify.
    // The backend would confirm the signature matches the k1 and log the user in.
    // For our encryption purpose, we can derive a stable secret from this interaction.
    // A simple way is to use a hash of the returned public key.
    const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey + signature));
    const secretHex = Array.from(new Uint8Array(secret)).map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('[Alby] LNURL-auth flow successful. Derived secret.');
    return secretHex;
  } catch (error) {
    console.error('[Alby] LNURL-auth failed:', error);
    throw new Error(`Falha na autenticação com Alby: ${error.message}`);
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
    throw new Error(`Falha na descriptografia. A assinatura/segredo da carteira pode estar incorreta ou os dados corrompidos.`);
  }
}
