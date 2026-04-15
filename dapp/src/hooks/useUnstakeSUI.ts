import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { useSignAndExecute } from "./useSignAndExecute";

const SUI_SYSTEM_STATE = "0x5";

export function useUnstakeSUI() {
  const { signAndExecute, loading } = useSignAndExecute();

  const unstakeSUI = useCallback(
    async (stakedSuiId: string) => {
      const tx = new Transaction();

      tx.moveCall({
        target: "0x3::sui_system::request_withdraw_stake",
        arguments: [tx.object(SUI_SYSTEM_STATE), tx.object(stakedSuiId)],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { unstakeSUI, loading };
}
