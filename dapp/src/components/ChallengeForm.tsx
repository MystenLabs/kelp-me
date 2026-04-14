import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useChallenge } from "../hooks/useChallenge";
import { getDigest, toastTxError, toastTxSuccess } from "../lib/tx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function ChallengeForm({ initialKelpId }: { initialKelpId?: string }) {
  const { challenge, loading } = useChallenge();
  const [kelpId, setKelpId] = useState(initialKelpId ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await challenge(kelpId);
      const digest = getDigest(result);
      toastTxSuccess("Challenge successful! Pending claim cancelled.", digest);
    } catch (err) {
      toastTxError(err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <CardTitle>Challenge a Claim</CardTitle>
            <CardDescription>
              Prove you still have access to your private key and cancel any
              pending recovery claim on your KELP.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">KELP Object ID</label>
            <input
              type="text"
              placeholder="0x..."
              value={kelpId}
              onChange={(e) => setKelpId(e.target.value)}
              required
              className="input"
            />
          </div>

          <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
            <p className="text-xs text-red-200">
              By challenging, you prove you still control this account. The
              pending claim will be cancelled and the accumulated fees (commit +
              reveal) become yours.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !kelpId}
            className="w-full py-2.5 bg-destructive text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Challenging...
              </span>
            ) : (
              "Challenge Claim"
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
