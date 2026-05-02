"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#010828] px-4 text-center">
      <h1 className="font-anton text-3xl uppercase tracking-wide text-cream">
        Something went wrong
      </h1>
      <p className="max-w-sm font-mono text-sm text-cream/60">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[12px] bg-[#6fff00] px-6 py-3 font-anton uppercase tracking-wide text-[#010828] shadow-[0_0_24px_rgba(111,255,0,0.2)] transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
