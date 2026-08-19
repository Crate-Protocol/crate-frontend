/**
 * Circle CCTP v2 — Cross-Chain Transfer Protocol service.
 *
 * Burns USDC on a source EVM chain and mints native USDC on Stellar via
 * Circle's burn-and-mint primitive. No slippage, no liquidity pools.
 *
 * Flow:
 *   1. User approves USDC spending on the source chain (MetaMask)
 *   2. Call depositForBurn on the TokenMessenger contract → burns USDC
 *   3. Poll Circle's Attestation API until the burn is signed
 *   4. Call receiveMessage on Stellar's Message Transmitter → mints USDC
 *   5. Use freshly minted USDC to call purchase_license on Crate
 */

// ─── Chain Configuration ──────────────────────────────────────────────────────

export interface SupportedChain {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  usdcAddress: string;
  tokenMessenger: string;
  blockExplorer: string;
  domain: number; // CCTP domain ID
}

const CCTP_API_URL = import.meta.env.VITE_CCTP_API_URL as string ?? "https://iris-api-sandbox.circle.com";
const TOKEN_MESSENGER_DEFAULT = import.meta.env.VITE_CCTP_TOKEN_MESSENGER as string ?? "";

const CHAIN_MAP: Record<number, SupportedChain> = {
  // Ethereum Sepolia testnet
  11155111: {
    id: 11155111,
    name: "Ethereum Sepolia",
    shortName: "Ethereum",
    rpcUrl: "https://rpc.ankr.com/eth_sepolia",
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    tokenMessenger: TOKEN_MESSENGER_DEFAULT || "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://sepolia.etherscan.io",
    domain: 0,
  },
  // Base Sepolia testnet
  84532: {
    id: 84532,
    name: "Base Sepolia",
    shortName: "Base",
    rpcUrl: "https://sepolia.base.org",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://sepolia.basescan.org",
    domain: 6,
  },
  // Avalanche Fuji testnet
  43113: {
    id: 43113,
    name: "Avalanche Fuji",
    shortName: "Avalanche",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://testnet.snowtrace.io",
    domain: 1,
  },
  // Arbitrum Sepolia testnet
  421614: {
    id: 421614,
    name: "Arbitrum Sepolia",
    shortName: "Arbitrum",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://sepolia.arbiscan.io",
    domain: 3,
  },
  // Polygon Amoy testnet
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    shortName: "Polygon",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://amoy.polygonscan.com",
    domain: 7,
  },
  // Linea Sepolia testnet
  59141: {
    id: 59141,
    name: "Linea Sepolia",
    shortName: "Linea",
    rpcUrl: "https://rpc.sepolia.linea.build",
    usdcAddress: "0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068",
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3b938142a750bD122",
    blockExplorer: "https://sepolia.lineascan.build",
    domain: 11,
  },
};

export function getSupportedChains(): SupportedChain[] {
  const configured = (import.meta.env.VITE_CCTP_SUPPORTED_CHAINS as string ?? "")
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  if (configured.length === 0) return Object.values(CHAIN_MAP);
  return configured.map(id => CHAIN_MAP[id]).filter(Boolean);
}

export function getChainById(chainId: number): SupportedChain | undefined {
  return CHAIN_MAP[chainId];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CCTPTransferStatus =
  | "approving"     // Waiting for USDC approve tx
  | "burning"       // depositForBurn submitted
  | "attesting"     // Polling Circle for attestation
  | "minting"       // Calling receiveMessage on Stellar
  | "purchasing"    // Calling purchase_license with minted USDC
  | "completed"     // Done
  | "failed";       // Error at any step

export interface CCTPTransfer {
  id: string;
  sourceChainId: number;
  amount: string;          // Human-readable USDC amount (e.g. "10.50")
  amountRaw: string;       // Raw value with 6 decimals (e.g. "10500000")
  sourceTxHash?: string;
  attestationId?: string;
  attestation?: string;
  messageBytes?: string;
  stellarTxHash?: string;
  purchaseTxHash?: string;
  status: CCTPTransferStatus;
  error?: string;
  createdAt: number;
  updatedAt: number;
  sampleId?: number;
  buyerAddress?: string;
}

// ─── ABI fragments (minimal, just the functions we need) ──────────────────────

export const TOKEN_MESSENGER_ABI = [
  // function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold)
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
  },
  // function approve(address spender, uint256 amount) — on USDC token
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const USDC_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// ─── Circle Attestation API ───────────────────────────────────────────────────

export async function fetchAttestation(
  messageHash: string,
): Promise<{ status: string; attestation: string | null }> {
  const res = await fetch(`${CCTP_API_URL}/attestations/${messageHash}`);
  if (!res.ok) throw new Error(`Attestation API error: ${res.status}`);
  return res.json() as Promise<{ status: string; attestation: string | null }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Stellar address (G...) to a bytes32 hex string for CCTP. */
export function stellarAddressToBytes32(stellarAddr: string): string {
  // Stellar addresses are base32-encoded. Decode to raw bytes, then pad to 32.
  const raw = decodeStellarAddress(stellarAddr);
  const hex = Array.from(raw).map(b => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hex.padStart(64, "0");
}

/** Decode a Stellar address (G...) to raw bytes. */
function decodeStellarAddress(addr: string): Uint8Array {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of addr) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/** Generate a unique ID for tracking a CCTP transfer. */
export function generateTransferId(): string {
  return `cctp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Poll attestation with exponential backoff. Returns the attestation string. */
export async function pollAttestation(
  messageHash: string,
  maxAttempts = 60,
  onStatus?: (attempt: number, status: string) => void,
): Promise<string> {
  let delay = 3000; // Start at 3s
  for (let i = 0; i < maxAttempts; i++) {
    const { status, attestation } = await fetchAttestation(messageHash);
    onStatus?.(i + 1, status);
    if (status === "complete" && attestation) return attestation;
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.3, 15000); // Cap at 15s
  }
  throw new Error("Attestation timed out — try again later");
}
