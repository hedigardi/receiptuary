import Link from "next/link";

export const metadata = {
  title: "Terms of Use",
};

export default function TermsPage() {
  return (
    <main className="grid-overlay flex min-h-[100svh] flex-1 items-start justify-center px-4 py-10 md:px-10">
      <article className="w-full max-w-3xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-6 shadow-[0_20px_65px_rgba(41,33,18,0.12)] backdrop-blur md:p-8">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
        >
          Back to site
        </Link>

        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Terms of Use
        </h1>

        <div className="mt-5 space-y-4 text-sm text-stone-700 dark:text-stone-300">
          <p>
            Receiptuary provides blockchain-based proof registration and
            verification tools. The service is provided on an &quot;as is&quot;
            basis without warranties of uninterrupted availability.
          </p>
          <p>
            You are solely responsible for the legality and accuracy of content
            you register, including issuer names and associated business use.
          </p>
          <p>
            You must not use the service to impersonate organizations, submit
            fraudulent records, or process data in violation of applicable law.
          </p>
          <p>
            You are responsible for wallet security, transaction approvals, and
            all network fees. Blockchain transactions are irreversible.
          </p>
        </div>
      </article>
    </main>
  );
}
