import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

// RPC URL from environment or default
const L2_RPC_URL = Deno.env.get("L2_RPC_URL") || "https://sepolia-rollup.arbitrum.io/rpc";

// Decode CID from transaction data
const decodeCidFromData = (data: string): string | null => {
  try {
    const decodedString = ethers.toUtf8String(data);
    if (decodedString.startsWith('Qm') || decodedString.startsWith('bafy')) {
      return decodedString;
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const provider = new ethers.JsonRpcProvider(L2_RPC_URL);

    const { data: lastBlockData, error: lastBlockError } = await supabaseClient
      .from('indexer_state')
      .select('last_checked_block')
      .single();

    if (lastBlockError && lastBlockError.code !== 'PGRST116') {
      throw lastBlockError;
    }

    const fromBlock = lastBlockData ? lastBlockData.last_checked_block + 1 : await provider.getBlockNumber() - 10;
    const toBlock = await provider.getBlockNumber();

    if (fromBlock > toBlock) {
      return new Response(JSON.stringify({ message: "No new blocks to check." }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    console.log(`Checking blocks from ${fromBlock} to ${toBlock}...`);

    let messagesFound = 0;
    for (let i = fromBlock; i <= toBlock; i++) {
      const block = await provider.getBlock(i, true);
      if (!block) continue;

      for (const tx of block.prefetchedTransactions) {
        if (tx.data && tx.data !== '0x') {
          const cid = decodeCidFromData(tx.data);
          if (cid) {
            console.log(`CID found: ${cid} in transaction ${tx.hash}`);
            messagesFound++;
            
            const messageContent = `Simulated content for CID: ${cid}`;

            const { error: insertError } = await supabaseClient.from('messages').insert({
              recipient_address: tx.to,
              user_address: tx.from,
              content: messageContent,
              tx_hash: tx.hash,
              storage_cid: cid,
              storage_provider: 'ipfs',
              storage_url: `https://ipfs.io/ipfs/${cid}`,
              network: 'arbitrum_sepolia',
              network_type: 'evm',
              direction: 'received',
              encrypted: false,
              status: 'confirmed'
            });

            if (insertError) {
              console.error("Error inserting message:", insertError);
            } else {
              console.log(`Message to ${tx.to} saved successfully.`);
            }
          }
        }
      }
    }

    const { error: updateError } = await supabaseClient
      .from('indexer_state')
      .upsert({ id: 1, last_checked_block: toBlock });

    if (updateError) {
      throw updateError;
    }

    const responseMessage = `Check complete. ${messagesFound} new messages found.`;
    return new Response(JSON.stringify({ message: responseMessage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Indexer function error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
})
