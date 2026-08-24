import {
  FREIGHTER_ID,
  XBULL_ID,
  ALBEDO_ID,
  RABET_ID,
  LOBSTR_ID,
} from "@creit.tech/stellar-wallets-kit";

export const WALLET_CONNECT_ID = "wallet_connect";

export type WalletCategory = "extension" | "mobile" | "web" | "protocol";

export interface WalletOption {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  svgIcon: string;
  isInstalled: boolean;
  installUrl: string;
  description: string;
  category: WalletCategory;
  categoryLabel: string;
  isRecommended: boolean;
  recommendedBadge?: string;
  platforms: string[];
  deepLink?: string;
  mobileAction?: "deep_link" | "connect" | "qr";
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

export const WALLET_ICONS: Record<string, string> = {
  [FREIGHTER_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#1C1836"/>
    <path d="M16 6L24 16L16 26L8 16L16 6Z" fill="#7D00FF"/>
    <path d="M16 10L21 16L16 22L11 16L16 10Z" fill="#F0F0FF"/>
    <circle cx="16" cy="16" r="2.5" fill="#7D00FF"/>
  </svg>`,
  [XBULL_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#1F1316"/>
    <path d="M9 11C9 11 11 8 16 8C21 8 23 11 23 11C23 11 21 13 16 13C11 13 9 11 9 11Z" fill="#FF4343"/>
    <path d="M10 14L13 23L16 21L19 23L22 14C20 17 17.5 17.5 16 17.5C14.5 17.5 12 17 10 14Z" fill="#FF5E5E"/>
    <circle cx="13.5" cy="17.5" r="1.2" fill="#FFFFFF"/>
    <circle cx="18.5" cy="17.5" r="1.2" fill="#FFFFFF"/>
  </svg>`,
  [LOBSTR_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0C192E"/>
    <path d="M16 7C14.3431 7 13 8.34315 13 10C13 10.7417 13.2687 11.4209 13.7143 11.9482C10.9701 13.0805 9 15.8078 9 19C9 22.866 12.134 26 16 26C19.866 26 23 22.866 23 19C23 15.8078 21.0299 13.0805 18.2857 11.9482C18.7313 11.4209 19 10.7417 19 10C19 8.34315 17.6569 7 16 7Z" fill="#1976D2"/>
    <path d="M16 11C15.4477 11 15 11.4477 15 12V18C15 18.5523 15.4477 19 16 19C16.5523 19 17 18.5523 17 18V12C17 11.4477 16.5523 11 16 11Z" fill="#64B5F6"/>
    <circle cx="14" cy="15" r="1" fill="#FFFFFF"/>
    <circle cx="18" cy="15" r="1" fill="#FFFFFF"/>
  </svg>`,
  [ALBEDO_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0E1E28"/>
    <circle cx="16" cy="16" r="9" stroke="#00C0F3" stroke-width="2"/>
    <path d="M16 8L18.5 13.5L24 16L18.5 18.5L16 24L13.5 18.5L8 16L13.5 13.5L16 8Z" fill="#00C0F3"/>
    <circle cx="16" cy="16" r="2.5" fill="#FFFFFF"/>
  </svg>`,
  [RABET_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#1A1528"/>
    <path d="M12 9C12 7.89543 12.8954 7 14 7C15.1046 7 16 7.89543 16 9V17H12V9Z" fill="#8B5CF6"/>
    <path d="M16 11C16 9.89543 16.8954 9 18 9C19.1046 9 20 9.89543 20 11V17H16V11Z" fill="#A78BFA"/>
    <path d="M10 17H22C23.1046 17 24 17.8954 24 19V22C24 23.6569 22.6569 25 21 25H11C9.34315 25 8 23.6569 8 22V19C8 17.8954 8.89543 17 10 17Z" fill="#7C3AED"/>
    <circle cx="13" cy="20.5" r="1.2" fill="#FFFFFF"/>
    <circle cx="19" cy="20.5" r="1.2" fill="#FFFFFF"/>
  </svg>`,
  [WALLET_CONNECT_ID]: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#0F1F38"/>
    <path d="M10.2 13.5C13.4 10.3 18.6 10.3 21.8 13.5L22.4 14.1C22.6 14.3 22.6 14.7 22.4 14.9L20.8 16.5C20.7 16.6 20.5 16.6 20.4 16.5L19.4 15.5C17.5 13.6 14.5 13.6 12.6 15.5L11.5 16.6C11.4 16.7 11.2 16.7 11.1 16.6L9.5 15C9.3 14.8 9.3 14.4 9.5 14.2L10.2 13.5ZM24.4 16.1L25.8 17.5C26 17.7 26 18.1 25.8 18.3L20.1 24C19.9 24.2 19.5 24.2 19.3 24L16 20.7C15.9 20.6 15.8 20.6 15.7 20.7L12.4 24C12.2 24.2 11.8 24.2 11.6 24L5.9 18.3C5.7 18.1 5.7 17.7 5.9 17.5L7.3 16.1C7.5 15.9 7.9 15.9 8.1 16.1L11.4 19.4C11.5 19.5 11.7 19.5 11.8 19.4L15.1 16.1C15.3 15.9 15.7 15.9 15.9 16.1L19.2 19.4C19.3 19.5 19.5 19.5 19.6 19.4L22.9 16.1C23.1 15.9 23.5 15.9 23.7 16.1H24.4Z" fill="#3B99FC"/>
  </svg>`,
};

// ─── Environment & Device Detection ──────────────────────────────────────────

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function isFreighterInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return Boolean(win.freighter || win.freighterApi);
}

export function isXBullInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return Boolean(win.xBullSDK || win.xBull || win.xbull);
}

export function isLobstrInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return Boolean(win.lobstr || win.lobstrSigner);
}

export function isAlbedoInstalled(): boolean {
  // Albedo is web-based and always available without local extension installation
  return true;
}

export function isRabetInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as any;
  return Boolean(win.rabet);
}

