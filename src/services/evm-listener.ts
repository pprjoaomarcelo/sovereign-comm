import { ethers } from 'ethers';
import { supabase } from '../integrations/supabase/client'; // Adjust path if necessary
import { NETWORKS } from '../lib/networks';

// We will use the Arbitrum network as our initial target for the listener
const TARGET_NETWORK = NETWORKS.arbitrum;
const RPC_URL = TARGET_NETWORK.rpcUrl;

if (!RPC_URL) {
  throw new Error(`RPC URL for network ${TARGET_NETWORK.name} not found.`);
}

// 1. Configure Ethers Provider
// We use JsonRpcProvider to connect to an EVM node directly via URL
const provider = new ethers.JsonRpcProvider(RPC_URL);

console.log(`[EVM Listener] Connected to ${TARGET_NETWORK.name} network provider.`);

async function processTransaction(txHash: string) {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.to) {
      // Not a standard transaction or has no recipient, ignore.
      return;
    }

    // Ideally, we would fetch all user addresses from our app in Supabase.
    // For now, let's use a test address for validation.
    const { data: users, error: userError } = await supabase.from('users').select('address');
    if (userError) {
      console.error('[EVM Listener] Error fetching users:', userError);
      return;
    }
    const userAddresses = users.map(u => u.address.toLowerCase());

    if (userAddresses.includes(tx.to.toLowerCase())) {
      console.log(`[EVM Listener] Transaction found for a monitored user: ${tx.to}`);

      // 2. Decode the CID from the 'data' field
      const cid = ethers.toUtf8String(tx.data);

      if (cid.startsWith('Qm') || cid.startsWith('bafy')) {
        console.log(`[EVM Listener] Decoded CID: ${cid}`);

        // 3. Save to Supabase
        const { error } = await supabase.from('messages').insert({
          sender: tx.from,
          recipient: tx.to,
          cid: cid,
          tx_hash: tx.hash,
          network: TARGET_NETWORK.id,
          content: '', // Content will be fetched from IPFS by the client
        });

        if (error) {
          console.error('[EVM Listener] Error inserting into Supabase:', error);
        } else {
          console.log('[EVM Listener] Message inserted into Supabase successfully!');
        }
      } else {
        console.log(`[EVM Listener] Transaction payload does not seem to be a valid CID: ${cid}`);
      }
    }
  } catch (error) {
    console.error(`[EVM Listener] Failed to process transaction ${txHash}:`, error);
  }
}

async function main() {
  console.log('[EVM Listener] Starting to monitor for new blocks...');

  provider.on('block', async (blockNumber) => {
    console.log(`[EVM Listener] New block detected: ${blockNumber}`);
    try {
      const block = await provider.getBlock(blockNumber);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          // Process without waiting for completion to not block the block loop
          processTransaction(txHash);
        }
      }
    } catch (error) {
      console.error(`[EVM Listener] Error processing block ${blockNumber}:`, error);
    }
  });
}

main().catch((error) => {
  console.error('[EVM Listener] Fatal error in listener service:', error);
  process.exit(1);
});
