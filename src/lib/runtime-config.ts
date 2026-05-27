import { formatUnits, type Address } from "viem";
import {
  DEPLOYED_CONTRACT_ADDRESS,
  DEPLOYED_NETWORK,
} from "@/lib/generated/receiptuary.generated";
import { normalizeNetworkName } from "@/lib/explorer";
import type { NetworkMode } from "@/lib/network-mode";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const PAYMENT_TOKEN_SYMBOL_FALLBACK = "USDC";
const PAYMENT_TOKEN_DECIMALS_FALLBACK = 6;

const RECEIPTUARY_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "fileHash", type: "bytes32" },
      { internalType: "string", name: "issuerName", type: "string" },
    ],
    name: "registerReceipt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "fileHash", type: "bytes32" }],
    name: "getReceipt",
    outputs: [
      { internalType: "string", name: "issuerName", type: "string" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "address", name: "registeredBy", type: "address" },
      { internalType: "bool", name: "isRegistered", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "issuer", type: "address" }],
    name: "isIssuerApproved",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "issuer", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setIssuerApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type RuntimeConfig = {
  deployedNetworkName: string;
  contractAddress: Address;
  isContractConfigured: boolean;
  receiptuaryAbi: typeof RECEIPTUARY_ABI;
  paymentTokenAddress: Address;
  paymentRecipientAddress: Address;
  paymentFeeAmount: bigint;
  paymentFeeDisplay: string;
  paymentTokenSymbolFallback: string;
  isPaidRegistrationEnabled: boolean;
  deploymentBlock: bigint | null;
  fallbackRpcUrl: string;
};

function trimEnvValue(raw: string | undefined): string {
  return raw?.trim() ?? "";
}

function isValidAddress(value: string): value is Address {
  return value.startsWith("0x") && value.length === 42;
}

function parseAddress(value: string): Address {
  return isValidAddress(value) ? (value as Address) : (ZERO_ADDRESS as Address);
}

function parseFeeAmount(value: string): bigint {
  return /^\d+$/.test(value) ? BigInt(value) : BigInt(0);
}

function parseDeploymentBlock(value: string): bigint | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  return BigInt(value);
}

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (value.length > 0) {
      return value;
    }
  }

  return "";
}

function getMainnetNetworkName(): string {
  const configuredMainnetNetwork = trimEnvValue(
    process.env.NEXT_PUBLIC_RECEIPTUARY_NETWORK,
  );

  if (configuredMainnetNetwork.length > 0) {
    return normalizeNetworkName(configuredMainnetNetwork);
  }

  return normalizeNetworkName(DEPLOYED_NETWORK);
}

function getMainnetContractAddress(): string {
  const envContractAddress = trimEnvValue(
    process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS,
  );
  const canUseGeneratedAddress = getMainnetNetworkName() !== "hardhat";

  if (envContractAddress.length > 0) {
    return envContractAddress;
  }

  return canUseGeneratedAddress ? DEPLOYED_CONTRACT_ADDRESS : "";
}

function getDemoNetworkName(): string {
  const configuredDemoNetwork = trimEnvValue(
    process.env.NEXT_PUBLIC_DEMO_RECEIPTUARY_NETWORK,
  );

  if (configuredDemoNetwork.length > 0) {
    return normalizeNetworkName(configuredDemoNetwork);
  }

  return "base_sepolia";
}

function getModeSpecificRawConfig(mode: NetworkMode): {
  deployedNetworkName: string;
  contractAddressRaw: string;
  paymentTokenAddressRaw: string;
  paymentRecipientAddressRaw: string;
  paymentFeeAmountRaw: string;
  deploymentBlockRaw: string;
  fallbackRpcUrlRaw: string;
} {
  if (mode === "demo") {
    return {
      deployedNetworkName: getDemoNetworkName(),
      contractAddressRaw: firstNonEmpty(
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_RECEIPTUARY_CONTRACT_ADDRESS),
        trimEnvValue(process.env.NEXT_PUBLIC_RECEIPTUARY_DEMO_CONTRACT_ADDRESS),
      ),
      paymentTokenAddressRaw: firstNonEmpty(
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_USDC_TOKEN_ADDRESS),
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_PAYMENT_TOKEN_ADDRESS),
      ),
      paymentRecipientAddressRaw: firstNonEmpty(
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_RECEIPTUARY_FEE_RECIPIENT),
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_PAYMENT_RECIPIENT_ADDRESS),
      ),
      paymentFeeAmountRaw: firstNonEmpty(
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_RECEIPTUARY_FEE_AMOUNT),
        trimEnvValue(process.env.NEXT_PUBLIC_DEMO_PAYMENT_FEE_AMOUNT),
      ),
      deploymentBlockRaw: trimEnvValue(
        process.env.NEXT_PUBLIC_DEMO_RECEIPTUARY_DEPLOYMENT_BLOCK,
      ),
      fallbackRpcUrlRaw: trimEnvValue(
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_FALLBACK_RPC_URL,
      ),
    };
  }

  return {
    deployedNetworkName: getMainnetNetworkName(),
    contractAddressRaw: getMainnetContractAddress(),
    paymentTokenAddressRaw: trimEnvValue(
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS,
    ),
    paymentRecipientAddressRaw: trimEnvValue(
      process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT,
    ),
    paymentFeeAmountRaw: trimEnvValue(
      process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT,
    ),
    deploymentBlockRaw: trimEnvValue(
      process.env.NEXT_PUBLIC_RECEIPTUARY_DEPLOYMENT_BLOCK,
    ),
    fallbackRpcUrlRaw: trimEnvValue(
      process.env.NEXT_PUBLIC_BASE_FALLBACK_RPC_URL,
    ),
  };
}

export function getRuntimeConfig(mode: NetworkMode): RuntimeConfig {
  const raw = getModeSpecificRawConfig(mode);
  const contractAddress = parseAddress(raw.contractAddressRaw);
  const isContractConfigured = contractAddress !== ZERO_ADDRESS;
  const paymentTokenAddress = parseAddress(raw.paymentTokenAddressRaw);
  const paymentRecipientAddress = parseAddress(raw.paymentRecipientAddressRaw);
  const paymentFeeAmount = parseFeeAmount(raw.paymentFeeAmountRaw);
  const isPaidRegistrationEnabled =
    paymentTokenAddress !== ZERO_ADDRESS &&
    paymentRecipientAddress !== ZERO_ADDRESS &&
    paymentFeeAmount > BigInt(0);

  return {
    deployedNetworkName: raw.deployedNetworkName,
    contractAddress,
    isContractConfigured,
    receiptuaryAbi: RECEIPTUARY_ABI,
    paymentTokenAddress,
    paymentRecipientAddress,
    paymentFeeAmount,
    paymentFeeDisplay: formatUnits(
      paymentFeeAmount,
      PAYMENT_TOKEN_DECIMALS_FALLBACK,
    ),
    paymentTokenSymbolFallback: PAYMENT_TOKEN_SYMBOL_FALLBACK,
    isPaidRegistrationEnabled,
    deploymentBlock: parseDeploymentBlock(raw.deploymentBlockRaw),
    fallbackRpcUrl: raw.fallbackRpcUrlRaw,
  };
}

export type { RuntimeConfig };
