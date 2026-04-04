import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const validateSession = makeFunctionReference<"query">("sessions:validateSession");

let client: ConvexHttpClient | null = null;

function getConvexUrl(): string {
  const url =
    process.env.CONVEX_URL?.trim() ??
    process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    throw new Error(
      "Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL (same as frontend Convex deployment URL)"
    );
  }
  return url;
}

function getClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(getConvexUrl());
  }
  return client;
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string }> {
  const result = await getClient().query(validateSession, { token });
  if (!result?.userId) {
    throw new Error("Invalid or expired session");
  }
  return { userId: result.userId as string };
}
