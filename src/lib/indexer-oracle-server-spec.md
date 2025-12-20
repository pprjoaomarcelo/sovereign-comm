# Indexer (Oracle Server) Specification

*Version:* 0.1

This document describes the expected behavior of an Indexer node when acting as a data and reputation "Oracle Server". In this role, the Indexer is responsible for listening to the network, indexing relevant data, calculating reputation scores, and serving this information to clients (like Gateways) via a secure API.

---

## 1. Overview

An Indexer is a critical piece of infrastructure that provides a verifiable, off-chain view of on-chain events. It listens to both the gossip layer and the underlying blockchain to build a comprehensive state of the network. Its primary functions are to provide data lookup services and to calculate and serve reputation scores for network participants, primarily Batch Miners.

To be trusted, an Indexer must be discoverable, its data must be verifiable, and its responses must be authentic.

---

## 2. Phase 1: Service Advertisement & Data Provision

The initial role of an Indexer is to make itself known and provide basic data lookup services.

### 2.1. Service Advertisement via Gossip

- **Responsibility:** Announce its presence and services to the network.
- **Action:**
  - Periodically publish a signed `indexer_advertisement` message to the `/sovereign/v0.1/indexer-advertisements` gossip topic.
  - The message payload *must* contain the `indexer_pubkey` and the `api_endpoint` where its services can be reached.
  - The message *should* contain `staking_info` if the Indexer is staked.

### 2.2. Staking (Optional, but Recommended)

- **Responsibility:** Provide an economic guarantee of good behavior.
- **Action:**
  - An Indexer operator can lock a certain amount of BTC in a specified script (e.g., a Taproot address) that can be slashed in case of proven fraud.
  - The details of this stake (`contract_address`, `staked_amount_sats`, `tapscript_leaves`) are included in the `indexer_advertisement` message, allowing clients to verify the stake on-chain.

### 2.3. Core Data Indexing

- **Responsibility:** Listen to the network and index all `batch_manifest` objects.
- **Action:**
  - Subscribe to the `/sovereign/v0.1/batch-manifests` gossip topic.
  - Store and index every valid manifest received, correlating it with its on-chain anchor transaction.

### 2.4. Core API Endpoints

The Indexer *must* expose at least the following endpoints:

- `GET /manifests/{batch_txid}`: Returns the full `batch_manifest` object corresponding to a given Bitcoin transaction ID.
- `GET /orders/{service_order_id}`: Searches its indexed manifests to find and return the status and proof of inclusion for a specific `service_order_id`.

---

## 3. Phase 2: Reputation Oracle & Signed Responses

The Indexer evolves to provide calculated reputation data.

### 3.1. Reputation Calculation

- **Responsibility:** Listen for all `fraud_proof` messages and use them, in conjunction with `batch_manifests`, to calculate a reputation score for each `minerPublicKey`.
- **Action:**
  - Subscribe to the `/sovereign/v0.1/fraud-proofs` gossip topic.
  - Implement a scoring algorithm (e.g., based on successful batches vs. proven fraud).

### 3.2. Reputation API

- **Responsibility:** Serve the calculated reputation scores.
- **Action:** Expose the endpoint `GET /reputation/miners/{minerPublicKey}`.

### 3.3. Signed API Responses

- **Responsibility:** Guarantee the authenticity and non-repudiation of its provided data.
- **Action:** For all API responses, especially critical ones like reputation scores, the Indexer *must*:
  1.  Canonize the JSON response body using JCS (RFC 8785).
  2.  Calculate the SHA256 hash of the canonized body.
  3.  Sign the hash using its `indexer_pubkey`.
  4.  Return the resulting signature in an `X-Sovereignty-Signature` HTTP header. This allows any client to verify that the response came from this specific Indexer and was not tampered with.

---

## 4. Phase 3: Monetization (Future Work)

Future versions of this specification will detail how the Indexer API can be monetized using technologies like LSATs (Lightning Service Authentication Tokens), creating a sustainable economic model for oracle operators.