"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#010828] px-4 text-center">
        <h1
          style={{
            fontFamily: "monospace",
            fontSize: "1.5rem",
            color: "#f5f0e8",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Critical error
        </h1>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            color: "rgba(245,240,232,0.6)",
            maxWidth: "24rem",
          }}
        >
          {error.message || "The application encountered an unexpected error."}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#6fff00",
            color: "#010828",
            padding: "0.75rem 1.5rem",
            borderRadius: "12px",
            fontFamily: "monospace",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
