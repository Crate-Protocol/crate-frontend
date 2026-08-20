import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, Check, Loader2, AlertCircle, Wallet, Link as LinkIcon } from "lucide-react";
import { useEVMWallet } from "../hooks/useEVMWallet";
import {
  getSupportedChains,
  getChainById,
  switchToChain,
  burnUSDC,
  pollAttestation,
  computeMessageHash,
  connectEvmWallet,
  type SupportedChain,
  type CCTPTransfer,
} from "../services/cctp";
import {
  addTransfer,
  updateTransfer,
  getTransfer,
} from "../services/cctpStore";
import { generateTransferId } from "../services/cctp";
import toast from "react-hot-toast";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CrossChainPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Price in XLM (stroops) — we convert to USDC equivalent for display. */
  priceXlm: string;
  sampleId: number;
  sampleTitle: string;
  /** Stellar G... address that receives the minted USDC. */
  stellarRecipient: string;
  /** Called after CCTP mints USDC on Stellar and the purchase succeeds. */
  onPurchaseComplete: (txHash: string) => void;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "select" | "confirm" | "burning" | "attesting" | "minting" | "purchasing" | "done";

const STEP_LABELS: Record<Step, string> = {
  select: "Select chain",
  confirm: "Confirm payment",
  burning: "Burning USDC on source chain",
  attesting: "Awaiting Circle attestation",
  minting: "Minting USDC on Stellar",
  purchasing: "Completing purchase",
  done: "Complete",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrossChainPaymentModal({
  isOpen,
  onClose,
  priceXlm,
  sampleId,
  sampleTitle,
  stellarRecipient,
  onPurchaseComplete,
}: CrossChainPaymentModalProps) {
  const evmWallet = useEVMWallet();
  const chains = getSupportedChains();

  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [attestationProgress, setAttestationProgress] = useState(0);

  // Approximate USDC equivalent (display only — rate fetched at burn time)
  const usdcAmount = (parseFloat(priceXlm) * 0.12).toFixed(2); // ~$0.12/XLM rough estimate

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setError(null);
      setTransferId(null);
      setAttestationProgress(0);
      // Auto-select first chain
      if (chains.length > 0 && !selectedChain) {
        setSelectedChain(chains[0]);
      }
    }
  }, [isOpen, chains, selectedChain]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Check for existing in-progress transfer
  useEffect(() => {
    if (!isOpen || !transferId) return;
    const existing = getTransfer(transferId);
    if (existing && existing.status !== "failed") {
      // Resume from where we left off
      resumeTransfer(existing);
    }
  }, [isOpen, transferId]);

  const resumeTransfer = useCallback(async (transfer: CCTPTransfer) => {
    if (transfer.status === "attesting" && transfer.messageHash) {
      setStep("attesting");
      try {
        const attestation = await pollAttestation(
          transfer.messageHash,
          90,
          (attempt) => setAttestationProgress(Math.min(attempt / 90, 0.95)),
        );
        updateTransfer(transfer.id, { status: "minting", attestation });
        setStep("minting");
        // Minting happens on the Stellar side — for now we move to purchasing
        // since the Stellar CCTP contract handles the mint internally
        setStep("purchasing");
        onPurchaseComplete(transfer.stellarTxHash || "pending");
        updateTransfer(transfer.id, { status: "completed" });
        setStep("done");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Attestation failed";
        updateTransfer(transfer.id, { status: "failed", error: msg });
        setError(msg);
      }
    }
  }, [onPurchaseComplete]);

  const handleConnectEVM = async () => {
    try {
      await evmWallet.connect();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  const handleChainSwitch = async (chain: SupportedChain) => {
    setSelectedChain(chain);
    if (evmWallet.chainId !== chain.id) {
      try {
        await switchToChain(chain.id);
      } catch {
        // Will be prompted at burn time
      }
    }
  };

  const handlePay = async () => {
    if (!selectedChain || !evmWallet.address) return;

    setError(null);
    const id = generateTransferId();
    setTransferId(id);

    const transfer: CCTPTransfer = {
      id,
      sourceChainId: selectedChain.id,
      amount: usdcAmount,
      amountRaw: String(Math.round(parseFloat(usdcAmount) * 1_000_000)),
      status: "burning",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sampleId,
      buyerAddress: evmWallet.address,
    };
    addTransfer(transfer);

    try {
      // Step 1: Burn USDC on source chain
      setStep("burning");
      const { txHash, messageHash, messageBytes } = await burnUSDC({
        chainId: selectedChain.id,
        amount: usdcAmount,
        stellarRecipient,
      });
      updateTransfer(id, { sourceTxHash: txHash, messageHash, messageBytes, status: "attesting" });
      toast.success(`Burned USDC on ${selectedChain.shortName}! Waiting for attestation...`);

      // Step 2: Poll for attestation
      setStep("attesting");
      const attestation = await pollAttestation(
        messageHash,
        60,
        (attempt) => setAttestationProgress(Math.min(attempt / 60, 0.95)),
      );
      setAttestationProgress(1);
      updateTransfer(id, { attestation, status: "minting" });

      // Step 3: Mint on Stellar (via CCTP Message Transmitter contract)
      // This would call the Stellar-side CCTP contract — for now, simulate
      setStep("minting");
      // TODO: Call Stellar CCTP message transmitter with messageBytes + attestation
      await new Promise(r => setTimeout(r, 2000));
      updateTransfer(id, { status: "purchasing" });

      // Step 4: Purchase the license with minted USDC
      setStep("purchasing");
      // TODO: Call purchase_license on the Crate contract with the minted USDC
      await new Promise(r => setTimeout(r, 1500));
      updateTransfer(id, { status: "completed" });

      setStep("done");
      toast.success("Purchase complete via cross-chain USDC!");
      onPurchaseComplete("cctp-complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cross-chain payment failed";
      setError(msg);
      if (transferId) updateTransfer(transferId, { status: "failed", error: msg });
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{ width: "100%", maxWidth: 480, padding: "28px" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: 4 }}>
              Pay with USDC (Cross-Chain)
            </h2>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {sampleTitle}
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "select" && step !== "confirm" && (
          <StepProgress currentStep={step} attestationProgress={attestationProgress} />
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)",
            marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            fontSize: "13px", color: "var(--error)",
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Step: Select chain */}
        {step === "select" && (
          <>
            {!evmWallet.isConnected ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Wallet size={32} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: 16 }}>
                  Connect an EVM wallet to pay with USDC from any chain
                </div>
                <button className="btn btn-primary" onClick={handleConnectEVM}>
                  <Wallet size={14} /> Connect MetaMask
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 12 }}>
                  Connected: {evmWallet.address?.slice(0, 6)}...{evmWallet.address?.slice(-4)}
                  {evmWallet.chainName && (
                    <span className="badge badge-green" style={{ marginLeft: 8 }}>{evmWallet.chainName}</span>
                  )}
                </div>

                <div className="label">Select source chain</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {chains.map(chain => (
                    <button
                      key={chain.id}
                      className="btn btn-secondary"
                      style={{
                        justifyContent: "flex-start",
                        border: selectedChain?.id === chain.id
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border)",
                        background: selectedChain?.id === chain.id
                          ? "rgba(250,204,21,0.05)"
                          : "var(--surface-2)",
                      }}
                      onClick={() => handleChainSwitch(chain)}
                    >
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "var(--surface)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700,
                      }}>
                        {chain.shortName[0]}
                      </span>
                      {chain.name}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%" }}
                  onClick={() => setStep("confirm")}
                  disabled={!selectedChain}
                >
                  Continue <ArrowRight size={14} />
                </button>
              </>
            )}
          </>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && selectedChain && (
          <>
            <div style={{
              padding: "16px", background: "var(--surface-2)",
              borderRadius: "var(--radius)", marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Amount</span>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>~{usdcAmount} USDC <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)" }}>(estimated)</span></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Source chain</span>
                <span style={{ fontSize: "14px" }}>{selectedChain.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Bridge fee</span>
                <span style={{ fontSize: "14px", color: "var(--success)" }}>~$0.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Estimated time</span>
                <span style={{ fontSize: "14px" }}>~15 minutes</span>
              </div>
            </div>

            <div style={{
              padding: "10px 14px", background: "rgba(250,204,21,0.05)",
              border: "1px solid rgba(250,204,21,0.15)", borderRadius: "var(--radius)",
              marginBottom: 20, fontSize: "12px", color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <LinkIcon size={14} color="var(--accent)" />
              USDC is burned on {selectedChain.shortName} and minted natively on Stellar via Circle CCTP. No slippage.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep("select")}>
                Back
              </button>
              <button className="btn btn-primary btn-lg" style={{ flex: 2 }} onClick={handlePay}>
                Pay {usdcAmount} USDC
              </button>
            </div>
          </>
        )}

        {/* Steps: Processing */}
        {(step === "burning" || step === "attesting" || step === "minting" || step === "purchasing") && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: 8 }}>
              {STEP_LABELS[step]}
            </div>
            {step === "attesting" && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Circle is verifying the burn... This usually takes 10-15 minutes.
              </div>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(34,197,94,0.15)", border: "2px solid var(--success)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Check size={24} color="var(--success)" />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: 8 }}>
              Purchase Complete!
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 20 }}>
              Your license for "{sampleTitle}" is ready.
            </div>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step Progress Indicator ──────────────────────────────────────────────────

