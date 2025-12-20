import { calculateFee } from './pricing.service.js';
import * as marketDataService from './market-data.service.js';
import * as bitcoinFeesService from './bitcoinfees.service.js';
import { AppError } from './error.classes.js';
import logger from './logger.service.js';

// Mock as dependências
jest.mock('./market-data.service.js');
jest.mock('./bitcoinfees.service.js');
jest.mock('./config.js', () => ({
  BATCH_SIZE: 100,
  BASE_OPERATIONAL_FEE_SATS: 10,
  FEE_PER_ATTACHMENT_SATS: 5,
  USD_PER_BYTE_STORED: 0.0000003,
  STALE_DATA_RISK_MARGIN_PERCENTAGE: 5,
  ONCHAIN_ANCHOR_FEE_SATS_FALLBACK: 3000,
  ANCHOR_TX_VBYTES: 154,
  GATEWAY_FEE_PERCENTAGE: 0.2,
}));
jest.mock('./logger.service.js');

const mockedMarketData = marketDataService as jest.Mocked<typeof marketDataService>;
const mockedBitcoinFees = bitcoinFeesService as jest.Mocked<typeof bitcoinFeesService>;

describe('Pricing Service - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an AppError with status 503 if bitcoinfees.service fails catastrophically', async () => {
    // Arrange: Simula uma falha total do serviço de taxas (sem cache)
    mockedBitcoinFees.getRecommendedFees.mockRejectedValue(new Error('API completely down'));
    // Arrange: O serviço de preço do BTC funciona para isolar o erro
    mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 60000, isStale: false });

    // Act & Assert
    await expect(calculateFee(1000, [])).rejects.toThrow(AppError);
    await expect(calculateFee(1000, [])).rejects.toHaveProperty('statusCode', 503);
  });

  it('should throw an AppError with status 503 if market-data.service fails catastrophically', async () => {
    // Arrange: Simula uma falha total do serviço de preço (retornando 0)
    mockedMarketData.getBtcPriceUsd.mockResolvedValue({ price: 0, isStale: true });
    // Arrange: O serviço de taxas funciona para isolar o erro
    mockedBitcoinFees.getRecommendedFees.mockResolvedValue({ halfHourFee: 30 } as any);

    // Act & Assert
    await expect(calculateFee(1000, [])).rejects.toThrow(AppError);
    await expect(calculateFee(1000, [])).rejects.toHaveProperty('statusCode', 503);
  });
});