# SovereignComm

SovereignComm is a visionary project to build a truly sovereign and resilient communication system. It combines the physical reach of LoRa mesh networks with the permanence and security of decentralized technologies like IPFS, Filecoin, and the Bitcoin blockchain.

## Core Architecture

The system is designed to anchor data from a potentially offline LoRa mesh network into a global, immutable database (the Bitcoin blockchain). The high-level workflow is as follows:

1.  A user sends a message over the LoRa mesh network.
2.  A gateway node, which has both LoRa and internet connectivity, picks up the message.
3.  The gateway uploads the message content to the InterPlanetary File System (IPFS), receiving a Content Identifier (CID).
4.  The gateway then commits this CID to the Bitcoin blockchain using an `OP_RETURN` transaction. This acts as an immutable pointer to the message data without bloating the blockchain itself.
5.  For long-term persistence, the data associated with the CID is pinned on Filecoin.

## Key Challenges

- **Mesh Scalability:** LoRa networks have low bandwidth and are subject to duty-cycle regulations.
- **Gateway Incentives:** Gateway operators need incentives to provide the crucial bridge between the LoRa network and the internet.
- **Key Management:** User identity is tied to their cryptographic keys, making key security and backup paramount.

## Proposed Solutions & Economic Model

- **On-chain Cost Optimization:** Instead of one Bitcoin transaction per message, gateways will batch multiple message CIDs into a Merkle Tree and record a single Merkle Root on-chain, reducing costs drastically.
- **Incentive Model:** Micropayments via the Lightning Network will be used to compensate gateway operators for their service, creating a sustainable and market-driven network.
- **Phased Rollout:** The project may start by using a lower-cost blockchain (like a Bitcoin sidechain or a Layer 2) to validate the model before moving to the Bitcoin mainnet for maximum security.

## Target Applications

- **Primary:** Providing communication for populations without internet access.
- **Secondary:**
    - Disaster relief communications.
    - Censorship-resistant communication for journalists and activists.
    - Secure and low-cost Machine-to-Machine (M2M) and IoT communication.

---

## Project Roadmap (v2)

### Phase 1: Functional Multi-Chain MVP (Direct Interaction)
*   **Objective:** Have a functional messaging client that can interact directly with major EVM networks (L2s) and Solana, using Supabase as a supporting backend for indexing.
*   **Steps:**
    1.  **Implement Real EVM Sending (L2s):** Modify `Send.tsx` so that the Message -> IPFS -> CID flow is sent by the client to an L2 via `ethers.js`.
    2.  **Implement EVM Message Reading:** Create a backend service that monitors L2s, fetches CIDs, and populates Supabase for the client's inbox.
    3.  **Consolidate Logic for Solana:** Ensure that direct interaction with Solana follows the same unified pattern (IPFS -> CID -> Anchor).
    4.  **Business Model UI:** Implement the interface on the Settings page for the subscription and quota model (no functional logic yet).

### Phase 2: Sovereign Network Foundation (Multi-Chain Gateway & Economy)
*   **Objective:** Build the core components of the "Sovereign Network" via a gateway, including the economic engine and the flexibility for anchoring on multiple networks.
*   **Steps:**
    1.  **Implement Flexible Anchoring (Multi-Chain):** Develop the logic in the gateway software to anchor the Merkle Root of messages on different blockchains (e.g., Bitcoin via `OP_RETURN` or an Ethereum L2 via smart contract), optimizing for cost and security.
    2.  **Gateway Software (v0.1):** Start developing the gateway software (e.g., in Node.js) with the functionality to receive messages via API, process IPFS, and perform anchoring.
    3.  **Lightning Network Integration:** Implement the gateway's ability to create and verify Lightning invoices, and the client's ability to pay them.
    4.  **Backend for Subscriptions:** In Supabase, implement the actual logic to manage user subscriptions, payments, and storage quotas.

### Phase 3: End-to-End Integration & Permanent Storage
*   **Objective:** Connect the client to the gateway, implement persistent storage with Filecoin, and establish the pricing market.
*   **Steps:**
    1.  **Client-Gateway API:** Define and implement the API for the client to discover and communicate with gateways.
    2.  **Implement Real Filecoin Module:** Replace the placeholder code in `lib/filecoin.ts` with a real implementation that interacts with the Filecoin Testnet.
    3.  **Gateway Marketplace:** Implement the price announcement logic in the gateway and the best-price selection logic in the client.

### Phase 4: Network Launch with Hardware (Mainnet)
*   **Objective:** Launch the network publicly, with LoRa hardware integration and migration to mainnets.
*   **Steps:**
    1.  **LoRa Hardware Integration:** Develop the firmware and software for actual communication via LoRa radio.
    2.  **Mainnet Migration:** Move all blockchain operations from testnets to mainnets.
    3.  **Documentation and Community:** Create documentation for users and gateway operators.
    4.  **Advanced Mode:** Implement the option allowing users to pay directly for their Filecoin storage deals.

---

## Software Architecture: The Gateway

The core of the online infrastructure is the **SovereignComm Gateway**, a modular and resilient Node.js service written in TypeScript. It is designed to be the reliable bridge between user messages and the decentralized storage and anchoring layers.

Its key features include:

*   **Modular Design:** The gateway is not a monolith. It is composed of specialized services (`batch.service`, `ipfs.service`, `bitcoin.service`, `logger.service`) that handle distinct responsibilities, making the system easier to maintain and extend.
*   **Intelligent Batching:** The `batch.service` intelligently groups incoming message CIDs. It triggers the anchoring process when a batch reaches a certain size (`BATCH_SIZE`) or after a timeout (`BATCH_TIMEOUT_MS`), ensuring both efficiency and timely processing.
*   **Resilient Anchoring:** The `bitcoin.service` handles the creation of Bitcoin transactions to anchor a Merkle Root of the batched CIDs onto the blockchain.
*   **Built-in Fault Tolerance:** The system is designed to withstand temporary failures. It includes automatic retries with exponential backoff for anchoring operations and a Dead-Letter Queue (DLQ) to safely store batches that fail repeatedly, preventing data loss.

For a more detailed technical explanation of the gateway and the data structures, please refer to the `DOCUMENTATION.md` file.