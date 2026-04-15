import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { useSignAndExecute } from "./useSignAndExecute";

const SUI_SYSTEM_STATE = "0x5";

export function useStakeSUI() {
  const { signAndExecute, loading } = useSignAndExecute();

  const stakeSUI = useCallback(
    async (validatorAddress: string, amountMist: bigint) => {
      const tx = new Transaction();

      const [stakeCoin] = tx.splitCoins(tx.gas, [amountMist]);

      tx.moveCall({
        target: "0x3::sui_system::request_add_stake",
        arguments: [
          tx.object(SUI_SYSTEM_STATE),
          stakeCoin,
          tx.pure.address(validatorAddress),
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { stakeSUI, loading };
}
