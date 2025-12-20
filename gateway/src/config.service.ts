import 'dotenv/config';
import logger from './logger.service.js';

/**
 * A utility function to get and validate an environment variable.
 * @param name The name of the environment variable.
 * @param defaultValue An optional default value if the variable is not set.
 * @returns The value of the environment variable.
 * @throws If the variable is not set and no default value is provided.
 */
function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (value === undefined) {
    const errorMessage = `Environment variable ${name} is not set.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * A utility function to get and validate a numeric environment variable.
 * @param name The name of the environment variable.
 * @param defaultValue An optional default value.
 * @returns The numeric value of the environment variable.
 */
function getNumericEnvVar(name: string, defaultValue?: number): number {
  const value = getEnvVar(name, defaultValue?.toString());
  const numericValue = parseInt(value, 10);
  if (isNaN(numericValue)) {
    const errorMessage = `Environment variable ${name} is not a valid number. Value: ${value}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  return numericValue;
}

export const config = {
  port: getNumericEnvVar('PORT', 3001),
  batchSize: getNumericEnvVar('BATCH_SIZE', 100),
  baseOperationalFeeSats: getNumericEnvVar('BASE_OPERATIONAL_FEE_SATS', 10),
  feePerAttachmentSats: getNumericEnvVar('FEE_PER_ATTACHMENT_SATS', 5),
  usdPerByteStored: parseFloat(getEnvVar('USD_PER_BYTE_STORED', '0.0000003')),
  staleDataRiskMarginPercentage: getNumericEnvVar('STALE_DATA_RISK_MARGIN_PERCENTAGE', 5),
  onchainAnchorFeeSatsFallback: getNumericEnvVar('ONCHAIN_ANCHOR_FEE_SATS_FALLBACK', 3000),
  anchorTxVBytes: getNumericEnvVar('ANCHOR_TX_VBYTES', 154),
  gatewayFeePercentage: parseFloat(getEnvVar('GATEWAY_FEE_PERCENTAGE', '0.2')),
  emergencyMode: getEnvVar('EMERGENCY_MODE', 'false') === 'true',
  emergencyFeeSats: getNumericEnvVar('EMERGENCY_FEE_SATS', 5),
};

logger.info('Configuration loaded successfully.');