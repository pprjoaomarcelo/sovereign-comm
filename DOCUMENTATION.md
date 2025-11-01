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

## 4. The Economic Model: The Sovereign Network

### 4.1. The Payment Flow (Client -> Gateway via Lightning)

The system uses micropayments on the Lightning Network to create a market economy. The client requests the service from a gateway, receives a Lightning invoice, pays it, and only then is the service executed. It's fast, cheap, and trustless.

### 4.2. The Anchoring Service (Batching with Merkle Trees)

Anchoring each message individually on the blockchain would be too expensive. Instead, gateways batch hundreds of CIDs into a single Merkle Tree and record only the Merkle Root, diluting the on-chain transaction cost among many users.

### 4.3. Gateway Governance (Staking, Reputation, and Slashing)

To ensure gateways act honestly, they must deposit capital (stake) in a smart contract. If a gateway receives a payment and fails to provide the corresponding "proof of anchoring," their stake is "slashed" as punishment, and the user can be compensated. This aligns incentives and protects the network.

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

## 6. Project Roadmap

The project evolves in phases, from the MVP to the mainnet with LoRa hardware. Refer to `ROADMAP.md` for details on the next steps.

---

## 7. Technical Deep Dive

### 7.1. Frontend Architecture

The frontend is a React application built with Vite. Key components and pages include:

*   **`Settings.tsx`**: This page serves as the main user control panel. As of the latest updates, it includes:
    *   **Wallet Connection Status**: Displays the user's connected wallet address and network.
    *   **Subscription & Usage (`Assinatura & Uso`)**: A section that displays the user's current plan (e.g., "Plano Básico" / "Basic Plan") and usage quotas (e.g., max attachment size). It features an "Upgrade" button to navigate to the plan selection page.
    *   **Privacy & Display Toggles**: Switches for features like "Public Mode" and "Auto-refresh Inbox".

*   **`Upgrade.tsx`**: A placeholder page linked from the Settings page, intended for users to select and upgrade their subscription plans in the future.

### 7.2. Database Schema (Supabase)

To support user accounts, subscriptions, and usage tracking, the following database schema is proposed for implementation in Supabase.

*   **`plans` Table**: Stores the available subscription plans.
    ```sql
    CREATE TABLE plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, -- e.g., 'Basic', 'Sovereign'
      price_monthly INT NOT NULL, -- Price in cents or smallest currency unit
      storage_quota_gb INT NOT NULL,
      max_attachment_size_mb INT NOT NULL,
      active BOOLEAN DEFAULT true
    );
    ```

*   **`user_profiles` Table**: Stores user-specific data like their current plan and usage. To enhance privacy, this table does **not** directly reference the `auth.users` table or store the user's wallet address. Instead, it uses a pseudonymous identifier.
    ```sql
    CREATE TABLE user_profiles (
      -- This is a secure hash of the user's wallet address, acting as a pseudonymous ID.
      -- This prevents linking usage data directly to a wallet address in case of a DB breach.
      user_pseudonym TEXT PRIMARY KEY,
      plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
      storage_used_bytes BIGINT DEFAULT 0,
      subscription_active_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ```

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

This anchoring transaction is a "proof-of-existence" for the updated state of multiple mailboxes and does not directly involve the sender's or recipient's address. The delivery of the message is handled by the client discovering their new mailbox CID and traversing the IPLD graph.