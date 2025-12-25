/**
 * @file This module encapsulates all interactions with a WebLN (Web Lightning) provider,
 * such as the Alby browser extension. It provides a standardized way to request payments,
 * sign messages, and connect to the user's Lightning wallet.
 */

import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    webln?: {
      enable: () => Promise<{ publicKey: string }>;
      sendPayment: (invoice: string) => Promise<{ preimage: string }>;
      signMessage: (message: string) => Promise<{ signature: string }>;
    };
  }
}

/**
 * Checks if a WebLN provider (like Alby) is available in the browser.
 * @returns {boolean} True if WebLN is available, false otherwise.
 */
export const isWeblnAvailable = (): boolean => {
  return typeof window.webln !== 'undefined';
};

/**
 * Requests the user to enable their WebLN provider and connect to the application.
 * This will typically open a confirmation pop-up in the user's wallet extension.
 * @returns {Promise<{publicKey: string} | null>} The public key of the user's node or null if the connection failed.
 */
export const connectLightningWallet = async (): Promise<{ publicKey: string } | null> => {
  if (!isWeblnAvailable()) {
    toast({
      title: "Carteira Lightning não encontrada",
      description: "Por favor, instale uma extensão compatível com WebLN, como a Alby.",
      variant: "destructive",
    });
    return null;
  }

  try {
    const result = await window.webln.enable();
    console.log('[WebLN] Conexão bem-sucedida', result);
    toast({
      title: "Carteira Lightning Conectada!",
      description: `Conectado com o nó: ${result.publicKey.slice(0, 10)}...`,
    });
    return result;
  } catch (error) {
    console.error('[WebLN] Falha ao habilitar:', error);
    toast({
      title: "Conexão com a carteira falhou",
      description: error instanceof Error ? error.message : "O usuário negou a permissão.",
      variant: "destructive",
    });
    return null;
  }
};

/**
 * Requests the user to pay a Lightning invoice.
 * @param invoice The BOLT-11 payment request string (e.g., "lnbc...").
 * @returns {Promise<{preimage: string} | null>} The payment preimage if successful, or null if it fails.
 */
export const payLightningInvoice = async (invoice: string): Promise<{ preimage: string } | null> => {
  if (!isWeblnAvailable()) {
    console.error("[WebLN] Provedor WebLN não disponível para pagamento.");
    return null;
  }

  try {
    const result = await window.webln.sendPayment(invoice);
    console.log('[WebLN] Pagamento bem-sucedido', result);
    return result;
  } catch (error) {
    console.error('[WebLN] Falha no pagamento:', error);
    throw new Error(error instanceof Error ? error.message : "O pagamento foi cancelado ou falhou.");
  }
};