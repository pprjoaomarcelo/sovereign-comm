import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, CheckCircle, XCircle, Copy, Check } from 'lucide-react';

// Hook customizado para o timer regressivo
const useCountdown = (targetDate: string) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;

    const interval = setInterval(() => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('Expirada');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
};


interface QuoteResponse {
  fee_sats: number;
  invoice: string;
  payment_hash: string;
  expires_at: string; // Nova propriedade
}

interface PaymentFlowProps {
  messagePayload: object;
  plan: 'basico' | 'soberano'; // Nova propriedade para o plano
  onPaymentConfirmed: (paymentHash: string) => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({ messagePayload, plan, onPaymentConfirmed }) => {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending');
  const [isCopied, setIsCopied] = useState(false);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const timeLeft = useCountdown(quote?.expires_at || '');

  const handleCopyInvoice = () => {
    if (quote?.invoice) {
      navigator.clipboard.writeText(quote.invoice);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  useEffect(() => {
    const getQuote = async () => {
      try {
        setIsLoading(true);
        const payloadSize = new TextEncoder().encode(JSON.stringify(messagePayload)).length;
        const response = await axios.get<QuoteResponse>(`http://localhost:3000/quote?payloadSize=${payloadSize}&plan=${plan}`);
        setQuote(response.data);
      } catch (err) {
        setError('Falha ao obter cotação do gateway. Tente novamente.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    getQuote();
  }, [messagePayload]);
  
  useEffect(() => {
    if (quote?.payment_hash && paymentStatus === 'pending' && timeLeft !== 'Expirada') {
      pollingInterval.current = setInterval(async () => {
        try {
          const response = await axios.get<{ is_confirmed: boolean }>(`http://localhost:3000/invoice/status/${quote.payment_hash}`);
          
          if (response.data.is_confirmed) {
            setPaymentStatus('confirmed');
            onPaymentConfirmed(quote.payment_hash);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
            }
          }
        } catch (err) {
          console.error('Erro ao verificar status da fatura:', err);
        }
      }, 3000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [quote, paymentStatus, onPaymentConfirmed, timeLeft]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Obtendo cotação e fatura do gateway...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <XCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  if (paymentStatus === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-xl font-semibold">Pagamento Confirmado!</h3>
        <p className="mt-2 text-muted-foreground">Sua mensagem está sendo processada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 border rounded-lg max-w-sm mx-auto">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold">Pague para Enviar</h3>
        <p className="text-xs text-muted-foreground">Plano Selecionado: <span className="font-bold capitalize text-primary">{plan}</span></p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Escaneie o QR Code com sua carteira Lightning.
      </p>
      
      {quote?.invoice && (
        <div className="p-4 bg-white rounded-lg">
          <QRCodeCanvas 
            value={quote.invoice.toUpperCase()}
            size={256} 
            bgColor={"#ffffff"} 
            fgColor={"#000000"} 
            level={"L"} 
            includeMargin={true}
          />
        </div>
      )}
      
      <div className="mt-4 text-center w-full">
        <p className="font-bold text-primary text-lg">{quote?.fee_sats} sats</p>
        
        {timeLeft && (
          <p className={`text-sm mt-1 ${timeLeft === 'Expirada' ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
            {timeLeft === 'Expirada' ? 'Fatura Expirada!' : `Expira em: ${timeLeft}`}
          </p>
        )}

        <button 
          onClick={handleCopyInvoice}
          className="mt-4 w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          {isCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
          {isCopied ? 'Copiado!' : 'Copiar Fatura'}
        </button>

        {paymentStatus === 'pending' && timeLeft !== 'Expirada' && (
            <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Aguardando pagamento...</span>
            </div>
        )}
      </div>
    </div>
  );
};