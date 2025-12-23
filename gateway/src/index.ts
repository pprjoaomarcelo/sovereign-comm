/**
 * @description The main entry point for the SovereignComm Gateway service.
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import {
  handleNewMessage,
  handleQuoteRequest,
  handleGatewayListRequest,
  handleBatchStatusRequest,
} from './gateway.service.js';
import { initializeIpfsClient } from './ipfs.service.js';
import { verifySignature } from './auth.service.js';
import logger from './logger.service.js';
import { loggingMiddleware } from './logging.middleware.js';
import { validateNewMessage } from './validation.middleware.js';
import { authenticateJWT } from './auth.middleware.js';
import { errorMiddleware } from './error.middleware.js';

const app = express();
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

const PORT = process.env.GATEWAY_PORT || 3000;

if (!process.env.JWT_SECRET) {
  logger.warn('[Startup] JWT_SECRET is not set. Using a default insecure secret. Please set this in your .env file for production.');
  process.env.JWT_SECRET = 'default-insecure-secret-for-dev-only';
}

// --- Middlewares de Segurança Essenciais ---
app.use(helmet()); // Adiciona vários headers de segurança
app.use(cors()); // Habilita Cross-Origin Resource Sharing para APIs públicas

// Simple in-memory store for challenges. In a production environment, use Redis or a similar store.
const challengeStore = new Map<string, { challenge: string; expires: number }>();

// --- Rate Limiter ---
// Protege contra ataques de força bruta e DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Inicialização de Serviços Externos (Condicional) ---
// O gateway tentará iniciar mesmo que as chaves não estejam presentes,
// mas as funcionalidades dependentes falharão de forma controlada.
if (process.env.PINATA_JWT) {
  initializeIpfsClient();
  logger.info('[Startup] IPFS service initialized with Pinata JWT.');
} else {
  logger.warn('[Startup] PINATA_JWT not found. IPFS functionality will be disabled.');
}

if (process.env.VOLTAGE_API_KEY && process.env.VOLTAGE_NODE_ID) {
  // A importação dinâmica garante que o módulo lightning só seja carregado se a chave existir.
  import('./lightning.js').then(() => {
    logger.info('[Startup] Lightning service initialized with Voltage API Key.');
  }).catch(error => {
    logger.error('[Startup] Failed to initialize Lightning service.', { error });
  });
} else {
  logger.warn('[Startup] VOLTAGE_API_KEY or VOLTAGE_NODE_ID not found. Lightning functionality will be disabled.');
}

app.use(express.json());

app.use(loggingMiddleware);

/**
 * Health check endpoint.
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'SovereignComm Gateway is running',
    documentation: 'See DOCUMENTATION.md for API endpoints.',
  });
});

// --- API Routes ---
app.post('/quote', apiLimiter, handleQuoteRequest);
app.get('/gateways', handleGatewayListRequest);
app.get('/batch/status', handleBatchStatusRequest);

// --- Authentication Flow ---

app.get('/auth/challenge', apiLimiter, (req, res) => {
  // Generate a unique, random challenge message
  const challenge = `sovereign-comm-login-${randomBytes(16).toString('hex')}-${Date.now()}`;
  
  // Use a temporary ID to track this challenge. In a real session-based app, this would be linked to the user's session ID.
  const tempId = randomBytes(16).toString('hex');
  
  // Store the challenge with a 5-minute expiration
  challengeStore.set(tempId, { challenge, expires: Date.now() + 5 * 60 * 1000 });

  logger.info(`[Auth] Generated challenge for tempId: ${tempId}`);
  res.json({ challenge, tempId });
});

app.post('/auth/login', apiLimiter, (req, res) => {
  const { tempId, signature, senderAddress } = req.body;

  if (!tempId || !signature || !senderAddress) {
    return res.status(400).json({ error: 'Missing tempId, signature, or senderAddress.' });
  }

  const stored = challengeStore.get(tempId);

  if (!stored || stored.expires < Date.now()) {
    challengeStore.delete(tempId);
    return res.status(401).json({ error: 'Challenge not found or expired.' });
  }

  const isValid = verifySignature(stored.challenge, signature, senderAddress);
  challengeStore.delete(tempId); // Challenge can only be used once

  if (isValid) {
    // Gera um JWT que expira em 24 horas
    const token = jwt.sign({ address: senderAddress }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    logger.info(`[Auth] Successful login for address: ${senderAddress}`);
    res.status(200).json({ 
      success: true, 
      message: 'Authentication successful.',
      token: token 
    });
  } else {
    logger.warn(`[Auth] Failed login attempt for address: ${senderAddress}`);
    res.status(401).json({ success: false, message: 'Invalid signature.' });
  }
});

app.post('/auth/logout', authenticateJWT, (req, res) => {
  // For stateless JWTs, logout is primarily a client-side action (deleting the token).
  // This server-side endpoint is useful for logging or if we implement a token denylist in the future.
  logger.info(`[Auth] Logout request for address: ${req.user?.address}`);
  res.status(200).json({ success: true, message: 'Logout successful.' });
});

// --- Rota de Envio de Mensagem (Protegida em Camadas) ---
app.post(
  '/messages',
  apiLimiter,         // 1. Limita a taxa de requisições
  authenticateJWT,    // 2. Verifica se o usuário está autenticado via JWT
  validateNewMessage, // 3. Valida o formato do corpo da requisição
  handleNewMessage    // 4. Somente se tudo passar, executa a lógica principal
);

// --- Error Handling ---
app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Gateway server listening on port ${PORT}`);
  });
}

export default app;