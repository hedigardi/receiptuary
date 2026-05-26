import type { Address } from "viem";
import { formatUnits } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const envFeeToken = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS?.trim();
const envFeeRecipient =
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT?.trim();
const envFeeAmount = process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT?.trim();

const feeAmountIsValid = !!envFeeAmount && /^\d+$/.test(envFeeAmount);

/**
 * Invalid or missing env values are coerced to zero address/zero amount,
 * which safely disables the paid registration path.
 */
export const PAYMENT_TOKEN_ADDRESS =
  envFeeToken && envFeeToken.startsWith("0x") && envFeeToken.length === 42
    ? (envFeeToken as Address)
    : (ZERO_ADDRESS as Address);

export const PAYMENT_RECIPIENT_ADDRESS =
  envFeeRecipient &&
  envFeeRecipient.startsWith("0x") &&
  envFeeRecipient.length === 42
    ? (envFeeRecipient as Address)
    : (ZERO_ADDRESS as Address);

export const PAYMENT_FEE_AMOUNT = feeAmountIsValid
  ? BigInt(envFeeAmount)
  : BigInt(0);

/**
 * True only when token, recipient, and fee amount are all configured.
 */
export const IS_PAID_REGISTRATION_ENABLED =
  PAYMENT_TOKEN_ADDRESS !== ZERO_ADDRESS &&
  PAYMENT_RECIPIENT_ADDRESS !== ZERO_ADDRESS &&
  PAYMENT_FEE_AMOUNT > BigInt(0);

export const PAYMENT_TOKEN_SYMBOL_FALLBACK = "USDC";
const PAYMENT_TOKEN_DECIMALS_FALLBACK = 6;
export const PAYMENT_FEE_DISPLAY = formatUnits(
  PAYMENT_FEE_AMOUNT,
  PAYMENT_TOKEN_DECIMALS_FALLBACK,
);

/**
 * Minimal ERC-20 ABI required for approve/allowance/balance and display metadata.
 */
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
