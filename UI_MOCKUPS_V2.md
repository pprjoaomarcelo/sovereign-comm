# UI Mockups v2: Reputation & Gateway Marketplace

This document details the user interface for displaying gateway reputation, both from the client's perspective (choosing a gateway) and the operator's perspective (managing their own gateway).

---

## 1. Client-Side: The Gateway Marketplace

This is the primary interface the user interacts with to select a gateway for sending a message. The goal is to provide transparent, verifiable, and easy-to-understand metrics.

### 1.1. Main List View

The list of available gateways would be presented in a sortable table or list format.

**Columns:**

*   **Gateway:** A human-readable name (from Nostr NIP-05) or the gateway's public key.
*   **Performance:** A combined indicator showing uptime/success rate (e.g., 99.5%) and average latency (e.g., 250ms).
*   **Price:** The current cost advertised by the gateway (e.g., `10 sats/KB`).
*   **Vouch Score:**
    *   A star rating (e.g., ★★★★☆ 4.8).
    *   The total number of unique "Vouch NFTs" minted for this gateway (e.g., `(3,102 vouches)`).
*   **Social Trust:**
    *   A visual icon (e.g., a shield 🛡️ or a person icon) with a color code (e.g., Gold, Silver, Bronze).
    *   **Tooltip on hover:** "This gateway is vouched for by multiple high-reputation identities on the Nostr network, making it more trustworthy."

**Example Row:**

`[ Gateway Name ] [ 99.8% | 150ms ] [ 8 sats/KB ] [ ★★★★★ 4.9 (1,284 vouches) ] [ 🛡️ Gold ]`

### 1.2. Detailed "Drill-Down" View

When a user clicks on a gateway from the list, a detailed view expands, providing the evidence for the scores.

**Sections:**

*   **Gateway Info:** Description, onion address, operator's public Nostr profile link.
*   **Recent Vouches (Vouch NFTs):** A scrollable list of the most recent Vouch NFTs. Each entry would show:
    *   The star rating and comment (`"Ótimo serviço, muito rápido!"`).
    *   The voucher's Nostr identity (e.g., `@jack`). Clicking this would open their profile on a Nostr web client.
    *   The "Social Weight" of that specific vouch (e.g., a small gold shield icon next to `@jack`'s name, indicating he is a high-reputation voucher).
    *   Verifiable data from the NFT metadata (`timestamp`, `service_hash`).

This design allows a user to quickly assess gateways on the surface but also "audit the audit" by inspecting the individual vouches and the social credibility of the people who made them.

---

## 2. Gateway Operator: The Dashboard

This is the interface the gateway operator uses to manage their own service. It's not a marketplace, but a performance and financial dashboard.

**Key Widgets/Sections:**

*   **Status:** `ONLINE` / `OFFLINE`
*   **Performance Metrics:**
    *   `Uptime`: 99.98%
    *   `Average Latency (last 24h)`: 180ms
    *   `Successful Transactions`: 15,234
    *   `Failed Transactions`: 12
*   **Economic Metrics:**
    *   `Total Fees Earned (Sats)`: 5,450,120
    *   `Current Price Setting`: 8 sats/KB (with a button to adjust)
*   **Reputation Overview:**
    *   `Your Vouch Score`: ★★★★★ 4.9
    *   `Total Unique Vouchers`: 1,284
    *   `Your Social Trust Level`: Gold
*   **My Vouch NFTs:** A direct feed showing the latest Vouch NFTs minted by users for their service, including comments. This provides direct feedback to the operator.
*   **Staking Status (if applicable):**
    *   `Stake Amount`: 0.1 BTC
    *   `Status`: Locked & Active
    *   `Slashing Events`: 0

This dashboard gives the operator all the information they need to monitor their service's health, profitability, and public reputation, creating a direct feedback loop between user experience and the operator's actions.