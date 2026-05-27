"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { isAddress } from "viem";
import {
  useChainId,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { truncateHash } from "@/lib/crypto";
import { getExplorerTxUrl } from "@/lib/explorer";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import { useRuntimeConfig } from "@/lib/runtime-config-context";

type Props = {
  walletAddress: Address;
  wrongChain: boolean;
};

type DirectoryAction = "approve" | "revoke";

type IssuerDirectoryEntry = {
  address: Address;
  label?: string;
  groupTag?: string;
  updatedAt: number;
  lastAction: DirectoryAction;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function loadDirectoryEntries(storageKey: string): IssuerDirectoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<{
      address?: string;
      label?: string;
      groupTag?: string;
      updatedAt?: number;
      lastAction?: DirectoryAction;
    }>;

    return parsed
      .filter((entry) => entry.address && isAddress(entry.address))
      .map((entry) => ({
        address: entry.address as Address,
        label: typeof entry.label === "string" ? entry.label.trim() : undefined,
        groupTag:
          typeof entry.groupTag === "string"
            ? entry.groupTag.trim()
            : undefined,
        updatedAt:
          typeof entry.updatedAt === "number" ? entry.updatedAt : Date.now(),
        lastAction: entry.lastAction === "revoke" ? "revoke" : "approve",
      }));
  } catch {
    return [];
  }
}

