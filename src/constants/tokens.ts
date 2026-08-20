/**
 * Shared constants for Stellar token addresses and configuration.
 * Centralizes asset issuers so they aren't duplicated across files.
 */

// Well-known asset issuers on Stellar
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const YXLM_ISSUER = "GARDNV3Q7YGT4AKRSQOHHBMYHAXQGJEOOMYK7LILLXF5Y3Y6OVMLWDNG";

// XLM has no issuer (native asset)
export const XLM_ASSET = "native";

// Platform fee split
export const PRODUCER_SHARE = 0.9;
export const PLATFORM_FEE = 0.1;

// Stellar stroops conversion
export const STROOPS_PER_UNIT = 1e7;

// Supported payment tokens
export const PAYMENT_TOKENS = ["XLM", "USDC", "yXLM"] as const;
export type PaymentToken = (typeof PAYMENT_TOKENS)[number];

// Token decimals on Stellar
export const TOKEN_DECIMALS = 7;
