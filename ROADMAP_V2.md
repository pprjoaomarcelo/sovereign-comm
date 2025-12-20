# SovereignComm Roadmap 2.0: From Theory to a Robust Network

This document outlines the development phases for building the core infrastructure of the SovereignComm network, focusing on creating a resilient and economically sustainable system before full-scale feature development.

---

## Phase 1: Core Primitives - Design & Specification

**Objective:** To solve the hardest theoretical problems and create detailed specifications for the core economic and governance mechanics of the network.

*   **1.1. Gateway Governance & Staking Mechanism:**
    *   **Task:** Design the staking and slashing protocol to ensure gateway honesty.
    *   **Research:** Produce a comparative analysis of implementing the mechanism via:
        *   A) Smart Contracts on a capable platform (e.g., Stacks).
        *   B) Native Bitcoin capabilities (e.g., advanced multi-sig, CheckTemplateVerify, or other complex scripting).
    *   **Decision:** Produce a formal specification document for the chosen MVP approach.

*   **1.2. Gateway Economics & Marketplace:**
    *   **Task:** Specify the dynamic pricing algorithm for gateways (how message size, storage duration, and chain fees translate to a final price in sats).
    *   **Task:** Design the UI/UX for the client-side Gateway Marketplace. This includes displaying a list of available gateways with critical metadata: reputation score, network signal/latency, current price, and chosen anchoring chain.

*   **1.3. Protocol Reliability & Failure Handling:**
    *   **Task:** Define the end-to-end protocol for handling message delivery failures.
    *   **[x] Specification (Gateway-side):** Gateway resilience implemented with retry logic (exponential backoff) and a Dead-Letter Queue (DLQ) for failed batches.
    *   **Task (Client-side):** Detail the client-facing error messages and the user's options, including an automated refund request or a one-click resend attempt via a different gateway.

*   **1.4. Message Retrieval & Mailbox Protocol:**
    *   **Task:** Formally specify the complete, end-to-end data flow for both sending and receiving a message.
    *   **[x] Specification (Gateway-side):** This document must explicitly detail:
        *   The IPLD data structures for the Mailbox, Inbox, and Message objects (including replies and attachments).
        *   The process of a sender's client sending a message CID to a gateway.
        *   **[x] The process of a gateway batching multiple message CIDs into a single Merkle Root.**
        *   The flow for a gateway returning the Merkle Proof to the sender.
        *   The flow for a recipient's client discovering the mailbox update and using the IPLD graph to retrieve and decrypt the new message.

---

## Phase 2: Foundation - Gateway & Economic Primitives

**Objective:** To write the code for the core primitives designed in Phase 1.

*   **2.1. Implement Gateway Governance:** Build the chosen staking/slashing mechanism (either the smart contract or the Bitcoin script-based system).
*   **2.2. Implement Marketplace:** Develop the gateway discovery UI in the client, including the logic to fetch, display, and select gateways based on the specified metadata.
*   **2.3. Implement Reliability Protocol:** Code the failure detection, error reporting, and refund/retry logic within the client.
*   **[x] 2.4. Implement Core Gateway Flow:** Implement the message processing pipeline in the gateway software.
    *   **Task (Gateway):** Implement the **JSON Canonicalization Scheme (JCS - RFC 8785)** for all data structures that require a signature (`service_order`, `batch_manifest`). This is a prerequisite for any signature creation or verification.
        *   **[x] Specification: JCS standard, data structures, and signature process are fully documented.**
        *   **Task: Implement JCS library in Gateway and Miner nodes.**
    *   **[x] Gateway: Implemented Merkle Root generation and Bitcoin anchoring (Testnet) via OP_RETURN.**
    *   **[x] Gateway: Implemented intelligent batching (by size and time) and resilient anchoring (retries + DLQ).**
    *   **Task (Client-side):** Implement dual-mode sending capabilities in the client:
        *   **A) Sovereign Mode (Default):** The standard, private, and efficient flow where the message CID is sent to a gateway.
        *   **B) Public Manifesto Mode (via IPFS):** An option for the user to send a rich, public, unencrypted message with attachments. The client creates a JSON "manifesto" of the content, uploads it to IPFS, and the gateway anchors the resulting **manifesto CID** in the `OP_RETURN`.
        *   **C) Public Bulletin Mode (On-Chain):** A legacy/experimental option for sending a very short, public, unencrypted message directly into a Bitcoin `OP_RETURN` transaction, with clear warnings about cost and lack of privacy.

---

## Phase 3: Network Integration & Pre-Launch

**Objective:** To deploy, test, and secure the network in a real-world environment.

*   **3.1. Public Testnet Deployment:** Deploy the gateway software and client applications to a public testnet (e.g., Stacks testnet, a Bitcoin testnet).
*   **3.2. Economic Incentives Test:** Onboard test users and gateway operators to simulate the economic model and ensure incentives are correctly aligned.
*   **3.3. Security Audits:** Commission third-party security audits, focusing on the staking/slashing contracts and the cryptographic integrity of the message retrieval protocol.
*   **3.4. Community & Documentation:** Create comprehensive guides for end-users and aspiring gateway operators based on the testnet experience.

---

## Phase 4: LoRa Integration for Offline Access

**Objective:** To bridge the online and offline worlds by enabling gateways to receive messages directly from users via a LoRa-based radio network, ensuring functionality even without internet access.

*   **4.1. Develop Gateway LoRa Module:**
    *   **Task:** Design and build the software module within the gateway service that interfaces with LoRa radio hardware to listen for and decode incoming messages.

*   **4.2. Define LoRa Data Protocol:**
    *   **Task:** Specify the exact data packet structure for SovereignComm messages transmitted over LoRa, optimizing for low bandwidth and ensuring compatibility with the gateway's decoding module.

*   **4.3. Hardware & Firmware Integration:**
    *   **Task:** Develop and document reference firmware for common, low-cost LoRa hardware (e.g., ESP32, Heltec LoRa boards) that enables users to broadcast messages.

*   **4.4. Field Testing & Network Simulation:**
    *   **Task:** Conduct real-world tests of the full offline-to-online message flow, from a LoRa-enabled client to a gateway and onto IPFS/Bitcoin.

---

## Phase 5: Antifragility & Extensibility

**Objective:** To enhance the long-term resilience of the network and enable future extensibility by abstracting core components into modular, pluggable interfaces.

*   **5.1. Implement Pluggable Anchoring Module:**
    *   **Task:** Refactor the gateway's anchoring logic into an abstract "AnchorService" interface, as detailed in `FUTURE_IDEAS.md`. This decouples the gateway's core logic from the specific anchoring method.

*   **5.2. Develop Alternative Anchor Implementation (Stacks):**
    *   **Task:** Create the first alternative implementation for the `OP_RETURN` method by building a `StacksContractAnchor`. This module will anchor data by interacting with a smart contract on the Stacks L2.
    *   **Purpose:** This serves as a strategic backup to `OP_RETURN` and acts as a proof-of-concept for the modular design.

*   **5.3. Enable Operator Configuration:**
    *   **Task:** Add the functionality for gateway operators to choose and configure their preferred anchoring mechanism via the gateway's configuration files. This empowers operators and decentralizes technical dependencies.