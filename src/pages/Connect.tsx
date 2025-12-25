import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Wallet, Shield, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectNetwork } from "@/lib/mockData";
import { NetworkBadge } from "@/components/NetworkBadge";
import { useSessionStore } from "@/hooks/useSession";
import { PinCreationModal } from "@/components/PinCreationModal";

export default function Connect() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const initializeSession = useSessionStore((state) => state.initializeSession);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

  const signInWithBitcoin = async () => {
    setLoading(true);
    try {
      // 1. Generate a unique challenge message
      const challengeMessage = "Sovereign Login Challenge: " + Date.now().toString();

      // 2. Request signature from the Bitcoin wallet (e.g., Alby via WebLN)
      if (typeof window.webln === 'undefined') {
        toast({
          title: "Carteira Bitcoin não encontrada",
          description: "Por favor, instale uma extensão de carteira com suporte a WebLN (ex: Alby).",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await window.webln.enable();
      // Para fins de teste, vamos forçar a rede para 'testnet'.
      // Em produção, detectaríamos a rede da carteira com `webln.getInfo()`.
      const network = "testnet";
      console.log(`[Connect] Forçando a rede para: ${network} para fins de teste.`);

      const { signature, pubkey: publicKey } = await window.webln.signMessage(challengeMessage);

      // 3. Send to our Go backend for verification
      const response = await fetch('http://localhost:8080/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey,
          signature: signature,
          message: challengeMessage,
          network: network, // Forçando 'testnet'
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setPendingWalletAddress(publicKey); // The public key is the Sovereign ID
        // Salva a rede para usar após a criação do PIN
        sessionStorage.setItem('pendingNetwork', network);
        setShowPinModal(true);
      } else {
        throw new Error(data.error || "Falha na verificação da assinatura.");
      }
    } catch (error: any) {
      toast({ title: "Falha no Sign-in com Bitcoin", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingWalletAddress) return;

    setLoading(true);
    try {
      // 1. Obter assinatura para derivar a chave da sessão
      // Para Bitcoin, a chave pública pode ser a própria chave de sessão ou uma derivação dela.
      // Para este exemplo, usaremos o pendingWalletAddress (que é a chave pública Bitcoin) diretamente.
      const sessionKey = pendingWalletAddress; // Ou derive uma chave de sessão a partir desta
      
      // 2. Inicializar a sessão com a chave e o PIN      
      initializeSession(sessionKey, pin);

      const network = detectNetwork(pendingWalletAddress);
        
      // Store in sessionStorage for demo
      sessionStorage.setItem('wallet', JSON.stringify({
        address: pendingWalletAddress,
        network: sessionStorage.getItem('pendingNetwork') || network,
        connected: true
      }));

      toast({ title: "Carteira Conectada!", description: `Conectado à rede ${network}` });

      navigate("/inbox");
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setShowPinModal(false);
      setPendingWalletAddress(null);
      sessionStorage.removeItem('pendingNetwork');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PinCreationModal 
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSubmit={handlePinSubmit}
        isProcessing={loading}
      />

      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur-sm border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wallet className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Connect Wallet</h1>
          <p className="text-muted-foreground">
            Choose your preferred connection method
          </p>
        </div>

        <div className="space-y-6">
          {/* --- BITCOIN SIGN-IN BUTTON --- */}
          <div className="space-y-3">
            <Button
              className="w-full h-14 gap-3 bg-yellow-500 hover:bg-yellow-500/90 text-black font-semibold text-base shadow-lg hover:shadow-[var(--shadow-glow)] transition-all"
              onClick={signInWithBitcoin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Sign-in with Bitcoin
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Prova criptográfica de controle da chave Bitcoin</p>
          </div>

          {/* Security Notice */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Security Notice</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We never ask for your private keys or seed phrases. 
                  Wallet connection uses secure signature verification only.
                </p>
              </div>
            </div>
          </Card>

          {/* Warning */}
          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Remember</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All messages are stored permanently on-chain and cannot be deleted. 
                  Use encryption for sensitive content.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
  interface Window {
    webln?: { // Interface básica do WebLN para assinatura de mensagens
      enable: () => Promise<void>;
      signMessage: (message: string) => Promise<{ signature: string; pubkey: string }>;
      getInfo: () => Promise<{
        network?: string; // A propriedade pode ter nomes diferentes
      }>;
    };
  }
}
