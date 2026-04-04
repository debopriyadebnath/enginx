"use client";

import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "@/lib/convex";
import { SessionProvider } from "@/lib/session";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>{children}</SessionProvider>
    </ConvexProvider>
  );
}
