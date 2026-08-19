import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./useWallet";
import { getEarnings, getSamplesByUploader, SampleData } from "../contracts/crate";
import {
  aggregateSalesByDay,
  calculateGrowth,
  getStoredSales,
  getStoredWithdrawals,
  SaleRecord,
  WithdrawalRecord,
} from "../services/analytics";

export function useProducerStats() {
  const { address, isConnected } = useWallet();
  const [samples, setSamples] = useState<SampleData[]>([]);
  const [pendingBalance, setPendingBalance] = useState("0.00");
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [withdrawalsHistory, setWithdrawalsHistory] = useState<WithdrawalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!address) {
      setSamples([]);
      setPendingBalance("0.00");
      setSalesHistory([]);
      setWithdrawalsHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch pending earnings from contract
      const earningsNum = await getEarnings(address);
      setPendingBalance(earningsNum.toFixed(2));

      // 2. Fetch producer's uploaded samples
      const uploadedSamples = await getSamplesByUploader(address);
      setSamples(uploadedSamples);

      // 3. Load local sales and withdrawals
      const sales = getStoredSales(address);
      const withdrawals = getStoredWithdrawals(address);

      setSalesHistory(sales);
      setWithdrawalsHistory(withdrawals);
    } catch (err) {
      console.warn("Failed to load producer dashboard statistics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate metrics
  const totalSalesCount = samples.reduce((acc, s) => acc + s.total_sales, 0);

  // Calculate this month's earnings vs prior month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const priorMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  let thisMonthTotal = 0;
  let priorMonthTotal = 0;

  for (const s of salesHistory) {
    const amt = parseFloat(s.amount) || 0;
    if (s.timestamp >= currentMonthStart) {
      thisMonthTotal += amt;
    } else if (s.timestamp >= priorMonthStart && s.timestamp < currentMonthStart) {
      priorMonthTotal += amt;
    }
  }

  const monthlyGrowth = calculateGrowth(thisMonthTotal, priorMonthTotal);

  // Total historical earnings (withdrawals + pending)
  const totalWithdrawn = withdrawalsHistory.reduce(
    (acc, w) => acc + (parseFloat(w.amount) || 0),
    0
  );
  const totalEarned = (totalWithdrawn + parseFloat(pendingBalance)).toFixed(2);

  // Chart data
  const data30d = aggregateSalesByDay(salesHistory, 30);
  const data90d = aggregateSalesByDay(salesHistory, 90);
  const data1y = aggregateSalesByDay(salesHistory, 365);

  return {
    isLoading,
    isConnected,
    address,
    samples,
    totalEarned,
    thisMonthEarnings: thisMonthTotal.toFixed(2),
    pendingBalance,
    totalSalesCount,
    monthlyGrowth,
    data30d,
    data90d,
    data1y,
    salesHistory,
    withdrawalsHistory,
    refresh: loadData,
  };
}
