import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InfoAsset } from "@/lib/marketplaceMock";
import { Bitcoin, Ticket, FileLock, BookOpen, Loader2 } from "lucide-react";
import { requestProvider } from "webln";
import { useState } from "react";

interface InfoAssetCardProps {
  asset: InfoAsset;
}

const typeIcons: Record<InfoAsset['type'], React.ReactNode> = {
  course: <BookOpen className="w-4 h-4" />,
  ticket: <Ticket className="w-4 h-4" />,
  leak: <FileLock className="w-4 h-4" />,
  report: <BookOpen className="w-4 h-4" />,
};

const formatSats = (amount: number) => {
  return new Intl.NumberFormat('en-US').format(amount);
};

export const InfoAssetCard = ({ asset }: InfoAssetCardProps) => {
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);
  const formatAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  // Simula a obtenção de uma fatura de um backend/gateway
  const getLightningInvoice = async (sats: number, memo: string): Promise<string> => {
    console.log(`Gerando fatura para ${sats} sats com a descrição: ${memo}`);
    // Em um cenário real, isso seria uma chamada `fetch` para o seu gateway:
    // const response = await fetch('/api/generate-invoice', { method: 'POST', ... });
    // const data = await response.json();
    // return data.invoice;

    // Para este exemplo, usaremos uma fatura de teste estática.
    // NOTA: Faturas Lightning reais expiram e só podem ser pagas uma vez.
    // Esta é apenas para demonstração do fluxo.
    return "lnbc10u1p3z7z7xpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzj2t5938xrgq28q9z2gqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg.json";
  };

  const handlePurchase = async () => {
    setIsPaying(true);
    try {
      const webln = await requestProvider();
      const invoice = await getLightningInvoice(asset.priceSats, `Acesso ao ativo: ${asset.title}`);

      toast({
        title: "Aguardando Pagamento",
        description: "Confirme o pagamento na sua carteira Lightning.",
      });

      const result = await webln.sendPayment(invoice);

      toast({
        title: "Pagamento bem-sucedido!",
        description: `Você comprou acesso a ${asset.title}. Preimage: ${result.preimage.slice(0, 10)}...`,
        className: "bg-green-500 text-white",
      });

      // Aqui você daria acesso ao conteúdo para o usuário

    } catch (err: any) {
      console.error("Falha no pagamento", err);
      toast({
        title: "Pagamento Falhou",
        description: err.message || "O usuário cancelou ou a extensão não foi encontrada.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm">
      <div className="h-40 w-full overflow-hidden">
        <img
          src={asset.thumbnailUrl}
          alt={asset.title}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="capitalize gap-1.5">
            {typeIcons[asset.type]}
            {asset.type}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{asset.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-4">
          {asset.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {asset.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">Vendedor</p>
          <p className="text-xs font-mono">{formatAddress(asset.sellerAddress)}</p>
        </div>
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <Bitcoin className="w-4 h-4 text-primary" />
            <span className="text-xl font-bold">{formatSats(asset.priceSats)}</span>
            <span className="text-sm text-muted-foreground">sats</span>
          </div>
          <Button
            onClick={handlePurchase}
            disabled={isPaying}
            className="bg-primary hover:bg-primary/90 text-black gap-2"
          >
            {isPaying && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPaying ? "Pagando..." : "Comprar Acesso"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};