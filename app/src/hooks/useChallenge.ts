import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useChallenge() {
  const { signAndExecute, loading } = useSignAndExecute();

  const challenge = useCallback(
    async (kelpId: string) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::challenge`,
        arguments: [tx.object(kelpId)],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { challenge, loading };
}
