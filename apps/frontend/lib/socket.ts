"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSessionAuthToken } from "@/lib/auth";
import {
  acquireGameSocket,
  getGameSocketState,
  releaseGameSocket,
  subscribeGameSocket,
} from "@/lib/gameSocketStore";
import { getSocketBaseUrl, getSocketIoPath } from "@/lib/gameServerUrls";

const socketOptions = {
  transports: ["websocket", "polling"] as string[],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 50,
  reconnectionDelay: 500,
  reconnectionDelayMax: 10_000,
  timeout: 25_000,
};

/**
 * Standalone client (tests / one-off). Prefer `useAuthenticatedGameSocket` for the app.
 */
export function createAuthenticatedSocket(sessionToken: string): Socket {
  return io(getSocketBaseUrl(), {
    ...socketOptions,
    path: getSocketIoPath(),
    auth: { token: sessionToken },
  });
}

export type AuthenticatedSocketState = {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  /** Internal: increments when shared socket state changes (for React re-renders). */
  _socketRevision?: number;
};

/**
 * Shared Socket.IO connection (ref-counted) so route changes / React Strict Mode
 * do not constantly disconnect and break matchmaking.
 */
export function useAuthenticatedGameSocket(): AuthenticatedSocketState & {
  sessionToken: string | null;
} {
  const sessionToken = useSessionAuthToken();
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeGameSocket(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (!sessionToken) {
      releaseGameSocket();
      setTick((t) => t + 1);
      return;
    }
    acquireGameSocket(sessionToken);
    setTick((t) => t + 1);
    return () => {
      releaseGameSocket();
      setTick((t) => t + 1);
    };
  }, [sessionToken]);

  const { socket, connected, error } = getGameSocketState();

  return {
    socket,
    connected,
    error,
    sessionToken,
    /** Bumps when the shared socket connects/disconnects/errors (internal). */
    _socketRevision: tick,
  };
}

export { useMultiplayerQuiz } from "./useMultiplayerQuiz";
export type { UseMultiplayerQuiz } from "./useMultiplayerQuiz";
export { useBugFinderMultiplayer } from "./useBugFinderMultiplayer";
