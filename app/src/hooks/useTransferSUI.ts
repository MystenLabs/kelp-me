import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { useCustomWallet } from "@/contexts/CustomWallet";
import clientConfig from "@/config/clientConfig";

interface HandleTransferSUIProps {
  amount: number;
  recipient: string;
  refresh?: () => void;
}

export const useTransferSUI = () => {
  const { executeTransactionBlockWithoutSponsorship } = useCustomWallet();
  const [isLoading, setIsLoading] = useState(false);

  const handleTransferSUI = async ({
    amount,
    recipient,
    refresh,
  }: HandleTransferSUIProps) => {
    setIsLoading(true);
    // TODO

    console.log("Transferring SUI");
    console.log("Amount:", amount * Number(MIST_PER_SUI));
    console.log("Recipient:", recipient);

    const transaction = new Transaction();
    const packageId = clientConfig.PACKAGE;
    console.log("Package ID:", packageId);
    const moduleName = "kelp";

    let [tokens] = transaction.moveCall({
      target: `${packageId}::${moduleName}::withdraw`,
      arguments: [
        transaction.object(
          "0x471f87bed628f2f5be4eeb366956a1571de4a9ada841e5e4ea3ec46d40f02b27"
        ), // kelp_registry: &mut KelpRegistry
        transaction.pure.u64(amount * Number(MIST_PER_SUI)), // amount: u64
      ],
      typeArguments: ["0x2::sui::SUI"],
    });

    transaction.transferObjects([tokens], recipient);

    // this transaction cannot be sponsored by Enoki
    // because it is using the gas coin as a transaction argument
    // so we are not sponsoring it with Enoki, the user pays for the gas
    executeTransactionBlockWithoutSponsorship({
      tx: transaction,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    })
      .then((resp) => {
        console.log(resp);
        if (resp?.effects?.status.status !== "success") {
          throw new Error("Transaction failed");
        }
        setIsLoading(false);
        toast.success("SUI transferred successfully!");
        !!refresh && refresh();
      })
      .catch((err) => {
        console.log(err);
        toast.error("Transaction failed");
        setIsLoading(false);
      });
  };

  return {
    isLoading,
    handleTransferSUI,
  };
};
