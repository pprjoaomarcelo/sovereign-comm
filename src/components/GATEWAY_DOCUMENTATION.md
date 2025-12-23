# SovereignComm Gateway Documentation

This document describes the tools and methods to facilitate the implementation, configuration, and management of SovereignComm network gateways. The goal is to make the gateway operator's experience as simple and rewarding as possible, encouraging the expansion and robustness of the network.

## 1. Containerization with Docker

To radically simplify installation and management, all gateway software will be packaged into a single Docker container.

*   **Method:** The container will include all necessary components for operation:
    *   The main gateway node.
    *   Blockchain anchoring scripts.
    *   The communication interface with the Lightning node.
    *   All system dependencies and libraries.

*   **Ease for the Operator:** The installation will be reduced to a single command, abstracting away all the complexity of environment setup, dependency installation, code compilation, and database management.
    ```bash
    docker run sovereign-comm/gateway
    ```

## 2. Configuration via Web Interface

Instead of forcing operators to edit text-based configuration files (`.conf`, `.toml`), the gateway will expose a simple and intuitive local web interface.

*   **Method:** A lightweight web application will be served locally by the gateway container, accessible through a browser on the operator's local network.

*   **Ease for the Operator:** Through this interface, the operator can manage all critical settings visually:
    *   **Pricing:** Set their prices (sats per message/attachment).
    *   **Integrations:** Connect their API keys for external services (e.g., Filecoin, blockchain RPCs).
    *   **Payments:** Connect their Lightning wallet/node to receive payments from users.
    *   **Monitoring:** Access performance dashboards.

## 3. Monitoring Dashboards

The web interface will include clear and visual dashboards so the operator can treat their gateway as a manageable business.

*   **Method:** The web interface will collect and display real-time metrics, updated continuously.

*   **Ease for the Operator:** The operator will have a clear and immediate view of:
    *   **Node Health:** Uptime, internet connection status, and connection to blockchain networks.
    *   **Service Metrics:** Number of messages processed, volume of data stored.
    *   **Financial Metrics:** Total satoshis earned, operational costs (gas fees spent), and profitability.

## 4. "Plug-and-Play" Documentation

The documentation will be a first-class product, focusing on practical and accessible guides.

*   **Method:** We will create step-by-step guides, with videos and automation scripts, for the most common low-cost hardware platforms (e.g., Raspberry Pi, Umbrel, Start9).

*   **Ease for the Operator:** The goal is for a guide like **"How to turn your Raspberry Pi into a SovereignComm Gateway in 15 minutes"** to be the main marketing and adoption tool, empowering anyone with basic technical knowledge to join and strengthen the network.

## 5. Gateway Security

The security of the gateway is a shared responsibility between the SovereignComm software and the operator. While the software is designed to minimize risks, correct configuration and management by the operator are crucial.

*   **Environment Isolation:**
    *   **Docker:** As previously described, using Docker containers provides a fundamental layer of isolation, separating the gateway's environment from the rest of the operator's operating system.

*   **Key Management (Operator's Responsibility):**
    *   **Lightning Wallet Keys:** The keys that control the received funds are **not** managed by the gateway software. The gateway only communicates with the operator's Lightning node (e.g., LND, Core Lightning) via its API. Securing the Lightning node is the operator's full responsibility.
    *   **Bitcoin Private Key (for Anchoring):** The key used to sign anchoring transactions (`OP_RETURN`) should only hold the minimum balance required for transaction fees. It must be treated as a "hot wallet". It is strongly recommended that operators do not use a key that holds the majority of their funds.
    *   **API Keys:** Keys for services like Pinata or blockchain RPCs must be stored securely in the configuration file (e.g., `.env`) and should never be exposed publicly.

*   **Secure Configuration Interface:**
    *   **Local Access Only:** The web interface for gateway configuration will, by default, be accessible only on the local network (`localhost`). It **must not** be exposed to the public internet to prevent unauthorized access.
    *   **Password Protection (Future):** A future enhancement will be to add password protection to this local configuration dashboard for an extra layer of security.

*   **Software Updates:**
    *   **Keep Updated:** Operators are responsible for keeping their gateway software up to date. Regularly pulling the latest Docker image (`docker pull sovereign-comm/gateway:latest`) is essential to receive security patches, bug fixes, and new features.