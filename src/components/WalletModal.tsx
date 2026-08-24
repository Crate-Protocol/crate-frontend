import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Globe,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  detectAvailableWallets,
  isMobileDevice,
  WalletOption,
  WALLET_CONNECT_ID,
  getLobstrDeepLink,
  getXBullDeepLink,
} from "../utils/walletDetect";
import {
  FREIGHTER_ID,
  XBULL_ID,
  LOBSTR_ID,
  ALBEDO_ID,
} from "@creit.tech/stellar-wallets-kit";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => Promise<void>;
  isConnecting: boolean;
  pendingWalletId: string | null;
  errorMessage?: string | null;
  onClearError?: () => void;
}

type FilterCategory = "all" | "extension" | "mobile" | "web";

export default function WalletModal({
  isOpen,
  onClose,
  onSelectWallet,
  isConnecting,
  pendingWalletId,
  errorMessage,
  onClearError,
}: WalletModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const isMobile = isMobileDevice();

  // Refresh wallet detection whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setWallets(detectAvailableWallets());
      if (onClearError) onClearError();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isConnecting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConnecting, onClose]);

  const filteredWallets = useMemo(() => {
    return wallets.filter((wallet) => {
      const matchesSearch =
        wallet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.platforms.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "extension") return wallet.category === "extension";
      if (selectedCategory === "mobile")
        return wallet.category === "mobile" || wallet.platforms.includes("iOS") || wallet.platforms.includes("Android");
      if (selectedCategory === "web") return wallet.category === "web" || wallet.category === "protocol";

      return true;
    });
  }, [wallets, searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleWalletClick = (wallet: WalletOption) => {
    if (isConnecting) return;
    if (onClearError) onClearError();
    onSelectWallet(wallet.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConnecting) {
          onClose();
        }
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "#111111",
          border: "1px solid #282828",
          borderRadius: "16px",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <h2
              id="wallet-modal-title"
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              Connect a Wallet
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginTop: "4px",
                margin: 0,
              }}
            >
              Choose how you would like to connect to Crate on Stellar
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isConnecting}
            aria-label="Close modal"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "6px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isConnecting ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              margin: "16px 20px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "13px",
              color: "#fca5a5",
            }}
          >
            <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0, color: "var(--error)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Connection failed</div>
              <div>{errorMessage}</div>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                style={{
                  color: "var(--text-secondary)",
                  padding: "2px",
                  borderRadius: "4px",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Search & Category Filter */}
        <div style={{ padding: "16px 20px 10px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search wallet by name or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{
                paddingLeft: "36px",
                paddingRight: searchQuery ? "32px" : "12px",
                height: "38px",
                fontSize: "13px",
                background: "var(--surface-2)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Wallets" },
              { id: "extension", label: "Browser Extensions" },
              { id: "mobile", label: "Mobile" },
              { id: "web", label: "Web / No Install" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as FilterCategory)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  transition: "all 0.15s ease",
                  background:
                    selectedCategory === cat.id ? "var(--accent)" : "var(--surface-2)",
                  color: selectedCategory === cat.id ? "#000" : "var(--text-secondary)",
                  border:
                    selectedCategory === cat.id
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wallets List / Grid */}
        <div
          style={{
            padding: "8px 20px 16px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {filteredWallets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                color: "var(--text-secondary)",
              }}
            >
              <HelpCircle size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
              <p style={{ fontSize: "14px", fontWeight: 500 }}>No wallets found matching "{searchQuery}"</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "12px" }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredWallets.map((wallet) => {
              const isCurrentConnecting = isConnecting && pendingWalletId === wallet.id;
              const isOtherConnecting = isConnecting && pendingWalletId !== wallet.id;

              return (
                <div
                  key={wallet.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: wallet.isInstalled
                      ? "rgba(255, 255, 255, 0.03)"
                      : "var(--surface-2)",
                    border: isCurrentConnecting
                      ? "1px solid var(--accent)"
                      : wallet.isRecommended
                      ? "1px solid rgba(250, 204, 21, 0.35)"
                      : "1px solid var(--border)",
                    transition: "all 0.15s ease",
                    position: "relative",
                    opacity: isOtherConnecting ? 0.5 : 1,
                    cursor: wallet.isInstalled || wallet.category === "web" || wallet.category === "protocol" ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (wallet.isInstalled || wallet.category === "web" || wallet.category === "protocol") {
                      handleWalletClick(wallet);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isOtherConnecting) {
                      e.currentTarget.style.borderColor = wallet.isRecommended
                        ? "var(--accent)"
                        : "#3a3a3a";
                      e.currentTarget.style.background = "#1c1c1c";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isCurrentConnecting
                      ? "var(--accent)"
                      : wallet.isRecommended
                      ? "rgba(250, 204, 21, 0.35)"
                      : "var(--border)";
                    e.currentTarget.style.background = wallet.isInstalled
                      ? "rgba(255, 255, 255, 0.03)"
                      : "var(--surface-2)";
                  }}
                >
                  {/* Left: Icon & Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* Wallet Icon */}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      dangerouslySetInnerHTML={{ __html: wallet.svgIcon }}
                    />

                    {/* Text Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {wallet.name}
                        </span>

                        {/* Badges */}
                        {wallet.isInstalled && (
                          <span
                            className="badge badge-green"
                            style={{ fontSize: "10px", padding: "1px 6px" }}
                          >
                            Installed
                          </span>
                        )}

                        {wallet.recommendedBadge && (
                          <span
                            className="badge badge-yellow"
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Sparkles size={9} />
                            {wallet.recommendedBadge}
                          </span>
                        )}
                      </div>

                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          margin: "2px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={wallet.description}
                      >
                        {wallet.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Connecting state spinner */}
                    {isCurrentConnecting ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--accent)",
                          padding: "6px 12px",
                        }}
                      >
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                        Connecting...
                      </div>
                    ) : wallet.isInstalled || wallet.category === "web" || wallet.category === "protocol" ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleWalletClick(wallet)}
                        disabled={isConnecting}
                        style={{
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: wallet.isRecommended ? "var(--accent)" : undefined,
                          color: wallet.isRecommended ? "#000" : "var(--text-primary)",
                          border: wallet.isRecommended ? "none" : undefined,
                        }}
                      >
                        Connect
                      </button>
                    ) : (
                      /* Not Installed: show install link or mobile deep links */
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isMobile && (wallet.id === LOBSTR_ID || wallet.id === XBULL_ID) && wallet.deepLink && (
                          <a
                            href={wallet.deepLink}
                            className="btn btn-outline btn-sm"
                            style={{
                              padding: "5px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Smartphone size={12} />
                            Open App
                          </a>
                        )}

                        <a
                          href={wallet.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: "5px 10px",
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          Install
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer / Helpful hint */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(0, 0, 0, 0.4)",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Globe size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span>
              On mobile or Safari? Use <strong>Albedo</strong> or <strong>Lobstr</strong>.
            </span>
          </div>

          <a
            href="https://developers.stellar.org/docs/tools/developer-tools/wallets"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              whiteSpace: "nowrap",
            }}
          >
            Learn more
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
