# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Agent chat application demonstrating x402 micropayment integration on the Base blockchain. The agent has its own Coinbase Developer Platform (CDP) wallet and can autonomously make micropayments to access paid APIs while chatting with users.

**Key Technologies:**
- **Frontend**: React 18.2.0 + Vite + TypeScript + Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Wallet**: Coinbase CDP SDK (@coinbase/cdp-react, @coinbase/cdp-hooks, @coinbase/cdp-sdk)
- **Payments**: x402-fetch for micropayments on Base network
- **Routing**: Wouter (lightweight client-side router)
- **Styling**: Custom "hand-drawn" sketchy UI theme
- **Deployment**: Vercel (serverless architecture)

## Development Commands

### Running the Application

**Local Development (Recommended - Vercel CLI):**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Start local development server (simulates Vercel environment)
vercel dev
# This runs:
# - Vite dev server for frontend
# - Serverless functions locally at /api/*
# - Automatically loads environment variables
```

**Frontend-Only Development:**
```bash
# Run Vite dev server only (mock mode)
npm run dev
# Uses mock data from client/src/lib/mock-data.ts
# API calls will fail unless Vercel dev is running
```

**Production Build:**
```bash
npm run build    # Builds frontend to dist/
npm run preview  # Preview production build locally
```

### Type Checking
```bash
npm run check    # TypeScript type checking without emitting files
```

## Architecture

### Project Structure
```
/client/           - React frontend application
  /src/
    /components/   - UI components including CDP wallet integration
    /pages/        - Route pages (Landing, Chat)
    /lib/          - Utilities, config, payment logger
/api/              - Vercel serverless functions
  chat.ts          - OpenAI chat endpoint (POST /api/chat)
/shared/           - Shared TypeScript types/schemas (if needed)
vercel.json        - Vercel deployment configuration
```

### Frontend Architecture

**Wallet Integration (CDP):**
- `CDPProvider` wraps the app with Coinbase CDP React context
- Uses EOA (Externally Owned Account) wallets only, no smart accounts
- CDP hooks: `useIsInitialized()`, `useIsSignedIn()` for wallet state
- Configuration in `client/src/lib/config.ts`

**Payment System (x402):**
- `x402-fetch` wrapper handles micropayments automatically
- Payment logger utility (`client/src/lib/payment-logger.ts`) provides structured logging
- Payments settle on Base network using USDC
- Transaction hashes visible on BaseScan

**Chat Implementation:**
- Currently uses mock data (`client/src/lib/mock-data.ts`)
- Demonstrates payment flow for QR codes, Polymarket data, Sora videos
- Messages have types: 'text', 'payment', 'tool-result'

### Backend Architecture (Serverless)

**Serverless Functions:**
- `/api/chat.ts` - OpenAI chat completion endpoint
  - Method: POST
  - Body: `{ messages: ChatMessage[] }`
  - Response: `{ message: string, usage: object }`
  - Uses OpenAI gpt-4o-mini model
  - System prompt configured for x402 agent behavior

**Why Serverless:**
- No database or persistent state needed
- Only makes OpenAI API calls
- Auto-scales with traffic
- Zero server configuration
- Generous free tier on Vercel

### Environment Configuration

Required environment variables:

**Local Development (.env file):**
```env
# OpenAI API
OPENAI_API_KEY=

# Coinbase Developer Platform
VITE_CDP_PROJECT_ID=
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=

# x402 Network Configuration
VITE_FACILITATOR_URL=https://x402.org/facilitator
VITE_NETWORK=base
VITE_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**Vercel Dashboard (Production):**
Set these in Vercel project settings → Environment Variables:
- `OPENAI_API_KEY`
- `VITE_CDP_PROJECT_ID`
- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`

Frontend environment variables (VITE_*) are configured in `vercel.json`.

### Path Aliases

TypeScript paths configured in `tsconfig.json` and `vite.config.ts`:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## Key Implementation Patterns

### x402 Payment Flow
When integrating paid APIs:
1. Use `x402-fetch` instead of standard fetch
2. Configure max payment amount in `COST_CONFIG`
3. Extract tx hash from `X-PAYMENT-RESPONSE` header
4. Use `payment-logger.ts` utilities for structured logging
5. Display payment confirmations with BaseScan links

### CDP Wallet Integration
- Always check `isInitialized` before rendering wallet-dependent UI
- Use `isSignedIn` to gate features requiring wallet connection
- Show `AuthModal` to prompt wallet connection when needed
- EOA wallets are created automatically on first login

### UI Styling
- Uses custom "sketchy" hand-drawn aesthetic
- Tailwind CSS v4 with custom design tokens
- Radix UI primitives for accessible components
- Custom sketchy border/shadow classes in CSS

## Deployment

### First Time Deployment to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   # Follow prompts to link project
   ```

4. **Set Environment Variables:**
   Go to Vercel Dashboard → Project → Settings → Environment Variables
   Add all required variables listed above

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

### Continuous Deployment

Connect your GitHub repository to Vercel:
- Every push to main branch auto-deploys to production
- Pull requests get preview deployments
- Automatic HTTPS, CDN distribution, instant rollbacks

## Important Notes

- **React Version**: Uses React 18.2.0 (not 19) due to @coinbase/cdp-react compatibility requirement
- **Serverless Architecture**: No persistent server, only serverless functions
- **Mock Chat**: Current chat uses hardcoded responses in `mock-data.ts`
- **Base Network**: All payments settle on Base mainnet using USDC
- **Vercel Proxy**: Local dev with `vercel dev` runs serverless functions at http://localhost:3000
- **Build Output**: Vite builds frontend to `dist/` directory
- **API Routes**: All serverless functions in `/api/` directory auto-map to `/api/*` URLs

## When Adding Real API Integration

1. Replace mock responses in `client/src/lib/mock-data.ts`
2. Create new serverless functions in `/api/` directory
3. Use `x402-fetch` with proper payment headers in serverless functions
4. Update payment logger with real transaction hashes
5. Consider adding proper error handling for payment failures
6. Test locally with `vercel dev` before deploying

## Troubleshooting

**API 404 Errors:**
- Ensure you're using `vercel dev` (not `npm run dev`) for local API testing
- Check that serverless function exists in `/api/` directory
- Verify proxy configuration in `vite.config.ts`

**Environment Variables Not Loading:**
- Local: Check `.env` file exists in project root
- Production: Verify variables set in Vercel dashboard
- Frontend vars: Must start with `VITE_` prefix
- Serverless vars: No prefix needed (e.g., `OPENAI_API_KEY`)

**Build Failures:**
- Run `npm run check` to catch TypeScript errors
- Ensure React version is 18.2.0 (not 19.x)
- Check that all dependencies are installed
