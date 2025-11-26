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
    const { closed, active, limit, order, ascending, offset, tag_id } = params;

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
    const endpoint = 'https://polymarketeer.vercel.app/api/x402/polymarket/events';
    const queryParams = new URLSearchParams();

    if (closed) queryParams.append('closed', closed as string);
    if (active) queryParams.append('active', active as string);
    if (limit) queryParams.append('limit', limit as string);
    if (order) queryParams.append('order', order as string);
    if (ascending) queryParams.append('ascending', ascending as string);
    if (offset) queryParams.append('offset', offset as string);
    if (tag_id) queryParams.append('tag_id', tag_id as string);

    const targetUrl = queryParams.toString()
      ? `${endpoint}?${queryParams.toString()}`
      : endpoint;

    console.log(`Proxying Polymarket events to: ${targetUrl}`);

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
    console.error('Polymarket proxy error:', error);
    return res.status(500).json({
      error: 'Proxy request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
