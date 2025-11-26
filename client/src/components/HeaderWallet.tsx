import { useCurrentUser, useIsSignedIn, useSignOut } from '@coinbase/cdp-hooks';
import { SketchyButton } from '@/components/ui/sketchy-ui';
import { Wallet, Copy, Check, LogOut, RefreshCw } from 'lucide-react';
import { useEffect, useState, useRef, type MouseEvent } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { cn } from '@/lib/utils';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_DECIMALS = 6;

export function HeaderWallet() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { signOut } = useSignOut();

  const evmAddress = currentUser?.evmAccounts?.[0];
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside as any);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside as any);
      };
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (isSignedIn && evmAddress) {
      fetchBalance();
    }
  }, [isSignedIn, evmAddress]);

  const fetchBalance = async () => {
    if (!evmAddress) return;

    setLoading(true);
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(),
      });

      const balanceResult = await client.readContract({
        address: USDC_ADDRESS,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [evmAddress as `0x${string}`],
      });

      const formattedBalance = parseFloat(formatUnits(balanceResult, USDC_DECIMALS));
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!evmAddress) return;

    try {
      await navigator.clipboard.writeText(evmAddress);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const handleRefreshClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fetchBalance();
  };

  const handleLogoutClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    signOut();
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="relative" ref={walletRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "sketchy-border bg-white px-3 py-1.5 flex items-center gap-2 font-heading text-sm font-bold transition-all",
          "hover:shadow-[6px_6px_0px_0px_currentColor]",
          isExpanded && "shadow-[6px_6px_0px_0px_currentColor]"
        )}
      >
        <Wallet className="w-4 h-4" />
        <span>
          {balance !== null ? `$${balance.toFixed(2)}` : '...'}
        </span>
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50">
          <div className="sketchy-box p-4 space-y-4 bg-white">
            {evmAddress && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium font-body">
                  Address
                </span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="w-full flex items-center justify-between gap-2 p-2 sketchy-border-sm bg-background hover:bg-accent/20 transition-colors font-mono text-xs"
                >
                  <span className="truncate">{truncateAddress(evmAddress)}</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-medium font-body">
                Network
              </span>
              <div className="p-2 sketchy-border-sm bg-background">
                <span className="text-sm font-medium font-body">Base Network</span>
                <div className="text-xs text-muted-foreground mt-1 font-body">USDC on Base</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRefreshClick}
                disabled={loading}
                className="flex-1 sketchy-button text-sm py-1.5 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4 inline mr-1", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={handleLogoutClick}
                className="flex-1 sketchy-button text-sm py-1.5"
              >
                <LogOut className="w-4 h-4 inline mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

