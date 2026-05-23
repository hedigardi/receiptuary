"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo, useState } from "react";
import { ReceiptDropzone } from "@/components/receipt-dropzone";
import { GaslessRegister } from "@/components/gasless-register";
import { RegisterReceipt } from "@/components/register-receipt";
import { VerifyReceipt } from "@/components/verify-receipt";
import { IS_AA_ENABLED } from "@/lib/aa";
import {
  getChainIdFromNetworkName,
  getChainLabel,
  getNetworkBadge,
} from "@/lib/explorer";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ADDRESS_SOURCE,
  DEPLOYED_NETWORK_NAME,
  IS_CONTRACT_CONFIGURED,
} from "@/lib/receiptuary";
import { truncateHash } from "@/lib/crypto";

type Mode = "issuer" | "verifier";

export function ReceiptuaryApp() {
  const [mode, setMode] = useState<Mode>("verifier");
  const [registrationMode, setRegistrationMode] = useState<
    "standard" | "gasless"
  >("standard");
  const [fileName, setFileName] = useState<string>("");
  const [fileHash, setFileHash] = useState<`0x${string}` | null>(null);
  const networkBadge = getNetworkBadge(DEPLOYED_NETWORK_NAME);
  const deployedChainId = getChainIdFromNetworkName(DEPLOYED_NETWORK_NAME);

  const modeDescription = useMemo(() => {
    if (mode === "issuer") {
      return "Register a receipt hash and create a permanent on-chain anchor.";
    }

    return "Verify whether a receipt still matches the original file.";
  }, [mode]);

  const handleHashed = useCallback((file: File, hash: `0x${string}`) => {
    setFileName(file.name);
    setFileHash(hash);
  }, []);

  return (
    <main className="grid-overlay flex min-h-full flex-1 items-center justify-center px-4 py-10 md:px-10">
      <div className="w-full max-w-4xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-6 shadow-[0_30px_120px_rgba(41,33,18,0.15)] backdrop-blur md:p-8">
        <header className="flex flex-col gap-4 border-b border-[var(--card-border)] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.22em] text-stone-500">
              Receiptuary
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-3xl font-bold leading-tight md:text-4xl">
              Is it real?
            </h1>
            <p className="mt-2 max-w-xl text-sm text-stone-600">
              {modeDescription}
            </p>
          </div>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </header>

        {!IS_CONTRACT_CONFIGURED ? (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Contract address is missing. Add
            NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS to your env file.
          </div>
        ) : null}

        {IS_CONTRACT_CONFIGURED ? (
          <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-white p-4 text-xs text-stone-700">
            <p className="font-semibold text-stone-800">Active chain profile</p>
            <div
              className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${networkBadge.badgeClass}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${networkBadge.dotClass}`}
              />
              <span>{networkBadge.label}</span>
            </div>
            <p className="mt-1">
              Active chain ID: {deployedChainId ?? "unknown"}
            </p>
            <p className="mt-1">
              Recommended verification: {getChainLabel(84532)} /{" "}
              {getChainLabel(80002)}
            </p>
            <p className="mt-1 break-all font-[var(--font-mono)]">
              Contract: {CONTRACT_ADDRESS}
            </p>
            <p className="mt-1">Address source: {CONTRACT_ADDRESS_SOURCE}</p>
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === "issuer"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-transparent text-stone-700"
                  }`}
                  onClick={() => setMode("issuer")}
                >
                  Issuer
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === "verifier"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-transparent text-stone-700"
                  }`}
                  onClick={() => setMode("verifier")}
                >
                  Verifier
                </button>
              </div>
            </div>

            {mode === "issuer" && IS_AA_ENABLED ? (
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      registrationMode === "standard"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-transparent text-stone-700"
                    }`}
                    onClick={() => setRegistrationMode("standard")}
                  >
                    Wallet
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      registrationMode === "gasless"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-transparent text-stone-700"
                    }`}
                    onClick={() => setRegistrationMode("gasless")}
                  >
                    Gasless (AA)
                  </button>
                </div>
              </div>
            ) : null}

            <ReceiptDropzone onHashed={handleHashed} />

            {fileHash ? (
              <div className="rounded-2xl border border-[var(--card-border)] bg-white p-4">
                <p className="text-sm font-semibold">File: {fileName}</p>
                <p className="mt-1 text-xs text-stone-600">SHA-256 (bytes32)</p>
                <p className="mt-2 break-all font-[var(--font-mono)] text-xs text-[var(--accent)]">
                  {fileHash}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  Short format: {truncateHash(fileHash)}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            {!fileHash ? (
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--accent-soft)] p-5 text-sm text-stone-700">
                Upload a receipt to continue.
              </div>
            ) : mode === "issuer" ? (
              registrationMode === "gasless" && IS_AA_ENABLED ? (
                <GaslessRegister fileHash={fileHash} />
              ) : (
                <RegisterReceipt fileHash={fileHash} />
              )
            ) : (
              <VerifyReceipt fileHash={fileHash} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
