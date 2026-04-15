import { useCurrentNetwork } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";

const RPC_URLS: Record<string, string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

export interface ValidatorInfo {
  name: string;
  suiAddress: string;
  commissionRate: number;
  stakingPoolSuiBalance: bigint;
  imageUrl: string;
  votingPower: number;
  apy: number;
}

async function rpcCall(url: string, method: string, params: unknown[] = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export function useValidators() {
  const network = useCurrentNetwork();
  const rpcUrl = RPC_URLS[network] ?? RPC_URLS.testnet;

  return useQuery({
    queryKey: ["validators", network],
    queryFn: async (): Promise<ValidatorInfo[]> => {
      const [systemState, apyResult] = await Promise.all([
        rpcCall(rpcUrl, "suix_getLatestSuiSystemState"),
        rpcCall(rpcUrl, "suix_getValidatorsApy"),
      ]);

      const apyMap = new Map<string, number>();
      for (const entry of apyResult.apys) {
        apyMap.set(entry.address, entry.apy);
      }

      return systemState.activeValidators.map(
        (v: Record<string, string>): ValidatorInfo => ({
          name: v.name,
          suiAddress: v.suiAddress,
          commissionRate: Number(v.commissionRate) / 100,
          stakingPoolSuiBalance: BigInt(v.stakingPoolSuiBalance),
          imageUrl: v.imageUrl ?? "",
          votingPower: Number(v.votingPower),
          apy: (apyMap.get(v.suiAddress) ?? 0) * 100,
        }),
      );
    },
    staleTime: 60_000,
  });
}
