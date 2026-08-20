import { Horizon } from "@stellar/stellar-sdk";

const HORIZON_URL =
  (import.meta.env.VITE_HORIZON_URL as string) ??
  "https://horizon-testnet.stellar.org";

// Stellar testnet USDC issuer
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
// yXLM issuer (apay)
const YXLM_ISSUER = "GARDNV3Q7YGT4AKRSQOHHBMYHAXQGJEOOMYK7LILLXF5Y3Y6OVMLWDNG";

export interface TokenInfo {
  code: string;
  issuer: string;
  icon: string;
  decimals: number;
}

export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  native: { code: "XLM", issuer: "", icon: "\u2b50", decimals: 7 },
  USDC:   { code: "USDC", issuer: USDC_ISSUER, icon: "\ud83d\udcb5", decimals: 7 },
  yXLM:   { code: "yXLM", issuer: YXLM_ISSUER, icon: "\ud83c\udf19", decimals: 7 },
};

interface PriceCache {
  price: number;
  fetchedAt: number;
}

const CACHE_TTL = 60_000; // 60 seconds
const priceCache = new Map<string, PriceCache>();

/**
 * Fetch the USD price of a token from the Stellar DEX orderbook.
 * Results are cached for 60 seconds to avoid rate-limiting.
 */
export async function getUSDPrice(tokenCode: string): Promise<number> {
  const cached = priceCache.get(tokenCode);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.price;
  }

  // XLM/USD on testnet — fall back to a rough estimate if the orderbook is empty
  if (tokenCode === "XLM" || tokenCode === "native") {
    try {
      const server = new Horizon.Server(HORIZON_URL);
      const orderbook = await server
        .orderbook(
          { type: "native" },
          { code: "USD", issuer: USDC_ISSUER }
        )
        .limit(1)
        .call();

      const mid =
        orderbook.bids.length > 0 && orderbook.asks.length > 0
          ? (parseFloat(orderbook.bids[0].price) +
              parseFloat(orderbook.asks[0].price)) /
            2
          : 0.12; // fallback estimate

      priceCache.set(tokenCode, { price: mid, fetchedAt: Date.now() });
      return mid;
    } catch {
      return 0.12;
    }
  }

  // For USDC, pegged to $1
  if (tokenCode === "USDC") {
    priceCache.set(tokenCode, { price: 1, fetchedAt: Date.now() });
    return 1;
  }

  // For yXLM, try XLM/USD * 1:1 parity
  if (tokenCode === "yXLM") {
    const xlmPrice = await getUSDPrice("XLM");
    priceCache.set(tokenCode, { price: xlmPrice, fetchedAt: Date.now() });
    return xlmPrice;
  }

  return 0;
}

/**
 * Convert an amount in the given token to its USD equivalent.
 */
export async function toUSD(amount: number, tokenCode: string): Promise<number> {
  const price = await getUSDPrice(tokenCode);
  return amount * price;
}

/**
 * Format a USD value for display.
 */
export function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Convert a price from one token to another using USD as the bridge.
 */
export async function convertToken(
  amount: number,
  fromToken: string,
  toToken: string
): Promise<number> {
  const usdValue = await toUSD(amount, fromToken);
  const toPrice = await getUSDPrice(toToken);
  return toPrice > 0 ? usdValue / toPrice : 0;
}
