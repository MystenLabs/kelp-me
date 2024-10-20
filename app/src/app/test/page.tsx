"use client";

import { Button } from "@/components/ui/button";
import { useCreateKelpTransaction } from "@/hooks/useCreateKelpTransaction";

const TestTransactionPage = () => {
  const { handleExecute } = useCreateKelpTransaction();

  return (
    <div className="space-y-[40px]">
      <div className="flex flex-col items-center space-y-[20px]">
        <div className="text-lg text-center">
          Test Transaction Sponsored in the back-end
        </div>
        <div className="text-center text-black text-opacity-80">
          This transaction mints and transfers a dummy NFT to a dummy address.{" "}
          <br /> We are sponsoring it with Enoki in our back-end, in order to
          avoid having to whitelist the recipient&apos;s address in advance in
          the Enoki Portal.
        </div>
        <Button onClick={handleExecute}>Execute</Button>
      </div>
      <div className="flex flex-col items-center space-y-[20px]">
        <div className="text-lg text-center">
          Test transaction sponsored in the front-end
        </div>
        <div className="text-center text-black text-opacity-80">
          We need to find an example of a simple transaction that does not
          contain any transfers, so that it can be sponsored in the front-end,
          and we can test this flow as well.
        </div>
      </div>
    </div>
  );
};

export default TestTransactionPage;
