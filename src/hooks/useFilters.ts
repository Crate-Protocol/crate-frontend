import { useState, useEffect, useCallback, useRef } from 'react';

export interface FilterState {
  q: string;
  genre: string[];
  bpmMin: number;
  bpmMax: number;
  priceMin: number;
  priceMax: number;
  hasLease: boolean;
  hasPremium: boolean;
  hasExclusive: boolean;
  sort: string;
}

const DEFAULTS: FilterState = {
  q: '',
  genre: [],
  bpmMin: 40,
  bpmMax: 300,
  priceMin: 0,
  priceMax: 5000,
  hasLease: false,
  hasPremium: false,
  hasExclusive: false,
  sort: 'newest',
};

function readFromURL(): FilterState {
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get('q') || '',
    genre: p.get('genre') ? p.get('genre')!.split(',') : [],
    bpmMin: Number(p.get('bpmMin')) || DEFAULTS.bpmMin,
    bpmMax: Number(p.get('bpmMax')) || DEFAULTS.bpmMax,
    priceMin: Number(p.get('priceMin')) || DEFAULTS.priceMin,
    priceMax: Number(p.get('priceMax')) || DEFAULTS.priceMax,
    hasLease: p.get('hasLease') === '1',
    hasPremium: p.get('hasPremium') === '1',
    hasExclusive: p.get('hasExclusive') === '1',
    sort: p.get('sort') || DEFAULTS.sort,
  };
}

function writeToURL(filters: FilterState) {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.genre.length) p.set('genre', filters.genre.join(','));
  if (filters.bpmMin !== DEFAULTS.bpmMin) p.set('bpmMin', String(filters.bpmMin));
  if (filters.bpmMax !== DEFAULTS.bpmMax) p.set('bpmMax', String(filters.bpmMax));
  if (filters.priceMin !== DEFAULTS.priceMin) p.set('priceMin', String(filters.priceMin));
  if (filters.priceMax !== DEFAULTS.priceMax) p.set('priceMax', String(filters.priceMax));
  if (filters.hasLease) p.set('hasLease', '1');
  if (filters.hasPremium) p.set('hasPremium', '1');
  if (filters.hasExclusive) p.set('hasExclusive', '1');
  if (filters.sort !== DEFAULTS.sort) p.set('sort', filters.sort);

  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(readFromURL);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync to URL on filter change (debounced)
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => writeToURL(filters), 100);
    return () => clearTimeout(timerRef.current);
  }, [filters]);

  // Listen for back/forward
  useEffect(() => {
    const onPop = () => setFilters(readFromURL());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULTS);
  }, []);

  const activeFilterCount = [
    filters.genre.length > 0,
    filters.bpmMin !== DEFAULTS.bpmMin || filters.bpmMax !== DEFAULTS.bpmMax,
    filters.priceMin !== DEFAULTS.priceMin || filters.priceMax !== DEFAULTS.priceMax,
    filters.hasLease,
    filters.hasPremium,
    filters.hasExclusive,
    filters.sort !== DEFAULTS.sort,
  ].filter(Boolean).length;

  return { filters, setFilter, resetFilters, activeFilterCount, DEFAULTS };
}
