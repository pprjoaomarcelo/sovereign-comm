import { messageBatch, AnchorReceipt } from './batch.service.js';
import { anchorMerkleRoot } from './bitcoin.service.js';
import { BATCH_SIZE, BATCH_TIMEOUT_MS } from './config.js';

// 1. Mock das dependências externas
// Dizemos ao Jest: "Quando 'anchorMerkleRoot' for chamado, não execute a função real.
// Em vez disso, use esta simulação que podemos controlar."
jest.mock('./bitcoin.service.js', () => ({
  anchorMerkleRoot: jest.fn(),
}));

// Typecast para ter autocomplete e segurança de tipo no nosso mock
const mockedAnchorMerkleRoot = anchorMerkleRoot as jest.Mock;

describe('MessageBatch Service', () => {
  beforeEach(() => {
    // Limpa o estado dos mocks e timers antes de cada teste
    mockedAnchorMerkleRoot.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve processar um lote quando ele encher e resolver as promises com os recibos corretos', async () => {
    const MOCKED_TXID = 'mock_txid_full_batch';
    mockedAnchorMerkleRoot.mockResolvedValue(MOCKED_TXID);

    const messages = Array.from({ length: BATCH_SIZE }, (_, i) => ({
      cid: `test_cid_${i}`,
      payload: { data: `test_payload_${i}` },
      paymentHash: `test_payment_hash_${i}`,
    }));
    
    // Dispara todas as chamadas para addCid e armazena as Promises
    const promises = messages.map(msg => messageBatch.addMessage(msg.cid, msg.payload, msg.paymentHash));

    // Aguarda a resolução de todas as Promises
    const receipts = await Promise.all(promises);

    // 2. Verificações (Assertions)
    expect(mockedAnchorMerkleRoot).toHaveBeenCalledTimes(1);
    expect(receipts.length).toBe(BATCH_SIZE);

    // Verifica se cada recibo está correto
    receipts.forEach((receipt: AnchorReceipt, index) => {
      expect(receipt.cid).toBe(`test_cid_${index}`);
      expect(receipt.txid).toBe(MOCKED_TXID);
      expect(receipt.merkleRoot).toBeDefined();
      expect(receipt.merkleProof).toBeInstanceOf(Array);
    });
  });

  it('deve processar um lote por timeout e resolver as promises', async () => {
    const MOCKED_TXID = 'mock_txid_timeout';
    mockedAnchorMerkleRoot.mockResolvedValue(MOCKED_TXID);

    const cid = 'cid_for_timeout';
    const receiptPromise = messageBatch.addMessage(
      cid,
      { data: 'timeout_payload' },
      'timeout_payment_hash'
    );

    // 3. Avança o tempo artificialmente
    jest.advanceTimersByTime(BATCH_TIMEOUT_MS + 100);

    const receipt = await receiptPromise;

    expect(mockedAnchorMerkleRoot).toHaveBeenCalledTimes(1);
    expect(receipt.txid).toBe(MOCKED_TXID);
    expect(receipt.cid).toBe(cid);
  });
});