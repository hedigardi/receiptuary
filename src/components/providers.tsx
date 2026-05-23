"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { PrivyProvider } from "@privy-io/react-auth";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { IS_AA_ENABLED, PRIVY_APP_ID } from "@/lib/aa";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const wagmiTree = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );

  if (IS_AA_ENABLED && PRIVY_APP_ID) {
    return <PrivyProvider appId={PRIVY_APP_ID}>{wagmiTree}</PrivyProvider>;
  }

  return wagmiTree;
}
