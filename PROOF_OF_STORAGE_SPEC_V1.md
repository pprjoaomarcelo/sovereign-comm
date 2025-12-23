# Proof-of-Storage Protocol v1: The Archivist Lifecycle

This document specifies the mechanism for verifying data storage by network participants known as "Archivists" and the corresponding reward system. This protocol is a lightweight form of Proof-of-Storage, designed to be accessible to standard user devices.

---

## 1. The Archivist Role

*   **Definition:** An Archivist is a user running the SovereignComm software who voluntarily allocates a portion of their local disk space to the network.
*   **Purpose:** Archivists act as a decentralized caching and redundancy layer. They do **not** store critical or private user messages. Instead, they store non-sensitive, popular, or public data to improve network performance and data availability. Examples include:
    *   Popular public posts from Nostr topics (`#queijo-artesanal`).
    *   Redundant copies of non-critical public data.
    *   Serving as a secondary "pinner" for specific public CIDs.
*   **Registration:** To become an Archivist, a user signals their availability via a Nostr event, specifying the amount of space they are offering.

---

## 2. The Challenge-Response Cycle (The Proof)

This cycle is designed to be lightweight, ensuring it can be handled by devices with intermittent connectivity without imposing a heavy computational burden.

1.  **Challenge Initiation (The "Question"):**
    *   A **Gateway** (or a future specialized "Auditor" node) periodically initiates a challenge.
    *   The Gateway selects a random Archivist who claims to be storing a specific file CID (e.g., `bafy...`).
    *   The Gateway generates a random number (a `nonce`) and sends a signed "challenge" request to the Archivist. The request essentially asks: *"Para o arquivo CID `bafy...`, me dê os 256 bytes que começam na posição X"*, where `X` is derived from the nonce.

2.  **Archivist Response (The "Answer"):**
    *   The Archivist's software receives the challenge.
    *   It accesses the specified file CID from its local storage.
    *   It reads the exact, small chunk of data requested (the 256 bytes at position X).
    *   It sends this data chunk back to the challenging Gateway as a signed "response".

3.  **Verification (The "Grading"):**
    *   The Gateway receives the response.
    *   Since the Gateway also has (or can fetch) the original file, it performs the same operation locally: it reads the 256 bytes at position X from its copy of the file.
    *   It compares the data chunk sent by the Archivist with its own.
    *   If the chunks match perfectly, the proof is considered **valid**. If they don't match, or if the Archivist fails to respond within a time limit, the proof is **invalid**.

---

## 3. The Reward Mechanism

This is the economic incentive that makes the system sustainable.

*   **Funding Source:** A small fraction of all transaction fees collected by Gateways across the network is pooled into a "Protocol Treasury" or "Archivist Reward Pool".
*   **Reward Distribution:**
    *   Upon successful verification of a Proof-of-Storage, the challenging Gateway is authorized to issue a micropayment from the reward pool to the Archivist's Lightning address.
    *   This reward is small but consistent, designed to cover the costs of electricity and hardware depreciation over time, creating a source of passive income.

---

## 4. Failure & Reputation

*   **Failure to Respond:** If an Archivist repeatedly fails challenges (either by being offline or by providing incorrect data), they receive no rewards.
*   **Reputation Score:** These successes and failures are recorded publicly (e.g., as Nostr events). This data feeds into a reputation score for each Archivist.
*   **Consequences:** Gateways will prioritize challenging and relying on Archivists with higher reputation scores, naturally marginalizing unreliable participants. This ensures the network's caching layer remains healthy and performant.

This entire lifecycle creates a self-sustaining, self-healing market for decentralized data persistence, where honest and reliable participants are economically rewarded.