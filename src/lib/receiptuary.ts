import type { Address } from "viem";
import {
  DEPLOYED_CONTRACT_ADDRESS,
  DEPLOYED_NETWORK,
} from "@/lib/generated/receiptuary.generated";
import { normalizeNetworkName } from "@/lib/explorer";

const FALLBACK_ABI = [
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

/**
 * Uses a hardened, minimal ABI to avoid frontend/runtime mismatches when
 * generated ABI is stale after contract security upgrades.
 */
export const RECEIPTUARY_ABI = FALLBACK_ABI;

const deployedNetworkName = normalizeNetworkName(DEPLOYED_NETWORK);
/**
 * Canonical deployed network name used by wallet and explorer helpers.
 */
export const DEPLOYED_NETWORK_NAME = deployedNetworkName;

const envContractAddress =
  process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS?.trim();
/**
 * For local hardhat runs, avoid binding to a stale generated remote address.
 */
const canUseGeneratedAddress = deployedNetworkName !== "hardhat";

const configuredAddress =
  (envContractAddress && envContractAddress.length > 0
    ? envContractAddress
    : undefined) ?? (canUseGeneratedAddress ? DEPLOYED_CONTRACT_ADDRESS : "");

export const IS_CONTRACT_CONFIGURED =
  !!configuredAddress &&
  configuredAddress.startsWith("0x") &&
  configuredAddress.length === 42;

/**
 * Safe contract address consumed by wagmi hooks.
 */
export const CONTRACT_ADDRESS = (
  IS_CONTRACT_CONFIGURED
    ? configuredAddress
    : "0x0000000000000000000000000000000000000000"
) as Address;
