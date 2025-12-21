import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Lock, Send as SendIcon, DollarSign, Database, Loader2, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { detectNetwork, type NetworkType } from "@/lib/mockData";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Navbar } from "@/components/Navbar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QRCodeSVG } from "qrcode.react";
import pako from "pako";

// Nossos módulos de lógica de backend (ainda como esqueletos)
import { getQuote, sendMessage, type QuoteData } from "@/services/gateway.service";
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

type SendMode = "complete" | "ipfs_only" | "on_chain";

export default function Send() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [sendMode, setSendMode] = useState<SendMode>("complete");
 
  const [detectedNetwork, setDetectedNetwork] = useState<NetworkType>("unknown"); 
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType | "unknown" | "">("");
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const resetSession = useSessionStore((state) => state.resetSession);

  const ON_CHAIN_BYTE_LIMIT = 75; // Safe limit for OP_RETURN with prefix

  useEffect(() => {
    const walletData = sessionStorage.getItem("wallet");
    if (walletData) {
      const data = JSON.parse(walletData);
      setConnected(data.connected || false);
      setAddress(data.address || "");
    }
  }, []);

  // Disable encryption if the mode is on-chain
  useEffect(() => {
    if (sendMode === 'on_chain') {
      setIsEncrypted(false);
    }
  }, [sendMode]);

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

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipient(value);
    if (value.trim()) {
      const network = detectNetwork(value);
      setDetectedNetwork(network);
      // Auto-select the network if it's a known, non-EVM type
      if (network !== "unknown" && network !== "ethereum") {
        setSelectedNetwork(network);
      } 
    } else {
      setDetectedNetwork("unknown");
      setSelectedNetwork("");
    }
  };

  const estimateOnChainFee = async () => {
    if (sendMode !== 'on_chain') return;
    try {
      // Fetch recommended fee rates from a public API
      const feeResponse = await fetch('https://mempool.space/api/v1/fees/recommended');
      const feeRates = await feeResponse.json();
      const fastFee = feeRates.fastestFee; // sats/vB

      // Estimate transaction size (vB) for a simple OP_RETURN tx
      // 1 P2TR input, 1 OP_RETURN output, 1 P2TR change output
      const txSizeVb = 57.5 + 43 + 10.5 + (1 + message.length); 
      const fee = Math.ceil(txSizeVb * fastFee);
      setEstimatedFee(fee);
    } catch (error) {
      console.error("Failed to estimate on-chain fee:", error);
      setEstimatedFee(0); // Reset on error
    }
  };

  // 1. Validates the form and opens the confirmation pop-up
  const handlePreview = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast({ title: "❌ Validation Error", description: "Please fill in the recipient and message.", variant: "destructive" });
      return;
    }

    // If on-chain, the preview is simpler, doesn't call the gateway
    if (sendMode === 'on_chain') {
      await estimateOnChainFee(); // Recalculate the final fee
      setQuoteData(null);
      setShowPreview(true);
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
      switch (sendMode) {
        case 'on_chain':
          // TODO: This mode should call a different gateway endpoint or be handled separately
          // For now, we'll simulate a direct anchor. The message must be converted to a byte array.
          const onChainPayload = new TextEncoder().encode(message);
          console.log(`[Send] On-chain mode payload prepared. Size: ${onChainPayload.length} bytes`);
          console.log("[Send] On-chain mode is not fully implemented yet."); // Keep console logs in English
          toast({ title: "✅ On-Chain Simulation", description: `Message '${message}' would be anchored directly.` });
          break;

        case 'ipfs_only': {
          // Intentional fall-through to 'complete' case
        }

        case 'complete': {
          console.log(`[Send] Sending in Sovereign Mode (${sendMode})...`);
          // 1. Prepare the final payload using the helper function
          const finalPayload = await prepareFinalPayload(message, isEncrypted, address, recipient);

          // 2. Send the payload to our sovereign gateway API
          const result = await sendMessage(finalPayload);
          console.log(`[Send] Gateway accepted message. CID: ${result.cid}`);
          toast({ title: "🚀 Message Processed by Gateway!", description: `Your message has been received and is being processed. CID: ${result.cid}` });
          break;
        }

        default:
          throw new Error("Unknown send mode.");
      }

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
            <CardTitle className="flex items-center gap-2"><SendIcon className="h-5 w-5" /> Send Message</CardTitle>
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

            {/* SEND MODE SELECTOR */}
            <div className="space-y-3">
              <Label>Send Mode</Label>
              <RadioGroup value={sendMode} onValueChange={(value: SendMode) => setSendMode(value)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <RadioGroupItem value="complete" id="mode-complete" className="peer sr-only" />
                  <Label htmlFor="mode-complete" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    Secure & Efficient
                    <span className="text-xs font-normal text-center mt-1">Encrypted, via IPFS, with optimized cost. (Recommended)</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="ipfs_only" id="mode-ipfs" className="peer sr-only" />
                  <Label htmlFor="mode-ipfs" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    Public via IPFS
                    <span className="text-xs font-normal text-center mt-1">Public message on IPFS, only the pointer on the blockchain.</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="on_chain" id="mode-onchain" className="peer sr-only" />
                  <Label htmlFor="mode-onchain" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    Public On-Chain
                    <span className="text-xs font-normal text-center mt-1">Public message on the blockchain. (Experimental, expensive)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {sendMode === 'on_chain' && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Warning: On-Chain Mode</AlertTitle>
                <AlertDescription>
                  Your message will be **public forever** on the blockchain, with high cost and limited to ~75 characters. Use with caution.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input id="recipient" placeholder="0x... / bc1... / Sol..." value={recipient} onChange={handleRecipientChange} />
              {detectedNetwork !== 'unknown' && <div className="pt-2"><NetworkBadge network={detectedNetwork} /></div>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                {sendMode === 'on_chain' && (
                  <span className="text-xs text-muted-foreground">{message.length}/{ON_CHAIN_BYTE_LIMIT}</span>
                )}
              </div>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={sendMode === 'on_chain' ? ON_CHAIN_BYTE_LIMIT : undefined}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="encryption"
                  checked={isEncrypted}
                  onCheckedChange={setIsEncrypted}
                  disabled={sendMode === 'on_chain'}
                />
                <Label htmlFor="encryption" className={`flex items-center gap-2 ${sendMode === 'on_chain' ? 'text-muted-foreground' : ''}`}>
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

            {estimatedFee > 0 && (
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
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
          </AlertDialogHeader>
          {quoteData && sendMode !== 'on_chain' ? (
            <div className="space-y-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                To send your message, pay the Lightning invoice below.
              </p>
              <div className="p-4 bg-card rounded-lg inline-block">
                <QRCodeSVG value={quoteData.invoice.toUpperCase()} size={200} />
              </div>
              <div className="font-mono text-lg font-semibold">
                {quoteData.fee_sats} sats
              </div>
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertTitle>Awaiting Payment</AlertTitle>
                <AlertDescription>
                  After paying the invoice, click "Confirm Send" for the gateway to process your message.
                  (For testing, you can click directly).
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="py-4 text-sm">
              <p>You are about to send a message directly to the Bitcoin blockchain.</p>
              <p className="mt-2">Recipient: <span className="font-mono text-xs">{recipient}</span></p>
              <p className="mt-2">Estimated cost: <span className="font-mono font-semibold">{estimatedFee} sats</span></p>              {/* Add more transaction details here if needed */}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} onClick={() => { setShowPreview(false); setQuoteData(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendMessage} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Confirm Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
