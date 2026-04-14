import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { useCallback } from "react";
import { PACKAGE_ID, REGISTRY_ID, REVEAL_FEE } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useReveal() {
  const { signAndExecute, loading } = useSignAndExecute();

  const reveal = useCallback(
    async (kelpId: string, claimant: string, nonce: string) => {
      const nonceBytes = new TextEncoder().encode(nonce);

      const tx = new Transaction();
      const nonceBcs = tx.pure(
        bcs.vector(bcs.u8()).serialize(Array.from(nonceBytes)),
      );
      const [coin] = tx.splitCoins(tx.gas, [REVEAL_FEE]);

      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::reveal`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.object(kelpId),
          tx.pure.address(claimant),
          nonceBcs,
          coin,
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { reveal, loading };
}
