import type { Address } from "viem";
import {
  DEPLOYED_CONTRACT_ADDRESS,
  DEPLOYED_NETWORK,
  DEPLOYED_RECEIPTUARY_ABI,
} from "@/lib/generated/receiptuary.generated";
import { normalizeNetworkName } from "@/lib/explorer";

const FALLBACK_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "fileHash", type: "bytes32" },
      { internalType: "string", name: "issuerName", type: "string" },
      { internalType: "string", name: "referenceId", type: "string" },
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
      { internalType: "string", name: "referenceId", type: "string" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "address", name: "registeredBy", type: "address" },
      { internalType: "bool", name: "isRegistered", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RECEIPTUARY_ABI =
  DEPLOYED_RECEIPTUARY_ABI.length > 0 ? DEPLOYED_RECEIPTUARY_ABI : FALLBACK_ABI;

const deployedNetworkName = normalizeNetworkName(DEPLOYED_NETWORK);
export const DEPLOYED_NETWORK_NAME = deployedNetworkName;

const envContractAddress =
  process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS?.trim();
const canUseGeneratedAddress = deployedNetworkName !== "hardhat";

const configuredAddress =
  (envContractAddress && envContractAddress.length > 0
    ? envContractAddress
    : undefined) ?? (canUseGeneratedAddress ? DEPLOYED_CONTRACT_ADDRESS : "");

export const IS_CONTRACT_CONFIGURED =
  !!configuredAddress &&
  configuredAddress.startsWith("0x") &&
  configuredAddress.length === 42;

export const CONTRACT_ADDRESS = (
  IS_CONTRACT_CONFIGURED
    ? configuredAddress
    : "0x0000000000000000000000000000000000000000"
) as Address;
