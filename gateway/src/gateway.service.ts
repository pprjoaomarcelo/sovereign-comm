import { Request, Response } from 'express';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';
import ECPairFactory from 'ecpair';
import * as tinysec from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysec);

interface MessagePayload {
  sender: string;
  recipient: string;
  timestamp: string;
  content: string;
  attachments: any[];
}

const cidBatch: string[] = [];
const BATCH_SIZE = 5;

let ipfs: IPFSHTTPClient;
try {
    ipfs = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
    });
    console.log("IPFS client configured successfully.");
} catch (error) {
    console.error("Failed to create IPFS client:", error);
    process.exit(1);
}

async function anchorMerkleRoot(merkleRoot: string) {
  console.log('Attempting to anchor Merkle Root on Bitcoin testnet...');

  const network = bitcoin.networks.testnet;
  const privateKeyWIF = process.env.GATEWAY_BITCOIN_WIF!;
  const keyPair = ECPair.fromWIF(privateKeyWIF, network);
  const { address } = bitcoin.payments.p2tr({ pubkey: keyPair.publicKey, network });

  if (!address) {
    throw new Error('Could not derive address from WIF key.');
  }

  console.log(`Gateway P2TR Address: ${address}`);

  try {
    const { data: utxos } = await axios.get(`https://blockstream.info/testnet/api/address/${address}/utxo`);
    console.log(`Found ${utxos.length} UTXOs.`);

    if (utxos.length === 0) {
      console.error(`No UTXOs found for address ${address}. Please fund it from a testnet faucet.`);
      return;
    }

    const psbt = new bitcoin.Psbt({ network });
    let totalInput = 0;

    const utxo = utxos[0];
    totalInput += utxo.value;

    const { data: txHex } = await axios.get(`https://blockstream.info/testnet/api/tx/${utxo.txid}/hex`);
    
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(bitcoin.address.toOutputScript(address, network)),
        value: utxo.value,
      },
      tapInternalKey: keyPair.publicKey.subarray(1, 33)
    });

    const data = Buffer.from(merkleRoot, 'hex');
    const embed = bitcoin.payments.embed({ data: [data] });
    psbt.addOutput({
      script: embed.output!,
      value: BigInt(0),
    });

    const fee = BigInt(1000);
    const changeAmount = BigInt(totalInput) - fee;
    if (changeAmount > 0) {
      psbt.addOutput({
        address: address,
        value: changeAmount,
      });
    }

    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();

    const finalTx = psbt.extractTransaction();
    const finalTxHex = finalTx.toHex();

    console.log('Constructed and Signed Transaction (Hex):', finalTxHex);

    console.log('Broadcasting transaction...');
    const { data: txid } = await axios.post('https://blockstream.info/testnet/api/tx', finalTxHex);
    console.log(`Transaction broadcasted successfully! TXID: ${txid}`);

  } catch (error) {
    console.error('Error anchoring Merkle Root:', error instanceof axios.AxiosError ? error.response?.data : error);
  }
}

async function processAndAnchorBatch() {
  if (cidBatch.length === 0) return;

  console.log(`Processing batch of ${cidBatch.length} CIDs...`);

  try {
    const leaves = cidBatch.map(cid => SHA256(cid).toString());
    const tree = new MerkleTree(leaves, SHA256);
    const merkleRoot = tree.getRoot().toString('hex');

    console.log('Merkle Root:', merkleRoot);

    await anchorMerkleRoot(merkleRoot);

    cidBatch.length = 0;
    console.log('Batch processed and cleared.');
  } catch (error) {
    console.error('Error processing batch:', error);
  }
}

export async function handleNewMessage(req: Request, res: Response) {
  const messagePayload: MessagePayload = req.body;
  console.log('Received new message payload:', messagePayload);

  try {
    const { cid } = await ipfs.add(JSON.stringify(messagePayload));
    const cidString = cid.toString();
    console.log(`Message added to IPFS with CID: ${cidString}`);

    cidBatch.push(cidString);
    console.log(`CID added to batch. Current batch size: ${cidBatch.length}`);

    if (cidBatch.length >= BATCH_SIZE) {
      await processAndAnchorBatch();
    }

    res.status(200).json({
      message: 'Message received and added to batch.',
      cid: cidString,
      batchStatus: `${cidBatch.length}/${BATCH_SIZE}`,
    });
  } catch (error) {
    console.error('Error adding to IPFS:', error);
    res.status(500).json({ error: 'Failed to process message object with IPFS.' });
  }
}