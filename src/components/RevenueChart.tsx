import { useState } from "react";
import { DailyRevenuePoint } from "../services/analytics";

interface RevenueChartProps {
  data30d: DailyRevenuePoint[];
  data90d: DailyRevenuePoint[];
  data1y: DailyRevenuePoint[];
}

export default function RevenueChart({ data30d, data90d, data1y }: RevenueChartProps) {
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "1y">("30d");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: DailyRevenuePoint } | null>(null);

  const activeData =
    timeframe === "30d" ? data30d : timeframe === "90d" ? data90d : data1y;

  const totalVolume = activeData.reduce((acc, curr) => acc + curr.amount, 0);

  const width = 650;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxAmount = Math.max(...activeData.map((d) => d.amount), 10);

  // Compute SVG path coordinates
  const points = activeData.map((d, idx) => {
    const x = padding.left + (idx / Math.max(activeData.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (d.amount / maxAmount) * chartHeight;
    return { x, y, data: d };
  });

  const linePath = points.length > 0
    ? `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`
    : "";

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1]!.x},${padding.top + chartHeight} L ${points[0]!.x},${padding.top + chartHeight} Z`
    : "";

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
      }}
    >
      {/* Header with Timeframe Toggles */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
            Revenue Trends
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Total in period: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{totalVolume.toFixed(2)} XLM</span>
          </div>
        </div>

        {/* Range Selector Buttons */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-2)",
            borderRadius: "var(--radius)",
            padding: "2px",
            border: "1px solid var(--border)",
          }}
        >
          {(["30d", "90d", "1y"] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setTimeframe(period)}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: "var(--radius)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                background: timeframe === period ? "var(--surface-3)" : "transparent",
                color: timeframe === period ? "var(--text-primary)" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      {totalVolume === 0 && activeData.every((d) => d.amount === 0) ? (
        <div
          style={{
            height: "180px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            fontSize: "13px",
            gap: "8px",
          }}
        >
          <div>No sales recorded during this timeframe</div>
          <a
            href="/upload"
            style={{
              fontSize: "12px",
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            + Upload New Beats
          </a>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: "auto", minWidth: "500px" }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + chartHeight * (1 - ratio);
              const val = (maxAmount * ratio).toFixed(0);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    fill="var(--text-tertiary)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Area Path */}
            <path d={areaPath} fill="url(#revenueGradient)" />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Points */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.data.date === p.data.date ? 5 : 3}
                fill={hoveredPoint?.data.date === p.data.date ? "#fff" : "var(--accent)"}
                stroke="var(--surface-1)"
                strokeWidth="2"
                style={{ cursor: "pointer", transition: "r 0.1s" }}
                onMouseEnter={() => setHoveredPoint(p)}
              />
            ))}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                position: "absolute",
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100}%`,
                transform: "translate(-50%, -120%)",
                background: "#000",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "11px",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ color: "var(--text-secondary)" }}>{hoveredPoint.data.date}</div>
              <div style={{ color: "var(--accent)", fontWeight: 700, marginTop: "2px" }}>
                {hoveredPoint.data.amount.toFixed(2)} XLM ({hoveredPoint.data.count} sales)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
