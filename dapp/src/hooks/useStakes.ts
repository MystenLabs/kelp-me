import { useCurrentAccount, useCurrentNetwork } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";

const RPC_URLS: Record<string, string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

export interface StakeEntry {
  stakedSuiId: string;
  principal: bigint;
  stakeRequestEpoch: string;
  stakeActiveEpoch: string;
  status: "Pending" | "Active" | "Unstaked";
  estimatedReward: bigint;
  validatorAddress: string;
  stakingPool: string;
}

interface RpcStake {
  stakedSuiId: string;
  principal: string;
  stakeRequestEpoch: string;
  stakeActiveEpoch: string;
  status: "Pending" | "Active" | "Unstaked";
  estimatedReward?: string;
}

interface RpcDelegatedStake {
  validatorAddress: string;
  stakingPool: string;
  stakes: RpcStake[];
}

export function useStakes() {
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  const rpcUrl = RPC_URLS[network] ?? RPC_URLS.testnet;

  return useQuery({
    queryKey: ["stakes", network, account?.address],
    queryFn: async (): Promise<StakeEntry[]> => {
      if (!account?.address) return [];

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getStakes",
          params: [account.address],
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      const delegated: RpcDelegatedStake[] = json.result;
      const entries: StakeEntry[] = [];

      for (const group of delegated) {
        for (const s of group.stakes) {
          entries.push({
            stakedSuiId: s.stakedSuiId,
            principal: BigInt(s.principal),
            stakeRequestEpoch: s.stakeRequestEpoch,
            stakeActiveEpoch: s.stakeActiveEpoch,
            status: s.status,
            estimatedReward: BigInt(s.estimatedReward ?? "0"),
            validatorAddress: group.validatorAddress,
            stakingPool: group.stakingPool,
          });
        }
      }

      return entries;
    },
    enabled: !!account?.address,
    staleTime: 30_000,
  });
}
