/**
 * Number formatting utilities
 */

/**
 * Format a number in compact notation (e.g., 1.2K, 3.5M, 1.2B)
 *
 * @param value The number to format
 * @param maximumFractionDigits Max decimal places (default: 1)
 * @returns Formatted string (e.g., "854K", "1.2M", "3.5B")
 */
export function formatCompact(
  value: number | bigint,
  maximumFractionDigits: number = 1
): string {
  const num = typeof value === "bigint" ? Number(value) : value;

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits,
  }).format(num);
}

/**
 * Format a number with commas (e.g., 1,234,567)
 *
 * @param value The number to format
 * @returns Formatted string with commas
 */
export function formatWithCommas(value: number | bigint): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format a token amount from base units to human-readable compact form
 *
 * @param baseUnits The amount in base units (e.g., lamports)
 * @param decimals The token's decimal places (default: 6)
 * @returns Formatted string (e.g., "854K", "1.2M")
 */
export function formatTokenAmountCompact(
  baseUnits: bigint,
  decimals: number = 6
): string {
  const divisor = BigInt(Math.pow(10, decimals));
  const tokens = Number(baseUnits) / Number(divisor);
  return formatCompact(tokens);
}

/**
 * Format USD currency
 *
 * @param cents Amount in cents
 * @returns Formatted string (e.g., "$1.99")
 */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
