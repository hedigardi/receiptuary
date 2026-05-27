"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getModeSwitchTarget,
  getNetworkModeFromPathname,
} from "@/lib/network-mode";

export function NetworkModeToggle() {
  const pathname = usePathname() ?? "/";
  const mode = getNetworkModeFromPathname(pathname);
  const nextHref = getModeSwitchTarget(pathname);

  const isDemoMode = mode === "demo";
  const activeChainLabel = isDemoMode ? "Base Sepolia" : "Base Mainnet";
  const mainnetHref = isDemoMode ? nextHref : pathname;
  const testnetHref = isDemoMode ? pathname : nextHref;

  return (
    <section className="grid-overlay w-full px-4 pt-4 md:px-10 md:pt-6">
      <div className="mx-auto flex w-full max-w-4xl justify-center">
        <div className="flex flex-col gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)]/95 p-1 shadow-[0_10px_40px_rgba(41,33,18,0.14)] backdrop-blur">
          <p className="px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600 dark:text-stone-300">
            Active: {activeChainLabel}
          </p>
          <div className="inline-flex items-center">
            <Link
              href={mainnetHref}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                !isDemoMode
                  ? "bg-[var(--accent)] text-white"
                  : "text-stone-700 dark:text-stone-300 hover:bg-[var(--accent-soft)] dark:hover:bg-white/10"
              }`}
            >
              Mainnet
            </Link>
            <Link
              href={testnetHref}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                isDemoMode
                  ? "bg-[var(--accent)] text-white"
                  : "text-stone-700 dark:text-stone-300 hover:bg-[var(--accent-soft)] dark:hover:bg-white/10"
              }`}
              aria-label={
                isDemoMode
                  ? "Switch to Mainnet view"
                  : "Switch to Demo testnet view"
              }
            >
              Testnet
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
