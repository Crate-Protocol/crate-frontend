import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";

const NAV_LINKS = [
  { label: "Marketplace", path: "/marketplace" },
  { label: "My Beats", path: "/my-beats" },
  { label: "Upload", path: "/upload" },
  { label: "Profile", path: "/profile" },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav
      style={{
        height: "64px",
        background: "rgba(10, 10, 10, 0.95)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
                <Link
          to="/"
          style={{
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ color: "var(--accent)" }}>◈</span>
          <span style={{ color: "var(--text-primary)" }}>Crate</span>
        </Link>

        <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              aria-current={pathname === link.path ? "page" : undefined}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius)",
                fontSize: "13px",
                fontWeight: 500,
                color:
                  pathname === link.path
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                background:
                  pathname === link.path ? "var(--surface-2)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

                <WalletButton />
      </div>
    </nav>
  );
}
