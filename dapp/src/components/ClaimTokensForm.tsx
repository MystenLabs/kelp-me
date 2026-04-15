import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useClaimTokens } from "../hooks/useClaimTokens";
import { getDigest, toastTxError, toastTxSuccess } from "../lib/tx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface PendingCoin {
  objectId: string;
  balance: number;
}

export function ClaimTokensForm({ initialKelpId }: { initialKelpId?: string }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const { claimTokens, loading } = useClaimTokens();

  const [kelpId, setKelpId] = useState(initialKelpId ?? "");

  const validKelpId = kelpId.startsWith("0x") && kelpId.length >= 66;

  // Fetch pending SUI coins at the KELP object
  const {
    data: pendingCoins,
    refetch: refetchCoins,
    isRefetching: isRefetchingCoins,
  } = useQuery({
    queryKey: ["kelp-pending-coins", kelpId],
    queryFn: async () => {
      const result = await client.listCoins({
        owner: kelpId,
        coinType: "0x2::sui::SUI",
      });
      return result.objects.map(
        (coin: { objectId: string; balance: string }): PendingCoin => ({
          objectId: coin.objectId,
          balance: Number(coin.balance),
        }),
      );
    },
    enabled: !!account && validKelpId,
  });

  const pendingTotal =
    pendingCoins?.reduce((sum: number, c: PendingCoin) => sum + c.balance, 0) ??
    0;
  const pendingTotalSui = (pendingTotal / 1_000_000_000).toFixed(4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    try {
      const coinIds = pendingCoins?.map((c: PendingCoin) => c.objectId) ?? [];
      const result = await claimTokens(kelpId, coinIds);
      const digest = getDigest(result);
      toastTxSuccess("Tokens claimed successfully!", digest);
      refetchCoins();
    } catch (err) {
      toastTxError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <CardTitle>Claim Tokens</CardTitle>
            <CardDescription>
              Accept and withdraw SUI tokens that have been transferred to your
              KELP object. You must be the KELP owner to withdraw.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">KELP Object ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={kelpId}
                onChange={(e) => setKelpId(e.target.value)}
                required
                className="input flex-1"
              />
              {validKelpId && (
                <button
                  type="button"
                  onClick={() => refetchCoins()}
                  className={`icon-btn ${isRefetchingCoins ? "animate-spin" : ""}`}
                  title="Refresh pending coins"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {pendingCoins !== undefined && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3">
              <p className="text-sm text-green-200">
                <span className="font-medium">{pendingCoins.length}</span>{" "}
                pending coin{pendingCoins.length !== 1 ? "s" : ""} found (
                {pendingTotalSui} SUI)
              </p>
              {pendingCoins.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No pending coins to claim. Tokens may already be in the KELP's
                  internal balance.
                </p>
              )}
            </div>
          )}

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              This will accept all pending coins and withdraw the full SUI token
              balance to your connected wallet. Only the KELP owner can
              withdraw.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !kelpId || !account}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Claiming...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Claim All Tokens
              </span>
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
