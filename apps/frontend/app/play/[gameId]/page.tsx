"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old URLs used Convex `gameId`; solo play now uses `/play/run?category=…`. */
export default function LegacyPlayRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/play");
  }, [router]);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
      <p className="font-mono text-cream/60 text-sm">Redirecting…</p>
    </div>
  );
}
