# Data Structures Specification

*Version: 0.1*

This document specifies the data structures for `service_order` and `batch_manifest`, which are fundamental to the operation of the SovereignComm network. All signatures are created over the **JCS (RFC 8785)** canonicalized form of the JSON object.

## 1. `service_order`

A `service_order` is a signed JSON object created by an **Ingestion Gateway**. It represents a user's request to have a piece of content (identified by its CID) anchored on the blockchain. These orders are broadcast on the gossip network for Batch Miners to pick up.

### 1.1. Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cid` | string | Yes | The CID (v1, Base32) of the main message object on IPFS. |
| `fee_total` | number | Yes | The total fee in satoshis paid by the user to the gateway. |
| `gateway_pubkey` | string | Yes | The public key (hex, compressed) of the gateway that created the order. |
| `gateway_ln_address` | string | Yes | The Lightning address of the gateway to receive its share of the reward. |
| `protocol_version` | string | Yes | The protocol version (e.g., "0.1"). |
| `timestamp` | number | Yes | Unix timestamp (in seconds) of when the order was created. |
| `signature` | string | Yes | The ECDSA signature (DER format in hex) from the gateway over the SHA256 hash of the JCS-canonicalized object (excluding this `signature` field). |

### 1.2. Example

```json
{
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26...",
  "fee_total": 150,
  "gateway_ln_address": "gateway@example.com",
  "gateway_pubkey": "02abcdef...",
  "protocol_version": "0.1",
  "timestamp": 1760361600,
  "signature": "3045022100..."
}
```

## 2. `batch_manifest`

A `batch_manifest` is a signed JSON object created by a **Batch Miner** after successfully mining a batch. It serves as a public, auditable record that links a set of `service_orders` to a specific on-chain transaction.

### 2.1. Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `merkle_root` | string | Yes | The Merkle Root (hex) constructed from the CIDs of all `service_orders` in the batch. |
| `tx_id` | string | Yes | The Bitcoin transaction ID (hex) that anchors the `merkle_root`. |
| `miner_pubkey` | string | Yes | The public key (hex, compressed) of the miner who won the batch. |
| `miner_ln_address` | string | Yes | The Lightning address of the miner to receive their share of the fees. |
| `protocol_version` | string | Yes | The protocol version (e.g., "0.1"). |
| `timestamp` | number | Yes | Unix timestamp (in seconds) of when the manifest was created. |
| `service_orders` | array | Yes | An array containing the complete, signed `service_order` objects included in the batch. |
| `signature` | string | Yes | The ECDSA signature (DER format in hex) from the miner over the SHA256 hash of the JCS-canonicalized object (excluding this `signature` field). |

### 2.2. Example

```json
{
  "merkle_root": "f3e9b5a...",
  "tx_id": "a1b2c3d4...",
  "miner_pubkey": "03fedcba...",
  "miner_ln_address": "miner@example.com",
  "protocol_version": "0.1",
  "timestamp": 1760362200,
  "service_orders": [
    {
      "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26...",
      "fee_total": 150,
      "gateway_ln_address": "gateway@example.com",
      "gateway_pubkey": "02abcdef...",
      "protocol_version": "0.1",
      "timestamp": 1760361600,
      "signature": "3045022100..."
    }
  ],
  "signature": "30440220..."
}
```