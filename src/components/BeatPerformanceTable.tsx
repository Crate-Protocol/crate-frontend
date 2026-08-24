import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Music,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  Search,
} from "lucide-react";
import { BeatPerformance } from "../services/analytics";

interface BeatPerformanceTableProps {
  beats: BeatPerformance[];
  topBeatId?: number | null;
}

type SortField =
  | "title"
  | "genre"
  | "totalSales"
  | "revenue"
  | "avgPrice"
  | "lastSold"
  | "status";
type SortDirection = "asc" | "desc";

export default function BeatPerformanceTable({
  beats,
  topBeatId,
}: BeatPerformanceTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [search, setSearch] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredAndSortedBeats = useMemo(() => {
    return beats
      .filter((b) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q) ||
          b.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "lastSold") {
          valA = a.lastSold || 0;
          valB = b.lastSold || 0;
        }

        if (typeof valA === "string") {
          return sortDir === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortDir === "asc" ? valA - valB : valB - valA;
      });
  }, [beats, sortField, sortDir, search]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    }
    return sortDir === "asc" ? (
      <ArrowUp size={12} style={{ color: "var(--accent)" }} />
    ) : (
      <ArrowDown size={12} style={{ color: "var(--accent)" }} />
    );
  };

  function formatLastSold(timestamp: number | null): string {
    if (!timestamp) return "Never";
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div
      className="card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Table Header with Search */}
      <div
        style={{
          padding: "20px 24px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid var(--border)",
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
            <Music size={18} style={{ color: "var(--accent)" }} />
            Beat Performance
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              margin: "2px 0 0",
            }}
          >
            Metrics and sales per uploaded beat
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: "relative", minWidth: "180px" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Filter beats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{
              paddingLeft: "30px",
              paddingTop: "6px",
              paddingBottom: "6px",
              height: "32px",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: "auto" }}>
        {filteredAndSortedBeats.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            <Music size={32} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>No beats found</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              {search ? "Try a different search term." : "Upload your first beat to see performance stats."}
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.01)",
                }}
              >
                {[
                  { id: "title", label: "Beat Title" },
                  { id: "genre", label: "Genre" },
                  { id: "totalSales", label: "Sales", align: "right" },
                  { id: "revenue", label: "Revenue", align: "right" },
                  { id: "avgPrice", label: "Avg Price", align: "right" },
                  { id: "lastSold", label: "Last Sold", align: "right" },
                  { id: "status", label: "Status", align: "center" },
                ].map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.id as SortField)}
                    style={{
                      padding: "12px 16px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color:
                        sortField === col.id
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      textAlign: (col.align as any) || "left",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{col.label}</span>
                      {renderSortIcon(col.id as SortField)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedBeats.map((beat) => {
                const isTopBeat = topBeatId === beat.id;

                return (
                  <tr
                    key={beat.id}
                    onClick={() => navigate(`/sample/${beat.id}`)}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      borderLeft: isTopBeat
                        ? "3px solid var(--accent)"
                        : "3px solid transparent",
                      background: isTopBeat
                        ? "rgba(250, 204, 21, 0.03)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isTopBeat
                        ? "rgba(250, 204, 21, 0.06)"
                        : "var(--surface-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isTopBeat
                        ? "rgba(250, 204, 21, 0.03)"
                        : "transparent";
                    }}
                    title="Click to view sample details"
                  >
                    {/* Beat Title & Top Beat Badge */}
                    <td style={{ padding: "14px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {beat.title}
                        </span>

                        {isTopBeat && (
                          <span
                            className="badge badge-yellow"
                            style={{
                              fontSize: "9px",
                              padding: "1px 5px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <Sparkles size={8} />
                            Top Beat
                          </span>
                        )}

                        {beat.isExclusive && (
                          <span
                            className="badge"
                            style={{
                              fontSize: "9px",
                              padding: "1px 5px",
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                            }}
                          >
                            Exclusive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {beat.bpm} BPM
                      </div>
                    </td>

                    {/* Genre */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 500,
                          background: "var(--surface-2)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {beat.genre}
                      </span>
                    </td>

                    {/* Total Sales */}
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {beat.totalSales}
                    </td>

                    {/* Revenue */}
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--accent)",
                      }}
                    >
                      {beat.revenue.toLocaleString()} XLM
                    </td>

                    {/* Avg Price */}
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {beat.avgPrice.toFixed(1)} XLM
                    </td>

                    {/* Last Sold */}
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatLastSold(beat.lastSold)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        className={
                          beat.status === "Active"
                            ? "badge badge-green"
                            : "badge"
                        }
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                        }}
                      >
                        {beat.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
