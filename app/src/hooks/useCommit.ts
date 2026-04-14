import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { blake2b } from "@noble/hashes/blake2.js";
import { useCallback } from "react";
import { COMMIT_FEE, PACKAGE_ID, REGISTRY_ID, SUI_CLOCK } from "../config";
import { useSignAndExecute } from "./useSignAndExecute";

/**
 * Compute the commit hash: blake2b256(bcs(kelp_address) || bcs(claimant) || bcs(nonce))
 *
 * This matches the on-chain computation in kelp::reveal.
 */
export function computeCommitHash(
  kelpAddress: string,
  claimant: string,
  nonce: string,
): Uint8Array {
  const nonceBytes = new TextEncoder().encode(nonce);
  const data = new Uint8Array([
    ...bcs.Address.serialize(kelpAddress).toBytes(),
    ...bcs.Address.serialize(claimant).toBytes(),
    ...bcs.vector(bcs.u8()).serialize(Array.from(nonceBytes)).toBytes(),
  ]);
  return blake2b(data, { dkLen: 32 });
}

export function useCommit() {
  const { signAndExecute, loading } = useSignAndExecute();

  const commit = useCallback(
    async (kelpAddress: string, claimant: string, nonce: string) => {
      const hashData = computeCommitHash(kelpAddress, claimant, nonce);

      const tx = new Transaction();
      const commitHash = tx.pure(
        bcs.vector(bcs.u8()).serialize(Array.from(hashData)),
      );
      const [coin] = tx.splitCoins(tx.gas, [COMMIT_FEE]);

      tx.moveCall({
        target: `${PACKAGE_ID}::kelp::commit`,
        arguments: [
          tx.object(REGISTRY_ID),
          commitHash,
          coin,
          tx.object(SUI_CLOCK),
        ],
      });

      return signAndExecute(tx);
    },
    [signAndExecute],
  );

  return { commit, loading };
}
