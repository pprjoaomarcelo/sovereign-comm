import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Wallet, Shield, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectNetwork } from "@/lib/mockData";
import { NetworkBadge } from "@/components/NetworkBadge";
import { useSessionStore } from "@/hooks/useSession";
import { PinCreationModal } from "@/components/PinCreationModal";
import { requestWalletSignature } from "@/lib/encryption";

export default function Connect() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState<ReturnType<typeof detectNetwork> | null>(null);
  const initializeSession = useSessionStore((state) => state.initializeSession);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (value.length > 10) {
      setDetectedNetwork(detectNetwork(value));
    } else {
      setDetectedNetwork(null);
    }
  };

  const connectMetaMask = async () => {
    setLoading(true);
    
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        toast({
          title: "MetaMask not found",
          description: "Please install MetaMask to connect your wallet",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts[0]) {
        const walletAddress = accounts[0];
        setPendingWalletAddress(walletAddress);
        setShowPinModal(true);
        // A lógica continuará na função handlePinSubmit
      }
    } catch (error: any) {
      toast({
        title: "Falha na Conexão",
        description: error.message || "Falha ao conectar a carteira",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingWalletAddress) return;

    setLoading(true);
    try {
      // 1. Obter assinatura para derivar a chave da sessão
      const sessionKey = await requestWalletSignature(pendingWalletAddress);
      
      // 2. Inicializar a sessão com a chave e o PIN
      initializeSession(sessionKey, pin);

      const network = detectNetwork(pendingWalletAddress);
        
      // Store in sessionStorage for demo
      sessionStorage.setItem('wallet', JSON.stringify({
        address: pendingWalletAddress,
        network: network,
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
      setLoading(false);
    }
  };

  const connectWithAddress = () => {
    if (!address || address.length < 10) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid blockchain address",
        variant: "destructive",
      });
      return;
    }

    const network = detectNetwork(address);
    
    if (network === "unknown") {
      toast({
        title: "Unsupported network",
        description: "Please enter a Bitcoin, Ethereum, or Solana address",
        variant: "destructive",
      });
      return;
    }

    sessionStorage.setItem('wallet', JSON.stringify({
      address: address,
      network: network,
      connected: true
    }));

    toast({
      title: "Address verified!",
      description: `Connected to ${network} network`,
    });

    navigate("/inbox");
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
          {/* MetaMask Connection */}
          <div className="space-y-3">
            <Button
              className="w-full h-14 gap-3 bg-primary hover:bg-primary/90 text-black font-semibold text-base shadow-lg hover:shadow-[var(--shadow-glow)] transition-all"
              onClick={connectMetaMask}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect with MetaMask
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Secure signature-based authentication
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="address">Blockchain Address</Label>
              <Input
                id="address"
                placeholder="Enter Bitcoin, Ethereum, or Solana address"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="font-mono text-sm"
              />
              {detectedNetwork && detectedNetwork !== "unknown" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Detected:</span>
                  <NetworkBadge network={detectedNetwork} />
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={connectWithAddress}
              disabled={!address || address.length < 10}
            >
              View Inbox
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Read-only mode for viewing public messages
            </p>
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
}
