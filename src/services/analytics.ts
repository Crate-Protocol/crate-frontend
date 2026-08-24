/**
 * Analytics and local storage service for Producer Earnings Dashboard.
 *
 * Scopes data per wallet address:
 * - Sales history: `crate_sales_{address}`
 * - Withdrawal history: `crate_withdrawals_{address}`
 * - Uploaded beats: `crate_uploaded_beats_{address}`
 *
 * Automatically prunes oldest records when reaching MAX_RECORDS (500).
 */

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
  amount: string;
  timestamp: number;
  status: "confirmed" | "pending";
}

export interface BeatPerformance {
  id: number;
  title: string;
  genre: string;
  bpm: number;
  totalSales: number;
  revenue: number; // in XLM
  avgPrice: number; // in XLM
  lastSold: number | null; // timestamp
  status: "Active" | "Delisted";
  isExclusive?: boolean;
}

export interface DailySalesBucket {
  date: string;
  label: string;
  amount: number;
  count: number;
  timestamp: number;
}

export interface GrowthMetric {
  percent: number;
  isPositive: boolean;
  formatted: string;
  label?: string;
}

const MAX_RECORDS = 500;
const SALES_KEY_PREFIX = "crate_sales";
const WITHDRAWALS_KEY_PREFIX = "crate_withdrawals";
const BEATS_KEY_PREFIX = "crate_uploaded_beats";

// ─── Key Helpers ─────────────────────────────────────────────────────────────

function getSalesKey(address: string): string {
  return `${SALES_KEY_PREFIX}_${address}`;
}

function getWithdrawalsKey(address: string): string {
  return `${WITHDRAWALS_KEY_PREFIX}_${address}`;
}

function getBeatsKey(address: string): string {
  return `${BEATS_KEY_PREFIX}_${address}`;
}

// ─── Default Demo Data for Seed ──────────────────────────────────────────────

const DEMO_PRODUCER_BEATS: Record<string, BeatPerformance[]> = {
  // GBBD47...
  GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5: [
    {
      id: 1,
      title: "Midnight Waves",
      genre: "Trap",
      bpm: 140,
      totalSales: 14,
      revenue: 490,
      avgPrice: 35,
      lastSold: Date.now() - 1000 * 60 * 45, // 45m ago
      status: "Active",
    },
    {
      id: 4,
      title: "Block Pressure",
      genre: "Drill",
      bpm: 148,
      totalSales: 8,
      revenue: 380,
      avgPrice: 47.5,
      lastSold: Date.now() - 1000 * 60 * 60 * 18, // 18h ago
      status: "Active",
      isExclusive: true,
    },
    {
      id: 7,
      title: "Night Walk",
      genre: "R&B",
      bpm: 95,
      totalSales: 5,
      revenue: 250,
      avgPrice: 50,
      lastSold: Date.now() - 1000 * 60 * 60 * 36, // 36h ago
      status: "Active",
      isExclusive: true,
    },
    {
      id: 8,
      title: "Detroit Flow",
      genre: "Hip-Hop",
      bpm: 92,
      totalSales: 6,
      revenue: 195,
      avgPrice: 32.5,
      lastSold: Date.now() - 1000 * 60 * 60 * 72, // 3d ago
      status: "Active",
    },
    {
      id: 11,
      title: "Phantom",
      genre: "House",
      bpm: 126,
      totalSales: 3,
      revenue: 90,
      avgPrice: 30,
      lastSold: Date.now() - 1000 * 60 * 60 * 120, // 5d ago
      status: "Active",
    },
  ],
};