export function isWalletConnectAvailable(): boolean {
  return true;
}

// ─── Mobile Deep Linking ──────────────────────────────────────────────────────

export function getLobstrDeepLink(currentUrl?: string): string {
  const target = currentUrl || (typeof window !== "undefined" ? window.location.href : "https://crate.app");
  return `lobstr://connect?url=${encodeURIComponent(target)}`;
}

export function getXBullDeepLink(currentUrl?: string): string {
  const target = currentUrl || (typeof window !== "undefined" ? window.location.href : "https://crate.app");
  return `xbull://connect?url=${encodeURIComponent(target)}`;
}

// ─── Wallet Catalog ───────────────────────────────────────────────────────────

export function getWalletDefinitions(): WalletOption[] {
  const isMobile = isMobileDevice();
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const freighterInstalled = isFreighterInstalled();
  const xbullInstalled = isXBullInstalled();
  const lobstrInstalled = isLobstrInstalled();
  const rabetInstalled = isRabetInstalled();

  return [
    {
      id: FREIGHTER_ID,
      name: "Freighter",
      shortName: "Freighter",
      icon: WALLET_ICONS[FREIGHTER_ID],
      svgIcon: WALLET_ICONS[FREIGHTER_ID],
      isInstalled: freighterInstalled,
      installUrl: "https://www.freighter.app/",
      description: "Browser extension wallet created by the Stellar Development Foundation.",
      category: "extension",
      categoryLabel: "Browser Extension",
      isRecommended: !isMobile && (freighterInstalled || (!xbullInstalled && !rabetInstalled)),
      recommendedBadge: !isMobile ? "Recommended" : undefined,
      platforms: ["Chrome", "Firefox", "Edge", "Brave"],
    },
    {
      id: XBULL_ID,
      name: "xBull Wallet",
      shortName: "xBull",
      icon: WALLET_ICONS[XBULL_ID],
      svgIcon: WALLET_ICONS[XBULL_ID],
      isInstalled: xbullInstalled,
      installUrl: "https://xbull.app/",
      description: "Cross-platform Stellar wallet for browser extension, Android, iOS, and Web.",
      category: isMobile ? "mobile" : "extension",
      categoryLabel: isMobile ? "Mobile & Web" : "Extension & Mobile",
      isRecommended: isMobile,
      recommendedBadge: isMobile ? "Mobile Choice" : undefined,
      platforms: ["Chrome", "Firefox", "iOS", "Android"],
      deepLink: getXBullDeepLink(currentUrl),
      mobileAction: isMobile && !xbullInstalled ? "deep_link" : "connect",
    },
    {
      id: LOBSTR_ID,
      name: "LOBSTR Wallet",
      shortName: "Lobstr",
      icon: WALLET_ICONS[LOBSTR_ID],
      svgIcon: WALLET_ICONS[LOBSTR_ID],
      isInstalled: lobstrInstalled,
      installUrl: "https://lobstr.co/",
      description: "Popular mobile wallet for Stellar with simple, secure mobile transactions.",
      category: "mobile",
      categoryLabel: "Mobile Wallet",
      isRecommended: isMobile,
      recommendedBadge: isMobile ? "Recommended on Mobile" : undefined,
      platforms: ["iOS", "Android", "Web"],
      deepLink: getLobstrDeepLink(currentUrl),
      mobileAction: isMobile && !lobstrInstalled ? "deep_link" : "connect",
    },
    {
      id: ALBEDO_ID,
      name: "Albedo",
      shortName: "Albedo",
      icon: WALLET_ICONS[ALBEDO_ID],
      svgIcon: WALLET_ICONS[ALBEDO_ID],
      isInstalled: true, // Always ready to use via web popup
      installUrl: "https://albedo.link/",
      description: "Web-based signer with zero installation required. Works in Safari and all browsers.",
      category: "web",
      categoryLabel: "Web (No Install)",
      isRecommended: !freighterInstalled && !xbullInstalled && !rabetInstalled && !lobstrInstalled,
      recommendedBadge: "Zero Install",
      platforms: ["Safari", "Chrome", "Firefox", "Mobile"],
    },
    {
      id: RABET_ID,
      name: "Rabet",
      shortName: "Rabet",
      icon: WALLET_ICONS[RABET_ID],
      svgIcon: WALLET_ICONS[RABET_ID],
      isInstalled: rabetInstalled,
      installUrl: "https://rabet.io/",
      description: "Fast, user-friendly browser extension wallet for the Stellar network.",
      category: "extension",
      categoryLabel: "Browser Extension",
      isRecommended: false,
      platforms: ["Chrome", "Firefox", "Brave"],
    },
    {
      id: WALLET_CONNECT_ID,
      name: "WalletConnect",
      shortName: "WalletConnect",
      icon: WALLET_ICONS[WALLET_CONNECT_ID],
      svgIcon: WALLET_ICONS[WALLET_CONNECT_ID],
      isInstalled: true,
      installUrl: "https://walletconnect.com/",
      description: "Scan QR code with 300+ mobile crypto wallets across iOS and Android.",
      category: "protocol",
      categoryLabel: "QR / Multi-Wallet",
      isRecommended: false,
      recommendedBadge: "300+ Wallets",
      platforms: ["iOS", "Android", "Desktop"],
      mobileAction: "qr",
    },
  ];
}

