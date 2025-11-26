import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { openDB, DBSchema } from 'idb';

const DB_NAME = 'SovereignCommDB';
const DB_VERSION = 1;
const SESSION_STORE_NAME = 'session';
const SESSION_KEY_ID = 'encryptedSessionKey';
const SALT_KEY_ID = 'pinSalt';

interface SessionDB extends DBSchema {
  [SESSION_STORE_NAME]: {
    key: string;
    value: any;
  };
}

const dbPromise = openDB<SessionDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(SESSION_STORE_NAME);
  },
});

// --- Encryption Functions ---

/**
 * Derives an encryption key from a PIN and a salt.
 * @param pin The PIN string.
 * @param salt The salt for key derivation.
 * @returns A CryptoKey for AES-GCM encryption.
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data (the session key) using the PIN-derived key.
 * @param data The string to be encrypted.
 * @param key The CryptoKey derived from the PIN.
 * @returns A base64 string containing the IV + encrypted data.
 */
async function encryptSessionKey(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is recommended for AES-GCM
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypts the session key using the PIN-derived key.
 * @param encryptedData The base64 string to be decrypted.
 * @param key The CryptoKey derived from the PIN.
 * @returns The original session key string.
 */
async function decryptSessionKey(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedContent = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decryptedContent);
}

// --- Zustand Store ---

interface SessionState {
  sessionKey: string | null;
  isInitialized: boolean;
  isLocked: boolean;
  initializeSession: (sessionKey: string, pin: string) => Promise<void>;
  unlockSession: (pin: string) => Promise<boolean>;
  lockSession: () => void;
  resetSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionKey: null,
      isInitialized: false, // This state will be persisted
      isLocked: true,

      initializeSession: async (sessionKey, pin) => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const pinKey = await deriveKeyFromPin(pin, salt);
        const encryptedSessionKey = await encryptSessionKey(sessionKey, pinKey);

        const db = await dbPromise;
        await db.put(SESSION_STORE_NAME, salt, SALT_KEY_ID);
        await db.put(SESSION_STORE_NAME, encryptedSessionKey, SESSION_KEY_ID);

        set({ sessionKey, isInitialized: true, isLocked: false });
        console.log('[useSession] Session initialized and stored securely.');
      },

      unlockSession: async (pin) => {
        try {
          const db = await dbPromise;
          const salt = await db.get(SESSION_STORE_NAME, SALT_KEY_ID);
          const encryptedSessionKey = await db.get(SESSION_STORE_NAME, SESSION_KEY_ID);

          if (!salt || !encryptedSessionKey) {
            throw new Error('No session found in storage.');
          }

          const pinKey = await deriveKeyFromPin(pin, salt);
          const sessionKey = await decryptSessionKey(encryptedSessionKey, pinKey);

          set({ sessionKey, isLocked: false });
          console.log('[useSession] Session unlocked successfully.');
          return true;
        } catch (error) {
          console.error('[useSession] Unlock failed:', error);
          return false;
        }
      },

      lockSession: () => {
        set({ sessionKey: null, isLocked: true });
        console.log('[useSession] Session locked.');
      },

      resetSession: async () => {
        const db = await dbPromise;
        await db.delete(SESSION_STORE_NAME, SESSION_KEY_ID);
        await db.delete(SESSION_STORE_NAME, SALT_KEY_ID);
        set({ sessionKey: null, isInitialized: false, isLocked: true });
        console.log('[useSession] Session has been reset.');
      },
    }),
    {
      name: 'sovereign-session-storage', // Key name in localStorage
      partialize: (state) => ({ isInitialized: state.isInitialized }), // Only persist 'isInitialized'
      // This function runs once when the state is rehydrated from localStorage.
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If a session is initialized, the app should start in a locked state.
          state.isLocked = state.isInitialized;
        }
      },
    }
  )
);