import { create, IPFSHTTPClient, Options } from 'ipfs-http-client';
import logger from './logger.service.js';
import FormData from 'form-data';

let ipfs: IPFSHTTPClient;

/**
 * Initializes the IPFS client.
 * @throws {Error} If the Pinata JWT is not configured.
 */
export function initializeIpfsClient(): IPFSHTTPClient {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT environment variable is not set.');
  }

  ipfs = create({
    host: 'api.pinata.cloud',
    port: 443,
    protocol: 'https',
    headers: {
      Authorization: `Bearer ${pinataJwt}`,
    },
  });
  logger.info('[IPFS] IPFS client initialized.');
  return ipfs;
}

// --- Configuração ---
const PREFERRED_GATEWAY_RETRIES = 3;
const PREFERRED_GATEWAY_RETRY_DELAY_MS = 2000; // 2 segundos

// Lista de gateways IPFS, com o primário (autenticado) primeiro para fallback.
const IPFS_GATEWAYS = [
  {
    // Gateway primário e rápido, requer autenticação.
    host: 'api.pinata.cloud',
    port: 443,
    protocol: 'https',
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT}`,
    },
  },
  {
    // Gateway público de fallback #1
    host: 'ipfs.io',
    port: 443,
    protocol: 'https',
  },
  {
    // Gateway público de fallback #2
    host: 'dweb.link',
    port: 443,
    protocol: 'https',
  },
];

/**
 * Erro customizado para indicar que o gateway preferencial do usuário falhou
 * após múltiplas tentativas.
 */
export class PreferredGatewayFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreferredGatewayFailedError';
  }
}

/**
 * Attempts to upload a JSON object to the IPFS network.
 * It prioritizes a user-specified gateway and then falls back to public gateways.
 * @param data The JSON object to be stored on IPFS.
 * @param preferredGatewayHost The host of the user's preferred pinning service (e.g., 'api.pinata.cloud').
 * @returns The IPFS Content Identifier (CID) for the stored object.
 * @throws {PreferredGatewayFailedError} If the preferred gateway fails after all retries.
 * @throws {Error} If all gateways (preferred and public) fail.
 */
export async function addJsonToIpfs(data: object, preferredGatewayHost?: string): Promise<string> {
  const dataString = JSON.stringify(data);

  // --- Step 1: Attempt to use the user's preferred gateway with retries ---
  if (preferredGatewayHost) {
    // For now, we only support Pinata as a preferred service.
    // This could be expanded to a list of supported authenticated gateways.
    if (preferredGatewayHost === IPFS_GATEWAYS[0].host && process.env.PINATA_JWT) {
      logger.info(`[IPFS] Focusing on user's preferred gateway: ${preferredGatewayHost}`);
      for (let attempt = 1; attempt <= PREFERRED_GATEWAY_RETRIES; attempt++) {
        try {
          logger.info(`[IPFS] Attempt ${attempt}/${PREFERRED_GATEWAY_RETRIES} on ${preferredGatewayHost}...`);
          const ipfs: IPFSHTTPClient = create(IPFS_GATEWAYS[0] as Options);
          const result = await ipfs.add(dataString);
          logger.info(`[IPFS] Upload successful via ${preferredGatewayHost}. CID: ${result.cid.toString()}`);
          return result.cid.toString(); // Success!
        } catch (error) {
          logger.warn(`[IPFS] Attempt ${attempt} for ${preferredGatewayHost} failed.`, { error: (error as Error).message });
          if (attempt < PREFERRED_GATEWAY_RETRIES) await new Promise(resolve => setTimeout(resolve, PREFERRED_GATEWAY_RETRY_DELAY_MS));
        }
      }
      // If the loop finishes, all retries on the preferred gateway have failed.
      throw new PreferredGatewayFailedError(`O gateway preferencial '${preferredGatewayHost}' falhou após ${PREFERRED_GATEWAY_RETRIES} tentativas.`);
    } else {
      logger.warn(`[IPFS] Preferred gateway '${preferredGatewayHost}' is not configured or supported. Proceeding to public fallbacks.`);
    }
  }

  // --- Step 2: Fallback to public gateways ---
  logger.info('[IPFS] Using public gateway fallback flow.');
  const allGateways = IPFS_GATEWAYS;

  if (!process.env.PINATA_JWT) {
    logger.warn('[IPFS] PINATA_JWT not configured. Using public gateways only.');
  }

  for (const gatewayConfig of allGateways) {
    try {
      logger.info(`[IPFS] Trying fallback via gateway: ${gatewayConfig.host}`);
      const ipfs: IPFSHTTPClient = create(gatewayConfig as Options);
      const result = await ipfs.add(dataString);
      logger.info(`[IPFS] Upload successful via ${gatewayConfig.host}. CID: ${result.cid.toString()}`);
      return result.cid.toString();
    } catch (error) {
      logger.warn(`[IPFS] Fallback gateway ${gatewayConfig.host} failed. Trying next...`, { error: (error as Error).message });
    }
  }

  // If the loop finishes, all gateways have failed.
  logger.error('[IPFS] CRITICAL: All IPFS gateways failed. Could not upload data.');
  throw new Error('Failed to upload data to IPFS after trying all available gateways.');
}

/**
 * Uploads a raw file buffer to a pinning service like Pinata.
 * This function is intended to be called by a client, not the gateway itself,
 * as it requires the user's own Pinata JWT.
 * @param fileBuffer The raw data buffer of the file.
 * @param pinataJwt The user's Pinata JWT for authentication.
 * @returns The CID of the pinned file.
 * @throws {Error} If the upload fails.
 */
export async function addFileToIpfs(fileBuffer: Buffer, pinataJwt: string): Promise<string> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required for file upload.');
  }

  const formData = new FormData();
  formData.append('file', fileBuffer, { filename: 'sovereign-comm-attachment' });

  try {
    logger.info('[IPFS] Uploading raw file to Pinata...');
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pinataJwt}` },
      body: formData as any,
    });
    const data = await response.json();
    logger.info(`[IPFS] File uploaded successfully to Pinata. CID: ${data.IpfsHash}`);
    return data.IpfsHash;
  } catch (error) {
    logger.error('[IPFS] Failed to upload file to Pinata.', { error: (error as Error).message });
    throw new Error('Failed to upload file to Pinata IPFS service.');
  }
}