/**
 * Detect available wallets and return sorted array:
 * 1. Installed wallets first
 * 2. Recommended wallets next
 * 3. Others sorted by category
 */
export function detectAvailableWallets(): WalletOption[] {
  const wallets = getWalletDefinitions();

  return wallets.sort((a, b) => {
    // 1. Installed extensions first
    if (a.isInstalled && !b.isInstalled) return -1;
    if (!a.isInstalled && b.isInstalled) return 1;

    // 2. Recommended next
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;

    return 0;
  });
}

export function getWalletInfo(walletId?: string | null): WalletOption | undefined {
  if (!walletId) return undefined;
  const wallets = getWalletDefinitions();
  return wallets.find((w) => w.id.toLowerCase() === walletId.toLowerCase());
}

export function getWalletName(walletId?: string | null): string {
  const info = getWalletInfo(walletId);
  if (info) return info.shortName;
  if (!walletId) return "Wallet";
  if (walletId === FREIGHTER_ID) return "Freighter";
  if (walletId === XBULL_ID) return "xBull";
  if (walletId === LOBSTR_ID) return "Lobstr";
  if (walletId === ALBEDO_ID) return "Albedo";
  if (walletId === RABET_ID) return "Rabet";
  if (walletId === WALLET_CONNECT_ID) return "WalletConnect";
  return walletId;
}

export function getWalletIcon(walletId?: string | null): string {
  const id = walletId || FREIGHTER_ID;
  return WALLET_ICONS[id] || WALLET_ICONS[FREIGHTER_ID];
}
