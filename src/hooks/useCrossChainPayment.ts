import { useState, useCallback } from "react";
import { useEVMWallet } from "./useEVMWallet";
import {
  getSupportedChains,
  burnUSDC,
  pollAttestation,
  generateTransferId,
  type SupportedChain,
  type CCTPTransfer,
} from "../services/cctp";
import {
  addTransfer,
  updateTransfer,
} from "../services/cctpStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CrossChainStep =
  | "idle"
  | "select"
  | "confirm"
  | "burning"
  | "attesting"
  | "minting"
  | "purchasing"
  | "done"
  | "error";

export interface CrossChainPaymentState {
  step: CrossChainStep;
  selectedChain: SupportedChain | null;
  error: string | null;
  attestationProgress: number;
  transferId: string | null;
  /** The EVM wallet state (address, chainId, connect, etc.) */
  evmWallet: ReturnType<typeof useEVMWallet>;
  /** Available source chains */
  chains: SupportedChain[];
}

export interface CrossChainPaymentActions {
  selectChain: (chain: SupportedChain) => void;
  /** Start the full CCTP flow: burn → attest → mint → purchase. */
  startPayment: (params: {
    amount: string;
    sampleId: number;
    stellarBuyer: string;
    tokenAddress: string;
  }) => Promise<string>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrossChainPayment(): CrossChainPaymentState & CrossChainPaymentActions {
  const evmWallet = useEVMWallet();
  const chains = getSupportedChains();

  const [step, setStep] = useState<CrossChainStep>("idle");
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(
    chains.length > 0 ? chains[0] : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [attestationProgress, setAttestationProgress] = useState(0);
  const [transferId, setTransferId] = useState<string | null>(null);

  const selectChain = useCallback((chain: SupportedChain) => {
    setSelectedChain(chain);
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setAttestationProgress(0);
    setTransferId(null);
  }, []);

  const startPayment = useCallback(async (params: {
    amount: string;
    sampleId: number;
    stellarBuyer: string;
    tokenAddress: string;
  }): Promise<string> => {
    if (!selectedChain || !evmWallet.address) {
      throw new Error("Connect EVM wallet and select a chain first");
    }

    setError(null);
    const id = generateTransferId();
    setTransferId(id);

    const transfer: CCTPTransfer = {
      id,
      sourceChainId: selectedChain.id,
      amount: params.amount,
      amountRaw: String(Math.round(parseFloat(params.amount) * 1_000_000)),
      status: "burning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sampleId: params.sampleId,
      buyerAddress: evmWallet.address,
    };
    addTransfer(transfer);

    try {
      // Step 1: Burn USDC on source chain
      setStep("burning");
      const { txHash, messageHash, messageBytes } = await burnUSDC({
        chainId: selectedChain.id,
        amount: params.amount,
        stellarRecipient: params.stellarBuyer,
      });
      updateTransfer(id, {
        sourceTxHash: txHash,
        messageHash,
        messageBytes,
        status: "attesting",
      });

      // Step 2: Poll for Circle attestation
      setStep("attesting");
      const attestation = await pollAttestation(
        messageHash,
        60,
        (attempt) => setAttestationProgress(Math.min(attempt / 60, 0.95)),
      );
      setAttestationProgress(1);
      updateTransfer(id, { attestation, status: "minting" });

      // Step 3: Mint on Stellar via CCTP Message Transmitter
      setStep("minting");
      // TODO: Call Stellar CCTP receiveMessage with messageBytes + attestation
      // For now, this is a placeholder until the Stellar-side CCTP contract is integrated
      await new Promise(r => setTimeout(r, 2000));
      updateTransfer(id, { status: "purchasing" });

      // Step 4: Purchase the license with minted USDC
      setStep("purchasing");
      // TODO: Build and submit purchase_license tx with the USDC token address
      // This will use purchaseSample from contracts/crate.ts once Stellar minting is live
      await new Promise(r => setTimeout(r, 1500));
      updateTransfer(id, { status: "completed" });

      setStep("done");
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cross-chain payment failed";
      setError(msg);
      updateTransfer(id, { status: "failed", error: msg });
      setStep("error");
      throw new Error(msg);
    }
  }, [selectedChain, evmWallet]);

  return {
    step,
    selectedChain,
    error,
    attestationProgress,
    transferId,
    evmWallet,
    chains,
    selectChain,
    startPayment,
    reset,
  };
}
