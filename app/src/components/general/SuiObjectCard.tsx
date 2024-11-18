import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SuiExplorerLink } from "./SuiExplorerLink";
import Link from "next/link";
import { getSuiExplorerLink } from "@/helpers/getSuiExplorerLink";
import { LoadingButton } from "./LoadingButton";
import { PaperPlaneIcon, CopyIcon } from "@radix-ui/react-icons";
import toast from "react-hot-toast";
import { Balance } from "./Balance";
import { useChallengeTransaction } from "@/hooks/useChallengeTransaction";

interface Props {
  objectId: string;
}

export const SuiObjectCard = ({ objectId }: Props) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(objectId);
    toast.success("Address copied to clipboard");
  };

  const { handleExecute } = useChallengeTransaction(objectId);

  return (
    <Card className="w-full max-w-[600px] hover:bg-gray-100">
      <CardHeader>
        <CardTitle className="flex flex-col justify-between items-start">
          <p className="text-sm text-gray-600 mb-2">
            Your KELP address. Share it with others to receive funds:
          </p>
          <div className="flex items-center text-sm">
            <Link
              href={getSuiExplorerLink({
                objectId,
                type: "object",
                moduleName: "kelp",
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SuiExplorerLink
                objectId={objectId}
                type="object"
                isLink={false}
              />
            </Link>
            <button
              onClick={handleCopy}
              className="ml-2 p-1 rounded hover:bg-gray-200"
              aria-label="Copy Address"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Balance objectId={objectId} />
      </CardContent>

      <LoadingButton
        isLoading={false}
        type="submit"
        className="flex w-full space-x-3 items-center"
        onClick={handleExecute}
        // disabled={isCoinLoading || isCoinError}
        disabled={false}
      >
        <div>Challenge</div>
        <PaperPlaneIcon className="w-4 h-4" />
      </LoadingButton>
    </Card>
    // </Link>
  );
};
