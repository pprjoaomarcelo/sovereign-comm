# Auditor Registry Protocol v1: Decentralized List Management

This document specifies the mechanisms for maintaining and updating the public list of active Auditors (`auditor_list`). A decentralized and verifiable registry is critical to prevent censorship and ensure the fairness of the Cryptographic Sortition process.

---

## 1. The Core Problem

The selection algorithm relies on a publicly known, ordered list of active Auditors. If this list is controlled by a central party, that party can censor Auditors by refusing to add them or by removing them unfairly. Therefore, the process of joining and leaving this list must be permissionless and verifiable.

We propose two primary methods, each with different trade-offs.

---

## Method A: On-Chain Smart Contract Registry

This method uses a dedicated smart contract, deployed on a capable blockchain like Stacks, to act as the definitive, on-chain registry.

### Mechanism

1.  **The Registry Contract:** A smart contract contains a public data map that stores the list of active Auditors, mapping their public key to their metadata (e.g., onion address for communication).

2.  **Registration (`register` function):**
    *   An operator who has already met the staking requirements (e.g., locked `0.1 BTC` as per `AUDITOR_SPEC_V1.md`) calls the `register()` function on the contract.
    *   The operator provides proof of their stake. The contract verifies this proof on-chain.
    *   Upon successful verification, the contract adds the operator's public key to the active list.

3.  **Deregistration (`deregister` function):**
    *   An Auditor can call a `deregister()` function to voluntarily leave the list. This would likely trigger a timelock period to prevent them from escaping recent accountability.
    *   A separate governance function, `slashAndRemove()`, could be called by the protocol (or a DAO) to forcibly remove an Auditor who has been successfully proven to be malicious.

### Pros & Cons

*   **Pros:**
    *   **High Integrity:** The list is maintained by the blockchain's consensus, making it the single source of truth.
    *   **Atomic Operations:** Registration and deregistration are atomic; they either succeed or fail completely, preventing inconsistent states.
*   **Cons:**
    *   **Gas Costs:** Every interaction (register, deregister) requires a transaction and costs gas fees.
    *   **Rigidity:** The logic is fixed in the contract. Changes require a new contract deployment and migration.
    *   **Blockchain Dependency:** Ties the system's governance to a specific smart contract platform.

---

## Method B: Nostr-Based Gossip Registry

This method uses the decentralized and censorship-resistant nature of the Nostr protocol for Auditors to announce their status.

### Mechanism

1.  **The Announcement Event:** Auditors use a specific, standardized Nostr event to declare their status. For example, a `kind:30078` (a standardized event for long-form content, perfect for service announcements).
    *   The event would be tagged with `["d", "sovereign-auditor-registry"]` to make it discoverable.
    *   The event's content would be a signed JSON object containing the Auditor's public key, their onion address, and a reference to the Bitcoin transaction proving their stake.

2.  **Building the List (Client-Side):**
    *   Any node in the SovereignComm network (including other Auditors and clients) is responsible for building the `auditor_list` locally.
    *   It queries multiple Nostr relays for all events with the `sovereign-auditor-registry` tag.
    *   It verifies the signature of each event.
    *   It independently verifies the staking proof by checking the Bitcoin blockchain.
    *   It compiles a list of all Auditors who have valid, staked announcements. The list is ordered deterministically (e.g., alphabetically by public key).

3.  **Deregistration:** An Auditor can simply stop publishing their announcement, or publish a new event with a "status: inactive" field. Slashing would be handled by a separate, signed "slashing proof" event published by the protocol's governance mechanism.

### Pros & Cons

*   **Pros:**
    *   **Highly Censorship-Resistant:** As long as an Auditor can post to *any* Nostr relay, they can be part of the network.
    *   **Cost-Effective:** No gas fees are required to announce or update status.
    *   **Flexible:** The announcement format can be easily updated over time.
*   **Cons:**
    *   **More Client-Side Work:** Puts the burden of discovery, verification, and list compilation on every node.
    *   **Potential for Spam:** Relays could be spammed with invalid announcements, requiring robust client-side filtering.
    *   **Relay Dependency:** While decentralized, the speed of updates depends on the propagation of events across Nostr relays.

---

## Recommendation

For maximum decentralization and alignment with the project's ethos, the **Nostr-based method (Method B) is superior**. While it requires more work on the client side, it avoids dependency on a single smart contract platform and is fundamentally more open and censorship-resistant. The client-side verification work is a worthy trade-off for this level of sovereignty.