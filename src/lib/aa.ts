export const IS_AA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AA === "true";

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const BICONOMY_BUNDLER_URL =
  process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL ?? "";
export const BICONOMY_PAYMASTER_API_KEY =
  process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY ?? "";

export const AA_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_AA_CHAIN_ID ?? "84532",
);

export const AA_ENV_READY =
  IS_AA_ENABLED &&
  PRIVY_APP_ID.length > 0 &&
  BICONOMY_BUNDLER_URL.length > 0 &&
  BICONOMY_PAYMASTER_API_KEY.length > 0;
