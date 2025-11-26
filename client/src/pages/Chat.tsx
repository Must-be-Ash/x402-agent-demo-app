import { useState, useRef, useEffect } from 'react';
import { Link } from "wouter";
import { useIsInitialized, useIsSignedIn, useGetAccessToken } from '@coinbase/cdp-hooks';
import { getCurrentUser, toViemAccount } from '@coinbase/cdp-core';
import { SketchyButton, SketchyTextarea } from "@/components/ui/sketchy-ui";
import { ArrowLeft, Send, User, Bot, Wallet, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Message, generateId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/auth/AuthModal";
import { HeaderWallet } from "@/components/HeaderWallet";
import { wrapFetchWithPayment } from 'x402-fetch';
import { createWalletClient, http, publicActions } from 'viem';
import { base } from 'viem/chains';

export default function Chat() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { getAccessToken } = useGetAccessToken();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [x402Fetch, setX402Fetch] = useState<typeof fetch | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm an x402 Agent. I can access paid tools using your connected wallet. You pay only for what you use! Ask me to use any x402 endpoint :)",
      timestamp: Date.now(),
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show auth modal if not signed in after initialization
  useEffect(() => {
    if (isInitialized && !isSignedIn) {
      setShowAuthModal(true);
    }
  }, [isInitialized, isSignedIn]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Setup x402 fetch wrapper when user signs in
  useEffect(() => {
    async function setupX402() {
      console.log('[x402] Setting up...', { isSignedIn });

      if (!isSignedIn) {
        console.log('[x402] Not signed in, skipping setup');
        return;
      }

      try {
        // Get current user from CDP
        const user = await getCurrentUser();

        if (!user) {
          console.warn('[x402] No user returned from getCurrentUser()');
          return;
        }

        console.log('[x402] User has', user.evmAccounts?.length || 0, 'EVM account(s)');

        if (!user.evmAccounts || user.evmAccounts.length === 0) {
          console.error('[x402] No EVM accounts found');
          return;
        }

        // Get user's CDP EOA account
        console.log('[x402] Converting to viem account...');
        const viemAccount = await toViemAccount(user.evmAccounts[0]);
        console.log('[x402] Wallet address:', viemAccount.address);

        // Create wallet client for Base network
        const walletClient = createWalletClient({
          account: viemAccount,
          chain: base,
          transport: http('https://mainnet.base.org'),
        }).extend(publicActions);

        // Max payment: 0.3 USDC (300000 units)
        const maxPaymentAmount = BigInt(0.3 * 10 ** 6);

        console.log('[x402] Wrapping fetch with x402 payment capability');
        console.log('[x402] Max payment amount:', maxPaymentAmount.toString(), 'units (USDC)');

        // Wrap fetch with x402 capability
        const wrapped = wrapFetchWithPayment(
          fetch,
          walletClient as any,
          maxPaymentAmount
        ) as typeof fetch;

        setX402Fetch(() => wrapped);
        console.log('[x402] ✅ Initialization complete!');
      } catch (error) {
        console.error('[x402] ❌ Failed to setup:', error);
      }
    }

    setupX402();
  }, [isSignedIn]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if user is signed in before allowing submission
    if (!isSignedIn) {
      setShowAuthModal(true);
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get CDP access token
      const accessToken = await getAccessToken();

      // Call OpenAI API with access token
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: messages
            .filter(m => m.type === 'text')
            .map(m => ({
              role: m.role,
              content: m.content,
            }))
            .concat([{ role: 'user', content: input }]),
        }),
      });

      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        setShowAuthModal(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();

      // Check if AI wants to make an x402 proxy call
      if (data.action && data.action.type === 'x402-proxy-call') {
        // Add AI message explaining what it's about to do
        const aiMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
          type: 'text'
        };
        setMessages(prev => [...prev, aiMessage]);

        if (!x402Fetch) {
          console.error('[x402] Fetch wrapper not initialized!', { isSignedIn });
          const errorMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: 'Sorry, payment system is not ready yet. Please wait a moment and try again, or refresh the page if the issue persists.',
            timestamp: Date.now(),
            type: 'text'
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        try {
          // Execute x402 call via proxy with user's wallet
          const endpoint = data.action.endpoint;
          const params = data.action.params;
          const proxyRoute = data.action.proxyRoute;

          console.log(`Client executing x402 call via proxy: ${endpoint.name}`, { proxyRoute, params });

          // Use x402-wrapped fetch to call proxy route
          const x402Response = await x402Fetch(proxyRoute, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });

          if (!x402Response.ok) {
            throw new Error(`x402 call failed: ${x402Response.statusText}`);
          }

          // Extract payment info from headers
          const txHash = x402Response.headers.get('X-PAYMENT-RESPONSE');

          // Show payment confirmation if payment was made
          if (txHash) {
            const paymentMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: `Payment sent: ${endpoint.estimatedCost}`,
              timestamp: Date.now(),
              type: 'payment',
              metadata: {
                amount: endpoint.estimatedCost,
                token: 'USDC',
                txHash: txHash,
              }
            };
            setMessages(prev => [...prev, paymentMessage]);
          }

          // Get the actual API response
          const apiResponse = await x402Response.json();

          // Handle image data (QR codes, etc.)
          if (endpoint.id.includes('qr') || endpoint.id.includes('image')) {
            if (apiResponse.qr_code && typeof apiResponse.qr_code === 'string' && apiResponse.qr_code.startsWith('data:image')) {
              const imageMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: apiResponse.qr_code,
                timestamp: Date.now(),
                type: 'image',
                metadata: {
                  imageType: 'qr-code'
                }
              };
              setMessages(prev => [...prev, imageMessage]);
            }
          }

          // Handle GIF results
          if (endpoint.id.includes('gif') && apiResponse.results && Array.isArray(apiResponse.results)) {
            // Show first GIF as image
            if (apiResponse.results.length > 0 && apiResponse.results[0].url) {
              const gifMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: apiResponse.results[0].url,
                timestamp: Date.now(),
                type: 'image',
                metadata: { imageType: 'gif' }
              };
              setMessages(prev => [...prev, gifMessage]);
            }
          }

          // Add tool result as collapsible details
          const toolMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: typeof apiResponse === 'string' ? apiResponse : JSON.stringify(apiResponse, null, 2),
            timestamp: Date.now(),
            type: 'tool-result',
            metadata: {
              toolName: endpoint.name
            }
          };
          setMessages(prev => [...prev, toolMessage]);

          // Get AI to summarize the results
          const summaryResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: `You are a helpful AI assistant. Provide a clear, concise summary of API response data.`
                },
                {
                  role: 'user',
                  content: `The user asked: "${input}"\n\nHere's the response from ${endpoint.name}:\n\n${JSON.stringify(apiResponse, null, 2)}\n\nPlease provide a clear summary of what was found (2-4 sentences).`
                }
              ]
            })
          });

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            const summaryMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: summaryData.message,
              timestamp: Date.now(),
              type: 'text'
            };
            setMessages(prev => [...prev, summaryMessage]);
          }

        } catch (error) {
          console.error('x402 call failed:', error);
          const errorMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: `Sorry, the payment or API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: Date.now(),
            type: 'text'
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Original flow for non-action responses
        // Handle payment if present
        if (data.payment && data.payment.txHash) {
          const paymentMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: `Payment sent: ${data.payment.amount} ${data.payment.token}`,
            timestamp: Date.now(),
            type: 'payment',
            metadata: {
              amount: data.payment.amount,
              token: data.payment.token,
              txHash: data.payment.txHash,
            }
          };
          setMessages(prev => [...prev, paymentMessage]);
        }

        // Handle image data if present
        if (data.imageData) {
          const imageMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: data.imageData.dataUrl || data.imageData.url || '',
            timestamp: Date.now(),
            type: 'image',
            metadata: {
              imageType: data.imageData.type
            }
          };
          setMessages(prev => [...prev, imageMessage]);
        }

        // Handle tool result if present
        if (data.toolResult) {
          const toolMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: typeof data.toolResult === 'string' ? data.toolResult : JSON.stringify(data.toolResult, null, 2),
            timestamp: Date.now(),
            type: 'tool-result',
            metadata: {
              toolName: data.toolName
            }
          };
          setMessages(prev => [...prev, toolMessage]);
        }

        // Add AI response
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
          type: 'text'
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Show loading while wallet initializes
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-body">Initializing wallet...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background">
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Header */}
      <header className="h-16 flex items-center px-4 border-b-2 border-primary/10 bg-card/50 backdrop-blur-sm z-10 relative">
        <div className="flex-1">
          <Link href="/">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-heading">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          </Link>
        </div>
        
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h1 className="font-heading text-xl font-bold hidden md:block">x402 Agent Demo</h1>
        </div>
        
        <div className="flex-1 flex justify-end">
          {isSignedIn ? (
            <HeaderWallet />
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-mono text-xs border border-orange-200 hover:bg-orange-200 transition-colors flex items-center gap-2"
            >
              <Wallet className="w-3 h-3" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-4 max-w-3xl mx-auto",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-10 h-10 rounded-full border-2 border-current flex items-center justify-center shrink-0",
              msg.role === 'assistant' ? "bg-accent text-accent-foreground" : "bg-white"
            )}>
              {msg.role === 'assistant' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>

            {/* Message Content */}
            <div className="flex flex-col gap-2 max-w-[80%]">
              
              {/* Payment Status Bubble */}
              {msg.type === 'payment' && msg.metadata && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-sm text-green-900 font-mono flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2">
                      Sent {msg.metadata.amount} {msg.metadata.token}
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    </div>
                    {msg.metadata.txHash && (
                      <a
                        href={`https://basescan.org/tx/${msg.metadata.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-600 underline hover:text-green-800 flex items-center gap-1 mt-0.5"
                      >
                        View on BaseScan <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Image Display */}
              {msg.type === 'image' && (
                <div className="sketchy-border sketchy-shadow bg-white p-4 rounded">
                  <img
                    src={msg.content}
                    alt="Generated content"
                    className="max-w-full h-auto rounded"
                    style={{ maxHeight: '400px' }}
                  />
                  {msg.metadata?.imageType === 'qr-code' && (
                    <p className="text-xs text-muted-foreground mt-3 text-center font-body">
                      Scan this QR code to access the URL
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 font-mono text-right opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {/* Main Content Bubble */}
              {msg.type !== 'image' && (
                <div className={cn(
                  "relative p-4 md:p-6 text-lg font-body leading-relaxed",
                  "sketchy-border sketchy-shadow",
                  "break-words overflow-wrap-anywhere",
                  msg.role === 'assistant'
                    ? "bg-[#fffdf5] rounded-tl-none"
                    : "bg-white rounded-tr-none"
                )}>
                  {/* Show content only for non-tool-result messages */}
                  {msg.type !== 'tool-result' && (
                    <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                  )}

                  {/* Tool Result - Collapsible Technical Details */}
                  {msg.type === 'tool-result' && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors list-none flex items-center gap-2">
                        <span className="inline-block transform transition-transform group-open:rotate-90">▶</span>
                        📋 Technical Details from {msg.metadata?.toolName || 'API'}
                      </summary>
                      <pre className="text-xs bg-muted/30 p-3 rounded overflow-x-auto mt-2 border border-primary/10 font-mono">
                        {msg.content}
                      </pre>
                    </details>
                  )}

                  <div className="text-xs text-muted-foreground mt-2 font-mono text-right opacity-50">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 max-w-3xl mx-auto">
            <div className="w-10 h-10 rounded-full border-2 border-current bg-accent flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div className="bg-[#fffdf5] p-4 sketchy-border rounded-tl-none flex items-center gap-2">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-sm border-t-2 border-primary/5">
        <div className="max-w-3xl mx-auto relative">
          
          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {['Generate a QR Code (0.01 USDC)', 'Fetch a GIF (0.05 USDC)', 'Fetch metadata (0.01 USDC)'].map(suggestion => (
                <button 
                  key={suggestion}
                  onClick={() => setInput(suggestion.split(' (')[0])}
                  className="whitespace-nowrap px-4 py-2 bg-white border border-primary/20 rounded-full text-sm font-body hover:bg-accent hover:border-accent-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="sketchy-border bg-white p-2 pr-14 relative transition-all focus-within:shadow-[6px_6px_0px_0px_currentColor]">
            <SketchyTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for a paid service..."
              rows={1}
              className="min-h-[60px] max-h-[200px] w-full"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="absolute bottom-3 right-3 p-2 bg-primary text-primary-foreground rounded-full hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
