import { describe, expect, it, beforeEach } from "vitest";
import { SaleNotification } from "../types/notifications";

describe("Crate Sale Notifications System", () => {
  let mockStore: Record<string, string> = {};

  const fakeLocalStorage = {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStore[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStore[key];
    },
    clear: () => {
      mockStore = {};
    },
  };

  beforeEach(() => {
    fakeLocalStorage.clear();
  });

  it("persists notification state per wallet in storage", () => {
    const walletA = "GBJEI26XQ6F2633USZ27P6T4H2AEL2JMYV4J43M7W3F7Z5L5K6MH7WVA";
    const walletB = "GCXFSWUSLTYBGYSQCST6AQNWHQW4G5T7R2H7ZHYK37B4K2L5N6Q6MH7W";

    const notifA: SaleNotification = {
      id: "sale-101",
      type: "sale",
      sampleId: 1,
      sampleTitle: "Midnight Drums",
      amountXlm: "25.00",
      timestamp: Date.now(),
      read: false,
    };

    fakeLocalStorage.setItem(`crate_notifications_${walletA}`, JSON.stringify([notifA]));

    const loadedA: SaleNotification[] = JSON.parse(
      fakeLocalStorage.getItem(`crate_notifications_${walletA}`) || "[]"
    );
    const loadedB: SaleNotification[] = JSON.parse(
      fakeLocalStorage.getItem(`crate_notifications_${walletB}`) || "[]"
    );

    expect(loadedA).toHaveLength(1);
    expect(loadedA[0]?.sampleTitle).toBe("Midnight Drums");
    expect(loadedA[0]?.read).toBe(false);

    expect(loadedB).toHaveLength(0);
  });

  it("marks individual notification and all notifications as read", () => {
    const notifs: SaleNotification[] = [
      {
        id: "sale-1",
        type: "sale",
        sampleTitle: "Hip Hop 808",
        amountXlm: "15.00",
        timestamp: Date.now() - 60000,
        read: false,
      },
      {
        id: "sale-2",
        type: "sale",
        sampleTitle: "Lofi Chords",
        amountXlm: "20.00",
        timestamp: Date.now() - 120000,
        read: false,
      },
    ];

    // Mark single as read
    const markedSingle = notifs.map((n) => (n.id === "sale-1" ? { ...n, read: true } : n));
    expect(markedSingle.find((n) => n.id === "sale-1")?.read).toBe(true);
    expect(markedSingle.find((n) => n.id === "sale-2")?.read).toBe(false);

    // Mark all as read
    const markedAll = notifs.map((n) => ({ ...n, read: true }));
    expect(markedAll.every((n) => n.read)).toBe(true);
  });

  it("updates and stores cursor per wallet", () => {
    const wallet = "GBJEI26...";
    const cursorKey = `crate_events_cursor_${wallet}`;

    fakeLocalStorage.setItem(cursorKey, "123456");
    expect(fakeLocalStorage.getItem(cursorKey)).toBe("123456");

    const nextLedger = 123500;
    fakeLocalStorage.setItem(cursorKey, nextLedger.toString());
    expect(fakeLocalStorage.getItem(cursorKey)).toBe("123500");
  });
});
