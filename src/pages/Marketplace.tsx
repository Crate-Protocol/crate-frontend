import { useState, useEffect } from "react";
import { SampleCard } from "../components/SampleCard";
import { getStats, buyResale, submitTransaction } from "../contracts/crate";
import { useWallet } from "../hooks/useWallet";
import toast from "react-hot-toast";

const GENRES = ["All", "Resales", "Trap", "R&B", "Drill", "Afrobeats", "Lo-Fi", "Pop"];

const DEMO_SAMPLES = [
  { id: 1, title: "Midnight Waves", producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "Trap",      bpm: 140, leasePrice: 25,  premiumPrice: 150, exclusivePrice: 800  },
  { id: 2, title: "Lagos Summer",   producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Afrobeats", bpm: 105, leasePrice: 30,  premiumPrice: 200, exclusivePrice: 1200 },
  { id: 3, title: "Soft Hours",     producer: "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE", genre: "R&B",       bpm: 88,  leasePrice: 20,  premiumPrice: 120, exclusivePrice: 600  },
  { id: 4, title: "Block Pressure", producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "Drill",     bpm: 148, leasePrice: 35,  premiumPrice: 180, exclusivePrice: 950, isExclusive: true },
  { id: 5, title: "Cloud Study",    producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Lo-Fi",     bpm: 72,  leasePrice: 15,  premiumPrice: 80,  exclusivePrice: 400  },
  { id: 6, title: "Runaway",        producer: "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE", genre: "Trap",      bpm: 145, leasePrice: 40,  premiumPrice: 220, exclusivePrice: 1500 },
  { id: 7, title: "Night Walk",     producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "R&B",       bpm: 95,  leasePrice: 25,  premiumPrice: 100, exclusivePrice: 500, isExclusive: true, resalePrice: 800, owner: "GOWNER7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU" },
];

export default function Marketplace() {
  const [genre, setGenre] = useState("All");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<{ totalSamples: number; totalVolume: string; totalProducers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const { address, signTransaction } = useWallet();

  const handleBuyResale = async (id: number) => {
    if (!address) return toast.error("Connect wallet first");
    try {
      const xdr = await buyResale({ buyer: address, sampleId: id });
      const signed = await signTransaction(xdr);
      const hash = await submitTransaction(signed);
      toast.success(`Purchased resale! Tx: ${hash.slice(0, 12)}...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    }
  };

  useEffect(() => {
    getStats()
      .then(s => { setStats(s); setLoading(false); })
      .catch(() => { setStatsError(true); setLoading(false); });
  }, []);

  const filtered = DEMO_SAMPLES.filter(s =>
    (genre === "All" || (genre === "Resales" ? s.resalePrice !== undefined : s.genre === genre)) &&
    (!search || s.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "Inter, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Marketplace</h1>
          <p style={{ color: "#525252", fontSize: 14, margin: 0 }}>
            {statsError
              ? "Could not load contract stats"
              : stats
              ? `${stats.totalSamples} beats · ${stats.totalVolume} XLM volume · ${stats.totalProducers} producers`
              : "Browse beats on Stellar testnet"
            }
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search beats…"
            style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", width: 220 }} />
          <div style={{ display: "flex", gap: 6 }}>
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                style={{ background: genre === g ? "#facc15" : "#111", color: genre === g ? "#000" : "#525252", border: `1px solid ${genre === g ? "#facc15" : "#1a1a1a"}`, borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 280, background: "#111", borderRadius: 20, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#525252" }}>
            <p style={{ fontSize: 16, fontWeight: 600 }}>No beats found</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Try a different genre or search term</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {filtered.map(s => (
              <SampleCard key={s.id} {...s}
                onBuy={(id, tier) => console.log("Purchase", id, "tier", tier)}
                onBuyResale={(id) => handleBuyResale(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
