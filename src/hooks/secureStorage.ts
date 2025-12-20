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
    if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
      db.createObjectStore(SESSION_STORE_NAME);
    }
  },
});

export const secureStorage = {
  async storeEncryptedSession(salt: Uint8Array, encryptedKey: string): Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction(SESSION_STORE_NAME, 'readwrite');
    await Promise.all([
      tx.store.put(salt, SALT_KEY_ID),
      tx.store.put(encryptedKey, SESSION_KEY_ID),
    ]);
    await tx.done;
  },

  async retrieveEncryptedSession(): Promise<{ salt?: Uint8Array; encryptedKey?: string }> {
    const db = await dbPromise;
    const salt = await db.get(SESSION_STORE_NAME, SALT_KEY_ID);
    const encryptedKey = await db.get(SESSION_STORE_NAME, SESSION_KEY_ID);
    return { salt, encryptedKey };
  },

  async clearEncryptedSession(): Promise<void> {
    const db = await dbPromise;
    await db.delete(SESSION_STORE_NAME, SESSION_KEY_ID);
    await db.delete(SESSION_STORE_NAME, SALT_KEY_ID);
  },
};