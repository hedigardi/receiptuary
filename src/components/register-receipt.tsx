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
import { getExplorerTxUrl } from "@/lib/explorer";
import {
  ERC20_ABI,
  IS_PAID_REGISTRATION_ENABLED,
  PAYMENT_FEE_AMOUNT,
  PAYMENT_RECIPIENT_ADDRESS,
  PAYMENT_TOKEN_ADDRESS,
  PAYMENT_TOKEN_SYMBOL_FALLBACK,
} from "@/lib/payment";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  RECEIPTUARY_ABI,
} from "@/lib/receiptuary";

type Props = {
  fileHash: `0x${string}`;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function RegisterReceipt({ fileHash }: Props) {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const [issuerName, setIssuerName] = useState("");
  const [referenceId, setReferenceId] = useState("");
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
    address: PAYMENT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: IS_PAID_REGISTRATION_ENABLED,
    },
  });

  const { data: tokenDecimals } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: IS_PAID_REGISTRATION_ENABLED,
    },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress ?? ZERO_ADDRESS, CONTRACT_ADDRESS],
    query: {
      enabled: IS_PAID_REGISTRATION_ENABLED,
    },
  });

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress ?? ZERO_ADDRESS],
    query: {
      enabled: IS_PAID_REGISTRATION_ENABLED,
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

    void refetchAllowance();
    void refetchTokenBalance();
  }, [isApproveSuccess, refetchAllowance, refetchTokenBalance]);

  const resolvedSymbol = tokenSymbol || PAYMENT_TOKEN_SYMBOL_FALLBACK;
  const resolvedDecimals = Number(tokenDecimals ?? 6);
  const feeDisplay = useMemo(
    () => formatUnits(PAYMENT_FEE_AMOUNT, resolvedDecimals),
    [resolvedDecimals],
  );
  const hasEnoughAllowance = (allowance ?? BigInt(0)) >= PAYMENT_FEE_AMOUNT;
  const hasEnoughBalance = (tokenBalance ?? BigInt(0)) >= PAYMENT_FEE_AMOUNT;
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

  const submitDisabled =
    !IS_CONTRACT_CONFIGURED ||
    !IS_PAID_REGISTRATION_ENABLED ||
    !isConnected ||
    !issuerName.trim() ||
    !fileHash ||
    !acceptedFee ||
    isApprovePending ||
    isApproveConfirming ||
    isRegisterPending ||
    isRegisterConfirming ||
    !hasEnoughAllowance ||
    !hasEnoughBalance;

  const approveDisabled =
    !IS_PAID_REGISTRATION_ENABLED ||
    !IS_CONTRACT_CONFIGURED ||
    !isConnected ||
    !fileHash ||
    !acceptedFee ||
    isApprovePending ||
    isApproveConfirming ||
    isRegisterPending ||
    isRegisterConfirming ||
    hasEnoughAllowance ||
    !hasEnoughBalance;

  const handleApprove = () => {
    if (approveDisabled) {
      return;
    }

    writeApprove({
      address: PAYMENT_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, PAYMENT_FEE_AMOUNT],
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    writeRegister({
      address: CONTRACT_ADDRESS,
      abi: RECEIPTUARY_ABI,
      functionName: "registerReceipt",
      args: [fileHash, issuerName.trim(), referenceId.trim()],
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

      {!IS_PAID_REGISTRATION_ENABLED ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Paid registration is not fully configured. Add
          NEXT_PUBLIC_USDC_TOKEN_ADDRESS, NEXT_PUBLIC_RECEIPTUARY_FEE_RECIPIENT,
          and NEXT_PUBLIC_RECEIPTUARY_FEE_AMOUNT to your env file.
        </div>
      ) : null}

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <p className="font-semibold">Service fee</p>
        <p className="mt-1">
          {feeDisplay} {resolvedSymbol} per registration
        </p>
        <p className="mt-1 break-all">Recipient: {PAYMENT_RECIPIENT_ADDRESS}</p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-700">Issuer name</span>
        <input
          className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] transition focus:ring-2"
          required
          value={issuerName}
          onChange={(event) => setIssuerName(event.target.value)}
          placeholder="e.g. Apple Store"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-700">
          Reference ID (optional)
        </span>
        <input
          className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] transition focus:ring-2"
          value={referenceId}
          onChange={(event) => setReferenceId(event.target.value)}
          placeholder="e.g. INV-2026-001"
        />
      </label>

      <label className="flex items-start gap-2 rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-xs text-stone-700">
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

      {!isConnected ? (
        <p className="text-xs text-amber-700">
          Connect your wallet to approve payment and register a receipt.
        </p>
      ) : null}

      {isConnected && !hasEnoughBalance ? (
        <p className="text-xs text-amber-700">
          Your wallet does not have enough {resolvedSymbol} to pay the service
          fee.
        </p>
      ) : null}

      {isConnected && !hasEnoughAllowance ? (
        <button
          type="button"
          onClick={handleApprove}
          disabled={approveDisabled}
          className="w-full rounded-xl border border-[var(--accent)] bg-white px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApprovePending
            ? `Approve ${resolvedSymbol} in wallet`
            : isApproveConfirming
              ? "Waiting for approve confirmation"
              : `Approve ${feeDisplay} ${resolvedSymbol}`}
        </button>
      ) : isConnected ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          Allowance ready. You can complete registration now.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRegisterPending
          ? "Confirm in wallet"
          : isRegisterConfirming
            ? "Writing to blockchain"
            : "Pay and register receipt"}
      </button>

      {isRegisterSuccess ? (
        <p className="text-sm text-[var(--accent)]">
          Receipt registered. Fee paid: {feeDisplay} {resolvedSymbol}.
        </p>
      ) : null}

      {approveTxHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">
            Approve tx: {approveTxHash}
          </p>
          <div className="flex gap-2">
            {approveExplorerUrl ? (
              <a
                href={approveExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700"
              >
                Open approve tx
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {registerTxHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">
            Register tx: {registerTxHash}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyTxHash}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700"
            >
              {copyState === "done" ? "Copied" : "Copy hash"}
            </button>
            {registerExplorerUrl ? (
              <a
                href={registerExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700"
              >
                Open explorer
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {approveError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{approveFriendlyError}</p>
          {approveTechnicalError ? (
            <details className="mt-2 text-xs text-amber-900/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{approveTechnicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {registerError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{registerFriendlyError}</p>
          {registerTechnicalError ? (
            <details className="mt-2 text-xs text-amber-900/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{registerTechnicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
