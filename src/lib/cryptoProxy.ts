/**
 * This file creates and manages the Web Worker responsible for cryptographic operations.
 * Using a Web Worker prevents heavy crypto tasks from blocking the main UI thread,
 * ensuring the application remains responsive.
 */
import * as Comlink from 'comlink';
import { type CryptoWorkerApi } from './workers/crypto-worker';
import CryptoWorker from './workers/crypto-worker.js?worker';

// Create a new worker instance. The `?worker` suffix tells Vite to bundle the
// worker and its dependencies correctly.
const worker = new CryptoWorker();

// Wrap the worker with Comlink to create a simple, promise-based proxy object.
export const cryptoProxy = Comlink.wrap<CryptoWorkerApi>(worker);

console.log('[CryptoProxy] Web Worker for cryptography has been initialized.');