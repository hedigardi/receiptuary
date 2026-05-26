"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { IssuerAdminPanel } from "@/components/issuer-admin-panel";
import { ReceiptDropzone } from "@/components/receipt-dropzone";
import { RegisterReceipt } from "@/components/register-receipt";
import { VerifyReceipt } from "@/components/verify-receipt";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getChainIdFromNetworkName,
  getChainLabel,
  getNetworkBadge,
} from "@/lib/explorer";
import {
  CONTRACT_ADDRESS,
  DEPLOYED_NETWORK_NAME,
  IS_CONTRACT_CONFIGURED,
} from "@/lib/receiptuary";
import {
  IS_PAID_REGISTRATION_ENABLED,
  PAYMENT_FEE_DISPLAY,
  PAYMENT_TOKEN_SYMBOL_FALLBACK,
} from "@/lib/payment";
import { truncateHash } from "@/lib/crypto";

type Mode = "issuer" | "verifier";
const LOGO_SRC = "/logo.png?v=20260524-2";

type ReceiptuaryAppProps = {
  adminRoute?: boolean;
};

export function ReceiptuaryApp({ adminRoute = false }: ReceiptuaryAppProps) {
  // `mode` switches both explanatory copy and the right-side action panel.
  const [mode, setMode] = useState<Mode>("verifier");
  const [showChainDetails, setShowChainDetails] = useState(false);
  const [pricingReady, setPricingReady] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileHash, setFileHash] = useState<`0x${string}` | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { address: walletAddress, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const networkBadge = getNetworkBadge(DEPLOYED_NETWORK_NAME);
  const deployedChainId = getChainIdFromNetworkName(DEPLOYED_NETWORK_NAME);
  const deployedChainLabel = deployedChainId
    ? getChainLabel(deployedChainId)
    : "the required network";
  const isWalletOnWrongChain =
    isConnected && !!deployedChainId && connectedChainId !== deployedChainId;
  const isAdminView = adminRoute;
  const mainClassName = isAdminView
    ? "grid-overlay flex flex-1 items-start justify-center px-4 py-10 md:px-10"
    : "grid-overlay flex min-h-[100svh] flex-1 items-center justify-center px-4 py-10 md:px-10";

  // Step cards are mode-specific so issuer/verifier users get task-relevant guidance.
  const flowSteps =
    mode === "issuer"
      ? [
          {
            title: "Upload receipt",
            description:
              "Drop your PDF and Receiptuary creates a SHA-256 fingerprint.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 17V9" />
                <path d="M9 12l3-3 3 3" />
              </svg>
            ),
          },
          {
            title: "Connect and sign",
            description:
              "Enter issuer details, approve token spending, then confirm registration in your wallet.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="3" />
                <path d="M16 13h2" />
                <path d="M6 7V5a2 2 0 0 1 2-2h8" />
              </svg>
            ),
          },
          {
            title: "Proof on-chain",
            description:
              "Your receipt hash is anchored on-chain after payment and can be verified later by anyone.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="6" height="6" rx="1" />
                <rect x="15" y="5" width="6" height="6" rx="1" />
                <rect x="9" y="13" width="6" height="6" rx="1" />
                <path d="M9 8h6" />
                <path d="M18 11v2" />
                <path d="M6 11v2" />
                <path d="M12 13v-2" />
              </svg>
            ),
          },
        ]
      : [
          {
            title: "Upload receipt",
            description:
              "Select a PDF and generate the same SHA-256 fingerprint locally.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 17V9" />
                <path d="M9 12l3-3 3 3" />
              </svg>
            ),
          },
          {
            title: "Run verification",
            description:
              "Receiptuary checks the hash against the on-chain contract record.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            ),
          },
          {
            title: "See clear result",
            description:
              "Get a Verified/Unverified status plus explorer links for transparency.",
            icon: (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ),
          },
        ];

  const handleHashed = useCallback((file: File, hash: `0x${string}`) => {
    setFileName(file.name);
    setFileHash(hash);
  }, []);

  const handleClearUploadedFile = useCallback(() => {
    setFileName("");
    setFileHash(null);
  }, []);

  useEffect(() => {
    // Delay card reveal to the next paint for a smooth initial animation.
    const frame = window.requestAnimationFrame(() => {
      setPricingReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    // Show floating "back to top" only after meaningful scroll depth.
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogoRefresh = useCallback(() => {
    // Reset local UI state before a hard reload so stale mode/hash does not linger.
    setMode("verifier");
    setShowChainDetails(false);
    setFileName("");
    setFileHash(null);

    requestAnimationFrame(() => {
      window.location.reload();
    });
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <>
      <main className={mainClassName}>
        <div className="w-full max-w-4xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-6 shadow-[0_30px_120px_rgba(41,33,18,0.15)] backdrop-blur md:p-8">
          <header className="flex flex-col gap-4 border-b border-[var(--card-border)] pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleLogoRefresh}
                  aria-label="Refresh page"
                  className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                >
                  <Image
                    src={LOGO_SRC}
                    alt="Receiptuary logo"
                    width={860}
                    height={286}
                    sizes="(max-width: 640px) 185px, (max-width: 768px) 225px, 260px"
                    className="h-auto w-[185px] transition-[filter] duration-300 sm:w-[225px] md:w-[260px] [filter:drop-shadow(0_4px_14px_rgba(3,98,76,0.18))_drop-shadow(0_1px_3px_rgba(41,33,18,0.10))] dark:[filter:drop-shadow(0_0_18px_rgba(52,211,153,0.3))_brightness(1.18)]"
                    unoptimized
                    priority
                  />
                </button>
              </div>
              <h1 className="sr-only">Receiptuary - Is it real?</h1>
            </div>

            <div className="relative flex w-full flex-nowrap items-center justify-end gap-2 self-start md:w-auto md:self-auto">
              {isConnected || isAdminView ? (
                <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1">
                  <Link
                    href="/"
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      !isAdminView
                        ? "bg-[var(--accent)] text-white"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/admin"
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      isAdminView
                        ? "bg-[var(--accent)] text-white"
                        : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    Admin
                  </Link>
                </div>
              ) : null}

              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  mounted,
                  authenticationStatus,
                  openAccountModal,
                  openConnectModal,
                }) => {
                  const ready = mounted && authenticationStatus !== "loading";
                  const connected =
                    ready &&
                    !!account &&
                    !!chain &&
                    (!authenticationStatus ||
                      authenticationStatus === "authenticated");
                  const isWalletOnWrongChain =
                    !!chain &&
                    !!deployedChainId &&
                    chain.id !== deployedChainId;

                  if (!connected) {
                    return (
                      <div className="flex w-auto shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={openConnectModal}
                          className="inline-flex w-auto items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-95 cursor-pointer"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="7" width="20" height="14" rx="3" />
                            <path d="M16 13h2" />
                            <path d="M6 7V5a2 2 0 0 1 2-2h8" />
                          </svg>
                          <span>Connect Wallet</span>
                        </button>
                      </div>
                    );
                  }

                  if (isWalletOnWrongChain) {
                    return (
                      <div className="relative flex w-auto shrink-0 items-center justify-end">
                        <button
                          type="button"
                          onClick={openAccountModal}
                          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 cursor-pointer"
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
                            <rect x="2" y="7" width="20" height="14" rx="3" />
                            <path d="M16 13h2" />
                            <path d="M6 7V5a2 2 0 0 1 2-2h8" />
                          </svg>
                          <span className="max-w-[110px] truncate sm:max-w-[140px]">
                            {account.displayName}
                          </span>
                        </button>
                        <span className="absolute right-0 top-full mt-1 inline-flex w-max max-w-[min(85vw,22rem)] items-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-right text-xs font-semibold text-amber-900 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                          Switch to {deployedChainLabel} in your wallet
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex w-auto flex-nowrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={openAccountModal}
                        className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 cursor-pointer"
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
                          <rect x="2" y="7" width="20" height="14" rx="3" />
                          <path d="M16 13h2" />
                          <path d="M6 7V5a2 2 0 0 1 2-2h8" />
                        </svg>
                        <span className="max-w-[110px] truncate sm:max-w-[140px]">
                          {account.displayName}
                        </span>
                      </button>
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </header>

          {!IS_CONTRACT_CONFIGURED ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Contract address is missing. Add
              NEXT_PUBLIC_RECEIPTUARY_CONTRACT_ADDRESS to your env file.
            </div>
          ) : null}

          {IS_CONTRACT_CONFIGURED ? (
            <section className="mt-4 rounded-2xl border border-[var(--card-border)] bg-white/80 dark:bg-[var(--card)]/80 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-[0.98] ${networkBadge.badgeClass}`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${networkBadge.dotClass}`}
                  />
                  <span className="max-w-[140px] truncate sm:max-w-none">
                    {networkBadge.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowChainDetails((current) => !current)}
                  aria-expanded={showChainDetails}
                  aria-controls="network-details-panel"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 transition hover:bg-[var(--accent-soft)] dark:hover:bg-white/10"
                >
                  <span>
                    {showChainDetails
                      ? "Hide network details"
                      : "Show network details"}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`text-[10px] leading-none transition-transform duration-200 ${
                      showChainDetails ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    v
                  </span>
                </button>
              </div>

              {showChainDetails ? (
                <div
                  id="network-details-panel"
                  className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-stone-700 dark:text-stone-300"
                >
                  <p className="font-semibold text-stone-800 dark:text-stone-200">
                    Active chain profile
                  </p>
                  <p className="mt-2">
                    Active chain ID: {deployedChainId ?? "unknown"}
                  </p>
                  <p className="mt-1">
                    Recommended verification: {deployedChainLabel}
                  </p>
                  <p className="mt-1 break-all font-[var(--font-mono)]">
                    Contract: {CONTRACT_ADDRESS}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {isAdminView ? (
            <section className="mt-6">
              {walletAddress ? (
                <IssuerAdminPanel
                  walletAddress={walletAddress}
                  wrongChain={isWalletOnWrongChain}
                />
              ) : (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--accent-soft)] p-5 text-sm text-stone-700 dark:text-stone-300">
                  Connect your wallet to open Issuer Admin.
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-white dark:from-[var(--card)] via-[var(--accent-soft)]/70 to-emerald-50/70 dark:to-emerald-950/30 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                      Pricing model
                    </p>
                    <h2 className="mt-1 font-[var(--font-display)] text-xl text-stone-900 dark:text-stone-100">
                      Clear and predictable from first click
                    </h2>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      You only pay when creating a new on-chain receipt proof.
                      Verification is read-only and free.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-stone-200 dark:border-stone-700 bg-white/90 dark:bg-[var(--card)]/90 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-stone-300">
                    No subscriptions
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <article
                    className={`rounded-2xl border p-4 shadow-[0_12px_28px_rgba(16,185,129,0.12)] transition-all duration-500 ${
                      pricingReady
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0"
                    } ${
                      mode === "issuer"
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/50"
                        : "border-emerald-200 dark:border-emerald-800 bg-white/90 dark:bg-[var(--card)]/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M9.5 9.5h4a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4" />
                            <path d="M12 7.5v1.5" />
                            <path d="M12 15v1.5" />
                          </svg>
                        </span>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          Issuer: Register receipt
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 sm:px-2 sm:text-[11px]">
                        {IS_PAID_REGISTRATION_ENABLED
                          ? "Paid action"
                          : "Currently free"}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-emerald-900 dark:text-emerald-300">
                      {IS_PAID_REGISTRATION_ENABLED
                        ? `${PAYMENT_FEE_DISPLAY} ${PAYMENT_TOKEN_SYMBOL_FALLBACK}`
                        : "0"}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-300/90">
                      {IS_PAID_REGISTRATION_ENABLED
                        ? "Charged once per new registration."
                        : "No token payment configured in this environment."}
                    </p>
                  </article>

                  <article
                    className={`rounded-2xl border p-4 shadow-[0_12px_28px_rgba(14,165,233,0.12)] transition-all delay-100 duration-500 ${
                      pricingReady
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0"
                    } ${
                      mode === "verifier"
                        ? "border-sky-300 dark:border-sky-700 bg-sky-50/90 dark:bg-sky-950/50"
                        : "border-sky-200 dark:border-sky-800 bg-white/90 dark:bg-[var(--card)]/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 dark:border-sky-700 bg-white dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          Verifier: Check receipt
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-sky-300 dark:border-sky-700 bg-white dark:bg-sky-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:text-sky-300 sm:px-2 sm:text-[11px]">
                        Always free
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-sky-900 dark:text-sky-300">
                      0
                    </p>
                    <p className="mt-1 text-xs text-sky-900/90 dark:text-sky-300/90">
                      No fee for verification lookups.
                    </p>
                  </article>
                </div>

                <div
                  className={`mt-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/85 dark:bg-[var(--card)]/85 px-3 py-2 text-xs text-stone-700 dark:text-stone-300 transition-all delay-150 duration-500 ${
                    pricingReady
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  Predictable pricing: pay only when you create proof. Verifying
                  existing proof is free.
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--accent-soft)] via-white dark:via-[var(--card)] to-emerald-50 dark:to-emerald-950/20 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                      How it works
                    </p>
                    <h2 className="mt-1 font-[var(--font-display)] text-xl text-stone-900 dark:text-stone-100">
                      A simple 3-step flow for everyone
                    </h2>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      {mode === "issuer"
                        ? "You are in Issuer mode: create tamper-proof receipt records (1 USDC per registration)."
                        : "You are in Verifier mode: check if a receipt has a valid on-chain proof (free)."}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 dark:border-emerald-700 bg-white/90 dark:bg-[var(--card)]/90 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {mode === "issuer" ? "Issuer journey" : "Verifier journey"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {flowSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className={`relative rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-[var(--card)]/80 p-4 shadow-[0_10px_25px_rgba(3,98,76,0.08)] backdrop-blur transition-all duration-500 ${
                        pricingReady
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      }`}
                      style={{ transitionDelay: `${index * 90}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                          {step.icon}
                        </span>
                        <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 sm:px-2 sm:text-[11px]">
                          Step {index + 1}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-6 grid gap-5 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${
                          mode === "issuer"
                            ? "bg-[var(--accent)] text-white dark:text-[#0f1613]"
                            : "bg-transparent text-stone-700 dark:text-stone-300"
                        }`}
                        onClick={() => setMode("issuer")}
                      >
                        Issuer
                      </button>
                      <button
                        type="button"
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${
                          mode === "verifier"
                            ? "bg-[var(--accent)] text-white dark:text-[#0f1613]"
                            : "bg-transparent text-stone-700 dark:text-stone-300"
                        }`}
                        onClick={() => setMode("verifier")}
                      >
                        Verifier
                      </button>
                    </div>
                  </div>

                  {mode === "issuer" && IS_PAID_REGISTRATION_ENABLED ? (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-900 dark:text-emerald-300">
                      Issuer registration is paid. Approve payment, then
                      register. Verification is free.
                    </div>
                  ) : null}

                  {mode === "verifier" && IS_PAID_REGISTRATION_ENABLED ? (
                    <div className="rounded-2xl border border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50 p-3 text-xs text-sky-900 dark:text-sky-300">
                      Verifier is free. {PAYMENT_FEE_DISPLAY}{" "}
                      {PAYMENT_TOKEN_SYMBOL_FALLBACK} applies only to issuer
                      registrations.
                    </div>
                  ) : null}

                  <ReceiptDropzone onHashed={handleHashed} />

                  {fileHash ? (
                    <div className="rounded-2xl border border-[var(--card-border)] bg-white dark:bg-[var(--card)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          File: {fileName}
                        </p>
                        <button
                          type="button"
                          onClick={handleClearUploadedFile}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
                          aria-label="Clear selected file locally"
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
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                          <span>Choose another file</span>
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                        SHA-256 (bytes32)
                      </p>
                      <p className="mt-2 break-all font-[var(--font-mono)] text-xs text-[var(--accent)]">
                        {fileHash}
                      </p>
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        Short format: {truncateHash(fileHash)}
                      </p>
                      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                        Local action only: this clears the selected file in this
                        app. No on-chain records are deleted.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  {!fileHash ? (
                    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--accent-soft)] p-5 text-sm text-stone-700 dark:text-stone-300">
                      Upload a receipt to continue.
                    </div>
                  ) : mode === "issuer" ? (
                    <RegisterReceipt fileHash={fileHash} />
                  ) : (
                    <VerifyReceipt fileHash={fileHash} />
                  )}
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-white/80 dark:bg-[var(--card)]/80 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                  FAQ
                </p>
                <h2 className="mt-1 font-[var(--font-display)] text-xl text-stone-900 dark:text-stone-100">
                  Common questions
                </h2>

                <div className="mt-4 space-y-3">
                  {[
                    {
                      q: "Do you store my receipts or files?",
                      a: "No. Your file never leaves your device. The fingerprint (SHA-256 hash) is computed locally in your browser. Only the hash — never the file itself — is sent to the blockchain.",
                    },
                    {
                      q: "Why Base network?",
                      a: "Base is a fast, low-cost Ethereum Layer 2 network backed by Coinbase. It provides the security of Ethereum at a fraction of the cost, making per-receipt on-chain proofs practical.",
                    },
                    {
                      q: "Do I need ETH to verify a receipt?",
                      a: "No. Verification is a read-only lookup — it is completely free and requires no wallet or gas.",
                    },
                    {
                      q: "Why does re-saving a PDF break verification?",
                      a: "SHA-256 hashing is exact — even a single invisible bit change produces a completely different fingerprint. Always upload the original file exactly as it was downloaded, without opening, resaving, or renaming it.",
                    },
                    {
                      q: "What does the 1 USDC fee cover?",
                      a: "The fee is charged to the issuer wallet at the time of registration to prevent spam and sustainably fund the service. Verification is always free.",
                    },
                    {
                      q: "Is this GDPR compliant?",
                      a: "Yes. Because files never leave your device and only a non-reversible hash is stored on-chain, no personal data or file content is shared with any server or third party.",
                    },
                  ].map(({ q, a }) => (
                    <details
                      key={q}
                      className="group rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold text-stone-800 dark:text-stone-200 marker:hidden">
                        <span className="flex items-center justify-between gap-2">
                          <span>{q}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500 transition-transform duration-200 group-open:rotate-180"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                        {a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="grid-overlay px-4 pb-8 md:px-10 md:pb-10">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-4 shadow-[0_20px_65px_rgba(41,33,18,0.12)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium tracking-[0.08em] text-stone-600 dark:text-stone-400">
              Copyright {currentYear} Receiptuary. All rights reserved.
            </p>
            <p className="text-xs text-stone-700 dark:text-stone-300">
              A product from{" "}
              <a
                href="https://hedigardi.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[var(--accent)] transition-colors hover:text-emerald-700"
              >
                hedigardi.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating theme toggle – top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Back to top – bottom-right */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-4 z-50 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)]/90 text-[var(--foreground)] shadow-md backdrop-blur transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
    </>
  );
}
