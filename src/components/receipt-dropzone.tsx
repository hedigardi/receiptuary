"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { calculateFileHash } from "@/lib/crypto";

type Props = {
  onHashed: (file: File, hash: `0x${string}`) => void;
  mode: "issuer" | "verifier";
};

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_SIZE_LABEL = "10 MB";

export function ReceiptDropzone({ onHashed, mode }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const selected = acceptedFiles[0];
      if (!selected) {
        return;
      }

      setIsProcessing(true);
      setLocalError(null);

      try {
        // Hashing is performed locally in-browser; the file contents are never uploaded.
        const hash = await calculateFileHash(selected);
        onHashed(selected, hash);
      } catch {
        setLocalError("Could not read the file. Please try another PDF.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onHashed],
  );

  const onDropRejected = useCallback(() => {
    setLocalError(
      `File rejected. Please upload a PDF up to ${MAX_PDF_SIZE_LABEL}.`,
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    // Only accept receipt PDFs to keep hashing/verifier UX predictable.
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_PDF_SIZE_BYTES,
    multiple: false,
  });

  const hint = useMemo(() => {
    if (isDragActive) {
      return "Drop the receipt here";
    }

    if (isProcessing) {
      return "Hashing locally in your browser";
    }

    return "Drag in a PDF or click to select a file";
  }, [isDragActive, isProcessing]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        {...getRootProps()}
        className="w-full rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-left transition hover:border-[var(--accent)] cursor-pointer"
      >
        <input {...getInputProps()} />
        <p className="font-[var(--font-display)] text-xl font-semibold">
          Receipt file (PDF)
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {hint}
        </p>
      </button>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {mode === "issuer"
          ? "Use the original file exactly as downloaded. Re-saving or modifying the file can change the fingerprint and break later verification."
          : "Upload the exact receipt file you want to verify."}
      </p>
      {mode === "issuer" ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Max file size: {MAX_PDF_SIZE_LABEL}.
        </p>
      ) : null}
      {localError ? (
        <p className="text-sm text-[var(--warn)]">{localError}</p>
      ) : null}
    </div>
  );
}
