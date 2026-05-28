type ErrorContext = "connect" | "register" | "verify";

function extractErrorMessage(caught: unknown): string {
  if (typeof caught === "string") {
    return caught;
  }

  if (caught instanceof Error) {
    return caught.message;
  }

  if (
    caught &&
    typeof caught === "object" &&
    "message" in caught &&
    typeof (caught as { message?: unknown }).message === "string"
  ) {
    return (caught as { message: string }).message;
  }

  return "";
}

function getFallbackMessage(context: ErrorContext): string {
  switch (context) {
    case "connect":
      return "Please connect your wallet to continue.";
    case "register":
      return "Could not register the receipt. Please try again.";
    case "verify":
      return "Could not verify this receipt right now. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Maps provider/wallet/raw errors into user-friendly messages by context.
 */
export function toUserFriendlyError(
  caught: unknown,
  context: ErrorContext,
): string {
  const raw = extractErrorMessage(caught);
  // Normalize once so keyword checks are case-insensitive and predictable.
  const normalized = raw.toLowerCase();

  if (!normalized) {
    return getFallbackMessage(context);
  }

  if (
    normalized.includes("requested method") &&
    normalized.includes("not been authorized")
  ) {
    return "Please connect your wallet first, then try again.";
  }

  if (
    normalized.includes("user rejected") ||
    normalized.includes("user denied") ||
    normalized.includes("denied transaction") ||
    normalized.includes("action_rejected") ||
    normalized.includes("request rejected")
  ) {
    return "Request cancelled in wallet. No changes were made.";
  }

  if (
    normalized.includes("wrong network") ||
    normalized.includes("chain mismatch") ||
    normalized.includes("unsupported chain") ||
    normalized.includes("switch")
  ) {
    return "Your wallet is on the wrong network. Switch to the required network and try again.";
  }

  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("funds for gas")
  ) {
    return "Your wallet does not have enough funds to pay network fees.";
  }

  if (
    normalized.includes("exceeds max transaction gas limit") ||
    normalized.includes("max transaction gas limit")
  ) {
    return "The RPC rejected the gas limit for this transaction. We now send a safe fixed gas limit - please try again.";
  }

  if (
    normalized.includes("hash already registered") ||
    normalized.includes("already registered")
  ) {
    return "This receipt hash has already been registered on-chain.";
  }

  if (normalized.includes("issuer name cannot be empty")) {
    return "Please enter an issuer name before registering.";
  }

  if (normalized.includes("issuer not approved")) {
    return "This contract requires an allowlisted issuer wallet. Use an approved wallet or deploy the open-registration contract version.";
  }

  if (
    normalized.includes("nonce too low") ||
    normalized.includes("replacement transaction underpriced") ||
    normalized.includes("already known")
  ) {
    return "A similar transaction is already pending. Wait a moment, then try again.";
  }

  if (
    normalized.includes("internal json-rpc error") ||
    normalized.includes("json-rpc") ||
    normalized.includes("network error") ||
    normalized.includes("fetch failed")
  ) {
    return "Network connection issue while talking to the blockchain. Please try again.";
  }

  if (
    normalized.includes("execution reverted") ||
    normalized.includes("call exception") ||
    normalized.includes("reverted")
  ) {
    return "The blockchain rejected this action. Please check your input and try again.";
  }

  return getFallbackMessage(context);
}

/**
 * Returns raw technical details for expandable debug output in the UI.
 */
export function getTechnicalErrorDetails(caught: unknown): string | null {
  const message = extractErrorMessage(caught).trim();
  return message.length > 0 ? message : null;
}
