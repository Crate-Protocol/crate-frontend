import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileMusic, Library, ShoppingBag, Tag } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getLicense, getSample, listResale, stroopsToXlm, submitTransaction } from "../contracts/crate";
import {
  getLicenseTierLabel,
  getPurchaseHistory,
  type PurchaseRecord,
  type LicenseTier,
  updatePurchaseHistory,
} from "../lib/purchaseHistory";
import toast from "react-hot-toast";

export default function MyBeats() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listingSampleId, setListingSampleId] = useState<number | null>(null);
  const gatewayBase = (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) || "https://ipfs.io";
  const explorerBase =
    (import.meta.env.VITE_NETWORK as string) === "MAINNET"
      ? "https://stellar.expert/explorer/public/tx"
      : "https://stellar.expert/explorer/testnet/tx";

  useEffect(() => {
    if (!address) {
      setRecords([]);
      return;
    }

    setRecords(getPurchaseHistory(address));
  }, [address]);

  useEffect(() => {
    if (!address) return;
    void refreshLibrary();
  }, [address]);

  const totalSpent = useMemo(() => {
    return records
      .reduce((sum, record) => sum + Number.parseFloat(record.pricePaidXlm), 0)
      .toFixed(2);
  }, [records]);

  async function refreshLibrary() {
    if (!address) return;

    const stored = getPurchaseHistory(address);
    if (stored.length === 0) {
      setRecords([]);
      return;
    }

    setIsRefreshing(true);
    try {
      const refreshed = await Promise.all(
        stored.map(async (record) => {
          const [sample, onChainTier] = await Promise.all([
            getSample(address, BigInt(record.sampleId)).catch(() => null),
            getLicense(address, record.sampleId).catch(() => null),
          ]);

          if (!sample) return record;

          return {
            ...record,
            title: sample.title,
            producer: sample.uploader,
            genre: sample.genre,
            bpm: sample.bpm,
            ipfsCid: sample.ipfs_cid,
            owner: sample.owner,
            isExclusive: sample.is_exclusive,
            resalePriceXlm: sample.resale_price ? stroopsToXlm(sample.resale_price) : null,
            licenseTier: normalizeLicenseTier(onChainTier, record.licenseTier),
          };
        })
      );

      setRecords(updatePurchaseHistory(address, () => refreshed));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleListForResale(record: PurchaseRecord) {
    if (!address) return;

    const priceStr = window.prompt("Enter resale price in XLM:");
    if (!priceStr) return;

    const priceXlm = Number.parseFloat(priceStr);
    if (!Number.isFinite(priceXlm) || priceXlm <= 0) {
      toast.error("Enter a valid resale price");
      return;
    }

    setListingSampleId(record.sampleId);
    try {
      const xdr = await listResale({ owner: address, sampleId: record.sampleId, priceXlm });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);

      const nextRecords = updatePurchaseHistory(address, (existing) =>
        existing.map((entry) =>
          entry.sampleId === record.sampleId
            ? {
                ...entry,
                owner: address,
                isExclusive: true,
                resalePriceXlm: priceXlm.toFixed(2),
              }
            : entry
        )
      );

      setRecords(nextRecords);
      toast.success(`Listed for resale! Tx: ${hash.slice(0, 12)}...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list for resale");
    } finally {
      setListingSampleId(null);
    }
  }

  if (!isConnected) {
    return (
      <main
        className="container"
        style={{ paddingTop: "80px", paddingBottom: "80px", maxWidth: "560px", textAlign: "center" }}
      >
        <Library size={48} color="var(--text-muted)" style={{ margin: "0 auto 20px" }} />
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: 10 }}>Connect Your Wallet</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 28, fontSize: "14px" }}>
          Connect Freighter to view your purchase history and license library.
        </p>
        <button className="btn btn-primary btn-lg" onClick={connect}>
          Connect Freighter
        </button>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px", maxWidth: "980px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>My Beats</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Your purchased licenses, receipts, and download links in one place.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="card" style={{ padding: "16px 18px", minWidth: 150 }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Purchases
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{records.length}</div>
          </div>
          <div className="card" style={{ padding: "16px 18px", minWidth: 150 }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Total Spent
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)" }}>{totalSpent} XLM</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => void refreshLibrary()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh Library"}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <ShoppingBag size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: 8 }}>No beats purchased yet</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            When you buy a lease, premium, or exclusive license, it will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {records.map((record) => {
            const canListForResale =
              record.licenseTier === 2 &&
              record.owner === address &&
              !record.resalePriceXlm;

            return (
              <article key={`${record.sampleId}-${record.txHash}`} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 420px" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                      <span className="badge badge-yellow">{getLicenseTierLabel(record.licenseTier)}</span>
                      <span style={{ background: "var(--surface-2)", color: "var(--text-secondary)", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {record.genre}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{record.bpm} BPM</span>
                    </div>

                    <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: 6 }}>{record.title}</h2>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                      {record.producer.slice(0, 12)}...{record.producer.slice(-6)}
                    </p>

                    <div style={{ display: "grid", gap: 8, fontSize: "13px", color: "var(--text-secondary)" }}>
                      <div>
                        Purchased on <span style={{ color: "var(--text-primary)" }}>{new Date(record.purchasedAt).toLocaleString()}</span>
                      </div>
                      <div>
                        Paid <span style={{ color: "var(--accent)", fontWeight: 700 }}>{record.pricePaidXlm} XLM</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Tag size={13} />
                        License proof is tied to your connected wallet on-chain.
                      </div>
                      {record.resalePriceXlm && (
                        <div>
                          Resale listed at <span style={{ color: "#60a5fa", fontWeight: 700 }}>{record.resalePriceXlm} XLM</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 220 }}>
                    <a
                      href={`${gatewayBase.replace(/\/$/, "")}/ipfs/${record.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <FileMusic size={14} />
                      Open Download
                    </a>
                    <a
                      href={`${explorerBase}/${record.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      View Receipt
                      <ExternalLink size={14} />
                    </a>
                    {canListForResale && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => void handleListForResale(record)}
                        disabled={listingSampleId === record.sampleId}
                      >
                        {listingSampleId === record.sampleId ? "Listing..." : "List for Resale"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function normalizeLicenseTier(onChainTier: number | null, fallbackTier: LicenseTier): LicenseTier {
  if (onChainTier === 0 || onChainTier === 1 || onChainTier === 2) {
    return onChainTier;
  }

  return fallbackTier;
}
