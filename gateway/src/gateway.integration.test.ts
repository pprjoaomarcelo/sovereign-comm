import request from 'supertest';
import app from './index.js';
import { createLightningInvoice, getInvoiceDetails } from './lightning.js';
import { addJsonToIpfs } from './ipfs.service.js';
import { anchorMerkleRoot } from './bitcoin.service.js';
import { BATCH_SIZE } from './config.js';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import { canonicalize } from 'json-canonicalize';

// Mock as dependências externas para isolar o teste no gateway
jest.mock('./lightning.js');
jest.mock('./ipfs.service.js');
jest.mock('./bitcoin.service.js');

const mockedCreateLightningInvoice = createLightningInvoice as jest.Mock;
const mockedGetInvoiceDetails = getInvoiceDetails as jest.Mock;
const mockedAddJsonToIpfs = addJsonToIpfs as jest.Mock;
const mockedAnchorMerkleRoot = anchorMerkleRoot as jest.Mock;

describe('Gateway Integration Test (Bitcoin-Only Flow)', () => {
  beforeEach(() => {
    // Limpa os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('should process a single message from quote to acceptance', async () => {
    // 1. Mock das respostas das dependências
    mockedCreateLightningInvoice.mockResolvedValue({
      invoice: 'lnbc1...',
      payment_hash: 'test_payment_hash_123',
      expires_at: new Date().toISOString(),
    });
    mockedGetInvoiceDetails.mockResolvedValue({
      is_confirmed: true,
      amount_msats: 50000,
    });
    mockedAddJsonToIpfs.mockResolvedValue('QmTestCid123');

    // --- Início da Simulação do Cliente ---

    // 2. Cliente pede uma cotação
    const quoteResponse = await request(app)
      .post('/quote')
      .send({ payloadSize: 150 });

    expect(quoteResponse.status).toBe(200);
    expect(quoteResponse.body).toHaveProperty('invoice', 'lnbc1...');
    const { payment_hash } = quoteResponse.body;

    // 3. Cliente "paga" a fatura e envia a mensagem
    const messagePayload = {
      sender: 'bitcoin_sender_address',
      recipient: 'bitcoin_recipient_address',
      content: 'This is a bitcoin-only test message',
      paymentHash: payment_hash, // Usa o hash da cotação
    };

    const messageResponse = await request(app)
      .post('/messages')
      .send(messagePayload);

    // --- Fim da Simulação do Cliente ---

    // 4. Verificação do Resultado
    expect(messageResponse.status).toBe(202); // 202 Accepted
    expect(messageResponse.body).toHaveProperty('cid', 'QmTestCid123');
    expect(mockedGetInvoiceDetails).toHaveBeenCalledWith('test_payment_hash_123');
    expect(mockedAddJsonToIpfs).toHaveBeenCalled();
  });

  describe('Gateway Integration Test (New Hashing Logic)', () => {
    it('should generate the correct Merkle root based on the full message payload', async () => {
      // 1. Configuração do Mock
      // Para este teste, o anexo ao IPFS pode retornar qualquer CID, pois não é o foco.
      mockedAddJsonToIpfs.mockResolvedValue('QmFakeCid');
      // O pagamento deve ser sempre confirmado.
      mockedGetInvoiceDetails.mockResolvedValue({ is_confirmed: true, amount_msats: 1000 });
      // A ancoragem na blockchain é o que queremos espionar.
      mockedAnchorMerkleRoot.mockResolvedValue('mock_txid_hashing_test');

      // 2. Preparar os dados de teste
      const messagePayloads = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        messagePayloads.push({
          sender: `sender_${i}`,
          recipient: `recipient_${i}`,
          content: `Test message ${i}`,
          paymentHash: `payment_hash_${i}`,
        });
      }

      // 3. Calcular a Merkle Root esperada (lógica do lado do cliente/verificador)
      const leaves = messagePayloads.map(payload => {
        const canonicalizedPayload = canonicalize(payload);
        return SHA256(canonicalizedPayload);
      });
      const tree = new MerkleTree(leaves, SHA256);
      const expectedMerkleRoot = tree.getRoot().toString('hex');

      // 4. Enviar as mensagens para o gateway para preencher o lote
      for (const payload of messagePayloads) {
        await request(app).post('/messages').send(payload);
      }

      // 5. Verificação
      // O lote deve ter sido processado exatamente uma vez.
      expect(mockedAnchorMerkleRoot).toHaveBeenCalledTimes(1);

      // A verificação mais importante: a Merkle Root enviada para ancoragem é a correta?
      expect(mockedAnchorMerkleRoot).toHaveBeenCalledWith(expectedMerkleRoot);
    });
  });
});