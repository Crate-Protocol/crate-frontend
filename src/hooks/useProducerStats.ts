import { useState, useEffect, useCallback, useMemo } from "react";
import { getEarnings, getStats } from "../contracts/crate";
import {
  getSalesHistory,
  getWithdrawalHistory,
  getUploadedBeats,
  aggregateSalesByDay,
  calculateGrowth,
  SaleRecord,
  WithdrawalRecord,
  BeatPerformance,
  DailySalesBucket,
  GrowthMetric,
} from "../services/analytics";

export interface ProducerStats {
  totalEarned: number;
  thisMonthEarned: number;
  lastMonthEarned: number;
  monthlyGrowth: GrowthMetric;
  pendingBalance: number;
  totalSales: number;
  salesThisMonth: number;
  salesGrowth: GrowthMetric;
  salesThisWeek: number;
  totalWithdrawn: number;
  topBeat: BeatPerformance | null;
  sparklineEarned: number[];
  sparklineMonthly: number[];
  sparklinePending: number[];
  sparklineSales: number[];
}

export function useProducerStats(address: string | null) {
  const [loading, setLoading] = useState(true);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [beats, setBeats] = useState<BeatPerformance[]>([]);

  const loadData = useCallback(async () => {
    if (!address) {
      setSales([]);
      setWithdrawals([]);
      setBeats([]);
      setPendingBalance(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch pending contract earnings
      try {
        const contractEarnings = await getEarnings(address);
        setPendingBalance(contractEarnings);
      } catch {
        // fallback
      }

      // 2. Load local records scoped to this address
      const localSales = getSalesHistory(address);
      const localWithdrawals = getWithdrawalHistory(address);
      const localBeats = getUploadedBeats(address);

      setSales(localSales);
      setWithdrawals(localWithdrawals);
      setBeats(localBeats);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute metrics
  const stats: ProducerStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).getTime();
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    let lifetimeGrossSales = 0;
    let thisMonthGrossSales = 0;
    let lastMonthGrossSales = 0;
    let thisMonthSalesCount = 0;
    let lastMonthSalesCount = 0;
    let thisWeekSalesCount = 0;

    sales.forEach((sale) => {
      const amt = parseFloat(sale.amount) || 0;
      lifetimeGrossSales += amt;

      if (sale.timestamp >= startOfCurrentMonth) {
        thisMonthGrossSales += amt;
        thisMonthSalesCount += 1;
      } else if (sale.timestamp >= startOfLastMonth && sale.timestamp < startOfCurrentMonth) {
        lastMonthGrossSales += amt;
        lastMonthSalesCount += 1;
      }

      if (sale.timestamp >= sevenDaysAgo) {
        thisWeekSalesCount += 1;
      }
    });

    // Producer receives 90% split of beat sales
    const totalEarned = Number((lifetimeGrossSales * 0.9).toFixed(2));
    const thisMonthEarned = Number((thisMonthGrossSales * 0.9).toFixed(2));
    const lastMonthEarned = Number((lastMonthGrossSales * 0.9).toFixed(2));

    const monthlyGrowth = calculateGrowth(thisMonthEarned, lastMonthEarned, "vs last month");
    const salesGrowth = calculateGrowth(thisMonthSalesCount, lastMonthSalesCount, "vs last month");

    // Total confirmed withdrawals
    const totalWithdrawn = withdrawals
      .filter((w) => w.status === "confirmed")
      .reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);

    // Identify top-performing beat
    let topBeat: BeatPerformance | null = null;
    if (beats.length > 0) {
      topBeat = [...beats].sort((a, b) => b.revenue - a.revenue || b.totalSales - a.totalSales)[0];
    }

    // Generate sparkline series (past 14 daily points)
    const daily14 = aggregateSalesByDay(sales, 14);
    const sparklineEarned = daily14.map((d) => d.amount * 0.9);
    const sparklineMonthly = daily14.slice(7).map((d) => d.amount * 0.9);
    const sparklineSales = daily14.map((d) => d.count);
    const sparklinePending = [
      pendingBalance * 0.4,
      pendingBalance * 0.5,
      pendingBalance * 0.7,
      pendingBalance * 0.65,
      pendingBalance * 0.85,
      pendingBalance * 0.9,
      pendingBalance,
    ];

    return {
      totalEarned,
      thisMonthEarned,
      lastMonthEarned,
      monthlyGrowth,
      pendingBalance,
      totalSales: sales.length,
      salesThisMonth: thisMonthSalesCount,
      salesGrowth,
      salesThisWeek: thisWeekSalesCount,
      totalWithdrawn,
      topBeat,
      sparklineEarned,
      sparklineMonthly,
      sparklinePending,
      sparklineSales,
    };
  }, [sales, withdrawals, beats, pendingBalance]);

  // Aggregated buckets for chart
  const salesByDay30 = useMemo(() => aggregateSalesByDay(sales, 30), [sales]);
  const salesByDay90 = useMemo(() => aggregateSalesByDay(sales, 90), [sales]);
  const salesByDay365 = useMemo(() => aggregateSalesByDay(sales, 365), [sales]);

  return {
    stats,
    beats,
    sales,
    withdrawals,
    salesByDay30,
    salesByDay90,
    salesByDay365,
    loading,
    refetch: loadData,
  };
}
