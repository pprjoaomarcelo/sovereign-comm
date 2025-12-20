import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';

let ipfs: IPFSHTTPClient;

/**
 * Initializes the IPFS client.
 * @throws {Error} If the Pinata JWT is not configured.
 */
export function initializeIpfsClient() {
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
  console.log('IPFS client initialized.');
}

export async function addJsonToIpfs(data: object): Promise<string> {
  const result = await ipfs.add(JSON.stringify(data));
  return result.cid.toString();
}

/**
 * Creates a Merkle Tree from a list of CIDs.
 * @param cids An array of CIDs (strings).
 * @returns The generated MerkleTree instance.
 */
export function createMerkleTree(cids: string[]): MerkleTree {
  const leaves = cids.map(cid => SHA256(cid));
  return new MerkleTree(leaves, SHA256);
}