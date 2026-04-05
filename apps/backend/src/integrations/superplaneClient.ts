/**
 * SuperPlane (https://docs.superplane.com) public REST API — Bearer token auth.
 * Used for hackathon / ops integration; gameplay remains Socket.IO + Convex.
 *
 * Env:
 * - SUPERPLANE_API_TOKEN — service account or personal token from SuperPlane UI
 * - SUPERPLANE_API_BASE_URL — optional, default https://app.superplane.com/api/v1
 */

export type SuperplaneConfig = {
  token: string | undefined;
  baseUrl: string;
  configured: boolean;
};

export function getSuperplaneConfig(): SuperplaneConfig {
  const token = process.env.SUPERPLANE_API_TOKEN?.trim() || undefined;
  const raw =
    process.env.SUPERPLANE_API_BASE_URL?.trim() ||
    "https://app.superplane.com/api/v1";
  const baseUrl = raw.replace(/\/+$/, "");
  return { token, baseUrl, configured: Boolean(token) };
}

export type SuperplaneHttpResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

export type SuperplaneRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

/**
 * Authenticated request to SuperPlane. Throws if token is missing.
 */
export async function superplaneRequest(
  path: string,
  init?: SuperplaneRequestInit
): Promise<SuperplaneHttpResult> {
  const { token, baseUrl } = getSuperplaneConfig();
  if (!token) {
    throw new Error("SUPERPLANE_API_TOKEN is not set");
  }
  const rel = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${rel}`;

  const method = (init?.method || "GET").toUpperCase();
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(init?.headers ?? {}),
  };
  if (method !== "GET" && method !== "HEAD" && init?.body != null) {
    baseHeaders["Content-Type"] =
      baseHeaders["Content-Type"] || "application/json";
  }

  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: baseHeaders,
    body: init?.body ?? undefined,
  });

  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* leave as string */
  }

  return { ok: res.ok, status: res.status, data };
}

/** Safe summary for public status endpoint (no secrets). */
export function summarizeCanvasesResponse(data: unknown): {
  kind: "array" | "object" | "other";
  count?: number;
} {
  if (Array.isArray(data)) {
    return { kind: "array", count: data.length };
  }
  if (data && typeof data === "object") {
    return { kind: "object" };
  }
  return { kind: "other" };
}
