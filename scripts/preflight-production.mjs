import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const INTEGER_RE = /^\d+$/;

/**
 * Required keys for production deployment and frontend runtime consistency.
 */
const REQUIRED_ENV = [
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
  "NEXT_PUBLIC_USDC_TOKEN_ADDRESS",
  "NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT",
  "NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT",
  "DEPLOYER_PRIVATE_KEY",
  "BASE_MAINNET_RPC_URL",
  "USDC_TOKEN_ADDRESS",
  "RECEIPTUARY_FEE_RECIPIENT",
  "RECEIPTUARY_FEE_AMOUNT",
];

function checkAddress(name, value, issues) {
  if (!ADDRESS_RE.test(value || "")) {
    issues.push(`${name} is missing or not a valid 0x address`);
  }
}

function checkInteger(name, value, issues) {
  if (!INTEGER_RE.test(value || "")) {
    issues.push(`${name} must be an integer string (example: 1000000)`);
  }
}

function maskSecret(value) {
  if (!value) {
    return "(missing)";
  }
  if (value.length <= 10) {
    return "***";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

const missing = [];
for (const key of REQUIRED_ENV) {
  if (!process.env[key] || process.env[key].trim().length === 0) {
    missing.push(key);
  }
}

/**
 * `issues` fail preflight; `warnings` are informational and may be temporary.
 */
const issues = [];
const warnings = [];

if (process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS) {
  checkAddress(
    "NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS",
    process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS,
    issues,
  );
} else {
  warnings.push(
    "NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS is not set yet (this is OK before initial mainnet deploy)",
  );
}
checkAddress(
  "NEXT_PUBLIC_USDC_TOKEN_ADDRESS",
  process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS,
  issues,
);
checkAddress(
  "NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT",
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT,
  issues,
);
checkAddress("USDC_TOKEN_ADDRESS", process.env.USDC_TOKEN_ADDRESS, issues);
checkAddress(
  "RECEIPTUARY_FEE_RECIPIENT",
  process.env.RECEIPTUARY_FEE_RECIPIENT,
  issues,
);

checkInteger(
  "NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT",
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT,
  issues,
);
checkInteger(
  "RECEIPTUARY_FEE_AMOUNT",
  process.env.RECEIPTUARY_FEE_AMOUNT,
  issues,
);

if (
  process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS &&
  process.env.USDC_TOKEN_ADDRESS &&
  process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS !== process.env.USDC_TOKEN_ADDRESS
) {
  issues.push(
    "USDC token address differs between frontend and deploy env vars",
  );
}

if (
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT &&
  process.env.RECEIPTUARY_FEE_RECIPIENT &&
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT !==
    process.env.RECEIPTUARY_FEE_RECIPIENT
) {
  issues.push("Fee recipient differs between frontend and deploy env vars");
}

if (
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT &&
  process.env.RECEIPTUARY_FEE_AMOUNT &&
  process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT !==
    process.env.RECEIPTUARY_FEE_AMOUNT
) {
  issues.push("Fee amount differs between frontend and deploy env vars");
}

console.log("Preflight summary:");
console.log(
  `- DEPLOYER_PRIVATE_KEY: ${maskSecret(process.env.DEPLOYER_PRIVATE_KEY)}`,
);
console.log(
  `- BASE_MAINNET_RPC_URL: ${maskSecret(process.env.BASE_MAINNET_RPC_URL)}`,
);
console.log(
  `- NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS: ${
    process.env.NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS || "(missing)"
  }`,
);
console.log(
  `- NEXT_PUBLIC_USDC_TOKEN_ADDRESS: ${
    process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || "(missing)"
  }`,
);
console.log(
  `- NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT: ${
    process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT || "(missing)"
  }`,
);
console.log(
  `- NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT: ${
    process.env.NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT || "(missing)"
  }`,
);

if (missing.length > 0) {
  console.error("\nMissing required env vars:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
}

if (issues.length > 0) {
  console.error("\nValidation issues:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (missing.length > 0 || issues.length > 0) {
  process.exitCode = 1;
} else {
  console.log("\nPreflight passed. You are ready for production deploy.");
}
