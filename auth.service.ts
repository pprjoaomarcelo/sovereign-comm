import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import jcs from 'jcs';

const ECPair = ECPairFactory(ecc);

/**
 * Verifies a signature against a message and a Bitcoin address.
 *
 * @param message The JSON message object that was signed.
 * @param signature The base64 encoded signature.
 * @param senderAddress The sender's Bitcoin address (must be Taproot/P2TR).
 * @returns A boolean indicating if the signature is valid.
 */
export function verifySignature(
  message: object,
  signature: string,
  senderAddress: string
): boolean {
  try {
    // 1. Canonicalize the message to ensure a deterministic string representation.
    const canonicalMessage = jcs(message);

    // 2. Create the message hash that was actually signed by the client.
    // Bitcoin signatures use a double-SHA256 hash of a prefixed message.
    const messagePrefix = Buffer.from('\u0018Bitcoin Signed Message:\n');
    const messageBuffer = Buffer.from(canonicalMessage);
    const prefixBuffer = Buffer.alloc(
      messagePrefix.length + messageBuffer.length
    );
    messagePrefix.copy(prefixBuffer, 0);
    messageBuffer.copy(prefixBuffer, messagePrefix.length);

    const messageHash = bitcoin.crypto.sha256(prefixBuffer);

    // 3. Decode the signature from base64.
    const signatureBuffer = Buffer.from(signature, 'base64');

    // 4. Recover the public key from the signature and the message hash.
    const { publicKey, recovery } = ECPair.fromSignature(
      messageHash,
      signatureBuffer
    );

    // 5. Derive the Taproot (P2TR) address from the recovered public key.
    const { address: derivedAddress } = bitcoin.payments.p2tr({
      internalPubkey: publicKey.subarray(1, 33), // Taproot uses the x-only pubkey
      network: bitcoin.networks.testnet, // Assuming testnet for now
    });

    // 6. Compare the derived address with the sender's address.
    return derivedAddress === senderAddress;
  } catch (error) {
    console.error('[AuthService] Error during signature verification:', error);
    return false;
  }
}