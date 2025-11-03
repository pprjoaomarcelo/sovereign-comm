import { Request, Response, NextFunction } from 'express';
import { addJsonToIpfs } from './ipfs.service.js';
import { messageBatch } from './batch.service.js';
// import { reputationService } from './reputation.service.js';
// import { reputationService } from './reputation.service.js';
import { createLightningInvoice } from './lightning.js';
import { calculateFee } from './pricing.service.js';
import logger from './logger.service.js';

// A simple async wrapper to catch errors and pass them to the error middleware
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Middleware de Autenticação.
 * Verifica se uma chave de API válida foi fornecida no header 'X-API-Key'.
 * Em um sistema real, essa chave seria comparada com uma lista de chaves válidas no banco de dados.
 */
export const authenticationMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');
  const expectedApiKey = process.env.GATEWAY_API_KEY || 'super-secret-key'; // Should be in .env

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key.' });
  }

  next();
});

interface MessagePayload {
  sender: string;
  recipient: string;
  timestamp: string;
  content: string;
  attachments?: unknown[];
}

export const handleNewMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const messagePayload: MessagePayload = req.body;
  logger.info('Received new message payload:', { sender: messagePayload.sender });

  const cidString = await addJsonToIpfs(messagePayload);
  logger.info(`Message added to IPFS with CID: ${cidString}`);

  messageBatch.addCid(cidString);

  res.status(202).json({
    message: 'Message received and added to batch.',
    cid: cidString,
  });
});

/**
 * Handles quote requests from the client.
 * Calculates a fee and returns a Lightning invoice.
 */
export const handleQuoteRequest = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { payloadSize, plan } = req.query;
  const size = Number(payloadSize);

  if (!payloadSize || isNaN(size) || size <= 0) {
    res.status(400).json({ error: 'Invalid payloadSize provided.' });
    return;
  }

  const feeInSats = await calculateFee(size);
  const memo = `SovereignComm message - ${size} bytes`;

  const { invoice, payment_hash, expires_at } = await createLightningInvoice(feeInSats * 1000, memo);
  res.status(200).json({ fee_sats: feeInSats, invoice, payment_hash, expires_at });
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
 */
export const handleGatewayListRequest = asyncHandler(async (req: Request, res: Response) => {
  // TODO: Re-enable when reputation service is implemented.
  // For now, this endpoint is not implemented.
  // const gateways = reputationService.getGateways();
  // const sortedGateways = gateways.sort((a, b) => b.reputationScore - a.reputationScore);
  // logger.info(`Serving gateway list request with ${sortedGateways.length} gateways.`);
  res.status(501).json({ message: "Gateway list endpoint is not yet implemented." });
});