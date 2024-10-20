import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSuiClient } from "@mysten/dapp-kit";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { useCustomWallet } from "@/contexts/CustomWallet";
import clientConfig from "@/config/clientConfig";

export const useRequestSui = () => {
  const suiClient = useSuiClient();
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const { address, isUsingEnoki, jwt } = useCustomWallet();

  const handleRefreshBalance = useCallback(async () => {
    await suiClient
      .getBalance({
        owner: address!,
      })
      .then((resp) => {
        setBalance(Number(resp.totalBalance) / Number(MIST_PER_SUI));
      })
      .catch((err) => {
        console.error(err);
        setBalance(0);
      });
  }, [suiClient, address]);

  useEffect(() => {
    if (address) {
      handleRefreshBalance();
    } else {
      setBalance(0);
    }
  }, [handleRefreshBalance, address]);

  const handleRequestSui = useCallback(async () => {
    if (!isUsingEnoki) {
      toast.error("Available only for Enoki wallets");
      return;
    }
    setIsLoading(true);
    console.log({
      enokiApiKey: clientConfig.ENOKI_API_KEY,
      jwt,
    });
    await axios
      .get("https://pocs-faucet.vercel.app/api/faucet", {
        headers: {
          "Enoki-api-key": clientConfig.ENOKI_API_KEY,
          Authorization: `Bearer ${jwt}`,
        },
      })
      .then(async (resp) => {
        setIsLoading(false);
        await suiClient.waitForTransaction({
          digest: resp.data.txDigest,
        });
        handleRefreshBalance();
        toast.success("SUI received");
      })
      .catch((err) => {
        setIsLoading(false);
        console.error(err);
        toast.error("Failed to receive SUI");
      });
  }, [jwt, handleRefreshBalance, isUsingEnoki, suiClient]);

  return {
    isLoading,
    balance,
    handleRequestSui,
  };
};
