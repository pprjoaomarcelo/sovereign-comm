import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cryptoProxy } from '@/lib/cryptoProxy';
import { secureStorage } from '@/lib/secureStorage';

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
        await cryptoProxy.deriveKey(pin, salt);
        const encryptedSessionKey = await cryptoProxy.encrypt(sessionKey);

        await secureStorage.storeEncryptedSession(salt, encryptedSessionKey);

        set({ sessionKey, isInitialized: true, isLocked: false });
        console.log('[useSession] Session initialized and stored securely.');
      },

      unlockSession: async (pin) => {
        try {
          const { salt, encryptedKey } = await secureStorage.retrieveEncryptedSession();

          if (!salt || !encryptedKey) {
            throw new Error('No session found in storage.');
          }

          await cryptoProxy.deriveKey(pin, salt);
          const sessionKey = await cryptoProxy.decrypt(encryptedKey);

          set({ sessionKey, isLocked: false });
          console.log('[useSession] Session unlocked successfully.');
          return true;
        } catch (error) {
          console.error('[useSession] Unlock failed:', error);
          return false;
        }
      },

      lockSession: () => {
        cryptoProxy.clearKey();
        set({ sessionKey: null, isLocked: true });
        console.log('[useSession] Session locked.');
      },

      resetSession: async () => {
        cryptoProxy.clearKey();
        await secureStorage.clearEncryptedSession();
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