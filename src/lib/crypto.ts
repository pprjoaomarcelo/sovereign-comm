/**
 * @file This file contains cryptographic utility functions for the Sovereign Project,
 * including payload serialization, hashing, signing, and verification,
 * following the JCS (RFC 8785) and SECP256k1 standards.
 * @version 0.1
 */

import * as secp from 'noble-secp256k1';
import { sha256 } from 'noble-hashes/sha256';
import stringify from 'canonical-json';
import type { ServiceOrderPayload, BatchManifestPayload, FraudProofPayload } from '@/types/protocol';

type SignablePayload = ServiceOrderPayload | BatchManifestPayload | FraudProofPayload;

/**
 * Encodes a string into a UTF-8 byte array.
 * @param str The string to encode.
 * @returns A Uint8Array representing the UTF-8 encoded string.
 */
const utf8ToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

/**
 * Converts a hexadecimal string to a byte array.
 * @param hex The hexadecimal string.
 * @returns A Uint8Array.
 */
const hexToBytes = (hex: string): Uint8Array => {
  return secp.utils.hexToBytes(hex);
};

/**
 * Converts a byte array to a hexadecimal string.
 * @param bytes The byte array.
 * @returns A hexadecimal string.
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return secp.utils.bytesToHex(bytes);
};

/**
 * Serializes a payload object into a canonical byte string according to JCS (RFC 8785).
 * @param payload The JSON object to serialize.
 * @returns The canonical string representation, UTF-8 encoded as a byte array.
 */
export const serializePayload = (payload: SignablePayload): Uint8Array => {
  const canonicalString = stringify(payload);
  return utf8ToBytes(canonicalString);
};

/**
 * Hashes a payload by first serializing it canonically (JCS) and then
 * applying the SHA256 hash function.
 * @param payload The JSON object to hash.
 * @returns The 32-byte SHA256 hash as a Uint8Array.
 */
export const hashPayload = (payload: SignablePayload): Uint8Array => {
  const serializedPayload = serializePayload(payload);
  return sha256(serializedPayload);
};

/**
 * Signs the SHA256 hash of a canonically serialized payload.
 * @param payload The JSON object payload to sign.
 * @param privateKeyHex The private key as a 32-byte hexadecimal string.
 * @returns A promise that resolves to the signature in DER format, encoded as a hex string.
 */
export const signPayload = async (payload: SignablePayload, privateKeyHex: string): Promise<string> => {
  const messageHash = hashPayload(payload);
  const signature = await secp.sign(messageHash, privateKeyHex, { der: true });
  return bytesToHex(signature);
};

/**
 * Verifies the signature of a payload.
 * It re-calculates the canonical hash of the payload and checks it against the signature
 * using the provided public key.
 * @param payload The JSON object payload that was signed.
 * @param signatureHex The signature in DER format, encoded as a hex string.
 * @param publicKeyHex The public key (compressed or uncompressed) as a hex string.
 * @returns A promise that resolves to `true` if the signature is valid, and `false` otherwise.
 */
export const verifySignature = async (
  payload: SignablePayload,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> => {
  try {
    const messageHash = hashPayload(payload);
    const signatureBytes = hexToBytes(signatureHex);
    
    // The `strict` option enforces low-S signatures, a best practice in Bitcoin and other systems.
    return secp.verify(signatureBytes, messageHash, publicKeyHex, { strict: true });
  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
};

export const cryptoUtils = {
  hexToBytes,
  bytesToHex,
};