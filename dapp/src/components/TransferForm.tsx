import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { useTransferSUI } from "../hooks/useTransferSUI";
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

export function TransferForm({ initialKelpId }: { initialKelpId?: string }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const { transferSUI, loading } = useTransferSUI();

  const [kelpId, setKelpId] = useState(initialKelpId ?? "");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

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
    try {
      const coinIds = pendingCoins?.map((c: PendingCoin) => c.objectId) ?? [];
      const amountMist = Math.floor(parseFloat(amount) * 1_000_000_000);
      const result = await transferSUI(kelpId, recipient, amountMist, coinIds);
      const digest = getDigest(result);
      toastTxSuccess("Transfer successful!", digest);
      setRecipient("");
      setAmount("");
      refetchCoins();
    } catch (err) {
      toastTxError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sui/20 border border-sui/40 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-sui" />
          </div>
          <div>
            <CardTitle>Transfer Tokens</CardTitle>
            <CardDescription>
              Withdraw SUI from your KELP object and send it to another address.
              Pending coins are automatically absorbed before withdrawal.
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
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Pending coins at KELP:{" "}
                <span className="text-foreground font-medium">
                  {pendingCoins.length} coin
                  {pendingCoins.length !== 1 ? "s" : ""} ({pendingTotalSui} SUI)
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These will be absorbed into the KELP balance before withdrawal.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Recipient Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (SUI)</label>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="any"
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !kelpId ||
              !recipient ||
              !amount ||
              parseFloat(amount) <= 0
            }
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Transferring...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Transfer
              </span>
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
