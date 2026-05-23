const EXPLORER_BY_CHAIN_ID: Record<number, string> = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

const CHAIN_ID_BY_NETWORK_NAME: Record<string, number> = {
  base: 8453,
  basesepolia: 84532,
  base_sepolia: 84532,
};

const LABEL_BY_CHAIN_ID: Record<number, string> = {
  8453: "Base",
  84532: "Base Sepolia",
  31337: "Hardhat Local",
};

export function getExplorerTxUrl(
  chainId: number,
  txHash: string,
): string | null {
  const baseUrl = EXPLORER_BY_CHAIN_ID[chainId];
  if (!baseUrl || !txHash) {
    return null;
  }

  return `${baseUrl}/tx/${txHash}`;
}

export function getChainLabel(chainId: number): string {
  return LABEL_BY_CHAIN_ID[chainId] ?? `Chain ${chainId}`;
}

export function getExplorerAddressUrl(
  chainId: number,
  address: string,
): string | null {
  const baseUrl = EXPLORER_BY_CHAIN_ID[chainId];
  if (!baseUrl || !address) {
    return null;
  }

  return `${baseUrl}/address/${address}`;
}

export function getExplorerSearchUrl(
  chainId: number,
  query: string,
): string | null {
  const baseUrl = EXPLORER_BY_CHAIN_ID[chainId];
  if (!baseUrl || !query) {
    return null;
  }

  return `${baseUrl}/search?f=0&q=${encodeURIComponent(query)}`;
}

export function getExplorerReceiptEventLogsUrl(
  chainId: number,
  contractAddress: string,
): string | null {
  const baseUrl = EXPLORER_BY_CHAIN_ID[chainId];
  if (!baseUrl || !contractAddress) {
    return null;
  }

  // BaseScan Sepolia returns 404 for /logs deep links, so route to the
  // contract events tab which consistently loads across supported chains.
  return `${baseUrl}/address/${contractAddress}#events`;
}

export function getChainIdFromNetworkName(networkName: string): number | null {
  if (!networkName) {
    return null;
  }

  const normalized = networkName.toLowerCase();
  return CHAIN_ID_BY_NETWORK_NAME[normalized] ?? null;
}

export function getNetworkBadge(networkName: string): {
  label: string;
  dotClass: string;
  badgeClass: string;
} {
  const normalized = normalizeNetworkName(networkName);

  if (normalized.startsWith("base")) {
    return {
      label: normalized,
      dotClass: "bg-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
    };
  }

  if (normalized === "hardhat") {
    return {
      label: "hardhat (local)",
      dotClass: "bg-stone-500",
      badgeClass: "bg-stone-100 text-stone-800 border-stone-300",
    };
  }

  return {
    label: normalized,
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
  };
}

export function normalizeNetworkName(networkName: string): string {
  if (!networkName || networkName === "undefined") {
    return "unknown";
  }

  return networkName;
}
