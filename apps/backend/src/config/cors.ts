/**
 * Shared CORS origin for Express + Socket.IO so the Next.js app can use
 * cookies / credentialed requests consistently with the game server.
 */
function isValidOrigin(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function getFrontendOrigins(): string | string[] {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const origins = raw.includes(",")
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [raw.trim()];

  const invalid = origins.filter((o) => !isValidOrigin(o));
  if (invalid.length > 0) {
    console.error(
      `[CORS] Invalid FRONTEND_URL origin(s): ${invalid.join(", ")} — must be full http/https URLs`
    );
    process.exit(1);
  }

  return origins.length === 1 ? origins[0]! : origins;
}
