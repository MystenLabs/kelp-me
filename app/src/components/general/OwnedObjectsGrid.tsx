"use client";

import React, { useState, useEffect } from "react";
import { Spinner } from "./Spinner";
import { useAuthentication } from "@/contexts/Authentication";
import { USER_ROLES } from "@/constants/USER_ROLES";
import { SuiObjectCard } from "./SuiObjectCard";
import { TransferSUIForm } from "@/components/forms/TransferSUIForm";
import { useCustomWallet } from "@/contexts/CustomWallet";
import CreateKelp from "./CreateKelp";
import { useGetOwnedKelps } from "@/hooks/useGetOwnedKelps";
import {
  getFaucetHost,
  getFaucetRequestStatus,
  requestSuiFromFaucetV1,
} from "@mysten/sui/faucet";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import BigNumber from "bignumber.js";

export const OwnedObjectsGrid = () => {
  const { address } = useCustomWallet();
  const { user, isLoading: isAuthLoading } = useAuthentication();
  const { data, isLoading, isError } = useGetOwnedKelps();

  const [kelp, setKelp] = useState("");

  // Move the state update logic inside useEffect
  useEffect(() => {
    if (data && data.has(address!) && kelp === "") {
      const myKELPs = data.get(address!)?.sort();
      if (myKELPs && myKELPs.length > 0) {
        setKelp(myKELPs[0]);
        window.location.hash = myKELPs[0];
        console.log(`KELP set to: ${myKELPs[0]}`);
      }
    }
  }, [data, address, kelp]);

  // **Moved `useSuiClientQuery` to the top level**
  const {
    data: balance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useSuiClientQuery("getBalance", {
    owner: address!,
    coinType: SUI_TYPE_ARG,
  });

  useEffect(() => {
    const fetchFaucet = async () => {
      try {
        const { error, task: taskId } = await requestSuiFromFaucetV1({
          recipient: address!,
          host: getFaucetHost("testnet"),
        });
        if (error) {
          console.error("Faucet request failed:", error);
        } else {
          console.log("Faucet request task ID:", taskId);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    if ((!data || !data.has(address!)) && kelp === "" && balance) {
      const totalBalance = new BigNumber(balance.totalBalance).shiftedBy(-9);
      console.log(`Total balance: ${totalBalance}`);
      if (totalBalance < new BigNumber(1)) {
        console.log(`Total balance less than 1: fetching from faucet`);
        fetchFaucet();
      }
    }
  }, [data, address, kelp, balance]);

  if (user?.role === USER_ROLES.ROLE_4 && !isAuthLoading) {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">Not logged in</div>
      </div>
    );
  }

  if (isAuthLoading || isLoading || isBalanceLoading) {
    return <Spinner />;
  }

  if (isError || isBalanceError) {
    return <h3>Error</h3>;
  }

  if (!data || (!data.has(address ?? "") && kelp === "")) {
    return (
      <CreateKelp
        key="CreateKelpForm"
        onCreated={(id) => {
          console.log(`Kelp created with ID: ${id}`);
          window.location.hash = id;
          setKelp(id);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center space-y-10 p-6 bg-gray-50 rounded-lg shadow-md">
      <h2 className="font-extrabold text-3xl text-center text-indigo-600">
        My KELP
      </h2>
      <div>
        <div key={kelp}>
          <SuiObjectCard key={kelp} objectId={kelp} />
          <div className="mt-4 w-full">
            <TransferSUIForm {...{ address: kelp }} />
          </div>
        </div>
      </div>
    </div>
  );
};
