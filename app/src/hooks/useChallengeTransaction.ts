import clientConfig from "@/config/clientConfig";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export const useChallengeTransaction = (kelp: string) => {
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
    const packageId = clientConfig.PACKAGE;
    const registry = clientConfig.REGISTRY!;
    console.log("Challenging...");
    const transaction = new Transaction();

    transaction.moveCall({
      target: `${packageId}::kelp::challenge`,
      arguments: [
        transaction.object(kelp), // &mut Kelp,
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
