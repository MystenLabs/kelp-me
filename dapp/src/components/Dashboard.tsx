import {
  useCurrentAccount,
  useCurrentClient,
  useCurrentNetwork,
} from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { explorerObjectUrl, truncate } from "../lib/tx";
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

interface KelpData {
  id: string;
  owner: string;
  enabled: boolean;
  challengeWindow: string;
  revealFeeAmount: string;
  guardianCount: number;
  hasDominantReveal: boolean;
  feesBalance: string;
  createdAt?: number;
}

function parseKelpContent(objectId: string, content: any): KelpData | null {
  try {
    const fields = content?.fields || content;
    return {
      id: objectId,
      owner: fields.owner,
      enabled: fields.enabled,
      challengeWindow: fields.challenge_window,
      revealFeeAmount: fields.reveal_fee_amount,
      guardianCount: fields.guardians?.fields?.contents?.length ?? 0,
      hasDominantReveal: fields.dominant_reveal !== null,
      feesBalance: fields.fees?.fields?.value ?? "0",
    };
  } catch {
    return null;
  }
}

export function Dashboard({
  onSelectKelp,
  onNavigate,
}: {
  onSelectKelp?: (id: string) => void;
  onNavigate?: (tab: string) => void;
}) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const network = useCurrentNetwork();
  const rpcUrl = RPC_URLS[network] ?? RPC_URLS.testnet;
  const [lookupId, setLookupId] = useState("");
  const [kelpIds, setKelpIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("kelp-ids") || "[]");
    } catch {
      return [];
    }
  });

  const {
    data: balance,
    refetch: refetchBalance,
    isRefetching: isRefetchingBalance,
  } = useQuery({
    queryKey: ["balance", account?.address],
    queryFn: async () => {
      if (!account) return null;
      const result = await client.getBalance({ owner: account.address });
      return result.balance;
    },
    enabled: !!account,
  });

  const {
    data: kelps,
    refetch: refetchKelps,
    isRefetching: isRefetchingKelps,
  } = useQuery({
    queryKey: ["kelps", kelpIds, network],
    queryFn: async () => {
      if (kelpIds.length === 0) return [];
      const settled = await Promise.allSettled(
        kelpIds.map(async (id) => {
          const [resp, txResp] = await Promise.all([
            client.getObject({ objectId: id, include: { json: true } }),
            fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "suix_queryTransactionBlocks",
                params: [
                  { filter: { ChangedObject: id }, options: {} },
                  null,
                  1,
                  false,
                ],
              }),
            }).then((r) => r.json()),
          ]);
          const json = resp.object?.json;
          const kelp = json ? parseKelpContent(id, json) : null;
          if (kelp) {
            const timestampMs = txResp.result?.data?.[0]?.timestampMs;
            if (timestampMs) kelp.createdAt = Number(timestampMs);
          }
          return kelp;
        }),
      );
      return settled
        .filter(
          (r): r is PromiseFulfilledResult<KelpData | null> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value)
        .filter((v): v is KelpData => v !== null);
    },
    enabled: kelpIds.length > 0,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const addKelpId = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed || kelpIds.includes(trimmed)) return;
    const updated = [...kelpIds, trimmed];
    setKelpIds(updated);
    localStorage.setItem("kelp-ids", JSON.stringify(updated));
    setLookupId("");
    refetchKelps();
  };

  const removeKelpId = (id: string) => {
    const updated = kelpIds.filter((k) => k !== id);
    setKelpIds(updated);
    localStorage.setItem("kelp-ids", JSON.stringify(updated));
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">KELP Protocol</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          KEy-Loss Protection for Sui. Recover your account through a
          commit-reveal scheme with guardian-based verification.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-left">
          <Card>
            <CardContent className="pt-4 pb-4">
              <Shield className="w-5 h-5 text-sui mb-2" />
              <p className="text-sm font-medium mb-1">Reactive Recovery</p>
              <p className="text-xs text-muted-foreground">
                No prior setup required. Works even after key loss.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <ShieldCheck className="w-5 h-5 text-sui mb-2" />
              <p className="text-sm font-medium mb-1">Guardian Network</p>
              <p className="text-xs text-muted-foreground">
                Trusted guardians help verify recovery requests.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <ShieldAlert className="w-5 h-5 text-sui mb-2" />
              <p className="text-sm font-medium mb-1">Owner Challenge</p>
              <p className="text-xs text-muted-foreground">
                Legitimate owners can challenge false claims.
              </p>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-6">
          Connect your wallet to get started.
        </p>
      </div>
    );
  }

  const balanceSui = balance
    ? (Number(balance.balance) / 1_000_000_000).toFixed(4)
    : "...";

  return (
    <div className="space-y-6">
      {/* My KELPs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My KELPs</CardTitle>
              <CardDescription>
                Track and manage your KELP protection objects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {balanceSui} SUI
              </span>
              <button
                onClick={() => {
                  refetchBalance();
                  refetchKelps();
                }}
                className={`icon-btn ${isRefetchingBalance || isRefetchingKelps ? "animate-spin" : ""}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add KELP */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter KELP object ID (0x...)"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKelpId(lookupId)}
              className="input flex-1"
            />
            <button
              onClick={() => addKelpId(lookupId)}
              disabled={!lookupId.trim()}
              className="btn-primary px-3"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* KELP List */}
          {kelps && kelps.length > 0 ? (
            <div className="space-y-3">
              {kelps.map((kelp) => (
                <KelpCard
                  key={kelp.id}
                  kelp={kelp}
                  isOwner={kelp.owner === account.address}
                  onCopy={copyToClipboard}
                  onRemove={removeKelpId}
                  onSelect={() => onSelectKelp?.(kelp.id)}
                  onRecover={() => {
                    onSelectKelp?.(kelp.id);
                    onNavigate?.("recovery");
                  }}
                  onChallenge={() => {
                    onSelectKelp?.(kelp.id);
                    onNavigate?.("challenge");
                  }}
                />
              ))}
            </div>
          ) : kelpIds.length > 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading KELP data...
            </p>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                No KELPs tracked yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create a new KELP or paste an existing KELP object ID above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How KELP Recovery Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-0">
            {[
              {
                n: "1",
                title: "Setup",
                desc: "Create a KELP with guardians and fee parameters",
              },
              {
                n: "2",
                title: "Commit",
                desc: "Submit a hidden hash commitment (1 SUI fee)",
              },
              {
                n: "3",
                title: "Reveal",
                desc: "Guardian reveals within 2-min window",
              },
              {
                n: "4",
                title: "Claim",
                desc: "Finalize after challenge window elapses",
              },
            ].map((s, i) => (
              <div key={s.n} className="flex-1 relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                    {s.n}
                  </span>
                  {i < 3 && <div className="flex-1 h-px bg-border" />}
                </div>
                <p className="text-xs font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground pr-3">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KelpCard({
  kelp,
  isOwner,
  onCopy,
  onRemove,
  onSelect,
  onRecover,
  onChallenge,
}: {
  kelp: KelpData;
  isOwner: boolean;
  onCopy: (s: string) => void;
  onRemove: (id: string) => void;
  onSelect: () => void;
  onRecover: () => void;
  onChallenge: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 hover:border-sui/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${kelp.enabled ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}
          >
            {kelp.enabled ? "Active" : "Disabled"}
          </span>
          <code
            className="text-xs cursor-pointer hover:text-sui transition-colors break-all"
            onClick={onSelect}
          >
            {kelp.id}
          </code>
          {isOwner && (
            <span className="text-[10px] bg-sui/20 text-sui px-1.5 py-0.5 rounded">
              Owner
            </span>
          )}
          {kelp.hasDominantReveal && (
            <span className="text-[10px] bg-yellow-900/40 text-yellow-300 px-1.5 py-0.5 rounded">
              Active Claim
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={explorerObjectUrl(kelp.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => onCopy(kelp.id)} className="icon-btn">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(kelp.id)}
            className="icon-btn text-destructive-foreground"
          >
            <span className="text-sm leading-none">&times;</span>
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <div>
          Owner: <span className="text-foreground">{truncate(kelp.owner)}</span>
        </div>
        <div>
          Guardians:{" "}
          <span className="text-foreground">{kelp.guardianCount}</span>
        </div>
        <div>
          Challenge:{" "}
          <span className="text-foreground">
            {(Number(kelp.challengeWindow) / 1000).toFixed(0)}s
          </span>
        </div>
        <div>
          Reveal Fee:{" "}
          <span className="text-foreground">
            {(Number(kelp.revealFeeAmount) / 1e9).toFixed(2)} SUI
          </span>
        </div>
        <div>
          Fees:{" "}
          <span className="text-foreground">
            {(Number(kelp.feesBalance) / 1e9).toFixed(4)} SUI
          </span>
        </div>
        {kelp.createdAt && (
          <div>
            Created:{" "}
            <span className="text-foreground">
              {new Date(kelp.createdAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onRecover}
          className="btn-secondary text-xs py-1 px-2.5"
        >
          Recover
        </button>
        {isOwner && kelp.hasDominantReveal && (
          <button
            onClick={onChallenge}
            className="btn-secondary text-xs py-1 px-2.5 text-red-300"
          >
            Challenge
          </button>
        )}
      </div>
    </div>
  );
}
