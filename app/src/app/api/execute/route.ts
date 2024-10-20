import { NextRequest, NextResponse } from "next/server";
import { ExecuteSponsoredTransactionApiInput } from "@mysten/enoki/dist/cjs/EnokiClient/type";
import { enokiClient } from "../EnokiClient";

export const POST = async (request: NextRequest) => {
  const { digest, signature }: ExecuteSponsoredTransactionApiInput =
    await request.json();

  return enokiClient
    .executeSponsoredTransaction({
      digest,
      signature,
    })
    .then(({ digest }) => {
      return NextResponse.json(
        { digest },
        {
          status: 200,
        }
      );
    })
    .catch((error) => {
      console.error(error);
      return NextResponse.json(
        {
          error: "Could not execute sponsored transaction block.",
        },
        {
          status: 500,
        }
      );
    });
};
