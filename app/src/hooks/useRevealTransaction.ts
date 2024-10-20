import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { bcs } from "@mysten/sui/bcs";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { MIST_PER_SUI } from "@mysten/sui/utils";

export const useRevealTransaction = (
  kelp: string,
  newKelpOwner: string,
  nonce: string
) => {
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

  const handleExecute = () => {
    //
    const packageId = clientConfig.PACKAGE;
    const moduleName = "kelp";
    const registry = clientConfig.REGISTRY!;
    console.log("Creating Reveal...");
    const transaction = new Transaction();

    transaction.moveCall({
      target: `${packageId}::kelp::reveal`,
      arguments: [
        transaction.object(registry!), // &mut KelpRegistry
        transaction.object(kelp), // &mut Kelp,
        transaction.pure(bcs.Address.serialize(newKelpOwner)), // claimant: address
        transaction.pure(bcs.String.serialize(nonce).toBytes()), // nonce: vector<u8>
        transaction.splitCoins(transaction.gas, [
          transaction.pure.u64(1 * Number(MIST_PER_SUI)),
        ]), // reveal_fee: Coin<SUI>
        transaction.object(SUI_CLOCK_OBJECT_ID), // clock: &Clock
      ],
    });

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
