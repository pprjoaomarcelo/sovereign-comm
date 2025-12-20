import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MessageCard, DecryptionStatus } from "@/components/MessageCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox as InboxIcon, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestWalletSignature, decryptMessage } from "@/lib/encryption";
import { useToast } from "@/hooks/use-toast";
import { useSessionStore } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

/**
 * Represents a message retrieved from a decentralized source.
 * The structure is generic and not tied to a specific database schema.
 */
interface Message {
  id: string; // A unique identifier, e.g., transaction hash or content CID
  sender_address: string;
  recipient_address: string;
  content_cid: string; // The CID of the (potentially encrypted) content on IPFS
  encrypted: boolean;
  network: string;
  timestamp: string; // ISO 8601 date string
  tx_hash: string | null; // The on-chain transaction hash
  raw_content?: string | null; // To hold fetched content from IPFS
}

export default function Inbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [walletSignature, setWalletSignature] = useState<string | null>(null);
  const resetSession = useSessionStore((state) => state.resetSession);

  useEffect(() => {
    const walletData = sessionStorage.getItem('wallet');
    if (walletData) {
      const parsed = JSON.parse(walletData);
      setConnected(parsed.connected);
      setAddress(parsed.address);
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchMessages();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchMessages = async () => {
    setLoading(true);
    console.log("[Inbox] Fetching messages for address:", address);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_address.eq.${address},sender_address.eq.${address}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the database result to the frontend's Message interface
      const formattedMessages: Message[] = data.map((dbMsg: any) => ({
        id: dbMsg.id,
        sender_address: dbMsg.sender_address,
        recipient_address: dbMsg.recipient_address,
        content_cid: dbMsg.content_cid,
        encrypted: dbMsg.encrypted,
        network: dbMsg.network,
        timestamp: dbMsg.created_at,
        tx_hash: dbMsg.tx_hash,
      }));

      setMessages(formattedMessages);

      const hasEncryptedMessages = formattedMessages.some(msg => msg.encrypted);
      if (hasEncryptedMessages && !walletSignature) {
        console.log("[Inbox] Encrypted messages found, signature will be requested on demand.");
      }

    } catch (error: any) {
      console.error("[Inbox] Error fetching messages:", error);
      toast({
        title: "Error loading messages",
        description: error.message || "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptMessage = async (messageCid: string, setStatusCallback: (status: DecryptionStatus) => void): Promise<string | null> => {
    const message = messages.find(m => m.id === messageCid);
    if (!message) {
      toast({ title: "Erro", description: "Mensagem não encontrada.", variant: "destructive" });
      return null;
    }

    // 1. Obter a assinatura da carteira, se ainda não tivermos
    let signature = walletSignature;
    if (!signature) {
      try {
        setStatusCallback('requesting_signature');
        console.log("[Inbox] Requesting wallet signature for decryption...");
        signature = await requestWalletSignature(address);
        setWalletSignature(signature);
      } catch (error: any) {
        console.error("[Inbox] Signature request failed:", error);
        toast({ title: "Assinatura Negada", description: "Você precisa assinar para descriptografar mensagens.", variant: "destructive" });
        return null;
      }
    }

    try {
      // 2. Buscar o conteúdo criptografado do IPFS
      setStatusCallback('fetching');
      // TODO: Implementar a busca real do IPFS. Por enquanto, vamos simular.
      // const encryptedContent = await fetchFromIpfs(message.content_cid);
      const encryptedContent = message.raw_content; // Usando o campo raw_content se ele existir (para mocks)
      if (!encryptedContent) {
        throw new Error("Conteúdo criptografado não encontrado no IPFS (simulação).");
      }
      setStatusCallback('decrypting');

      // 3. Descriptografar
      const decrypted = await decryptMessage(encryptedContent, signature);
      return decrypted;
    } catch (error: any) {
      console.error("[Inbox] Decryption failed:", error);
      toast({
        title: "Falha na descriptografia",
        description: error.message || "Não foi possível descriptografar a mensagem",
        variant: "destructive",
      });
      setStatusCallback('error');
      return null;
    }
  };

  const handleConnect = () => {
    navigate("/connect");
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('wallet');
    resetSession(); // Limpa a sessão segura (PIN, etc.)
    setConnected(false);
    setAddress("");
    navigate("/");
    toast({
      title: "Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast({
      title: "Refreshing...",
      description: "Fetching latest messages",
    });
    
    await fetchMessages();
    
    setRefreshing(false);
    toast({
      title: "Inbox updated",
      description: `${messages.length} message${messages.length !== 1 ? 's' : ''} loaded`,
    });
  };

  const filteredMessages = selectedNetwork === "all" 
    ? messages 
    : messages.filter(msg => msg.network === selectedNetwork);

  const sentMessages = filteredMessages.filter(msg => 
    msg.sender_address.toLowerCase() === address.toLowerCase()
  );
  
  const receivedMessages = filteredMessages.filter(msg => 
    msg.recipient_address.toLowerCase() === address.toLowerCase() && msg.sender_address.toLowerCase() !== address.toLowerCase()
  );

  const uniqueNetworks = Array.from(new Set(messages.map(msg => msg.network)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        connected={connected}
        address={address}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <InboxIcon className="w-8 h-8 text-primary" />
              Messages
            </h1>
            <p className="text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? 's' : ''} on-chain
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {uniqueNetworks.map((network) => (
                  <SelectItem key={network} value={network}>
                    {network.charAt(0).toUpperCase() + network.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={handleRefresh}
              disabled={refreshing || !connected}
              className="gap-2"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {!connected && (
          <div className="mb-8 p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to see your messages on-chain.
            </p>
            <Button onClick={handleConnect} className="gap-2 bg-primary hover:bg-primary/90 text-black">
              Connect Wallet
            </Button>
          </div>
        )}

        {connected && (
          <>
            {loading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <InboxIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground mb-6">
                  Your on-chain inbox is empty
                </p>
                <Button onClick={() => navigate('/send')} className="gap-2">
                  Send Your First Message
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="all">
                    All ({filteredMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="received">
                    Received ({receivedMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="sent">
                    Sent ({sentMessages.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {filteredMessages.map((message) => (
                    <MessageCard 
                      key={message.id} 
                      message={message}
                      userAddress={address}
                      isSent={message.sender_address.toLowerCase() === address.toLowerCase()}
                      onDecrypt={handleDecryptMessage}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="received" className="space-y-4">
                  {receivedMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No received messages
                    </div>
                  ) : (
                    receivedMessages.map((message) => (
                      <MessageCard 
                        key={message.id} 
                        message={message}
                        userAddress={address}
                        isSent={false}
                        onDecrypt={handleDecryptMessage}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="sent" className="space-y-4">
                  {sentMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No sent messages
                    </div>
                  ) : (
                    sentMessages.map((message) => (
                      <MessageCard 
                        key={message.id} 
                        message={message}
                        userAddress={address}
                        isSent={true}
                        onDecrypt={handleDecryptMessage}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
}
