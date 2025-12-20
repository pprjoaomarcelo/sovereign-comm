/**
 * @file This service encapsulates communication with the SovereignComm Gateway backend.
 */

/**
 * Defines the structure of the message payload that will be sent to the gateway.
 * This corresponds to the schema expected by the /messages endpoint.
 */
export interface MessagePayload {
  sender: string;
  recipient: string;
  timestamp: string;
  content: string; // Message content, potentially compressed and/or encrypted (in base64)
  attachments: any[]; // Structure to be defined for attachments
  encrypted: boolean;
  is_compressed: boolean;
}

/**
 * Defines the structure of a successful response from the gateway.
 */
export interface GatewayResponse {
  cid: string;
  status: string;
  timestamp: string;
}

const GATEWAY_URL = 'http://localhost:3000';

/**
 * Sends a prepared message payload to the gateway's /messages endpoint.
 * @param payload The message object to be sent.
 * @returns A promise that resolves with the gateway's response.
 */
export async function sendMessage(payload: MessagePayload): Promise<GatewayResponse> {
  try {
    const response = await fetch(`${GATEWAY_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error("Failed to communicate with the gateway:", error);
    throw error; // Re-throw the error so the calling component can handle it
  }
}

// The getQuote function you imported in Send.tsx would also live here.
// For now, we'll leave it as a placeholder.
export interface QuoteData {
  fee_sats: number;
  invoice: string;
  expires_at: string;
}

export async function getQuote(payloadSizeBytes: number): Promise<QuoteData> {
  console.log(`[Gateway Service] Getting quote for ${payloadSizeBytes} bytes...`);
  // Logic to call a GET /quote endpoint in the future.
  // For now, returns a fixed value for testing.
  return {
    fee_sats: 50,
    invoice: "lnbc1p...", // Example Lightning invoice
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}