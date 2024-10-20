import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { ChangeEvent, FormEvent, useState } from "react";
import { bcs } from "@mysten/sui/bcs";
import { blake2b } from "@noble/hashes/blake2b";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { MIST_PER_SUI } from "@mysten/sui/utils";

export const useCommitTransaction = (
  currentKelpOwner: string,
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
    const registry = clientConfig.REGISTRY!;
    console.log("Creating Commit...");
    const transaction = new Transaction();

    const currentKelpOwnerBCS =
      bcs.Address.serialize(currentKelpOwner).toBytes();
    const newKelpOwnerBCS = bcs.Address.serialize(newKelpOwner).toBytes();
    const nonceBCS = bcs.String.serialize(nonce).toBytes();

    const hash = blake2b.create({
      dkLen: 32,
    });

    hash.update(currentKelpOwnerBCS);
    hash.update(newKelpOwnerBCS);
    hash.update(nonceBCS);

    const uint8Array = hash.digest().slice(0, 32);

    const formattedUint8Array = new Uint8Array(uint8Array);

    transaction.moveCall({
      target: `${packageId}::kelp::commit`,
      arguments: [
        transaction.object(registry!), // &mut KelpRegistry
        transaction.pure.vector("u8", formattedUint8Array),
        transaction.splitCoins(transaction.gas, [
          transaction.pure.u64(1 * Number(MIST_PER_SUI)),
        ]), // commit_fee: Coin<SUI>
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
