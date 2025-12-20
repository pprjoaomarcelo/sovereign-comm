/**
 * @file did.service.ts
 * @description Service for creating and managing Decentralized Identifier (DID) documents.
 */

import { addJsonToIpfs } from './ipfs.service.js';
import logger from './logger.service.js';

/**
 * Represents the structure of a SovereignComm DID Document.
 * Aligned with the W3C DID Core specification.
 */
export interface DidDocument {
  '@context': string[];
  id: string;
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyHex: string;
  }[];
  authentication: string[];
  /** Methods for invoking capabilities, such as signing transactions or authorizing actions. */
  capabilityInvocation?: string[];
  service?: {
    id: string;
    type: string;
    serviceEndpoint: string;
  }[];
}

/**
 * Represents the information for a single verification method (public key).
 */
export interface VerificationMethodInfo {
  publicKeyHex: string;
  type?: string; // e.g., 'EcdsaSecp256k1VerificationKey2019'
}

/**
 * Represents the information for a single service endpoint.
 */
export interface ServiceEndpointInfo {
  /** A unique identifier for the service within the DID Document, e.g., "backup-gateway". */
  idFragment: string;
  /** The type of the service, e.g., "SovereignCommProfile". */
  type: string;
  /** The URL endpoint for the service. */
  serviceEndpoint: string;
}
/**
 * Creates a DID Document for a new SovereignComm user.
 * @param bitcoinAddress The user's unique Bitcoin address.
 * @param publicKeys An array of public keys to associate with the DID.
 * @param preferredGatewayUrl The user's preferred gateway for message discovery.
 * @returns A fully formed DidDocument object.
 */
export function createDidDocument(
  bitcoinAddress: string,
  publicKeys: VerificationMethodInfo[],
  preferredGatewayUrl: string
): DidDocument {
  const did = `did:sovereign:btc:${bitcoinAddress}`;

  return {
    '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
    id: did,
    verificationMethod: publicKeys.map((keyInfo, index) => ({
      id: `${did}#keys-${index + 1}`,
      type: keyInfo.type || 'EcdsaSecp256k1VerificationKey2019', // Default to Bitcoin key type
      controller: did,
      publicKeyHex: keyInfo.publicKeyHex,
    })),
    authentication: publicKeys.map((_, index) => `${did}#keys-${index + 1}`), // Assume all keys can be used for authentication
    capabilityInvocation: publicKeys.map((_, index) => `${did}#keys-${index + 1}`), // Assume all keys can also invoke capabilities
    service: [{
      id: `${did}#sovereigncomm`,
      type: 'SovereignCommProfile',
      serviceEndpoint: preferredGatewayUrl,
    }],
  };
}

/**
 * Adds a new verification method to an existing DID Document.
 * This function creates a new document object rather than mutating the original.
 * @param document The current DidDocument object.
 * @param newKey The information for the new public key to add.
 * @returns A new, updated DidDocument object.
 */
export function addVerificationMethod(
  document: DidDocument,
  newKey: VerificationMethodInfo
): DidDocument {
  // Create a deep copy to avoid side effects
  const newDocument: DidDocument = JSON.parse(JSON.stringify(document));

  // Determine the next key ID based on the current number of keys
  const nextKeyIndex = newDocument.verificationMethod.length + 1;
  const newKeyId = `${newDocument.id}#keys-${nextKeyIndex}`;

  // Add the new verification method to the list
  newDocument.verificationMethod.push({
    id: newKeyId,
    type: newKey.type || 'EcdsaSecp256k1VerificationKey2019',
    controller: newDocument.id,
    publicKeyHex: newKey.publicKeyHex,
  });

  // Also add the new key to the list of authentication methods
  newDocument.authentication.push(newKeyId);

  // For simplicity, we'll also add it to capabilityInvocation. In a more complex setup, this might be conditional.
  newDocument.capabilityInvocation = [...(newDocument.capabilityInvocation || []), newKeyId];

  return newDocument;
}

/**
 * Removes a service endpoint from an existing DID Document.
 * This is useful for decommissioning a gateway or other service.
 * @param document The current DidDocument object.
 * @param serviceIdToRemove The full ID of the service to remove (e.g., "did:sovereign:btc:...#sovereigncomm-backup").
 * @returns A new, updated DidDocument object without the specified service.
 */
export function removeServiceEndpoint(
  document: DidDocument,
  serviceIdToRemove: string
): DidDocument {
  // Create a deep copy to avoid side effects
  const newDocument: DidDocument = JSON.parse(JSON.stringify(document));

  // Filter out the service if the service array exists
  if (newDocument.service) {
    newDocument.service = newDocument.service.filter(
      (service) => service.id !== serviceIdToRemove
    );
  }

  return newDocument;
}

/**
 * Adds a new service endpoint to an existing DID Document.
 * This is useful for defining backup gateways or other related services.
 * @param document The current DidDocument object.
 * @param newService The information for the new service endpoint to add.
 * @returns A new, updated DidDocument object.
 */
export function addServiceEndpoint(
  document: DidDocument,
  newService: ServiceEndpointInfo
): DidDocument {
  // Create a deep copy to avoid side effects
  const newDocument: DidDocument = JSON.parse(JSON.stringify(document));

  // Ensure the service array exists
  if (!newDocument.service) {
    newDocument.service = [];
  }

  // Add the new service endpoint
  newDocument.service.push({
    id: `${newDocument.id}#${newService.idFragment}`,
    type: newService.type,
    serviceEndpoint: newService.serviceEndpoint,
  });

  return newDocument;
}

/**
 * Updates the URL of an existing service endpoint in a DID Document.
 * This is useful when a gateway's address changes.
 * @param document The current DidDocument object.
 * @param serviceIdToUpdate The full ID of the service to update (e.g., "did:sovereign:btc:...#sovereigncomm").
 * @param newUrl The new URL for the service endpoint.
 * @returns A new, updated DidDocument object.
 */
export function updateServiceEndpoint(
  document: DidDocument,
  serviceIdToUpdate: string,
  newUrl: string
): DidDocument {
  // Create a deep copy to avoid side effects
  const newDocument: DidDocument = JSON.parse(JSON.stringify(document));

  if (newDocument.service) {
    newDocument.service = newDocument.service.map((service) =>
      service.id === serviceIdToUpdate ? { ...service, serviceEndpoint: newUrl } : service
    );
  }

  return newDocument;
}

/**
 * Removes a verification method from an existing DID Document.
 * This is a critical function for key rotation.
 * @param document The current DidDocument object.
 * @param keyIdToRemove The full ID of the key to remove (e.g., "did:sovereign:btc:...#keys-1").
 * @returns A new, updated DidDocument object without the specified key.
 */
export function removeVerificationMethod(
  document: DidDocument,
  keyIdToRemove: string
): DidDocument {
  // Create a deep copy to avoid side effects
  const newDocument: DidDocument = JSON.parse(JSON.stringify(document));

  // Filter out the key from both verificationMethod and authentication arrays
  newDocument.verificationMethod = newDocument.verificationMethod.filter(
    (method) => method.id !== keyIdToRemove
  );
  newDocument.authentication = newDocument.authentication.filter(
    (authId) => authId !== keyIdToRemove
  );
  if (newDocument.capabilityInvocation) {
    newDocument.capabilityInvocation = newDocument.capabilityInvocation.filter(capId => capId !== keyIdToRemove);
  }

  return newDocument;
}