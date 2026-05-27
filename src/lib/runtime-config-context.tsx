"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  getNetworkModeFromPathname,
  type NetworkMode,
} from "@/lib/network-mode";
import { getRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

type RuntimeConfigContextValue = {
  networkMode: NetworkMode;
  runtimeConfig: RuntimeConfig;
};

const RuntimeConfigContext = createContext<RuntimeConfigContextValue | null>(
  null,
);

export function RuntimeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const networkMode = getNetworkModeFromPathname(pathname);
  const runtimeConfig = useMemo(
    () => getRuntimeConfig(networkMode),
    [networkMode],
  );

  return (
    <RuntimeConfigContext.Provider value={{ networkMode, runtimeConfig }}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const context = useContext(RuntimeConfigContext);

  if (!context) {
    throw new Error(
      "useRuntimeConfig must be used inside RuntimeConfigProvider",
    );
  }

  return context;
}
