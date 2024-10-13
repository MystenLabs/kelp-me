"use client";

import { USER_ROLES } from "@/constants/USER_ROLES";
import React, { useState } from "react";
import { useAuthentication } from "@/contexts/Authentication";
import { Spinner } from "../general/Spinner";
import Link from "next/link";
import Image from "next/image";
import { ConnectModal } from "@mysten/dapp-kit";
import { Button } from "../ui/button";
import { useCustomWallet } from "@/contexts/CustomWallet";

export const LoginForm = () => {
  const { redirectToAuthUrl } = useCustomWallet();
  const { user, isLoading: isAuthLoading } = useAuthentication();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  if (isAuthLoading || user.role !== USER_ROLES.ROLE_4) {
    return <Spinner />;
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-lg text-center">Login</h3>
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:space-x-3 items-center justify-center">

            <div key={USER_ROLES.ROLE_1} className="space-y-2">
              <Link
                href="#"
                onClick={() => redirectToAuthUrl(USER_ROLES.ROLE_1)}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-black w-[210px] rounded-lg"
              >
                <Image src="/google.svg" alt="Google" width={20} height={20} />
                <div>Sign In with Google </div>
              </Link>
              <Button
                className="w-full"
                onClick={() => {
                  sessionStorage.setItem("userRole", USER_ROLES.ROLE_1);
                  setIsConnectModalOpen(true);
                }}
              >
                Connect Wallet
              </Button>
            </div>

      </div>
      {/* we could also create a separate ConnectModal component for each user role, and pass the real button as a trigger */}
      <ConnectModal
        open={isConnectModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsConnectModalOpen(false);
        }}
        trigger="button"
      />
    </div>
  );
};
