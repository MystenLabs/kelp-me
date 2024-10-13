import { ChangeEvent, FormEvent, useState } from "react";

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
// import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import {
  SuiTransactionBlockResponse,
  TransactionEffects,
} from "@mysten/sui/client";

const defaultChallengeWindows = {
  "1 Day": 86400, // Seconds in a day
  "1 Week": 604800, // Seconds in a week
  "1 Month": 2592000, // Seconds in a month (approx. 30 days)
};

const CreateKelpForm = ({ onCreated }: { onCreated: (id: string) => void }) => {
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

  const [revealFeeAmount, setRevealFeeAmount] = useState(0);
  const [challengeWindow, setChallengeWindow] = useState(
    defaultChallengeWindows["1 Week"]
  );
  const [enabled, setEnabled] = useState(false);
  const [guardians, setGuardians] = useState([""]); // Start with one empty input field

  const handleRevealFeeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      // Ensure it's a positive number
      setRevealFeeAmount(value);
    }
  };

  const handleChallengeWindowChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setChallengeWindow(parseInt(e.target.value, 10));
  };

  const handleEnabledChange = () => {
    setEnabled(!enabled);
  };

  const handleGuardianChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const newGuardians = [...guardians];
    newGuardians[index] = e.target.value;
    setGuardians(newGuardians);
  };

  const addGuardian = () => {
    setGuardians([...guardians, ""]);
  };

  const removeGuardian = (index: number) => {
    const newGuardians = [...guardians];
    newGuardians.splice(index, 1);
    setGuardians(newGuardians);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e!.preventDefault();
    // Perform form submission logic here, e.g., sending data to a server
    console.log("Form submitted:", {
      revealFeeAmount,
      challengeWindow,
      enabled,
      guardians,
    });
    create();

    function create() {
      console.log("Creating kelp...");
      const transaction = new Transaction();
      console.log(guardians);

      transaction.moveCall({
        target: `${kelpPackageId}::kelp::create_kelp`,
        arguments: [
          transaction.object(kelpSharedObjectId!), // kelp_registry: &mut KelpRegistry
          transaction.pure.u64(1000), // reveal_fee_amount: u64
          transaction.pure.u64(1000), // challenge_window: u64
          transaction.pure.bool(true), // enabled: bool
          transaction.pure(
            bcs
              .vector(bcs.Address)
              .serialize(
                guardians.length === 1 && guardians[0] === "" ? [] : guardians
              )
          ), // guardians: vector<address>
        ],
      });

      signAndExecute(
        {
          transaction: transaction,
        },
        {
          onSuccess: (result) => {
            // const created = result.effects?.created;
            // const sharedOwnerItems = created?.filter(item => item.owner?.Shared);
            // console.log(sharedOwnerItems);

            // Check if owner is Shared

            const objectId = result.effects?.created?.[0]?.reference?.objectId;
            if (objectId) {
              onCreated(objectId);
            }
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
      <h2 className="text-2xl font-semibold mb-4 text-center">Create Kelp</h2>

      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="revealFeeAmount"
        >
          Reveal Fee Amount:
        </label>
        <input
          id="revealFeeAmount"
          type="number"
          value={revealFeeAmount}
          onChange={handleRevealFeeChange}
          min="1"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter reveal fee amount"
        />
      </div>

      <div className="mb-4">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="challengeWindow"
        >
          Challenge Window:
        </label>
        <select
          id="challengeWindow"
          value={challengeWindow}
          onChange={handleChallengeWindowChange}
          className="w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(defaultChallengeWindows).map(([key, value]) => (
            <option key={key} value={value}>
              {key}
            </option>
          ))}
        </select>
        {/* 
        <label>
          Challenge Window (Seconds):
          <input 
            type="range"
            min={60} // Example min value (1 minute)
            max={2592000}  // Example max value (30 days)
            value={challengeWindow} 
            onChange={handleChallengeWindowChange}
          />
          <span>{challengeWindow} seconds</span> 
        </label> 
        */}
      </div>

      <div className="mb-4 flex items-center">
        <input
          id="enabled"
          type="checkbox"
          checked={enabled}
          onChange={handleEnabledChange}
          className="mr-2 leading-tight"
        />
        <label htmlFor="enabled" className="text-gray-700 font-medium">
          Kelp Enabled?
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">
          Guardians:
        </label>
        {guardians.map((guardian, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              value={guardian}
              onChange={(e) => handleGuardianChange(index, e)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Guardian ${index + 1} Address`}
            />
            <button
              type="button"
              onClick={() => removeGuardian(index)}
              disabled={guardians.length <= 1}
              className="ml-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-red-300"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addGuardian}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Add Guardian
        </button>
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

export default CreateKelpForm;
