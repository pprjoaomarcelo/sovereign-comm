import { useEffect } from 'react';
import { useSessionStore } from '@/hooks/useSession';

/**
 * Um componente que rastreia a atividade do usuário (movimento do mouse, pressionamento de teclas)
 * para reiniciar o temporizador de inatividade da sessão.
 * Este componente não renderiza nada na UI.
 */
export const ActivityTracker = () => {
  // Usamos getState() para obter a função do store, pois ela será chamada
  // de dentro de um event listener, fora do ciclo de renderização do React.
  const { resetActivityTimer, isInitialized } = useSessionStore((state) => ({
    resetActivityTimer: state.resetActivityTimer,
    isInitialized: state.isInitialized,
  }));

  useEffect(() => {
    if (!isInitialized) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, resetActivityTimer);
    });

    // Função de limpeza para remover os listeners quando o componente for desmontado
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetActivityTimer);
      });
    };
  }, [isInitialized, resetActivityTimer]);

  return null; // Este componente não renderiza nada
};