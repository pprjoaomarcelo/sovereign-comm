import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressPurpose, BitcoinNetworkType, request } from "sats-connect";
import { requestProvider } from "webln";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings as SettingsIcon, Zap, Wallet, Bitcoin } from "lucide-react";

interface NavbarProps {
  connected: boolean;
  address: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Navbar = ({ connected, address, onConnect, onDisconnect }: NavbarProps) => {
  const navigate = useNavigate();
  const [lightningWallet, setLightningWallet] = useState<{ alias: string; balance: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleConnectLightning = async () => {
    try {
      const webln = await requestProvider();
      const info = await webln.getInfo();
      const balance = await webln.getBalance();
      
      setLightningWallet({
        alias: info.node.alias || "Lightning Wallet",
        balance: balance.balance,
      });
      setIsModalOpen(false);

    } catch (err) {
      // O usuário cancelou ou não tem uma extensão WebLN
      console.error("Could not connect to Lightning wallet", err);
    }
  };

  const handleConnectBitcoin = async () => {
    try {
      const response = await request("getAccounts", {
        purposes: [AddressPurpose.Payment],
        message: "Conecte sua carteira para usar o SovereignComm",
        network: BitcoinNetworkType.Testnet,
      });

      if (response.status === "success") {
        const paymentAddress = response.result.find(
          (addr) => addr.purpose === AddressPurpose.Payment
        );
        if (paymentAddress) {
          // Chama a função onConnect principal para unificar o estado
          onConnect(paymentAddress.address);
          setIsModalOpen(false);
        } else {
          throw new Error("Nenhum endereço de pagamento encontrado.");
        }
      } else {
        throw new Error(response.error.message);
      }
    } catch (err: any) {
      console.error("Não foi possível conectar à carteira Bitcoin", err);
      toast({
        title: "Conexão Falhou",
        description: err.message || "O usuário cancelou a solicitação.",
        variant: "destructive",
      });
    }
    setIsModalOpen(false);
  };

  return (
    <nav className="flex items-center justify-between p-4 border-b border-border">
      <Link to="/" className="text-lg font-bold">
        SovereignComm
      </Link>
      <div className="flex items-center gap-4">
        {lightningWallet && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>{lightningWallet.alias}: {lightningWallet.balance} sats</span>
          </div>
        )}
        {connected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${address}`} alt="User Avatar" />
                  <AvatarFallback>{address.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">Connected Wallet</p>
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  {formatAddress(address)}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDisconnect}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button onClick={() => setIsModalOpen(true)}>Connect Wallet</Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Connect a Wallet</DialogTitle>
                  <DialogDescription>
                    Choose your preferred network to continue.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    onClick={() => {
                      // A função onConnect agora pode precisar de um provedor,
                      // então chamamos sem argumentos para o fluxo EVM padrão.
                      // A lógica real de conexão EVM está no componente pai.
                      onConnect(); 
                      setIsModalOpen(false);
                    }}
                    variant="outline"
                    className="w-full justify-start gap-3 p-6 text-left"
                  >
                    <Wallet className="w-6 h-6 text-blue-500" />
                    <span className="font-semibold">EVM Wallet</span>
                  </Button>
                  <Button onClick={handleConnectBitcoin} variant="outline" className="w-full justify-start gap-3 p-6 text-left">
                    <Bitcoin className="w-6 h-6 text-orange-500" />
                    <span className="font-semibold">Bitcoin Wallet</span>
                  </Button>
                  <Button onClick={handleConnectLightning} variant="outline" className="w-full justify-start gap-3 p-6 text-left">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    <span className="font-semibold">Lightning Wallet</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </nav>
  );
};