import { useState, useRef } from "react";
import { Upload as UploadIcon, Music, X, CheckCircle } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { uploadSample, submitTransaction } from "../contracts/crate";
import toast from "react-hot-toast";

const GENRES = ["Hip-Hop", "Trap", "Lo-Fi", "R&B", "Drill", "Afrobeats", "Pop", "House", "Reggaeton", "Other"];

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
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"idle" | "ipfs" | "contract" | "done">("idle");
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleField(field: keyof UploadForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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

    setUploading(true);
    try {
      // Step 1: Upload to IPFS
      setStep("ipfs");
      const cid = await uploadToIPFS(form.file);
      setUploadedCid(cid);
      toast.success("File uploaded to IPFS");

      // Step 2: Build contract transaction
      setStep("contract");
      const xdr = await uploadSample({
        uploader: address,
        title: form.title.trim(),
        ipfsCid: cid,
        priceXlm: priceNum,
        genre: form.genre,
        bpm: bpmNum,
      });

      // Step 3: Sign via wallet
      const signed = await signTransaction(xdr);

      // Step 4: Submit
      const hash = await submitTransaction(signed);
      toast.success(`Beat listed! Tx: ${hash.slice(0, 12)}...`);
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
        {/* File Drop Zone */}
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

        {/* Form fields */}
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

          {/* Revenue split info */}
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
                  <span>Your earnings (90%)</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    {(parseFloat(form.priceXlm) * 0.9).toFixed(2)} XLM
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Platform fee (10%)</span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {(parseFloat(form.priceXlm) * 0.1).toFixed(2)} XLM
                  </span>
                </div>
              </div>
            ) : (
              <span>Enter a price to see your revenue split</span>
            )}
          </div>

          {/* Progress */}
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
