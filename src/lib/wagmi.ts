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
import { baseSepolia, polygonAmoy } from "wagmi/chains";

const configuredProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const projectId =
  configuredProjectId && configuredProjectId.length > 0
    ? configuredProjectId
    : null;

export const supportedChains = [baseSepolia, polygonAmoy] as const;

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
      injected(),
      metaMask(),
      coinbaseWallet({ appName: "Receiptuary" }),
      walletConnect({
        projectId: "receiptuary-demo",
        showQrModal: true,
      }),
    ];

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});
