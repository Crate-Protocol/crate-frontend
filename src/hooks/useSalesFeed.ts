import { useState, useEffect, useCallback, useRef } from "react";
import { getSalesHistory, recordSale, SaleRecord } from "../services/analytics";
import toast from "react-hot-toast";

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function useSalesFeed(address: string | null) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleCount, setNewSaleCount] = useState(0);
  const lastKnownTxRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchSales = useCallback(() => {
    if (!address) {
      setSales([]);
      setLoading(false);
      return;
    }

    const currentRecords = getSalesHistory(address);

    if (currentRecords.length > 0) {
      const latestTx = currentRecords[0].txHash;

      // Check if there are newly arrived sales
      if (
        !isFirstLoadRef.current &&
        lastKnownTxRef.current &&
        latestTx !== lastKnownTxRef.current
      ) {
        const lastIdx = currentRecords.findIndex(
          (r) => r.txHash === lastKnownTxRef.current
        );
        const newItems = lastIdx !== -1 ? currentRecords.slice(0, lastIdx) : [currentRecords[0]];

        if (newItems.length > 0) {
          setNewSaleCount((prev) => prev + newItems.length);
          const newest = newItems[0];
          toast.success(
            `🎉 New sale! "${newest.sampleTitle}" (${newest.tier.toUpperCase()}) for ${newest.amount} XLM`,
            { duration: 5000 }
          );
        }
      }

      lastKnownTxRef.current = latestTx;
    }

    isFirstLoadRef.current = false;
    setSales(currentRecords);
    setLoading(false);
  }, [address]);

  // Initial fetch and visibility-aware polling
  useEffect(() => {
    isFirstLoadRef.current = true;
    lastKnownTxRef.current = null;
    setNewSaleCount(0);
    fetchSales();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(fetchSales, POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSales();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchSales]);

  const markAsRead = useCallback(() => {
    setNewSaleCount(0);
  }, []);

  const addNewSale = useCallback(
    (sale: SaleRecord) => {
      if (!address) return;
      recordSale(address, sale);
      fetchSales();
    },
    [address, fetchSales]
  );

  return {
    sales: sales.slice(0, 20), // Last 20 sales
    allSales: sales,
    newSaleCount,
    loading,
    markAsRead,
    addNewSale,
    refetch: fetchSales,
  };
}
