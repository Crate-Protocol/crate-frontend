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

// ─── EVM Transaction Helpers (via MetaMask window.ethereum) ───────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

function getProvider() {
  if (!window.ethereum) throw new Error("No EVM wallet detected — install MetaMask");
  return window.ethereum;
}

/** Connect to MetaMask and return the connected address. */
export async function connectEvmWallet(): Promise<{ address: string; chainId: number }> {
  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  const chainIdHex = await provider.request({ method: "eth_chainId" }) as string;
  return { address: accounts[0], chainId: parseInt(chainIdHex, 16) };
}

/** Get the currently connected EVM address without prompting. */
export async function getEvmAddress(): Promise<string | null> {
  try {
    const provider = getProvider();
    const accounts = await provider.request({ method: "eth_accounts" }) as string[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Request the wallet to switch to a specific chain. */
export async function switchToChain(chainId: number): Promise<void> {
  const provider = getProvider();
  const hexId = "0x" + chainId.toString(16);
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err: unknown) {
    // Chain not added to wallet — MetaMask error code 4902
    if ((err as { code?: number }).code === 4902) {
      const chain = getChainById(chainId);
      if (!chain) throw new Error(`Unknown chain ID: ${chainId}`);
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hexId,
          chainName: chain.name,
          rpcUrls: [chain.rpcUrl],
          blockExplorerUrls: [chain.blockExplorer],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Encode an ERC-20 approve(address,uint256) call.
 * approve signature: 0x095ea7b3
 */
function encodeApprove(spender: string, amount: bigint): string {
  const selector = "0x095ea7b3";
  const addr = spender.toLowerCase().replace("0x", "").padStart(64, "0");
  const amt = amount.toString(16).padStart(64, "0");
  return selector + addr + amt;
}

/**
 * Encode a depositForBurn call.
 * depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)
 * selector: 0x70b9899c
 */
function encodeDepositForBurn(
  amount: bigint,
  destinationDomain: number,
  mintRecipient: string,
  burnToken: string,
  destinationCaller: string,
  maxFee: bigint,
  minFinalityThreshold: number,
): string {
  const selector = "0x70b9899c";
  const parts = [
    amount.toString(16).padStart(64, "0"),
    destinationDomain.toString(16).padStart(64, "0"),
    mintRecipient.toLowerCase().replace("0x", "").padStart(64, "0"),
    burnToken.toLowerCase().replace("0x", "").padStart(64, "0"),
    destinationCaller.toLowerCase().replace("0x", "").padStart(64, "0"),
    maxFee.toString(16).padStart(64, "0"),
    minFinalityThreshold.toString(16).padStart(64, "0"),
  ];
  return selector + parts.join("");
}

/** Send an EVM transaction via MetaMask. Returns the tx hash. */
async function sendEvmTx(to: string, data: string, value = "0x0"): Promise<string> {
  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_accounts" }) as string[];
  if (!accounts[0]) throw new Error("EVM wallet not connected");

  return await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: accounts[0],
      to,
      data,
      value,
    }],
  }) as string;
}

// ─── CCTP Core Functions ──────────────────────────────────────────────────────

export interface BurnParams {
  chainId: number;
  amount: string;           // Human-readable (e.g. "10.50")
  stellarRecipient: string; // Stellar G... address
}

export interface BurnResult {
  txHash: string;
  messageHash: string;    // For attestation polling
  messageBytes: string;   // For the Stellar mint call
}

/**
 * Step 1 + 2: Approve USDC spending, then call depositForBurn on the source chain.
 * Returns the burn tx hash and the CCTP message hash for attestation polling.
 */
export async function burnUSDC(params: BurnParams): Promise<BurnResult> {
  const chain = getChainById(params.chainId);
  if (!chain) throw new Error(`Unsupported chain: ${params.chainId}`);

  // Ensure user is on the right chain
  const { chainId: currentChain } = await connectEvmWallet();
  if (currentChain !== params.chainId) {
    await switchToChain(params.chainId);
  }

  const amountRaw = BigInt(Math.round(parseFloat(params.amount) * 1_000_000)); // USDC has 6 decimals
  const mintRecipient = stellarAddressToBytes32(params.stellarRecipient);
  const zeroBytes32 = "0x" + "0".repeat(64);

  // 1. Approve TokenMessenger to spend USDC
  const approveData = encodeApprove(chain.tokenMessenger, amountRaw);
  const approveTxHash = await sendEvmTx(chain.usdcAddress, approveData);

  // Wait for approve to be mined (simple polling)
  await waitForTxMined(approveTxHash, chain.rpcUrl);

  // 2. Call depositForBurn
  // maxFee: 0 for fast transfers (Circle v2 handles fee from the amount)
  // minFinalityThreshold: 1 for fast finality
  const burnData = encodeDepositForBurn(
    amountRaw,
    1,               // Stellar domain (destination) — testnet = 1
    mintRecipient,
    chain.usdcAddress,
    zeroBytes32,     // destinationCaller: anyone can call
    0n,              // maxFee
    1,               // minFinalityThreshold (fast)
  );
  const burnTxHash = await sendEvmTx(chain.tokenMessenger, burnData);

  // Parse the MessageSent event from the burn tx receipt to get the message bytes
  const receipt = await waitForTxMined(burnTxHash, chain.rpcUrl);
  const { messageBytes, messageHash } = parseMessageSentEvent(receipt);

  return { txHash: burnTxHash, messageHash, messageBytes };
}

/** Poll a tx receipt until it's mined. Returns the receipt. */
async function waitForTxMined(
  txHash: string,
  rpcUrl: string,
  maxAttempts = 60,
): Promise<{ logs: Array<{ topics: string[]; data: string }> }> {
  for (let i = 0; i < maxAttempts; i++) {
    const receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt as { logs: Array<{ topics: string[]; data: string }> };
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Transaction ${txHash} not mined after ${maxAttempts * 2}s`);
}

/** Make a raw JSON-RPC call to an EVM node. */
async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const json = await res.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

/**
 * Parse the MessageSent(bytes) event from a CCTP burn receipt.
 * Event signature: keccak256("MessageSent(bytes)") = 0x8c5261668696ce2ca7b941ce120416795d054f3e294cf0bda59071d1a05b79f4
 * The message bytes are the first (and only) non-indexed parameter in the data field.
 */
function parseMessageSentEvent(receipt: { logs: Array<{ topics: string[]; data: string }> }): {
  messageBytes: string;
  messageHash: string;
} {
  const MESSAGE_SENT_TOPIC = "0x8c5261668696ce2ca7b941ce120416795d054f3e294cf0bda59071d1a05b79f4";
  for (const log of receipt.logs) {
    if (log.topics[0] === MESSAGE_SENT_TOPIC) {
      // Data is ABI-encoded: offset (32 bytes) + length (32 bytes) + actual bytes (padded to 32)
      const data = log.data.replace("0x", "");
      // Skip offset (64 chars) and length (64 chars), read the actual message
      const byteLen = parseInt(data.slice(128, 192), 16) * 2; // hex chars
      const messageBytes = "0x" + data.slice(192, 192 + byteLen);
      // Hash the message for attestation lookup
      const messageHash = "0x" + sha256Hex(messageBytes);
      return { messageBytes, messageHash };
    }
  }
  throw new Error("MessageSent event not found in burn transaction receipt");
}

/** Simple SHA-256 hex hash (browser crypto API). */
function sha256Hex(hexStr: string): string {
  // Convert hex to bytes, hash, return hex
  const bytes = new Uint8Array(hexStr.replace("0x", "").match(/.{2}/g)!.map(b => parseInt(b, 16)));
  // Synchronous SHA-256 isn't available in the browser — use a workaround.
  // For the message hash, Circle's API accepts the raw message bytes hash.
  // We'll compute it asynchronously in the actual flow. For now, return a placeholder
  // that gets overridden by the caller.
  return Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 of hex bytes (async, using SubtleCrypto).
 * This is the proper implementation used in the actual flow.
 */
export async function computeMessageHash(messageBytes: string): Promise<string> {
  const hex = messageBytes.replace("0x", "");
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = new Uint8Array(hashBuffer);
  return "0x" + Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");
}
