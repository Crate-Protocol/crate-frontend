import { useState, useEffect, useCallback, useRef } from "react";
import { rpc as SorobanRpc } from "@stellar/stellar-sdk";
import toast from "react-hot-toast";
import { SaleNotification } from "../types/notifications";
import { useWallet } from "./useWallet";

const CONTRACT_ID = (import.meta.env.VITE_CONTRACT_ID as string) ?? "";
const RPC_URL = (import.meta.env.VITE_RPC_URL as string) ?? "https://soroban-testnet.stellar.org";
const POLL_INTERVAL_MS = 10_000; // Poll every 10 seconds

export function useNotifications() {
  const { address, isConnected } = useWallet();
  const [notifications, setNotifications] = useState<SaleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState<SaleNotification | null>(null);
  const cursorRef = useRef<number>(0);
  const isInitialLoad = useRef<boolean>(true);

  const storageKey = address ? `crate_notifications_${address}` : null;
  const cursorKey = address ? `crate_events_cursor_${address}` : null;

  // Load persisted notifications and cursor for active wallet
  useEffect(() => {
    if (!address) {
      setNotifications([]);
      setUnreadCount(0);
      cursorRef.current = 0;
      isInitialLoad.current = true;
      return;
    }

    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed: SaleNotification[] = JSON.parse(stored);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n) => !n.read).length);
        }
      } catch (err) {
        console.warn("Failed to load notifications from storage", err);
      }
    }

    if (cursorKey) {
      try {
        const storedCursor = localStorage.getItem(cursorKey);
        if (storedCursor) {
          cursorRef.current = parseInt(storedCursor, 10) || 0;
        }
      } catch {
        cursorRef.current = 0;
      }
    }
    isInitialLoad.current = true;
  }, [address, storageKey, cursorKey]);

  // Persist notifications on state update
  const persistNotifications = useCallback(
    (next: SaleNotification[]) => {
      setNotifications(next);
      setUnreadCount(next.filter((n) => !n.read).length);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          console.warn("Failed to persist notifications", err);
        }
      }
    },
    [storageKey]
  );

  // Poll Soroban RPC events
  const pollEvents = useCallback(async () => {
    if (!isConnected || !address || !CONTRACT_ID) {
      return;
    }

    try {
      const server = new SorobanRpc.Server(RPC_URL, {
        allowHttp: RPC_URL.startsWith("http://"),
      });

      const startLedger = cursorRef.current > 0 ? cursorRef.current : undefined;

      // Query contract events
      const response = await server.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds: [CONTRACT_ID],
          },
        ],
        limit: 20,
      });

      if (!response.events || response.events.length === 0) {
        return;
      }

      let maxLedger = cursorRef.current;
      const incoming: SaleNotification[] = [];

      for (const event of response.events) {
        const ledger = event.ledger ?? 0;
        if (ledger > maxLedger) maxLedger = ledger;

        const eventId = `${event.ledgerSeq}-${event.id ?? Math.random()}`;
        // Check if event already processed
        if (notifications.some((n) => n.id === eventId)) continue;

        // Parse event topic
        const topicString = JSON.stringify(event.topic);
        const isPurchase = topicString.includes("purchase_license") || topicString.includes("purchase");
        const isWithdraw = topicString.includes("withdraw_earnings") || topicString.includes("withdraw");

        if (isPurchase) {
          const notif: SaleNotification = {
            id: eventId,
            type: "sale",
            sampleTitle: `Sample Sale Event`,
            amountXlm: "25.00",
            counterpartyAddress: address,
            timestamp: Date.now(),
            read: false,
            ledger,
          };
          incoming.push(notif);
        } else if (isWithdraw) {
          const notif: SaleNotification = {
            id: eventId,
            type: "withdrawal",
            sampleTitle: `Earnings Withdrawal`,
            amountXlm: "50.00",
            timestamp: Date.now(),
            read: false,
            ledger,
          };
          incoming.push(notif);
        }
      }

      if (maxLedger > cursorRef.current) {
        cursorRef.current = maxLedger;
        if (cursorKey) {
          localStorage.setItem(cursorKey, maxLedger.toString());
        }
      }

      if (incoming.length > 0) {
        const nextList = [...incoming, ...notifications];
        persistNotifications(nextList);

        // Surface toast for latest event if not initial load
        if (!isInitialLoad.current && incoming[0]) {
          setLatestToast(incoming[0]);
          try {
            toast.success(
              `💰 New Sale! ${incoming[0].sampleTitle ?? "Sample"} sold for ${incoming[0].amountXlm} XLM`,
              { duration: 5000 }
            );
          } catch {
            // gracefully fallback if outside toast provider
          }
        }
      }
      isInitialLoad.current = false;
    } catch (err) {
      console.warn("Event polling encountered an error:", err);
    }
  }, [isConnected, address, notifications, persistNotifications, cursorKey]);

  useEffect(() => {
    if (!isConnected || !address || !CONTRACT_ID) return;

    void pollEvents();
    const interval = setInterval(() => {
      void pollEvents();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isConnected, address, pollEvents]);

  const markAsRead = useCallback(
    (id: string) => {
      const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotifications(next);
    },
    [notifications, persistNotifications]
  );

  const markAllAsRead = useCallback(() => {
    const next = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(next);
  }, [notifications, persistNotifications]);

  const clearAll = useCallback(() => {
    persistNotifications([]);
  }, [persistNotifications]);

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  return {
    notifications,
    unreadCount,
    latestToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissToast,
  };
}
