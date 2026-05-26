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
import { normalizeNetworkName } from "@/lib/explorer";
import { DEPLOYED_NETWORK_NAME } from "@/lib/receiptuary";

const configuredProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const projectId =
  configuredProjectId && configuredProjectId.length > 0
    ? configuredProjectId
    : null;

const normalizedNetwork = normalizeNetworkName(
  DEPLOYED_NETWORK_NAME,
).toLowerCase();
/**
 * Keep supported wallet chain strict to the deployment target.
 */
const targetChain = normalizedNetwork === "base" ? base : baseSepolia;

export const supportedChains = [targetChain] as const;

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
 * Shared wagmi config used by the app provider tree.
 */
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
