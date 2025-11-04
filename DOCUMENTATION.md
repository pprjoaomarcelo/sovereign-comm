# SovereignComm Official Documentation

## 1. Vision and Philosophy

### 1.1. The Manifesto: Why SovereignComm Exists

SovereignComm is an act of digital sovereignty. In a world where communication is controlled and monetized by third parties, we build an infrastructure that gives power back to the individual. Our mission is to create a communication network for a free society: resilient, censorship-resistant, and owned by its users.

### 1.2. Our Values

*   **Sovereignty:** Your key, your identity, your message. You are in control.
*   **Privacy:** Communication is a right. Our defenses are state-of-the-art cryptography and metadata obfuscation.
*   **Universal Access:** Connecting the unconnected is a pillar for equality and development.

---

## 2. User Guide

### 2.1. First Steps: Creating Your Identity

Your identity in SovereignComm is derived from a cryptographic key pair that only you hold. Keep your seed phrase in a safe place, as it is the only way to recover your access.

### 2.2. Sending Messages: Choosing Storage Duration

When sending a message or file, you will have control over its permanence on the network:

*   **Renewable Storage (1-5 years):** Ideal for most cases. Data is stored on the **Filecoin** network. The cost is lower and paid for a defined period (e.g., 1 year). You can renew the storage before the term expires.
*   **Permanent Storage:** For documents that must last forever. Data is stored on the **Arweave** network through a one-time payment. The initial cost is higher, but there are no renewal fees.

### 2.3. Reading Messages

Received messages will appear in your inbox. Only your private key can decrypt them.

### 2.4. User Choices and Sovereignty

The platform is designed to maximize user choice:

*   **Network Selection:** You can choose how your message is broadcast. If you are offline or in a censorship-heavy area, you can use the **LoRa/Mesh Network** option. If you have standard internet access, you can use **Wi-Fi/Internet** to connect directly to a gateway.
*   **Become a Network Participant:** Through a simple toggle in the settings, you can choose to operate your device as a **Mesh Node** or a full **Gateway** (if you have the required setup). By doing so, you help strengthen the network and earn incentives based on a reputation score for your contribution, which is especially critical during emergencies.
*   **Message Privacy:** You control the visibility of every message. You can send a standard **Private** message, protected by end-to-end encryption, or you can post a **Public** message, which is visible to everyone, acting as a public, immutable diary.

---

## 3. System Architecture

### 3.1. Message Flow (High-Level View)

1.  **Client:** You write a message. The client **compresses**, **encrypts**, and bundles it with any attachments into a single data package.
2.  **Gateway:** The client pays a gateway (via Lightning) and sends the encrypted data package.
3.  **IPFS:** The gateway uploads the package to IPFS, receiving a **Content ID (CID)**.
4.  **Blockchain:** The gateway batches this CID with others into a **Merkle Tree** and anchors the **Merkle Root** onto a blockchain (Bitcoin, Stacks, L2s), ensuring the record's immutability.

### 3.2. Data Structure (IPLD and Metadata Obfuscation)

To protect your privacy, we do not store a list of messages. We use IPLD (Inter-Planetary Linked Data) to create a data graph. The main CID points to an object containing links to your inbox and outbox, which in turn point to individual message CIDs using unique, non-sequential identifiers (UUIDs). This makes it impossible for an observer to know how many messages you have.

### 3.3. Cryptography and Security (E2EE, Network Privacy)

*   **End-to-End Encryption (E2EE):** Standard for all communications. Only the sender and receiver can read the content. Gateways only transport encrypted data.
*   **Network Privacy:** For maximum security, the client should be configured to communicate with gateways through an anonymity network like **Tor**, hiding your IP address.

---

### 3.4. Identity and Governance (DID & Digital Will)

The protocol includes a sophisticated identity management system and a decentralized inheritance mechanism to ensure long-term asset security and user sovereignty, even in unforeseen circumstances.

