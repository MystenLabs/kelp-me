"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

const CommitPage = () => {
  const kelpPackageId =
    "0x32617c11ad6b6aa25098677d1f54fce93abae7fef66eed8a88045af1eabd41f0";
  const kelpSharedObjectId =
    "0x6d41a0a9360f80f8eb2d98ab6ec6e3e864bbbf55b67470c5788e590d8f2e2082";

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

  const [kelpAddress, setKelpAddress] = useState("");
  const [commitHash, setCommitHash] = useState("");

  const handleKelpAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKelpAddress(e.target.value);
  };

  const handleCommitHashChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCommitHash(e.target.value);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e!.preventDefault();
    // Perform form submission logic here, e.g., sending data to a server
    console.log("Form submitted:", {
      kelpAddress,
      commitHash,
    });
    create();

    function create() {
      console.log("Creating Commit...");
      const transaction = new Transaction();

      transaction.moveCall({
        target: `${kelpPackageId}::kelp::create_kelp`,
        arguments: [
          transaction.object(kelpSharedObjectId!), // kelp_registry: &mut KelpRegistry
          transaction.pure.u64(1000), // reveal_fee_amount: u64
          transaction.pure.u64(1000), // challenge_window: u64
          transaction.pure.bool(true), // enabled: bool
        ],
      });

      signAndExecute(
        {
          transaction: transaction,
        },
        {
          onSuccess: (result) => {
            console.log("Transaction executed successfully", result);
          },
        }
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-md"
    >
      <h2 className="text-2xl font-semibold mb-4 text-center">Submit Reveal</h2>

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
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter KELP Address"
        />
      </div>

      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="commitHash"
        >
          Commit Hash
        </label>
        <input
          id="commitHash"
          type="text"
          value={commitHash}
          onChange={handleCommitHashChange}
          min="1"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter Commit Hash"
        />
      </div>

      <div className="text-center">
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default CommitPage;
