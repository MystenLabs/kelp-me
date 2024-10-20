"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useRevealTransaction } from "@/hooks/useRevealTransaction";

const RevealPage = () => {
  const [kelpAddress, setKelpAddress] = useState("");
  const [newKelpOwner, setNewKelpOwner] = useState("");
  const [nonce, setNonce] = useState("");

  const { handleExecute } = useRevealTransaction(
    kelpAddress,
    newKelpOwner,
    nonce
  );

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

  const handleKelpAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKelpAddress(e.target.value);
  };

  const handleNewKelpOwnerChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewKelpOwner(e.target.value);
  };

  const handleNonceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNonce(e.target.value);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e!.preventDefault();
    // Perform form submission logic here, e.g., sending data to a server
    console.log("Form submitted:", {
      kelpAddress,
      newKelpOwner,
      nonce,
    });
    handleExecute();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xlg mx-auto p-8 bg-white shadow-lg rounded-lg"
    >
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Submit Reveal
      </h2>

      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="revealFeeAmount"
        >
          KELP Address
        </label>
        <input
          id="kelpAddress"
          type="text"
          value={kelpAddress}
          onChange={handleKelpAddressChange}
          min="1"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter KELP Address"
        />
      </div>

      <div className="mb-5">
        <label
          className="block text-gray-800 font-medium mb-2"
          htmlFor="newKelpOwner"
        >
          New Kelp Owner
        </label>
        <input
          id="newKelpOwner"
          type="text"
          value={newKelpOwner}
          onChange={handleNewKelpOwnerChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter New Kelp Owner"
        />
      </div>

      <div className="mb-5">
        <label className="block text-gray-800 font-medium mb-2" htmlFor="nonce">
          Nonce
        </label>
        <input
          id="nonce"
          type="text"
          value={nonce}
          onChange={handleNonceChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Nonce"
        />
      </div>

      <div className="text-center mb-5 text-gray-600 italic">
        This is for demo purposes so the Reveal Windows is ONLY 2 minutes.
      </div>

      <div className="text-center">
        <button
          type="submit"
          className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Reveal
        </button>
      </div>
    </form>
  );
};

export default RevealPage;
