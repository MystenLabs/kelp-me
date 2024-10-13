import { useCallback, useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { GeneralSuiObject } from "@/types/GeneralSuiObject";
import { useCustomWallet } from "@/contexts/CustomWallet";

export const useGetOwnedObjects = () => {
  const suiClient = useSuiClient();
  const { address } = useCustomWallet();

  const [data, setData] = useState<GeneralSuiObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const reFetchData = useCallback(async () => {
    setIsLoading(true);
    const allData = [];

    try {
      let { nextCursor, hasNextPage, data } = await suiClient.getOwnedObjects({
        owner: address!,
        options: {
          showContent: true,
          showType: true,
        },
      });
      allData.push(...data);

      while (!!hasNextPage) {
        const resp = await suiClient.getOwnedObjects({
          owner: address!,
          options: {
            showContent: true,
            showType: true,
          },
          ...(!!hasNextPage && { cursor: nextCursor }),
        });
        hasNextPage = resp.hasNextPage;
        nextCursor = resp.nextCursor;
        data = resp.data;
        allData.push(...data);
      }

      console.log(allData);
      setData(
        allData.map(({ data: { objectId, type, version } }: any) => {
          const parts = type.split("::");
          return {
            objectId,
            packageId: parts[0],
            moduleName: parts[1],
            structName: parts[2],
            version,
          } as GeneralSuiObject;
        })
      );
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
