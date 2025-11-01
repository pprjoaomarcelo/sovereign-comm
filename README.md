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

## Software Architecture: The Gateway

The core of the online infrastructure is the **SovereignComm Gateway**, a modular and resilient Node.js service written in TypeScript. It is designed to be the reliable bridge between user messages and the decentralized storage and anchoring layers.

Its key features include:

*   **Modular Design:** The gateway is not a monolith. It is composed of specialized services (`batch.service`, `ipfs.service`, `bitcoin.service`, `logger.service`) that handle distinct responsibilities, making the system easier to maintain and extend.
*   **Intelligent Batching:** The `batch.service` intelligently groups incoming message CIDs. It triggers the anchoring process when a batch reaches a certain size (`BATCH_SIZE`) or after a timeout (`BATCH_TIMEOUT_MS`), ensuring both efficiency and timely processing.
*   **Resilient Anchoring:** The `bitcoin.service` handles the creation of Bitcoin transactions to anchor a Merkle Root of the batched CIDs onto the blockchain.
*   **Built-in Fault Tolerance:** The system is designed to withstand temporary failures. It includes automatic retries with exponential backoff for anchoring operations and a Dead-Letter Queue (DLQ) to safely store batches that fail repeatedly, preventing data loss.

For a more detailed technical explanation of the gateway and the data structures, please refer to the `DOCUMENTATION.md` file.