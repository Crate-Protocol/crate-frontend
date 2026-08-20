/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ID?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_NETWORK?: string;
  readonly VITE_XLM_TOKEN_ADDRESS?: string;
  readonly VITE_PINATA_JWT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
