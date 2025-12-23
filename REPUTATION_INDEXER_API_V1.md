# Reputation Indexer API v1

This document specifies the API for a "Reputation Indexing Service". This service is responsible for pre-calculating or caching the "Social Trust Score" for Nostr identities, allowing clients to offload the heavy data fetching and computation, resulting in a much faster and more efficient user experience.

## 1. Objective

The primary goal of this API is to provide a simple, scalable, and efficient way for client applications to retrieve the Social Trust Score for a batch of Nostr public keys (`pubkeys`).

## 2. Endpoint

### `POST /v1/scores`

This is the single endpoint for retrieving scores. A `POST` request is used to allow for a large number of `pubkeys` to be queried at once without hitting URL length limits.

---

## 3. Request Body

The client must send a JSON object containing a single key, `pubkeys`, which is an array of strings representing the Nostr public keys to be scored.

**Content-Type:** `application/json`

**Schema:**
```json
{
  "pubkeys": [
    "f8e6c12e5a1f3a5c...",
    "a3b8d9c7e6f5a1b2...",
    "c4d9e8f7a6b5c1d2..."
  ]
}
```

---

## 4. Success Response (200 OK)

On success, the server returns a JSON object containing a `scores` map. Each key in the map is one of the requested `pubkeys`, and its value is an object containing the calculated `finalWeight` and the raw `metrics` used in the calculation.

If a `pubkey` is not found or has no activity on Nostr, its value in the map will be `null`.

**Schema:**
```json
{
  "scores": {
    "f8e6c12e5a1f3a5c...": {
      "finalWeight": 1.25,
      "metrics": {
        "profileAgeInDays": 730,
        "noteCountLastYear": 1500,
        "followerCount": 500,
        "followingCount": 200,
        "mutualsCount": 150
      }
    },
    "a3b8d9c7e6f5a1b2...": {
      "finalWeight": 0.4,
      "metrics": {
        "profileAgeInDays": 30,
        "noteCountLastYear": 10,
        "followerCount": 5,
        "followingCount": 80,
        "mutualsCount": 2
      }
    },
    "pubkey_not_found...": null
  }
}
```

---

## 5. Error Responses

*   **`400 Bad Request`**: The request body is malformed (e.g., `pubkeys` is missing or is not an array).
*   **`429 Too Many Requests`**: The client has exceeded the rate limit.
*   **`500 Internal Server Error`**: An unexpected error occurred on the server side during data fetching or calculation.

---

## 6. Caching Strategy

To ensure performance and reduce load on Nostr relays, the indexing service should implement a robust caching strategy. Scores for a given `pubkey` should be cached for a reasonable Time-To-Live (TTL), such as 12 to 24 hours, before being recalculated.