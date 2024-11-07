import { useSuiClientQuery } from "@mysten/dapp-kit";
import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import React from "react";
import BigNumber from "bignumber.js";

interface Props {
  objectId: string;
}

export function Balance({ objectId }: Props) {
  const { data } = useSuiClientQuery(
    "getBalance",
    { owner: objectId, coinType: SUI_TYPE_ARG },
    { refetchInterval: 5000 }
  );

  if (!data) {
    return null;
  }

  return (
    <div className="flex justify-between space-x-2">
      <div>Balance</div>
      <div className="text-gray-500">
        {new BigNumber(data.totalBalance).shiftedBy(-9).toFormat()} SUI
      </div>
    </div>
  );
}
