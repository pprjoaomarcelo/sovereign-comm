import logger from './logger.service.js';

/**
 * Represents the data structure for a registered gateway.
 */
export interface Gateway {
  id: string; // A unique identifier, e.g., a public key or a registered domain.
  url: string; // The API endpoint for the gateway.
  reputationScore: number; // A score from 0 to 1, starting at 0.5.
  stakeAmount: number; // The amount of capital staked (for future slashing).
  lastSeen: Date; // The last time the gateway was active.
}

/**
 * Manages the reputation and selection of gateways in the network.
 * In a real implementation, this data would be managed by a smart contract
 * or a decentralized reputation system. For now, we manage it in-memory.
 */
class ReputationService {
  private gateways: Map<string, Gateway> = new Map();

  constructor() {
    // Initialize with some mock gateways for demonstration
    this.registerGateway('gateway_alpha', 'http://gateway-alpha.com/api', 100000);
    this.registerGateway('gateway_beta', 'http://gateway-beta.com/api', 150000);
  }

  /**
   * Registers a new gateway in the network.
   * @param id The unique ID of the gateway.
   * @param url The gateway's API URL.
   * @param stakeAmount The amount of capital staked.
   */
  registerGateway(id: string, url: string, stakeAmount: number): void {
    if (this.gateways.has(id)) {
      logger.warn(`[Reputation] Gateway ${id} is already registered.`);
      return;
    }
    const newGateway: Gateway = {
      id,
      url,
      reputationScore: 0.5, // Start with a neutral score
      stakeAmount,
      lastSeen: new Date(),
    };
    this.gateways.set(id, newGateway);
    logger.info(`[Reputation] New gateway registered: ${id}`);
  }

  /**
   * Reports a successful interaction with a gateway, increasing its reputation.
   * @param gatewayId The ID of the gateway.
   */
  reportSuccess(gatewayId: string): void {
    const gateway = this.gateways.get(gatewayId);
    if (gateway) {
      // Increase score, but cap it at 1
      gateway.reputationScore = Math.min(1, gateway.reputationScore + 0.01);
      gateway.lastSeen = new Date();
    }
  }

  /**
   * Reports a failed interaction with a gateway, decreasing its reputation.
   * @param gatewayId The ID of the gateway.
   */
  reportFailure(gatewayId: string): void {
    const gateway = this.gateways.get(gatewayId);
    if (gateway) {
      // Decrease score, but floor it at 0
      gateway.reputationScore = Math.max(0, gateway.reputationScore - 0.05);
      gateway.lastSeen = new Date();
      logger.warn(`[Reputation] Failure reported for gateway ${gatewayId}. New score: ${gateway.reputationScore.toFixed(3)}`);
    }
  }

  /**
   * @returns The list of all registered gateways.
   */
  getGateways(): Gateway[] {
    return Array.from(this.gateways.values());
  }
}

export const reputationService = new ReputationService();