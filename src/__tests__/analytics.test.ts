import { describe, expect, it, beforeEach } from "vitest";
import {
  aggregateSalesByDay,
  calculateGrowth,
  SaleRecord,
} from "../services/analytics";

describe("Analytics Service", () => {
  it("calculates percentage growth correctly", () => {
    expect(calculateGrowth(120, 100)).toEqual({ percentage: 20, isPositive: true });
    expect(calculateGrowth(80, 100)).toEqual({ percentage: 20, isPositive: false });
    expect(calculateGrowth(50, 0)).toEqual({ percentage: 100, isPositive: true });
    expect(calculateGrowth(0, 0)).toEqual({ percentage: 0, isPositive: true });
  });

  it("aggregates sales into daily buckets over a 30-day period", () => {
    const now = Date.now();
    const mockHistory: SaleRecord[] = [
      {
        txHash: "tx1",
        sampleId: 1,
        sampleTitle: "Beat 1",
        buyer: "GBJEI...",
        tier: "lease",
        amount: "25.00",
        token: "NATIVE",
        timestamp: now - 86400000 * 2, // 2 days ago
      },
      {
        txHash: "tx2",
        sampleId: 2,
        sampleTitle: "Beat 2",
        buyer: "GCXF...",
        tier: "premium",
        amount: "100.00",
        token: "NATIVE",
        timestamp: now - 86400000 * 2, // 2 days ago (same day)
      },
      {
        txHash: "tx3",
        sampleId: 3,
        sampleTitle: "Beat 3",
        buyer: "GDHG...",
        tier: "exclusive",
        amount: "500.00",
        token: "NATIVE",
        timestamp: now - 86400000 * 5, // 5 days ago
      },
    ];

    const buckets = aggregateSalesByDay(mockHistory, 30);
    expect(buckets).toHaveLength(30);

    const twoDaysAgoKey = new Date(now - 86400000 * 2).toISOString().split("T")[0]!;
    const fiveDaysAgoKey = new Date(now - 86400000 * 5).toISOString().split("T")[0]!;

    const twoDaysBucket = buckets.find((b) => b.date === twoDaysAgoKey);
    expect(twoDaysBucket?.amount).toBe(125.0);
    expect(twoDaysBucket?.count).toBe(2);

    const fiveDaysBucket = buckets.find((b) => b.date === fiveDaysAgoKey);
    expect(fiveDaysBucket?.amount).toBe(500.0);
    expect(fiveDaysBucket?.count).toBe(1);
  });
});
