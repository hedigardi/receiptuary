"use client";

import { BaseError } from "viem";
import { useChainId, useReadContract } from "wagmi";
import { getExplorerAddressUrl, getExplorerSearchUrl } from "@/lib/explorer";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ADDRESS_SOURCE,
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
    const readErrorMessage =
      error instanceof BaseError ? error.shortMessage : error.message;
    // Only flag hardhat when there is no real env address at all
    const isNoContract = CONTRACT_ADDRESS_SOURCE === "none";
    const isHardhatOnly =
      CONTRACT_ADDRESS_SOURCE !== "env" && DEPLOYED_NETWORK_NAME === "hardhat";
    const isWrongNetwork =
      CONTRACT_ADDRESS_SOURCE === "env" && !isNoContract && !isHardhatOnly;

    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 space-y-2">
        <p className="font-semibold">Failed to read from the blockchain.</p>
        {isNoContract || isHardhatOnly ? (
          <p>
            Your app is currently pointing to a local Hardhat deploy. Set
            NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS to your deployed testnet
            contract and switch your wallet to the same network.
          </p>
        ) : isWrongNetwork ? (
          <p>
            The contract is deployed on <strong>Base Sepolia</strong>. Switch
            your wallet network to Base Sepolia and try again.
          </p>
        ) : (
          <p>
            This usually means the selected wallet network does not match the
            contract network, or there is no contract at this address.
          </p>
        )}
        {readErrorMessage ? (
          <p className="text-xs break-all opacity-80">
            Details: {readErrorMessage}
          </p>
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
  const eventSearchUrl = getExplorerSearchUrl(chainId, fileHash);
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
                Search events by hash
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
            Tip: Explorer links open public hash/address searches and show
            matching transactions, logs, and contract data.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="font-[var(--font-display)] text-lg font-semibold">
            Unverified
          </p>
          <p>
            The hash was not found on-chain. The receipt may be untouched but
            never registered, or it may have been tampered with.
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
