import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const categoryV = v.union(
  v.literal("aiml"),
  v.literal("cs_fundamentals"),
  v.literal("programming"),
  v.literal("math")
);
const typeV = v.union(
  v.literal("mcq"),
  v.literal("code_output"),
  v.literal("debug"),
  v.literal("math")
);
const difficultyV = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

/** Client-safe question (no answer / explanation until after reveal). */
export function toPublicQuestion(
  q: Doc<"questions">,
  includeSolution: boolean
): Record<string, unknown> {
  const base = {
    _id: q._id,
    type: q.type,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    timeLimit: q.timeLimit,
    points: q.points,
    tags: q.tags,
  };
  if (includeSolution) {
    return {
      ...base,
      answer: q.answer,
      explanation: q.explanation,
    };
  }
  return base;
}

export const getQuestionsByFilter = query({
  args: {
    category: v.optional(categoryV),
    type: v.optional(typeV),
    difficulty: v.optional(difficultyV),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 40, 1), 200);
    let rows: Doc<"questions">[];

    if (args.category !== undefined) {
      rows = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .take(limit * 3);
    } else {
      rows = await ctx.db.query("questions").take(limit * 3);
    }

    const filtered = rows.filter((d) => {
      if (args.type !== undefined && d.type !== args.type) return false;
      if (args.difficulty !== undefined && d.difficulty !== args.difficulty) {
        return false;
      }
      return true;
    });

    return filtered.slice(0, limit).map((q) => toPublicQuestion(q, false));
  },
});
