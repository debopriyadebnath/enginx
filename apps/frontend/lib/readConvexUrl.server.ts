import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function normalizeConvexUrl(raw: string | undefined): string {
  if (!raw?.trim()) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. Add it to apps/frontend/.env.local (or set NEXT_PUBLIC_CONVEX_URL in the host env for production)."
    );
  }
  return raw.trim().replace(/\/+$/, "");
}

function parseNextPublicConvexUrlFromFile(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.startsWith("NEXT_PUBLIC_CONVEX_URL=")) continue;
    let v = trimmed.slice("NEXT_PUBLIC_CONVEX_URL=".length).trim();
    const hashIdx = v.indexOf(" #");
    if (hashIdx !== -1) {
      v = v.slice(0, hashIdx).trim();
    }
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v;
  }
  return undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads NEXT_PUBLIC_CONVEX_URL from apps/frontend/.env.local on the server only.
 * Path is resolved relative to this file (not process.cwd), so it works from
 * repo root or apps/frontend and avoids wrong client-side env inlining.
 */
export function getConvexUrlFromEnvLocalFile(): string {
  const nextToFrontendRoot = path.join(__dirname, "..", ".env.local");
  if (existsSync(nextToFrontendRoot)) {
    const text = readFileSync(nextToFrontendRoot, "utf8");
    const fromFile = parseNextPublicConvexUrlFromFile(text);
    if (fromFile?.trim()) {
      return normalizeConvexUrl(fromFile);
    }
  }
  return normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL);
}
