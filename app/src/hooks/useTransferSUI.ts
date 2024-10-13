import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import toast from "react-hot-toast";
import { useCustomWallet } from "@/contexts/CustomWallet";

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
    console.log("Amount:", amount);
    console.log("Recipient:", recipient);

    const transaction = new Transaction();
    const packageId =
      "0x3264d772921090b1baabbeddb8af4269031240241b431a5321c5e87690bd2aea";
    const moduleName = "kelp";

    let [tokens] = transaction.moveCall({
      target: `${packageId}::${moduleName}::withdraw`,
      arguments: [
        transaction.object(
          "0x852ee34de23015e5b74b4693d5bbab33c7fc751355a4bc938cd0aeb9d33eba75"
        ), // kelp_registry: &mut KelpRegistry
        transaction.pure.u64(100000000), // amount: u64
      ],
      typeArguments: ["0x2::sui::SUI"],
    });

    transaction.transferObjects(
      [tokens],
      "0xa7536c86055012cb7753fdb08ecb6c8bf1eb735ad75a2e1980309070123d5ef6"
    );

    // let coin = tx.splitCoins(tx.gas, [
    //   tx.pure.u64(amount * Number(MIST_PER_SUI)),
    // ]);
    // tx.transferObjects([coin], tx.pure.address(recipient));

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
