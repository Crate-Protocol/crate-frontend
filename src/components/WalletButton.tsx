import React, { useState, useRef, useEffect } from "react";
import {
  Wallet,
  LogOut,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { getWalletIcon, getWalletName } from "../utils/walletDetect";

export default function WalletButton() {
  const {
    address,
    walletId,
    walletName,
    balance,
    balances,
    isConnected,
    isLoading,
    connect,
    disconnect,
    openModal,
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isMainnet =
    (import.meta.env.VITE_NETWORK as string) === "MAINNET";
  const explorerBase = isMainnet
    ? "https://stellar.expert/explorer/public/account"
    : "https://stellar.expert/explorer/testnet/account";

  if (isLoading) {
    return (
      <button className="btn btn-secondary btn-sm" disabled>
        <div
          style={{
            width: 12,
            height: 12,
            border: "2px solid rgba(255,255,255,0.2)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        Connecting...
      </button>
    );
  }

  if (!isConnected || !address) {
    return (
      <button className="btn btn-primary btn-sm" onClick={() => connect()}>
        <Wallet size={14} />
        Connect Wallet
      </button>
    );
  }

  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
  const walletSvg = getWalletIcon(walletId);

  return (
    <div
      ref={dropdownRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        className="btn btn-secondary btn-sm"
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          gap: "8px",
          padding: "6px 12px",
        }}
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        title={`${walletName}: ${address}`}
      >
        {/* Wallet Type Icon */}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "4px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          dangerouslySetInnerHTML={{ __html: walletSvg }}
        />

        {/* Wallet Name & Short Address */}
        <span style={{ fontWeight: 600, fontSize: "13px" }}>{walletName}</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          {shortAddr}
        </span>

        {/* Live Indicator */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--success)",
            boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
            flexShrink: 0,
          }}
        />

        <ChevronDown
          size={12}
          style={{
            color: "var(--text-muted)",
            transform: dropdownOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className="card animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "300px",
            background: "#141414",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.75)",
            padding: "16px",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Header: Wallet info & status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "6px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                dangerouslySetInnerHTML={{ __html: walletSvg }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "var(--text-primary)",
                  }}
                >
                  {walletName}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: isMainnet ? "var(--success)" : "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={11} />
                  {isMainnet ? "Stellar Public" : "Stellar Testnet"}
                </div>
              </div>
            </div>

            <span
              className="badge badge-green"
              style={{ fontSize: "10px", padding: "2px 6px" }}
            >
              Connected
            </span>
          </div>

          {/* Account Address & Copy */}
          <div
            style={{
              background: "var(--surface-2)",
              borderRadius: "8px",
              padding: "10px 12px",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Stellar Address</span>
              <a
                href={`${explorerBase}/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                Explorer
                <ExternalLink size={10} />
              </a>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  wordBreak: "break-all",
                }}
              >
                {address.slice(0, 10)}...{address.slice(-10)}
              </span>

              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "rgba(34, 197, 94, 0.15)" : "transparent",
                  color: copied ? "var(--success)" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Copy full address"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Balances Section */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Coins size={12} />
              Balances
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                background: "var(--surface-2)",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>XLM (Native)</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {balance} XLM
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>USDC</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  ${balances.usdc}
                </span>
              </div>

              {parseFloat(balances.yxlm) > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>yXLM</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {balances.yxlm}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              borderTop: "1px solid var(--border)",
              paddingTop: "10px",
            }}
          >
            {/* Switch Wallet */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                openModal();
              }}
              className="btn btn-secondary btn-sm"
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "12px",
                padding: "8px",
              }}
            >
              <RefreshCw size={13} />
              Switch Wallet
            </button>

            {/* Disconnect */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                disconnect();
              }}
              className="btn btn-sm"
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "12px",
                padding: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--error)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <LogOut size={13} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
