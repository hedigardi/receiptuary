"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
    >
      {isDark ? (
        /* Sun icon indicates switching back to light theme. */
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon indicates switching to dark theme. */
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
