# Lightning Chat Architecture v1 - Specification

This document specifies the architecture for the "Lightning Chat" mode of SovereignComm, a real-time, private messaging system that uses the Lightning Network itself as a data transport layer.

---

## 1. Core Philosophy

While the primary "Sovereign" mode prioritizes permanent, auditable, and asynchronous communication, the Lightning Chat mode prioritizes **real-time, ephemeral, and highly private** communication. It is designed to be the decentralized equivalent of apps like Signal or Telegram, leveraging the existing infrastructure of the Bitcoin Lightning Network.

The core principle is: **Every message is a payment.**

---

## 2. Key Concepts

### 2.1. Data-Over-Lightning (Messages as Payments)

Instead of just transferring value, we embed small data packets inside the metadata of a Lightning payment. This is made possible by the **Type-Length-Value (TLV)** record, a flexible field in Lightning payments that allows for custom data to be attached.

*   **Packetization:** A user's message is broken down into small chunks that can fit within the TLV records of one or more Lightning payments.
*   **Micropayments:** These are typically very low-value payments (e.g., 1-10 satoshis) where the primary purpose is not to transfer wealth, but to carry the data packet through the network. The payment itself acts as the "envelope".

### 2.2. Onion Routing for Privacy

The single greatest advantage of this model is that it inherits the **native privacy of the Lightning Network**.

*   **Onion Routing:** Just like a regular Lightning payment, our message-carrying payment is wrapped in multiple layers of encryption. Each routing node (hop) on the path from sender to receiver can only decrypt its own layer, revealing only the identity of the previous hop and the next hop.
*   **Anonymity:** It is computationally infeasible for a routing node to determine the original sender or the final destination of the message. They only know their immediate peer. This provides a powerful defense against traffic analysis and censorship.

---

## 3. Architectural Flow

1.  **Message Composition (Sender's Client):**
    *   Alice writes a message to Bob.
    *   The client packetizes the message.
    *   It constructs a Lightning payment destined for Bob's Lightning node.
    *   It embeds the message packet into the TLV records of this payment.

2.  **Payment Dispatch:**
    *   Alice's Lightning node finds a payment path to Bob's node through the network.
    *   The onion-encrypted payment, carrying the hidden message, is sent.

3.  **Routing (The Role of Gateways):**
    *   The payment hops through multiple intermediary nodes.
    *   **Crucially, our SovereignComm Gateways can also act as these routing nodes.** They cannot read the message content. They simply forward the payment like any other.
    *   For this service, they earn a small **routing fee** in satoshis. This creates the "dual-incentive model" where a gateway earns from both anchoring services (Mode 1) and routing traffic (Mode 2).

4.  **Message Reception (Recipient's Client):**
    *   Bob's Lightning node receives the payment.
    *   His client software is programmed to inspect incoming payments for the specific TLV record type used by SovereignComm.
    *   It extracts the message packet from the payment.
    *   It reassembles the packets (if the message was split) and displays the decrypted message to Bob.

---

## 4. Key Challenges & Solutions

### 4.1. Offline Recipients

*   **Problem:** A standard Lightning payment fails if the recipient's node is offline. This is unsuitable for a messaging application.
*   **Solution (Keysend & Mailbox Node):**
    *   **Challenge:** The original "trusted mailbox node" model introduces a central point of trust.
    *   **Superior Solution (OrbitDB):** We can use OrbitDB, a serverless P2P database on IPFS, to create a truly decentralized mailbox system.
        1.  **Personal Database:** Each user's inbox is their own OrbitDB `eventlog` database. The user has the sole write-access key.
        2.  **Gateways as Pinners:** Gateways offer a paid "Mailbox Pinning Service". Users pay a small subscription fee (via Lightning) to one or more gateways to pin their OrbitDB database, ensuring it stays online even when the user is offline.
        3.  **Sending to Offline User:** The sender (Alice) gets the recipient's (Bob's) OrbitDB address. She can't write directly. Instead, she sends the encrypted message to a gateway that Bob has authorized.
        4.  **Gateway Action:** The authorized gateway receives the message, validates the request, and uses its write permission to add the encrypted message to Bob's OrbitDB log. Because other gateways are also pinning this database, the update replicates across them.
        5.  **Retrieval:** When Bob comes online, his client loads his OrbitDB from the network. It automatically syncs the latest version (including Alice's message) from the pinning gateways and decrypts it locally.
    *   **Advantages:** This model is far more resilient and decentralized. It removes the trusted third party, replacing it with a competitive market of incentivized pinning services, fully aligning with the project's core philosophy.

### 4.2. Message Size Limits

*   **Problem:** The size of the TLV record is limited. Very long messages or file attachments cannot fit in a single payment.
*   **Solution:**
    *   **Message Splitting:** For long text messages, the client can automatically split them into multiple, numbered packets and send them as a sequence of payments.
    *   **Hybrid Approach for Files:** For file attachments, sending them over Lightning is inefficient. The client would revert to the **Sovereign (IPFS) model**: upload the file to IPFS, get the CID, and send only the **CID link** via a Lightning Chat message. This combines the best of both worlds: real-time notification with efficient, large-file storage.