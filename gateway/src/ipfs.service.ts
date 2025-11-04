import { create, IPFSHTTPClient, Options } from 'ipfs-http-client';
import logger from './logger.service.js';
import FormData from 'form-data';

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
 * Tenta fazer o upload de um objeto JSON para a rede IPFS, iterando através de
 * múltiplos gateways em caso de falha para garantir a resiliência.
 * @param data O objeto a ser armazenado.
 * @returns O CID (Content Identifier) do objeto na rede IPFS.
 * @param preferredGatewayHost O host do gateway preferencial do usuário, se houver.
 * @throws {Error} Se o upload falhar em todos os gateways disponíveis.
 */
export async function addJsonToIpfs(data: object, preferredGatewayHost?: string): Promise<string> {
  // --- Fluxo 1: O usuário especificou um gateway preferido ---
  if (preferredGatewayHost) {
    const preferredConfig = IPFS_GATEWAYS.find(g => g.host === preferredGatewayHost);
    if (!preferredConfig) {
      logger.warn(`[IPFS] Gateway preferencial '${preferredGatewayHost}' não encontrado na lista configurada.`);
      // Se o preferido não existe, prossegue para o fluxo de fallback.
    } else {
      logger.info(`[IPFS] Foco no gateway preferencial do usuário: ${preferredGatewayHost}`);
      for (let attempt = 1; attempt <= PREFERRED_GATEWAY_RETRIES; attempt++) {
        try {
          logger.info(`[IPFS] Tentativa ${attempt}/${PREFERRED_GATEWAY_RETRIES} no gateway ${preferredGatewayHost}...`);
          const ipfs: IPFSHTTPClient = create(preferredConfig as Options);
          const result = await ipfs.add(JSON.stringify(data));
          logger.info(`[IPFS] Upload bem-sucedido via ${preferredGatewayHost}. CID: ${result.cid.toString()}`);
          return result.cid.toString(); // Sucesso!
        } catch (error) {
          logger.warn(`[IPFS] Falha na tentativa ${attempt} para ${preferredGatewayHost}.`, { error: (error as Error).message });
          if (attempt < PREFERRED_GATEWAY_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, PREFERRED_GATEWAY_RETRY_DELAY_MS));
          }
        }
      }
      // Se o loop terminar, todas as tentativas no gateway preferido falharam.
      throw new PreferredGatewayFailedError(`O gateway preferencial '${preferredGatewayHost}' falhou após ${PREFERRED_GATEWAY_RETRIES} tentativas.`);
    }
  }

  // --- Fluxo 2: Fallback - Nenhum gateway preferido ou o preferido não foi encontrado ---
  logger.info('[IPFS] Nenhum gateway preferencial especificado. Usando o fluxo de fallback.');
  const fallbackGateways = [...IPFS_GATEWAYS];

  if (!process.env.PINATA_JWT) {
    logger.warn('[IPFS] PINATA_JWT não configurado. Usando apenas gateways públicos.');
    // Remove o gateway Pinata se a chave não estiver presente
    fallbackGateways.shift();
  }

  for (const gatewayConfig of fallbackGateways) {
    try {
      logger.info(`[IPFS] Tentando fallback via gateway: ${gatewayConfig.host}`);
      const ipfs: IPFSHTTPClient = create(gatewayConfig as Options);
      const result = await ipfs.add(JSON.stringify(data));
      logger.info(`[IPFS] Upload bem-sucedido via ${gatewayConfig.host}. CID: ${result.cid.toString()}`);
      return result.cid.toString();
    } catch (error) {
      logger.warn(`[IPFS] Falha no gateway de fallback ${gatewayConfig.host}. Tentando próximo...`, { error: (error as Error).message });
    }
  }

  // Se o loop terminar, todos os gateways falharam.
  logger.error('[IPFS] CRITICAL: Todos os gateways IPFS falharam. Não foi possível fazer o upload dos dados.');
  throw new Error('Failed to upload data to IPFS after trying all available gateways.');
}

/**
 * Faz o upload de um arquivo bruto (buffer) para um serviço de pinning como o Pinata.
 * Esta função seria chamada pelo CLIENTE, não pelo gateway.
 * @param fileBuffer O buffer de dados do arquivo.
 * @param pinataJwt O JWT de autenticação do Pinata.
 * @returns O CID do arquivo pinado.
 * @throws {Error} Se o upload falhar.
 */
export async function addFileToIpfs(fileBuffer: Buffer, pinataJwt: string): Promise<string> {
  if (!pinataJwt) {
    throw new Error('Pinata JWT is required for file upload.');
  }

  const formData = new FormData();
  formData.append('file', fileBuffer, {
    filename: 'sovereign-comm-attachment' // O nome do arquivo é arbitrário aqui
  });

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