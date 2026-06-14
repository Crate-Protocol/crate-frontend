import { Wallet, LogOut } from "lucide-react";
import { useWallet } from "../hooks/useWallet";

export default function WalletButton() {
  const { address, isConnected, isLoading, connect, disconnect } = useWallet();

  if (isLoading) {
    return (
      <button className="btn btn-secondary btn-sm" disabled>
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button className="btn btn-primary btn-sm" onClick={connect}>
        <Wallet size={13} />
        Connect Wallet
      </button>
    );
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className="btn btn-secondary btn-sm"
        style={{
          border: "1px solid var(--accent)",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
        }}
        onClick={disconnect}
        title="Click to disconnect"
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--success)",
            flexShrink: 0,
          }}
        />
        {shortAddr}
        <LogOut size={11} />
      </button>
    </div>
  );
}
