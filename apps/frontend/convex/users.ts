import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { userIdFromSession } from "./auth/session";

function diceBearAvatarUrl(seed: string): string {
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
}

export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    const userId = await userIdFromSession(ctx, sessionToken);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const createOrUpdateUser = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<Doc<"users"> | null> => {
    const userId = await userIdFromSession(ctx, sessionToken);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const existing = await ctx.db.get(userId);
    if (!existing) {
      throw new ConvexError("User record missing");
    }

    const now = Date.now();
    const seed = existing.email ?? userId;
    const updates: Partial<Doc<"users">> = {};
    if (!existing.avatarUrl) {
      updates.avatarUrl = diceBearAvatarUrl(seed);
    }
    if (existing.score === undefined) {
      updates.score = 0;
    }
    if (existing.bestStreak === undefined) {
      updates.bestStreak = 0;
    }
    if (existing.lastStreak === undefined) {
      updates.lastStreak = 0;
    }
    if (existing.createdAt === undefined) {
      updates.createdAt = now;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await ctx.db.patch(userId, updates);
    }

    return await ctx.db.get(userId);
  },
});
