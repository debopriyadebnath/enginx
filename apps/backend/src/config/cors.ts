/**
 * Shared CORS origin for Express + Socket.IO so the Next.js app can use
 * cookies / credentialed requests consistently with the game server.
 */
export function getFrontendOrigins(): string | string[] {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:3000";
  if (raw.includes(",")) {
    return raw.split(",").map((s) => s.trim());
  }
  return raw;
}
