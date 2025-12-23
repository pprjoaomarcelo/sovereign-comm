# UI Mockups: Gateway List with Reputation

This document provides a textual description of how the list of gateways and their reputation metrics should be displayed in the SovereignComm client application. This is intended as a high-level guide for UI/UX designers and developers.

---

## 1. Gateway List Display

The gateways should be displayed in a clear, sortable list. Each row represents a gateway and includes the following columns:

*   **Name/Identifier:** A human-readable name for the gateway (if available via NIP-05) or its public key (truncated).
*   **Onion Address:** The gateway's Tor Onion address (e.g., `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion`).
*   **Success Rate:** A percentage representing the gateway's success rate, calculated as `(success_count / total_vouches) * 100`.
*   **Average Latency:** The average latency in milliseconds, calculated as `latency_sum / latency_count`.
*   **Price:** The current price per kilobyte in satoshis (e.g., `10 sats/KB`).
*   **Total Vouchers:** The number of unique users who have vouched for this gateway.

## 2. Sorting and Filtering

The user should be able to sort the gateway list by any of the columns mentioned above (Name, Success Rate, Latency, Price, Total Vouchers). This allows them to prioritize what they value most.

## 3. Visual Indicators

*   **Success Rate:** Use a color-coded visual indicator (e.g., a progress bar or a badge) to represent the success rate. Green for high success rates, yellow for medium, and red for low.
*   **Latency:** Use a similar color-coded indicator to represent latency. Green for low latency, yellow for medium, and red for high.

## 4. Detailed Gateway Information

Clicking on a gateway should expand the row to show more detailed information, such as:

*   A description of the gateway (if available).
*   A list of recent vouches (with comments) from other users.