*   **Decentralized Identifiers (DIDs):** User identity is managed via W3C-compliant DIDs, as implemented in `did.service.ts`.
    *   **Format:** The DID follows a custom format: `did:sovereign:btc:<bitcoin_address>`.
    *   **DID Document:** Each DID resolves to a `DidDocument` stored on IPFS. This document contains critical information such as cryptographic verification methods (public keys) and service endpoints (e.g., preferred gateways for message discovery). This structure allows for key rotation and service updates without changing the core identity.

*   **Digital Will & Succession Protocol:** The system outlines a decentralized inheritance protocol, described in `governance.service.ts`. This ensures that a user's assets and identity can be recovered by a designated heir if the user becomes inactive.
    *   **Digital Will:** A user can create a `DigitalWill` JSON object, which is stored on IPFS. This document specifies an `heirAddress`, a list of trusted `guardianDids`, a `quorum` (e.g., 3 of 5 guardians must agree), and an `inactivityPeriodDays`.
    *   **Succession Process:** If a user is inactive beyond the specified period, the guardians can initiate a succession process. This involves a "proof-of-life" challenge. If the user doesn't respond, the guardians can collectively sign a transaction to transfer control to the designated heir.
    *   **Guardian Revocation & Notifications:** The protocol includes a mechanism for clients to check for guardian revocations. As detailed in `notification.service.ts`, clients can pull data from an on-chain log to verify that their chosen guardians are still active and trustworthy, triggering local alerts if a guardian has been slashed or removed.

---

## 4. The Economic Model: The Sovereign Network

### 4.1. The Payment Flow (Client -> Gateway via Lightning)

The system uses micropayments on the Lightning Network to create a market economy. The client requests the service from a gateway, receives a Lightning invoice, pays it, and only then is the service executed. It's fast, cheap, and trustless.

### 4.2. The Anchoring Service (Batching with Merkle Trees)

Anchoring each message individually on the blockchain would be too expensive. Instead, gateways batch hundreds of CIDs into a single Merkle Tree and record only the Merkle Root, diluting the on-chain transaction cost among many users.

### 4.3. Gateway Governance (Staking, Reputation, and Slashing)

To ensure network participants (like Gateways and Guardians) act honestly, the protocol uses a reputation-based system with economic incentives, as outlined in `reputation.service.ts`.

*   **Staking:** To participate, nodes must deposit capital (stake) in a smart contract. This stake acts as collateral.
*   **Reputation Score:** Each participant has a `reputationScore` (0.0 to 1.0) that increases with honest behavior (e.g., successful anchorings, succession participations) and decreases with failures or malicious actions.
*   **Slashing:** If a participant acts maliciously (e.g., a gateway fails to anchor a paid message, a guardian acts dishonestly), their stake is "slashed" as punishment. This aligns incentives and protects the network from bad actors.
*   **Selection:** The reputation score is used by clients and the protocol to select the most trustworthy gateways and guardians, creating a self-healing and meritocratic network.

### 4.4. Persistent Storage (IPFS + Filecoin + Arweave)

*   **IPFS:** Used as a fast caching layer and for initial data distribution.
*   **Filecoin:** The backbone for renewable and medium-term storage.
*   **Arweave:** The solution for permanent, long-term storage.

### 4.5. Cost Minimization Strategies (Compression, Bundling)

The cost for the user is actively minimized through:
*   **Compression:** The client compresses all data before encryption.
*   **Bundling:** The client groups multiple files and the message into a single IPFS object, resulting in a single CID to be anchored.

### 4.6. Anchoring Flexibility (Multi-Chain)

The gateway software is designed to be blockchain-agnostic. It can choose the most efficient anchoring platform (in cost and security) at the moment, whether it's Bitcoin (via OP_RETURN), Stacks, or an Ethereum L2.

---

## 5. Developer Guide

### 5.1. Environment Setup

Clone the repository, install dependencies with `npm install`, and configure your environment variables in the `.env` file (API keys, etc.). Note that some sub-projects like `/gateway` have their own dependencies and may require a separate `npm install` within their directory.

### 5.2. Project Structure

