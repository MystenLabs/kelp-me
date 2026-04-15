import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { useCallback } from "react";
import { PACKAGE_ID, REGISTRY_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useClaim() {
  const { signAndExecute, loading } = useSignAndExecute();

  const claim = useCallback(
    async (kelpId: string) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::claim`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.object(kelpId),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { claim, loading };
}
