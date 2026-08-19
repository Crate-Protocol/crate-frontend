import { useState } from "react";
import { Link } from "react-router-dom";
import { SampleData, stroopsToXlm } from "../contracts/crate";

interface BeatPerformanceProps {
  samples: SampleData[];
}

type SortField = "title" | "sales" | "revenue" | "bpm";

export default function BeatPerformanceTable({ samples }: BeatPerformanceProps) {
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Compute revenue approximation from lease price * total_sales
  const processedSamples = samples.map((s) => {
    const revStroops = BigInt(s.total_sales) * s.lease_price;
    const revXlm = parseFloat(stroopsToXlm(revStroops));
    return { ...s, revXlm };
  });

  const sortedSamples = [...processedSamples].sort((a, b) => {
    let diff = 0;
    if (sortField === "title") diff = a.title.localeCompare(b.title);
    else if (sortField === "sales") diff = a.total_sales - b.total_sales;
    else if (sortField === "revenue") diff = a.revXlm - b.revXlm;
    else if (sortField === "bpm") diff = a.bpm - b.bpm;
    return sortAsc ? diff : -diff;
  });

  const topBeatId = sortedSamples.length > 0
    ? [...sortedSamples].sort((a, b) => b.revXlm - a.revXlm)[0]?.id
    : null;

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        overflowX: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
          Beat Performance
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          {samples.length} beats cataloged
        </div>
      </div>

      {samples.length === 0 ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "13px",
          }}
        >
          No beats uploaded yet.{" "}
          <Link to="/upload" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            Upload your first beat
          </Link>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-tertiary)" }}>
              <th
                style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 600 }}
                onClick={() => handleSort("title")}
              >
                Beat Title {sortField === "title" && (sortAsc ? "↑" : "↓")}
              </th>
              <th style={{ padding: "10px 12px", fontWeight: 600 }}>Genre</th>
              <th
                style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 600 }}
                onClick={() => handleSort("bpm")}
              >
                BPM {sortField === "bpm" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 600, textAlign: "right" }}
                onClick={() => handleSort("sales")}
              >
                Sales {sortField === "sales" && (sortAsc ? "↑" : "↓")}
              </th>
              <th
                style={{ padding: "10px 12px", cursor: "pointer", fontWeight: 600, textAlign: "right" }}
                onClick={() => handleSort("revenue")}
              >
                Est. Revenue {sortField === "revenue" && (sortAsc ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSamples.map((sample) => {
              const isTop = sample.id === topBeatId && sample.revXlm > 0;
              return (
                <tr
                  key={sample.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    borderLeft: isTop ? "3px solid var(--accent)" : "3px solid transparent",
                    background: "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "12px", fontWeight: 600 }}>
                    <Link
                      to={`/sample/${sample.id}`}
                      style={{ color: "var(--text-primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {sample.title}
                      {isTop && <span style={{ fontSize: "10px", color: "var(--accent)" }}>👑 Top</span>}
                    </Link>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                    <span
                      style={{
                        background: "var(--surface-2)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                      }}
                    >
                      {sample.genre || "General"}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                    {sample.bpm} BPM
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                    {sample.total_sales}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>
                    {sample.revXlm.toFixed(2)} XLM
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
