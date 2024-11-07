import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { useCustomWallet } from "@/contexts/CustomWallet";
import clientConfig from "@/config/clientConfig";
import { useSuiClientQuery } from "@mysten/dapp-kit";

interface HandleTransferSUIProps {
  amount: number;
  recipient: string;
  refresh?: () => void;
}

export const useTransferSUI = ({ address }: { address: string }) => {
  const { executeTransactionBlockWithoutSponsorship } = useCustomWallet();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Pagination
  const { data } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address,
      filter: { StructType: "0x2::coin::Coin<0x2::sui::SUI>" },
      options: { showType: true },
    },
    {
      select: ({ data }) =>
        data.filter(({ data }) => !!data).map(({ data }) => data!.objectId),
    }
  );

  const handleTransferSUI = async ({
    amount,
    recipient,
    refresh,
  }: HandleTransferSUIProps) => {
    setIsLoading(true);
    console.log(data);

    console.log("Transferring SUI");
    console.log("Amount:", amount * Number(MIST_PER_SUI));
    console.log("Recipient:", recipient);
    console.log("Address:", address);

    const transaction = new Transaction();
    const packageId = clientConfig.PACKAGE;
    console.log("Package ID:", packageId);
    const moduleName = "kelp";

    if (data !== undefined && data.length > 0) {
      for (const coin of data) {
        transaction.moveCall({
          target: `${packageId}::${moduleName}::accept_payment`,
          arguments: [transaction.object(address), transaction.object(coin)],
          typeArguments: ["0x2::sui::SUI"],
        });
      }
    }

    let [tokens] = transaction.moveCall({
      target: `${packageId}::${moduleName}::withdraw`,
      arguments: [
        transaction.object(address),
        transaction.pure.u64(amount * Number(MIST_PER_SUI)),
      ],
      typeArguments: ["0x2::sui::SUI"],
    });

    transaction.transferObjects([tokens], recipient);

    // transaction.setGasBudget(1000000);

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
