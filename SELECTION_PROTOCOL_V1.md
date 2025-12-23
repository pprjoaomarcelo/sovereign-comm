# Auditor Selection Protocol v1: Cryptographic Sortition

This document specifies the decentralized mechanism for selecting an Auditor to perform a "Proof-of-Storage" challenge. The protocol, known as Cryptographic Sortition, uses the Bitcoin blockchain as a public and unpredictable source of randomness to ensure fairness and prevent collusion.

---

## 1. Core Principles

The selection process must be:
*   **Unpredictable:** No single entity can know in advance which Auditor will be selected for a given task.
*   **Decentralized:** The selection is not made by a central server. Any participant in the network can independently verify who was selected.
*   **Fair:** Over time, every active Auditor has a statistically equal chance of being selected, proportional to their reputation or stake if applicable.
*   **Verifiable:** Anyone can retroactively check the blockchain history to confirm that the correct Auditor was assigned a task for a specific moment in time.

---

## 2. The Cryptographic Sortition Algorithm

The algorithm uses the hash of a recent Bitcoin block as a "lottery ticket" to deterministically select an Auditor from a public list.

### Step 1: The Trigger

*   A new "selection round" is triggered by every new block mined on the Bitcoin blockchain.

### Step 2: The Inputs

For any given block height (e.g., block #850,000), there are two public inputs:

1.  **The Seed (`seed`):** The hash of the corresponding Bitcoin block. This is a globally agreed-upon, unpredictable random number.
    *   `seed = block_hash("850000")`
2.  **The Participant List (`auditor_list`):** A publicly known, ordered list of all active and staked Auditors. This list can be maintained via a smart contract or a collection of signed Nostr announcements.
    *   `auditor_list = [auditor_A_pubkey, auditor_B_pubkey, auditor_C_pubkey, ...]`

### Step 3: The Selection Algorithm

Every node in the network can independently run the same simple algorithm to determine the winner of the "lottery" for that block.

1.  **Generate a Number:** Hash the `seed` using a standard hashing function like SHA-256.
2.  **Calculate the Index:** Use the modulo operator (`%`) on the resulting hash to get an index that is within the bounds of the `auditor_list`.

**Pseudo-code:**
```
block_hash = get_bitcoin_block_hash(850000)
active_auditors = get_active_auditor_list()

hashed_seed = sha256(block_hash)
winner_index = integer_from_hash(hashed_seed) % length(active_auditors)

selected_auditor = active_auditors[winner_index]
```

### Step 4: Task Assignment & Execution

*   The same algorithm is used to select which Archivist and which file CID will be challenged in that round, simply by using a slightly different seed (e.g., `sha256(block_hash + "archivists")`).
*   The protocol now has a publicly defined task: "Auditor C must challenge Archivist Y for file Z".
*   The software of the selected Auditor automatically detects its selection and initiates the Proof-of-Storage challenge.
*   If the selected Auditor fails to perform the task within a defined time window (e.g., the next 6 blocks), it is considered a "liveness failure", its reputation is penalized, and the task may be passed to the next Auditor in the deterministic sequence.