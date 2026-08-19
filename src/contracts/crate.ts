import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";

export interface SampleData {
  id:              number;
  uploader:        string;
  owner:           string;
  title:           string;
  ipfs_cid:        string;
  lease_price:     bigint;
  premium_price:   bigint;
  exclusive_price: bigint;
  genre:           string;
  bpm:             number;
  is_exclusive:    boolean;
  resale_price?:   bigint;
  total_sales:     number;
}

export function stroopsToXlm(stroops: bigint): string {
  return (Number(stroops) / 1e7).toFixed(2);
}

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

export async function getStats(): Promise<{ totalSamples: number; totalVolume: string; totalProducers: number }> {
  if (!CONTRACT_ID) return { totalSamples: 0, totalVolume: "0", totalProducers: 0 };
  const c   = new Contract(CONTRACT_ID);
  const res = await read<[number, bigint, number]>(CONTRACT_ID, c.call("get_stats"));
  if (!res) return { totalSamples: 0, totalVolume: "0", totalProducers: 0 };
  return { totalSamples: res[0], totalVolume: (Number(res[1]) / 1e7).toFixed(2), totalProducers: res[2] };
}

export async function getEarnings(address: string): Promise<number> {
  if (!CONTRACT_ID) return 0;
  const c   = new Contract(CONTRACT_ID);
  const res = await read<bigint>(address, c.call("get_earnings", new Address(address).toScVal()));
  return res ? Number(res) / 1e7 : 0;
}

export async function buildPurchaseTx(
  buyer: string, sampleId: number, tokenAddress: string, tier: number
): Promise<{ preparedXdr: string }> {
  const src  = await server().getAccount(buyer);
  const c    = new Contract(CONTRACT_ID);
  const tx   = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("purchase_license",
      new Address(buyer).toScVal(),
      nativeToScVal(sampleId,     { type: "u32" }),
      new Address(tokenAddress).toScVal(),
      nativeToScVal(tier,         { type: "u32" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return { preparedXdr: prepared.toXDR() };
}

export async function buildWithdrawTx(producer: string, tokenAddress: string): Promise<{ preparedXdr: string }> {
  const src  = await server().getAccount(producer);
  const c    = new Contract(CONTRACT_ID);
  const tx   = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("withdraw_earnings",
      new Address(producer).toScVal(),
      new Address(tokenAddress).toScVal(),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return { preparedXdr: prepared.toXDR() };
}

export async function getLicense(holderAddress: string, sampleId: number): Promise<number | null> {
  if (!CONTRACT_ID) return null;
  const c = new Contract(CONTRACT_ID);
  return read<number>(
    holderAddress,
    c.call(
      "get_license",
      new Address(holderAddress).toScVal(),
      nativeToScVal(sampleId, { type: "u32" }),
    )
  );
}

export async function getSample(sourceAddress: string, sampleId: bigint | number): Promise<SampleData | null> {
  if (!CONTRACT_ID) return null;
  const c = new Contract(CONTRACT_ID);
  return read<SampleData>(sourceAddress, c.call("get_sample", nativeToScVal(Number(sampleId), { type: "u32" })));
}

export async function getSamplesByUploader(uploaderAddress: string): Promise<SampleData[]> {
  if (!CONTRACT_ID || !uploaderAddress) return [];
  try {
    const stats = await getStats();
    const samples: SampleData[] = [];
    for (let id = 1; id <= stats.totalSamples; id++) {
      const sample = await getSample(uploaderAddress, id);
      if (sample && sample.uploader === uploaderAddress) {
        samples.push(sample);
      }
    }
    return samples;
  } catch {
    return [];
  }
}

export async function submitTransaction(signed: { signedTxXdr: string }): Promise<string> {
  const { StellarBase } = await import("@stellar/stellar-sdk");
  const tx = StellarBase.TransactionEnvelope.fromXDR(signed.signedTxXdr, "base64");
  const result = await server().sendTransaction(tx as Parameters<typeof server>["prototype"]["sendTransaction"][0]);
  if (result.status === "ERROR") throw new Error("Transaction submission failed");
  return result.hash;
}

export async function uploadSample(params: {
  uploader: string; title: string; ipfsCid: string;
  priceXlm: number; genre: string; bpm: number;
}): Promise<string> {
  const src = await server().getAccount(params.uploader);
  const c   = new Contract(CONTRACT_ID);
  const stroops = BigInt(Math.round(params.priceXlm * 1e7));
  const tx  = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("upload_sample",
      new Address(params.uploader).toScVal(),
      nativeToScVal(params.title,    { type: "string" }),
      nativeToScVal(params.ipfsCid,  { type: "string" }),
      nativeToScVal(stroops,         { type: "i128" }),
      nativeToScVal(stroops * 5n,    { type: "i128" }),
      nativeToScVal(stroops * 20n,   { type: "i128" }),
      nativeToScVal(params.genre,    { type: "string" }),
      nativeToScVal(params.bpm,      { type: "u32" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return prepared.toXDR();
}

export async function purchaseSample(params: {
  buyer: string; sampleId: number; tokenAddress: string; tier?: number;
}): Promise<string> {
  const src  = await server().getAccount(params.buyer);
  const c    = new Contract(CONTRACT_ID);
  const tier = params.tier ?? 0;
  const tx   = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("purchase_license",
      new Address(params.buyer).toScVal(),
      nativeToScVal(params.sampleId,     { type: "u32" }),
      new Address(params.tokenAddress).toScVal(),
      nativeToScVal(tier,                { type: "u32" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return prepared.toXDR();
}

export async function withdrawEarnings(producer: string, tokenAddress: string): Promise<string> {
  const { preparedXdr } = await buildWithdrawTx(producer, tokenAddress);
  return preparedXdr;
}

export async function listResale(params: {
  owner: string; sampleId: number; priceXlm: number;
}): Promise<string> {
  const src = await server().getAccount(params.owner);
  const c   = new Contract(CONTRACT_ID);
  const stroops = BigInt(Math.round(params.priceXlm * 1e7));
  const tx  = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("list_resale",
      new Address(params.owner).toScVal(),
      nativeToScVal(params.sampleId, { type: "u32" }),
      nativeToScVal(stroops,         { type: "i128" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return prepared.toXDR();
}

export async function buyResale(params: {
  buyer: string; sampleId: number;
}): Promise<string> {
  const src = await server().getAccount(params.buyer);
  const c   = new Contract(CONTRACT_ID);
  const tx  = new TransactionBuilder(src, { fee: "1000000", networkPassphrase: NETWORK_PASS })
    .addOperation(c.call("buy_resale",
      new Address(params.buyer).toScVal(),
      nativeToScVal(params.sampleId, { type: "u32" }),
    )).setTimeout(300).build();
  const prepared = await server().prepareTransaction(tx);
  return prepared.toXDR();
}
