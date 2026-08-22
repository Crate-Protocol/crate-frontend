import { useMemo } from 'react';
import type { FilterState } from './useFilters';

export interface SampleData {
  id: number;
  title: string;
  producer: string;
  genre: string;
  bpm: number;
  leasePrice: number;
  premiumPrice: number;
  exclusivePrice: number;
  isExclusive?: boolean;
  resalePrice?: number;
  createdAt?: Date;
  popularity?: number;
}

function matchesSearch(s: SampleData, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    s.title.toLowerCase().includes(lower) ||
    s.genre.toLowerCase().includes(lower) ||
    s.producer.toLowerCase().includes(lower)
  );
}

function matchesGenre(s: SampleData, genres: string[]): boolean {
  if (genres.length === 0) return true;
  return genres.includes(s.genre);
}

function matchesBpm(s: SampleData, min: number, max: number): boolean {
  return s.bpm >= min && s.bpm <= max;
}

function matchesPrice(s: SampleData, min: number, max: number): boolean {
  const lowestPrice = Math.min(s.leasePrice, s.premiumPrice, s.exclusivePrice);
  return lowestPrice >= min && lowestPrice <= max;
}

function matchesLicense(s: SampleData, f: FilterState): boolean {
  if (!f.hasLease && !f.hasPremium && !f.hasExclusive) return true;
  if (f.hasLease && s.leasePrice <= 0) return false;
  if (f.hasPremium && s.premiumPrice <= 0) return false;
  if (f.hasExclusive && (s.exclusivePrice <= 0 || s.isExclusive)) return false;
  return true;
}

function sortSamples(samples: SampleData[], sort: string): SampleData[] {
  const sorted = [...samples];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.leasePrice - b.leasePrice);
    case 'price-desc':
      return sorted.sort((a, b) => b.leasePrice - a.leasePrice);
    case 'popular':
      return sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    case 'bpm-asc':
      return sorted.sort((a, b) => a.bpm - b.bpm);
    case 'newest':
    default:
      return sorted.sort((a, b) => {
        if (a.createdAt && b.createdAt) return b.createdAt.getTime() - a.createdAt.getTime();
        return b.id - a.id;
      });
  }
}

export function useMarketplaceFilters(samples: SampleData[], filters: FilterState) {
  return useMemo(() => {
    const filtered = samples.filter(s =>
      matchesSearch(s, filters.q) &&
      matchesGenre(s, filters.genre) &&
      matchesBpm(s, filters.bpmMin, filters.bpmMax) &&
      matchesPrice(s, filters.priceMin, filters.priceMax) &&
      matchesLicense(s, filters)
    );
    return sortSamples(filtered, filters.sort);
  }, [samples, filters]);
}
