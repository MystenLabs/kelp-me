import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
} from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Landmark,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useStakeSUI } from "../hooks/useStakeSUI";
import { useStakes, type StakeEntry } from "../hooks/useStakes";
import { useUnstakeSUI } from "../hooks/useUnstakeSUI";
import { useValidators, type ValidatorInfo } from "../hooks/useValidators";
import { getDigest, toastTxError, toastTxSuccess, truncate } from "../lib/tx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

const RPC_URLS: Record<string, string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

const MIST_PER_SUI = 1_000_000_000n;
const MIN_STAKE_SUI = 1;

function formatSui(mist: bigint): string {
  const whole = mist / MIST_PER_SUI;
  const frac = mist % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

type SortField = "name" | "apy" | "commission" | "stake";
type StakeSource = "wallet" | "kelp";

export function Staking() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const rpcUrl = RPC_URLS[network] ?? RPC_URLS.testnet;

  const { stakeSUI, stakeFromKelp, loading: stakeLoading } = useStakeSUI();
  const {
    unstakeSUI,
    unstakeToKelp,
    loading: unstakeLoading,
  } = useUnstakeSUI();
  const {
    data: validators,
    isLoading: validatorsLoading,
    refetch: refetchValidators,
  } = useValidators();
  const {
    data: stakes,
    isLoading: stakesLoading,
    refetch: refetchStakes,
  } = useStakes();

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ["staking-balance", account?.address],
    queryFn: async () => {
      if (!account) return 0n;
      const result = await client.getBalance({ owner: account.address });
      return BigInt(result.balance.coinBalance);
    },
    enabled: !!account,
  });

  const [selectedValidator, setSelectedValidator] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("stake");
  const [sortAsc, setSortAsc] = useState(false);
  const [unstakingId, setUnstakingId] = useState<string | null>(null);

  // KELP-specific state
  const [stakeSource, setStakeSource] = useState<StakeSource>("kelp");
  const [kelpId, setKelpId] = useState("");

  const validKelpId = kelpId.startsWith("0x") && kelpId.length >= 66;

  // Fetch pending coins at the KELP object
  const { data: pendingCoins, refetch: refetchPendingCoins } = useQuery({
    queryKey: ["kelp-staking-pending-coins", kelpId],
    queryFn: async () => {
      const result = await client.listCoins({
        owner: kelpId,
        coinType: "0x2::sui::SUI",
      });
      return result.objects.map(
        (coin: {
          objectId: string;
          version: string;
          digest: string;
          balance: string;
        }) => ({
          objectId: coin.objectId,
          version: coin.version,
          digest: coin.digest,
          balance: BigInt(coin.balance),
        }),
      );
    },
    enabled: stakeSource === "kelp" && validKelpId,
  });

  // Fetch internal KELP balance from the AccountBalance<SUI> dynamic field.
  // getBalance/listCoins only see pending coins (not yet accepted).
  // After accept_payment, the balance lives inside a dynamic field.
  const { data: kelpInternalBalance, refetch: refetchKelpBalance } = useQuery({
    queryKey: ["kelp-internal-balance", kelpId, network],
    queryFn: async (): Promise<bigint> => {
      // Step 1: List all dynamic fields on the KELP
      const listRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getDynamicFields",
          params: [kelpId, null, 50],
        }),
      });
      const listJson = await listRes.json();
      const fields: { name: { type: string }; objectId: string }[] =
        listJson.result?.data ?? [];

      // Step 2: Find the AccountBalance<SUI> field
      const suiField = fields.find(
        (f) =>
          f.name.type.includes("AccountBalance") &&
          f.name.type.includes("sui::SUI"),
      );
      if (!suiField) return 0n;

      // Step 3: Read the dynamic field object to get the Balance value
      const objRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sui_getObject",
          params: [suiField.objectId, { showContent: true }],
        }),
      });
      const objJson = await objRes.json();
      const content = objJson.result?.data?.content;
      if (!content?.fields) return 0n;

      // The DF object is Field<AccountBalance<SUI>, Balance<SUI>>
      // content.fields.value is the Balance<SUI>, which may be:
      //   - a string like "3000000000"
      //   - or an object like { fields: { value: "3000000000" } }
      const dfValue = content.fields.value;
      if (typeof dfValue === "string") return BigInt(dfValue);
      if (typeof dfValue === "object" && dfValue?.fields?.value)
        return BigInt(dfValue.fields.value);
      return 0n;
    },
    enabled: stakeSource === "kelp" && validKelpId,
    staleTime: 10_000,
  });

  const pendingCoinRefs = useMemo(
    () =>
      pendingCoins?.map((c) => ({
        objectId: c.objectId,
        version: c.version,
        digest: c.digest,
      })) ?? [],
    [pendingCoins],
  );
  const pendingTotal = useMemo(
    () => pendingCoins?.reduce((sum, c) => sum + c.balance, 0n) ?? 0n,
    [pendingCoins],
  );

  const activeBalance =
    stakeSource === "kelp"
      ? (kelpInternalBalance ?? 0n) + pendingTotal
      : (balance ?? 0n);

  const validatorMap = useMemo(() => {
    const map = new Map<string, ValidatorInfo>();
    for (const v of validators ?? []) {
      map.set(v.suiAddress, v);
    }
    return map;
  }, [validators]);

  const filteredValidators = useMemo(() => {
    let list = validators ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.suiAddress.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "apy":
          cmp = a.apy - b.apy;
          break;
        case "commission":
          cmp = a.commissionRate - b.commissionRate;
          break;
        case "stake":
          cmp =
            a.stakingPoolSuiBalance > b.stakingPoolSuiBalance
              ? 1
              : a.stakingPoolSuiBalance < b.stakingPoolSuiBalance
                ? -1
                : 0;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [validators, search, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortAsc ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidator || !amount) return;
    try {
      const amountMist = BigInt(
        Math.floor(parseFloat(amount) * Number(MIST_PER_SUI)),
      );

      let result;
      if (stakeSource === "kelp") {
        result = await stakeFromKelp(
          kelpId,
          selectedValidator,
          amountMist,
          pendingCoinRefs,
        );
      } else {
        result = await stakeSUI(selectedValidator, amountMist);
      }

      const digest = getDigest(result);
      toastTxSuccess(
        stakeSource === "kelp" ? "Staked from KELP!" : "Stake submitted!",
        digest,
      );
      setAmount("");
      setSelectedValidator("");
      refetchStakes();
      refetchBalance();
      if (stakeSource === "kelp") {
        refetchKelpBalance();
        refetchPendingCoins();
      }
    } catch (err) {
      toastTxError(err);
    }
  };

  const handleUnstake = async (stakedSuiId: string) => {
    setUnstakingId(stakedSuiId);
    try {
      let result;
      if (stakeSource === "kelp" && validKelpId) {
        result = await unstakeToKelp(stakedSuiId, kelpId);
      } else {
        result = await unstakeSUI(stakedSuiId);
      }
      const digest = getDigest(result);
      toastTxSuccess(
        stakeSource === "kelp" ? "Unstaked to KELP!" : "Unstake submitted!",
        digest,
      );
      refetchStakes();
      refetchBalance();
      if (stakeSource === "kelp") {
        refetchKelpBalance();
        refetchPendingCoins();
      }
    } catch (err) {
      toastTxError(err);
    } finally {
      setUnstakingId(null);
    }
  };

  const parsedAmount = parseFloat(amount);
  const canStake =
    selectedValidator &&
    amount &&
    parsedAmount >= MIN_STAKE_SUI &&
    (stakeSource === "wallet"
      ? balance !== undefined &&
        BigInt(Math.floor(parsedAmount * Number(MIST_PER_SUI))) <= balance
      : validKelpId &&
        activeBalance >=
          BigInt(Math.floor(parsedAmount * Number(MIST_PER_SUI))));

  const totalStaked = stakes?.reduce((sum, s) => sum + s.principal, 0n) ?? 0n;
  const totalRewards =
    stakes?.reduce((sum, s) => sum + s.estimatedReward, 0n) ?? 0n;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle>SUI Staking</CardTitle>
              <CardDescription>
                Delegate SUI to validators to earn staking rewards. Minimum
                stake: 1 SUI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="text-sm font-medium mt-1">
                {balance !== undefined ? formatSui(balance) : "--"} SUI
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Staked</p>
              <p className="text-sm font-medium mt-1">
                {formatSui(totalStaked)} SUI
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Estimated Rewards</p>
              <p className="text-sm font-medium mt-1 text-green-400">
                +{formatSui(totalRewards)} SUI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stake Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stake SUI</CardTitle>
          <CardDescription>
            Select a source, validator, and amount to stake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStake} className="space-y-4">
            {/* Source toggle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stake from</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStakeSource("kelp")}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                    stakeSource === "kelp"
                      ? "border-amber-500 bg-amber-900/20 text-amber-400"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  KELP Object
                </button>
                <button
                  type="button"
                  onClick={() => setStakeSource("wallet")}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                    stakeSource === "wallet"
                      ? "border-sui bg-sui/10 text-sui"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Wallet
                </button>
              </div>
            </div>

            {/* KELP Object ID (only when source is kelp) */}
            {stakeSource === "kelp" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">KELP Object ID</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={kelpId}
                  onChange={(e) => setKelpId(e.target.value)}
                  className="input"
                />
                {validKelpId && (
                  <div className="bg-secondary rounded-lg p-3 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        KELP Balance
                      </span>
                      <span className="text-foreground font-medium">
                        {formatSui(activeBalance)} SUI
                      </span>
                    </div>
                    {pendingTotal > 0n && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Includes {pendingCoins?.length ?? 0} pending coin
                        {(pendingCoins?.length ?? 0) !== 1 ? "s" : ""} (
                        {formatSui(pendingTotal)} SUI) — will be accepted
                        automatically.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Validator selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Validator</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search validators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-8"
                />
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto mt-2">
                {validatorsLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading validators...
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left p-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            Validator <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="text-right p-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort("apy")}
                            className="flex items-center gap-1 justify-end hover:text-foreground"
                          >
                            APY <SortIcon field="apy" />
                          </button>
                        </th>
                        <th className="text-right p-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort("commission")}
                            className="flex items-center gap-1 justify-end hover:text-foreground"
                          >
                            Comm. <SortIcon field="commission" />
                          </button>
                        </th>
                        <th className="text-right p-2 font-medium">
                          <button
                            type="button"
                            onClick={() => handleSort("stake")}
                            className="flex items-center gap-1 justify-end hover:text-foreground"
                          >
                            Total Stake <SortIcon field="stake" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredValidators.map((v) => (
                        <tr
                          key={v.suiAddress}
                          onClick={() => setSelectedValidator(v.suiAddress)}
                          className={`cursor-pointer border-b last:border-b-0 transition-colors ${
                            selectedValidator === v.suiAddress
                              ? "bg-sui/10"
                              : "hover:bg-secondary"
                          }`}
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {v.imageUrl ? (
                                <img
                                  src={v.imageUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-muted" />
                              )}
                              <span className="font-medium truncate max-w-[140px]">
                                {v.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-right text-green-400">
                            {v.apy.toFixed(2)}%
                          </td>
                          <td className="p-2 text-right">
                            {v.commissionRate.toFixed(1)}%
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {formatSui(v.stakingPoolSuiBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {selectedValidator && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected:{" "}
                  <span className="text-foreground font-medium">
                    {validatorMap.get(selectedValidator)?.name ??
                      truncate(selectedValidator)}
                  </span>
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount (SUI)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Min ${MIN_STAKE_SUI} SUI`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={MIN_STAKE_SUI}
                  step="any"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (stakeSource === "wallet") {
                      if (balance !== undefined && balance > MIST_PER_SUI) {
                        const max = balance - MIST_PER_SUI / 10n;
                        if (max > 0n) {
                          setAmount(
                            (Number(max) / Number(MIST_PER_SUI)).toFixed(4),
                          );
                        }
                      }
                    } else {
                      if (activeBalance > 0n) {
                        setAmount(
                          (
                            Number(activeBalance) / Number(MIST_PER_SUI)
                          ).toFixed(4),
                        );
                      }
                    }
                  }}
                  className="btn-secondary text-xs"
                >
                  Max
                </button>
              </div>
              {amount && parsedAmount < MIN_STAKE_SUI && (
                <p className="text-xs text-destructive-foreground">
                  Minimum stake is {MIN_STAKE_SUI} SUI
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={stakeLoading || !canStake}
              className="btn-primary w-full"
            >
              {stakeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Staking...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Landmark className="w-4 h-4" />
                  {stakeSource === "kelp"
                    ? "Stake from KELP"
                    : "Stake from Wallet"}
                </span>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Active Stakes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Your Stakes</CardTitle>
              <CardDescription>
                {stakes?.length
                  ? `${stakes.length} active stake${stakes.length !== 1 ? "s" : ""}`
                  : "No active stakes"}
                {stakeSource === "kelp" && validKelpId && (
                  <span className="ml-1">— unstaking returns to KELP</span>
                )}
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                refetchStakes();
                refetchValidators();
                refetchBalance();
                if (stakeSource === "kelp" && validKelpId) {
                  refetchKelpBalance();
                  refetchPendingCoins();
                }
              }}
              className={`icon-btn ${stakesLoading ? "animate-spin" : ""}`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {stakesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading stakes...
            </p>
          ) : !stakes?.length ? (
            <div className="text-center py-6">
              <Landmark className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                No stakes yet. Delegate SUI above to start earning rewards.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stakes.map((s: StakeEntry) => {
                const validator = validatorMap.get(s.validatorAddress);
                const isUnstaking =
                  unstakeLoading && unstakingId === s.stakedSuiId;
                return (
                  <div
                    key={s.stakedSuiId}
                    className="border rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {validator?.name ?? truncate(s.validatorAddress)}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            s.status === "Active"
                              ? "bg-green-900/30 text-green-400"
                              : s.status === "Pending"
                                ? "bg-yellow-900/30 text-yellow-400"
                                : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Principal:{" "}
                          <span className="text-foreground">
                            {formatSui(s.principal)} SUI
                          </span>
                        </span>
                        {s.estimatedReward > 0n && (
                          <span>
                            Reward:{" "}
                            <span className="text-green-400">
                              +{formatSui(s.estimatedReward)} SUI
                            </span>
                          </span>
                        )}
                        <span>Epoch: {s.stakeRequestEpoch}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnstake(s.stakedSuiId)}
                      disabled={unstakeLoading}
                      className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
                      title={
                        stakeSource === "kelp" && validKelpId
                          ? "Unstake to KELP"
                          : "Unstake to wallet"
                      }
                    >
                      {isUnstaking ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      {stakeSource === "kelp" && validKelpId
                        ? "To KELP"
                        : "Unstake"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
