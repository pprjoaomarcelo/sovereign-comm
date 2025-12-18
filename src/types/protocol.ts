/**
 * @file This file contains the TypeScript interfaces for the fundamental
 * data structures exchanged on the Sovereign Project network, as defined
 * in the official documentation.
 * @version 0.1
 */

/**
 * Represents the payload of a Service Order.
 * This is the part of the message that gets serialized and signed.
 */
export interface ServiceOrderPayload {
  /** The protocol version of the message (e.g., "0.1"). */
  protocol_version: string;
  /** The Content Identifier (v1) of the original message stored on IPFS. */
  cid: string;
  /** The total fee in satoshis collected by the Gateway. */
  fee_total: number;
  /** The public key (hex) of the Gateway's node. */
  gateway_pubkey: string;
  /** The Gateway's Lightning address (LNURL or similar). */
  gateway_ln_address: string;
}

/**
 * Represents a signed request by a Gateway for a piece of data (identified
 * by its CID) to be anchored on the blockchain.
 */
export interface ServiceOrder {
  /** Fixed type identifier for the structure. */
  type: 'service_order';
  /** The body of the order that is signed. */
  payload: ServiceOrderPayload;
  /** The signature (DER format in hex) of the payload's hash. */
  signature: string;
}

/**
 * Represents the payload of a Batch Manifest.
 * This is the part of the message that gets serialized and signed by the miner.
 */
export interface BatchManifestPayload {
  /** The protocol version of the message (e.g., "0.1"). */
  protocol_version: string;
  /** The Bitcoin transaction ID (OP_RETURN) that anchors the merkleRoot. */
  txId: string;
  /** The root of the Merkle Tree calculated from the CIDs of all orders. */
  merkleRoot: string;
  /** The public key (hex) of the Batch Miner who published this manifest. */
  miner_pubkey: string;
  /** An array containing the complete and signed objects of each service_order. */
  orders: ServiceOrder[];
}

/**
 * A public proof published by a Batch Miner, listing all service_orders
 * included in a specific batch.
 */
export interface BatchManifest {
  /** Fixed type identifier for the structure. */
  type: 'batch_manifest';
  /** The body of the manifest that is signed. */
  payload: BatchManifestPayload;
  /** The signature (DER format in hex) of the payload's hash, created by the miner. */
  miner_signature: string;
}

/**
 * Represents the payload of a Fraud Proof.
 * This is the part of the message that gets serialized and signed by the accuser.
 */
export interface FraudProofPayload {
  /** The protocol version of the message (e.g., "0.1"). */
  protocol_version: string;
  /** The complete and signed batch_manifest object in which the Gateway was included but not paid. */
  batch_manifest: BatchManifest;
  /** The public key of the Gateway making the accusation. */
  accuser_gateway_pubkey: string;
  /** The public key of the accused Miner. */
  accused_miner_pubkey: string;
}

/**
 * A signed accusation that a Gateway issues against a Miner for not distributing
 * the due payment after a batch has been mined.
 */
export interface FraudProof {
  /** Fixed type identifier for the structure. */
  type: 'fraud_proof';
  /** The body of the proof that is signed. */
  payload: FraudProofPayload;
  /** The signature (DER format in hex) of the payload's hash, created by the accusing Gateway. */
  gateway_signature: string;
}