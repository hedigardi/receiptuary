"use client";

import { Interface } from "ethers";
import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PaymasterMode } from "@biconomy/account";
import { AA_CHAIN_ID } from "@/lib/aa";
import { getExplorerTxUrl } from "@/lib/explorer";
import { IS_PAID_REGISTRATION_ENABLED } from "@/lib/payment";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import { RECEIPTUARY_ABI, CONTRACT_ADDRESS } from "@/lib/receiptuary";
import { useSmartAccount } from "@/hooks/use-smart-account";

type Props = {
  fileHash: `0x${string}`;
};

export function GaslessRegister({ fileHash }: Props) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { smartAccount, smartAccountAddress, isLoading, error, isEnvReady } =
    useSmartAccount();

  const [issuerName, setIssuerName] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");

  const abiInterface = useMemo(() => new Interface(RECEIPTUARY_ABI), []);
  const explorerUrl = txHash ? getExplorerTxUrl(AA_CHAIN_ID, txHash) : null;

  if (IS_PAID_REGISTRATION_ENABLED) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        Paid registration is currently supported in Wallet mode only. Switch to
        Wallet to approve payment and register receipts.
      </div>
    );
  }

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!smartAccount || !issuerName.trim() || !fileHash) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setTxHash(null);

    try {
      const data = abiInterface.encodeFunctionData("registerReceipt", [
        fileHash,
        issuerName.trim(),
        referenceId.trim(),
      ]);

      const userOpResponse = await smartAccount.sendTransaction(
        {
          to: CONTRACT_ADDRESS,
          data,
        },
        {
          paymasterServiceData: { mode: PaymasterMode.SPONSORED },
        },
      );

      const { receipt } = await userOpResponse.wait();
      setTxHash(receipt.transactionHash);
    } catch (caught) {
      setSubmitError(toUserFriendlyError(caught, "gasless"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTxHash = async () => {
    if (!txHash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(txHash);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  };

  if (!isEnvReady) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        Gasless mode is enabled, but Privy/Biconomy env vars are missing.
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-sm text-stone-600">
        Loading authentication.
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <p className="text-sm text-stone-700">
          Sign in with Google or email to use gasless registration.
        </p>
        <button
          type="button"
          onClick={login}
          className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Sign in with Privy
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleRegister}
      className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"
    >
      <h3 className="font-[var(--font-display)] text-lg font-semibold">
        Issuer: Gasless registration (AA)
      </h3>

      <div className="rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-xs text-stone-700">
        <p className="font-semibold">Smart Account</p>
        <p className="mt-1 break-all font-[var(--font-mono)]">
          {smartAccountAddress || "Initializing..."}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-stone-700">Issuer name</span>
        <input
          className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] transition focus:ring-2"
          required
          value={issuerName}
          onChange={(event) => setIssuerName(event.target.value)}
          placeholder="e.g. IKEA"
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

      <button
        type="submit"
        disabled={
          isLoading || isSubmitting || !smartAccount || !issuerName.trim()
        }
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? "Sending gasless transaction"
          : isLoading
            ? "Preparing smart account"
            : "Register without gas fee"}
      </button>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-stone-700"
      >
        Sign out from Privy
      </button>

      {txHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white p-3 text-xs">
          <p className="break-all font-[var(--font-mono)] text-[var(--accent)]">
            Tx hash: {txHash}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyTxHash}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700"
            >
              {copyState === "done" ? "Copied" : "Copy hash"}
            </button>
            {explorerUrl ? (
              <a
                href={explorerUrl}
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
      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p>{toUserFriendlyError(error, "smartAccount")}</p>
          {getTechnicalErrorDetails(error) ? (
            <details className="mt-2 opacity-80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">
                {getTechnicalErrorDetails(error)}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}
      {submitError ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p>{submitError}</p>
        </div>
      ) : null}
    </form>
  );
}
