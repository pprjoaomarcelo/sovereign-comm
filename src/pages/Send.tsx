import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Lock, Send as SendIcon, DollarSign, Loader2, Star } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { QRCodeSVG } from "qrcode.react";
import pako from "pako";

// Nossos módulos de serviço
import { getQuote, sendMessage, type QuoteData } from "@/services/gateway.service";
import { discoverGateways, type DiscoveredGateway } from "@/services/nostr.service";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/hooks/useSession";
import { encryptMessage, requestWalletSignature } from "@/lib/encryption";

/**
 * Prepares the final message payload, applying compression and encryption.
 * @param message The original string message.
 * @param isEncrypted Boolean indicating if encryption should be applied.
 * @param sender The sender's address.
 * @param recipient The recipient's address.
 * @returns The final payload object ready to be sent or have its size calculated.
 */
async function prepareFinalPayload(message: string, isEncrypted: boolean, sender: string, recipient: string) {
  let finalContent: Uint8Array;

  if (isEncrypted) {
    const walletSignature = await requestWalletSignature(sender);
    // Encrypt the original message string. The result is a base64 string.
    const { encryptedMessage } = await encryptMessage(message, walletSignature);
    // Convert the base64 encrypted string back to bytes for compression
    finalContent = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
    console.log(`[Send] Message encrypted. Size: ${finalContent.length} bytes`);
  } else {
    // If not encrypted, just encode the raw message to bytes
    finalContent = new TextEncoder().encode(message);
  }

  // Always compress the content (whether it's encrypted bytes or raw message bytes)
  const compressedContent = pako.deflate(finalContent);
  console.log(`[Send] Content compressed. Final size: ${compressedContent.length} bytes`);


  return {
    sender: sender,
    recipient: recipient,
    timestamp: new Date().toISOString(),
    // Convert the final compressed bytes to a base64 string for transmission
    content: btoa(String.fromCharCode.apply(null, compressedContent)),
    attachments: [], // TODO: Implement attachment logic here
    encrypted: isEncrypted,
    is_compressed: true,
  };
}

export default function Send() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");

  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const resetSession = useSessionStore((state) => state.resetSession);
  const [gateways, setGateways] = useState<DiscoveredGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("");

  const ON_CHAIN_BYTE_LIMIT = 75; // Safe limit for OP_RETURN with prefix

  useEffect(() => {
    const walletData = sessionStorage.getItem("wallet");
    if (walletData) {
      const data = JSON.parse(walletData);
      setConnected(data.connected || false);
      setAddress(data.address || "");
    }

    // Descobrir gateways ao carregar a página
    const fetchGateways = async () => {
      const foundGateways = await discoverGateways();
      setGateways(foundGateways);
    };

    fetchGateways();
  }, []);

  const handleConnect = () => navigate("/connect");

  const handleDisconnect = () => {
    sessionStorage.removeItem("wallet");
    resetSession(); // Clears the secure session (PIN, etc.)
    setConnected(false);
    setAddress("");
    navigate("/");
    toast({
      title: "Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  // 1. Validates the form and opens the confirmation pop-up
  const handlePreview = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast({ title: "❌ Validation Error", description: "Please fill in the recipient and message.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Prepare the final payload using the new helper function
      const finalPayload = await prepareFinalPayload(message, isEncrypted, address, recipient);
      // 2. Get the quote based on the actual payload size
      const result = await getQuote(JSON.stringify(finalPayload).length);
      setQuoteData(result); // Save the full quote data (fee and invoice) to state
      setShowPreview(true);
    } catch (error) {
      console.error('[Send] Failed to get quote:', error);
      toast({
        title: "❌ Quote Error",
        description: error instanceof Error ? error.message : "Could not get a quote from the gateway.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Sends the message to the gateway AFTER confirmation in the pop-up
  const handleSendMessage = async () => {
    if (!address) {
      toast({ title: "❌ Connection Error", description: "Connect a wallet to set the sender.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setShowPreview(false); // Close the dialog while processing

    try {
      console.log(`[Send] Sending in Sovereign Mode...`);
      // 1. Prepare the final payload using the helper function
      const finalPayload = await prepareFinalPayload(message, isEncrypted, address, recipient);

      // 2. Send the payload to our sovereign gateway API
      const result = await sendMessage(finalPayload);
      console.log(`[Send] Gateway accepted message. CID: ${result.cid}`);
      toast({ title: "🚀 Message Processed by Gateway!", description: `Your message has been received and is being processed. CID: ${result.cid}` });

      // Clear the form and close the popup on success for any mode
      setMessage("");
      setRecipient("");
      setQuoteData(null);

    } catch (error) {
      console.error('[Send] Failed to send message:', error);
      toast({
        title: "❌ Send Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar connected={connected} address={address} onConnect={handleConnect} onDisconnect={handleDisconnect} />

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><SendIcon className="h-5 w-5" /> Send Sovereign Message</CardTitle>
            <CardDescription>Send sovereign messages with the level of privacy and cost you choose.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!connected && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Connect your wallet to send messages.
                  <Button onClick={handleConnect} size="sm" className="ml-4">Connect Wallet</Button>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="gateway-select">Gateway Soberano</Label>
              <Select value={selectedGateway} onValueChange={setSelectedGateway} disabled={!connected || gateways.length === 0}>
                <SelectTrigger id="gateway-select">
                  <SelectValue placeholder={gateways.length > 0 ? "Selecione um gateway..." : "Buscando gateways..."} />
                </SelectTrigger>
                <SelectContent>
                  {gateways.map((gw) => (
                    <SelectItem key={gw.pubkey} value={gw.api_endpoint}>
                      <div className="flex flex-col">
                        <span className="font-medium">{gw.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {gw.pricing.base_fee_sats} sats + {gw.pricing.sats_per_kb}/kb
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Gateways são descobertos via Nostr. A seleção de um gateway é necessária para o envio.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Textarea id="recipient" placeholder="Enter recipient's Bitcoin address (bc1...)" value={recipient} onChange={(e) => setRecipient(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
              </div>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="encryption"
                  checked={isEncrypted}
                  onCheckedChange={setIsEncrypted}
                />
                <Label htmlFor="encryption" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Encrypt message
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {isEncrypted 
                  ? "🔒 Only the recipient will be able to read the message." 
                  : "🌐 The message will be public."}
              </p>
            </div>

            {quoteData && (
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Estimated Gateway Fee</span>
                    </div>
                    <span className="text-sm font-mono font-semibold">{quoteData.fee_sats} sats</span>
                  </div>
                  <div className="text-xs text-muted-foreground">This is the cost for the gateway to process and anchor your message.</div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" size="lg" onClick={handlePreview} disabled={!connected || isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><SendIcon className="mr-2 h-4 w-4" /> Review Send</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle