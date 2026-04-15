import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useClaimTokens() {
  const { signAndExecute, loading } = useSignAndExecute();

  const claimTokens = useCallback(
    async (kelpId: string, pendingCoinIds: string[]) => {
      const tx = new Transaction();

      // Accept all pending coins into KELP's internal balance
      for (const coinId of pendingCoinIds) {
        tx.moveCall({
          target: `${PACKAGE_ID}::kelp::accept_payment`,
          arguments: [tx.object(kelpId), tx.object(coinId)],
          typeArguments: ["0x2::sui::SUI"],
        });
      }

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { claimTokens, loading };
}
