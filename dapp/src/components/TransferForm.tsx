import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
} from "@mysten/dapp-kit-react";
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

const RPC_URLS: Record<string, string> = {
  mainnet: "https://fullnode.mainnet.sui.io:443",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

interface PendingCoin {
  objectId: string;
  balance: number;
}

export function TransferForm({ initialKelpId }: { initialKelpId?: string }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const rpcUrl = RPC_URLS[network] ?? RPC_URLS.testnet;
  const { transferSUI, loading } = useTransferSUI();

  const [kelpId, setKelpId] = useState(initialKelpId ?? "");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const validKelpId = kelpId.startsWith("0x") && kelpId.length >= 66;

  // Fetch the KELP object to read its fees balance
  const { data: feesBalance, refetch: refetchKelp } = useQuery({
    queryKey: ["kelp-object-fees", kelpId],
    queryFn: async () => {
      const resp = await client.getObject({
        objectId: kelpId,
        include: { json: true },
      });
      const fields = resp.object?.json as Record<string, any> | undefined;
      return Number(fields?.fees?.fields?.value ?? fields?.fees?.value ?? "0");
    },
    enabled: !!account && validKelpId,
  });

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

  // Fetch internal KELP balance from the AccountBalance<SUI> dynamic field
  const { data: internalBalance, refetch: refetchInternalBalance } = useQuery({
    queryKey: ["kelp-internal-balance", kelpId, network],
    queryFn: async (): Promise<number> => {
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

      const suiField = fields.find(
        (f) =>
          f.name.type.includes("AccountBalance") &&
          f.name.type.includes("sui::SUI"),
      );
      if (!suiField) return 0;

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
      if (!content?.fields) return 0;

      const dfValue = content.fields.value;
      if (typeof dfValue === "string") return Number(dfValue);
      if (typeof dfValue === "object" && dfValue?.fields?.value)
        return Number(dfValue.fields.value);
      return 0;
    },
    enabled: !!account && validKelpId,
    staleTime: 10_000,
  });

  const pendingTotal =
    pendingCoins?.reduce((sum: number, c: PendingCoin) => sum + c.balance, 0) ??
    0;
  const pendingTotalSui = (pendingTotal / 1_000_000_000).toFixed(4);
  const feesSui = ((feesBalance ?? 0) / 1_000_000_000).toFixed(4);
  const internalSui = ((internalBalance ?? 0) / 1_000_000_000).toFixed(4);
  const totalAvailable =
    pendingTotal + (feesBalance ?? 0) + (internalBalance ?? 0);
  const totalAvailableSui = (totalAvailable / 1_000_000_000).toFixed(4);

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
      refetchKelp();
      refetchInternalBalance();
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

          {(pendingCoins !== undefined || feesBalance !== undefined) && (
            <div className="bg-secondary rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                Fees balance:{" "}
                <span className="text-foreground font-medium">
                  {feesSui} SUI
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Internal balance:{" "}
                <span className="text-foreground font-medium">
                  {internalSui} SUI
                </span>
              </p>
              {pendingCoins !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Pending coins:{" "}
                  <span className="text-foreground font-medium">
                    {pendingCoins.length} coin
                    {pendingCoins.length !== 1 ? "s" : ""} ({pendingTotalSui}{" "}
                    SUI)
                  </span>
                </p>
              )}
              <p className="text-xs text-muted-foreground font-medium pt-1 border-t border-border mt-1">
                Total available:{" "}
                <span className="text-foreground">{totalAvailableSui} SUI</span>
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
