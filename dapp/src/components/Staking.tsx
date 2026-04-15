import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
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

const MIST_PER_SUI = 1_000_000_000n;
const MIN_STAKE_SUI = 1;

function formatSui(mist: bigint): string {
  const whole = mist / MIST_PER_SUI;
  const frac = mist % MIST_PER_SUI;
  const fracStr = frac.toString().padStart(9, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

type SortField = "name" | "apy" | "commission" | "stake";

export function Staking() {
  const account = useCurrentAccount();
  const client = useCurrentClient();

  const { stakeSUI, loading: stakeLoading } = useStakeSUI();
  const { unstakeSUI, loading: unstakeLoading } = useUnstakeSUI();
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
      const result = await stakeSUI(selectedValidator, amountMist);
      const digest = getDigest(result);
      toastTxSuccess("Stake submitted!", digest);
      setAmount("");
      setSelectedValidator("");
      refetchStakes();
      refetchBalance();
    } catch (err) {
      toastTxError(err);
    }
  };

  const handleUnstake = async (stakedSuiId: string) => {
    setUnstakingId(stakedSuiId);
    try {
      const result = await unstakeSUI(stakedSuiId);
      const digest = getDigest(result);
      toastTxSuccess("Unstake submitted!", digest);
      refetchStakes();
      refetchBalance();
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
    balance !== undefined &&
    BigInt(Math.floor(parsedAmount * Number(MIST_PER_SUI))) <= balance;

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
              <p className="text-xs text-muted-foreground">Available Balance</p>
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
            Select a validator and enter the amount to stake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStake} className="space-y-4">
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
                    if (balance !== undefined && balance > MIST_PER_SUI) {
                      // Leave 0.1 SUI for gas
                      const max = balance - MIST_PER_SUI / 10n;
                      if (max > 0n) {
                        setAmount(
                          (Number(max) / Number(MIST_PER_SUI)).toFixed(4),
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
                  Stake SUI
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
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                refetchStakes();
                refetchValidators();
                refetchBalance();
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
                      title="Unstake"
                    >
                      {isUnstaking ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      Unstake
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
