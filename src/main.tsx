import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

// Estilos padrão para os componentes da carteira
import "@solana/wallet-adapter-react-ui/styles.css";

// Configura a rede. Usamos a Devnet para testes.
const network = WalletAdapterNetwork.Devnet;
const endpoint = clusterApiUrl(network);

// Lista as carteiras que queremos suportar.
const wallets = [new PhantomWalletAdapter()];

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
              <WalletModalProvider>
                <App />
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
