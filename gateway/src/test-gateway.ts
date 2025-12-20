/**
 * @file test-gateway.ts
 * @description A script to test the SovereignComm gateway by sending a batch of messages and verifying the on-chain anchor.
 */

import axios from 'axios';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as tinysec from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import 'dotenv/config';

// --- Configuration ---
const GATEWAY_URL = 'http://localhost:3000/messages';
const BATCH_SIZE = 5; // Must match the BATCH_SIZE in the gateway's index.ts
const POLLING_INTERVAL_MS = 30000; // 30 seconds
const MAX_ATTEMPTS = 20; // 10 minutes total polling time

const ECPair = ECPairFactory.default(tinysec);

/**
 * Derives the gateway's Bitcoin testnet address from its WIF.
 */
function getGatewayAddress(): string {
  const privateKeyWIF = process.env.GATEWAY_BITCOIN_WIF;
  if (!privateKeyWIF) {
    throw new Error('GATEWAY_BITCOIN_WIF must be set in .env file to run the test.');
  }
  const network = bitcoin.networks.testnet;
  const keyPair = ECPair.fromWIF(privateKeyWIF, network);
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
  if (!address) {
    throw new Error('Could not derive address from WIF.');
  }
  return address;
}

/**
 * Sends a single message to the gateway.
 * @param message - The message payload to send.
 * @returns The CID of the stored message.
 */
async function sendMessage(message: object): Promise<string> {
  try {
    const response = await axios.post(GATEWAY_URL, message);
    console.log(`[Client] Message sent successfully. CID: ${response.data.cid}`);
    return response.data.cid;
  } catch (error) {
    console.error('[Client] Error sending message:', (error as Error).message);
    throw error;
  }
}

/**
 * Polls the Blockstream API to find a transaction with the expected OP_RETURN data.
 * @param expectedMerkleRoot - The Merkle Root we expect to find.
 * @param gatewayAddress - The Bitcoin address of the gateway.
 */
async function verifyAnchor(expectedMerkleRoot: string, gatewayAddress: string): Promise<void> {
  console.log('\n--- Verification Phase ---');
  console.log(`Expected Merkle Root: ${expectedMerkleRoot}`);
  console.log(`Watching for transactions from address: ${gatewayAddress}`);

  let attempt = 0;
  const interval = setInterval(async () => {
    attempt++;
    if (attempt > MAX_ATTEMPTS) {
      clearInterval(interval);
      console.error('\n[Verification] FAILED: Anchor transaction not found after 10 minutes.');
      return;
    }

    console.log(`[Verification] Attempt ${attempt}/${MAX_ATTEMPTS}: Checking for anchor transaction...`);

    try {
      const { data: txs } = await axios.get(`https://blockstream.info/testnet/api/address/${gatewayAddress}/txs`);

      for (const tx of txs) {
        for (const output of tx.vout) {
          if (output.scriptpubkey_type === 'op_return') {
            const opReturnData = output.scriptpubkey_asm.split(' ')[1];
            if (opReturnData === expectedMerkleRoot) {
              clearInterval(interval);
              console.log('\n✅ [Verification] SUCCESS! Anchor transaction found!');
              console.log(`   TXID: ${tx.txid}`);
              console.log(`   View on Block Explorer: https://blockstream.info/testnet/tx/${tx.txid}`);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.warn('[Verification] Could not fetch transactions:', (error as Error).message);
    }
  }, POLLING_INTERVAL_MS);
}

/**
 * Main test function.
 */
async function runTest() {
  console.log('--- Test Starting ---');
  console.log(`Sending a batch of ${BATCH_SIZE} messages to the gateway...`);

  const cids: string[] = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const message = {
      sender: 'test-client',
      content: `This is test message #${i + 1}`,
      timestamp: new Date().toISOString(),
    };
    const cid = await sendMessage(message);
    cids.push(cid);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }

  console.log('\n[Client] Batch sent. All CIDs collected:', cids);

  // Calculate the expected Merkle Root from the collected CIDs
  const leaves = cids.map(cid => SHA256(cid));
  const tree = new MerkleTree(leaves, SHA256);
  const expectedMerkleRoot = tree.getRoot().toString('hex');

  const gatewayAddress = getGatewayAddress();

  // Start polling for the anchor transaction
  await verifyAnchor(expectedMerkleRoot, gatewayAddress);
}

runTest().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});