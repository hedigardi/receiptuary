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
const targetChain = normalizedNetwork === "base" ? base : baseSepolia;

export const supportedChains = [targetChain] as const;

const connectors = projectId
  ? connectorsForWallets(
      [
        {
          groupName: "Get started",
          wallets: [rainbowCoinbaseWallet],
        },
        {
          groupName: "Other wallets",
          wallets: [metaMaskWallet, injectedWallet, walletConnectWallet],
        },
      ],
      {
        appName: "Receiptuary",
        projectId,
      },
    )
  : [
      coinbaseWallet({ appName: "Receiptuary", preference: "all" }),
      injected(),
      metaMask(),
      walletConnect({
        projectId: "receiptuary-demo",
        showQrModal: true,
      }),
    ];

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});
