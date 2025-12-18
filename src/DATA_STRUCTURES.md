# Data Structure Specifications

*Version:* 0.1

This document is the canonical source of truth for the fundamental data structures exchanged on the Sovereign Project network. All structures are JSON objects.

---

## 0. Canonical Serialization and Signatures (JCS - RFC 8785)

The integrity and non-repudiation of messages on the Sovereign network depend on verifiable digital signatures. As messages are JSON objects, which can have multiple textual representations for the same content (e.g., key order, spacing), it is *essential* to use a canonical serialization format before generating or verifying a signature.

The Sovereign protocol adopts the *JSON Canonicalization Scheme (JCS), defined in **RFC 8785***.

The process to sign any payload is:
1.  Take the JSON payload object.
2.  Serialize this object into a byte string using JCS rules.
3.  Calculate the SHA256 hash of the resulting byte string.
4.  Sign the hash with the appropriate private key.

Signature verification follows the same process: the verifier must recreate the exact same byte string to recalculate the hash and validate the signature.

### Key JCS Rules

- *Encoding:* The output must be UTF-8 encoded.
- *No Whitespace:* There must be no whitespace, line breaks, or any formatting characters between JSON elements.
- *Key Order:* The keys (properties) of all objects must be sorted lexicographically (byte-by-byte, according to Unicode code points).
- *Number Format:* Numbers must be represented in the most compact form possible (e.g., 1.0 becomes 1).
- *Strings:* Strings are represented as sequences of Unicode characters between double quotes, with the minimum necessary escaping (e.g., `\"`, `\\`).

### Practical Example

A non-canonical payload:
```json
{ "fee_total": 150, "cid": "bafy...", "protocol_version": "0.1" }
```

After JCS serialization, it becomes the following string (without line breaks):
`{"cid":"bafy...","fee_total":150,"protocol_version":"0.1"}`

It is on the SHA256 hash of *this final string* that the signature is created and verified.

---

## 1. service_order

A "Service Order" is the atomic unit of work on the network. It represents a signed request by a Gateway for a piece of data (identified by its CID) to be anchored on the blockchain.

### Structure

```json
{
  "type": "service_order",
  "payload": {
    "protocol_version": "0.1",
    "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26...",
    "fee_total": 150,
    "gateway_pubkey": "02abcdef...",
    "gateway_ln_address": "gateway@example.com"
  },
  "signature": "3045022100..."
}
```

### Fields

- *type* (string): Fixed to `"service_order"`.
- *payload* (object): The body of the order that is signed.
  - *protocol_version* (string): The protocol version of the message (e.g., `"0.1"`).
  - *cid* (string): The Content Identifier (v1) of the original message, which is stored on IPFS.
  - *fee_total* (integer): The total fee in satoshis that the Gateway collected from the user and which will be paid to the winning Batch Miner.
  - *gateway_pubkey* (string): The public key (hex) of the Gateway's node. Used to verify the signature and to receive payment from the Miner via Keysend.
  - *gateway_ln_address* (string): The Gateway's Lightning address (LNURL or similar) as an alternative payment method.
- *signature* (string): The signature (DER format in hex) of the payload's hash, created with the private key corresponding to `gateway_pubkey`.

---

## 2. batch_manifest

A "Batch Manifest" is the public proof published by a Batch Miner. It lists all `service_order`s that were included in a specific batch, anchored by a Bitcoin transaction.

### Structure

```json
{
  "type": "batch_manifest",
  "payload": {
    "protocol_version": "0.1",
    "txId": "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    "merkleRoot": "a1b2c3d4...",
    "miner_pubkey": "03fedcba...",
    "orders": [
      { "...": "complete object of service_order 1..." },
      { "...": "complete object of service_order 2..." }
    ]
  },
  "miner_signature": "30440220..."
}
```

### Fields

- *type* (string): Fixed to `"batch_manifest"`.
- *payload* (object): The body of the manifest that is signed.
  - *protocol_version* (string): The protocol version of the message (e.g., `"0.1"`).
  - *txId* (string): The Bitcoin transaction ID (OP_RETURN) that anchors the `merkleRoot` of this batch.
  - *merkleRoot* (string): The root of the Merkle Tree calculated from the CIDs of all `orders` in the batch.
  - *miner_pubkey* (string): The public key (hex) of the Batch Miner who published this manifest.
  - *orders* (array): An array containing the *complete and signed* objects of each `service_order` included in the batch.
- *miner_signature* (string): The signature (DER format in hex) of the payload's hash, created with the private key corresponding to `miner_pubkey`.

---

## 3. fraud_proof

A "Fraud Proof" is a signed accusation that a Gateway issues against a Miner for not distributing the due payment after a batch has been mined.

### Structure

```json
{
  "type": "fraud_proof",
  "payload": {
    "protocol_version": "0.1",
    "batch_manifest": { "...": "complete object of the batch_manifest..." },
    "accuser_gateway_pubkey": "02abcdef...",
    "accused_miner_pubkey": "03fedcba..."
  },
  "gateway_signature": "3045022100..."
}
```

### Fields

- *type* (string): Fixed to `"fraud_proof"`.
- *payload* (object): The body of the proof that is signed.
  - *protocol_version* (string): The protocol version of the message (e.g., `"0.1"`).
  - *batch_manifest* (object): The complete and signed `batch_manifest` object in which the Gateway was included but not paid.
  - *accuser_gateway_pubkey* (string): The public key of the Gateway making the accusation.
  - *accused_miner_pubkey* (string): The public key of the accused Miner. Must be the same as `batch_manifest.payload.miner_pubkey`.
- *gateway_signature* (string): The signature (DER format in hex) of the payload's hash, created by the private key of the accusing Gateway.