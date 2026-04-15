import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ArrowLeft, ArrowRight, Check, Dice5, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCommit } from "../hooks/useCommit";
import { useClaim } from "../hooks/useClaim";
import { useReveal } from "../hooks/useReveal";
import {
  generateNonce,
  getDigest,
  toastTxError,
  toastTxSuccess,
  truncate,
} from "../lib/tx";
import { REVEAL_WINDOW_MS } from "../config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type Step = "commit" | "reveal" | "claim";

const steps: { id: Step; label: string; num: number }[] = [
  { id: "commit", num: 1, label: "Commit" },
  { id: "reveal", num: 2, label: "Reveal" },
  { id: "claim", num: 3, label: "Claim" },
];

export function RecoveryFlow({ initialKelpId }: { initialKelpId?: string }) {
  const account = useCurrentAccount();
  const { commit, loading: commitLoading } = useCommit();
  const { reveal, loading: revealLoading } = useReveal();
  const { claim, loading: claimLoading } = useClaim();

  const [step, setStep] = useState<Step>("commit");
  const [kelpAddress, setKelpAddress] = useState(initialKelpId ?? "");
  const [claimant, setClaimant] = useState("");
  const [nonce, setNonce] = useState("");
  const [commitDigest, setCommitDigest] = useState<string>();
  const [commitTime, setCommitTime] = useState<number>();
  const [revealDigest, setRevealDigest] = useState<string>();
  const [countdown, setCountdown] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Auto-fill claimant with current address
  useEffect(() => {
    if (account?.address && !claimant) {
      setClaimant(account.address);
    }
  }, [account?.address, claimant]);

  // Countdown timer for reveal window
  useEffect(() => {
    if (commitTime && step === "reveal") {
      const update = () => {
        const elapsed = Date.now() - commitTime;
        const remaining = Math.max(0, REVEAL_WINDOW_MS - elapsed);
        setCountdown(remaining);
        if (remaining === 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => clearInterval(intervalRef.current);
    }
    setCountdown(null);
  }, [commitTime, step]);

  const handleGenerateNonce = () => setNonce(generateNonce());

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await commit(kelpAddress, claimant, nonce);
      const digest = getDigest(result);
      setCommitDigest(digest);
      setCommitTime(Date.now());
      toastTxSuccess("Commit submitted! Proceed to Reveal.", digest);
      setStep("reveal");
    } catch (err) {
      toastTxError(err);
    }
  };

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await reveal(kelpAddress, claimant, nonce);
      const digest = getDigest(result);
      setRevealDigest(digest);
      toastTxSuccess(
        "Reveal successful! Challenge window is now active.",
        digest,
      );
      setStep("claim");
    } catch (err) {
      toastTxError(err);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await claim(kelpAddress);
      const digest = getDigest(result);
      toastTxSuccess("Claim successful! Ownership transferred.", digest);
    } catch (err) {
      toastTxError(err);
    }
  };

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                step === s.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : i < currentStepIdx
                    ? "bg-green-900/30 text-green-400 border border-green-700/50"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < currentStepIdx ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs font-bold">
                  {s.num}
                </span>
              )}
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Commit */}
      {step === "commit" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Commit</CardTitle>
            <CardDescription>
              Submit a hash commitment to begin recovery. This hides your intent
              until the Reveal step, preventing front-running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCommit} className="space-y-4">
              <Field
                label="KELP Address"
                description="The KELP object protecting the account you want to recover."
              >
                <input
                  type="text"
                  placeholder="0x..."
                  value={kelpAddress}
                  onChange={(e) => setKelpAddress(e.target.value)}
                  required
                  className="input"
                />
              </Field>

              <Field
                label="Claimant Address"
                description="Address that will become the new owner."
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={claimant}
                    onChange={(e) => setClaimant(e.target.value)}
                    required
                    className="input flex-1"
                  />
                  {account?.address && account.address !== claimant && (
                    <button
                      type="button"
                      onClick={() => setClaimant(account.address)}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Use Wallet
                    </button>
                  )}
                </div>
              </Field>

              <Field
                label="Nonce"
                description="A secret value used to hide the commitment. Must be the same in the Reveal step."
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter or generate a random nonce"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    required
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateNonce}
                    className="btn-secondary flex items-center gap-1.5"
                    title="Generate random nonce"
                  >
                    <Dice5 className="w-4 h-4" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </div>
              </Field>

              <SubmitButton
                loading={commitLoading}
                disabled={!kelpAddress || !claimant || !nonce}
              >
                Submit Commit (1 SUI fee)
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Reveal */}
      {step === "reveal" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Step 2: Reveal
              {countdown !== null && <CountdownBadge remaining={countdown} />}
            </CardTitle>
            <CardDescription>
              Reveal your commitment within the 2-minute window. Must be called
              by a registered guardian (or anyone if no guardians are set).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReveal} className="space-y-4">
              {commitDigest && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-xs text-green-200">
                    Commit submitted: {truncate(commitDigest)}
                  </p>
                </div>
              )}

              <Field label="KELP Address">
                <input
                  type="text"
                  value={kelpAddress}
                  onChange={(e) => setKelpAddress(e.target.value)}
                  required
                  className="input"
                />
              </Field>

              <Field label="Claimant Address">
                <input
                  type="text"
                  value={claimant}
                  onChange={(e) => setClaimant(e.target.value)}
                  required
                  className="input"
                />
              </Field>

              <Field label="Nonce">
                <input
                  type="text"
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                  required
                  className="input"
                />
              </Field>

              {countdown !== null && countdown === 0 && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
                  <p className="text-xs text-red-200">
                    The reveal window has expired. You will need to submit a new
                    Commit.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("commit")}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <SubmitButton
                  loading={revealLoading}
                  disabled={
                    !kelpAddress || !claimant || !nonce || countdown === 0
                  }
                  className="flex-1"
                >
                  Submit Reveal (1 SUI fee)
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Claim */}
      {step === "claim" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Claim</CardTitle>
            <CardDescription>
              Finalize the ownership transfer. The challenge window must have
              fully elapsed and the original owner must not have challenged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaim} className="space-y-4">
              {revealDigest && (
                <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-xs text-green-200">
                    Reveal submitted: {truncate(revealDigest)}
                  </p>
                </div>
              )}

              <Field label="KELP Address">
                <input
                  type="text"
                  value={kelpAddress}
                  onChange={(e) => setKelpAddress(e.target.value)}
                  required
                  className="input"
                />
              </Field>

              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  The claim will succeed only if you are the dominant claimant,
                  the challenge window has elapsed, and the owner has not
                  challenged.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("reveal")}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <SubmitButton
                  loading={claimLoading}
                  disabled={!kelpAddress}
                  className="flex-1"
                >
                  Claim Ownership
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---- Shared sub-components ---- */

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function SubmitButton({
  loading,
  disabled,
  children,
  className,
}: {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity ${className ?? "w-full"}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function CountdownBadge({ remaining }: { remaining: number }) {
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = remaining < 30_000;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${
        remaining === 0
          ? "bg-red-900/40 text-red-300"
          : isUrgent
            ? "bg-yellow-900/40 text-yellow-300"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      <Timer className="w-3 h-3" />
      {remaining === 0
        ? "Expired"
        : `${minutes}:${secs.toString().padStart(2, "0")}`}
    </span>
  );
}
