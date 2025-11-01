/**
 * @file bitcoin.listener.ts
 * @description This service listens to the Bitcoin blockchain for new blocks,
 *              scans for transactions containing SovereignComm anchors (Merkle Roots),
 *              and passes them to the database service for indexing.
 */

import axios from 'axios';

const MEMPOOL_API_URL = process.env.MEMPOOL_API_URL || 'https://mempool.space/testnet/api';
const POLLING_INTERVAL_MS = 60000; // 1 minute

let lastSeenBlockHash: string | null = null;

/**
 * Fetches the hash of the latest block on the Bitcoin blockchain.
 * @returns The hash of the latest block.
 */
async function getLatestBlockHash(): Promise<string> {
  try {
    const response = await axios.get(`${MEMPOOL_API_URL}/blocks/tip/hash`);
    return response.data;
  } catch (error) {
    console.error('[BitcoinListener] Error fetching latest block hash:', error.message);
    throw error;
  }
}

/**
 * Scans a given block for transactions containing OP_RETURN data.
 * For now, it just logs the found data.
 * @param blockHash The hash of the block to scan.
 */
async function scanBlockForAnchors(blockHash: string): Promise<void> {
  console.log(`[BitcoinListener] Scanning new block: ${blockHash}`);
  try {
    // We need to get the transaction IDs first
    const txidsResponse = await axios.get(`${MEMPOOL_API_URL}/block/${blockHash}/txids`);
    const txids: string[] = txidsResponse.data;

    for (const txid of txids) {
      const txResponse = await axios.get(`${MEMPOOL_API_URL}/tx/${txid}`);
      const transaction = txResponse.data;

      for (const output of transaction.vout) {
        // Check for OP_RETURN script
        if (output.scriptpubkey_type === 'op_return') {
          // The data is in the scriptpubkey_asm, after 'OP_RETURN'
          const opReturnData = output.scriptpubkey_asm.split(' ')[1];
          console.log(`[BitcoinListener] Found OP_RETURN in tx ${txid} with data: ${opReturnData}`);
          // TODO: Validate if this is our anchor and pass to database service.
        }
      }
    }
  } catch (error) {
    console.error(`[BitcoinListener] Error scanning block ${blockHash}:`, error.message);
  }
}

/**
 * Starts the polling mechanism to check for new Bitcoin blocks.
 */
export function startBitcoinListener() {
  console.log('[BitcoinListener] Starting listener...');

  setInterval(async () => {
    try {
      const latestBlockHash = await getLatestBlockHash();
      if (lastSeenBlockHash !== latestBlockHash) {
        lastSeenBlockHash = latestBlockHash;
        await scanBlockForAnchors(latestBlockHash);
      }
    } catch (error) {
      console.error('[BitcoinListener] Polling failed:', error.message);
    }
  }, POLLING_INTERVAL_MS);
}