export function IssuerAllowlistManager({ walletAddress, wrongChain }: Props) {
  const { runtimeConfig } = useRuntimeConfig();
  const { contractAddress, isContractConfigured, receiptuaryAbi } =
    runtimeConfig;
  const chainId = useChainId();
  const storageKey = useMemo(
    () =>
      `receiptuary:issuer-directory:${chainId}:${contractAddress.toLowerCase()}`,
    [chainId, contractAddress],
  );
  const [issuerInput, setIssuerInput] = useState("");
  const [issuerLabelInput, setIssuerLabelInput] = useState("");
  const [issuerGroupInput, setIssuerGroupInput] = useState("");
  const [mode, setMode] = useState<"approve" | "revoke">("approve");
  const [directorySearch, setDirectorySearch] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("all");
  const [directoryEntries, setDirectoryEntries] = useState<
    IssuerDirectoryEntry[]
  >(() => loadDirectoryEntries(storageKey));
  const [lastSubmittedTarget, setLastSubmittedTarget] = useState<{
    address: Address;
    action: DirectoryAction;
    label?: string;
    groupTag?: string;
  } | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});
  const syncedSuccessTxRef = useRef<string | null>(null);

  const normalizedIssuer = issuerInput.trim();
  const isValidIssuerAddress = isAddress(normalizedIssuer);
  const issuerAddress = (
    isValidIssuerAddress ? normalizedIssuer : ZERO_ADDRESS
  ) as Address;

  const { data: ownerAddress } = useReadContract({
    address: contractAddress,
    abi: receiptuaryAbi,
    functionName: "owner",
    query: {
      enabled: isContractConfigured,
    },
  });

  const { data: currentStatus, refetch: refetchCurrentStatus } =
    useReadContract({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "isIssuerApproved",
      args: [issuerAddress],
      query: {
        enabled: isContractConfigured && isValidIssuerAddress,
      },
    });

  const isOwner =
    !!ownerAddress &&
    ownerAddress.toLowerCase() === walletAddress.toLowerCase();

  const {
    data: txHash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const explorerTxUrl = txHash ? getExplorerTxUrl(chainId, txHash) : null;
  const friendlyError = writeError
    ? toUserFriendlyError(writeError, "register")
    : null;
  const technicalError = writeError
    ? getTechnicalErrorDetails(writeError)
    : null;

  const desiredApproval = mode === "approve";
  const availableGroupFilters = useMemo(() => {
    const unique = new Set<string>();
    for (const entry of directoryEntries) {
      const normalized = entry.groupTag?.trim();
      if (normalized) {
        unique.add(normalized);
      }
    }

    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [directoryEntries]);

  const filteredDirectoryEntries = useMemo(() => {
    const search = directorySearch.trim().toLowerCase();

    return directoryEntries.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.address.toLowerCase().includes(search) ||
        entry.label?.toLowerCase().includes(search) ||
        entry.groupTag?.toLowerCase().includes(search);
      const matchesGroup =
        selectedGroupFilter === "all" ||
        (entry.groupTag ?? "") === selectedGroupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [directoryEntries, directorySearch, selectedGroupFilter]);

  const {
    data: directoryStatuses,
    refetch: refetchDirectoryStatuses,
    isFetching: directoryStatusesFetching,
  } = useReadContracts({
    contracts: filteredDirectoryEntries.map((entry) => ({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "isIssuerApproved",
      args: [entry.address],
    })),
    query: {
      enabled:
        isContractConfigured &&
        filteredDirectoryEntries.length > 0 &&
        !wrongChain,
    },
  });

  const persistDirectoryEntries = useCallback(
    (entries: IssuerDirectoryEntry[]) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(entries));
      } catch {
        // Ignore storage write issues.
      }
    },
    [storageKey],
  );

  const getDirectoryStatus = (index: number): boolean | null => {
    const result = directoryStatuses?.[index];
    if (!result || result.status !== "success") {
      return null;
    }

    return Boolean(result.result);
  };

  useEffect(() => {
    if (!isSuccess || !txHash || !lastSubmittedTarget) {
      return;
    }

    if (syncedSuccessTxRef.current === txHash) {
      return;
    }

    syncedSuccessTxRef.current = txHash;
    setDirectoryEntries((current) => {
      const existing = current.find(
        (item) =>
          item.address.toLowerCase() ===
          lastSubmittedTarget.address.toLowerCase(),
      );
      const normalizedLabel = lastSubmittedTarget.label?.trim();
      const normalizedGroup = lastSubmittedTarget.groupTag?.trim();
      const nextEntry: IssuerDirectoryEntry = {
        address: lastSubmittedTarget.address,
        label:
          normalizedLabel && normalizedLabel.length > 0
            ? normalizedLabel
            : existing?.label,
        groupTag:
          normalizedGroup && normalizedGroup.length > 0
            ? normalizedGroup
            : existing?.groupTag,
        lastAction: lastSubmittedTarget.action,
        updatedAt: Date.now(),
      };
      const withoutSameAddress = current.filter(
        (item) =>
          item.address.toLowerCase() !== nextEntry.address.toLowerCase(),
      );
      const next = [nextEntry, ...withoutSameAddress].slice(0, 30);
      persistDirectoryEntries(next);
      return next;
    });
    void refetchDirectoryStatuses();
  }, [
    isSuccess,
    lastSubmittedTarget,
    txHash,
    refetchDirectoryStatuses,
    persistDirectoryEntries,
  ]);

  const statusLabel = useMemo(() => {
    if (!isValidIssuerAddress) {
      return "Enter a valid wallet address";
    }

    if (currentStatus === true) {
      return "Currently approved";
    }

    if (currentStatus === false) {
      return "Currently not approved";
    }

    return "Checking current status";
  }, [currentStatus, isValidIssuerAddress]);

  const actionDisabled =
    !isOwner ||
    wrongChain ||
    !isValidIssuerAddress ||
    isPending ||
    isConfirming ||
    !isContractConfigured;

  const handleSubmit = () => {
    if (actionDisabled) {
      return;
    }

    setLastSubmittedTarget({
      address: issuerAddress,
      action: mode,
      label: issuerLabelInput.trim() || undefined,
      groupTag: issuerGroupInput.trim() || undefined,
    });

    writeContract({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "setIssuerApproval",
      args: [issuerAddress, desiredApproval],
    });
  };

  const handleRefreshStatus = async () => {
    if (!isValidIssuerAddress) {
      return;
    }

    await refetchCurrentStatus();
  };

  const handleQuickAction = (
    targetAddress: Address,
    action: DirectoryAction,
  ) => {
    if (!isOwner || wrongChain || isPending || isConfirming) {
      return;
    }

    const entry = directoryEntries.find(
      (item) => item.address.toLowerCase() === targetAddress.toLowerCase(),
    );

    setLastSubmittedTarget({
      address: targetAddress,
      action,
      label: entry?.label,
      groupTag: entry?.groupTag,
    });

    setIssuerInput(targetAddress);
    setIssuerLabelInput(entry?.label ?? "");
    setIssuerGroupInput(entry?.groupTag ?? "");
    setMode(action);

    writeContract({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "setIssuerApproval",
      args: [targetAddress, action === "approve"],
    });
  };

  const handleSaveLabel = (targetAddress: Address) => {
    const hasLabelDraft = Object.prototype.hasOwnProperty.call(
      labelDrafts,
      targetAddress,
    );
    const hasGroupDraft = Object.prototype.hasOwnProperty.call(
      groupDrafts,
      targetAddress,
    );
    const labelDraft = hasLabelDraft ? labelDrafts[targetAddress].trim() : null;
    const groupDraft = hasGroupDraft ? groupDrafts[targetAddress].trim() : null;

    setDirectoryEntries((current) => {
      const next = current.map((item) => {
        if (item.address.toLowerCase() !== targetAddress.toLowerCase()) {
          return item;
        }

        return {
          ...item,
          label: hasLabelDraft ? labelDraft || undefined : item.label,
          groupTag: hasGroupDraft ? groupDraft || undefined : item.groupTag,
          updatedAt: Date.now(),
        };
      });
      persistDirectoryEntries(next);
      return next;
    });
  };

  const handleLoadEntryInForm = (entry: IssuerDirectoryEntry) => {
    setIssuerInput(entry.address);
    setIssuerLabelInput(entry.label ?? "");
    setIssuerGroupInput(entry.groupTag ?? "");
    setMode("approve");
  };

  if (!isOwner) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-white dark:from-[var(--card)] via-[var(--accent-soft)]/60 to-emerald-50/60 dark:to-emerald-950/20 p-4 sm:p-5">
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          Only the contract owner can update the issuer allowlist. Share this
          dashboard with your customer owner wallet for self-service management.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-white dark:from-[var(--card)] via-[var(--accent-soft)]/60 to-emerald-50/60 dark:to-emerald-950/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Access control
          </p>
          <h2 className="mt-1 font-[var(--font-display)] text-xl text-stone-900 dark:text-stone-100">
            Issuer allowlist manager
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Approve or revoke issuer wallets directly from this dashboard.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            isOwner
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
          }`}
        >
          {isOwner ? "Owner session" : "Read-only session"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Contract owner
          </p>
          <p className="mt-1 font-[var(--font-mono)] text-sm font-semibold text-stone-900 dark:text-stone-100">
            {ownerAddress ? truncateHash(ownerAddress, 8) : "Loading"}
          </p>
          {ownerAddress ? (
            <p className="mt-1 break-all font-[var(--font-mono)] text-xs text-stone-500 dark:text-stone-400">
              {ownerAddress}
            </p>
          ) : null}
        </article>

        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Your wallet
          </p>
          <p className="mt-1 font-[var(--font-mono)] text-sm font-semibold text-stone-900 dark:text-stone-100">
            {truncateHash(walletAddress, 8)}
          </p>
          <p className="mt-1 break-all font-[var(--font-mono)] text-xs text-stone-500 dark:text-stone-400">
            {walletAddress}
          </p>
        </article>
      </div>

      {wrongChain ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          Switch to the deployment network to update issuer access.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Issuer wallet address
          </span>
          <input
            type="text"
            value={issuerInput}
            onChange={(event) => setIssuerInput(event.target.value)}
            placeholder="0x..."
            className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Action
          </span>
          <div className="inline-flex rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1">
            <button
              type="button"
              onClick={() => setMode("approve")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === "approve"
                  ? "bg-emerald-600 text-white"
                  : "text-stone-700 dark:text-stone-300"
              }`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setMode("revoke")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mode === "revoke"
                  ? "bg-rose-600 text-white"
                  : "text-stone-700 dark:text-stone-300"
              }`}
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
          Issuer name/tag (optional)
        </span>
        <input
          type="text"
          value={issuerLabelInput}
          onChange={(event) => setIssuerLabelInput(event.target.value)}
          placeholder="e.g. Apple Store"
          className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
        />
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
          Group tag (optional)
        </span>
        <input
          type="text"
          value={issuerGroupInput}
          onChange={(event) => setIssuerGroupInput(event.target.value)}
          placeholder="e.g. Retail"
          className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-stone-700 dark:text-stone-300">
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={() => void handleRefreshStatus()}
          disabled={!isValidIssuerAddress}
          className="rounded-full border border-[var(--card-border)] px-3 py-1 text-xs font-semibold text-stone-700 transition hover:bg-[var(--accent-soft)] dark:text-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh status
        </button>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={actionDisabled}
        className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Confirm in wallet"
          : isConfirming
            ? "Waiting for confirmation"
            : mode === "approve"
              ? "Approve issuer"
              : "Revoke issuer"}
      </button>

      {isSuccess ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
          Issuer status updated successfully.
        </p>
      ) : null}

      {txHash ? (
        <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs">
          <p className="break-all font-[var(--font-mono)]">Tx: {txHash}</p>
          {explorerTxUrl ? (
            <a
              href={explorerTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex rounded-lg border border-[var(--card-border)] px-3 py-1 font-semibold text-stone-700 dark:text-stone-300"
            >
              Open in explorer
            </a>
          ) : null}
        </div>
      ) : null}

      {writeError ? (
        <div className="mt-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-sm text-amber-900 dark:text-amber-300">
          <p>{friendlyError}</p>
          {technicalError ? (
            <details className="mt-2 text-xs text-amber-900/80 dark:text-amber-300/80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{technicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
              Issuer directory
            </p>
            <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
              Recently managed issuer wallets with quick status updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetchDirectoryStatuses()}
            disabled={filteredDirectoryEntries.length === 0 || wrongChain}
            className="inline-flex rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[var(--accent-soft)] dark:text-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {directoryStatusesFetching ? "Refreshing..." : "Refresh all"}
          </button>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Search directory
          </span>
          <input
            type="text"
            value={directorySearch}
            onChange={(event) => setDirectorySearch(event.target.value)}
            placeholder="Search by wallet or label"
            className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {availableGroupFilters.map((group) => {
            const active = selectedGroupFilter === group;
            const label = group === "all" ? "All groups" : group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroupFilter(group)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--card-border)] text-stone-700 hover:bg-[var(--accent-soft)] dark:text-stone-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {filteredDirectoryEntries.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            No issuer entries yet. The directory is populated automatically
            after successful approve/revoke actions.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredDirectoryEntries.map((entry, index) => {
              const status = getDirectoryStatus(index);
              const statusText =
                status === null
                  ? "Unknown"
                  : status
                    ? "Approved"
                    : "Not approved";
              const statusClass =
                status === null
                  ? "border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300"
                  : status
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300";

              return (
                <article
                  key={entry.address}
                  className="rounded-xl border border-[var(--card-border)] bg-white/90 dark:bg-[var(--card)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {entry.label && entry.label.length > 0
                          ? entry.label
                          : "Unlabeled issuer"}
                      </p>
                      <p className="mt-1 inline-flex rounded-full border border-[var(--card-border)] px-2 py-0.5 text-[11px] text-stone-600 dark:text-stone-300">
                        Group:{" "}
                        {entry.groupTag && entry.groupTag.length > 0
                          ? entry.groupTag
                          : "None"}
                      </p>
                      <p className="mt-1 font-[var(--font-mono)] text-xs font-semibold break-all text-stone-800 dark:text-stone-100">
                        {entry.address}
                      </p>
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Last action: {entry.lastAction} at{" "}
                        {new Date(entry.updatedAt).toLocaleString("sv-SE")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={labelDrafts[entry.address] ?? entry.label ?? ""}
                        onChange={(event) =>
                          setLabelDrafts((current) => ({
                            ...current,
                            [entry.address]: event.target.value,
                          }))
                        }
                        placeholder="Set issuer name/tag"
                        className="w-full rounded-lg border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
                      />
                      <input
                        type="text"
                        value={
                          groupDrafts[entry.address] ?? entry.groupTag ?? ""
                        }
                        onChange={(event) =>
                          setGroupDrafts((current) => ({
                            ...current,
                            [entry.address]: event.target.value,
                          }))
                        }
                        placeholder="Set group tag"
                        className="w-full rounded-lg border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-2.5 py-1.5 text-xs text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveLabel(entry.address)}
                      className="rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[var(--accent-soft)] dark:text-stone-300"
                    >
                      Save label
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadEntryInForm(entry)}
                      className="rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:bg-[var(--accent-soft)] dark:text-stone-300"
                    >
                      Load in form
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickAction(entry.address, "approve")
                      }
                      disabled={
                        !isOwner || wrongChain || isPending || isConfirming
                      }
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                      Quick approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAction(entry.address, "revoke")}
                      disabled={
                        !isOwner || wrongChain || isPending || isConfirming
                      }
                      className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                    >
                      Quick revoke
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
