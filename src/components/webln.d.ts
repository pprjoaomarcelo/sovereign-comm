/**
 * Argumentos para a criação de uma fatura Lightning.
 */
interface MakeInvoiceArgs {
  amount: string | number;
  defaultMemo?: string;
}

/**
 * O resultado da criação de uma fatura.
 */
interface MakeInvoiceResponse {
  paymentRequest: string; // O bolt11 invoice string
}

/**
 * Define a interface do provedor WebLN que esperamos.
 */
export interface WebLNProvider {
  makeInvoice(args: MakeInvoiceArgs): Promise<MakeInvoiceResponse>;
}

declare module 'webln' {
  export function requestProvider(): Promise<WebLNProvider>;
}

 */
declare module 'webln' {
  // Declara a função requestProvider que retorna uma Promise.
  export function requestProvider(): Promise<WebLNProvider>;
}