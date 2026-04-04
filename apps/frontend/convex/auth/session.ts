import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Session-based auth (opaque token in localStorage).
 * When you adopt Convex Auth / JWT, replace with ctx.auth.getUserIdentity()
 * and map identity.subject → users row.
 */
export async function userIdFromSession(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined
): Promise<Id<"users"> | null> {
  if (!sessionToken) {
    return null;
  }
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  return session.userId;
}

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
  sessionToken: string | undefined
): Promise<Id<"users">> {
  const userId = await userIdFromSession(ctx, sessionToken);
  if (!userId) {
    throw new ConvexError("Not authenticated");
  }
  return userId;
}
