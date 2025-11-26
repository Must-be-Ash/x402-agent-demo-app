import { type VercelRequest, type VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { url, includeResponseBody } = params;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
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

    // Build target URL with query params
    const endpoint = 'https://minifetch.com/api/v1/x402/extract/url-metadata';
    const queryParams = new URLSearchParams();
    queryParams.append('url', url as string);
    if (includeResponseBody) {
      queryParams.append('includeResponseBody', includeResponseBody as string);
    }
    const targetUrl = `${endpoint}?${queryParams.toString()}`;

    console.log(`Proxying metadata extraction to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
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
    console.error('Metadata extraction proxy error:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
