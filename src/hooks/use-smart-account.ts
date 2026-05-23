"use client";

import { useEffect, useMemo, useState } from "react";
import { createSmartAccountClient } from "@biconomy/account";
import type { BiconomySmartAccountV2 } from "@biconomy/account";
import { useWallets } from "@privy-io/react-auth";
import { BrowserProvider } from "ethers";
import {
  AA_CHAIN_ID,
  AA_ENV_READY,
  BICONOMY_BUNDLER_URL,
  BICONOMY_PAYMASTER_API_KEY,
  IS_AA_ENABLED,
} from "@/lib/aa";
import { toUserFriendlyError } from "@/lib/user-friendly-errors";

type Eip1193Provider = {
  request: (request: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

type EmbeddedWalletLike = {
  walletClientType?: string;
  connectorType?: string;
  getProvider?: () => Promise<Eip1193Provider>;
  getEthereumProvider?: () => Promise<Eip1193Provider>;
};

export function useSmartAccount() {
  const { wallets } = useWallets();
  const [smartAccount, setSmartAccount] =
    useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddedWallet = useMemo(() => {
    const list = wallets as EmbeddedWalletLike[];

    return (
      list.find(
        (wallet) =>
          wallet.walletClientType === "privy" ||
          wallet.walletClientType === "embedded" ||
          wallet.connectorType === "embedded",
      ) ?? null
    );
  }, [wallets]);

  useEffect(() => {
    async function init() {
      if (!IS_AA_ENABLED || !AA_ENV_READY || !embeddedWallet || smartAccount) {
        return;
      }

      const getProvider =
        embeddedWallet.getEthereumProvider ?? embeddedWallet.getProvider;
      if (!getProvider) {
        setError("Could not access the embedded wallet provider.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const eip1193Provider = await getProvider();
        const ethersProvider = new BrowserProvider(eip1193Provider);
        const signer = await ethersProvider.getSigner();

        const accountClient = await createSmartAccountClient({
          signer,
          bundlerUrl: BICONOMY_BUNDLER_URL,
          biconomyPaymasterApiKey: BICONOMY_PAYMASTER_API_KEY,
          chainId: AA_CHAIN_ID,
        });

        const address = await accountClient.getAccountAddress();
        setSmartAccount(accountClient);
        setSmartAccountAddress(address);
      } catch (caught) {
        setError(toUserFriendlyError(caught, "smartAccount"));
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [embeddedWallet, smartAccount]);

  return {
    smartAccount,
    smartAccountAddress,
    isLoading,
    error,
    isEnabled: IS_AA_ENABLED,
    isEnvReady: AA_ENV_READY,
  };
}
