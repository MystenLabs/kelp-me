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
  const { data: ownedObjectIds, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: address,
      filter: { StructType: "0x2::coin::Coin<0x2::sui::SUI>" },
      options: { showType: true },
    },
    {
      select: ({ data }) =>
        data.filter(({ data }) => !!data).map(({ data }) => data!.objectId),
      enabled: false,
    }
  );

  const handleTransferSUI = async ({
    amount,
    recipient,
    refresh,
  }: HandleTransferSUIProps) => {
    setIsLoading(true);

    try {
      let currentOwnedObjectIds = ownedObjectIds;

      // If ownedObjectIds is undefined, refetch and get the latest data
      if (currentOwnedObjectIds === undefined) {
        const response = await refetch();
        currentOwnedObjectIds = response.data;

        if (!currentOwnedObjectIds) {
          throw new Error("Failed to fetch owned objects.");
        }
      }

      console.log("Transferring SUI");
      console.log("Amount:", amount * Number(MIST_PER_SUI));
      console.log("Recipient:", recipient);
      console.log("Address:", address);
      console.log("Data:", currentOwnedObjectIds);

      if (currentOwnedObjectIds && currentOwnedObjectIds.length > 0) {
        const transaction = new Transaction();
        const packageId = clientConfig.PACKAGE;
        console.log("Package ID:", packageId);
        const moduleName = "kelp";

        for (const coin of currentOwnedObjectIds) {
          transaction.moveCall({
            target: `${packageId}::${moduleName}::accept_payment`,
            arguments: [transaction.object(address), transaction.object(coin)],
            typeArguments: ["0x2::sui::SUI"],
          });
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

        const resp = await executeTransactionBlockWithoutSponsorship({
          tx: transaction,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        console.log(resp);
        if (resp?.effects?.status.status !== "success") {
          throw new Error("Transaction failed");
        }

        toast.success("SUI transferred successfully!");
        refresh && refresh();
      } else {
        throw new Error("No owned objects found.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleTransferSUI,
  };
};
