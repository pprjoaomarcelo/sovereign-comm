import { useState, useEffect } from 'react';
import { useSessionStore } from '@/hooks/useSession';
import { PinInput } from './PinInput';
import { ShieldCheck } from 'lucide-react';

export const SessionLockScreen = () => {
  const { isLocked, unlockSession } = useSessionStore((state) => ({
    isLocked: state.isLocked,
    unlockSession: state.unlockSession,
  }));
  const [error, setError] = useState('');
  const [pinAttempt, setPinAttempt] = useState('');

  const handlePinUnlock = (pin: string) => {
    const success = unlockSession(pin);
    if (!success) {
      setError('PIN incorreto. Tente novamente.');
      // Limpa o PIN e o erro após uma tentativa falha
      setTimeout(() => {
        setError('');
        setPinAttempt(''); // Este estado não é usado, mas seria para resetar o PinInput se necessário
      }, 2000);
    }
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in-0">
      <div className="flex flex-col items-center gap-4 mb-8 text-primary">
        <ShieldCheck className="h-16 w-16" />
        <h1 className="text-3xl font-bold text-foreground">Sessão Bloqueada</h1>
      </div>
      <PinInput title="Digite seu PIN para continuar" description="Sua sessão foi bloqueada por inatividade." onComplete={handlePinUnlock} error={error} />
    </div>
  );
};