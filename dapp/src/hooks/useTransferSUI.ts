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
      pendingCoinRefs: { objectId: string; version: string; digest: string }[],
    ) => {
      const tx = new Transaction();

      // Collect accumulated fees from KELP
      const [feesCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::kelp::collect_fees`,
        arguments: [tx.object(kelpId)],
      });

      // Accept all pending coins into KELP's internal balance
      for (const ref of pendingCoinRefs) {
        tx.moveCall({
          target: `${PACKAGE_ID}::kelp::accept_payment`,
          arguments: [tx.object(kelpId), tx.receivingRef(ref)],
          typeArguments: ["0x2::sui::SUI"],
        });
      }

      // Withdraw all from AccountBalance (returns zero coin if none exists)
      const [balanceCoin] = tx.moveCall({
        target: `${PACKAGE_ID}::kelp::withdraw_all`,
        arguments: [tx.object(kelpId)],
        typeArguments: ["0x2::sui::SUI"],
      });

      // Merge all sources into feesCoin
      tx.mergeCoins(feesCoin, [balanceCoin]);

      // Split the transfer amount and send to recipient
      const [transferCoin] = tx.splitCoins(feesCoin, [tx.pure.u64(amountMist)]);
      tx.transferObjects([transferCoin], recipient);

      // Deposit remainder back into KELP's internal balance
      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::deposit`,
        arguments: [tx.object(kelpId), feesCoin],
        typeArguments: ["0x2::sui::SUI"],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { transferSUI, loading };
}
