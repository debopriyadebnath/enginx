import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUserId } from "./auth/session";
import BUILTIN_PACK from "./seed/builtinQuestions.json";
import {
  questionJsonToConvexInsert,
  type QuestionPackFile,
} from "./seed/questionPack";

const pack = BUILTIN_PACK as QuestionPackFile;

/** Idempotent: skips rows that already match externalId (JSON `id`). */
export const seedBuiltinQuestions = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireUserId(ctx, sessionToken);
    let inserted = 0;
    for (const row of pack.questions) {
      if (!row.id) continue;
      const rowConvex = questionJsonToConvexInsert(row);
      const existing = await ctx.db
        .query("questions")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", rowConvex.externalId)
        )
        .first();
      if (existing) continue;
      await ctx.db.insert("questions", rowConvex);
      inserted++;
    }
    return { inserted, packVersion: pack.meta.version };
  },
});
