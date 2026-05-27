import {
  coinbaseWallet,
  injected,
  metaMask,
  walletConnect,
} from "wagmi/connectors";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet as rainbowCoinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const configuredProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const projectId =
  configuredProjectId && configuredProjectId.length > 0
    ? configuredProjectId
    : null;

export const mainnetChains = [base] as const;
export const demoChains = [baseSepolia] as const;

const connectors = projectId
  ? connectorsForWallets(
      [
        {
          groupName: "Recommended",
          wallets: [
            metaMaskWallet,
            injectedWallet,
            rainbowCoinbaseWallet,
            walletConnectWallet,
          ],
        },
      ],
      {
        appName: "Receiptuary",
        projectId,
      },
    )
  : [
      // Fallback connector set keeps local/dev environments usable without a project ID.
      injected(),
      metaMask(),
      coinbaseWallet({ appName: "Receiptuary" }),
      walletConnect({
        projectId: "receiptuary-demo",
        showQrModal: true,
      }),
    ];

/**
 * Mainnet wallet config used by production routes.
 */
export const wagmiConfigMainnet = createConfig({
  chains: mainnetChains,
  connectors,
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

/**
 * Testnet wallet config used by /demo routes.
 */
export const wagmiConfigDemo = createConfig({
  chains: demoChains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
