import { Request, Response, NextFunction } from 'express';
import { addJsonToIpfs } from './ipfs.service.js';
import { messageBatch } from './batch.service.js';
// import { reputationService } from './reputation.service.js';
import { createLightningInvoice } from './lightning.js';
import { calculateFee } from './pricing.service.js';
import type { AttachmentInfo } from './pricing.service.js';
import logger from './logger.service.js';

// A simple async wrapper to catch errors and pass them to the error middleware
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
interface MessagePayload {
  sender: string;
  recipient: string;
  timestamp: string;
  content: string;
  attachments?: unknown[];
  preferredPinningService?: string;
  paymentHash: string;
}

export const handleNewMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const messagePayload: MessagePayload = req.body;
  const { preferredPinningService, paymentHash, ...loggablePayload } = messagePayload;
  logger.info('Received new message payload:', { sender: loggablePayload.sender, paymentHash });

  try {
    // 1. Add content to IPFS to get the CID.
    const cidString = await addJsonToIpfs(messagePayload, preferredPinningService);
    logger.info(`Message added to IPFS with CID: ${cidString}`);

    // 2. Add the CID to the batch. This step now internally CHECKS THE PAYMENT.
    // The addCid promise resolves when the batch is anchored, which can take time.
    // We pass the full payload to be hashed, not just the CID.
    messageBatch.addMessage(cidString, messagePayload, paymentHash)
      .then(receipt => {
        logger.info(`[Gateway] CID ${receipt.cid} successfully anchored.`, { txid: receipt.txid });
        // TODO: In the future, we can notify the client of anchoring success via WebSocket or another mechanism.
      })
      .catch(error => {
        // A failure here (e.g., anchoring failure after retries) happens long after the client response, so we can only log it.
        logger.error(`[Gateway] Failed to process CID ${cidString} in batch.`, { error: error.message });
      });

    // 3. Respond to the client immediately that the message has been accepted for processing.
    return res.status(202).json({
      message: 'Message received and accepted for batching.',
      cid: cidString,
    });
  } catch (error) {
    if ((error as Error).message.includes('Payment not confirmed')) {
      logger.warn(`[Gateway] Payment not confirmed for hash: ${paymentHash}.`);
      return res.status(402).json({ error: 'Payment required.', details: (error as Error).message });
    }
    next(error); // Pass other errors to the general error handler.
  }
});

/**
 * Handles quote requests from the client. Calculates a fee based on payload and
 * attachment sizes and returns a Lightning invoice.
 */
export const handleQuoteRequest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { payloadSize, attachments } = req.body as { payloadSize: number; attachments?: AttachmentInfo[] };

  if (typeof payloadSize !== 'number' || payloadSize < 0) {
    return res.status(400).json({ error: 'A valid numeric payloadSize is required.' });
  }

  try {
    const feeInSats = await calculateFee(payloadSize, attachments);

    const totalAttachmentSize = attachments?.reduce((sum, att) => sum + att.sizeBytes, 0) || 0;
    const totalDataSize = payloadSize + totalAttachmentSize;
    const attachmentCount = attachments?.length || 0;
    const memo = `SovereignComm message (${totalDataSize} bytes, ${attachmentCount} attachments)`;

    const { invoice, payment_hash, expires_at } = await createLightningInvoice(feeInSats * 1000, memo);
    res.status(200).json({
      fee_sats: feeInSats,
      invoice,
      payment_hash,
      expires_at
    });
  } catch (error) {
    logger.error('[Gateway] Failed to create quote.', { error: (error as Error).message });
    next(error);
  }
});

/**
 * Returns the current status of the message batch.
 */
export function handleBatchStatusRequest(req: Request, res: Response) {
  res.status(200).json({
    message: "This endpoint is deprecated."
  });
}

/**
 * Handles requests for the list of known gateways and their reputation.
 * In a real-world scenario, this list would come from a decentralized registry.
 * This is currently a placeholder.
 */
export const handleGatewayListRequest = asyncHandler(async (req: Request, res: Response) => {
  // const gateways = reputationService.getGateways();
  // const sortedGateways = gateways.sort((a, b) => b.reputationScore - a.reputationScore);
  res.status(501).json({ message: "Gateway list endpoint is not yet implemented." });
});