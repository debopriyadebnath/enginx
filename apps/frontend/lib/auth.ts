"use client";

import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useSession } from "@/lib/session";

/**
 * Session token in localStorage + Convex profile for the current session.
 */
export function useAuthState(): {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Doc<"users"> | null | undefined;
} {
  const { token, setToken } = useSession();

  const user = useQuery(
    api.users.getCurrentUser,
    token ? { sessionToken: token } : "skip"
  );

  useEffect(() => {
    if (token && user === null) {
      setToken(null);
    }
  }, [token, user, setToken]);

  const isLoading =
    token === undefined || (Boolean(token) && user === undefined);

  const isAuthenticated =
    Boolean(token) && user !== undefined && user !== null;

  return {
    isLoading,
    isAuthenticated,
    user: user === undefined ? undefined : user,
  };
}

/**
 * Opaque session token — send to the game server as `auth.token` (validated via Convex).
 */
export function useSessionAuthToken(): string | null {
  const { token } = useSession();
  if (token === undefined) {
    return null;
  }
  return token ?? null;
}
