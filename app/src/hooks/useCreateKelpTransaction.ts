import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export const useCreateKelpTransaction = () => {
  const { executeTransactionBlockWithoutSponsorship } = useCustomWallet();

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          // Raw effects are required so the effects can be reported back to the wallet
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  const handleExecute = async () => {
    console.log("Executing transaction");
    const packageId =
      "0x32617c11ad6b6aa25098677d1f54fce93abae7fef66eed8a88045af1eabd41f0";
    const moduleName = "kelp";
    const registry =
      "0x6d41a0a9360f80f8eb2d98ab6ec6e3e864bbbf55b67470c5788e590d8f2e2082";
    const transaction = new Transaction();

    transaction.moveCall({
      target: `${packageId}::${moduleName}::create_kelp`,
      arguments: [
        transaction.object(registry!), // kelp_registry: &mut KelpRegistry
        transaction.pure.u64(1000), // reveal_fee_amount: u64
        transaction.pure.u64(1000), // challenge_window: u64
        transaction.pure.bool(true), // enabled: bool
        prepareAddressVecSet(transaction, []),
      ],
    });

    try {
      const resp = await executeTransactionBlockWithoutSponsorship({
        tx: transaction,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      console.log(resp);
      toast.success("Transaction executed successfully");
      
      return resp;
    } catch (err) {
      console.log(err);
      toast.error("Failed to execute transaction");
    }
  };


  return { handleExecute };
};

/// Construct a VecSet of addresses.
export const prepareAddressVecSet = (
  txb: Transaction,
  objs: string[]
): TransactionArgument => {
  const vecSet = txb.moveCall({
    target: `0x2::vec_set::empty`,
    typeArguments: ["address"],
  });

  for (let obj of objs) {
    txb.moveCall({
      target: `0x2::vec_set::insert`,
      arguments: [vecSet, txb.pure.address(obj)],
      typeArguments: ["address"],
    });
  }

  return vecSet;
};
