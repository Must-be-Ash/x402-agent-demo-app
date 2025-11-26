import { useCurrentUser, useIsSignedIn, useSignOut } from '@coinbase/cdp-hooks';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, Copy, Check, LogOut } from 'lucide-react';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import {
  Component,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardHeader,
  ExpandableContent,
  ExpandableTrigger,
  useExpandable,
} from '@/components/ui/expandable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_DECIMALS = 6;

interface DesktopWalletProps {
  renderWalletContent: (isExpanded: boolean) => ReactNode;
}

function DesktopWallet({ renderWalletContent }: DesktopWalletProps) {
  return (
    <div className="hidden sm:block fixed top-4 right-4 z-50">
      <Component expandDirection="both" expandBehavior="replace" initialDelay={0.1}>
        {({ isExpanded }) => (
          <ExpandableTrigger>
            <ExpandableCard
              className="w-auto"
              collapsedSize={{ width: 220, height: 48 }}
              expandedSize={{ width: 420, height: undefined }}
              hoverToExpand={false}
            >
              {renderWalletContent(isExpanded)}
            </ExpandableCard>
          </ExpandableTrigger>
        )}
      </Component>
    </div>
  );
}

interface MobileWalletContentProps {
  balance: number | null;
  copied: boolean;
  evmAddress?: string;
  loading: boolean;
  truncateAddress: (address: string) => string;
  onCopyAddress: (e: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onRefresh: (e: MouseEvent<HTMLButtonElement>) => void;
  onLogout: (e: MouseEvent<HTMLButtonElement>) => void;
}

function MobileWalletContent({
  balance,
  copied,
  evmAddress,
  loading,
  truncateAddress,
  onCopyAddress,
  onRefresh,
  onLogout,
}: MobileWalletContentProps) {
  const { isExpanded } = useExpandable();

  return (
    <div className="flex flex-col-reverse">
      <ExpandableContent preset="blur-md" stagger={true} staggerChildren={0.1}>
        <ExpandableCardContent className="space-y-4">
          {evmAddress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Address
                </span>
              </div>
              <button
                type="button"
                onClick={onCopyAddress}
                data-no-toggle="true"
                className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span className="font-mono text-xs sm:text-sm text-foreground truncate">
                  {truncateAddress(evmAddress)}
                </span>
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
              Network
            </span>
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium text-foreground">
                Base Network
              </span>
              <div className="text-xs text-muted-foreground mt-1">
                USDC on Base
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              data-no-toggle="true"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </ExpandableCardContent>
      </ExpandableContent>

      <ExpandableCardHeader className={`${!isExpanded ? 'p-2.5' : 'p-3 sm:p-4'}`}>
        <div className="flex items-center justify-between w-full">
          {!isExpanded ? (
            <div className="flex items-center gap-2 w-full">
              <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-base sm:text-lg font-bold text-foreground truncate">
                {balance !== null ? (
                  `$${balance.toFixed(2)}`
                ) : (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                    Wallet Balance
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {balance !== null ? (
                      `$${balance.toFixed(2)}`
                    ) : (
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    )}
                  </span>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      data-no-toggle="true"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh Balance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </ExpandableCardHeader>
    </div>
  );
}

interface MobileWalletProps extends MobileWalletContentProps {}

function MobileWallet(props: MobileWalletProps) {
  return (
    <div
      className="block sm:hidden fixed top-4 right-4 z-50"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      <Component expandDirection="both" expandBehavior="replace" initialDelay={0.1}>
        {() => (
          <ExpandableTrigger>
            <div className="flex flex-col-reverse items-end" style={{ transformOrigin: 'top right' }}>
              <ExpandableCard
                className="w-auto"
                collapsedSize={{ width: 150, height: 44 }}
                expandedSize={{ width: 360, height: undefined }}
                hoverToExpand={false}
              >
                <MobileWalletContent {...props} />
              </ExpandableCard>
            </div>
          </ExpandableTrigger>
        )}
      </Component>
    </div>
  );
}

export function ExpandableWallet() {
  const { isSignedIn } = useIsSignedIn();
  const { currentUser } = useCurrentUser();
  const { signOut } = useSignOut();

  // Use EOA address directly (not smart account)
  const evmAddress = currentUser?.evmAccounts?.[0];
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Shared wallet content for desktop
  const renderWalletContent = (isExpanded: boolean) => (
    <>
      <ExpandableCardHeader className={`${!isExpanded ? 'p-2.5' : 'p-3 sm:p-4'}`}>
        <div className="flex items-center justify-between w-full">
          {!isExpanded ? (
            // Minimal collapsed state - just balance
            <div className="flex items-center gap-2 w-full">
              <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-base sm:text-lg font-bold text-foreground truncate">
                {balance !== null ? (
                  `$${balance.toFixed(2)}`
                ) : (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
              </span>
            </div>
          ) : (
            // Expanded header
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                    Wallet Balance
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {balance !== null ? (
                      `$${balance.toFixed(2)}`
                    ) : (
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    )}
                  </span>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      data-no-toggle="true"
                      onClick={handleRefreshClick}
                      disabled={loading}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh Balance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </ExpandableCardHeader>

      <ExpandableContent preset="blur-md" stagger={true} staggerChildren={0.1}>
        <ExpandableCardContent className="space-y-4">
          {evmAddress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Address
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAddress}
                data-no-toggle="true"
                className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span className="font-mono text-xs sm:text-sm text-foreground truncate">
                  {truncateAddress(evmAddress)}
                </span>
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
              Network
            </span>
            <div className="p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-medium text-foreground">
                Base Network
              </span>
              <div className="text-xs text-muted-foreground mt-1">
                USDC on Base
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              data-no-toggle="true"
              onClick={handleLogoutClick}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </ExpandableCardContent>
      </ExpandableContent>
    </>
  );

  return (
    <>
      <DesktopWallet renderWalletContent={renderWalletContent} />
      <MobileWallet
        balance={balance}
        copied={copied}
        evmAddress={evmAddress ?? undefined}
        loading={loading}
        truncateAddress={truncateAddress}
        onCopyAddress={handleCopyAddress}
        onRefresh={handleRefreshClick}
        onLogout={handleLogoutClick}
      />
    </>
  );
}
