/**
 * @file This module simulates the logic of a Batch Miner, responsible for
 * creating and signing Batch Manifests.
 * @version 0.1
 */

import { createHash } from 'crypto';
import type {
  ServiceOrder,
  BatchManifest,
  BatchManifestPayload,
} from '@/types/protocol';
import { signPayload } from '@/lib/crypto';

/**
 * Simulates the creation of a Merkle root from a list of service order CIDs.
 * In a real implementation, this would use a proper Merkle tree library.
 * @param orders - An array of service orders.
 * @returns The calculated Merkle root as a hex string.
 */
const calculateMerkleRoot = (orders: ServiceOrder[]): string => {
  if (orders.length === 0) {
    return createHash('sha256').digest('hex');
  }
  const cids = orders.map(order => order.payload.cid).sort();
  const concatenatedCids = cids.join('');
  return createHash('sha256').update(concatenatedCids).digest('hex');
};

/**
 * Creates and signs a Batch Manifest.
 *
 * @param orders - An array of complete and signed ServiceOrder objects to be included in the batch.
 * @param minerPrivateKeyHex - The private key of the miner, used to sign the manifest payload.
 * @param minerPublicKeyHex - The corresponding public key of the miner.
 * @returns A promise that resolves to the complete and signed BatchManifest.
 */
export const createBatchManifest = async (
  orders: ServiceOrder[],
  minerPrivateKeyHex: string,
  minerPublicKeyHex: string
): Promise<BatchManifest> => {
  // In a real scenario, txId would be the result of a real Bitcoin transaction.
  const mockTxId = createHash('sha256').update(Math.random().toString()).digest('hex');
  const merkleRoot = calculateMerkleRoot(orders);

  const payload: BatchManifestPayload = {
    protocol_version: '0.1',
    txId: mockTxId,
    merkleRoot: merkleRoot,
    miner_pubkey: minerPublicKeyHex,
    orders: orders,
  };

  const miner_signature = await signPayload(payload, minerPrivateKeyHex);

  const batchManifest: BatchManifest = {
    type: 'batch_manifest',
    payload,
    miner_signature,
  };

  return batchManifest;
};