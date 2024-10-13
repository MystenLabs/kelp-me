"use client";

import React, { useState } from "react";
import { Spinner } from "./Spinner";
import { useAuthentication } from "@/contexts/Authentication";
import { USER_ROLES } from "@/constants/USER_ROLES";
import { useGetOwnedObjects } from "@/hooks/useGetOwnedObjects";
import { useGetCoins } from "@/hooks/useGetCoins";
import { SuiObjectCard } from "./SuiObjectCard";
import CreateKelpForm from "../forms/CreateKelpForm";
import { TransferSUIForm } from "@/components/forms/TransferSUIForm";
import { useCustomWallet } from "@/contexts/CustomWallet";
import CreateKelp from "./CreateKelp";
import { ObjectID } from "@mysten/sui/dist/cjs/transactions/data/internal";

export const OwnedObjectsGrid = () => {
  const { address } = useCustomWallet();
  const { user, isLoading: isAuthLoading } = useAuthentication();
  const { data, isLoading, isError } = useGetOwnedObjects();
  const {
    data: coinData,
    isLoading: isCoinLoading,
    isError: isCoinError,
  } = useGetCoins(address);
  const [kelp, setKelp] = useState("");

  if (user?.role === USER_ROLES.ROLE_4 && !isAuthLoading) {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">Not logged in</div>
      </div>
    );
  }

  if (isAuthLoading || isLoading || isCoinLoading) {
    return <Spinner />;
  }
  if (isError) {
    return <h3>Error</h3>;
  }

  if (kelp === "") {
    return (
      <CreateKelp
        key={"CreateKelpForm"}
        onCreated={(id: string) => {
          console.log(`Kelp created with ID: ${id}`);
          window.location.hash = id;
          setKelp(id);
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="font-bold text-2xl text-center">My KELP</div>
      <div className="flex flex-col items-center gap-6">
        {data.map((datum) => (
          <div key={datum.objectId} className="flex flex-col items-center">
            <SuiObjectCard
              key={kelp}
              objectId={kelp}
              // totalBalance={
              //   coinData.reduce(
              //     (acc, coin) => acc + parseInt(coin.balance),
              //     0
              //   ) /
              //   10 ** 9
              // }
            />
            <TransferSUIForm />
          </div>
        ))}
      </div>
    </div>
  );

  // return (
  //   <>
  //     <div className="space-y-10">
  //       <div className="font-bold text-2xl">My KELP</div>
  //       <div className="flex flex-wrap gap-x-4 gap-y-4">
  //         {isLoading && <Spinner />}
  //         {!isLoading &&
  //           data &&
  //           data.map((datum) => (
  //             <>
  //               <SuiObjectCard key={datum.objectId} {...datum} />
  //               <TransferSUIForm />
  //             </>
  //           ))}
  //       </div>
  //     </div>
  //   </>
  // );
};
