"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useCommitTransaction } from "@/hooks/useCommitTransaction";

const CommitPage = () => {
  const [kelpAddress, setKelpAddress] = useState("");
  const [newKelpOwner, setNewKelpOwner] = useState("");
  const [nonce, setNonce] = useState("");

  const { handleExecute } = useCommitTransaction(
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
        Submit Commit
      </h2>

      <div className="mb-5">
        <label
          className="block text-gray-800 font-medium mb-2"
          htmlFor="kelpAddress"
        >
          KELP Address
        </label>
        <input
          id="kelpAddress"
          type="text"
          value={kelpAddress}
          onChange={handleKelpAddressChange}
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

      <div className="mb-5 text-gray-600 italic">
        Upon committing, a 1 SUI fee will be deducted from your account and will
        be returned to you upon creating a dominant reveal. Please note that
        this fee is for demonstration purposes only; in a real-world scenario,
        the amount will be higher.
      </div>

      <div className="text-center">
        <button
          type="submit"
          className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Commit
        </button>
      </div>
    </form>
  );
};

export default CommitPage;
