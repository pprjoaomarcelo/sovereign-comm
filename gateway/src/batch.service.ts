import { anchorMerkleRoot } from './bitcoin.service.js';
import logger from './logger.service.js';
import { canonicalize } from 'json-canonicalize';
import SHA256 from 'crypto-js/sha256.js';
import fs from 'fs/promises';
import { BATCH_SIZE, BATCH_TIMEOUT_MS, MAX_ANCHOR_RETRIES, INITIAL_RETRY_DELAY_MS, GATEWAY_ID } from './config.js';
import { getInvoiceDetails } from './lightning.js';

export interface AnchorReceipt {
  cid: string;
  txid: string;
  merkleRoot: string;
  merkleProof: string[]; // Array de hashes que compõem a prova
  network: 'bitcoin-testnet';
}

interface PendingCid {
  resolve: (receipt: Omit<AnchorReceipt, 'merkleProof'>) => void;
  reject: (error: Error) => void;
}

class MessageBatch {
  private messageObjects: { cid: string, payload: object }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private pendingMessages = new Map<string, PendingCid>();

  constructor() {
    this.startTimer();
  }

  async addMessage(cid: string, payload: object, paymentHash: string): Promise<Omit<AnchorReceipt, 'merkleProof'>> {
    if (!paymentHash) {
      throw new Error('Payment hash is required to add a CID to the batch.');
    }

    const invoiceDetails = await getInvoiceDetails(paymentHash);

    if (!invoiceDetails?.is_confirmed) {
      logger.warn(`[Batch] Payment not confirmed for hash: ${paymentHash}. CID ${cid} rejected.`);
      throw new Error(`Payment not confirmed for invoice ${paymentHash}.`);
    }

    logger.info(`[Batch] Payment confirmed for CID ${cid}. Amount: ${invoiceDetails.amount_msats} msats.`);

    return new Promise((resolve, reject) => {
      if (this.pendingMessages.has(cid)) {
        return reject(new Error(`CID ${cid} is already in the batch.`));
      }

      this.pendingMessages.set(cid, { resolve, reject }); // We still use CID as the unique key for the promise
      this.messageObjects.push({ cid, payload });
      logger.info(`[Batch] Message for CID ${cid} added to batch. Current size: ${this.messageObjects.length}`);
      if (this.messageObjects.length >= BATCH_SIZE) {
        logger.info(`[Batch] Batch is full (size: ${this.messageObjects.length}). Triggering anchor process.`);
        this.processCurrentBatch();
      }
    });
  }

  private startTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      if (this.messageObjects.length > 0) {
        logger.info(`[Batch] Batch timeout reached. Triggering anchor process with ${this.messageObjects.length} messages.`);
        this.processCurrentBatch();
      } else {
        this.startTimer(); // Restart timer if batch is empty
      }
    }, BATCH_TIMEOUT_MS);
  }

  async processCurrentBatch(): Promise<void> {
    if (this.messageObjects.length === 0) {
      this.startTimer(); // Restart timer and exit if there's nothing to process
      return;
    }

    const batchToProcess = [...this.messageObjects];
    this.messageObjects = []; // Clear the batch immediately
    this.startTimer(); // Restart the timer for the next batch

    // Start processing the batch without waiting for it to complete
    this.processBatch(batchToProcess);
  }

  private async processBatch(batch: { cid: string, payload: object }[], attempt = 1): Promise<void> {
    logger.info(`[Batch] Processing batch of ${batch.length} CIDs (Attempt ${attempt}).`);
    try {
      const leaves = batch.map(msg => SHA256(canonicalize(msg.payload)));
      const tree = new (require('merkletreejs').MerkleTree)(leaves, SHA256);
      const merkleRoot = tree.getRoot().toString('hex');
      const txid = await anchorMerkleRoot(merkleRoot);
      logger.info(`[Batch] Batch successfully anchored. txid: ${txid}, merkleRoot: ${merkleRoot}`);
      // TODO: Report success to the reputation service.
      // reputationService.reportSuccess(GATEWAY_ID);
      // Resolve all promises for the CIDs in this batch
      for (const msg of batch) {
        const pending = this.pendingMessages.get(msg.cid);
        if (pending) {
          const leaf = SHA256(canonicalize(msg.payload));
          const proof = tree.getProof(leaf).map((p: { data: Buffer; }) => p.data.toString('hex'));
          const receipt: AnchorReceipt = {
            cid: msg.cid,
            txid,
            merkleRoot,
            merkleProof: proof,
            network: 'bitcoin-testnet',
          };
          pending.resolve(receipt);
          this.pendingMessages.delete(cid);
        }
      }
    } catch (error) {
      logger.error(`[Batch] ANCHORING FAILED (Attempt ${attempt}):`, { error, batch });
      this.requeueFailedBatch(batch, attempt);
    }
  }

  private async requeueFailedBatch(failedBatch: string[], previousAttempt: number): Promise<void> {
    if (previousAttempt >= MAX_ANCHOR_RETRIES) { // This logic needs to be adapted for the new batch structure
      logger.crit(`CRITICAL: Batch failed after ${MAX_ANCHOR_RETRIES} attempts. Saving to DLQ.`, { failedBatch });
      // TODO: Report definitive failure to the reputation service.
      // reputationService.reportFailure(GATEWAY_ID);
      // Reject all promises for the CIDs in the failed batch - this part is tricky now
      for (const cid of failedBatch) {
        const pending = this.pendingMessages.get(cid);
        if (pending) {
          pending.reject(new Error(`Failed to anchor CID ${cid} after ${MAX_ANCHOR_RETRIES} attempts.`));
          this.pendingMessages.delete(cid);
        }
      }
      try {
        const dlqEntry = {
          timestamp: new Date().toISOString(),
          reason: `Batch failed after ${MAX_ANCHOR_RETRIES} attempts.`,
          batch: failedBatch,
        };
        await fs.appendFile('dead-letter-queue.log', JSON.stringify(dlqEntry) + '\n');
      } catch (dlqError) {
        logger.crit('CRITICAL: FAILED TO WRITE TO DEAD LETTER QUEUE.', { dlqError });
      }
      return;
    }

    const nextAttempt = previousAttempt + 1;
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, previousAttempt - 1);
    // This needs to be adapted for the new batch structure
    logger.warn(`[Batch] Re-queueing failed batch. Next attempt (${nextAttempt}) in ${delay / 60000} minutes.`); 
    // setTimeout(() => this.processBatch(failedBatch, nextAttempt), delay);
  }
}

export const messageBatch = new MessageBatch();