import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  XBULL_ID,
  xBullModule,
  ALBEDO_ID,
  AlbedoModule,
  RABET_ID,
  RabetModule,
  LOBSTR_ID,
  LobstrModule,
  ModuleInterface,
} from "@creit.tech/stellar-wallets-kit";
import {
  WalletConnectModule,
  WALLET_CONNECT_ID,
  WalletConnectAllowedMethods,
} from "@creit.tech/stellar-wallets-kit/modules/walletconnect.module";
import { Horizon } from "@stellar/stellar-sdk";
import toast from "react-hot-toast";
import { USDC_ISSUER, YXLM_ISSUER } from "../constants/tokens";
import { getWalletName } from "../utils/walletDetect";
import WalletModal from "../components/WalletModal";

const NETWORK =
  (import.meta.env.VITE_NETWORK as string) === "MAINNET"
    ? WalletNetwork.PUBLIC
    : WalletNetwork.TESTNET;

const HORIZON_URL =
  (import.meta.env.VITE_HORIZON_URL as string) ??
  "https://horizon-testnet.stellar.org";

const WC_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || undefined;

export interface TokenBalances {
  native: string;
  usdc: string;
  yxlm: string;
}

const WALLET_KEY = "crate_wallet";
const WALLET_ID_KEY = "crate_wallet_id";
const DISCONNECTED_KEY = "crate_wallet_disconnected";

let kit: StellarWalletsKit | null = null;

function buildModules(): ModuleInterface[] {
  const modules: ModuleInterface[] = [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new RabetModule(),
    new LobstrModule(),
  ];

  if (WC_PROJECT_ID) {
    modules.push(
      new WalletConnectModule({
        projectId: WC_PROJECT_ID,
        name: "Crate",
        description: "Decentralized audio sample marketplace on Stellar",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://crate.app",
        icons: [
          typeof window !== "undefined"
            ? `${window.location.origin}/crate-logo.svg`
            : "https://crate.app/crate-logo.svg",
        ],
        method: WalletConnectAllowedMethods.SIGN,
        network: NETWORK,
      })
    );
  }

  return modules;
}

export function getKit(): StellarWalletsKit {
  if (!kit) {
    const savedWalletId =
      (typeof localStorage !== "undefined"
        ? localStorage.getItem(WALLET_ID_KEY)
        : null) || FREIGHTER_ID;

    kit = new StellarWalletsKit({
      network: NETWORK,
      selectedWalletId: savedWalletId,
      modules: buildModules(),
    });
  }
  return kit;
}

export interface WalletState {
  address: string | null;
  walletId: string | null;
  walletName: string;
  balance: string;
  balances: TokenBalances;
  isConnecting: boolean;
  pendingWalletId: string | null;
  isLoading: boolean;
  isConnected: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  connect: (target?: unknown) => Promise<void> | void;
  connectToWallet: (walletId: string) => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [balance, setBalance] = useState("0");
  const [balances, setBalances] = useState<TokenBalances>({
    native: "0",
    usdc: "0",
    yxlm: "0",
  });
  const [isConnecting, setConnecting] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const server = new Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(addr);

      const native = account.balances.find((b) => b.asset_type === "native");
      const nativeBal = native ? parseFloat(native.balance).toFixed(2) : "0";
      setBalance(nativeBal);

      const usdc = account.balances.find(
        (b) =>
          b.asset_type !== "native" &&
          "asset_code" in b &&
          b.asset_code === "USDC" &&
          "asset_issuer" in b &&
          b.asset_issuer === USDC_ISSUER
      );
      const yxlm = account.balances.find(
        (b) =>
          b.asset_type !== "native" &&
          "asset_code" in b &&
          b.asset_code === "yXLM" &&
          "asset_issuer" in b &&
          b.asset_issuer === YXLM_ISSUER
      );

