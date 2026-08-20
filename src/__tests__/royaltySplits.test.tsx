import { describe, it, expect } from "vitest";
import {
  validateSplits,
  calculateSplitPayouts,
  stroopsToXlm,
  type RoyaltySplit,
} from "../contracts/crate";

describe("Crate Royalty Splits (Issue #8)", () => {
  describe("validateSplits", () => {
    it("validates solo 100% split correctly", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...TEST", bps: 10000, role: "Producer" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(true);
      expect(result.totalBps).toBe(10000);
      expect(result.remainingBps).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it("validates 50/50 two-collaborator split", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 5000, role: "Producer" },
        { recipient: "GBJ5...COPROD", bps: 5000, role: "Co-Producer" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(true);
      expect(result.totalBps).toBe(10000);
      expect(result.remainingBps).toBe(0);
    });

    it("validates multi-party 4-collaborator split (40/30/20/10)", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...P1", bps: 4000, role: "Producer" },
        { recipient: "GBJ5...P2", bps: 3000, role: "Vocalist" },
        { recipient: "GBJ5...P3", bps: 2000, role: "Songwriter" },
        { recipient: "GBJ5...P4", bps: 1000, role: "Mixing" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(true);
      expect(result.totalBps).toBe(10000);
      expect(result.remainingBps).toBe(0);
    });

    it("rejects when splits sum to less than 100%", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 6000, role: "Producer" },
        { recipient: "GBJ5...VOCAL", bps: 2000, role: "Vocalist" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(false);
      expect(result.totalBps).toBe(8000);
      expect(result.remainingBps).toBe(2000);
      expect(result.error).toContain("must sum to exactly 100%");
    });

    it("rejects when splits sum to greater than 100%", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 7000, role: "Producer" },
        { recipient: "GBJ5...VOCAL", bps: 4000, role: "Vocalist" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(false);
      expect(result.totalBps).toBe(11000);
      expect(result.remainingBps).toBe(-1000);
      expect(result.error).toContain("must sum to exactly 100%");
    });

    it("rejects empty recipient addresses", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 5000, role: "Producer" },
        { recipient: "   ", bps: 5000, role: "Co-Producer" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Recipient address cannot be empty");
    });

    it("rejects non-positive basis points", () => {
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 10000, role: "Producer" },
        { recipient: "GBJ5...OTHER", bps: 0, role: "Other" },
      ];
      const result = validateSplits(splits);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("between 0.01% and 100%");
    });

    it("rejects empty split array", () => {
      const result = validateSplits([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("At least one recipient is required");
    });
  });

  describe("calculateSplitPayouts", () => {
    it("distributes exact 90% net revenue to solo producer", () => {
      const salePriceStroops = 100_000_000n; // 10 XLM
      const netPoolStroops = (salePriceStroops * 90n) / 100n; // 9 XLM (90_000_000n)
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 10000, role: "Producer" },
      ];

      const payouts = calculateSplitPayouts(netPoolStroops, splits);
      expect(payouts).toHaveLength(1);
      expect(payouts[0].recipient).toBe("GBJ5...PROD");
      expect(payouts[0].amountStroops).toBe(90_000_000n);
      expect(stroopsToXlm(payouts[0].amountStroops)).toBe("9.00");
    });

    it("distributes exact 50/50 shares without loss", () => {
      const netPoolStroops = 90_000_000n; // 9 XLM
      const splits: RoyaltySplit[] = [
        { recipient: "GBJ5...PROD", bps: 5000, role: "Producer" },
        { recipient: "GBJ5...VOCAL", bps: 5000, role: "Vocalist" },
      ];

      const payouts = calculateSplitPayouts(netPoolStroops, splits);
      expect(payouts).toHaveLength(2);
      expect(payouts[0].amountStroops).toBe(45_000_000n);
      expect(payouts[1].amountStroops).toBe(45_000_000n);
      expect(payouts[0].amountStroops + payouts[1].amountStroops).toBe(netPoolStroops);
    });

    it("handles 3-way split with fractional division remainder preservation", () => {
      // 100 stroops divided equally across 3 recipients (33.333% each)
      const netPoolStroops = 100n;
      const splits: RoyaltySplit[] = [
        { recipient: "A", bps: 3333, role: "P1" },
        { recipient: "B", bps: 3333, role: "P2" },
        { recipient: "C", bps: 3334, role: "P3" },
      ];

      const payouts = calculateSplitPayouts(netPoolStroops, splits);
      expect(payouts).toHaveLength(3);
      const totalDistributed = payouts.reduce((sum, p) => sum + p.amountStroops, 0n);
      expect(totalDistributed).toBe(netPoolStroops); // Exact zero rounding drift
    });
  });
});
