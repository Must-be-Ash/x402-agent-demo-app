import { type VercelRequest, type VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { validateAccessToken } from './lib/validate-token.js';
import { loadX402Endpoints, endpointsToFunctions } from './lib/x402-config.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load x402 endpoints for function calling
const x402Endpoints = loadX402Endpoints();
const functions = endpointsToFunctions(x402Endpoints);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract access token from Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  // Validate the access token
  const { isValid, endUser, error } = await validateAccessToken(accessToken);

  if (!isValid) {
    return res.status(401).json({
      error: 'Unauthorized',
      details: error
    });
  }

  // User is authenticated!
  console.log('Authenticated user:', endUser?.userId);

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI agent with autonomous access to paid x402 endpoints. You have a wallet with USDC on Base network.

When users ask for services, use the available functions to call the paid APIs automatically.

IMPORTANT: When you receive tool results:
- ALWAYS provide a clear, concise summary of the actual data - never just say "check the raw results"
- For metadata extraction: summarize the title, description, key tags, and any important information found
- For market data: highlight the key odds, prices, trends, or insights
- For structured data: extract and present the most relevant information in a readable format
- DO NOT repeat the raw JSON data verbatim
- Keep summaries concise (2-4 sentences) but informative
- Present information conversationally and helpfully

Always explain what you found and present the key information directly to the user.`
        },
        ...messages
      ],
      functions: functions,
      function_call: 'auto', // Let AI decide when to call functions
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseMessage = completion.choices[0].message;

    // Check if AI wants to call a function
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      console.log(`AI wants to call function: ${functionName}`, functionArgs);

      // Find the endpoint
      const endpoint = x402Endpoints.find(e => e.id === functionName);

      if (!endpoint) {
        return res.status(400).json({
          error: 'Unknown function',
          details: `Function "${functionName}" not found`
        });
      }

      // Return proxy route info for client to call with x402-fetch
      return res.status(200).json({
        message: `I'll ${endpoint.name.toLowerCase()} for you. This costs approximately ${endpoint.estimatedCost}.`,
        action: {
          type: 'x402-proxy-call',
          proxyRoute: `/api/x402/${functionName}`,
          params: functionArgs,
          endpoint: {
            id: endpoint.id,
            name: endpoint.name,
            estimatedCost: endpoint.estimatedCost,
          }
        }
      });
    }

    // No function call - just return the message
    return res.status(200).json({
      message: responseMessage.content,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({
      error: 'Failed to get AI response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
