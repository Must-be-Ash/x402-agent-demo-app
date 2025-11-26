import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt parameter is required' });
    }

    // Get x402 payment header if present
    const paymentHeader = req.headers['x-payment'];

    // Build headers for x402 endpoint
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (paymentHeader) {
      headers['X-PAYMENT'] = paymentHeader;
    }

    // Build request body
    const requestBody: any = { prompt };
    if (duration) requestBody.duration = duration;

    const endpoint = 'https://www.genbase.fun/api/video/create-sora2';

    console.log(`Proxying video generation to: ${endpoint}`, requestBody);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
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
    console.error('Video generation proxy error:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
