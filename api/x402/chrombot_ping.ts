import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get x402 payment header if present
    const paymentHeader = req.headers['x-payment'];

    // Build headers for x402 endpoint
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (paymentHeader) {
      headers['X-PAYMENT'] = paymentHeader;
    }

    const endpoint = 'https://chrombot-x402.vercel.app/ping';

    console.log(`Proxying health check to: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    // Get response data
    const data = await response.json();

    // Forward X-PAYMENT-RESPONSE header if present
    const paymentResponse = response.headers.get('x-payment-response');
    if (paymentResponse) {
      res.setHeader('X-PAYMENT-RESPONSE', paymentResponse);
      res.setHeader('Access-Control-Expose-Headers', 'X-PAYMENT-RESPONSE');
      console.log('Payment completed, tx hash:', paymentResponse);
    }

    // Return response (402 or success)
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Health check proxy error:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
