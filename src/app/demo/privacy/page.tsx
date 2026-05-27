import Link from "next/link";

export const metadata = {
  title: "Privacy Policy (Demo)",
};

export default function DemoPrivacyPage() {
  return (
    <main className="grid-overlay flex min-h-[100svh] flex-1 items-start justify-center px-4 py-10 md:px-10">
      <article className="w-full max-w-3xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-6 shadow-[0_20px_65px_rgba(41,33,18,0.12)] backdrop-blur md:p-8">
        <Link
          href="/demo"
          className="inline-flex items-center rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
        >
          Back to demo
        </Link>

        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Privacy Policy
        </h1>

        <div className="mt-5 space-y-4 text-sm text-stone-700 dark:text-stone-300">
          <p>
            Receiptuary is designed to minimize data handling. Uploaded files
            are processed in your browser to compute a SHA-256 hash and are not
            sent to a Receiptuary backend.
          </p>
          <p>
            Blockchain transactions are public and permanent. Wallet addresses,
            transaction metadata, and registered proof records may be visible to
            anyone through blockchain explorers.
          </p>
          <p>
            Do not include personal data or sensitive information in issuer
            names or any user-entered fields that may become publicly visible.
          </p>
          <p>
            You are responsible for determining whether your use of Receiptuary
            complies with applicable law, including data protection obligations
            in your jurisdiction.
          </p>
        </div>
      </article>
    </main>
  );
}
