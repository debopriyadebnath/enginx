"use client";

import { io, type Socket } from "socket.io-client";

const defaultUrl = "http://localhost:8000";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? defaultUrl;
}

const socketOptions = {
  transports: ["websocket", "polling"] as string[],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 50,
  reconnectionDelay: 500,
  reconnectionDelayMax: 10_000,
  timeout: 25_000,
};

let socket: Socket | null = null;
let boundToken: string | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
let lastError: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function clearDisconnectTimer() {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
}

function onSocketConnect() {
  lastError = null;
  emit();
}

function onSocketDisconnect() {
  emit();
}

function onSocketConnectError(err: Error) {
  lastError = err.message;
  emit();
}

function attachCoreListeners(s: Socket) {
  s.on("connect", onSocketConnect);
  s.on("disconnect", onSocketDisconnect);
  s.on("connect_error", onSocketConnectError);
}

function detachCoreListeners(s: Socket) {
  s.off("connect", onSocketConnect);
  s.off("disconnect", onSocketDisconnect);
  s.off("connect_error", onSocketConnectError);
}

/**
 * One shared Socket.IO client per session token, ref-counted so React Strict Mode
 * (mount → unmount → remount) does not disconnect between remounts and drop queue state.
 */
export function acquireGameSocket(sessionToken: string): Socket {
  clearDisconnectTimer();

  if (socket && boundToken !== sessionToken) {
    detachCoreListeners(socket);
    socket.disconnect();
    socket = null;
    boundToken = null;
  }

  refCount++;

  if (socket && boundToken === sessionToken) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  boundToken = sessionToken;
  lastError = null;
  socket = io(getBaseUrl(), {
    ...socketOptions,
    auth: { token: sessionToken },
  });
  attachCoreListeners(socket);
  emit();
  return socket;
}

export function releaseGameSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;

  clearDisconnectTimer();
  disconnectTimer = setTimeout(() => {
    disconnectTimer = null;
    if (refCount > 0) return;
    if (socket) {
      detachCoreListeners(socket);
      socket.disconnect();
      socket = null;
      boundToken = null;
    }
    lastError = null;
    emit();
  }, 450);
}

export function subscribeGameSocket(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getGameSocketState(): {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
} {
  return {
    socket,
    connected: Boolean(socket?.connected),
    error: lastError,
  };
}
