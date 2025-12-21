import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PinInput } from '@/pages/PinInput';

interface PinCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  isProcessing?: boolean;
}

export const PinCreationModal = ({
  open,
  onOpenChange,
  onSubmit,
  isProcessing = false,
}: PinCreationModalProps) => {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const handlePinComplete = (pin: string) => {
    if (step === 'create') {
      setFirstPin(pin);
      setStep('confirm');
      setError('');
    } else {
      if (pin === firstPin) {
        onSubmit(pin);
        setStep('create');
        setFirstPin('');
        setError('');
      } else {
        setError('PINs do not match. Try again.');
        setStep('create');
        setFirstPin('');
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('create');
      setFirstPin('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
          </DialogTitle>
          <DialogDescription>
            {step === 'create' 
              ? 'Create a 4-digit PIN to secure your session.'
              : 'Enter the PIN again to confirm.'}
          </DialogDescription>
        </DialogHeader>
        <PinInput
          title={step === 'create' ? 'Enter your PIN' : 'Confirm your PIN'}
          description={step === 'create' 
            ? 'This PIN will be used to unlock your session.'
            : 'Re-enter your PIN to confirm.'}
          onComplete={handlePinComplete}
          error={error}
          isProcessing={isProcessing}
        />
      </DialogContent>
    </Dialog>
  );
};
