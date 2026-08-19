export interface SaleRecord {
  txHash: string;
  sampleId: number;
  sampleTitle: string;
  buyer: string;
  tier: "lease" | "premium" | "exclusive";
  amount: string; // in XLM
  token: string;
  timestamp: number;
}

export interface WithdrawalRecord {
  txHash: string;
  amount: string; // in XLM
  timestamp: number;
  status: "confirmed" | "pending";
}

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  amount: number; // in XLM
  count: number;
}

const MAX_RECORDS = 500;

export function getStoredSales(address: string): SaleRecord[] {
  if (!address) return [];
  try {
    const raw = localStorage.getItem(`crate_sales_${address}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSale(address: string, sale: SaleRecord): void {
  if (!address) return;
  const current = getStoredSales(address);
  // Avoid duplicate tx
  if (current.some((s) => s.txHash === sale.txHash)) return;
  const updated = [sale, ...current].slice(0, MAX_RECORDS);
  localStorage.setItem(`crate_sales_${address}`, JSON.stringify(updated));
}

export function getStoredWithdrawals(address: string): WithdrawalRecord[] {
  if (!address) return [];
  try {
    const raw = localStorage.getItem(`crate_withdrawals_${address}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWithdrawal(address: string, withdrawal: WithdrawalRecord): void {
  if (!address) return;
  const current = getStoredWithdrawals(address);
  if (current.some((w) => w.txHash === withdrawal.txHash)) return;
  const updated = [withdrawal, ...current].slice(0, MAX_RECORDS);
  localStorage.setItem(`crate_withdrawals_${address}`, JSON.stringify(updated));
}

export function aggregateSalesByDay(history: SaleRecord[], days: number = 30): DailyRevenuePoint[] {
  const result: DailyRevenuePoint[] = [];
  const now = new Date();
  const dayBuckets: Record<string, { amount: number; count: number }> = {};

  // Initialize empty buckets for all days in range
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().split("T")[0]!;
    dayBuckets[key] = { amount: 0, count: 0 };
  }

  // Populate from history
  const cutoff = now.getTime() - days * 86400000;
  for (const item of history) {
    if (item.timestamp >= cutoff) {
      const dayKey = new Date(item.timestamp).toISOString().split("T")[0]!;
      if (dayBuckets[dayKey]) {
        dayBuckets[dayKey].amount += parseFloat(item.amount) || 0;
        dayBuckets[dayKey].count += 1;
      }
    }
  }

  for (const [date, data] of Object.entries(dayBuckets)) {
    result.push({
      date,
      amount: parseFloat(data.amount.toFixed(2)),
      count: data.count,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateGrowth(current: number, previous: number): { percentage: number; isPositive: boolean } {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, isPositive: current >= 0 };
  }
  const delta = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(parseFloat(delta.toFixed(1))),
    isPositive: delta >= 0,
  };
}
