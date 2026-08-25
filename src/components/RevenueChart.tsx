import React, { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Calendar, PlusCircle, Sparkles } from "lucide-react";
import { DailySalesBucket } from "../services/analytics";

interface RevenueChartProps {
  data30: DailySalesBucket[];
  data90: DailySalesBucket[];
  data365: DailySalesBucket[];
}

type Period = "30d" | "90d" | "1y";

export default function RevenueChart({
  data30,
  data90,
  data365,
}: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeData = useMemo(() => {
    switch (period) {
      case "90d":
        return data90;
      case "1y":
        return data365;
      case "30d":
      default:
        return data30;
    }
  }, [period, data30, data90, data365]);

  const { totalRevenue, averageDaily, maxAmount, hasData } = useMemo(() => {
    let sum = 0;
    let max = 0;
    activeData.forEach((d) => {
      // Producer net earnings is 90% of gross
      const net = d.amount * 0.9;
      sum += net;
      if (net > max) max = net;
    });

    const avg = activeData.length > 0 ? sum / activeData.length : 0;
    return {
      totalRevenue: Number(sum.toFixed(2)),
      averageDaily: Number(avg.toFixed(2)),
      maxAmount: max === 0 ? 100 : Math.ceil(max * 1.25),
      hasData: sum > 0,
    };
  }, [activeData]);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Compute coordinate points
  const points = useMemo(() => {
    if (!activeData.length) return [];
    return activeData.map((d, i) => {
      const net = d.amount * 0.9;
      const x = paddingLeft + (i / (activeData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (net / maxAmount) * chartHeight;
      return { x, y, net, date: d.label, count: d.count };
    });
  }, [activeData, maxAmount, chartWidth, chartHeight]);

  // Generate SVG curve and area path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };

    const line = points.reduce((acc, pt, i) => {
      return i === 0
        ? `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
        : `${acc} L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }, "");

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const groundY = paddingTop + chartHeight;

    const area = `${line} L ${lastPt.x.toFixed(1)},${groundY} L ${firstPt.x.toFixed(1)},${groundY} Z`;

    return { linePath: line, areaPath: area };
  }, [points, chartHeight]);

  // X-axis label indices (e.g. 5 labels)
  const xLabels = useMemo(() => {
    if (!points.length) return [];
    const count = 5;
    const step = Math.floor((points.length - 1) / (count - 1));
    const labels = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(i * step, points.length - 1);
      labels.push({
        x: points[idx].x,
        label: points[idx].date,
      });
    }
    return labels;
  }, [points]);

  // Y-axis ticks
  const yTicks = [
    { value: maxAmount, y: paddingTop },
    { value: Math.round(maxAmount * 0.66), y: paddingTop + chartHeight * 0.33 },
    { value: Math.round(maxAmount * 0.33), y: paddingTop + chartHeight * 0.66 },
    { value: 0, y: paddingTop + chartHeight },
  ];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scale = svgWidth / rect.width;
    const adjustedX = mouseX * scale;

    let closestIdx = 0;
    let minDistance = Infinity;

    points.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - adjustedX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div
      className="card"
      ref={containerRef}
      style={{
        padding: "24px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Header with Title & Period Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            <TrendingUp size={18} style={{ color: "var(--accent)" }} />
            Revenue Over Time
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "2px 0 0",
            }}
          >
            Producer net earnings (90% revenue share)
          </p>
        </div>

        {/* Period toggle buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {(
            [
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "1y", label: "1 Year" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                background: period === t.id ? "var(--accent)" : "transparent",
                color: period === t.id ? "#000" : "var(--text-secondary)",
                transition: "all 0.15s ease",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats in selected period */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "24px",
          flexWrap: "wrap",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total in period
          </span>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {totalRevenue.toLocaleString()} XLM
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Daily Average
          </span>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {averageDaily.toLocaleString()} XLM
          </div>
        </div>
      </div>

      {/* Main SVG Area Chart */}
      {!hasData ? (
        <div
          style={{
            height: "220px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "12px",
            border: "1px dashed var(--border)",
            padding: "24px",
            textAlign: "center",
            color: "var(--text-secondary)",
            gap: "10px",
          }}
        >
          <Sparkles size={32} style={{ color: "var(--accent)", opacity: 0.6 }} />
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              No sales data yet in this period
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Upload your beats to the marketplace to start generating sales and analytics.
            </p>
          </div>
          <Link
            to="/upload"
            className="btn btn-primary btn-sm"
            style={{ marginTop: "6px", gap: "6px" }}
          >
            <PlusCircle size={14} />
            Upload a Beat
          </Link>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", overflowX: "hidden" }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#facc15" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-axis labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke="#222222"
                  strokeWidth="1"
                  strokeDasharray={i === yTicks.length - 1 ? undefined : "3,3"}
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 4}
                  fill="#666666"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#revenueGradient)" />

            {/* Main curve line */}
            <path
              d={linePath}
              fill="none"
              stroke="#facc15"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis date labels */}
            {xLabels.map((lbl, i) => (
              <text
                key={i}
                x={lbl.x}
                y={svgHeight - 8}
                fill="#737373"
                fontSize="11"
                fontFamily="var(--font-sans)"
                textAnchor="middle"
              >
                {lbl.label}
              </text>
            ))}

            {/* Hover Indicator */}
            {hoveredPoint && (
              <g>
                {/* Vertical cursor line */}
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={paddingTop + chartHeight}
                  stroke="#facc15"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.75"
                />

                {/* Point ring and center */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="6"
                  fill="#000000"
                  stroke="#facc15"
                  strokeWidth="2.5"
                />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="2.5" fill="#facc15" />
              </g>
            )}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              style={{
                position: "absolute",
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                transform: "translate(-50%, -120%)",
                background: "#1c1c1c",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "8px 12px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
                fontSize: "12px",
              }}
            >
              <div style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "2px" }}>
                {hoveredPoint.date}
              </div>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {hoveredPoint.net.toFixed(2)} XLM
              </div>
              {hoveredPoint.count > 0 && (
                <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                  {hoveredPoint.count} sale{hoveredPoint.count > 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
