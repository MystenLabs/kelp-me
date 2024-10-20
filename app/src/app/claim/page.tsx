"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useClaimTransaction } from "@/hooks/useClaimTransaction";

const ClaimPage = () => {
  const [kelp, setKelp] = useState("");

  const { handleExecute } = useClaimTransaction(kelp);

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          // Raw effects are required so the effects can be reported back to the wallet
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  const handleKelpChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKelp(e.target.value);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e!.preventDefault();
    // Perform form submission logic here, e.g., sending data to a server
    console.log("Form submitted:", {
      kelp,
    });
    handleExecute();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xlg mx-auto p-8 bg-white shadow-lg rounded-lg"
    >
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Claim
      </h2>

      <div className="mb-5">
        <label className="block text-gray-800 font-medium mb-2" htmlFor="kelp">
          KELP Address
        </label>
        <input
          id="kelp"
          type="text"
          value={kelp}
          onChange={handleKelpChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter KELP Address"
        />
      </div>

      <div className="text-center">
        <button
          type="submit"
          className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Claim
        </button>
      </div>
    </form>
  );
};

export default ClaimPage;