      setBalances({
        native: nativeBal,
        usdc: usdc ? parseFloat(usdc.balance).toFixed(2) : "0",
        yxlm: yxlm ? parseFloat(yxlm.balance).toFixed(2) : "0",
      });
    } catch {
      setBalance("0");
      setBalances({ native: "0", usdc: "0", yxlm: "0" });
    }
  }, []);

  // Restore saved wallet on mount
  useEffect(() => {
    if (localStorage.getItem(DISCONNECTED_KEY) === "true") return;

    const savedAddr = localStorage.getItem(WALLET_KEY);
    const savedId = localStorage.getItem(WALLET_ID_KEY) || FREIGHTER_ID;

    if (savedAddr && /^G[A-Z2-7]{55}$/.test(savedAddr)) {
      setAddress(savedAddr);
      setWalletId(savedId);
      getKit().setWallet(savedId);
      void fetchBalance(savedAddr);
    } else if (savedAddr) {
      localStorage.removeItem(WALLET_KEY);
      localStorage.removeItem(WALLET_ID_KEY);
    }
  }, [fetchBalance]);

  const openModal = useCallback(() => {
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (!isConnecting) {
      setIsModalOpen(false);
      setErrorMessage(null);
      setPendingWalletId(null);
    }
  }, [isConnecting]);

  const connectToWallet = useCallback(
    async (targetWalletId: string) => {
      setConnecting(true);
      setPendingWalletId(targetWalletId);
      setErrorMessage(null);

      try {
        if (targetWalletId === WALLET_CONNECT_ID && !WC_PROJECT_ID) {
          throw new Error(
            "WalletConnect requires VITE_WALLETCONNECT_PROJECT_ID to be configured. Please set this environment variable or choose another wallet."
          );
        }

        const activeKit = getKit();
        activeKit.setWallet(targetWalletId);

        const { address: addr } = await activeKit.getAddress();
        if (!addr) {
          throw new Error("No public key returned by the wallet.");
        }

        setAddress(addr);
        setWalletId(targetWalletId);
        localStorage.setItem(WALLET_KEY, addr);
        localStorage.setItem(WALLET_ID_KEY, targetWalletId);
        localStorage.removeItem(DISCONNECTED_KEY);

        await fetchBalance(addr);
        setIsModalOpen(false);
        toast.success(`Connected to ${getWalletName(targetWalletId)}`);
      } catch (err: any) {
        console.error("Wallet connection failed:", err);
        const msg =
          err?.message ||
          "Failed to connect wallet. Please ensure the wallet is unlocked and try again.";
        setErrorMessage(msg);
        toast.error(msg);
      } finally {
        setConnecting(false);
        setPendingWalletId(null);
      }
    },
    [fetchBalance]
  );

  const connect = useCallback(
    (targetWalletId?: unknown) => {
      if (typeof targetWalletId === "string" && targetWalletId) {
        return connectToWallet(targetWalletId);
      }
      openModal();
    },
    [connectToWallet, openModal]
  );

  const disconnect = useCallback(async () => {
    try {
      if (kit && typeof (kit as any).disconnect === "function") {
        await (kit as any).disconnect();
      }
    } catch {
      // ignore errors on disconnect
    }
    kit = null;
    setAddress(null);
    setWalletId(null);
    setBalance("0");
    setBalances({ native: "0", usdc: "0", yxlm: "0" });
    localStorage.removeItem(WALLET_KEY);
    localStorage.removeItem(WALLET_ID_KEY);
    localStorage.setItem(DISCONNECTED_KEY, "true");
    toast.success("Wallet disconnected");
  }, []);

  const signTransaction = useCallback(async (xdr: string) => {
    const activeKit = getKit();
    const { signedTxXdr } = await activeKit.signTransaction(xdr, {
      networkPassphrase: NETWORK,
    });
    return { signedTxXdr };
  }, []);

  const isConnected = address !== null;
  const isLoading = isConnecting;
  const walletName = getWalletName(walletId);

  const contextValue: WalletState = {
    address,
    walletId,
    walletName,
    balance,
    balances,
    isConnecting,
    pendingWalletId,
    isLoading,
    isConnected,
    isModalOpen,
    openModal,
    closeModal,
    connect,
    connectToWallet,
    disconnect,
    signTransaction,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
      <WalletModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSelectWallet={connectToWallet}
        isConnecting={isConnecting}
        pendingWalletId={pendingWalletId}
        errorMessage={errorMessage}
        onClearError={() => setErrorMessage(null)}
      />
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
