/**
 * x402 payment execution for OpenAI function calling
 * Executes x402 endpoint calls with automatic payment from server wallet
 */

import { loadX402Config, getEndpoint } from './x402-config.js';
import { setupX402Wallet } from '../../lib/x402/wallet.js';
import { extractPaymentInfo } from '../../lib/x402/payment-logger.js';

/**
 * Executes an x402 endpoint call with payment
 * @param functionName - The endpoint ID from x402-endpoints.json
 * @param functionArgs - Arguments to pass to the endpoint
 * @returns Payment details, API response, and formatted AI response
 */
export async function executeX402Call(functionName: string, functionArgs: any) {
  // Load config and validate endpoint
  const config = loadX402Config();
  const endpoint = getEndpoint(functionName);

  if (!endpoint) {
    throw new Error(`Endpoint "${functionName}" not found`);
  }

  // Setup wallet and x402 fetch with max payment of 10 USDC
  const { x402Fetch } = setupX402Wallet(config.wallet, 10.0);

  // Prepare request URL and body
  let url = endpoint.url;
  let body: string | undefined;

  if (endpoint.method === 'GET' && functionArgs) {
    // Add query parameters for GET requests
    const searchParams = new URLSearchParams(functionArgs);
    url = `${url}?${searchParams.toString()}`;
  } else if (functionArgs) {
    // Use body for POST/PUT/PATCH requests
    body = JSON.stringify(functionArgs);
  }

  // Execute x402 call with payment
  console.log(`Executing x402 endpoint: ${endpoint.name} (${functionName})`);
  console.log(`URL: ${url}`);

  const response = await x402Fetch(url, {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  // Extract payment information from response
  const paymentInfo = extractPaymentInfo(response);

  // Get response data
  const apiResponse = await response.json();

  // Format AI response text and extract image data
  let aiResponse: string;
  let imageData: { url?: string; dataUrl?: string; type?: string } | null = null;

  // Check if it's an image generation endpoint (QR code, etc.)
  if (endpoint.id.includes('qr') || endpoint.id.includes('image')) {
    // Look for base64 data URL (QR code)
    if (apiResponse.qr_code && typeof apiResponse.qr_code === 'string' && apiResponse.qr_code.startsWith('data:image')) {
      imageData = {
        dataUrl: apiResponse.qr_code,
        type: 'qr-code'
      };
      aiResponse = `I've generated your QR code${apiResponse.url ? ` for ${apiResponse.url}` : ''}.`;
    }
    // Look for regular image URL
    else if (apiResponse.url || apiResponse.image_url || apiResponse.qr_code_url) {
      const imageUrl = apiResponse.url || apiResponse.image_url || apiResponse.qr_code_url;
      imageData = {
        url: imageUrl,
        type: 'image'
      };
      aiResponse = `Image generated successfully.`;
    } else {
      aiResponse = `Result from ${endpoint.name}. Check technical details for full response.`;
    }
  }
  // Check if it's odds/market data endpoint
  else if (endpoint.id.includes('odds') || endpoint.id.includes('market') || endpoint.id.includes('polymarket')) {
    aiResponse = `Market data retrieved from ${endpoint.name}. See the data below.`;
  }
  // Default: provide clean response
  else if (typeof apiResponse === 'string') {
    aiResponse = apiResponse;
  } else if (apiResponse.result && typeof apiResponse.result === 'string') {
    aiResponse = apiResponse.result;
  } else {
    aiResponse = `Data received from ${endpoint.name}. Expand technical details to see the full response.`;
  }

  // Return formatted result
  return {
    payment: paymentInfo.txHash ? {
      txHash: paymentInfo.txHash,
      amount: endpoint.estimatedCost || '0.00 USDC',
      token: 'USDC',
      network: config.wallet.network
    } : null,
    apiResponse,
    aiResponse,
    imageData,
    endpoint: {
      id: endpoint.id,
      name: endpoint.name
    }
  };
}
