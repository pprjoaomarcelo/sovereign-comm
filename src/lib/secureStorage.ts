/**
 * Secure storage utilities using IndexedDB
 */
import { openDB, IDBPDatabase } from 'idb';

interface SecureStorageDB {
  sessions: {
    key: string;
    salt: Uint8Array;
    encryptedKey: string;
  };
}

const DB_NAME = 'sovereign-secure-storage';
const STORE_NAME = 'sessions';
const SESSION_KEY = 'main-session';

let dbInstance: IDBPDatabase<SecureStorageDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SecureStorageDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<SecureStorageDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    },
  });
  
  return dbInstance;
}

export const secureStorage = {
  async storeEncryptedSession(salt: Uint8Array, encryptedKey: string): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, {
      key: SESSION_KEY,
      salt,
      encryptedKey,
    });
  },

  async retrieveEncryptedSession(): Promise<{ salt: Uint8Array | null; encryptedKey: string | null }> {
    try {
      const db = await getDB();
      const result = await db.get(STORE_NAME, SESSION_KEY);
      
      if (result) {
        return {
          salt: result.salt,
          encryptedKey: result.encryptedKey,
        };
      }
    } catch (error) {
      console.error('[SecureStorage] Error retrieving session:', error);
    }
    
    return { salt: null, encryptedKey: null };
  },

  async clearEncryptedSession(): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, SESSION_KEY);
    } catch (error) {
      console.error('[SecureStorage] Error clearing session:', error);
    }
  },
};
