/**
 * @description The main entry point for the SovereignComm Gateway service.
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  handleNewMessage,
  handleQuoteRequest,
  handleGatewayListRequest,
} from './gateway.service.js';
import { initializeIpfsClient } from './ipfs.service.js';
import logger from './logger.service.js';
import { loggingMiddleware } from './logging.middleware.js';
import { validateNewMessage } from './validation.middleware.js';
import { errorMiddleware } from './error.middleware.js';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// --- Middlewares de Segurança Essenciais ---
app.use(helmet()); // Adiciona vários headers de segurança
app.use(cors()); // Habilita Cross-Origin Resource Sharing para APIs públicas

// --- Rate Limiter ---
// Protege contra ataques de força bruta e DoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize services
initializeIpfsClient();

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

// --- Rota de Envio de Mensagem (Protegida em Camadas) ---
app.post(
  '/messages',
  apiLimiter, // 1. Limita a taxa de requisições
  validateNewMessage, // 2. Valida o formato do corpo da requisição
  handleNewMessage // 3. Somente se tudo passar, executa a lógica principal
);

app.get('/batch/status', handleBatchStatusRequest);

// --- Error Handling ---
app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Gateway server listening on port ${PORT}`);
});