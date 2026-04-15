import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useCreateKelp } from "../hooks/useCreateKelp";
import {
  getCreatedSharedObjectId,
  getDigest,
  toastTxError,
  toastTxSuccess,
} from "../lib/tx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function CreateKelp({
  onCreated,
}: {
  onCreated?: (id: string) => void;
}) {
  const { createKelp, loading } = useCreateKelp();
  const [revealFee, setRevealFee] = useState("1");
  const [challengeWindow, setChallengeWindow] = useState("60000");
  const [enabled, setEnabled] = useState(true);
  const [guardianInput, setGuardianInput] = useState("");
  const [guardians, setGuardians] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState<string>();

  const addGuardian = () => {
    const addr = guardianInput.trim();
    if (!addr || guardians.includes(addr)) return;
    setGuardians([...guardians, addr]);
    setGuardianInput("");
  };

  const removeGuardian = (addr: string) => {
    setGuardians(guardians.filter((g) => g !== addr));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createKelp({
        revealFee: Math.round(Number(revealFee) * 1_000_000_000),
        challengeWindow: Number(challengeWindow),
        enabled,
        guardians,
      });

      const digest = getDigest(result);
      const kelpId = getCreatedSharedObjectId(result);

      if (kelpId) {
        const existing = JSON.parse(localStorage.getItem("kelp-ids") || "[]");
        if (!existing.includes(kelpId)) {
          existing.push(kelpId);
          localStorage.setItem("kelp-ids", JSON.stringify(existing));
        }
        setCreatedId(kelpId);
        onCreated?.(kelpId);
      }

      toastTxSuccess("KELP created successfully!", digest);
    } catch (err) {
      toastTxError(err);
    }
  };

  if (createdId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">KELP Created</h3>
          <code className="text-sm bg-secondary px-3 py-1.5 rounded-md break-all">
            {createdId}
          </code>
          <p className="text-sm text-muted-foreground mt-4">
            Your KELP has been added to the dashboard.
          </p>
          <button
            onClick={() => {
              setCreatedId(undefined);
              setGuardians([]);
            }}
            className="btn-secondary mt-4"
          >
            Create Another
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create KELP Protection</CardTitle>
        <CardDescription>
          Set up key-loss protection for your account. Choose guardians who can
          help recover access if you lose your private key.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reveal Fee (SUI)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={revealFee}
                onChange={(e) => setRevealFee(e.target.value)}
                className="input"
              />
              <p className="text-xs text-muted-foreground">
                Fee paid when revealing. Discourages false claims.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Challenge Window (ms)
              </label>
              <input
                type="number"
                min="1000"
                value={challengeWindow}
                onChange={(e) => setChallengeWindow(e.target.value)}
                className="input"
              />
              <p className="text-xs text-muted-foreground">
                Time to challenge a claim (
                {(Number(challengeWindow) / 1000).toFixed(0)}s).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 p-3 bg-secondary/50 rounded-lg">
            <div className="space-y-1">
              <label className="text-sm font-medium">Recovery Enabled</label>
              <p className="text-xs text-muted-foreground">
                When enabled, guardians can initiate account recovery. Disable
                to temporarily block all recovery attempts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                enabled ? "bg-green-600" : "bg-secondary"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-[1.125rem]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Guardians</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Guardian address (0x...)"
                value={guardianInput}
                onChange={(e) => setGuardianInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addGuardian())
                }
                className="input flex-1"
              />
              <button
                type="button"
                onClick={addGuardian}
                className="btn-secondary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {guardians.length > 0 && (
              <div className="space-y-1">
                {guardians.map((g) => (
                  <div
                    key={g}
                    className="flex items-center justify-between bg-secondary rounded-lg px-3 py-1.5 text-xs"
                  >
                    <code>
                      {g.slice(0, 16)}...{g.slice(-8)}
                    </code>
                    <button
                      type="button"
                      onClick={() => removeGuardian(g)}
                      className="p-0.5 hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Optional. If empty, anyone can initiate recovery.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              "Create KELP"
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
