// CDP Configuration
export const CDP_CONFIG = {
  projectId: import.meta.env.VITE_CDP_PROJECT_ID ?? '',
  apiKeyId: import.meta.env.VITE_CDP_API_KEY_ID ?? '',
  apiKeySecret: import.meta.env.VITE_CDP_API_KEY_SECRET ?? '',
};

// x402 Network Configuration
export const X402_CONFIG = {
  facilitatorUrl: import.meta.env.VITE_FACILITATOR_URL ?? 'https://api.x402.org/facilitator',
  network: import.meta.env.VITE_NETWORK ?? 'base',
  usdcContractAddress: import.meta.env.VITE_USDC_CONTRACT_ADDRESS ?? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// App Configuration
export const APP_CONFIG = {
  name: 'AI Agent Chat',
  description: 'Chat with AI powered by x402 micropayments',
  url: import.meta.env.VITE_APP_URL ?? 'http://localhost:5000',
};

// Cost Configuration (in USDC)
export const COST_CONFIG = {
  maxPaymentAmount: 0.3, // max payment amount for x402-fetch wrapper
};
