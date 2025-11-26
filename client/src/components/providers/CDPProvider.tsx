import { CDPReactProvider } from '@coinbase/cdp-react';
import { CDP_CONFIG } from '@/lib/config';

// CDP Configuration - using EOA only (no smart accounts)
// This matches the x402 pattern for simpler wallet management
const CONFIG = {
  projectId: CDP_CONFIG.projectId,
  appName: 'AI Agent Chat',
  appLogoUrl: '/logo.svg',
  ethereum: {
    createOnLogin: "eoa" as const,  // Explicitly create EOA wallet only
  },
  solana: {
    // No Solana wallet creation
  },
};

interface CDPProviderProps {
  children: React.ReactNode;
}

export default function CDPProvider({ children }: CDPProviderProps) {
  // Debug: Log the project ID
  console.log('CDP Project ID:', CDP_CONFIG.projectId);
  console.log('Raw env var:', import.meta.env.VITE_CDP_PROJECT_ID);

  if (!CDP_CONFIG.projectId) {
    console.error('CDP Project ID is missing! Check your .env file.');
  }

  return (
    <CDPReactProvider config={CONFIG}>
      {children}
    </CDPReactProvider>
  );
}
