import { useEffect } from 'react';
import { useSessionStore } from './useSession';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos

let inactivityTimer: NodeJS.Timeout;

/**
 * This hook manages the session inactivity timeout.
 * It should be used in a top-level component (like App.tsx) to monitor
 * user activity globally.
 */
export const useInactivityTimeout = () => {
  const { isLocked, lockSession } = useSessionStore((state) => ({
    isLocked: state.isLocked,
    lockSession: state.lockSession,
  }));

  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (!isLocked) {
        inactivityTimer = setTimeout(() => {
          console.log('[useInactivityTimeout] Session timed out due to inactivity.');
          lockSession();
        }, INACTIVITY_TIMEOUT);
      }
    };

    // Eventos que resetam o timer
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicia o timer na montagem do componente

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isLocked, lockSession]);
};