function generateDemoSales(address: string, beats: BeatPerformance[]): SaleRecord[] {
  const sales: SaleRecord[] = [];
  const buyers = [
    "GCYZRXMKTWA7JY475PKO5CI3R5XS6ARMHNXWLL3HWNUOJA2VR7LBWSCU",
    "GAKWONWPGF2GZUVUOV6U67TZXYZH2AD5HVLHT2FSIY5HPZTQSQI6VPGE",
    "GD7N2VRF3QPMO6ZXY4R78KLE5V9DT6SGH2MNX89PQWZX2KLE7V9DT6SG",
    "GB3XK9872NVLE5MDT6SGQPMO6ZXY4R78KLE5V9DT6SGH2MNX89PQWZX2",
    "GC55ZXY4R78KLE5V9DT6SGH2MNX89PQWZX2KLE7V9DT6SGQPMO6ZXY4R",
  ];
  const tiers: ("lease" | "premium" | "exclusive")[] = ["lease", "lease", "premium", "lease", "exclusive"];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Generate sales over the past 45 days
  beats.forEach((beat) => {
    for (let i = 0; i < beat.totalSales; i++) {
      const daysAgo = Math.floor(Math.random() * 40);
      const timestamp = now - daysAgo * DAY_MS - Math.floor(Math.random() * DAY_MS * 0.8);
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const price = tier === "exclusive" ? 800 : tier === "premium" ? 150 : 25 + Math.floor(Math.random() * 15);
      const buyer = buyers[Math.floor(Math.random() * buyers.length)];
      const hash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      sales.push({
        txHash: hash,
        sampleId: beat.id,
        sampleTitle: beat.title,
        buyer,
        tier,
        amount: price.toFixed(2),
        token: "XLM",
        timestamp,
      });
    }
  });

  return sales.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Seed realistic initial demo data if the wallet has no stored data yet.
 */
export function ensureInitialData(address: string): void {
  if (typeof localStorage === "undefined" || !address) return;

  const salesKey = getSalesKey(address);
  const beatsKey = getBeatsKey(address);
  const withdrawalsKey = getWithdrawalsKey(address);

  // If already initialized for this address, return
  if (localStorage.getItem(salesKey) !== null) return;

  // Check if address has predefined demo beats, or generate default starter beats
  const demoBeats =
    DEMO_PRODUCER_BEATS[address] || [
      {
        id: 1,
        title: "Midnight Waves",
        genre: "Trap",
        bpm: 140,
        totalSales: 12,
        revenue: 420,
        avgPrice: 35,
        lastSold: Date.now() - 1000 * 60 * 60 * 4,
        status: "Active",
      },
      {
        id: 2,
        title: "Lagos Summer",
        genre: "Afrobeats",
        bpm: 105,
        totalSales: 9,
        revenue: 310,
        avgPrice: 34.4,
        lastSold: Date.now() - 1000 * 60 * 60 * 22,
        status: "Active",
      },
      {
        id: 5,
        title: "Cloud Study",
        genre: "Lo-Fi",
        bpm: 72,
        totalSales: 6,
        revenue: 160,
        avgPrice: 26.6,
        lastSold: Date.now() - 1000 * 60 * 60 * 55,
        status: "Active",
      },
    ];

  const demoSales = generateDemoSales(address, demoBeats);
  const now = Date.now();
  const demoWithdrawals: WithdrawalRecord[] = [
    {
      txHash: "a7c89f21b3e40d8591c20e54b689a712f5e3d09a8b1c4e7f2019384756201a4b",
      amount: "150.00",
      timestamp: now - 24 * 60 * 60 * 1000 * 14, // 14d ago
      status: "confirmed",
    },
    {
      txHash: "f9b01c3d2e4a5f6071829304152637485960718293a4b5c6d7e8f90123456789",
      amount: "280.00",
      timestamp: now - 24 * 60 * 60 * 1000 * 28, // 28d ago
      status: "confirmed",
    },
  ];

  localStorage.setItem(beatsKey, JSON.stringify(demoBeats));
  localStorage.setItem(salesKey, JSON.stringify(demoSales));
  localStorage.setItem(withdrawalsKey, JSON.stringify(demoWithdrawals));
}

/**
 * Retrieve sales history for a producer address (newest first).
 */
export function getSalesHistory(address: string): SaleRecord[] {
  if (typeof localStorage === "undefined" || !address) return [];
  ensureInitialData(address);
  try {
    const raw = localStorage.getItem(getSalesKey(address));
    return raw ? (JSON.parse(raw) as SaleRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Record a new sale for a producer.
 */
export function recordSale(address: string, sale: SaleRecord): void {
  if (typeof localStorage === "undefined" || !address) return;
  const current = getSalesHistory(address);
  // Avoid duplicate txHash
  if (current.some((s) => s.txHash === sale.txHash)) return;

  const updated = [sale, ...current].slice(0, MAX_RECORDS);
  localStorage.setItem(getSalesKey(address), JSON.stringify(updated));

  // Also update uploaded beat stats
  updateBeatSales(address, sale);
}

/**
 * Retrieve withdrawal history for a producer address.
 */
export function getWithdrawalHistory(address: string): WithdrawalRecord[] {
  if (typeof localStorage === "undefined" || !address) return [];
  ensureInitialData(address);
  try {
    const raw = localStorage.getItem(getWithdrawalsKey(address));
    return raw ? (JSON.parse(raw) as WithdrawalRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Record a withdrawal for a producer.
 */
export function recordWithdrawal(
  address: string,
  withdrawal: WithdrawalRecord
): void {
  if (typeof localStorage === "undefined" || !address) return;
  const current = getWithdrawalHistory(address);
  const updated = [withdrawal, ...current].slice(0, MAX_RECORDS);
  localStorage.setItem(getWithdrawalsKey(address), JSON.stringify(updated));
}

/**
 * Retrieve all beats uploaded by a producer.
 */
export function getUploadedBeats(address: string): BeatPerformance[] {
  if (typeof localStorage === "undefined" || !address) return [];
  ensureInitialData(address);
  try {
    const raw = localStorage.getItem(getBeatsKey(address));
    return raw ? (JSON.parse(raw) as BeatPerformance[]) : [];
  } catch {
    return [];
  }
}

/**
 * Record or add a new beat uploaded by the producer.
 */
export function recordUploadedBeat(
  address: string,
  beat: BeatPerformance
): void {
  if (typeof localStorage === "undefined" || !address) return;
  const beats = getUploadedBeats(address);
  const existingIdx = beats.findIndex((b) => b.id === beat.id);

  if (existingIdx !== -1) {
    beats[existingIdx] = { ...beats[existingIdx], ...beat };
  } else {
    beats.unshift(beat);
  }
  localStorage.setItem(getBeatsKey(address), JSON.stringify(beats));
}

/**
 * Internal: updates beat performance stats when a sale happens.
 */
function updateBeatSales(address: string, sale: SaleRecord): void {
  const beats = getUploadedBeats(address);
  const saleAmount = parseFloat(sale.amount) || 0;
  const beat = beats.find((b) => b.id === sale.sampleId);

  if (beat) {
    beat.totalSales += 1;
    beat.revenue += saleAmount;
    beat.avgPrice = beat.revenue / beat.totalSales;
    beat.lastSold = sale.timestamp;
    localStorage.setItem(getBeatsKey(address), JSON.stringify(beats));
  } else {
    // Register beat if not already in list
    beats.unshift({
      id: sale.sampleId,
      title: sale.sampleTitle,
      genre: "Trap",
      bpm: 120,
      totalSales: 1,
      revenue: saleAmount,
      avgPrice: saleAmount,
      lastSold: sale.timestamp,
      status: "Active",
    });
    localStorage.setItem(getBeatsKey(address), JSON.stringify(beats));
  }
}

// ─── Analytics Aggregations ───────────────────────────────────────────────────

/**
 * Aggregates sales into daily buckets over a given time range (e.g. 30, 90, 365 days).
 */
export function aggregateSalesByDay(
  sales: SaleRecord[],
  days: number
): DailySalesBucket[] {
  const now = new Date();
  const buckets: DailySalesBucket[] = [];
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Initialize all days in chronological order
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const dateStr = d.toISOString().split("T")[0];
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const label = `${month} ${day}`;

    buckets.push({
      date: dateStr,
      label,
      amount: 0,
      count: 0,
      timestamp: d.getTime(),
    });
  }

  // Populate sales into buckets
  const bucketMap = new Map<string, DailySalesBucket>();
  buckets.forEach((b) => bucketMap.set(b.date, b));

  const startTime = now.getTime() - days * DAY_MS;

  sales.forEach((sale) => {
    if (sale.timestamp < startTime) return;
    const saleDate = new Date(sale.timestamp).toISOString().split("T")[0];
    const bucket = bucketMap.get(saleDate);
    if (bucket) {
      const amt = parseFloat(sale.amount) || 0;
      bucket.amount += amt;
      bucket.count += 1;
    }
  });

  return buckets;
}

/**
 * Calculate percentage growth between current and previous values.
 */
export function calculateGrowth(
  current: number,
  previous: number,
  periodLabel = "vs last month"
): GrowthMetric {
  if (previous === 0) {
    if (current > 0) {
      return {
        percent: 100,
        isPositive: true,
        formatted: "+100%",
        label: periodLabel,
      };
    }
    return {
      percent: 0,
      isPositive: true,
      formatted: "0%",
      label: periodLabel,
    };
  }

  const rawChange = ((current - previous) / previous) * 100;
  const percent = Math.round(rawChange);
  const isPositive = percent >= 0;
  const formatted = `${isPositive ? "+" : ""}${percent}%`;

  return {
    percent,
    isPositive,
    formatted,
    label: periodLabel,
  };
}

/**
 * Generate smooth SVG path points for a mini sparkline chart.
 */
export function generateSparklinePoints(
  data: number[],
  width = 80,
  height = 28
): { path: string; areaPath: string } {
  if (!data || data.length === 0) {
    return { path: "", areaPath: "" };
  }

  if (data.length === 1) {
    const y = height / 2;
    return {
      path: `M 0,${y} L ${width},${y}`,
      areaPath: `M 0,${y} L ${width},${y} L ${width},${height} L 0,${height} Z`,
    };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 2;
  const usableHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return { x, y };
  });

  const path = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaPath = `${path} L ${lastPt.x.toFixed(1)},${height} L ${firstPt.x.toFixed(1)},${height} Z`;

  return { path, areaPath };
}
