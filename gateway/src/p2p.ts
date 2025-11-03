/**
 * @file p2p.ts
 * @description This file contains the client-side logic for discovering messages
 *              by querying decentralized indexers or signaling servers.
 */

import axios from 'axios';

/**
 * Represents a pointer to a message, returned by an indexer.
 * This tells the client where to look for the full message content.
 */
export interface MessagePointer {
  /** The transaction ID on the anchoring blockchain (e.g., Bitcoin). */
  txid: string;
  /** The Merkle Root of the batch this message belongs to. */
  merkleRoot: string;
  /** The specific CID of the user's message content on IPFS. */
  contentCid: string;
  /** The Merkle Proof needed to verify the inclusion of the contentCid in the merkleRoot. */
  merkleProof: string[];
  /** Timestamp of the anchor transaction. */
  timestamp: number;
}

/**
 * Fetches new message pointers for a given user address from a specific indexer service.
 *
 * @param userAddress The public key or address of the user.
 * @param indexerUrl The URL of the indexer service to query.
 * @param sinceTimestamp Optional timestamp to fetch only messages newer than this.
 * @returns A promise that resolves to an array of MessagePointers.
 */
export async function fetchMessagesFromIndexer(
  userAddress: string,
  indexerUrl: string,
  sinceTimestamp?: number
): Promise<MessagePointer[]> {
  console.log(`[P2P] Querying indexer ${indexerUrl} for new messages for address ${userAddress}...`);

  try {
    // In a real implementation, the client would pay a small Lightning invoice here
    // to the indexer before making the query.

    const response = await axios.get(`${indexerUrl}/messages/${userAddress}`, {
      params: { since: sinceTimestamp },
    });

    return response.data as MessagePointer[];
  } catch (error) {
    console.error(`[P2P] Failed to fetch messages from indexer ${indexerUrl}:`, (error as Error).message);
    return []; // Return an empty array on failure to not break the client app.
  }
}