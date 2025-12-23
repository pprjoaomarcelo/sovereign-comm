# SovereignComm Architecture v3.0: The Four Layers

This document outlines the four-layered architecture of the SovereignComm network, designed for maximum sovereignty, resilience, privacy, and economic sustainability. Each layer solves a specific problem and interacts with the others to form a cohesive, decentralized communication protocol.

---

## The Four Layers

1.  **Physical Layer (LoRa / Mesh):** Ensures data can travel through the physical world without reliance on traditional internet infrastructure.
2.  **Privacy Layer (Tor):** Ensures that when data travels, its origin and destination are anonymized.
3.  **Discovery & Social Layer (Nostr):** Allows network participants to find each other and discover services in a decentralized and censorship-resistant manner.
4.  **Trust & Economy Layer (Bitcoin / Lightning):** Provides the ultimate anchor of truth, a trustless economic system, and a real-time payment/messaging channel.

---

## Layer 1: The Physical Layer

*   **Problem:** How do we communicate when there is no internet, cellular service, or traditional connectivity?
*   **Technology:** **LoRa (Long Range) Radio & Mesh Networking.**
*   **Mechanism:**
    *   User devices are equipped with low-cost LoRa hardware.
    *   These devices form a peer-to-peer mesh network, relaying messages for each other to extend their range.
    *   A user can broadcast an encrypted message packet "over the air".
*   **Interaction:** This layer is the entry point for offline communication. A message packet from the Physical Layer is picked up by a **Gateway**, which bridges it to the upper layers (IPFS, Bitcoin, etc.).

---

## Layer 2: The Privacy Layer

*   **Problem:** How do we prevent network observers, or even malicious gateways, from knowing the real-world identity (IP address) of users and operators?
*   **Technology:** **The Tor Network.**
*   **Mechanism:**
    1.  **User Privacy:** When a user's client needs to communicate with a gateway over the internet (e.g., to pay a Lightning invoice or submit a message via an API), all traffic is routed through Tor. The gateway only sees the request coming from an anonymous Tor exit node, not the user's home IP.
    2.  **Gateway Sovereignty:** Gateway operators can configure their services (Lightning node, API) as **Tor Onion Services** (with a `.onion` address). This completely hides the physical location and IP address of the gateway's server, making it extremely resilient to physical or network-level attacks.
*   **Interaction:** This layer acts as a protective wrapper for all internet-based communication between the Client, the Gateway, and the other layers.

---

## Layer 3: The Discovery & Social Layer

*   **Problem:** In a decentralized network, how do users find available gateways? How do gateways advertise their services and prices? How do users build a public profile without a central server?
*   **Technology:** **Nostr (Notes and Other Stuff Transmitted by Relays).**
*   **Mechanism:** Nostr is a simple protocol where users send small, signed JSON "events" (posts) to dumb relays. We leverage this for:
    1.  **Gateway Discovery:** Gateways publish events with a specific tag (e.g., `#sovereign-gateway`) announcing their onion address, services offered, and current prices (e.g., `price_sats_per_kb`). The client listens for this tag across multiple relays to build a real-time list of available gateways.
    2.  **Reputation & Vouching:** Users can publish signed events "vouching" for a gateway's reliability, creating a decentralized reputation system.
    3.  **Public Content Marketplace (Future):** This is the layer where "Zero-Knowledge Advertising" would live. Advertisers post offers to public Nostr topics (e.g., `#queijo-artesanal`), and users' clients filter these topics locally, preserving privacy.
    4.  **User Profiles:** A user's public key is their Nostr identity. They can associate a name, picture, and bio (via NIP-05), creating a rich social layer on top of our secure protocol.
*   **Interaction:** Nostr acts as the decentralized "bulletin board" or "town square" for the entire ecosystem, enabling discovery and coordination without a central point of control.

---

## Layer 4: The Trust & Economy Layer

*   **Problem:** How do we create an immutable record of messages? How do we create a sustainable economy to incentivize operators? How do we enable real-time, private chat?
*   **Technology:** **Bitcoin (L1) and the Lightning Network (L2).**
*   **Mechanism:**
    1.  **The Anchor of Truth (Bitcoin L1):** The gateway batches the CIDs of messages into a Merkle Tree and anchors the final **Merkle Root** in a Bitcoin `OP_RETURN` transaction. This provides the ultimate, immutable, and globally auditable proof of existence for the data.
    2.  **The Economic Engine (Lightning Network):**
        *   **Payments:** Users pay gateways for their services (anchoring, storage) via fast, low-cost Lightning micropayments. This creates a free market that incentivizes the growth and maintenance of the network infrastructure.
        *   **Real-Time Communication:** As discussed, the Lightning Network itself can be used as a private, onion-routed data transport layer for real-time, ephemeral chat between online peers (`keysend` with custom records).
    3.  **The Storage Incentive (DePIN):**
        *   Users can run a lightweight version of the software to act as **"Archivists"**, providing their idle disk space to store and serve popular or redundant data from the network.
        *   The protocol can periodically challenge these Archivists to prove they are storing the data.
        *   Successful proofs are rewarded with a small amount of satoshis, funded by a fraction of the network's transaction fees, creating a Decentralized Physical Infrastructure Network (DePIN) for storage.
*   **Interaction:** This is the foundational layer that provides the economic incentives and the ultimate security guarantee for all other layers. The fees collected on this layer pay for the services provided by the gateways and archivists discovered on the Nostr layer, who may be operating anonymously via the Tor layer, and who may be bridging data from the physical LoRa layer.