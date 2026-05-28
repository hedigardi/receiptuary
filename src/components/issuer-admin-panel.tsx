"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, http, type Address, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { useChainId, usePublicClient, useReadContracts } from "wagmi";
import { truncateHash } from "@/lib/crypto";
import { getChainIdFromNetworkName, getExplorerTxUrl } from "@/lib/explorer";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import { useRuntimeConfig } from "@/lib/runtime-config-context";

type Props = {
  walletAddress: Address;
  wrongChain: boolean;
};

type ReceiptTuple = readonly [string, bigint, Address, boolean];

type IssuerReceipt = {
  fileHash: `0x${string}`;
  issuerName: string;
  timestamp: bigint;
  registeredBy: Address;
  txHash: `0x${string}`;
};

type ReceiptEventLog = {
  fileHash: `0x${string}`;
  issuerName: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
};

type CachedReceiptEventLog = {
  fileHash: `0x${string}`;
  issuerName: string;
  txHash: `0x${string}`;
  blockNumber: string;
  logIndex: number;
};

type LogChunk = {
  args: {
    fileHash?: `0x${string}`;
    issuerName?: string;
  };
  transactionHash?: `0x${string}`;
  blockNumber?: bigint;
  logIndex?: number;
};

type IssuerReadClient = {
  getBlockNumber: () => Promise<bigint>;
  getCode: (args: {
    address: Address;
    blockNumber: bigint;
  }) => Promise<`0x${string}` | undefined>;
  getLogs: (args: {
    address: Address;
    event: typeof RECEIPT_REGISTERED_EVENT;
    args: {
      registeredBy: Address;
    };
    fromBlock: bigint;
    toBlock: bigint;
  }) => Promise<LogChunk[]>;
};

type LoadingProgress = {
  processedChunks: number;
  totalChunks: number;
  scanFrom: bigint;
  scanTo: bigint;
  usingCache: boolean;
};

type SortMode = "newest" | "oldest" | "issuer-a-z";

const RECEIPT_REGISTERED_EVENT = parseAbiItem(
  "event ReceiptRegistered(bytes32 indexed fileHash, string issuerName, address indexed registeredBy)",
);
const LOG_RANGE_CHUNK_SIZE = 9_500n;
const LOG_REQUEST_DELAY_MS = 140;
const LOG_RETRY_ATTEMPTS = 5;
const LOG_RETRY_BASE_DELAY_MS = 500;
const PAGE_SIZE = 6;
const RECEIPT_LOG_CACHE_VERSION = "v1";

