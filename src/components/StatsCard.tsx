import React, { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { generateSparklinePoints, GrowthMetric } from "../services/analytics";

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  growth?: GrowthMetric;
  sparkline?: number[];
  icon?: ReactNode;
  badge?: string;
  accentColor?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: ReactNode;
  };
}

export default function StatsCard({
  title,
  value,
  unit,
  subtext,
  growth,
  sparkline = [],
  icon,
  badge,
  accentColor = "var(--accent)",
  action,
}: StatsCardProps) {
  const sparklineColor =
    growth && !growth.isPositive && growth.percent !== 0
      ? "var(--error)"
      : accentColor;

  const { path, areaPath } = generateSparklinePoints(sparkline, 88, 28);
  const sparkId = React.useId().replace(/:/g, "_");

  return (
    <div
      className="card"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        position: "relative",
        overflow: "hidden",
        minHeight: "148px",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {icon && (
            <span
              style={{
                color: accentColor,
                display: "flex",
                alignItems: "center",
              }}
            >
              {icon}
            </span>
          )}
          {title}
        </div>

        {badge && (
          <span
            className="badge"
            style={{
              fontSize: "10px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            display: "flex",
            alignItems: "baseline",
            gap: "4px",
          }}
        >
          <span>{value}</span>
          {unit && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {unit}
            </span>
          )}
        </div>
        {subtext && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              marginTop: "2px",
            }}
          >
            {subtext}
          </div>
        )}
      </div>

      {/* Bottom Row: Growth Trend & Sparkline or Action Button */}
      {action ? (
        <div style={{ marginTop: "4px" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            style={{
              width: "100%",
              height: "32px",
              fontSize: "12px",
              fontWeight: 600,
              gap: "6px",
            }}
          >
            {action.icon}
            {action.loading ? "Processing..." : action.label}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginTop: "auto",
          }}
        >
          {/* Trend Badge */}
          {growth ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color:
                  growth.percent === 0
                    ? "var(--text-muted)"
                    : growth.isPositive
                    ? "var(--success)"
                    : "var(--error)",
              }}
            >
              {growth.percent === 0 ? (
                <Minus size={13} />
              ) : growth.isPositive ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              <span>{growth.formatted}</span>
              {growth.label && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 400,
                    color: "var(--text-muted)",
                    marginLeft: "2px",
                  }}
                >
                  {growth.label}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              All-time metric
            </div>
          )}

          {/* Mini Sparkline Chart */}
          {path ? (
            <svg
              width="88"
              height="28"
              viewBox="0 0 88 28"
              fill="none"
              style={{ overflow: "visible", flexShrink: 0 }}
            >
              <defs>
                <linearGradient id={`grad_${sparkId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#grad_${sparkId})`}
              />
              <path
                d={path}
                stroke={sparklineColor}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </div>
      )}
    </div>
  );
}
