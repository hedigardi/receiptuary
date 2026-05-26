const EXPLORER_BY_CHAIN_ID: Record<number, string> = {
  8453: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

/**
 * Accepts common network naming variants used by env values and deploy tooling.
 */
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

/**
 * Returns a user-facing chain label for the given chain ID.
 */
export function getChainLabel(chainId: number): string {
  return LABEL_BY_CHAIN_ID[chainId] ?? `Chain ${chainId}`;
}

/**
 * Returns the explorer URL for an address on the active chain.
 */
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

/**
 * Returns a chain-specific explorer search URL.
 */
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

/**
 * Returns the contract events tab URL used for receipt event lookup.
 */
export function getExplorerReceiptEventLogsUrl(
  chainId: number,
  contractAddress: string,
): string | null {
  const baseUrl = EXPLORER_BY_CHAIN_ID[chainId];
  if (!baseUrl || !contractAddress) {
    return null;
  }

  // BaseScan Sepolia may return 404 for /logs deep links.
  return `${baseUrl}/address/${contractAddress}#events`;
}

/**
 * Maps a normalized network name to a chain ID when known.
 */
export function getChainIdFromNetworkName(networkName: string): number | null {
  if (!networkName) {
    return null;
  }

  const normalized = networkName.toLowerCase();
  return CHAIN_ID_BY_NETWORK_NAME[normalized] ?? null;
}

/**
 * Returns badge text and classes for the network indicator chip.
 */
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
      badgeClass:
        "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    };
  }

  if (normalized === "hardhat") {
    return {
      label: "hardhat (local)",
      dotClass: "bg-stone-500",
      badgeClass:
        "bg-stone-100 dark:bg-stone-800/60 text-stone-800 dark:text-stone-300 border-stone-300 dark:border-stone-600",
    };
  }

  return {
    label: normalized,
    dotClass: "bg-amber-500",
    badgeClass:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  };
}

/**
 * Normalizes network naming from env/deploy sources into a safe UI string.
 */
export function normalizeNetworkName(networkName: string): string {
  // Environment values can leak as the literal string "undefined".
  if (!networkName || networkName === "undefined") {
    return "unknown";
  }

  return networkName;
}
