/**
 * @description A simple script to test the Bitcoin anchoring functionality directly.
 */

import 'dotenv/config';
import { anchorMerkleRoot } from './anchor.service.js';
import logger from './logger.service.js';

/**
 * Runs a direct test of the anchoring function.
 */
async function testAnchor() {
  logger.info('--- Starting Direct Anchor Test ---');

  try {
    // A dummy Merkle Root for testing purposes. In a real scenario, this would be calculated from a batch of CIDs.
    const testMerkleRoot = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    logger.info(`Using test Merkle Root: ${testMerkleRoot}`);

    await anchorMerkleRoot(testMerkleRoot);
  } catch (error) {
    logger.error('Anchor test failed:', error);
  } finally {
    logger.info('--- Anchor Test Finished ---');
  }
}

testAnchor();