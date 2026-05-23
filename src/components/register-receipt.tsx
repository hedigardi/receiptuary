"use client";

import { useState } from "react";
import {
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { getExplorerTxUrl } from "@/lib/explorer";
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

export function RegisterReceipt({ fileHash }: Props) {
  const chainId = useChainId();
  const [issuerName, setIssuerName] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const { data: txHash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const explorerUrl = txHash ? getExplorerTxUrl(chainId, txHash) : null;
  const friendlyError = error ? toUserFriendlyError(error, "register") : null;
  const technicalError = error ? getTechnicalErrorDetails(error) : null;

  const submitDisabled =
    !IS_CONTRACT_CONFIGURED ||
    !issuerName.trim() ||
    isPending ||
    isConfirming ||
    !fileHash;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitDisabled) {
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RECEIPTUARY_ABI,
      functionName: "registerReceipt",
      args: [fileHash, issuerName.trim(), referenceId.trim()],
    });
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5"
    >
      <h3 className="font-[var(--font-display)] text-lg font-semibold">
        Issuer: Anchor receipt on-chain
      </h3>

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

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Confirm in wallet"
          : isConfirming
            ? "Writing to blockchain"
            : "Register receipt"}
      </button>

      {isSuccess ? (
        <p className="text-sm text-[var(--accent)]">
          Receipt registered. The hash is now permanently anchored on-chain.
        </p>
      ) : null}
      {txHash ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-white p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">Tx hash: {txHash}</p>
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
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{friendlyError}</p>
          {technicalError ? (
            <details className="mt-2 text-xs text-amber-900/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{technicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
