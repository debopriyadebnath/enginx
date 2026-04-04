import type { Socket } from "socket.io";
import type { SocketUser } from "../types/types.js";

/**
 * Client-visible error messages (Socket.IO passes these to `connect_error`).
 */
export const SocketAuthError = {
  MISSING_TOKEN: "Authentication token required",
  INVALID_TOKEN: "Invalid or expired session",
} as const;

/**
 * Extract JWT from the Socket.IO handshake.
 * Primary path: `socket.handshake.auth.token` (browser clients).
 * Fallback: `query.token` (some native / test clients).
 */
export function extractHandshakeAuthToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const fromAuth = auth?.token;
  if (typeof fromAuth === "string" && fromAuth.trim() !== "") {
    return fromAuth.trim();
  }

  const q = socket.handshake.query?.token;
  if (typeof q === "string" && q.trim() !== "") {
    return q.trim();
  }
  if (Array.isArray(q) && q[0] && typeof q[0] === "string") {
    return q[0].trim();
  }

  return undefined;
}

export function buildSocketUser(userId: string, sessionId?: string): SocketUser {
  return { id: userId, sessionId };
}
