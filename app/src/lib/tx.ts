import { toast } from "sonner";

const EXPLORER_BASE = "https://suiscan.xyz/testnet";

export function explorerObjectUrl(id: string) {
  return `${EXPLORER_BASE}/object/${id}`;
}

export function explorerTxUrl(digest: string) {
  return `${EXPLORER_BASE}/tx/${digest}`;
}

export function truncate(s: string, head = 8, tail = 6) {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

export function toastTxSuccess(message: string, digest?: string) {
  if (digest) {
    toast.success(message, {
      description: `Tx: ${truncate(digest)}`,
      action: {
        label: "View",
        onClick: () => window.open(explorerTxUrl(digest), "_blank"),
      },
      duration: 8000,
    });
  } else {
    toast.success(message);
  }
}

export function toastTxError(err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed";
  toast.error(message, { duration: 6000 });
}

/** Generate a random hex nonce for commit/reveal. */
export function generateNonce(bytes = 16): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extract transaction digest from a dAppKit result. */
export function getDigest(result: {
  $kind: string;
  Transaction?: { digest: string };
  FailedTransaction?: { digest: string };
}): string | undefined {
  return result.Transaction?.digest ?? result.FailedTransaction?.digest;
}

/** Find a newly created shared object ID from transaction effects. */
export function getCreatedSharedObjectId(result: {
  $kind: string;
  Transaction?: any;
}): string | undefined {
  const tx = result.$kind === "Transaction" ? result.Transaction : null;
  return tx?.effects?.changedObjects?.find(
    (obj: any) =>
      obj.idOperation === "Created" && obj.outputOwner?.$kind === "Shared",
  )?.objectId;
}
