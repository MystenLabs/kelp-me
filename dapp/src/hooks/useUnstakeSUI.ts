import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

const SUI_SYSTEM_STATE = "0x5";

export function useUnstakeSUI() {
  const { signAndExecute, loading } = useSignAndExecute();

  /** Unstake to wallet (default — coins go to connected wallet). */
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

  /** Unstake and deposit back into a KELP object (unstake → deposit in one PTB). */
  const unstakeToKelp = useCallback(
    async (stakedSuiId: string, kelpId: string) => {
      const tx = new Transaction();

      // Unstake — non-entry version returns Balance<SUI>
      const [balance] = tx.moveCall({
        target: "0x3::sui_system::request_withdraw_stake_non_entry",
        arguments: [tx.object(SUI_SYSTEM_STATE), tx.object(stakedSuiId)],
      });

      // Convert Balance<SUI> → Coin<SUI>
      const [coin] = tx.moveCall({
        target: "0x2::coin::from_balance",
        arguments: [balance],
        typeArguments: ["0x2::sui::SUI"],
      });

      // Deposit coin directly into KELP's internal balance
      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::deposit`,
        arguments: [tx.object(kelpId), coin],
        typeArguments: ["0x2::sui::SUI"],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { unstakeSUI, unstakeToKelp, loading };
}
