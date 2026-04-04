import { createLocalJWKSet, jwtVerify } from "jose";

/** Matches Convex Auth `TOKEN_SUB_CLAIM_DIVIDER` — `sub` is `userId|sessionId`. */
export const CONVEX_AUTH_SUB_DIVIDER = "|";

const DEFAULT_AUDIENCE = "convex";

let jwksSet: ReturnType<typeof createLocalJWKSet> | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v.trim();
}

function getIssuer(): string {
  return requireEnv("CONVEX_SITE_URL").replace(/\/+$/, "");
}

/**
 * Same `JWKS` JSON string as in the Convex dashboard (public keys for RS256).
 * Cached after first parse.
 */
function getJwksKeySet() {
  if (jwksSet) {
    return jwksSet;
  }
  const raw = requireEnv("JWKS");
  const parsed = JSON.parse(raw) as { keys: unknown[] };
  if (!parsed?.keys || !Array.isArray(parsed.keys)) {
    throw new Error("JWKS must be a JSON object with a `keys` array");
  }
  jwksSet = createLocalJWKSet(parsed);
  return jwksSet;
}

export type VerifiedConvexJwt = {
  /** Convex `users` document id */
  userId: string;
  sessionId: string;
};

/** Call at startup so missing `JWKS` / `CONVEX_SITE_URL` fails fast. */
export function assertJwtEnvConfigured(): void {
  getJwksKeySet();
  getIssuer();
}

/**
 * Verify a Convex Auth access JWT using only **JWKS** + issuer + audience.
 * Configure `JWKS` and `CONVEX_SITE_URL` on the Bun server (same values as Convex).
 */
export async function verifyConvexAuthJwt(
  token: string
): Promise<VerifiedConvexJwt> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Authentication token required");
  }

  const jwks = getJwksKeySet();
  const issuer = getIssuer();
  const audience = process.env.CONVEX_JWT_AUDIENCE ?? DEFAULT_AUDIENCE;

  const { payload } = await jwtVerify(trimmed, jwks, {
    issuer,
    audience,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const parts = sub.split(CONVEX_AUTH_SUB_DIVIDER);
  const userId = parts[0];
  const sessionId = parts[1] ?? "";

  if (!userId) {
    throw new Error("Invalid token: missing subject");
  }

  return { userId, sessionId };
}
