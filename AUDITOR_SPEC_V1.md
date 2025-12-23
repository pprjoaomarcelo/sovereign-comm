# Auditor Protocol v1: Specification and Requirements

This document specifies the role, requirements, and economic incentives for the "Auditor" nodes within the SovereignComm network. Auditors are specialized participants responsible for verifying the integrity of the decentralized storage layer provided by Archivists.

---

## 1. The Auditor Role

*   **Definition:** An Auditor is a high-reputation, high-stake network participant that runs specialized software to continuously and randomly verify that Archivists are correctly storing data.
*   **Purpose:** To offload the work of "Proof-of-Storage" verification from the Gateways. This separation of concerns makes the network more scalable, secure, and robust by creating a dedicated class of nodes whose sole function is to ensure data integrity.

---

## 2. Requirements to Become an Auditor

To ensure Auditors are trustworthy and aligned with the long-term health of the network, they must meet strict economic and technical requirements.

### 2.1. Minimum Stake (Economic Requirement)

*   **Requirement:** To become an active Auditor, an operator must lock a significant amount of capital as a security bond (stake). This stake is subject to "slashing" (confiscation) in case of malicious behavior.
*   **Proposed `MINIMUM_STAKE`:** `0.1 BTC` (or its equivalent in a wrapped asset).
*   **Rationale:**
    *   **High Trust:** The stake for an Auditor is proposed to be 10x that of a standard Gateway. This high barrier ensures that only highly committed operators can become Auditors.
    *   **Economic Security:** The value of the stake must be significantly greater than any potential profit from colluding with an Archivist or attempting to defraud the network. A `0.1 BTC` stake makes such actions economically irrational.

### 2.2. Technical Requirements

*   **Software:** Run the official SovereignComm Auditor node software.
*   **Uptime:** Maintain a high uptime (e.g., >99%) to be consistently available for network verification tasks.
*   **Connectivity:** Have a stable, high-bandwidth internet connection to efficiently challenge Archivists and report results.

---

## 3. Incentive and Payment System

Auditors are compensated for their work, creating a sustainable market for data verification services.

### 3.1. Funding Source

*   A dedicated **"Auditor Reward Pool"** will be funded by a percentage of the overall "Protocol Treasury", which collects a small fraction of all network transaction fees.

### 3.2. Reward Mechanism (The "Work Order")

*   For every valid "Proof-of-Storage" cycle that an Auditor successfully completes (i.e., challenging an Archivist and correctly verifying their response), the Auditor is entitled to a small, fixed fee.
*   This fee is automatically paid from the Auditor Reward Pool.

### 3.3. Payment Method

*   All reward payments to Auditors will be made via the **Lightning Network**. This ensures payments are instant, have near-zero fees, and can be processed at high volume, making the economic model viable.

---

## 4. Slashing Conditions (Punishment)

*   **Collusion:** If an Auditor is proven (via cryptographic fraud proofs) to have approved a false storage proof from a malicious Archivist, a significant portion of the Auditor's stake (e.g., 50%) will be slashed.
*   **Liveness Failure:** Auditors who consistently fail to perform their duties (e.g., due to being offline) will see their reputation score decrease, making them less likely to be assigned work, and may eventually be forcibly unstaked from the network.

This system ensures that Auditors are highly incentivized to act honestly and diligently, securing the entire decentralized storage layer of the SovereignComm network.