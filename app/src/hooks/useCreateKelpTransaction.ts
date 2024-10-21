import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export const useCreateKelpTransaction = () => {
  const { address } = useCustomWallet();
  const {
    executeTransactionBlockWithoutSponsorship,
    sponsorAndExecuteTransactionBlock,
  } = useCustomWallet();

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
    const packageId = clientConfig.PACKAGE;

    console.log("Package ID:", packageId);

    const moduleName = "kelp";
    const registry = clientConfig.REGISTRY;
    console.log("Registry:", registry);
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
