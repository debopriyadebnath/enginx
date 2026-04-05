/**
 * Game backend: HTTP (Express) vs Socket.IO
 *
 * - **Live data across machines:** every client must use the **same** Socket.IO origin
 *   (e.g. your Render URL). Pointing `NEXT_PUBLIC_SOCKET_URL` at `localhost` only
 *   reaches your own PC — other players never join that socket.
 * - **Optional path:** Engine.IO mounts at `path` (default `/socket.io`). Set
 *   `NEXT_PUBLIC_SOCKET_IO_PATH` + server `SOCKET_IO_PATH` to e.g. `/live/socket.io`
 *   to namespace real-time traffic (must match on both sides).
 */

const DEFAULT_HTTP = "http://localhost:8000";
const DEFAULT_SOCKET = "http://localhost:4000";
/** Must match backend `SOCKET_IO_PATH` (default is Socket.IO’s standard). */
const DEFAULT_SOCKET_IO_PATH = "/socket.io";

/** Express routes: `/health`, `/game/info`, etc. */
export function getGameHttpBaseUrl(): string {
  return process.env.NEXT_PUBLIC_GAME_HTTP_URL?.trim() || DEFAULT_HTTP;
}

/** Socket.IO `io()` origin (no path — use `getSocketIoPath()`). */
export function getSocketBaseUrl(): string {
  const socket = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socket) return socket;
  const http = process.env.NEXT_PUBLIC_GAME_HTTP_URL?.trim();
  if (http) return http;
  return DEFAULT_SOCKET;
}

/** Engine.IO path segment, e.g. `/live/socket.io` or `/socket.io`. */
export function getSocketIoPath(): string {
  return (
    process.env.NEXT_PUBLIC_SOCKET_IO_PATH?.trim() || DEFAULT_SOCKET_IO_PATH
  );
}
