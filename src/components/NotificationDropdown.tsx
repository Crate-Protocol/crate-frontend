import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { SaleNotification } from "../types/notifications";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        aria-label={`Notifications (${unreadCount} unread)`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          width: "36px",
          height: "36px",
          borderRadius: "var(--radius)",
          background: isOpen ? "var(--surface-3)" : "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "var(--accent)",
              color: "#000",
              fontSize: "10px",
              fontWeight: 800,
              padding: "1px 5px",
              borderRadius: "10px",
              lineHeight: 1.2,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "320px",
            maxHeight: "420px",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
              Notifications
            </div>
            {notifications.length > 0 && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Mark read
                </button>
                <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "350px" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                }}
              >
                No sales notifications yet
              </div>
            ) : (
              notifications.map((notif: SaleNotification) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: notif.read ? "transparent" : "var(--surface-2)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "16px", marginTop: "2px" }}>
                    {notif.type === "sale" ? "💰" : "💸"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: notif.read ? 500 : 700,
                        color: "var(--text-primary)",
                        marginBottom: "2px",
                      }}
                    >
                      {notif.type === "sale" ? "License Purchased" : "Earnings Withdrawn"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {notif.sampleTitle ?? `Sample #${notif.sampleId}`}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        marginTop: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                        +{notif.amountXlm} XLM
                      </span>
                      <span>{formatTimeAgo(notif.timestamp)}</span>
                    </div>
                  </div>
                  {!notif.read && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        marginTop: "6px",
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
