import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PinCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  isProcessing: boolean;
}

export const PinCreationModal = ({ open, onOpenChange, onSubmit, isProcessing }: PinCreationModalProps) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!/^\d{4}$/.test(pin)) {
      setError('O PIN deve conter exatamente 4 dígitos numéricos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Os PINs não correspondem. Tente novamente.');
      return;
    }
    setError('');
    onSubmit(pin);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crie seu PIN de Sessão</DialogTitle>
          <DialogDescription>
            Este PIN de 4 dígitos será usado para desbloquear sua sessão após um período de inatividade. Não o compartilhe com ninguém.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de 4 dígitos</Label>
            <Input id="pin" type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirme o PIN</Label>
            <Input id="confirm-pin" type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isProcessing || pin.length !== 4 || confirmPin.length !== 4}>{isProcessing ? "Processando..." : "Salvar e Conectar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};