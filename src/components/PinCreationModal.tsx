import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PinCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  isProcessing: boolean;
}

const PIN_LENGTH = 6;

export function PinCreationModal({ open, onOpenChange, onSubmit, isProcessing }: PinCreationModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Reset state when modal is closed
    if (!open) {
      setTimeout(() => {
        setPin("");
        setConfirmPin("");
        setError(null);
      }, 200); // Delay to allow closing animation
    }
  }, [open]);

  const handleSubmit = () => {
    if (pin.length !== PIN_LENGTH) {
      setError(`PIN must be ${PIN_LENGTH} digits.`);
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError(null);
    toast({
      title: "PIN Created",
      description: "Encrypting session key...",
    });
    onSubmit(pin);
  };

  const isSubmitDisabled = isProcessing || pin.length !== PIN_LENGTH || confirmPin.length !== PIN_LENGTH || pin !== confirmPin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Create a Secure PIN
          </DialogTitle>
          <DialogDescription>
            This PIN encrypts your session key locally on this device. It is never sent to any server.
            Choose a {PIN_LENGTH}-digit PIN.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pin" className="text-right">
              PIN
            </Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              className="col-span-3 font-mono tracking-widest"
              maxLength={PIN_LENGTH}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirm-pin" className="text-right">
              Confirm PIN
            </Label>
            <Input
              id="confirm-pin"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              className="col-span-3 font-mono tracking-widest"
              maxLength={PIN_LENGTH}
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Create & Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}