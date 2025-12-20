# Roadmap do Projeto Soberania

Este documento descreve a trajetória planejada para o desenvolvimento do Projeto Soberania.

---

### Fase 1: Fundação da Rede (MVP - Produto Mínimo Viável)

*   **Objetivo:** Implementar a arquitetura base de 3 nós (Gateway, Minerador, Indexador) e o ciclo de vida completo de uma `service_order`, desde a criação até a confirmação em um lote ancorado no Bitcoin.
*   **Entregáveis Chave:**

    #### 1. Protocolo e Estruturas de Dados
    *   [x] **Estruturas de Dados:** Definir as estruturas canônicas para `service_order`, `batch_manifest`, e `fraud_proof`.
    *   [x] **Rede de Gossip:** Especificar os tópicos e formatos de mensagem para a camada de pub/sub (`gossip-spec.md`).
    *   [x] **Serialização (JCS):** Padronizar o uso de JSON Canonicalization Scheme (RFC 8785) para todas as assinaturas.
    *   [x] **Versionamento:** Garantir que todas as mensagens de protocolo incluam um campo `protocol_version`.

    #### 2. Especificação das APIs
    *   **Gateway API (`gateway-api-spec.md`):**
        -   [ ] Detalhar endpoint `POST /orders` para submissão de `service_order`.
        -   [ ] Detalhar endpoint `GET /orders/status/{paymentHash}` para consulta de status.
        -   [ ] Detalhar endpoints de autenticação (ex: `POST /auth/challenge` e `POST /auth/login`) para um fluxo SIWB (Sign-In with Bitcoin).
        -   [ ] Definir formatos de requisição/resposta (JSON Schema) e códigos de erro HTTP.
    *   **Indexer API (`indexer-spec.md`):**
        -   [ ] Detalhar endpoint `GET /manifests/{txId}` para buscar um `batch_manifest` confirmado.
        -   [ ] Detalhar endpoint `GET /reputation/miners/{minerPublicKey}` para consulta de reputação.
        -   [ ] Definir formatos de requisição/resposta e códigos de erro HTTP.

    #### 3. Implementação dos Nós
    *   **Gateway de Ingestão:**
        -   [ ] Implementar a API RESTful conforme a especificação.
        -   [ ] Implementar a lógica de autenticação SIWB para geração de token JWT.
        -   [ ] Validar e propagar `service_order`s para a rede de gossip.
    *   **Minerador de Lote:**
        -   [ ] Implementar a escuta da mempool de `service_order`s na rede de gossip.
        -   [ ] Implementar a lógica de seleção de ordens e construção de um `batch_manifest`.
        -   [ ] Implementar a ancoragem do lote no Bitcoin (Testnet), publicando a Merkle Root em uma transação `OP_RETURN`.
        -   [ ] Publicar o `batch_manifest` completo na rede de gossip.
    *   **Indexador:**
        -   [ ] Implementar a escuta da rede de gossip para `batch_manifests`.
        -   [ ] Implementar a escuta da blockchain Bitcoin (Testnet) para correlacionar manifestos com suas âncoras.
        -   [ ] Implementar a API base para consulta de manifestos.

    #### 4. Cliente de Teste e Validação
    *   [ ] Desenvolver uma CLI ou aplicação web simples para interagir com a API do Gateway.
    *   [ ] Criar um conjunto de testes de integração para validar o ciclo de vida completo de uma `service_order`, desde a submissão no Gateway até a consulta do seu `batch_manifest` no Indexador.

---

### Fase 1.5: Oráculo de Reputação Descentralizado

