import { EnokiNetwork } from "@mysten/enoki/dist/cjs/EnokiClient/type";

export interface SponsorTxRequestBody {
  network: EnokiNetwork;
  txBytes: string;
  sender: string;
  allowedAddresses?: string[];
}
