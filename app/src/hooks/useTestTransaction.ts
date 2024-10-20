import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export const useTestTransaction = () => {
  const {
    sponsorAndExecuteTransactionBlock,
    executeTransactionBlockWithoutSponsorship,
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

  const handleExecute = () => {
    console.log("Executing transaction");
    const packageId = clientConfig.PACKAGE;
    const moduleName = "kelp";
    const registry = clientConfig.REGISTRY!;
    const transaction = new Transaction();
    transaction.moveCall({
      target: `${packageId}::${moduleName}::create_kelp`,
      arguments: [
        transaction.object(registry!), // kelp_registry: &mut KelpRegistry
        transaction.pure.u64(1000), // reveal_fee_amount: u64
        transaction.pure.u64(1000), // challenge_window: u64
        transaction.pure.bool(true), // enabled: bool
        // transaction.pure(bcs.vector(bcs.Address).serialize([])), // guardians: vector<address>
        prepareAddressVecSet(
          transaction,
          // ["0x23f5f16c179f11117465e139fd5dc7d7a56367c605eec48b43404b8cdda3a8a7",]
          []
        ),
      ],
    });
    // sponsorAndExecuteTransactionBlock({
    //   tx: transaction,
    //   network: clientConfig.SUI_NETWORK_NAME,
    //   includesTransferTx: false,
    //   allowedAddresses: [
    //     "0x7377de949b910c4f204536c38883d3a1709d7758db2322b0438587a450df8a59",
    //   ],
    //   options: {
    //     showEffects: true,
    //   },
    // })

    executeTransactionBlockWithoutSponsorship({
      tx: transaction,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    })
      .then((resp) => {
        console.log(resp);
        toast.success("Transaction executed successfully");
      })
      .catch((err) => {
        console.log(err);
        toast.error("Failed to execute transaction");
      });
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
