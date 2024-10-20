import { useGetCoins } from "@/hooks/useGetCoins";
import React from "react";

interface Props {
  objectId: string;
}

const Balance = ({ objectId }: Props) => {
  const {
    data,
    isLoading,
    isError,
    reFetchData: refetch, // Destructure the refetch function if needed
  } = useGetCoins(objectId);

  if (isLoading || isError) {
    return <></>;
  }

  return (
    <div className="flex justify-between space-x-2">
      <div>Balance</div>
      <div className="text-gray-500">
        {data
          ?.reduce((acc, coin) => acc + parseInt(coin.balance, 10), 0) /
          10 ** 9}{" "}
        SUI
      </div>
    </div>
  );
};

export default Balance;