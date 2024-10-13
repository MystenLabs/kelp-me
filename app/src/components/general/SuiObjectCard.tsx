import { GeneralSuiObject } from "@/types/GeneralSuiObject";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SuiExplorerLink } from "./SuiExplorerLink";
import { formatString } from "@/helpers/formatString";
import Link from "next/link";
import { getSuiExplorerLink } from "@/helpers/getSuiExplorerLink";
import { CoinStruct } from "@mysten/sui/dist/cjs/client";
import { LoadingButton } from "./LoadingButton";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { useGetCoins } from "@/hooks/useGetCoins";
import { Spinner } from "./Spinner";

interface Props {
  objectId: string;
  // packageId: string;
  // moduleName: string;
  // structName: string;
  // version: string;
  // totalBalance: number;
}

export const SuiObjectCard = ({ objectId }: Props) => {
  const {
    data: coinData,
    isLoading: isCoinLoading,
    isError: isCoinError,
    // refetch, // Destructure the refetch function
  } = useGetCoins(objectId);

  return (
    <Link
      href={getSuiExplorerLink({
        objectId,
        type: "object",
        moduleName: "kelp",
      })}
      target="_blank"
      rel="noopenner noreferrer"
    >
      <Card className="w-[600px] hover:bg-gray-100">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {/* <div className="text-lg">{formatString(structName, 15)}</div> */}
            <div className="text-sm">
              <SuiExplorerLink
                objectId={objectId}
                type="object"
                isLink={false}
              />
            </div>
          </CardTitle>
          {/* <div className="flex justify-between items-center text-muted-foreground text-sm">
            <div>{formatString(moduleName, 15)}</div>
            <div>
              <SuiExplorerLink
                objectId={packageId}
                type="module"
                moduleName={moduleName}
                isLink={false}
              />
            </div>
          </div> */}
        </CardHeader>
        <CardContent>
          {isCoinLoading && (
            <div className="flex justify-center items-center py-4">
              <Spinner />
            </div>
          )}

          {isCoinError && (
            <div className="text-red-500 text-center py-4">
              Failed to load coin data. Please try again.
            </div>
          )}

          {!isCoinLoading && !isCoinError && (
            <div className="flex justify-between space-x-2">
              <div>Balance</div>
              <div className="text-gray-500">
                {coinData?.reduce(
                  (acc, coin) => acc + parseInt(coin.balance),
                  0
                ) /
                  10 ** 9}{" "}
                SUI
              </div>
            </div>
          )}
        </CardContent>

        <LoadingButton
          isLoading={isCoinLoading}
          type="submit"
          className="flex w-full space-x-3 items-center"
          disabled={isCoinLoading || isCoinError}
        >
          <div>Challenge</div>
          <PaperPlaneIcon className="w-4 h-4" />
        </LoadingButton>
      </Card>
    </Link>
  );
};
