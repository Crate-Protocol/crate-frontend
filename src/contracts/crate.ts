import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";

const CONTRACT_ID   = (import.meta.env.VITE_CONTRACT_ID as string) ?? "";
const RPC_URL       = (import.meta.env.VITE_RPC_URL     as string) ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASS  = (import.meta.env.VITE_NETWORK     as string) === "MAINNET"
  ? "Public Global Stellar Network ; September 2015"
  : "Test SDF Network ; September 2015";

function server() {
  return new SorobanRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });
}

async function read<T>(sourceAddress: string, op: ReturnType<Contract["call"]>): Promise<T | null> {
  const src = await server().getAccount(sourceAddress).catch(() => null);
  if (!src) return null;
  const tx = new TransactionBuilder(src, { fee: "100", networkPassphrase: NETWORK_PASS })
    .addOperation(op).setTimeout(10).build();
  const res = await server().simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(res)) return null;
  const retval = (res as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return retval ? scValToNative(retval) as T : null;
}

export async function getStats(): Promise<{ totalSamples: number; totalVolume: string }> {
  if (!CONTRACT_ID) return { totalSamples: 0, totalVolume: "0" };
  const c   = new Contract(CONTRACT_ID);
  const res = await read<[number, bigint]>(CONTRACT_ID, c.call("get_stats"));
  if (!res) return { totalSamples: 0, totalVolume: "0" };
  return { totalSamples: res[0], totalVolume: (Number(res[1]) / 1e7).toFixed(2) };
}

export async function getEarnings(address: string): Promise<number> {
  if (!CONTRACT_ID) return 0;
  const c   = new Contract(CONTRACT_ID);
  const res = await read<bigint>(address, c.call("get_earnings", new Address(address).toScVal()));
  return res ? Number(res) / 1e7 : 0;
}

export async function buildPurchaseTx(
  buyer: string, sampleId: number, tier: number
): Promise<{ preparedXdr: string }> {
  const src  = await server().getAccount(buyer);
  const c    = new Contract(CONTRACT_ID);
  const tx   = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("purchase_license",
      new Address(buyer).toScVal(),
      nativeToScVal(sampleId, { type: "u32" }),
      nativeToScVal(tier,     { type: "u32" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return { preparedXdr: prepared.toXDR() };
}

export async function buildWithdrawTx(producer: string): Promise<{ preparedXdr: string }> {
  const src  = await server().getAccount(producer);
  const c    = new Contract(CONTRACT_ID);
  const tx   = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("withdraw_earnings", new Address(producer).toScVal()))
    .setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return { preparedXdr: prepared.toXDR() };
}
