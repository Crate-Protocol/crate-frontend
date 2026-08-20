import { useState, useRef, useEffect } from "react";
import { Upload as UploadIcon, Music, X, CheckCircle, Users, Plus, Trash2, AlertCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { uploadSample, submitTransaction, validateSplits, type RoyaltySplit } from "../contracts/crate";
import toast from "react-hot-toast";

const GENRES = ["Hip-Hop", "Trap", "Lo-Fi", "R&B", "Drill", "Afrobeats", "Pop", "House", "Reggaeton", "Other"];
const ROLES = ["Producer", "Co-Producer", "Vocalist", "Songwriter", "Mixing & Mastering", "Featured Artist", "Other"];

interface UploadForm {
  title: string;
  priceXlm: string;
  genre: string;
  bpm: string;
  file: File | null;
}

export default function Upload() {
  const { address, isConnected, connect, signTransaction } = useWallet();
  const [form, setForm] = useState<UploadForm>({
    title: "",
    priceXlm: "",
    genre: "Hip-Hop",
    bpm: "",
    file: null,
  });
  const [splits, setSplits] = useState<RoyaltySplit[]>([
    { recipient: address || "", bps: 10000, role: "Producer" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"idle" | "ipfs" | "contract" | "done">("idle");
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (address && splits.length === 1 && !splits[0].recipient) {
      setSplits([{ recipient: address, bps: 10000, role: "Producer" }]);
    }
  }, [address]);

  function handleField(field: keyof UploadForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAddCollaborator() {
    const currentTotalBps = splits.reduce((sum, s) => sum + (s.bps || 0), 0);
    const defaultNewBps = Math.max(0, 10000 - currentTotalBps);
    setSplits((prev) => [
      ...prev,
      { recipient: "", bps: defaultNewBps > 0 ? defaultNewBps : 2000, role: "Co-Producer" },
    ]);
  }

  function handleRemoveCollaborator(index: number) {
    if (splits.length <= 1) {
      toast.error("At least one recipient is required");
      return;
    }
    setSplits((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSplitChange(index: number, field: keyof RoyaltySplit, value: string | number) {
    setSplits((prev) => {
      const next = [...prev];
      if (field === "bps") {
        next[index] = { ...next[index], bps: Math.max(0, Math.min(10000, Number(value) || 0)) };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  }

  function applyPreset(preset: "solo" | "fifty_fifty" | "equal") {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }
    if (preset === "solo") {
      setSplits([{ recipient: address, bps: 10000, role: "Producer" }]);
    } else if (preset === "fifty_fifty") {
      setSplits([
        { recipient: address, bps: 5000, role: "Producer" },
        { recipient: "", bps: 5000, role: "Co-Producer" },
      ]);
    } else if (preset === "equal") {
      const count = splits.length || 2;
      const share = Math.floor(10000 / count);
      const remainder = 10000 - share * count;
      setSplits((prev) =>
        prev.map((s, i) => ({
          ...s,
          bps: i === 0 ? share + remainder : share,
        }))
      );
    }
  }

  const splitStatus = validateSplits(splits);

  function handleFile(file: File) {
    const allowed = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/x-aiff", "audio/aiff", "audio/flac", "audio/x-flac"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|aif|aiff|flac)$/i)) {
      toast.error("Please upload an audio file (mp3, wav, flac, aiff)");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File must be under 100MB");
      return;
    }
    setForm((prev) => ({ ...prev, file }));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function uploadToIPFS(file: File): Promise<string> {
    const pinataJwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
    if (!pinataJwt) {
      await new Promise((r) => setTimeout(r, 800));
      const buf = await file.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", buf);
      const hex  = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 44);
      return `Qm${hex}`;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "pinataMetadata",
      JSON.stringify({ name: form.title || file.name })
    );

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${pinataJwt}` },
      body: formData,
    });

    if (!res.ok) throw new Error("IPFS upload failed");
    const data = await res.json();
    return data.IpfsHash as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!form.file) {
      toast.error("Please select an audio file");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const priceNum = parseFloat(form.priceXlm);
    if (!priceNum || priceNum <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    const bpmNum = parseInt(form.bpm);
    if (!bpmNum || bpmNum < 40 || bpmNum > 300) {
      toast.error("BPM must be between 40 and 300");
      return;
    }

    if (!splitStatus.valid) {
      toast.error(splitStatus.error || "Royalty splits must sum to 100%");
      return;
    }

    setUploading(true);
    try {
      setStep("ipfs");
      const cid = await uploadToIPFS(form.file);
      setUploadedCid(cid);
      toast.success("File uploaded to IPFS");

      setStep("contract");
      const xdr = await uploadSample({
        uploader: address,
        title: form.title.trim(),
        ipfsCid: cid,
        priceXlm: priceNum,
        genre: form.genre,
        bpm: bpmNum,
        splits: splits,
      });

      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Beat listed with ${splits.length} royalty split(s)! Tx: ${hash.slice(0, 12)}...`);
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setStep("idle");
    } finally {
      setUploading(false);
    }
  }

  if (step === "done") {
    return (
      <main className="container" style={{ paddingTop: "80px", paddingBottom: "80px", maxWidth: "560px" }}>
        <div style={{ textAlign: "center" }}>
          <CheckCircle size={56} color="var(--success)" style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: 12 }}>Beat Listed!</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
            <strong>{form.title}</strong> is now live on the marketplace.
          </p>
          {uploadedCid && (
            <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)", marginBottom: 28 }}>
              IPFS: {uploadedCid}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setForm({ title: "", priceXlm: "", genre: "Hip-Hop", bpm: "", file: null });
                setStep("idle");
                setUploadedCid(null);
              }}
            >
              Upload Another
            </button>
            <a href="/marketplace" className="btn btn-secondary">View Marketplace</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px", maxWidth: "640px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Upload a Beat</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          List your beat on the Crate marketplace. You earn 90% of every sale.
        </p>
      </div>

      {!isConnected && (
        <div
          className="card"
          style={{
            padding: "20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Wallet not connected</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Connect Freighter to upload to the blockchain
            </div>
          </div>
          <button className="btn btn-primary" onClick={connect}>
            Connect Wallet
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "var(--accent)" : form.file ? "var(--success)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "40px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "24px",
            background: isDragging ? "rgba(250, 204, 21, 0.05)" : "var(--surface)",
            transition: "all 0.15s",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.aiff,.aif,.ogg"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {form.file ? (
            <div>
              <Music size={28} color="var(--success)" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{form.file.name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {(form.file.size / 1024 / 1024).toFixed(1)} MB
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setForm((p) => ({ ...p, file: null })); }}
                style={{ marginTop: 10, color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center", gap: 4, margin: "10px auto 0" }}
              >
                <X size={12} /> Remove
              </button>
            </div>
          ) : (
            <div>
              <UploadIcon size={28} color="var(--text-muted)" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your audio file here</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                MP3, WAV, FLAC, AIFF — up to 100MB
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: "20px" }}>
          <div className="form-group">
            <label className="label">Beat Title *</label>
            <input
              className="input"
              placeholder="e.g. Midnight Trap Vol.1"
              value={form.title}
              onChange={(e) => handleField("title", e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="label">Price (XLM) *</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 10"
                min="0.1"
                step="0.1"
                value={form.priceXlm}
                onChange={(e) => handleField("priceXlm", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">BPM *</label>
              <input
                className="input"
                type="number"
                placeholder="e.g. 140"
                min="40"
                max="300"
                value={form.bpm}
                onChange={(e) => handleField("bpm", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Genre *</label>
            <select
              className="input"
              value={form.genre}
              onChange={(e) => handleField("genre", e.target.value)}
            >
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label className="label" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <Users size={16} color="var(--primary)" />
                Collaborator Royalty Splits
              </label>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: splitStatus.valid
                    ? "rgba(34, 197, 94, 0.15)"
                    : splitStatus.remainingBps > 0
                    ? "rgba(234, 179, 8, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  color: splitStatus.valid
                    ? "var(--success)"
                    : splitStatus.remainingBps > 0
                    ? "#eab308"
                    : "var(--danger)",
                }}
              >
                {splitStatus.valid
                  ? "✓ 100% Allocated"
                  : splitStatus.remainingBps > 0
                  ? `${(splitStatus.remainingBps / 100).toFixed(0)}% Remaining`
                  : `${(Math.abs(splitStatus.remainingBps) / 100).toFixed(0)}% Exceeded`}
              </span>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "12px" }}>
              Automatically distribute on-chain license sales across producers, vocalists, and engineers.
            </p>

            {/* Presets */}
            <div style={{ display: "flex", gap: 8, marginBottom: "14px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}
                onClick={() => applyPreset("solo")}
              >
                Solo (100%)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}
                onClick={() => applyPreset("fifty_fifty")}
              >
                50 / 50 Split
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}
                onClick={() => applyPreset("equal")}
              >
                Equal Split
              </button>
            </div>

            {/* Collaborator Rows */}
            <div style={{ display: "grid", gap: "10px" }}>
              {splits.map((split, index) => {
                const sharePercent = (split.bps / 100).toFixed(0);
                const priceNum = parseFloat(form.priceXlm) || 0;
                const estEarning = ((priceNum * 0.9 * split.bps) / 10000).toFixed(2);

                return (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.8fr 1.2fr 0.9fr auto",
                      gap: "8px",
                      alignItems: "center",
                      background: "var(--surface-2)",
                      padding: "10px 12px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <input
                        className="input"
                        style={{ fontSize: "12px", padding: "6px 10px" }}
                        placeholder="G... Stellar Address"
                        value={split.recipient}
                        onChange={(e) => handleSplitChange(index, "recipient", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <select
                        className="input"
                        style={{ fontSize: "12px", padding: "6px 10px" }}
                        value={split.role || "Producer"}
                        onChange={(e) => handleSplitChange(index, "role", e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="100"
                        style={{ fontSize: "12px", padding: "6px 8px", textAlign: "right" }}
                        value={sharePercent}
                        onChange={(e) => handleSplitChange(index, "bps", Math.round(parseFloat(e.target.value || "0") * 100))}
                        required
                      />
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>%</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(index)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: splits.length > 1 ? "var(--text-muted)" : "transparent",
                          cursor: splits.length > 1 ? "pointer" : "default",
                          padding: "6px",
                          borderRadius: "4px",
                        }}
                        disabled={splits.length <= 1}
                        aria-label="Remove collaborator"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddCollaborator}
              className="btn btn-secondary"
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "8px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> Add Collaborator
            </button>

            {!splitStatus.valid && splitStatus.error && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--danger)",
                  fontSize: "12px",
                }}
              >
                <AlertCircle size={14} />
                <span>{splitStatus.error}</span>
              </div>
            )}
          </div>

          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "16px",
              fontSize: "13px",
              color: "var(--text-secondary)",
            }}
          >
            {form.priceXlm && parseFloat(form.priceXlm) > 0 ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Net Creator Pool (90%)</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    {(parseFloat(form.priceXlm) * 0.9).toFixed(2)} XLM
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Platform fee (10%)</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {(parseFloat(form.priceXlm) * 0.1).toFixed(2)} XLM
                  </span>
                </div>

                {splits.length > 1 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "8px" }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                      Payout Breakdown per Sale:
                    </div>
                    {splits.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", marginBottom: 2 }}>
                        <span>
                          {s.role || "Collaborator"} ({((s.bps || 0) / 100).toFixed(0)}%)
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                          {(((parseFloat(form.priceXlm) || 0) * 0.9 * (s.bps || 0)) / 10000).toFixed(2)} XLM
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span>Enter a price to see revenue split calculations</span>
            )}
          </div>

          {uploading && (
            <div
              style={{
                padding: "14px 18px",
                background: "rgba(250, 204, 21, 0.08)",
                border: "1px solid rgba(250, 204, 21, 0.2)",
                borderRadius: "var(--radius)",
                fontSize: "13px",
                color: "var(--accent)",
              }}
            >
              {step === "ipfs" && "Uploading to IPFS..."}
              {step === "contract" && "Building contract transaction..."}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={uploading || !form.file}
            style={{ width: "100%" }}
          >
            {uploading ? "Uploading..." : "List Beat on Marketplace"}
          </button>
        </div>
      </form>
    </main>
  );
}
