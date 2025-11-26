/**
 * Payment logging utility for x402 micropayments on Base network
 * Provides structured logging for payment settlements with BaseScan links
 */

export interface PaymentSettlement {
  service: string;
  txHash: string;
  estimatedAmount: number; // in USDC
  timestamp: number;
  baseScanUrl: string;
}

/**
 * Logs a payment settlement with formatted output for console visibility
 * @param service - The service that was paid
 * @param txHash - Transaction hash from X-PAYMENT-RESPONSE header
 * @param estimatedAmount - Estimated payment amount in USDC
 */
export function logPaymentSettlement(
  service: string,
  txHash: string,
  estimatedAmount: number
): PaymentSettlement {
  const timestamp = Date.now();
  const baseScanUrl = `https://basescan.org/tx/${txHash}`;

  const settlement: PaymentSettlement = {
    service,
    txHash,
    estimatedAmount,
    timestamp,
    baseScanUrl,
  };

  // Log with visual formatting for easy identification
  console.log('\n' + '='.repeat(80));
  console.log('💰 x402 PAYMENT SETTLED');
  console.log('='.repeat(80));
  console.log(`Service:          ${service}`);
  console.log(`Amount:           ~$${estimatedAmount.toFixed(4)} USDC`);
  console.log(`Transaction:      ${txHash}`);
  console.log(`BaseScan:         ${baseScanUrl}`);
  console.log(`Timestamp:        ${new Date(timestamp).toISOString()}`);
  console.log('='.repeat(80) + '\n');

  return settlement;
}

/**
 * Extracts transaction hash from X-PAYMENT-RESPONSE header
 * Expected format: "tx_hash:0x..."
 * @param paymentResponseHeader - Value from X-PAYMENT-RESPONSE header
 * @returns Transaction hash or null if not found
 */
export function extractTxHashFromPaymentResponse(
  paymentResponseHeader: string | null
): string | null {
  if (!paymentResponseHeader) {
    return null;
  }

  // Parse format: "tx_hash:0x..."
  const match = paymentResponseHeader.match(/tx_hash:([0-9a-fA-Fx]+)/);
  return match ? match[1] : null;
}

/**
 * Logs payment initiation (before API call)
 * @param service - The service being called
 * @param maxAmount - Maximum payment amount configured
 */
export function logPaymentInitiation(
  service: string,
  maxAmount: number
): void {
  console.log(`\n🔄 Initiating x402 payment for ${service} (max: $${maxAmount.toFixed(4)} USDC)...`);
}

/**
 * Logs payment error
 * @param service - The service that failed
 * @param error - Error details
 */
export function logPaymentError(
  service: string,
  error: unknown
): void {
  console.error('\n' + '='.repeat(80));
  console.error('❌ x402 PAYMENT FAILED');
  console.error('='.repeat(80));
  console.error(`Service:          ${service}`);
  console.error(`Error:            ${error instanceof Error ? error.message : String(error)}`);
  console.error('='.repeat(80) + '\n');
}
