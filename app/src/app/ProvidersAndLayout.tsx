"use client";

import { LargeScreenLayout } from "@/components/layouts/LargeScreenLayout";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { AuthenticationProvider } from "@/contexts/Authentication";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChildrenProps } from "@/types/ChildrenProps";
import React from "react";
import { Toaster } from "react-hot-toast";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { registerStashedWallet } from "@mysten/zksend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomWalletProvider } from "@/contexts/CustomWallet";
import clientConfig from "@/config/clientConfig";
import "@mysten/dapp-kit/dist/index.css";

export interface StorageAdapter {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

const sessionStorageAdapter: StorageAdapter = {
  getItem: async (key) => {
    return sessionStorage.getItem(key);
  },
  setItem: async (key, value) => {
    sessionStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    sessionStorage.removeItem(key);
  },
};

registerStashedWallet("PoC template", {});

export const ProvidersAndLayout = ({ children }: ChildrenProps) => {
  const { isMobile } = useIsMobile();

  const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl("testnet") },
    mainnet: { url: getFullnodeUrl("mainnet") },
  });

  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork={clientConfig.SUI_NETWORK_NAME}
      >
        <WalletProvider
          autoConnect
          stashedWallet={{
            name: "PoC Template",
          }}
          storage={sessionStorageAdapter}
        >
          <EnokiFlowProvider apiKey={clientConfig.ENOKI_API_KEY}>
            <AuthenticationProvider>
              <CustomWalletProvider>
                <main className={`min-h-screen w-screen bg-gray-100`}>
                  {!!isMobile && <MobileLayout>{children}</MobileLayout>}
                  {!isMobile && (
                    <LargeScreenLayout>{children}</LargeScreenLayout>
                  )}
                  <Toaster
                    position="bottom-center"
                    toastOptions={{
                      duration: 5000,
                    }}
                  />
                </main>
              </CustomWalletProvider>
            </AuthenticationProvider>
          </EnokiFlowProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};
