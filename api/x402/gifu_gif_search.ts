import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, max_results } = req.body;

    // Validate required parameter
    if (!query) {
      console.error('GIF search error: query parameter is missing');
      return res.status(400).json({ error: 'query parameter is required' });
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
    const requestBody: any = { query };
    if (max_results) requestBody.max_results = max_results;

    const endpoint = 'https://gifu-server.onrender.com/api/x402/search/gif';

    console.log(`Proxying GIF search to: ${endpoint}`, requestBody);

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
    console.error('GIF search proxy error:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