*   `/src`: Contains the React frontend source code.
*   `/gateway`: Contains the Node.js backend source code for the gateway service.
*   `/contracts`: Contains the smart contracts (e.g., Mailbox, Staking).
*   `/scripts`: Deployment and blockchain interaction scripts.
*   `/docs`: Documentation and architecture files.

### 5.3. How to Run and Test

*   To run the development environment: `npm run dev`
*   To run tests: `npm run test`

### 5.4. Troubleshooting

*   **`ERR_PACKAGE_PATH_NOT_EXPORTED` in Gateway:** If you see this error when running the gateway (`npx ts-node gateway/src/index.ts`), it's likely due to a module resolution conflict with newer versions of libraries like `ipfs-http-client`. The fix is to ensure the `gateway/tsconfig.json` is configured for modern module resolution. The following settings should be present in `compilerOptions`:
    ```json
    {
      "module": "NodeNext",
      "moduleResolution": "NodeNext"
    }
    ```

---

### 7.3. Gateway Service Architecture

The gateway is a modular Node.js service designed for resilience and scalability. It moves away from a monolithic structure to a collection of specialized services that handle distinct parts of the message processing and anchoring pipeline.

*   **Tech Stack:**
    *   **Runtime:** Node.js
    *   **Language:** TypeScript
    *   **Core Modules:**
        *   `express`: For handling API requests.
        *   `winston`: For robust, structured logging (`logger.service.js`).
        *   `ipfs-http-client`: For communication with IPFS (`ipfs.service.js`).
        *   `merkletreejs`, `crypto-js`: For Merkle tree generation.
        *   `bitcoinjs-lib`, `ecpair`, `tiny-secp256k1`: For creating and signing Bitcoin transactions (`bitcoin.service.js`).
        *   `axios`: For communicating with external APIs like Blockstream.

*   **API Endpoints:**
    *   **`POST /messages`**: The primary endpoint for submitting new messages. It expects a JSON object conforming to the IPLD Message Schema.
        *   **Request Body Schema (Example):**
            ```json
            {
              "schemaVersion": "1.0",
              "timestamp": "2025-10-12T10:00:00Z",
              "sender": "SENDER_PUBLIC_KEY_OR_ID",
              "recipient": "RECIPIENT_PUBLIC_KEY_OR_ID",
              "content": "Message body text.",
              "attachments": [
                {
                  "name": "file.pdf",
                  "cid": "CID_OF_THE_ATTACHMENT_ON_IPFS"
                }
              ]
            }
            ```
        *   **Success Response (202 Accepted):** The gateway immediately responds with a `202 Accepted` status, indicating the message was received and queued for processing, but not yet anchored. This asynchronous approach improves client-side UX.
            ```json
            {
              "message": "Message received and is being processed.",
              "cid": "CID_OF_THE_MESSAGE_OBJECT"
            }
            ```

*   **Core Logic Flow:**
    The new architecture is orchestrated by the **`batch.service.js`**.

    1.  **Message Reception:** The Express server receives a JSON object at the `/messages` endpoint.
    2.  **IPFS Upload:** The server calls the `ipfs.service` to upload the entire message object to IPFS, generating a single, unique `message_cid`.
    3.  **Batching:** The `message_cid` is passed to the `messageBatch` instance from the `batch.service`.
    4.  **Batch Trigger:** The `batch.service` adds the CID to its internal queue. It will trigger the anchoring process under two conditions:
        *   **Batch Full:** The number of CIDs in the queue reaches `BATCH_SIZE` (e.g., 5).
        *   **Timeout:** A timer (`BATCH_TIMEOUT_MS`, e.g., 60 seconds) expires, processing whatever is in the queue, even if it's not full. This ensures messages aren't stuck waiting indefinitely.
    5.  **Merkle Tree & Anchoring:** When a batch is processed, the `batch.service` calls the `ipfs.service` to generate a Merkle Tree from the CIDs and then calls the `bitcoin.service` to anchor the resulting Merkle Root on the Bitcoin Testnet.
    6.  **Resilience and Error Handling:**
        *   **Retries:** If the anchoring process fails (e.g., due to a temporary API issue with Blockstream), the `batch.service` will automatically retry the operation up to `MAX_ANCHOR_RETRIES` times, using an exponential backoff delay to avoid spamming the service.
        *   **Dead-Letter Queue (DLQ):** If a batch fails all retry attempts, it is considered "poisoned". The service writes the entire failed batch to a local `dead-letter-queue.log` file. This prevents data loss and allows the gateway operator to manually inspect and re-process the failed batch later.

