# Social Trust Score Algorithm v1

This document specifies the client-side algorithm for calculating a "Social Trust Score" for each "Vouch NFT". This score is used as a weight to determine the overall reputation of a gateway, providing a strong defense against Sybil attacks.

## 1. Objective

The goal is to algorithmically assess the "authenticity" or "realness" of a Nostr identity associated with a Vouch NFT. A higher score indicates a higher probability that the identity is a real, established user rather than a bot created for a Sybil attack. This score is then used as a multiplier for the vouch's rating.

## 2. Data Sources

For each Vouch NFT, the client queries public Nostr relays for the following information associated with the voucher's public key (`pubkey`):

*   **Profile Metadata (`kind:0`):** The user's profile information (name, bio, etc.). We are most interested in the `created_at` timestamp of the *oldest* `kind:0` event to determine profile age.
*   **Contact List (`kind:3`):** The list of public keys the user follows. This is crucial for social graph analysis.
*   **Notes (`kind:1`):** The user's public posts. We are interested in the quantity and recency of these notes to gauge activity.
*   **Reverse Contact List (Followers):** The client must also query for `kind:3` events from *other* users that include the voucher's `pubkey` in their tags. This is how we determine who follows the voucher.

## 3. The Algorithm (Client-Side Calculation)

For each Vouch NFT, the client performs the following steps:

### Step 1: Fetch Nostr Data

Fetch the `kind:0`, `kind:3`, and a sample of `kind:1` events for the voucher's `pubkey`. Also, fetch `kind:3` events that tag the voucher's `pubkey` to build a list of followers.

### Step 2: Calculate Individual Metrics

The client calculates several raw metrics.

*   `profileAgeInDays`: `(currentTime - oldest_kind0_timestamp) / (24 * 60 * 60)`
*   `noteCountLastYear`: Number of `kind:1` notes in the last 365 days.
*   `followingCount`: Number of pubkeys in the voucher's `kind:3` contact list.
*   `followerCount`: Number of other users who list the voucher in their `kind:3` contact list.
*   `mutualsCount`: Number of pubkeys that appear in *both* the voucher's `following` list and their `followers` list.

### Step 3: Normalize and Score Each Metric

Raw numbers are not useful for comparison. We need to convert them into a normalized score, typically between 0 and 1. This can be done using logarithmic scaling to reward initial effort more and give diminishing returns for huge numbers (preventing celebrity accounts from having an excessive weight).

*   `ageScore`: `log10(profileAgeInDays + 1) / 3` (Normalized so ~3 years old = score of 1.0)
*   `activityScore`: `log10(noteCountLastYear + 1) / 3` (Normalized so 1000 notes = score of 1.0)
*   `socialGraphScore`: This is the most important one. We combine following, followers, and mutuals to reward genuine interaction, not just broadcasting or mass-following.
    *   `followRatio = followerCount / (followingCount + 1)` (Penalizes accounts that follow many but have few followers).
    *   `mutualRatio = mutualsCount / (followerCount + 1)` (Rewards accounts with reciprocal relationships).
    *   `socialGraphScore = clamp( (followRatio * 0.5) + (mutualRatio * 0.5) , 0, 1)` (A simple weighted average, clamped between 0 and 1).

### Step 4: Calculate the Final Social Trust Score

Combine the normalized scores using a weighted formula. The weights can be adjusted as the protocol evolves.

```typescript
// Example weights
const AGE_WEIGHT = 0.25;
const ACTIVITY_WEIGHT = 0.35;
const SOCIAL_GRAPH_WEIGHT = 0.40;

const socialTrustScore = (ageScore * AGE_WEIGHT) +
                         (activityScore * ACTIVITY_WEIGHT) +
                         (socialGraphScore * SOCIAL_GRAPH_WEIGHT);

// The score is clamped between a minimum (e.g., 0.1) and maximum (e.g., 1.5)
// to ensure every vouch has some value, but no single vouch has excessive power.
const finalWeight = clamp(socialTrustScore, 0.1, 1.5);
```

### Step 5: Apply the Weight

When the client calculates the gateway's overall reputation, it doesn't just average the star ratings. It calculates a weighted average.

*   **Simple Average (Bad):** `Sum of all ratings / Number of vouches`
*   **Weighted Average (Good):** `Sum of (rating * finalWeight) / Sum of all finalWeights`

This ensures that vouches from users with a higher "Social Trust Score" have a proportionally greater impact on the gateway's final reputation, effectively drowning out the noise from potential Sybil attacks.