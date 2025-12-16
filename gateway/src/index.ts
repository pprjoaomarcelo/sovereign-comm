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
  handleBatchStatusRequest,
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Gateway server listening on port ${PORT}`);
  });
}

export default app;