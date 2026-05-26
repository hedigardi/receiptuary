"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  lightTheme,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

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
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWithTheme>{children}</RainbowKitWithTheme>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
