/**
 * @file notification.service.ts
 * @description Handles sending protocol-level notifications to users.
 */

import logger from './logger.service.js';

/**
 * Manages the mapping between users and their chosen guardians.
 * In a real system, this would be derived from on-chain data (e.g., DigitalWill contracts).
 */
class UserGuardianRegistry {
  // Maps a user's DID to the list of their guardian's DIDs.
  private userToGuardians: Map<string, string[]> = new Map();

  // Maps a guardian's DID to the list of users they protect.
  // This is an inverted index for efficient lookups when a guardian is removed.
  private guardianToUsers: Map<string, string[]> = new Map();

  /**
   * Registers or updates the list of guardians for a specific user.
   * @param userDid The DID of the user.
   * @param guardianDids The full list of guardian DIDs for that user.
   */
  registerWill(userDid: string, guardianDids: string[]): void {
    // First, remove old associations for this user to handle updates.
    const oldGuardians = this.userToGuardians.get(userDid) || [];
    for (const oldGuardian of oldGuardians) {
      const users = this.guardianToUsers.get(oldGuardian) || [];
      this.guardianToUsers.set(oldGuardian, users.filter(u => u !== userDid));
    }

    // Add new associations
    this.userToGuardians.set(userDid, guardianDids);
    for (const guardianDid of guardianDids) {
      const users = this.guardianToUsers.get(guardianDid) || [];
      if (!users.includes(userDid)) {
        users.push(userDid);
        this.guardianToUsers.set(guardianDid, users);
      }
    }
    logger.info(`[Registry] Will registered/updated for user ${userDid}.`);
  }

  /**
   * Finds all users protected by a specific guardian.
   * @param guardianDid The DID of the guardian.
   * @returns An array of user DIDs.
   */
  findUsersByGuardian(guardianDid: string): string[] {
    return this.guardianToUsers.get(guardianDid) || [];
  }
}

export const userGuardianRegistry = new UserGuardianRegistry();

/**
 * Simulates the client-side logic for checking a public, on-chain event log for guardian removals.
 * Instead of the protocol *pushing* a notification, the client *pulls* the information.
 * @param userDid The DID of the user checking for updates.
 * @param theirGuardianDids The list of guardians the user is subscribed to.
 * @param onChainRevocationLog A simulated log of revoked guardians.
 */
export function checkGuardianRevocations(userDid: string, theirGuardianDids: string[], onChainRevocationLog: string[]) {
  const revokedGuardians = theirGuardianDids.filter(g => onChainRevocationLog.includes(g));

  if (revokedGuardians.length > 0) {
    for (const revokedDid of revokedGuardians) {
      // This would trigger a local notification in the user's client application.
      logger.warn(`[Notification] Client for ${userDid} detected that guardian ${revokedDid} has been revoked. Triggering local alert.`);
    }
  } else {
    logger.info(`[Notification] Client for ${userDid} confirmed all guardians are still active.`);
  }
}