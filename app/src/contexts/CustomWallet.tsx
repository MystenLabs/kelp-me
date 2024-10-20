import { createContext, useContext, useState } from "react";
import { ChildrenProps } from "@/types/ChildrenProps";
import {
  useCurrentWallet,
  useCurrentAccount,
  useSignTransaction,
  useDisconnectWallet,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useEffect, useMemo } from "react";
import { UserRole } from "@/types/Authentication";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthentication } from "@/contexts/Authentication";
import {
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
import {
  CreateSponsoredTransactionApiResponse,
  EnokiNetwork,
  ExecuteSponsoredTransactionApiInput,
} from "@mysten/enoki/dist/cjs/EnokiClient/type";
import { fromB64, toB64 } from "@mysten/sui/utils";
import axios, { AxiosResponse } from "axios";
import { SponsorTxRequestBody } from "@/types/SponsorTx";
import clientConfig from "@/config/clientConfig";
import { useEnokiFlow, useZkLogin, useZkLoginSession } from "@mysten/enoki/react";

interface SponsorAndExecuteTransactionBlockProps {
  tx: Transaction;
  network: EnokiNetwork;
  options: SuiTransactionBlockResponseOptions;
  includesTransferTx: boolean;
  allowedAddresses?: string[];
}

interface ExecuteTransactionBlockWithoutSponsorshipProps {
  tx: Transaction;
  options: SuiTransactionBlockResponseOptions;
}

interface CustomWalletContextProps {
  isConnected: boolean;
  isUsingEnoki: boolean;
  address?: string;
  jwt?: string;
  sponsorAndExecuteTransactionBlock: (
    props: SponsorAndExecuteTransactionBlockProps
  ) => Promise<SuiTransactionBlockResponse | void>;
  executeTransactionBlockWithoutSponsorship: (
    props: ExecuteTransactionBlockWithoutSponsorshipProps
  ) => Promise<SuiTransactionBlockResponse | void>;
  logout: () => void;
  redirectToAuthUrl: (role: UserRole) => void;
}

export const useCustomWallet = () => {
  const context = useContext(CustomWalletContext);
  return context;
};

export const CustomWalletContext = createContext<CustomWalletContextProps>({
  isConnected: false,
  isUsingEnoki: false,
  address: undefined,
  jwt: undefined,
  sponsorAndExecuteTransactionBlock: async () => {},
  executeTransactionBlockWithoutSponsorship: async () => {},
  logout: () => {},
  redirectToAuthUrl: () => {},
});

export const CustomWalletProvider = ({ children }: ChildrenProps) => {
  const suiClient = useSuiClient();
  const router = useRouter();
  const { address: enokiAddress } = useZkLogin();
  const zkLoginSession = useZkLoginSession();
  const enokiFlow = useEnokiFlow();
  const { handleLoginAs } = useAuthentication();

  const currentAccount = useCurrentAccount();
  const { isConnected: isWalletConnected } = useCurrentWallet();
  const { mutateAsync: signTransactionBlock } = useSignTransaction();
  const { mutate: disconnect } = useDisconnectWallet();

  const { isConnected, isUsingEnoki, address, logout } = useMemo(() => {
    return {
      isConnected: !!enokiAddress || isWalletConnected,
      isUsingEnoki: !!enokiAddress,
      address: enokiAddress || currentAccount?.address,
      logout: () => {
        if (isUsingEnoki) {
          enokiFlow.logout();
        } else {
          disconnect();
          sessionStorage.clear();
        }
      },
    };
  }, [
    enokiAddress,
    currentAccount?.address,
    enokiFlow,
    isWalletConnected,
    disconnect,
  ]);

  useEffect(() => {
    if (isWalletConnected) {
      console.log(sessionStorage.getItem("userRole"));
      handleLoginAs({
        firstName: "Wallet",
        lastName: "User",
        role:
          sessionStorage.getItem("userRole") !== "null"
            ? (sessionStorage.getItem("userRole") as UserRole)
            : "anonymous",
        email: "",
        picture: "",
      });
    }
  }, [isWalletConnected, handleLoginAs]);

  const redirectToAuthUrl = (userRole: UserRole) => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const customRedirectUri = `${protocol}//${host}/auth`;
    enokiFlow
      .createAuthorizationURL({
        provider: "google",
        network: clientConfig.SUI_NETWORK_NAME,
        clientId: clientConfig.GOOGLE_CLIENT_ID,
        redirectUrl: customRedirectUri,
        extraParams: {
          scope: ["openid", "email", "profile"],
        },
      })
      .then((url) => {
        sessionStorage.setItem("userRole", userRole);
        router.push(url);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to generate auth URL");
      });
  };

  const signTransaction = async (bytes: Uint8Array): Promise<string> => {
    if (isUsingEnoki) {
      const signer = await enokiFlow.getKeypair({
        network: clientConfig.SUI_NETWORK_NAME,
      });
      const signature = await signer.signTransaction(bytes);
      return signature.signature;
    }
    const txBlock = Transaction.from(bytes);
    return signTransactionBlock({
      transaction: txBlock,
      chain: `sui:${clientConfig.SUI_NETWORK_NAME}`,
    }).then((resp) => resp.signature);
  };

  const sponsorAndExecuteTransactionBlock = async ({
    tx,
    network,
    options,
    includesTransferTx,
    allowedAddresses = [],
  }: SponsorAndExecuteTransactionBlockProps): Promise<SuiTransactionBlockResponse | void> => {
    if (!isConnected) {
      toast.error("Wallet is not connected");
      return;
    }
    try {
      let digest = "";
      if (!isUsingEnoki || includesTransferTx) {
        // Sponsorship will happen in the back-end
        console.log("Sponsorship in the back-end...");
        const txBytes = await tx.build({
          client: suiClient,
          onlyTransactionKind: true,
        });
        const sponsorTxBody: SponsorTxRequestBody = {
          network,
          txBytes: toB64(txBytes),
          sender: address!,
          allowedAddresses,
        };
        console.log("Sponsoring transaction block...");
        const sponsorResponse: AxiosResponse<CreateSponsoredTransactionApiResponse> =
          await axios.post("/api/sponsor", sponsorTxBody);
        const { bytes, digest: sponsorDigest } = sponsorResponse.data;
        console.log("Signing transaction block...");
        const signature = await signTransaction(fromB64(bytes));
        console.log("Executing transaction block...");
        const executeSponsoredTxBody: ExecuteSponsoredTransactionApiInput = {
          signature,
          digest: sponsorDigest,
        };
        const executeResponse: AxiosResponse<{ digest: string }> =
          await axios.post("/api/execute", executeSponsoredTxBody);
        console.log("Executed response: ");
        digest = executeResponse.data.digest;
      } else {
        // Sponsorship can happen in the front-end
        console.log("Sponsorship in the front-end...");
        const response = await enokiFlow.sponsorAndExecuteTransaction({
          network: clientConfig.SUI_NETWORK_NAME,
          transaction: tx as any,
          client: suiClient as any,
        });
        digest = response.digest;
      }
      await suiClient.waitForTransaction({ digest, timeout: 5_000 });
      return suiClient.getTransactionBlock({
        digest,
        options,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to sponsor and execute transaction block");
    }
  };

  // some transactions cannot be sponsored by Enoki in its current state
  // for example when want to use the gas coin as an argument in a move call
  // so we provide an additional method to execute transactions without sponsorship
  const executeTransactionBlockWithoutSponsorship = async ({
    tx,
    options,
  }: ExecuteTransactionBlockWithoutSponsorshipProps): Promise<SuiTransactionBlockResponse | void> => {
    if (!isConnected) {
      toast.error("Wallet is not connected");
      return;
    }
    tx.setSender(address!);
    const txBytes = await tx.build({ client: suiClient });
    const signature = await signTransaction(txBytes);
    return suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: signature!,
      requestType: "WaitForLocalExecution",
      options,
    });
  };
  return (
    <CustomWalletContext.Provider
      value={{
        isConnected,
        isUsingEnoki,
        address,
        jwt: zkLoginSession?.jwt,
        sponsorAndExecuteTransactionBlock,
        executeTransactionBlockWithoutSponsorship,
        logout,
        redirectToAuthUrl,
      }}
    >
      {children}
    </CustomWalletContext.Provider>
  );
};
