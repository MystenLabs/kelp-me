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
    <div className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Welcome to KELP
        </h2>
        <p className="text-gray-600">
          Creating a worry-free Web3 wallet has never been easier. Log in to
          start using KELP.
        </p>
      </div>
      <div className="flex flex-col space-y-4">
        <div key={USER_ROLES.ROLE_1} className="flex flex-col space-y-3">
          <Link
            href="#"
            onClick={() => redirectToAuthUrl(USER_ROLES.ROLE_1)}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          >
            <Image src="/google.svg" alt="Google" width={20} height={20} />
            <span>Sign In with Google</span>
          </Link>
          <Button
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
            onClick={() => {
              sessionStorage.setItem("userRole", USER_ROLES.ROLE_1);
              setIsConnectModalOpen(true);
            }}
          >
            Connect Wallet
          </Button>
        </div>
      </div>
      {/* Optional: Create separate ConnectModal components for each user role if needed */}
      <ConnectModal
        // className="mt-4"
        open={isConnectModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsConnectModalOpen(false);
        }}
        trigger="button"
      />
    </div>
  );
};
