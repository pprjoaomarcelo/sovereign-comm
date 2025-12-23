# Gateway Reputation Protocol v1: Client-Side Calculation

This document specifies the process by which a SovereignComm client should calculate the reputation of a gateway. The calculation is performed entirely client-side, based on publicly available, signed "vouch" events from the Nostr network. This ensures that reputation is decentralized and not controlled by any central authority.

---

## 1. Objective

To provide the user with transparent and verifiable metrics about the performance and reliability of each gateway, allowing them to make an informed decision when selecting a service provider. The system does not produce a single, opaque "score", but rather calculates several key performance indicators (KPIs).

---

## 2. Data Source

The sole data source for reputation calculation is Nostr events with the following structure:

*   **`kind`**: `31984` (Labeling event)
*   **`tags`**:
    *   `["d", "sovereign-gateway-review"]`
    *   `["p", "<gateway_pubkey>"]` (The public key of the gateway being reviewed)
    *   `["l", "{\"outcome\":\"success\",\"rating\":5,\"latency_ms\":1250}", "sovereign-comm-v1"]`

---

## 3. Calculation Process

The client application must perform the following steps for each gateway it discovers:

1.  **Fetch Vouch Events:** Query multiple Nostr relays for all events matching the `kind` and `d` tag specified above, filtered by the gateway's public key (`p` tag).

2.  **Verify and Sanitize:** For each fetched event:
    *   Verify the event's signature to ensure it's authentic.
    *   Discard any events with a malformed JSON payload in the `l` tag.
    *   Ensure only one vouch per author (`pubkey`) for each gateway is considered (the latest one).

3.  **Aggregate Metrics:** For a given gateway, iterate through all its valid vouch events and calculate the following KPIs:

    *   **Success Rate (%):**
        *   `success_count =` Number of vouches where `outcome` is `"success"`.
        *   `total_vouches =` Total number of valid vouches.
        *   **Formula:** `(success_count / total_vouches) * 100`

    *   **Average Rating (1-5):**
        *   `rating_sum =` Sum of the `rating` value from all vouches that contain it.
        *   `rating_count =` Number of vouches that contain a `rating` value.
        *   **Formula:** `rating_sum / rating_count`

    *   **Average Latency (ms):**
        *   `latency_sum =` Sum of the `latency_ms` value from all vouches.
        *   `latency_count =` Number of vouches that contain a `latency_ms` value.
        *   **Formula:** `latency_sum / latency_count`

    *   **Total Vouchers:**
        *   **Formula:** Count of unique author `pubkey`s who have vouched for this gateway. This metric helps gauge the breadth of community trust.

4.  **Display to User:** The client interface should display these calculated metrics clearly for each gateway, allowing the user to sort and filter the gateway list based on what they value most (e.g., highest success rate, lowest latency, or highest number of unique vouchers).