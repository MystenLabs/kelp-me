import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

const SUI_SYSTEM_STATE = "0x5";

export function useStakeSUI() {
  const { signAndExecute, loading } = useSignAndExecute();

  /** Stake from wallet balance (splits from gas coin). */
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

  /** Stake from KELP balance (withdraw → stake in one PTB). */
  const stakeFromKelp = useCallback(
    async (
      kelpId: string,
      validatorAddress: string,
      amountMist: bigint,
      pendingCoinRefs: { objectId: string; version: string; digest: string }[],
    ) => {
      const tx = new Transaction();

      // Accept any pending coins into KELP's internal balance first
      for (const ref of pendingCoinRefs) {
        tx.moveCall({
          target: `${PACKAGE_ID}::kelp::accept_payment`,
          arguments: [tx.object(kelpId), tx.receivingRef(ref)],
          typeArguments: ["0x2::sui::SUI"],
        });
      }

      // Withdraw from KELP → get Coin<SUI>
      const [coin] = tx.moveCall({
        target: `${PACKAGE_ID}::kelp::withdraw`,
        arguments: [tx.object(kelpId), tx.pure.u64(amountMist)],
        typeArguments: ["0x2::sui::SUI"],
      });

      // Stake the withdrawn coin with the validator
      tx.moveCall({
        target: "0x3::sui_system::request_add_stake",
        arguments: [
          tx.object(SUI_SYSTEM_STATE),
          coin,
          tx.pure.address(validatorAddress),
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { stakeSUI, stakeFromKelp, loading };
}
