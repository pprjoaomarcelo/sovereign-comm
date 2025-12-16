import * as bitcoin from 'bitcoinjs-lib';
import * as tinysec from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import axios from 'axios';
import logger from './logger.service.js';
import { getRecommendedFees } from './bitcoinfees.service.js';

const ECPair = ECPairFactory(tinysec);

const network = bitcoin.networks.testnet;
const BITCOIN_API_URL = 'https://mempool.space/testnet/api';

/**
 * Retrieves the gateway's Bitcoin wallet information.
 * @returns An object containing the key pair and the P2PKH address.
 * @throws {Error} If the WIF is not set in the environment variables.
 */
function getWallet() {
  const privateKeyWIF = process.env.GATEWAY_BITCOIN_WIF;
  if (!privateKeyWIF) {
    throw new Error('[BitcoinService] GATEWAY_BITCOIN_WIF is not set in the .env file.');
  }
  const keyPair = ECPair.fromWIF(privateKeyWIF, network);
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });
  if (!address) {
    throw new Error('[BitcoinService] Could not derive address from WIF.');
  }
  return { keyPair, address };
}

/**
 * Fetches the largest unspent transaction output (UTXO) for a given address.
 * @param address - The Bitcoin address to check.
 * @returns The largest UTXO object.
 * @throws {Error} If no UTXOs are found.
 */
async function getLargestUtxo(address: string) {
  const { data: utxos } = await axios.get(`${BITCOIN_API_URL}/address/${address}/utxo`);
  if (!utxos || utxos.length === 0) {
    throw new Error(`[BitcoinService] No UTXOs found for address ${address}. Please fund it on a testnet faucet.`);
  }
  // Return the largest UTXO to maximize chance of covering fees
  return utxos.reduce((prev: any, curr: any) => (prev.value > curr.value ? prev : curr));
}

/**
 * Fetches the full transaction hex for a given transaction ID.
 * This is required for the non-witness UTXO.
 * @param txid - The transaction ID.
 * @returns The transaction hex string.
 */
async function getTxHex(txid: string): Promise<string> {
  const { data } = await axios.get(`${BITCOIN_API_URL}/tx/${txid}/hex`);
  return data;
}

/**
 * Creates and broadcasts a Bitcoin transaction to anchor a Merkle Root in an OP_RETURN output.
 * @param merkleRoot - The Merkle Root to be anchored, as a hex string.
 * @returns The transaction ID (txid) of the broadcasted transaction.
 * @throws {Error} If any step of the process fails.
 */
export async function anchorMerkleRoot(merkleRoot: string): Promise<string> {
  logger.info(`--- ANCHORING LOGIC ---`);
  logger.info(`Merkle Root to be anchored: ${merkleRoot}`);

  const { keyPair, address } = getWallet();
  logger.info(`Gateway's Testnet Address: ${address}`);

  try {
    // 1. Fetch UTXOs and fee rates
    const utxo = await getLargestUtxo(address);
    const feeRates = await getRecommendedFees();
    const feeRate = feeRates.halfHourFee; // Aim for a 30-min confirmation
    logger.info(`Using UTXO: ${utxo.txid}:${utxo.vout} with value ${utxo.value} satoshis. Fee rate: ${feeRate} sat/vB`);

    // 2. Fetch the non-witness UTXO (full transaction hex)
    const txHex = await getTxHex(utxo.txid);

    // 3. Create the OP_RETURN output
    const data = Buffer.from(merkleRoot, 'hex');
    const embed = bitcoin.payments.embed({ data: [data] });

    // 4. Build the transaction with Psbt
    const psbt = new bitcoin.Psbt({ network });
    const txSize = 150; // Estimated virtual size of a 1-input, 2-output transaction
    const fee = txSize * feeRate;
    const changeAmount = utxo.value - fee;

    if (changeAmount < 0) {
      throw new Error(`UTXO value (${utxo.value}) is not enough to cover the estimated fee (${fee}).`);
    }

    psbt.addInput({ hash: utxo.txid, index: utxo.vout, nonWitnessUtxo: Buffer.from(txHex, 'hex') });
    psbt.addOutput({ script: embed.output!, value: 0 });
    psbt.addOutput({ address: address, value: changeAmount });

    // 5. Sign and finalize
    psbt.signInput(0, keyPair);
    psbt.finalizeAllInputs();
    const finalTxHex = psbt.extractTransaction().toHex();

    // 6. Broadcast the transaction
    const { data: txid } = await axios.post(`${BITCOIN_API_URL}/tx`, finalTxHex);
    logger.info(`Transaction broadcasted successfully! TXID: ${txid}`);
    return txid;
  } catch (error: any) {
    logger.error('[BitcoinService] Error in anchorMerkleRoot:', { message: error.message, response: error.response?.data });
    throw new Error('Failed to anchor Merkle Root on Bitcoin.');
  }
}