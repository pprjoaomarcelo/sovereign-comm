/**
 * Represents a message in the SovereignComm protocol.
 * This interface is used across the application for consistent typing.
 */
export interface Message {
  id: string;
  user_address: string;
  recipient_address: string;
  content: string;
  encrypted: boolean;
  network: string;
  network_type: string;
  tx_hash: string | null;
  storage_cid: string;
  storage_provider: string;
  storage_url: string;
  status: string;
  direction: string;
  gas_fee: number | null;
  created_at: string;
  updated_at: string;
}

export type DecryptionStatus = 'idle' | 'requesting_signature' | 'fetching' | 'decrypting' | 'decrypted' | 'error';

export type NetworkType = 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'zksync' | 'polygon' | 'solana' | 'bitcoin' | 'sovereign' | 'unknown';

export type SendMode = 'complete' | 'ipfs_only' | 'on_chain';
