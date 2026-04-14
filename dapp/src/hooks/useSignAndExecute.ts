import { useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useState } from "react";

export function useSignAndExecute() {
  const dAppKit = useDAppKit();
  const [loading, setLoading] = useState(false);

  const signAndExecute = useCallback(
    async (tx: Transaction) => {
      setLoading(true);
      try {
        const result = await dAppKit.signAndExecuteTransaction({
          transaction: tx,
        });
        return result;
      } finally {
        setLoading(false);
      }
    },
    [dAppKit],
  );

  return { signAndExecute, loading };
}
