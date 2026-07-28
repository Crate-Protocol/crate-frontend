export type LicenseTier = 0 | 1 | 2;

export interface PurchaseRecord {
  buyerAddress: string;
  sampleId: number;
  title: string;
  producer: string;
  genre: string;
  bpm: number;
  ipfsCid: string;
  licenseTier: LicenseTier;
  pricePaidXlm: string;
  txHash: string;
  purchasedAt: string;
  owner?: string;
  isExclusive?: boolean;
  resalePriceXlm?: string | null;
}

const STORAGE_PREFIX = "crate_purchase_history";

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}:${address}`;
}

function sortNewestFirst(records: PurchaseRecord[]): PurchaseRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
  );
}

export function getPurchaseHistory(address: string): PurchaseRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PurchaseRecord[];
    if (!Array.isArray(parsed)) return [];

    return sortNewestFirst(parsed);
  } catch {
    return [];
  }
}

export function savePurchaseRecord(record: PurchaseRecord): void {
  if (typeof window === "undefined") return;

  const existing = getPurchaseHistory(record.buyerAddress);
  const withoutDuplicate = existing.filter(
    (entry) => !(entry.sampleId === record.sampleId && entry.txHash === record.txHash)
  );

  window.localStorage.setItem(
    storageKey(record.buyerAddress),
    JSON.stringify(sortNewestFirst([record, ...withoutDuplicate]))
  );
}

export function updatePurchaseHistory(
  address: string,
  updater: (records: PurchaseRecord[]) => PurchaseRecord[]
): PurchaseRecord[] {
  if (typeof window === "undefined") return [];

  const nextRecords = sortNewestFirst(updater(getPurchaseHistory(address)));
  window.localStorage.setItem(storageKey(address), JSON.stringify(nextRecords));
  return nextRecords;
}

export function getLicenseTierLabel(tier: LicenseTier): string {
  switch (tier) {
    case 0:
      return "Lease";
    case 1:
      return "Premium";
    case 2:
      return "Exclusive";
    default:
      return "Unknown";
  }
}
