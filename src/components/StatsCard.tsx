interface StatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: { percentage: number; isPositive: boolean };
  sparklineData?: number[];
  accent?: boolean;
}

export default function StatsCard({
  label,
  value,
  subValue,
  change,
  sparklineData = [],
  accent = false,
}: StatsCardProps) {
  // Generate mini SVG sparkline
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <polyline
          fill="none"
          stroke={accent ? "var(--accent)" : "#10b981"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: accent ? "1px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "120px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
          {label}
        </span>
        {renderSparkline()}
      </div>

      <div style={{ marginTop: "12px" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {value}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
          {change !== undefined && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: change.isPositive ? "#10b981" : "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              {change.isPositive ? "↑" : "↓"} {change.percentage}%
            </span>
          )}
          {subValue && (
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
