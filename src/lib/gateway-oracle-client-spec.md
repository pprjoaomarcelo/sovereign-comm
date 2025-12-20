# Oracle Client Specification (Gateway)

*Version:* 0.1

This document describes the expected behavior of an Ingestion Gateway when acting as an "Oracle Client". In this role, the Gateway is responsible for discovering, verifying, and querying multiple Indexer nodes (oracles) in a decentralized manner to obtain reliable network data, such as the reputation of a Batch Miner.

---

## 1. Overview

To ensure decentralization and fault tolerance, a Gateway must not rely on a single, pre-configured Indexer. Instead, it must actively participate in an oracle market, where it can dynamically find data providers, assess their reliability based on economic guarantees (staking), and aggregate their responses to form a consensual and robust view of the network state.

The oracle client lifecycle can be divided into three phases: *Discovery and Verification*, *Selection and Query*, and *Response Handling and Aggregation*.

---

## 2. Phase 1: Discovery and Verification

The Gateway must maintain an internal, up-to-date list of available Indexers and their reliability.

### 2.1. Discovery via Gossip

- **Responsibility:** The Gateway must listen to the gossip network to discover active Indexers.
- **Action:**
  - Subscribe to the `/sovereign/v0.1/indexer-advertisements` gossip topic, as specified in `gossip-spec.md`.
  - Maintain an in-memory cache of discovered Indexers.

### 2.2. Advertisement Processing

For each `indexer_advertisement` message received:

1.  **Signature Validation:** The Gateway *must* verify the `signature` of the advertisement using the `indexer_pubkey` contained in the payload. Advertisements with an invalid signature must be discarded immediately.
2.  **Cache Update:** If the signature is valid, the Gateway adds or updates the Indexer's entry in its cache. The entry must contain, at a minimum:
    - `indexer_pubkey`
    - `api_endpoint`
    - `staking_info` (if present)
    - The advertisement's `timestamp`
    - `stake_status` (e.g., UNCHECKED, VERIFIED, INVALID)
3.  **Cache Pruning:** The Gateway should have a routine to remove Indexers whose last advertisement timestamp is older than a predefined threshold (e.g., 24 hours), considering them inactive.

### 2.3. Stake Verification (Optional, but Recommended)

For advertisements containing a `staking_info` object, the Gateway should perform an on-chain verification to confirm the economic guarantee.

- **Action:**
  1.  **Address Reconstruction:** Use the `indexer_pubkey` and `tapscript_leaves` from the advertisement to reconstruct the Taproot (P2TR) address of the stake contract.
  2.  **Address Verification:** Compare the reconstructed address with the `contract_address` declared in the advertisement. A mismatch indicates a malicious advertisement.
  3.  **Value Verification:** Query the Bitcoin blockchain (via a node or third-party API) to confirm that the `contract_address` holds a UTXO with a value greater than or equal to the declared `staked_amount_sats`.
- **Result:** The Indexer's `stake_status` in the cache is updated to `VERIFIED` or `INVALID`. Indexers without `staking_info` or whose verification fails are considered less trustworthy.

---

## 3. Phase 2: Selection and Query

When the Gateway needs data (e.g., a miner's reputation score), it queries its trusted oracles.

### 3.1. Oracle Selection

- **Responsibility:** Select a subset of Indexers from the cache for the query.
- **Selection Logic (Example):**
  1.  Filter the list of Indexers to include only those with `stake_status` equal to `VERIFIED`.
  2.  Sort the results by `staked_amount_sats` in descending order.
  3.  Select the top *N* Indexers (e.g., N=3 or N=5).

### 3.2. Parallel Query

- **Action:** The Gateway sends HTTP requests (e.g., `GET /reputation/miners/{minerPublicKey}`) to the `api_endpoint` of all *N* selected Indexers in parallel to minimize latency.

---

## 4. Phase 3: Response Handling and Aggregation

The Gateway must treat received responses with skepticism and consolidate them into a single, reliable result.

### 4.1. Response Verification

For each HTTP response received from an Indexer:

1.  **Verify Response Signature:** The Gateway *must* look for the `X-Sovereignty-Signature` header.
2.  If the header is present, the Gateway must:
    a. Canonize the JSON response body using JCS (RFC 8785).
    b. Calculate the SHA256 hash of the canonized body.
    c. Use the public key of the queried Indexer to verify that the signature matches the hash.
3.  Responses with an invalid or missing signature should be discarded or treated with the lowest priority.

### 4.2. Result Aggregation

- **Responsibility:** Consolidate the multiple valid responses into a single value.
- **Aggregation Strategy (Example for Reputation Score):**
  - **Consensus:** If a qualified majority (e.g., >2/3) of oracles return the same score, use that value.
  - **Median:** If the values differ, calculate the median of the received scores to mitigate the impact of malicious outliers.
  - **Weighted Average:** In a more advanced model, calculate the average of the scores, weighted by the stake amount of each Indexer.

- **Final Result:** The aggregated value is the data the Gateway will use for its internal operations (e.g., deciding whether to trust a Batch Miner).