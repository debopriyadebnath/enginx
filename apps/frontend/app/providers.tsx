"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { SessionProvider } from "@/lib/session";

export function ConvexClientProvider({
  children,
  convexUrl,
}: {
  children: ReactNode;
  convexUrl: string;
}) {
  const client = useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl]
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[Convex] client URL (from server):", convexUrl);
    }
  }, [convexUrl]);

  return (
    <ConvexProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </ConvexProvider>
  );
}
