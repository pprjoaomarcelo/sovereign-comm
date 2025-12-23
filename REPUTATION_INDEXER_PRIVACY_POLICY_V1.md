# Ideal Privacy Policy for a Reputation Indexing Service v1

This document outlines the ideal, privacy-preserving operational policy for a SovereignComm Reputation Indexing Service. Operators who adhere to this policy provide the strongest guarantees to their users, aligning with the core principles of the SovereignComm project.

## 1. Core Principle: Data Minimization & User Anonymity

The fundamental principle is to provide the Social Trust Score service while collecting and retaining the absolute minimum amount of user-related data. The service should be designed to be "amnesiac," meaning it has no long-term memory of who requested what.

## 2. IP Address Handling

*   **Policy:** IP addresses of clients making requests are **never** stored in persistent logs.
*   **Rationale:** This is the most critical step to protect user privacy. Storing IP addresses would allow the operator (or a malicious actor who gains access) to correlate a user's real-world location with the Nostr public keys they are interested in.

## 3. Request Batch Handling

*   **Policy:** Each `POST /v1/scores` request, even if it contains a large number of `pubkeys`, is treated as an independent, atomic transaction. The service **must not** store or analyze the relationship between `pubkeys` within a single request or across multiple requests from the same IP address.
*   **Rationale:** This prevents the indexing service from becoming a social graph analysis tool, which could be used to map relationships and communities within the Nostr network, deanonymizing users.

## 4. Data Caching

*   **Policy:** The service is permitted to cache the final calculated `finalWeight` and raw `metrics` for individual `pubkeys` to improve performance and reduce load on Nostr relays.
*   **Constraint:** The Time-To-Live (TTL) for this cache should be reasonable and publicly stated (e.g., 12-24 hours).
*   **Data Purging:** Raw Nostr events (`kind:0`, `kind:1`, `kind:3`) fetched to perform the calculation should be discarded from memory immediately after the score is calculated and should not be written to disk.

## 5. Transparency and Verifiability

*   **Ideal Standard:** The indexing service's source code should be **open source**.
*   **Rationale:** This allows the community to independently verify that the privacy policies stated here are being enforced in the code, moving from a model of "trust" to "verify".

## 6. Network Access

*   **Policy:** The service **should** be accessible via a Tor Onion Service (`.onion` address).
*   **Rationale:** This provides users with a concrete tool to protect their privacy. By routing their requests through Tor, users can completely hide their IP address from the service operator, making the operator's logging policy less critical and giving the user ultimate control over their anonymity.

Adherence to this policy ensures that the Reputation Indexing Service acts as a utility for the network, not as a data harvesting entity.