function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsvFile(csv: string, filenamePrefix: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getReceiptLogCacheKey(
  chainId: number,
  contractAddress: Address,
  walletAddress: string,
): string {
  return [
    "receiptuary",
    "issuer-logs",
    RECEIPT_LOG_CACHE_VERSION,
    chainId,
    contractAddress.toLowerCase(),
    walletAddress.toLowerCase(),
  ].join(":");
}

function serializeLogsForCache(
  logs: ReceiptEventLog[],
): CachedReceiptEventLog[] {
  return logs.map((log) => ({
    fileHash: log.fileHash,
    issuerName: log.issuerName,
    txHash: log.txHash,
    blockNumber: log.blockNumber.toString(),
    logIndex: log.logIndex,
  }));
}

function deserializeLogsFromCache(
  logs: CachedReceiptEventLog[],
): ReceiptEventLog[] {
  return logs.map((log) => ({
    fileHash: log.fileHash,
    issuerName: log.issuerName,
    txHash: log.txHash,
    blockNumber: BigInt(log.blockNumber),
    logIndex: log.logIndex,
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error: unknown): boolean {
  const raw = getTechnicalErrorDetails(error)?.toLowerCase() ?? "";
  return raw.includes("over rate limit") || raw.includes("rate limit");
}

function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) {
    return "Unknown date";
  }

  return new Date(Number(timestamp) * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function LoadingReceiptsSkeleton({
  progress,
}: {
  progress: LoadingProgress | null;
}) {
  const percentage = progress
    ? Math.min(
        100,
        Math.round(
          (progress.processedChunks / Math.max(progress.totalChunks, 1)) * 100,
        ),
      )
    : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          </span>
          <span>Loading transaction history</span>
        </div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Fetching on-chain events and preparing your receipt list.
        </p>
        {progress ? (
          <>
            <p className="mt-2 text-xs text-stone-600 dark:text-stone-300">
              Scanning chunks {progress.processedChunks}/{progress.totalChunks}{" "}
              ({percentage}%)
              {progress.usingCache ? " - incremental update" : ""}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {["a", "b", "c"].map((key) => (
          <div
            key={key}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
            <div className="mt-3 h-7 w-14 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {["1", "2", "3"].map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
            <div className="mt-2 h-3 w-56 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
            <div className="mt-3 h-8 w-full animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function IssuerAdminPanel({ walletAddress, wrongChain }: Props) {
  const { runtimeConfig } = useRuntimeConfig();
  const {
    contractAddress,
    deployedNetworkName,
    deploymentBlock,
    fallbackRpcUrl,
    isContractConfigured,
    receiptuaryAbi,
  } = runtimeConfig;
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const deployedChainId = getChainIdFromNetworkName(deployedNetworkName);
  const fallbackChain = deployedChainId === baseSepolia.id ? baseSepolia : base;
  const fallbackPublicClient = useMemo(() => {
    if (!fallbackRpcUrl) {
      return null;
    }

    return createPublicClient({
      chain: fallbackChain,
      transport: http(fallbackRpcUrl),
    });
  }, [fallbackChain, fallbackRpcUrl]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<IssuerReceipt[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] =
    useState<LoadingProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const deploymentBlockRef = useRef<bigint | null>(deploymentBlock);
  const primaryReadClient = publicClient as IssuerReadClient | null;
  const secondaryReadClient = fallbackPublicClient as IssuerReadClient | null;

  const walletAddressLower = walletAddress.toLowerCase();
  const cacheKey = useMemo(
    () => getReceiptLogCacheKey(chainId, contractAddress, walletAddressLower),
    [chainId, contractAddress, walletAddressLower],
  );

  const getContractDeploymentBlock = useCallback(async () => {
    const activeClient = primaryReadClient ?? secondaryReadClient;
    if (!activeClient) {
      return 0n;
    }

    if (deploymentBlockRef.current !== null) {
      return deploymentBlockRef.current;
    }

    const latestBlock = await activeClient.getBlockNumber();
    const latestCode = await activeClient.getCode({
      address: contractAddress,
      blockNumber: latestBlock,
    });

    if (!latestCode || latestCode === "0x") {
      deploymentBlockRef.current = 0n;
      return 0n;
    }

    let low = 0n;
    let high = latestBlock;

    // Binary search for first block where contract bytecode exists.
    while (low < high) {
      const mid = (low + high) / 2n;
      const codeAtMid = await activeClient.getCode({
        address: contractAddress,
        blockNumber: mid,
      });

      if (!codeAtMid || codeAtMid === "0x") {
        low = mid + 1n;
      } else {
        high = mid;
      }
    }

    deploymentBlockRef.current = low;
    return low;
  }, [contractAddress, primaryReadClient, secondaryReadClient]);

  const getLogsWithRetry = useCallback(
    async (
      fromBlock: bigint,
      toBlock: bigint,
      activeClient: IssuerReadClient,
    ) => {
      if (!activeClient) {
        return [];
      }

      for (let attempt = 0; attempt <= LOG_RETRY_ATTEMPTS; attempt += 1) {
        try {
          return await activeClient.getLogs({
            address: contractAddress,
            event: RECEIPT_REGISTERED_EVENT,
            args: {
              registeredBy: walletAddress,
            },
            fromBlock,
            toBlock,
          });
        } catch (error) {
          const isLastAttempt = attempt === LOG_RETRY_ATTEMPTS;
          if (!isRateLimitError(error) || isLastAttempt) {
            throw error;
          }

          const backoff =
            LOG_RETRY_BASE_DELAY_MS * Math.pow(2, attempt) +
            Math.floor(Math.random() * 120);
          await delay(backoff);
        }
      }

      return [];
    },
    [contractAddress, walletAddress],
  );

  const fetchIssuerLogsWithClient = useCallback(
    async (activeClient: IssuerReadClient) => {
      const latestBlock = await activeClient.getBlockNumber();
      const deploymentBlock = await getContractDeploymentBlock();
      const startBlock =
        deploymentBlock > latestBlock ? latestBlock : deploymentBlock;
      let fromBlock = startBlock;
      const collectedLogs: ReceiptEventLog[] = [];

      if (typeof window !== "undefined") {
        try {
          const cached = window.localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as {
              lastScannedBlock?: string;
              logs?: CachedReceiptEventLog[];
            };
            if (parsed.logs?.length) {
              collectedLogs.push(...deserializeLogsFromCache(parsed.logs));
            }

            if (
              parsed.lastScannedBlock &&
              /^\d+$/.test(parsed.lastScannedBlock)
            ) {
              const cachedLastScannedBlock = BigInt(parsed.lastScannedBlock);
              if (
                cachedLastScannedBlock >= startBlock &&
                cachedLastScannedBlock < latestBlock
              ) {
                fromBlock = cachedLastScannedBlock + 1n;
              }

              if (cachedLastScannedBlock >= latestBlock) {
                return collectedLogs;
              }
            }
          }
        } catch {
          // Ignore cache parsing issues and continue with fresh scan.
        }
      }

      if (fromBlock > latestBlock) {
        return collectedLogs;
      }

      const totalChunks = Number(
        (latestBlock - fromBlock) / LOG_RANGE_CHUNK_SIZE + 1n,
      );
      let processedChunks = 0;
      const usingCache = fromBlock > startBlock;
      setLoadingProgress({
        processedChunks,
        totalChunks,
        scanFrom: fromBlock,
        scanTo: latestBlock,
        usingCache,
      });

      // Base public RPC limits eth_getLogs range to 10k blocks; scan in safe chunks.
      while (fromBlock <= latestBlock) {
        const toBlock =
          fromBlock + LOG_RANGE_CHUNK_SIZE - 1n > latestBlock
            ? latestBlock
            : fromBlock + LOG_RANGE_CHUNK_SIZE - 1n;

        const chunkLogs = await getLogsWithRetry(
          fromBlock,
          toBlock,
          activeClient,
        );

        for (const log of chunkLogs) {
          const fileHash = log.args.fileHash;
          const txHash = log.transactionHash;

          if (!fileHash || !txHash) {
            continue;
          }

          collectedLogs.push({
            fileHash,
            txHash,
            issuerName: log.args.issuerName ?? "",
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
          });
        }

        processedChunks += 1;
        setLoadingProgress({
          processedChunks,
          totalChunks,
          scanFrom: startBlock,
          scanTo: latestBlock,
          usingCache,
        });

        fromBlock = toBlock + 1n;
        await delay(LOG_REQUEST_DELAY_MS);
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            cacheKey,
            JSON.stringify({
              lastScannedBlock: latestBlock.toString(),
              logs: serializeLogsForCache(collectedLogs),
            }),
          );
        } catch {
          // Ignore storage quota and serialization issues.
        }
      }

      return collectedLogs;
    },
    [cacheKey, getContractDeploymentBlock, getLogsWithRetry],
  );

  const fetchIssuerLogs = useCallback(async () => {
    if (!primaryReadClient) {
      return [];
    }

    try {
      return await fetchIssuerLogsWithClient(primaryReadClient);
    } catch (primaryError) {
      if (!isRateLimitError(primaryError) || !secondaryReadClient) {
        throw primaryError;
      }

      return await fetchIssuerLogsWithClient(secondaryReadClient);
    }
  }, [fetchIssuerLogsWithClient, primaryReadClient, secondaryReadClient]);

  const loadReceipts = useCallback(async () => {
    if (!isContractConfigured || !publicClient || wrongChain) {
      setReceipts([]);
      setErrorMessage(null);
      setTechnicalError(null);
      return;
    }

    setErrorMessage(null);
    setTechnicalError(null);

    try {
      const logs = await fetchIssuerLogs();

      const sortedLogs = [...logs].sort((a, b) => {
        const aBlock = a.blockNumber;
        const bBlock = b.blockNumber;

        if (aBlock === bBlock) {
          const aIndex = a.logIndex;
          const bIndex = b.logIndex;
          return bIndex - aIndex;
        }

        return bBlock > aBlock ? 1 : -1;
      });

      const latestPerHash = new Map<
        `0x${string}`,
        { txHash: `0x${string}`; issuerNameFromEvent: string }
      >();

      for (const log of sortedLogs) {
        const fileHash = log.fileHash;
        const txHash = log.txHash;

        if (!fileHash || !txHash || latestPerHash.has(fileHash)) {
          continue;
        }

        latestPerHash.set(fileHash, {
          txHash,
          issuerNameFromEvent: log.issuerName,
        });
      }

      if (latestPerHash.size === 0) {
        setReceipts([]);
        setLastUpdatedAt(Date.now());
        return;
      }

      const fileHashes = [...latestPerHash.keys()];
      const result = await publicClient.multicall({
        contracts: fileHashes.map((fileHash) => ({
          address: contractAddress,
          abi: receiptuaryAbi,
          functionName: "getReceipt",
          args: [fileHash],
        })),
        allowFailure: true,
      });

      const nextReceipts: IssuerReceipt[] = [];
      result.forEach((call, index) => {
        if (call.status !== "success") {
          return;
        }

        const fileHash = fileHashes[index];
        const metadata = latestPerHash.get(fileHash);
        if (!metadata) {
          return;
        }

        const [issuerName, timestamp, registeredBy, isRegistered] =
          call.result as unknown as ReceiptTuple;

        if (
          !isRegistered ||
          registeredBy.toLowerCase() !== walletAddressLower
        ) {
          return;
        }

        nextReceipts.push({
          fileHash,
          issuerName: issuerName || metadata.issuerNameFromEvent,
          timestamp,
          registeredBy,
          txHash: metadata.txHash,
        });
      });

      nextReceipts.sort((a, b) => {
        if (a.timestamp === b.timestamp) {
          return a.fileHash.localeCompare(b.fileHash);
        }
        return b.timestamp > a.timestamp ? 1 : -1;
      });

      setReceipts(nextReceipts);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      setReceipts([]);
      setErrorMessage(toUserFriendlyError(error, "verify"));
      setTechnicalError(getTechnicalErrorDetails(error));
    } finally {
      setLoadingProgress(null);
    }
  }, [
    contractAddress,
    fetchIssuerLogs,
    isContractConfigured,
    publicClient,
    receiptuaryAbi,
    walletAddressLower,
    wrongChain,
  ]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      await loadReceipts();
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadReceipts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  }, [loadReceipts]);

  const stats = useMemo(() => {
    const total = receipts.length;
    const latestTimestamp = receipts[0]?.timestamp ?? 0n;

    return {
      total,
      latestTimestamp,
    };
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const next = receipts.filter((receipt) => {
      if (!search) {
        return true;
      }

      const haystack = [
        receipt.issuerName,
        receipt.fileHash,
        receipt.txHash,
        receipt.registeredBy,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

    next.sort((a, b) => {
      if (sortMode === "oldest") {
        if (a.timestamp === b.timestamp) {
          return a.fileHash.localeCompare(b.fileHash);
        }

        return a.timestamp > b.timestamp ? 1 : -1;
      }

      if (sortMode === "issuer-a-z") {
        const byIssuer = a.issuerName.localeCompare(b.issuerName, "en", {
          sensitivity: "base",
        });

        if (byIssuer !== 0) {
          return byIssuer;
        }

        if (a.timestamp === b.timestamp) {
          return a.fileHash.localeCompare(b.fileHash);
        }

        return b.timestamp > a.timestamp ? 1 : -1;
      }

      if (a.timestamp === b.timestamp) {
        return a.fileHash.localeCompare(b.fileHash);
      }

      return b.timestamp > a.timestamp ? 1 : -1;
    });

    return next;
  }, [receipts, searchTerm, sortMode]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReceipts.length / PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedReceipts = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredReceipts.slice(start, end);
  }, [filteredReceipts, safeCurrentPage]);

  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, totalPages];
    }

    if (safeCurrentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [
      1,
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      totalPages,
    ];
  }, [safeCurrentPage, totalPages]);

  const trustAddressList = useMemo(
    () =>
      Array.from(
        new Set(
          paginatedReceipts.map((receipt) =>
            receipt.registeredBy.toLowerCase(),
          ),
        ),
      ).map((address) => address as Address),
    [paginatedReceipts],
  );

  const { data: trustStatusResults } = useReadContracts({
    contracts: trustAddressList.map((address) => ({
      address: contractAddress,
      abi: receiptuaryAbi,
      functionName: "isIssuerApproved",
      args: [address],
    })),
    query: {
      enabled:
        isContractConfigured && !wrongChain && trustAddressList.length > 0,
    },
  });

  const trustStatusByAddress = useMemo(() => {
    const map = new Map<string, boolean>();

    trustAddressList.forEach((address, index) => {
      const result = trustStatusResults?.[index];
      if (result?.status === "success") {
        map.set(address.toLowerCase(), Boolean(result.result));
      }
    });

    return map;
  }, [trustAddressList, trustStatusResults]);

  const isFilterActive = searchTerm.trim().length > 0 || sortMode !== "newest";

  const handleExportCsv = useCallback(() => {
    if (receipts.length === 0) {
      return;
    }

    const headers = [
      "issuer_name",
      "registered_at_iso",
      "registered_at_unix",
      "registered_by",
      "file_hash",
      "tx_hash",
      "tx_url",
    ];

    const rows = receipts.map((receipt) => {
      const isoTimestamp =
        receipt.timestamp > 0n
          ? new Date(Number(receipt.timestamp) * 1000).toISOString()
          : "";
      const txUrl = getExplorerTxUrl(chainId, receipt.txHash) ?? "";

      return [
        receipt.issuerName,
        isoTimestamp,
        receipt.timestamp.toString(),
        receipt.registeredBy,
        receipt.fileHash,
        receipt.txHash,
        txUrl,
      ].map((cell) => escapeCsvCell(cell));
    });

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    downloadCsvFile(csv, "receiptuary-transactions");
  }, [chainId, receipts]);

  const handleExportFilteredCsv = useCallback(() => {
    if (filteredReceipts.length === 0) {
      return;
    }

    const headers = [
      "issuer_name",
      "registered_at_iso",
      "registered_at_unix",
      "registered_by",
      "file_hash",
      "tx_hash",
      "tx_url",
    ];

    const rows = filteredReceipts.map((receipt) => {
      const isoTimestamp =
        receipt.timestamp > 0n
          ? new Date(Number(receipt.timestamp) * 1000).toISOString()
          : "";
      const txUrl = getExplorerTxUrl(chainId, receipt.txHash) ?? "";

      return [
        receipt.issuerName,
        isoTimestamp,
        receipt.timestamp.toString(),
        receipt.registeredBy,
        receipt.fileHash,
        receipt.txHash,
        txUrl,
      ].map((cell) => escapeCsvCell(cell));
    });

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    downloadCsvFile(csv, "receiptuary-filtered-transactions");
  }, [chainId, filteredReceipts]);

  if (!isContractConfigured) {
    return (
      <section className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-5 text-sm text-amber-900 dark:text-amber-300">
        Add the contract address env value for this mode to view issuer data.
      </section>
    );
  }

  if (wrongChain) {
    return (
      <section className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 p-5 text-sm text-amber-900 dark:text-amber-300">
        Switch to the deployed network in your wallet to load your registered
        receipts.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--accent)]/20 via-white dark:via-[var(--card)] to-emerald-50 dark:to-emerald-950/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              My receipts
            </p>
            <h2 className="mt-1 font-[var(--font-display)] text-xl text-stone-900 dark:text-stone-100">
              Your registered receipts
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              Wallet:{" "}
              <span className="font-[var(--font-mono)]">
                {truncateHash(walletAddress, 7)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading || refreshing}
            className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--accent)] bg-white dark:bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-1.5 h-3.5 w-3.5 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            ) : null}
            {refreshing ? "Refreshing..." : "Refresh list"}
          </button>
        </div>

        {lastUpdatedAt ? (
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            Last updated: {new Date(lastUpdatedAt).toLocaleTimeString("en-US")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Total receipts
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
            {stats.total}
          </p>
        </article>
        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Search scope
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Issuer, file hash, tx hash, wallet
          </p>
        </article>
        <article className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
            Latest registration
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
            {stats.latestTimestamp > 0n
              ? formatTimestamp(stats.latestTimestamp)
              : "No receipts yet"}
          </p>
        </article>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">Could not load your receipts.</p>
          <p className="mt-1">{errorMessage}</p>
          {technicalError ? (
            <details className="mt-2 text-xs opacity-80">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-all">{technicalError}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingReceiptsSkeleton progress={loadingProgress} />
      ) : receipts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-sm text-stone-600 dark:text-stone-400">
          No registered receipts found for this wallet yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/80 p-4 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1.2fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
                  Search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Issuer, hash, tx or wallet"
                  className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400">
                  Sort
                </span>
                <select
                  value={sortMode}
                  onChange={(event) => {
                    setSortMode(event.target.value as SortMode);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] px-3 py-2 text-sm text-stone-800 dark:text-stone-100 outline-none ring-[var(--accent)] transition focus:ring-2"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="issuer-a-z">Issuer A-Z</option>
                </select>
              </label>
            </div>

            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
              Showing{" "}
              {filteredReceipts.length === 0
                ? 0
                : (safeCurrentPage - 1) * PAGE_SIZE + 1}
              -{Math.min(safeCurrentPage * PAGE_SIZE, filteredReceipts.length)}{" "}
              of {filteredReceipts.length} filtered receipts
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--card-border)] pt-3">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Export includes all {receipts.length} loaded transactions.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {isFilterActive ? (
                  <button
                    type="button"
                    onClick={handleExportFilteredCsv}
                    disabled={filteredReceipts.length === 0}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--accent)]/50 bg-white dark:bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    Export filtered CSV
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={receipts.length === 0}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--accent)] bg-white dark:bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Export all CSV
                </button>
              </div>
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-sm text-stone-600 dark:text-stone-400">
              No receipts match your current search and filters.
            </div>
          ) : null}

          {paginatedReceipts.map((receipt) => {
            const txUrl = getExplorerTxUrl(chainId, receipt.txHash);
            const isTrustedIssuer =
              trustStatusByAddress.get(receipt.registeredBy.toLowerCase()) ??
              null;

            return (
              <article
                key={receipt.fileHash}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {receipt.issuerName || "Unnamed issuer"}
                    </p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          isTrustedIssuer === true
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : isTrustedIssuer === false
                              ? "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                              : "border-stone-300 bg-stone-50 text-stone-700 dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-300"
                        }`}
                      >
                        {isTrustedIssuer === true
                          ? "Trusted issuer"
                          : isTrustedIssuer === false
                            ? "Open issuer"
                            : "Checking trust"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Registered: {formatTimestamp(receipt.timestamp)}
                    </p>
                  </div>

                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--accent)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/70"
                    >
                      View transaction
                    </a>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-1">
                  <div className="rounded-lg border border-[var(--card-border)] bg-white/80 dark:bg-[var(--card)]/80 p-2">
                    <p className="text-stone-500 dark:text-stone-400">
                      Registered by
                    </p>
                    <p className="mt-1 font-[var(--font-mono)] font-semibold text-stone-800 dark:text-stone-100">
                      {truncateHash(receipt.registeredBy, 7)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[var(--card-border)] bg-white/80 dark:bg-[var(--card)]/80 p-2">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    File hash
                  </p>
                  <p className="mt-1 break-all font-[var(--font-mono)] text-xs text-[var(--accent)]">
                    {receipt.fileHash}
                  </p>
                </div>
              </article>
            );
          })}

          {filteredReceipts.length > 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/85 p-3 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Page {safeCurrentPage} of {totalPages}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, Math.min(page, totalPages) - 1),
                      )
                    }
                    disabled={safeCurrentPage === 1}
                    className="cursor-pointer rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Prev
                  </button>

                  {paginationPages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 min-w-8 cursor-pointer rounded-lg px-2 text-xs font-semibold transition ${
                        safeCurrentPage === page
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--card-border)] text-stone-700 dark:text-stone-300 hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/40"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, Math.min(page, totalPages) + 1),
                      )
                    }
                    disabled={safeCurrentPage === totalPages}
                    className="cursor-pointer rounded-lg border border-[var(--card-border)] px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10 dark:hover:border-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
