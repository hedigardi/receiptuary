"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { wagmiConfigDemo, wagmiConfigMainnet } from "@/lib/wagmi";
import { getNetworkModeFromPathname } from "@/lib/network-mode";
import { RuntimeConfigProvider } from "@/lib/runtime-config-context";

const walletLightTheme = lightTheme({
  accentColor: "#03624c",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
  overlayBlur: "small",
});

const walletDarkTheme = darkTheme({
  accentColor: "#34d399",
  accentColorForeground: "#0f1613",
  borderRadius: "large",
  overlayBlur: "small",
});

function RainbowKitWithTheme({ children }: { children: React.ReactNode }) {
  // Use resolvedTheme so wallet modals match current light/dark mode after hydration.
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider
      theme={resolvedTheme === "dark" ? walletDarkTheme : walletLightTheme}
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Keep one stable query client instance for the whole app lifecycle.
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname() ?? "/";
  const networkMode = getNetworkModeFromPathname(pathname);
  const wagmiConfig =
    networkMode === "demo" ? wagmiConfigDemo : wagmiConfigMainnet;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RuntimeConfigProvider>
            <RainbowKitWithTheme>{children}</RainbowKitWithTheme>
          </RuntimeConfigProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
