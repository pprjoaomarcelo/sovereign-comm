import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface PinInputProps {
  title: string;
  description?: string;
  pinLength?: number;
  onComplete: (pin: string) => void;
  error?: string;
  isProcessing?: boolean;
}

/**
 * A secure PIN input component with randomized keypad
 */
export const PinInput = ({
  title,
  description,
  pinLength = 4,
  onComplete,
  error,
  isProcessing = false,
}: PinInputProps) => {
  const [pin, setPin] = useState('');

  const shuffledKeys = useMemo(() => {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    return keys;
  }, []);

  useEffect(() => {
    if (pin.length === pinLength) {
      onComplete(pin);
    }
  }, [pin, pinLength, onComplete]);

  const handleKeyClick = (key: number) => {
    if (pin.length < pinLength && !isProcessing) {
      setPin(pin + key);
    }
  };

  const handleBackspaceClick = () => {
    if (!isProcessing) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
      </div>

      <div className="flex gap-3 h-8 items-center">
        {Array.from({ length: pinLength }).map((_, index) => (
          <div
            key={index}
            className={`h-4 w-4 rounded-full transition-colors ${
              pin.length > index ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive h-5">{error}</p>}

      <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
        {shuffledKeys.map((key) => (
          <Button 
            key={key} 
            variant="outline" 
            size="lg" 
            className="h-16 text-2xl" 
            onClick={() => handleKeyClick(key)} 
            disabled={isProcessing}
          >
            {key}
          </Button>
        ))}
        <div className="col-start-2">
          <Button 
            variant="ghost" 
            size="lg" 
            className="h-16 w-full" 
            onClick={handleBackspaceClick} 
            disabled={isProcessing}
          >
            <Delete className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
};
