import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_TOKENS, getUSDPrice, formatUSD } from "../services/pricing";
import type { TokenBalances } from "../hooks/useWallet";

interface TokenSelectorProps {
  selected: string;
  onSelect: (tokenCode: string) => void;
  balances: TokenBalances;
}

const BALANCE_MAP: Record<string, keyof TokenBalances> = {
  XLM: "native",
  USDC: "usdc",
  yXLM: "yxlm",
};

export function TokenSelector({ selected, onSelect, balances }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all(
      Object.keys(SUPPORTED_TOKENS).map(async (key) => {
        const token = SUPPORTED_TOKENS[key];
        const price = await getUSDPrice(token.code);
        return [token.code, price] as const;
      })
    ).then((entries) => setPrices(Object.fromEntries(entries)));
  }, []);

  const currentToken = SUPPORTED_TOKENS[selected] ?? SUPPORTED_TOKENS.native;
  const currentBalance = balances[BALANCE_MAP[currentToken.code] ?? "native"];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "8px 12px",
          cursor: "pointer",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          minWidth: 140,
        }}
      >
        <span>{currentToken.icon}</span>
        <span>{currentToken.code}</span>
        <span style={{ color: "#525252", fontSize: 11, marginLeft: "auto" }}>
          {currentBalance}
        </span>
        <ChevronDown size={14} color="#525252" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}
        >
          {Object.entries(SUPPORTED_TOKENS).map(([key, token]) => {
            const bal = balances[BALANCE_MAP[token.code] ?? "native"];
            const usdPrice = prices[token.code];
            const isSelected = token.code === currentToken.code;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelect(key === "native" ? "native" : token.code);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  background: isSelected ? "rgba(250,204,21,0.1)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 13,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#111";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{token.icon}</span>
                <span style={{ fontWeight: 600 }}>{token.code}</span>
                <span style={{ marginLeft: "auto", color: "#525252", fontSize: 11 }}>
                  {bal}
                </span>
                {usdPrice !== undefined && (
                  <span style={{ color: "#737373", fontSize: 10 }}>
                    {formatUSD(usdPrice)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
