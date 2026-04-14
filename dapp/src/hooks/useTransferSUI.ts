import { Transaction } from "@mysten/sui/transactions";
import { useCallback } from "react";
import { PACKAGE_ID } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

export function useTransferSUI() {
  const { signAndExecute, loading } = useSignAndExecute();

  const transferSUI = useCallback(
    async (
      kelpId: string,
      recipient: string,
      amountMist: number,
      pendingCoinIds: string[],
    ) => {
      const tx = new Transaction();

      // Accept all pending coins into KELP's internal balance
      for (const coinId of pendingCoinIds) {
        tx.moveCall({
          target: `${PACKAGE_ID}::kelp::accept_payment`,
          arguments: [tx.object(kelpId), tx.object(coinId)],
          typeArguments: ["0x2::sui::SUI"],
        });
      }

      // Withdraw the desired amount from KELP
      const [coin] = tx.moveCall({
        target: `${PACKAGE_ID}::kelp::withdraw`,
        arguments: [tx.object(kelpId), tx.pure.u64(amountMist)],
        typeArguments: ["0x2::sui::SUI"],
      });

      // Transfer to recipient
      tx.transferObjects([coin], recipient);

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { transferSUI, loading };
}