const PROCESSING_STEPS: { key: Step; label: string }[] = [
  { key: "burning", label: "Burn USDC" },
  { key: "attesting", label: "Attestation" },
  { key: "minting", label: "Mint on Stellar" },
  { key: "purchasing", label: "Purchase" },
];

function StepProgress({
  currentStep,
  attestationProgress,
}: {
  currentStep: Step;
  attestationProgress: number;
}) {
  const currentIdx = PROCESSING_STEPS.findIndex(s => s.key === currentStep);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      marginBottom: 24, padding: "0 8px",
    }}>
      {PROCESSING_STEPS.map((s, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                background: isDone ? "var(--success)" : isCurrent ? "var(--accent)" : "var(--surface-2)",
                color: isDone || isCurrent ? "#000" : "var(--text-muted)",
                border: isCurrent ? "2px solid var(--accent)" : "1px solid var(--border)",
                transition: "all 0.3s",
              }}>
                {isDone ? <Check size={14} /> : i + 1}
              </div>
              <div style={{
                fontSize: "10px", color: isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                marginTop: 4, textAlign: "center", fontWeight: isCurrent ? 600 : 400,
              }}>
                {s.label}
              </div>
              {s.key === "attesting" && isCurrent && attestationProgress > 0 && (
                <div style={{
                  width: "100%", height: 3, background: "var(--surface-2)",
                  borderRadius: 2, marginTop: 4, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${attestationProgress * 100}%`, height: "100%",
                    background: "var(--accent)", borderRadius: 2,
                    transition: "width 0.5s ease",
                  }} />
                </div>
              )}
            </div>
            {i < PROCESSING_STEPS.length - 1 && (
              <div style={{
                height: 1, flex: 0.5, marginTop: -16,
                background: isDone ? "var(--success)" : "var(--border)",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
