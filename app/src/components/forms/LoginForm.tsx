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
import Ribbon from "../ui/Ribbon";

export const LoginForm = () => {
  const { redirectToAuthUrl } = useCustomWallet();
  const { user, isLoading: isAuthLoading } = useAuthentication();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  if (isAuthLoading || user.role !== USER_ROLES.ROLE_4) {
    return <Spinner />;
  }

  return (
    <>
      <Ribbon />
      <div className="max-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-md w-full bg-white shadow rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800 mb-3">
                Welcome to KELP
              </h2>
              <p className="text-gray-600">
                Creating a worry-free Web3 wallet has never been easier. Log in
                to start using KELP.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              <div key={USER_ROLES.ROLE_1} className="flex flex-col space-y-3">
                <Link
                  href="#"
                  onClick={() => redirectToAuthUrl(USER_ROLES.ROLE_1)}
                  className="flex items-center justify-center space-x-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition transform hover:scale-105 duration-200"
                >
                  <Image
                    src="/google.svg"
                    alt="Google"
                    width={24}
                    height={24}
                  />
                  <span className="font-medium">Sign In with Google</span>
                </Link>
                <Button
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition transform hover:scale-105 duration-200"
                  onClick={() => {
                    sessionStorage.setItem("userRole", USER_ROLES.ROLE_1);
                    setIsConnectModalOpen(true);
                  }}
                >
                  Connect Wallet
                </Button>
              </div>
            </div>
            <ConnectModal
              open={isConnectModalOpen}
              onOpenChange={(open) => {
                if (!open) setIsConnectModalOpen(false);
              }}
              trigger="button"
            />
          </div>
          <div className="bg-gray-100 px-6 py-4 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} KELP. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
