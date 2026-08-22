import { useState, useEffect, useMemo } from "react";
import { SampleCard } from "../components/SampleCard";
import CrossChainPaymentModal from "../components/CrossChainPaymentModal";
import { SearchBar } from "../components/SearchBar";
import { FilterPanel, FilterToggle } from "../components/FilterPanel";
import { getStats, buyResale, submitTransaction } from "../contracts/crate";
import { useWallet } from "../hooks/useWallet";
import { useFilters } from "../hooks/useFilters";
import { useMarketplaceFilters } from "../hooks/useMarketplaceFilters";
import toast from "react-hot-toast";

const DEMO_SAMPLES = [
  { id: 1, title: "Midnight Waves", producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "Trap",      bpm: 140, leasePrice: 25,  premiumPrice: 150, exclusivePrice: 800  },
  { id: 2, title: "Lagos Summer",   producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Afrobeats", bpm: 105, leasePrice: 30,  premiumPrice: 200, exclusivePrice: 1200 },
  { id: 3, title: "Soft Hours",     producer: "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE", genre: "R&B",       bpm: 88,  leasePrice: 20,  premiumPrice: 120, exclusivePrice: 600  },
  { id: 4, title: "Block Pressure", producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "Drill",     bpm: 148, leasePrice: 35,  premiumPrice: 180, exclusivePrice: 950, isExclusive: true },
  { id: 5, title: "Cloud Study",    producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Lo-Fi",     bpm: 72,  leasePrice: 15,  premiumPrice: 80,  exclusivePrice: 400  },
  { id: 6, title: "Runaway",        producer: "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE", genre: "Trap",      bpm: 145, leasePrice: 40,  premiumPrice: 220, exclusivePrice: 1500 },
  { id: 7, title: "Night Walk",     producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "R&B",       bpm: 95,  leasePrice: 25,  premiumPrice: 100, exclusivePrice: 500, isExclusive: true, resalePrice: 800, owner: "GOWNER7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU" },
  { id: 8, title: "Detroit Flow",   producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "Hip-Hop",   bpm: 92,  leasePrice: 30,  premiumPrice: 175, exclusivePrice: 900  },
  { id: 9, title: "Tropical Heat",  producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Reggaeton", bpm: 98,  leasePrice: 35,  premiumPrice: 190, exclusivePrice: 1100 },
  { id: 10, title: "Velvet",        producer: "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE", genre: "R&B",       bpm: 82,  leasePrice: 20,  premiumPrice: 110, exclusivePrice: 550  },
  { id: 11, title: "Phantom",       producer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", genre: "House",     bpm: 126, leasePrice: 28,  premiumPrice: 160, exclusivePrice: 850  },
  { id: 12, title: "Sugar Rush",    producer: "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",  genre: "Pop",       bpm: 118, leasePrice: 22,  premiumPrice: 130, exclusivePrice: 700  },
];

const PAGE_SIZE = 20;

export default function Marketplace() {
  const [stats, setStats] = useState<{ totalSamples: number; totalVolume: string; totalProducers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { address, signTransaction, balances } = useWallet();
  const [crossChainSample, setCrossChainSample] = useState<{ id: number; title: string; priceXlm: string; tier: number } | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { filters, setFilter, resetFilters, activeFilterCount, DEFAULTS } = useFilters();
  const filtered = useMarketplaceFilters(DEMO_SAMPLES, filters);
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const sampleTitles = useMemo(() => DEMO_SAMPLES.map(s => s.title), []);

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

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans px-6 py-10">
      <div className="max-w-[1100px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-extrabold tracking-tight m-0 mb-1.5">Marketplace</h1>
          <p className="text-neutral-500 text-sm m-0">
            {statsError
              ? "Could not load contract stats"
              : stats
              ? `${stats.totalSamples} beats · ${stats.totalVolume} XLM volume · ${stats.totalProducers} producers`
              : "Browse beats on Stellar testnet"
            }
          </p>
        </div>

        {/* Search + Filter toggle */}
        <div className="flex items-center gap-3 mb-7">
          <SearchBar
            value={filters.q}
            onChange={v => setFilter('q', v)}
            sampleTitles={sampleTitles}
            loading={loading}
          />
          <FilterToggle activeFilterCount={activeFilterCount} onClick={() => setMobileFiltersOpen(true)} />
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <FilterPanel
            filters={filters}
            defaults={DEFAULTS}
            setFilter={setFilter}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            mobileOpen={mobileFiltersOpen}
            setMobileOpen={setMobileFiltersOpen}
          />

          <div className="flex-1 min-w-0">
            {/* Results count */}
            {!loading && (
              <p className="text-xs text-neutral-500 mb-4">
                Showing {visible.length} of {filtered.length} beats
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-[280px] bg-neutral-900 rounded-[20px] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-neutral-500">
                {filters.q ? (
                  <>
                    <p className="text-base font-semibold">No beats found for "{filters.q}"</p>
                    <p className="text-sm mt-1.5">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold">No beats match your filters</p>
                    <p className="text-sm mt-1.5">Try adjusting your filters</p>
                  </>
                )}
                <button
                  onClick={resetFilters}
                  className="mt-4 px-5 py-2 rounded-xl bg-neutral-900 text-sm font-semibold text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                  {visible.map(s => (
                    <SampleCard key={s.id} {...s}
                      xlmBalance={balances.native}
                      usdcBalance={balances.usdc}
                      onBuy={(id, tier) => console.log("Purchase", id, "tier", tier)}
                      onBuyResale={(id) => handleBuyResale(id)}
                      onBuyCrossChain={(id, tier) => {
                        const sample = DEMO_SAMPLES.find(d => d.id === id);
                        if (!sample) return;
                        const prices = [sample.leasePrice, sample.premiumPrice, sample.exclusivePrice];
                        setCrossChainSample({ id: sample.id, title: sample.title, priceXlm: String(prices[tier] ?? sample.leasePrice), tier });
                      }}
                    />
                  ))}
                </div>

                {visibleCount < filtered.length && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="px-8 py-3 rounded-xl bg-neutral-900 text-sm font-semibold text-white border border-neutral-800 hover:border-neutral-600 transition-all"
                    >
                      Load More ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {crossChainSample && (
        <CrossChainPaymentModal
          isOpen={!!crossChainSample}
          onClose={() => setCrossChainSample(null)}
          priceXlm={crossChainSample.priceXlm}
          sampleId={crossChainSample.id}
          sampleTitle={crossChainSample.title}
          stellarRecipient={address || ""}
          onPurchaseComplete={() => {
            toast.success(`Purchased "${crossChainSample.title}" via cross-chain USDC!`);
            setCrossChainSample(null);
          }}
        />
      )}
    </div>
  );
}
