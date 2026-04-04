"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSessionAuthToken } from "@/lib/auth";

const defaultUrl = "http://localhost:8000";

function getSocketBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? defaultUrl;
}

const socketOptions = {
  transports: ["websocket", "polling"] as string[],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

/**
 * Socket.IO client that sends the opaque session token as `auth.token`
 * (verified on the Bun server via Convex `sessions:validateSession`).
 */
export function createAuthenticatedSocket(sessionToken: string): Socket {
  return io(getSocketBaseUrl(), {
    ...socketOptions,
    auth: { token: sessionToken },
  });
}

export type AuthenticatedSocketState = {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
};

/**
 * One Socket.IO connection per session; reconnects when the session token changes.
 */
export function useAuthenticatedGameSocket(): AuthenticatedSocketState & {
  sessionToken: string | null;
} {
  const sessionToken = useSessionAuthToken();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => getSocketBaseUrl(), []);

  useEffect(() => {
    if (!sessionToken) {
      setSocket(null);
      setConnected(false);
      setError(null);
      return;
    }

    const s = io(baseUrl, {
      ...socketOptions,
      auth: { token: sessionToken },
    });

    const onConnect = () => {
      setConnected(true);
      setError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) => {
      setError(err.message);
      setConnected(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    setSocket(s);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [sessionToken, baseUrl]);

  return { socket, connected, error, sessionToken };
}
