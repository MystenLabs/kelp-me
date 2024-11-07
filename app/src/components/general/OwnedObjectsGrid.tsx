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

  if (user?.role === USER_ROLES.ROLE_4 && !isAuthLoading) {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">Not logged in</div>
      </div>
    );
  }

  if (isAuthLoading || isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return <h3>Error</h3>;
  }

  if (!data || (!data.has(address!) && kelp === "")) {
    return (
      <CreateKelp
        key="CreateKelpForm" // Key doesn't need curly braces here
        onCreated={(id) => {
          console.log(`Kelp created with ID: ${id}`); // Fix interpolation
          // Consider using react-router's useNavigate instead of window.location.hash
          // import { useNavigate } from 'react-router-dom';
          // const navigate = useNavigate();
          // navigate(`#${id}`);
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
            {/* {address ? <TransferSUIForm {...{ address }} /> : null} */}
            <TransferSUIForm {...{ address: kelp }} />
          </div>
        </div>
      </div>
    </div>
  );
};
