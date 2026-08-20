import { useState, useEffect, useCallback } from "react";

export interface PurchaseRecord {
  txHash: string;
  sampleId: number;
  sampleTitle: string;
  tier: string;
  token: string;
  price: number;
  timestamp: number;
  status: "confirmed" | "pending" | "failed";
}

const STORAGE_KEY = "crate_purchase_history";

function getStorageKey(address: string): string {
  return `${STORAGE_KEY}_${address}`;
}

function loadHistory(address: string): PurchaseRecord[] {
  try {
    const raw = localStorage.getItem(getStorageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(address: string, records: PurchaseRecord[]): void {
  localStorage.setItem(getStorageKey(address), JSON.stringify(records));
}

export function useTransactionHistory(address: string | null) {
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setHistory([]);
      return;
    }
    setLoading(true);
    const records = loadHistory(address);
    setHistory(records);
    setLoading(false);
  }, [address]);

  const addPurchase = useCallback(
    (record: Omit<PurchaseRecord, "timestamp">) => {
      if (!address) return;
      const entry: PurchaseRecord = { ...record, timestamp: Date.now() };
      const current = loadHistory(address);
      const updated = [entry, ...current].slice(0, 50); // keep last 50
      saveHistory(address, updated);
      setHistory(updated);
    },
    [address]
  );

  const updateStatus = useCallback(
    (txHash: string, status: PurchaseRecord["status"]) => {
      if (!address) return;
      const current = loadHistory(address);
      const updated = current.map((r) =>
        r.txHash === txHash ? { ...r, status } : r
      );
      saveHistory(address, updated);
      setHistory(updated);
    },
    [address]
  );

  const clearHistory = useCallback(() => {
    if (!address) return;
    saveHistory(address, []);
    setHistory([]);
  }, [address]);

  return { history, loading, addPurchase, updateStatus, clearHistory };
}
