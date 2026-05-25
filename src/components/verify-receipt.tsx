"use client";

import { useChainId, useReadContract } from "wagmi";
import {
  getChainIdFromNetworkName,
  getChainLabel,
  getExplorerAddressUrl,
  getExplorerReceiptEventLogsUrl,
  getExplorerSearchUrl,
} from "@/lib/explorer";
import {
  getTechnicalErrorDetails,
  toUserFriendlyError,
} from "@/lib/user-friendly-errors";
import {
  CONTRACT_ADDRESS,
  DEPLOYED_NETWORK_NAME,
  IS_CONTRACT_CONFIGURED,
  RECEIPTUARY_ABI,
} from "@/lib/receiptuary";

type Props = {
  fileHash: `0x${string}`;
};

type ReceiptTuple = readonly [string, string, bigint, `0x${string}`, boolean];

export function VerifyReceipt({ fileHash }: Props) {
  const chainId = useChainId();
  const deployedChainId = getChainIdFromNetworkName(DEPLOYED_NETWORK_NAME);
  const deployedChainLabel = deployedChainId
    ? getChainLabel(deployedChainId)
    : "the required network";
  const { data, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RECEIPTUARY_ABI,
    functionName: "getReceipt",
    args: [fileHash],
    query: {
      enabled: IS_CONTRACT_CONFIGURED && !!fileHash,
    },
  });

  if (!IS_CONTRACT_CONFIGURED) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
        Add NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS to env to verify against
        the blockchain.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-sm text-stone-600">
        Fetching receipt anchor from the blockchain.
      </div>
    );
  }

  if (error) {
    const readErrorMessage = getTechnicalErrorDetails(error);
    const friendlyReadError = toUserFriendlyError(error, "verify");
    const isWalletOnWrongChain =
      !!deployedChainId && chainId !== deployedChainId;
    const isContractReadMismatch = !isWalletOnWrongChain;

    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 space-y-2">
        <p className="font-semibold">Failed to read from the blockchain.</p>
        {isWalletOnWrongChain ? (
          <p>
            The contract is deployed on <strong>{deployedChainLabel}</strong>.
            Switch your wallet network to {deployedChainLabel} and try again.
          </p>
        ) : isContractReadMismatch ? (
          <p>
            Your wallet is already on <strong>{deployedChainLabel}</strong>, but
            the contract at this address did not return data.
            <br />
            This usually means the contract address is wrong, the deployment is
            not live yet, or the generated frontend config is out of sync.
          </p>
        ) : (
          <p>{friendlyReadError}</p>
        )}
        {readErrorMessage ? (
          <details className="text-xs opacity-80">
            <summary className="cursor-pointer">Technical details</summary>
            <p className="mt-1 break-all">{readErrorMessage}</p>
          </details>
        ) : null}
      </div>
    );
  }

  const [issuerName, referenceId, timestamp, registeredBy, isRegistered] =
    (data as ReceiptTuple | undefined) ?? [
      "",
      "",
      BigInt(0),
      "0x0000000000000000000000000000000000000000",
      false,
    ];

  const contractExplorerUrl = getExplorerAddressUrl(chainId, CONTRACT_ADDRESS);
  const eventSearchUrl = getExplorerReceiptEventLogsUrl(
    chainId,
    CONTRACT_ADDRESS,
  );
  const issuerSearchUrl = getExplorerSearchUrl(chainId, registeredBy);

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isRegistered
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      {isRegistered ? (
        <div className="space-y-2 text-sm">
          <p className="font-[var(--font-display)] text-lg font-semibold">
            Verified authentic
          </p>
          <p>The document hash matches a registered on-chain record.</p>
          <p>
            Issuer: <span className="font-semibold">{issuerName}</span>
          </p>
          {referenceId ? (
            <p>
              Reference ID: <span className="font-semibold">{referenceId}</span>
            </p>
          ) : null}
          <p>
            Registered:{" "}
            {new Date(Number(timestamp) * 1000).toLocaleString("en-US")}
          </p>
          <p className="break-all">Registered by: {registeredBy}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {contractExplorerUrl ? (
              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-900"
              >
                Contract in explorer
              </a>
            ) : null}
            {eventSearchUrl ? (
              <a
                href={eventSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-900"
              >
                Open contract events
              </a>
            ) : null}
            {issuerSearchUrl ? (
              <a
                href={issuerSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-900"
              >
                Search registrant
              </a>
            ) : null}
          </div>
          <p className="text-xs text-emerald-800/80">
            Tip: Open Contract events, then use BaseScan's event filter/search
            to find this hash in topics.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="font-[var(--font-display)] text-lg font-semibold">
            Not verified
          </p>
          <p>
            This file&rsquo;s fingerprint was not found in the on-chain
            registry.
          </p>
          <p className="text-xs text-red-900/80">Common reasons:</p>
          <ul className="list-disc pl-4 text-xs text-red-900/80 space-y-1">
            <li>The receipt has not been registered yet.</li>
            <li>
              The file was modified, re-saved, or renamed after registration —
              even invisible changes (e.g. opened in Adobe Reader and saved)
              will produce a different fingerprint.
            </li>
            <li>The file is a copy and not the original download.</li>
          </ul>
          <p className="text-xs text-red-900/80">
            Try uploading the original, unmodified file exactly as it was
            downloaded.
          </p>
          {contractExplorerUrl ? (
            <>
              <a
                href={contractExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-900"
              >
                Open contract in explorer
              </a>
              <p className="text-xs text-red-900/80">
                Tip: This link opens the contract page where you can review
                history, logs, and related transactions.
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
