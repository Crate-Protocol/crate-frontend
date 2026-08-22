import { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import type { FilterState } from '../hooks/useFilters';

interface FilterPanelProps {
  filters: FilterState;
  defaults: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const GENRES = ['Trap', 'R&B', 'Drill', 'Afrobeats', 'Lo-Fi', 'Pop', 'House', 'Reggaeton', 'Hip-Hop', 'Other'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'bpm-asc', label: 'BPM: Low → High' },
];

const BPM_PRESETS = [
  { label: 'Slow', min: 60, max: 90 },
  { label: 'Mid', min: 90, max: 120 },
  { label: 'Upbeat', min: 120, max: 150 },
  { label: 'Fast', min: 150, max: 300 },
];

const PRICE_PRESETS = [
  { label: 'Budget', min: 0, max: 50 },
  { label: 'Mid', min: 50, max: 200 },
  { label: 'Premium', min: 200, max: 5000 },
];

function DualRange({ min, max, valueMin, valueMax, onChange, step = 1 }: {
  min: number; max: number; valueMin: number; valueMax: number;
  onChange: (min: number, max: number) => void; step?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const getPercent = (v: number) => ((v - min) / (max - min)) * 100;

  const handleMove = useCallback((clientX: number) => {
    if (!trackRef.current || !dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = Math.round((pct * (max - min) + min) / step) * step;
    if (dragging === 'min') {
      onChange(Math.min(raw, valueMax - step), valueMax);
    } else {
      onChange(valueMin, Math.max(raw, valueMin + step));
    }
  }, [dragging, min, max, step, valueMin, valueMax, onChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, handleMove]);

  return (
    <div ref={trackRef} className="relative h-5 flex items-center cursor-pointer select-none">
      <div className="absolute h-1 w-full bg-neutral-800 rounded-full" />
      <div
        className="absolute h-1 bg-yellow-400 rounded-full"
        style={{ left: `${getPercent(valueMin)}%`, right: `${100 - getPercent(valueMax)}%` }}
      />
      <div
        className="absolute w-4 h-4 bg-white rounded-full shadow-lg border-2 border-yellow-400 -translate-x-1/2 z-10"
        style={{ left: `${getPercent(valueMin)}%` }}
        onMouseDown={(e) => { e.stopPropagation(); setDragging('min'); }}
        onTouchStart={(e) => { e.stopPropagation(); setDragging('min'); }}
      />
      <div
        className="absolute w-4 h-4 bg-white rounded-full shadow-lg border-2 border-yellow-400 -translate-x-1/2 z-10"
        style={{ left: `${getPercent(valueMax)}%` }}
        onMouseDown={(e) => { e.stopPropagation(); setDragging('max'); }}
        onTouchStart={(e) => { e.stopPropagation(); setDragging('max'); }}
      />
    </div>
  );
}

export function FilterPanel({ filters, defaults, setFilter, resetFilters, activeFilterCount, mobileOpen, setMobileOpen }: FilterPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('genre');

  const toggleGenre = (g: string) => {
    const next = filters.genre.includes(g)
      ? filters.genre.filter(x => x !== g)
      : [...filters.genre, g];
    setFilter('genre', next);
  };

  const panel = (
    <div className="space-y-5">
      {/* Genre */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'genre' ? null : 'genre')}
          className="flex items-center justify-between w-full text-sm font-semibold text-white mb-2"
        >
          Genre
          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${expandedSection === 'genre' ? 'rotate-180' : ''}`} />
        </button>
        {expandedSection === 'genre' && (
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filters.genre.includes(g)
                    ? 'bg-yellow-400 text-black'
                    : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BPM Range */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'bpm' ? null : 'bpm')}
          className="flex items-center justify-between w-full text-sm font-semibold text-white mb-2"
        >
          BPM Range
          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${expandedSection === 'bpm' ? 'rotate-180' : ''}`} />
        </button>
        {expandedSection === 'bpm' && (
          <>
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>{filters.bpmMin}</span>
              <span>{filters.bpmMax}</span>
            </div>
            <DualRange min={40} max={300} valueMin={filters.bpmMin} valueMax={filters.bpmMax}
              onChange={(min, max) => { setFilter('bpmMin', min); setFilter('bpmMax', max); }} />
            <div className="flex gap-1.5 mt-2">
              {BPM_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setFilter('bpmMin', p.min); setFilter('bpmMax', p.max); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    filters.bpmMin === p.min && filters.bpmMax === p.max
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-600'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'price' ? null : 'price')}
          className="flex items-center justify-between w-full text-sm font-semibold text-white mb-2"
        >
          Price Range (XLM)
          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${expandedSection === 'price' ? 'rotate-180' : ''}`} />
        </button>
        {expandedSection === 'price' && (
          <>
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>{filters.priceMin}</span>
              <span>{filters.priceMax}</span>
            </div>
            <DualRange min={0} max={5000} valueMin={filters.priceMin} valueMax={filters.priceMax}
              onChange={(min, max) => { setFilter('priceMin', min); setFilter('priceMax', max); }} step={10} />
            <div className="flex gap-1.5 mt-2">
              {PRICE_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setFilter('priceMin', p.min); setFilter('priceMax', p.max); }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    filters.priceMin === p.min && filters.priceMax === p.max
                      ? 'bg-yellow-400 text-black'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-neutral-600'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* License */}
      <div>
        <button
          onClick={() => setExpandedSection(expandedSection === 'license' ? null : 'license')}
          className="flex items-center justify-between w-full text-sm font-semibold text-white mb-2"
        >
          License Availability
          <ChevronDown size={14} className={`text-neutral-500 transition-transform ${expandedSection === 'license' ? 'rotate-180' : ''}`} />
        </button>
        {expandedSection === 'license' && (
          <div className="space-y-2">
            {[
              { key: 'hasLease' as const, label: 'Has Lease' },
              { key: 'hasPremium' as const, label: 'Has Premium' },
              { key: 'hasExclusive' as const, label: 'Has Exclusive available' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  filters[key] ? 'bg-yellow-400 border-yellow-400' : 'border-neutral-700 group-hover:border-neutral-500'
                }`}>
                  {filters[key] && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                <span className="text-xs text-neutral-400 group-hover:text-white transition-colors">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sort */}
      <div>
        <label className="text-sm font-semibold text-white mb-2 block">Sort By</label>
        <select
          value={filters.sort}
          onChange={e => setFilter('sort', e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600 appearance-none cursor-pointer"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="w-full py-2.5 rounded-xl border border-neutral-800 text-sm font-semibold text-neutral-400 hover:text-white hover:border-neutral-600 transition-all"
        >
          Clear All Filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </div>
          {panel}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-950 rounded-t-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Filters</h3>
              <button onClick={() => setMobileOpen(false)} className="text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {panel}
            <button
              onClick={() => setMobileOpen(false)}
              className="w-full mt-5 py-3 rounded-xl bg-yellow-400 text-black text-sm font-bold"
            >
              Show Results
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterToggle({ activeFilterCount, onClick }: { activeFilterCount: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:border-neutral-600 transition-colors relative"
    >
      <SlidersHorizontal size={14} />
      Filters
      {activeFilterCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}
