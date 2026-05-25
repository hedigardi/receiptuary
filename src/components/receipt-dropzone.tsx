"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { calculateFileHash } from "@/lib/crypto";

type Props = {
  onHashed: (file: File, hash: `0x${string}`) => void;
};

export function ReceiptDropzone({ onHashed }: Props) {
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
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
        className="w-full rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-left transition hover:border-[var(--accent)]"
      >
        <input {...getInputProps()} />
        <p className="font-[var(--font-display)] text-xl font-semibold">
          Receipt file (PDF)
        </p>
        <p className="mt-2 text-sm text-stone-600">{hint}</p>
      </button>
      <p className="text-xs text-stone-500">
        Use the original file exactly as downloaded. Re-saving or modifying the
        file — even without visible changes — will produce a different
        fingerprint and cause verification to fail.
      </p>
      {localError ? (
        <p className="text-sm text-[var(--warn)]">{localError}</p>
      ) : null}
    </div>
  );
}
