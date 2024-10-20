import { useCallback, useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { GeneralSuiObject } from "@/types/GeneralSuiObject";
import { useCustomWallet } from "@/contexts/CustomWallet";
import { CoinStruct } from "@mysten/sui/dist/cjs/client";

// address: string | undefined
export const useGetCoins = (address: string | undefined) => {
  const suiClient = useSuiClient();

  const [data, setData] = useState<CoinStruct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const reFetchData = useCallback(async () => {
    setIsLoading(true);
    const allData: CoinStruct[] = [];

    try {
      let { nextCursor, hasNextPage, data } = await suiClient.getCoins({
        owner: address!,
      });
      // Iterate over the data and push items with coinType === "0x1::sui::SUI" to allData
      data.forEach((item: any) => {
        if (item.coinType === "0x2::sui::SUI") {
          allData.push(item);
        }
      });

      while (!!hasNextPage) {
        const resp = await suiClient.getCoins({
          owner: address!,
          ...(!!hasNextPage && { cursor: nextCursor }),
        });
        hasNextPage = resp.hasNextPage;
        nextCursor = resp.nextCursor;
        data = resp.data;

        data.forEach((item: any) => {
          if (item.coinType === "0x2::sui::SUI") {
            allData.push(item);
          }
        });

        // allData.push(...data);
      }

      console.log(allData);
      setData(allData);
      setIsLoading(false);
      setIsError(false);
    } catch (err) {
      console.log(err);
      setData([]);
      setIsLoading(false);
      setIsError(true);
    }
  }, [suiClient, address]);

  useEffect(() => {
    if (!!address) {
      reFetchData();

      // const intervalId = setInterval(() => {
      //   reFetchData();
      // }, 5000); // 5000 milliseconds = 5 seconds

      // // Cleanup interval on component unmount or when address changes
      // return () => clearInterval(intervalId);
    } else {
      setData([]);
      setIsLoading(false);
      setIsError(false);
    }
  }, [address, reFetchData]);

  return {
    data,
    isLoading,
    isError,
    reFetchData,
  };
};
