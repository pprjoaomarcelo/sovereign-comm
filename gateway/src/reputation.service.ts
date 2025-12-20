import logger from './logger.service.js';

/**
 * Represents the data structure for a registered Guardian.
 * In a real implementation, this would be a struct within a smart contract.
 */
export interface Guardian {
  /** The Guardian's Decentralized Identifier (DID). */
  did: string;
  /** The amount of a specific token (e.g., BTC, STX) staked as collateral. */
  stakeAmount: number;
  /** A calculated score from 0 to 1, representing trustworthiness. */
  reputationScore: number;
  /** The timestamp when the guardian first registered and staked. */
  joinedTimestamp: number;
  /** The number of successful successions the guardian has participated in. */
  successfulSuccessions: number;
  /** The timestamp of the last verified activity. */
  lastSeenTimestamp: number;
}

/**
 * Manages the reputation and selection of Guardians in the network.
 * In a real implementation, this data would be managed by a smart contract
 * or a decentralized reputation system. For now, we manage it in-memory.
 */
class ReputationService {
  private guardians: Map<string, Guardian> = new Map();

  constructor() {
    // Initialize with some mock guardians for demonstration
    this.registerGuardian('did:sovereign:btc:guardian_alpha', 100000);
    this.registerGuardian('did:sovereign:btc:guardian_beta', 150000);
  }

  /**
   * Registers a new Guardian in the network.
   * @param did The DID of the guardian.
   * @param stakeAmount The amount of capital staked.
   */
  registerGuardian(did: string, stakeAmount: number): void {
    if (this.guardians.has(did)) {
      logger.warn(`[Reputation] Guardian ${did} is already registered.`);
      return;
    }
    const newGuardian: Guardian = {
      did,
      stakeAmount,
      reputationScore: 0.5, // Start with a neutral score
      joinedTimestamp: Date.now(),
      successfulSuccessions: 0,
      lastSeenTimestamp: Date.now(),
    };
    this.guardians.set(did, newGuardian);
    logger.info(`[Reputation] New Guardian registered: ${did} with a stake of ${stakeAmount}.`);
  }

  /**
   * Reports a successful, honest participation in a succession, increasing reputation.
   * @param guardianDid The DID of the guardian.
   */
  reportSuccess(guardianDid: string): void {
    const guardian = this.guardians.get(guardianDid);
    if (guardian) {
      // Increase score, but cap it at 1
      guardian.reputationScore = Math.min(1, guardian.reputationScore + 0.01);
      guardian.successfulSuccessions += 1;
      guardian.lastSeenTimestamp = Date.now();
      logger.info(`[Reputation] Success reported for guardian ${guardianDid}. New score: ${guardian.reputationScore.toFixed(3)}`);
    }
  }

  /**
   * Reports a guardian's successful participation in a succession process.
   * This provides a significant reputation boost.
   * @param guardianDid The DID of the guardian.
   */
  reportSuccessionParticipation(guardianDid: string): void {
    const guardian = this.guardians.get(guardianDid);
    if (guardian) {
      // A larger boost for this critical community service.
      guardian.reputationScore = Math.min(1, guardian.reputationScore + 0.05);
      guardian.successfulSuccessions += 1;
      guardian.lastSeenTimestamp = Date.now();
      logger.info(`[Reputation] Succession participation reported for guardian ${guardianDid}. New score: ${guardian.reputationScore.toFixed(3)}`);
    }
  }
  /**
   * Reports a malicious or failed action, decreasing reputation (slashing).
   * @param guardianDid The DID of the guardian.
   */
  reportFailure(guardianDid: string): void {
    const guardian = this.guardians.get(guardianDid);
    if (guardian) {
      // Decrease score, but floor it at 0
      guardian.reputationScore = Math.max(0, guardian.reputationScore - 0.1); // A significant penalty
      guardian.lastSeenTimestamp = Date.now();
      // In a real contract, this would also trigger the slashing of their stakeAmount
      logger.warn(`[Reputation] Slashing event for guardian ${guardianDid}. New score: ${guardian.reputationScore.toFixed(3)}`);
    }
  }

  /**
   * Removes a guardian from the network.
   * This would be triggered if a guardian's reputation score drops to zero or they voluntarily unstake.
   * @param guardianDid The DID of the guardian to remove.
   */
  removeGuardian(guardianDid: string): boolean {
    if (this.guardians.has(guardianDid)) {
      this.guardians.delete(guardianDid);
      logger.info(`[Reputation] Guardian ${guardianDid} has been removed from the network.`);
      // In a real contract, this would also unlock their stake (if not slashed).
      // It would also emit an event to notify users who rely on this guardian.
      return true;
    }
    logger.warn(`[Reputation] Attempted to remove non-existent guardian: ${guardianDid}`);
    return false;
  }
  /**
   * Simulates a liveness check challenge-response for a guardian.
   * In a real system, this would involve cryptographic signature verification.
   * @param guardianDid The DID of the guardian being checked.
   * @param wasSuccessful A boolean indicating if the guardian responded correctly and on time.
   */
  recordLivenessCheck(guardianDid: string, wasSuccessful: boolean): void {
    const guardian = this.guardians.get(guardianDid);
    if (!guardian) {
      logger.warn(`[Reputation] Liveness check for non-existent guardian: ${guardianDid}`);
      return;
    }

    if (wasSuccessful) {
      // A small reward for being responsive and online.
      guardian.reputationScore = Math.min(1, guardian.reputationScore + 0.005);
      guardian.lastSeenTimestamp = Date.now();
      logger.info(`[Reputation] Liveness check successful for guardian ${guardianDid}. New score: ${guardian.reputationScore.toFixed(4)}`);
    } else {
      // A penalty for being unresponsive. This is less severe than a malicious action penalty.
      guardian.reputationScore = Math.max(0, guardian.reputationScore - 0.02);
      logger.warn(`[Reputation] Liveness check FAILED for guardian ${guardianDid}. New score: ${guardian.reputationScore.toFixed(4)}`);
      // If reputation drops too low, the guardian could be automatically removed.
    }
  }

  /**
   * @returns The list of all registered guardians, sorted by reputation.
   */
  getGuardians(): Guardian[] {
    const guardians = Array.from(this.guardians.values());
    // Sort by reputation score (descending) and then by stake amount (descending)
    return guardians.sort((a, b) => {
      if (b.reputationScore !== a.reputationScore) {
        return b.reputationScore - a.reputationScore;
      }
      return b.stakeAmount - a.stakeAmount;
    });
  }
}

export const reputationService = new ReputationService();