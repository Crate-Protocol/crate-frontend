import { useState, useEffect, useCallback } from "react";
import { connectEvmWallet, getEvmAddress, getChainById } from "../services/cctp";

const EVM_WALLET_KEY = "crate_evm_wallet";
const EVM_CHAIN_KEY = "crate_evm_chain";

interface EVMWalletState {
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useEVMWallet(): EVMWalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setConnecting] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(EVM_WALLET_KEY);
    const savedChain = localStorage.getItem(EVM_CHAIN_KEY);
    if (saved && saved.startsWith("0x")) {
      setAddress(saved);
      if (savedChain) setChainId(parseInt(savedChain, 10));
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        setAddress(null);
        setChainId(null);
        localStorage.removeItem(EVM_WALLET_KEY);
        localStorage.removeItem(EVM_CHAIN_KEY);
      } else {
        setAddress(accounts[0]);
        localStorage.setItem(EVM_WALLET_KEY, accounts[0]);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const newChainId = parseInt(args[0] as string, 16);
      setChainId(newChainId);
      localStorage.setItem(EVM_CHAIN_KEY, String(newChainId));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const { address: addr, chainId: cid } = await connectEvmWallet();
      setAddress(addr);
      setChainId(cid);
      localStorage.setItem(EVM_WALLET_KEY, addr);
      localStorage.setItem(EVM_CHAIN_KEY, String(cid));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    localStorage.removeItem(EVM_WALLET_KEY);
    localStorage.removeItem(EVM_CHAIN_KEY);
  }, []);

  const chainName = chainId ? getChainById(chainId)?.shortName ?? `Chain ${chainId}` : null;

  return {
    address,
    chainId,
    chainName,
    isConnected: address !== null,
    isConnecting,
    connect,
    disconnect,
  };
}