*   *Objetivo:* Implementar os mecanismos que permitem a descoberta, verificação e consulta de múltiplos oráculos de reputação (Indexadores), tornando a rede resistente a falhas e manipulações.
*   **Entregáveis Chave:**
    -   *Protocolo e Especificação:*
        -   [x] *Rede de Gossip:* Especificar os tópicos e formatos de mensagem para a camada de pub/sub.
        -   [x] *Estruturas de Dados:* Definir `service_order`, `batch_manifest` e `fraud_proof`.
        -   [x] *Serialização Canônica (JCS):* Especificar o uso de JCS (RFC 8785) para assinaturas.
        -   [x] *Versionamento do Protocolo:* Incluir o campo `protocol_version` em todas as mensagens.
        -   [x] *Anúncio do Indexador:* Especificar a mensagem indexer_advertisement para descoberta P2P.
        -   [x] *API Assinada:* Especificar a assinatura de respostas na API do Indexador para não-repúdio.
        -   [x] *Prova de Fraude do Indexador:* Definir a estrutura da indexer_fraud_proof para penalizar oráculos maliciosos.
        -   [x] *Contrato de Staking:* Especificar o contrato Taproot para o stake de Indexadores.
    -   *Implementação (Reputação):*
    -   *Implementação (Gateway - Cliente do Oráculo):*
        -   [ ] *Descoberta:* Subscrever ao tópico de anúncios de Indexadores, validar as assinaturas e manter um cache local de oráculos ativos.
        -   [ ] *Verificação:* Implementar a lógica para verificar o stake de um Indexador, reconstruindo o endereço Taproot e consultando a blockchain para confirmar o valor depositado.
        -   [ ] *Consulta:* Selecionar múltiplos Indexadores confiáveis (baseado em stake verificado), consultá-los em paralelo e verificar a assinatura de suas respostas.
        -   [ ] *Agregação:* Consolidar as respostas de múltiplos oráculos para formar um resultado de reputação confiável.
    -   *Implementação (Indexador - Servidor do Oráculo):*
        -   [ ] *Anúncio de Serviço:* Implementar a geração e publicação periódica de mensagens indexer_advertisement na rede de gossip.
        -   [ ] *Cálculo de Reputação:* Implementar a lógica para agregar batch_manifests e fraud_proofs em um score de reputação para cada minerador.
        -   [ ] *API de Reputação:* Expor o score de reputação através do endpoint GET /reputation/miners/{minerPublicKey}.
        -   [ ] *Respostas Assinadas:* Implementar a assinatura criptográfica das respostas da API de reputação para garantir autenticidade e não-repúdio.

---

### Fase 2: Fortalecimento Econômico e Confiança

*   *Objetivo:* Implementar os mecanismos que garantem a segurança econômica, a confiabilidade e a viabilidade comercial da rede.
*   **Entregáveis Chave:**
    -   *Mecanismos de Confiança:*
        -   [ ] *Distribuição de Pagamentos:* Implementar a lógica no Minerador para distribuir as taxas para os Gateways via Lightning (ex: Keysend).
        -   [ ] *Geração de Provas de Fraude (Fraud Proofs):* Implementar a geração de fraud_proof no Gateway quando um pagamento falha.
    -   *Monetização e Reputação:*
        -   [ ] *Monetização da API:* Implementar a monetização da API do Indexador usando LSATs.
        -   [ ] *API de Reputação:* Implementar o endpoint de reputação no Indexador para que a rede possa avaliar os Mineradores.
    -   *Persistência (Premium):*
        -   [ ] Integrar com Filecoin ou Arweave como um serviço premium para armazenamento de longo prazo.

---

### Fase 3: Expansão e Resiliência

*   *Objetivo:* Realizar a visão de longo prazo de comunicação offline e fortalecer ainda mais a segurança da rede.
*   **Entregáveis Chave:**
    -   *Staking de Mineradores:*
        -   [ ] Implementar um sistema de Staking onde Mineradores depositam uma caução (bond) em BTC, que pode ser perdida em caso de fraude comprovada.
    -   *Execução de Contratos de Legado (Legacy Contracts):*
        -   [ ] *Lógica de Disputa:* Implementar nos nós (principalmente no Indexador e na wallet do guardião) a lógica para processar dispute_withdrawal (vetos) e veto_withdrawal (retiradas de veto), garantindo a paralisação e retomada corretas do processo de execução.
        -   [ ] *Registro de Auditoria:* Implementar a criação e publicação do execution_record ao final de um processo de execução bem-sucedido.
    -   *Comunicação Offline:*
        -   [ ] *Firmware do Nó:* Desenvolver o software para hardware de baixo custo (ex: ESP32 com LoRa).
        -   [ ] *Protocolo Mesh:* Definir e implementar o roteamento de mensagens entre os nós offline.
        -   [ ] *Integração com a Rede:* Habilitar um nó com acesso à internet para atuar como ponte entre a rede mesh e a rede de gossip global.

---