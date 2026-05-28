"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatUnits } from "viem";
import {
  getChainIdFromNetworkName,
  getChainLabel,
  getExplorerTxUrl,
} from "@/lib/explorer";
import { ERC20_ABI } from "@/lib/payment";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import { useRuntimeConfig } from "@/lib/runtime-config-context";

type Props = {
  fileHash: `0x${string}`;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ERC20_APPROVE_GAS_LIMIT = 120_000n;
const REGISTER_RECEIPT_GAS_LIMIT = 450_000n;

export function RegisterReceipt({ fileHash }: Props) {
  const { runtimeConfig } = useRuntimeConfig();
  const {
    contractAddress,
    deployedNetworkName,
    isContractConfigured,
    isPaidRegistrationEnabled,
    paymentFeeAmount,
    paymentRecipientAddress,
    paymentTokenAddress,
    paymentTokenSymbolFallback,
    receiptuaryAbi,
  } = runtimeConfig;
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const requiredChainId = getChainIdFromNetworkName(deployedNetworkName);
  const isWrongNetwork = !!requiredChainId && chainId !== requiredChainId;
  const requiredChainLabel = requiredChainId
    ? getChainLabel(requiredChainId)
    : "the required network";
  const [issuerName, setIssuerName] = useState("");
  const [acceptedFee, setAcceptedFee] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const {
    data: approveTxHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();
  const {
    data: registerTxHash,
    writeContract: writeRegister,
    isPending: isRegisterPending,
    error: registerError,
  } = useWriteContract();

  const { data: tokenSymbol } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isPaidRegistrationEnabled,
    },
  });

  const { data: tokenDecimals } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: isPaidRegistrationEnabled,
    },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress ?? ZERO_ADDRESS, contractAddress],
    query: {
      enabled: isPaidRegistrationEnabled,
    },
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: paymentTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress ?? ZERO_ADDRESS],
    query: {
      enabled: isPaidRegistrationEnabled,
    },
  });

  const { data: isIssuerApproved } = useReadContract({
    address: contractAddress,
    abi: receiptuaryAbi,
    functionName: "isIssuerApproved",
    args: [userAddress ?? ZERO_ADDRESS],
    query: {
      enabled: isContractConfigured && !!userAddress,
    },
  });

  const { data: existingReceipt } = useReadContract({
    address: contractAddress,
    abi: receiptuaryAbi,
    functionName: "getReceipt",
    args: [fileHash],
    query: {
      enabled: isContractConfigured && !!fileHash,
    },
  });

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } =
    useWaitForTransactionReceipt({
      hash: registerTxHash,
    });

  useEffect(() => {
    if (!isApproveSuccess) {
      return;
    }

    // After approve is mined, refresh allowance/balance so CTA states update immediately.
    void refetchAllowance();
    void refetchTokenBalance();

    // Some RPC/indexers can lag briefly right after confirmation.
    const retryTimer = window.setTimeout(() => {
      void refetchAllowance();
      void refetchTokenBalance();
    }, 1500);

    return () => window.clearTimeout(retryTimer);
  }, [isApproveSuccess, refetchAllowance, refetchTokenBalance]);

  const resolvedSymbol = tokenSymbol || paymentTokenSymbolFallback;
  const resolvedDecimals = Number(tokenDecimals ?? 6);
  const feeDisplay = useMemo(
    () => formatUnits(paymentFeeAmount, resolvedDecimals),
    [paymentFeeAmount, resolvedDecimals],
  );
  const hasEnoughAllowance = (allowance ?? BigInt(0)) >= paymentFeeAmount;
  const hasEnoughBalance = (tokenBalance ?? BigInt(0)) >= paymentFeeAmount;
  const isHashAlreadyRegistered =
    Array.isArray(existingReceipt) && existingReceipt[3] === true;
  const hasConfirmedApproval = isApproveSuccess;
  const canProceedAfterApproval = hasEnoughAllowance || hasConfirmedApproval;
  const approveExplorerUrl = approveTxHash
    ? getExplorerTxUrl(chainId, approveTxHash)
    : null;
  const registerExplorerUrl = registerTxHash
    ? getExplorerTxUrl(chainId, registerTxHash)
    : null;
  const approveFriendlyError = approveError
    ? toUserFriendlyError(approveError, "register")
    : null;
  const approveTechnicalError = approveError
    ? getTechnicalErrorDetails(approveError)
    : null;
  const registerFriendlyError = registerError
    ? toUserFriendlyError(registerError, "register")
    : null;
  const registerTechnicalError = registerError
    ? getTechnicalErrorDetails(registerError)
    : null;
  const hasIssuerApproval = isIssuerApproved === true;

  const submitDisabled =
    !isContractConfigured ||
    !isPaidRegistrationEnabled ||
    !isConnected ||
    isWrongNetwork ||
    !issuerName.trim() ||
    !fileHash ||
    isHashAlreadyRegistered ||
    !acceptedFee ||
    isApprovePending ||
    isApproveConfirming ||
    isRegisterPending ||
    isRegisterConfirming ||
    !canProceedAfterApproval ||
    !hasEnoughBalance;

  // Approval is separated from register to follow ERC-20 allowance flow explicitly.
  const approveDisabled =
    !isPaidRegistrationEnabled ||
    !isContractConfigured ||
    !isConnected ||
    isWrongNetwork ||
    !fileHash ||
    isHashAlreadyRegistered ||
    !acceptedFee ||
    isApprovePending ||
    isApproveConfirming ||
    isRegisterPending ||
    isRegisterConfirming ||
    canProceedAfterApproval ||
    !hasEnoughBalance;

  useEffect(() => {
    if (
      !isConnected ||
      !isPaidRegistrationEnabled ||
      !userAddress ||
      hasEnoughAllowance
    ) {
      return;
    }

    const syncIntervalMs =
      hasConfirmedApproval && !hasEnoughAllowance ? 1500 : 4000;

    const interval = window.setInterval(() => {
      void refetchAllowance();
      void refetchTokenBalance();
    }, syncIntervalMs);

    return () => window.clearInterval(interval);
  }, [
    hasConfirmedApproval,
    hasEnoughAllowance,
    isConnected,
    isPaidRegistrationEnabled,
    refetchAllowance,
    refetchTokenBalance,
    userAddress,
  ]);

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!isConnected) {
      blockers.push("Connect your wallet.");
    }
    if (isWrongNetwork) {
      blockers.push(`Switch wallet network to ${requiredChainLabel}.`);
    }
    if (!fileHash) {
      blockers.push("Upload a receipt file first.");
    }
    if (isHashAlreadyRegistered) {
      blockers.push("This receipt hash is already registered on-chain.");
    }
    if (!issuerName.trim()) {
      blockers.push("Enter issuer name.");
    }
    if (!acceptedFee) {
      blockers.push("Accept the fee checkbox.");
    }
    if (!hasEnoughBalance) {
      blockers.push(`Insufficient ${resolvedSymbol} balance.`);
    }
    if (!canProceedAfterApproval) {
      blockers.push(`Approve ${feeDisplay} ${resolvedSymbol} first.`);
    }
    if (isApprovePending || isApproveConfirming) {
      blockers.push("Approval is still confirming on-chain.");
    }
    if (isRegisterPending || isRegisterConfirming) {
      blockers.push("A register transaction is already in progress.");
    }

    return blockers;
  }, [
    acceptedFee,
    feeDisplay,
    fileHash,
    canProceedAfterApproval,
    hasEnoughBalance,
    isHashAlreadyRegistered,
    isApproveConfirming,
    isApprovePending,
    isConnected,
    isWrongNetwork,
    isRegisterConfirming,
    isRegisterPending,
    issuerName,
    requiredChainLabel,
    resolvedSymbol,
  ]);

  const handleApprove = () => {
    if (approveDisabled) {
      return;
    }

    writeApprove({
      address: paymentTokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddress, paymentFeeAmount],
      gas: ERC20_APPROVE_GAS_LIMIT,
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    // Register call only happens once all guards pass (wallet, fee consent, allowance, balance).
    writeRegister({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "registerReceipt",
      args: [fileHash, issuerName.trim()],
      gas: REGISTER_RECEIPT_GAS_LIMIT,
    });
  };

  const handleCopyTxHash = async () => {
    if (!registerTxHash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(registerTxHash);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"
    >
      <h3 className="font-[var(--font-display)] text-lg font-semibold">
        Issuer: Register receipt (paid)
      </h3>

      {!isPaidRegistrationEnabled ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300">
          Paid registration is not fully configured. Add
          NEXT_PUBLIC_USDC_TOKEN_ADDRESS, NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT,
          and NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT to your env file.
        </div>
      ) : null}

      {isConnected && isWrongNetwork ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Switch wallet network to {requiredChainLabel} before approving fee and
          registering.
        </p>
      ) : null}

      {fileHash && isHashAlreadyRegistered ? (
        <p className="text-xs text-rose-700 dark:text-rose-300">
          This file hash is already registered on-chain. Upload a different
          receipt file to continue.
        </p>
      ) : null}

      {isConnected && !hasIssuerApproval ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This wallet is not currently allowlisted as a trusted issuer. You can
          still register receipts, but verifiers may treat allowlisted issuers
          as higher-trust profiles.
        </p>
      ) : null}

      {isConnected && hasIssuerApproval ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Trusted issuer profile: this wallet is currently allowlisted.
        </p>
      ) : null}

      <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-900 dark:text-emerald-300">
        <p className="font-semibold">Service fee</p>
        <p className="mt-1">
          {feeDisplay} {resolvedSymbol} per registration
        </p>
        <p className="mt-1 break-all">Recipient: {paymentRecipientAddress}</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-700 dark:text-stone-300">
          Issuer name
        </span>
        <input
          className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm outline-none ring-[var(--accent)] transition focus:ring-2 dark:text-[var(--foreground)]"
          required
          value={issuerName}
          onChange={(event) => setIssuerName(event.target.value)}
          placeholder="e.g. Apple Store"
        />
      </label>

      <label className="flex items-start gap-2 rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-xs text-stone-700 dark:text-stone-300">
        <input
          type="checkbox"
          checked={acceptedFee}
          onChange={(event) => setAcceptedFee(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)]"
        />
        <span>
          I understand this will register the receipt on-chain and charge a
          service fee of {feeDisplay} {resolvedSymbol} from my wallet.
        </span>
      </label>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        Privacy note: only the file hash and issuer identity are anchored
        on-chain. Do not include personal data in issuer naming.
      </p>

      {!isConnected ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Connect your wallet to approve payment and register a receipt.
        </p>
      ) : null}

      {isConnected && !hasEnoughBalance ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Your wallet does not have enough {resolvedSymbol} to pay the service
          fee.
        </p>
      ) : null}

      {isConnected && !canProceedAfterApproval ? (
        <button
          type="button"
          onClick={handleApprove}
          disabled={approveDisabled}
          className="w-full rounded-xl border border-[var(--accent)] bg-white dark:bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApprovePending
            ? `Approve ${resolvedSymbol} in wallet`
            : isApproveConfirming
              ? "Waiting for approve confirmation"
              : `Approve ${feeDisplay} ${resolvedSymbol}`}
        </button>
      ) : isConnected ? (
        <div className="space-y-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
          <p>
            Payment approval is complete. You can now click &quot;Pay and
            register receipt&quot;.
          </p>
          {hasConfirmedApproval && !hasEnoughAllowance ? (
            <p className="font-normal text-emerald-900/80 dark:text-emerald-300/80">
              Approval tx is confirmed. Waiting for allowance sync from RPC.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRegisterPending
          ? "Confirm in wallet"
          : isRegisterConfirming
            ? "Writing to blockchain"
            : "Pay and register receipt"}
      </button>

      {submitDisabled && submitBlockers.length > 0 ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-xs text-amber-900 dark:text-amber-300">
          <p className="font-semibold">Complete these steps to continue:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {submitBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isRegisterSuccess ? (
        <p className="text-sm text-[var(--accent)]">
          Receipt registered. Fee paid: {feeDisplay} {resolvedSymbol}.
        </p>
      ) : null}

      {approveTxHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">
            Approve tx: {approveTxHash}
          </p>
          <div className="flex gap-2">
            {approveExplorerUrl ? (
              <a
                href={approveExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700 dark:text-stone-300"
              >
                Open approve tx
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {registerTxHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">
            Register tx: {registerTxHash}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyTxHash}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              {copyState === "done" ? "Copied" : "Copy hash"}
            </button>
            {registerExplorerUrl ? (
              <a
                href={registerExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700 dark:text-stone-300"
              >
                Open explorer
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {approveError ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300">
          <p>{approveFriendlyError}</p>
          {approveTechnicalError ? (
            <details className="mt-2 text-xs text-amber-900/80 dark:text-amber-300/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{approveTechnicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {registerError ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300">
          <p>{registerFriendlyError}</p>
          {registerTechnicalError ? (
            <details className="mt-2 text-xs text-amber-900/80 dark:text-amber-300/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{registerTechnicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
