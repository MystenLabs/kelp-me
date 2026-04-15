import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID, REGISTRY_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useCreateKelp() {
  const { signAndExecute, loading } = useSignAndExecute();

  const createKelp = useCallback(
    async (params: {
      revealFee: number;
      challengeWindow: number;
      enabled: boolean;
      guardians: string[];
    }) => {
      const tx = new Transaction();

      // Build VecSet<address> for guardians
      const guardianSet = tx.moveCall({
        target: "0x2::vec_set::empty",
        typeArguments: ["address"],
      });

      for (const guardian of params.guardians) {
        tx.moveCall({
          target: "0x2::vec_set::insert",
          typeArguments: ["address"],
          arguments: [guardianSet, tx.pure.address(guardian)],
        });
      }

      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::create_kelp`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.u64(params.revealFee),
          tx.pure.u64(params.challengeWindow),
          tx.pure.bool(params.enabled),
          guardianSet,
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { createKelp, loading };
}
