# Nostr Indexer Announcement Event v1

This document specifies the structure of the Nostr event used by Reputation Indexing Services to announce their presence and capabilities to the network. This allows clients to dynamically discover available indexers.

## 1. Objective

To define a standardized, machine-readable format for indexer announcements, enabling a decentralized marketplace of reputation data providers.

---

## 2. Nostr Event Structure

The announcement is a standard Nostr event with the following specific structure:

*   **`kind`**: `31990`
    *   **Rationale:** This is a Parameterized Replaceable Event. It's ideal because it allows the operator to publish a single, lasting announcement that can be updated later (e.g., to change prices). The old event is automatically replaced by the new one on relays, preventing network spam.

*   **`tags`**:
    *   `["d", "sovereign-reputation-indexer-v1"]`
        *   **Rationale:** This is the primary identifier. Clients will query Nostr relays for events with this exact `d` tag to discover all available indexers.

*   **`content`**: A JSON string containing the service's metadata.

---

## 3. Content JSON Schema

The `content` field of the Nostr event must be a JSON object with the following keys:

| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | A human-readable name for the service (e.g., "My Sovereign Indexer"). |
| `description` | string | No | A brief description of the service, its focus, or policies. |
| `endpoint` | string | Yes | The base HTTPS URL for the API endpoint (e.g., `https://my-indexer.com/v1`). |
| `onion_endpoint` | string | No | The Tor Onion Service (`.onion`) address for the API, for enhanced privacy. |
| `price_per_1k_pubkeys_sats` | number | No | The price in satoshis to score 1,000 pubkeys. If omitted, the service is assumed to be free. |
| `privacy_policy_url` | string | No | A URL pointing to the service's privacy policy document. |
| `operator_pubkey` | string | No | The Nostr public key of the service operator, for contact or reputation purposes. |

---

## 4. Example Event

```json
{
  "kind": 31990,
  "pubkey": "operator_nostr_pubkey_here...",
  "created_at": 1760361600,
  "tags": [
    ["d", "sovereign-reputation-indexer-v1"]
  ],
  "content": "{\"name\":\"My Privacy-Focused Indexer\",\"description\":\"Fast and privacy-preserving reputation scores. We adhere to the ideal privacy policy.\",\"endpoint\":\"https://my-indexer.com/v1\",\"onion_endpoint\":\"http://<your_onion_address>.onion/v1\",\"price_per_1k_pubkeys_sats\":10,\"privacy_policy_url\":\"https://my-indexer.com/privacy.md\",\"operator_pubkey\":\"operator_nostr_pubkey_here...\"}",
  "id": "event_id_here...",
  "sig": "event_signature_here..."
}
```

---

## 5. Segurança do Cliente: Defesa Contra Indexadores Maliciosos

Um diagrama de sequência é uma excelente forma de visualizar como o cliente se defende de um indexador malicioso. O mecanismo de defesa do cliente se baseia em dois princípios: **redundância** (não confiar em uma única fonte) e **verificação** (o cliente pode auditar o trabalho do indexador).

Abaixo está um diagrama de sequência que ilustra esse processo, seguido de uma explicação detalhada.

```mermaid
sequenceDiagram
    participant Client as Cliente
    participant Indexer_A as Indexador A (Honesto)
    participant Indexer_B as Indexador B (Honesto)
    participant Indexer_C as Indexador C (Malicioso)
    participant Nostr_Relays as Relays Nostr

    autonumber

    %% O Cliente solicita pontuações de múltiplos indexadores
    Client-&gt;&gt;Indexer_A: POST /v1/scores (solicita pontuações)
    Client-&gt;&gt;Indexer_B: POST /v1/scores (solicita pontuações)
    Client-&gt;&gt;Indexer_C: POST /v1/scores (solicita pontuações)

    %% Os Indexadores respondem
    Indexer_A--&gt;&gt;Client: Resposta com pontuações honestas
    Indexer_B--&gt;&gt;Client: Resposta com pontuações honestas
    Indexer_C--&gt;&gt;Client: Resposta com pontuações manipuladas (outlier)

    activate Client
    %% O Cliente analisa as respostas
    Note over Client: Compara as pontuações e detecta que a resposta do Indexador C é uma anomalia.

    %% O Cliente realiza uma verificação por amostragem para confirmar a fraude
    Note over Client: Inicia auditoria para um pubkey da amostra.
    Client-&gt;&gt;Nostr_Relays: Busca dados brutos (kind:0, 1, 3) do pubkey
    Nostr_Relays--&gt;&gt;Client: Retorna eventos Nostr

    Note over Client: Recalcula o Social Trust Score localmente usando o algoritmo padrão.
    Note over Client: Confirma que a pontuação do Indexador C está incorreta.

    %% O Cliente toma uma ação corretiva
    Note over Client: Descarta a resposta do Indexador C.
    Note over Client: Usa a média ou mediana das pontuações confiáveis (A e B).
    Note over Client: Penaliza ou remove o Indexador C da sua lista de provedores.
    deactivate Client
```

### Explicação do Fluxo

1.  **Requisições Redundantes**: O cliente não confia em um único provedor. Ele envia a mesma lista de pubkeys para múltiplos indexadores de reputação que o usuário configurou (neste exemplo, A, B e C).
2.  **Respostas Múltiplas**: O cliente recebe as respostas. Os indexadores honestos (A e B) retornam pontuações similares e consistentes. O indexador malicioso (C) retorna pontuações infladas ou manipuladas, que se destacam como uma anomalia.
3.  **Detecção de Anomalia**: O cliente compara os conjuntos de pontuações. Ao notar que os resultados do Indexador C são significativamente diferentes dos outros, ele o marca como um *outlier* (ponto fora da curva) e suspeito.
4.  **Auditoria (Verificação por Amostragem)**: Para confirmar a fraude sem ter que reprocessar todos os dados, o cliente realiza uma verificação por amostragem. Ele escolhe aleatoriamente um ou dois pubkeys do lote e executa o algoritmo de pontuação localmente, buscando os dados brutos diretamente dos relays Nostr.
5.  **Confirmação da Fraude**: O resultado do cálculo local do cliente corresponde às pontuações dos Indexadores A e B, mas é drasticamente diferente da pontuação do Indexador C. Isso serve como prova de que o Indexador C está agindo de má-fé.
6.  **Ação Corretiva**: Com a fraude confirmada, o cliente:
    *   Descarta completamente o conjunto de dados do Indexador C.
    *   Calcula a reputação final usando apenas as pontuações dos indexadores confiáveis (A e B).
    *   Penaliza o Indexador C, seja diminuindo sua prioridade na lista de provedores ou removendo-o completamente, garantindo que não será mais usado no futuro.

Este modelo transforma a confiança em um problema de consenso, tornando ataques extremamente difíceis e caros. Um ator malicioso não só precisaria rodar um indexador, mas precisaria controlar uma maioria de indexadores para conseguir manipular a reputação de forma eficaz.