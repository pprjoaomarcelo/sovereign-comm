# SovereignComm Roadmap v2.1: The Sovereign Stack (Bitcoin, Lightning, Nostr)

This document outlines the development phases for building the core infrastructure of the SovereignComm network. Our focus is on a resilient, censorship-resistant, and economically sustainable system built on a foundation of Bitcoin, the Lightning Network, and the Nostr protocol.

---

## Phase 1: Core Protocol & Economic Design

**Objective:** To create detailed specifications for the core economic, governance, and discovery mechanics of the network.

*   **1.1. Gateway Governance & Staking Mechanism:**
    *   **Task:** Design the staking and slashing protocol to ensure gateway honesty.
    *   **Research:** Formally specify a trust-minimized staking mechanism. This could involve a multisig setup with a trusted federation, or leveraging a Bitcoin L2 like Stacks for smart contract-based enforcement.
    *   **Decision:** Produce a specification document for the chosen MVP approach, prioritizing security and simplicity.

*   **1.2. Discovery & Reputation Protocol (Nostr):**
    *   **Task:** Specify the Nostr event structure (`kind`) for gateways to advertise their services, onion addresses, and pricing.
    *   **Task:** Define the Nostr event structure for client-side "vouches" to build a decentralized gateway reputation system.
    *   **Task:** Design the client-side logic for discovering gateways via Nostr relays and calculating reputation scores.

*   **1.3. Protocol Reliability & Failure Handling:**
    *   **Task:** Define the end-to-end protocol for handling message delivery failures.
    *   **Specification (Gateway-side):** Gateway resilience with retry logic (exponential backoff) and a Dead-Letter Queue (DLQ) for failed batches.
    *   **Specification (Client-side):** Detail the client-facing error messages and user options, including refund requests or one-click resends via a different gateway.

*   **1.4. Message Retrieval & Mailbox Protocol:**
    *   **Task:** Formally specify the complete, end-to-end data flow for both sending and receiving a message.
    *   **Specification:** Detail the IPLD data structures for Mailbox, Inbox, and Message objects. Clarify the process of a gateway batching message CIDs into a Merkle Root, and the flow for a recipient's client to discover and retrieve new messages using this structure.

---

## Phase 2: Foundational MVP Implementation

**Objective:** To build the core software for the client and gateway, focusing on the primary Bitcoin-based workflow.

*   **2.1. Gateway Software (v0.1):**
    *   **Task:** Implement the core gateway logic in Node.js/TypeScript.
    *   **Task:** Implement the API endpoint to receive messages, process them with IPFS, and add CIDs to an in-memory batch queue.
    *   **Task:** Implement Merkle Root generation and anchoring to the **Bitcoin Testnet** via `OP_RETURN`.
    *   **Task:** Implement intelligent batching (by size and time) and resilient anchoring (retries + DLQ).

*   **2.2. Client Software (v0.1):**
    *   **Task:** Implement the client-side logic to interact with the gateway API.
    *   **Task:** Integrate a Lightning wallet (e.g., via WebLN) for paying gateway invoices.
    *   **Task:** Implement Nostr-based gateway discovery and reputation display.

---

## Phase 3: Network Integration & Testnet

**Objective:** To deploy, test, and secure the network in a public testnet environment.

*   **3.1. Public Testnet Deployment:** Deploy the gateway software and client application.
*   **3.2. Economic Incentives Test:** Onboard test users and gateway operators to simulate the economic model.
*   **3.3. Security Audits:** Commission third-party security audits of the gateway code and cryptographic protocols.
*   **3.4. Community & Documentation:** Create comprehensive guides for end-users and aspiring gateway operators.

---

## Phase 4: LoRa & Offline Capabilities

**Objective:** To bridge the online and offline worlds by enabling gateways to receive messages via a LoRa-based radio network.

*   **4.1. Develop Gateway LoRa Module:**
    *   **Task:** Design and build the software module within the gateway to interface with LoRa radio hardware.

*   **4.2. Define LoRa Data Protocol:**
    *   **Task:** Specify the data packet structure for messages transmitted over LoRa, optimizing for low bandwidth.

*   **4.3. Hardware & Firmware Integration:**
    *   **Task:** Develop reference firmware for common, low-cost LoRa hardware (e.g., ESP32, Heltec) to broadcast messages.

*   **4.4. Field Testing & Network Simulation:**
    *   **Task:** Conduct real-world tests of the full offline-to-online message flow.

---

## Phase 5: Antifragility & Advanced Features

**Objective:** To enhance the network's long-term resilience and introduce advanced functionality.

*   **5.1. Implement Pluggable Anchoring Module:**
    *   **Task:** Refactor the gateway's anchoring logic into an abstract "AnchorService" interface to decouple it from the specific anchoring method (e.g., `OP_RETURN`).

*   **5.2. Develop Alternative Anchor Implementation (Stacks):**
    *   **Task:** Build a `StacksContractAnchor` as the first alternative implementation, anchoring data via a smart contract on the Stacks L2.
    *   **Purpose:** This serves as a strategic backup to `OP_RETURN` and validates the modular design.

*   **5.3. Enable Operator Configuration:**
    *   **Task:** Allow gateway operators to choose their preferred anchoring mechanism via configuration, decentralizing technical dependencies.