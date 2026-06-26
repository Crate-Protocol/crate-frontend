import { useState, useEffect, useCallback } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
} from "@creit.tech/stellar-wallets-kit";
import { Horizon } from "@stellar/stellar-sdk";

const NETWORK = (import.meta.env.VITE_NETWORK as string) === "MAINNET"
  ? WalletNetwork.PUBLIC
  : WalletNetwork.TESTNET;

const HORIZON_URL = (import.meta.env.VITE_HORIZON_URL as string)
  ?? "https://horizon-testnet.stellar.org";

const WALLET_KEY       = "crate_wallet";
const DISCONNECTED_KEY = "crate_wallet_disconnected";

let kit: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kit) {
    kit = new StellarWalletsKit({
      network: NETWORK,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule()],
    });
  }
  return kit;
}

interface WalletState {
  address: string | null;
  balance: string;
  isConnecting: boolean;
  isLoading: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<{ signedTxXdr: string }>;
}

export function useWallet(): WalletState {
  const [address, setAddress]         = useState<string | null>(null);
  const [balance, setBalance]         = useState("0");
  const [isConnecting, setConnecting] = useState(false);

  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const server  = new Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(addr);
      const native  = account.balances.find(b => b.asset_type === "native");
      setBalance(native ? parseFloat(native.balance).toFixed(2) : "0");
    } catch { setBalance("0"); }
  }, []);

  useEffect(() => {
    // Respect an explicit disconnect across refreshes — some mobile browsers
    // (Safari iOS, certain Android) keep the Freighter session alive, so we
    // must not auto-reconnect while this flag is set.
    if (localStorage.getItem(DISCONNECTED_KEY) === "true") return;

    const saved = localStorage.getItem(WALLET_KEY);
    if (saved && /^G[A-Z2-7]{55}$/.test(saved)) {
      setAddress(saved);
      void fetchBalance(saved);
    } else if (saved) {
      localStorage.removeItem(WALLET_KEY);
    }
  }, [fetchBalance]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await getKit().openModal({ onWalletSelected: async (option) => {
        getKit().setWallet(option.id);
        const { address: addr } = await getKit().getAddress();
        setAddress(addr);
        localStorage.setItem(WALLET_KEY, addr);
        // Explicit reconnect — re-enable auto-connect on future refreshes.
        localStorage.removeItem(DISCONNECTED_KEY);
        await fetchBalance(addr);
      }});
    } finally { setConnecting(false); }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    kit = null;
    setAddress(null);
    setBalance("0");
    localStorage.removeItem(WALLET_KEY);
    // Persist intent to stay disconnected across refreshes.
    localStorage.setItem(DISCONNECTED_KEY, "true");
  }, []);

  const signTransaction = useCallback(async (xdr: string) => {
    const { signedTxXdr } = await getKit().signTransaction(xdr, { network: NETWORK });
    return { signedTxXdr };
  }, []);

  const isConnected = address !== null;
  const isLoading   = isConnecting;
  return { address, balance, isConnecting, isLoading, isConnected, connect, disconnect, signTransaction };
}
