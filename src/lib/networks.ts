// Network configurations for different blockchains and L2s
export type NetworkType = 'bitcoin';

export interface NetworkConfig {
  id: NetworkType;
  name: string;
  type: 'mainnet';
  color: string;
  avgFee: number; // in native token
  confirmationTime: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    type: 'mainnet',
    color: 'hsl(var(--network-bitcoin))',
    avgFee: 0.00015,
    confirmationTime: '~10 minutos'
  }
};

export function getNetworkConfig(network: NetworkType): NetworkConfig {
  return NETWORKS[network];
}

/**
 * Estimate gas fee for a transaction
 */
export async function estimateGasFee(
  network: NetworkType,
  messageSize: number
): Promise<number> {
  console.log(`[Gas] Estimating fee for ${network}...`, { messageSize });
  
  const config = getNetworkConfig(network);
  
  // Simulate gas estimation based on message size
  // In production, call actual RPC methods
  const baseFee = config.avgFee;
  const sizeFactor = messageSize > 100 ? 1.5 : 1.0;
  const estimatedFee = baseFee * sizeFactor;
  
  console.log(`[Gas] Estimated fee: ${estimatedFee} for ${network}`);
  
  return estimatedFee;
}

/**
 * Check if network RPC is available
 */
export async function checkNetworkHealth(network: NetworkType): Promise<boolean> {
  console.log(`[Network] Checking health for ${network}...`);  
  return true;
}