This modular and resilient architecture ensures that messages are processed efficiently and reliably, with built-in mechanisms to handle failures gracefully.

---

## 6. Project Roadmap

The project evolves in phases, from the MVP to the mainnet with LoRa hardware. Refer to `ROADMAP.md` for details on the next steps.

---

## 7. Technical Deep Dive

### 7.1. Gateway Service Architecture

The Gateway is a critical piece of infrastructure in the SovereignComm network. It acts as a trust-minimized bridge between users and the decentralized backend (IPFS and the Bitcoin blockchain). Its primary role is to receive messages, batch them for efficiency, and anchor them immutably on-chain.

#### 7.1.1. Purpose

-   **API Endpoint:** Provides a simple, stable HTTP endpoint for clients to submit messages, abstracting away the complexities of IPFS and Bitcoin.
-   **Batch Processing:** Collects multiple message identifiers (CIDs) into a batch to drastically reduce the on-chain transaction cost per message.
-   **Data Anchoring:** Creates cryptographic proof of the batched messages (a Merkle Root) and anchors it onto the Bitcoin blockchain, providing an immutable, timestamped record.

#### 7.1.2. Technology Stack

-   **Runtime:** Node.js
-   **Language:** TypeScript
-   **Framework:** Express.js
-   **Dependencies:**
    -   `ipfs-http-client`: To communicate with an IPFS pinning service (e.g., Pinata).
    -   `merkletreejs` & `crypto-js`: To build the Merkle Tree from the batch of CIDs.
    -   `bitcoinjs-lib`: To construct the Bitcoin anchoring transaction.
    -   `axios`: To communicate with the Bitcoin network's API (e.g., Blockstream).
    -   `dotenv`: To manage environment variables securely.
    -   `winston`: For structured logging.

#### 7.1.3. Core Logic Flow

The gateway's main operational flow is triggered when it receives a request on its primary endpoint.

1.  **Receive Message (`POST /messages`):**
    -   The gateway listens for `POST` requests on the `/messages` endpoint.
    -   It expects a JSON payload conforming to the project's IPLD Message Schema.

2.  **Upload to IPFS:**
    -   The entire message object is uploaded to a pinning service (Pinata) via the IPFS client.
    -   This operation returns a unique Content Identifier (CID) for the message object.

3.  **Add to Batch:**
    -   The newly generated CID is added to an in-memory array (`cidBatch`).

4.  **Check Batch Size:**
    -   After adding the CID, the gateway checks if the batch has reached its configured size (`BATCH_SIZE`).

5.  **Process Batch (if full):**
    -   If the batch is full, the gateway initiates the anchoring process:
    -   **Merkle Tree Generation:** A Merkle Tree is constructed using all the CIDs in the batch.
    -   **Merkle Root Calculation:** The root of the tree is calculated. This single hash cryptographically represents all messages in the batch.
    -   **Bitcoin Transaction:** The `anchorMerkleRoot` function is called. It uses `bitcoinjs-lib` to build a Bitcoin Testnet transaction containing an `OP_RETURN` output with the Merkle Root.
    -   **Batch Reset:** The in-memory `cidBatch` is cleared to start collecting the next batch of CIDs.

#### 7.1.4. Configuration

The gateway is configured via a `.env` file in its root directory. This file must contain:

-   `PINATA_JWT`: The JWT token for authenticating with the Pinata pinning service.
-   `GATEWAY_BITCOIN_WIF`: The Wallet Import Format (WIF) for the Bitcoin Testnet private key that will be used to fund and sign the anchoring transactions.