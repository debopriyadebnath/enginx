import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const questionType = v.union(
  v.literal("mcq"),
  v.literal("code_output"),
  v.literal("debug"),
  v.literal("math")
);

const questionCategory = v.union(
  v.literal("aiml"),
  v.literal("cs_fundamentals"),
  v.literal("programming"),
  v.literal("math")
);

const difficulty = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

/** Matches exported JSON packs; `builtin` kept for legacy seeded rows. */
const questionSource = v.union(
  v.literal("gemini"),
  v.literal("local"),
  v.literal("builtin")
);

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    score: v.optional(v.number()),
    /** Rolling best streak across quiz sessions (gamification). */
    bestStreak: v.optional(v.number()),
    /** Last session streak (for UI). */
    lastStreak: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_score", ["score"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  questions: defineTable({
    externalId: v.optional(v.string()),
    type: questionType,
    category: questionCategory,
    topic: v.optional(v.string()),
    difficulty,
    question: v.string(),
    options: v.optional(v.array(v.string())),
    answer: v.string(),
    explanation: v.optional(v.string()),
    timeLimit: v.number(),
    points: v.number(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    source: v.optional(questionSource),
    isFallback: v.optional(v.boolean()),
  })
    .index("by_category", ["category"])
    .index("by_category_type", ["category", "type"])
    .index("by_category_difficulty", ["category", "difficulty"])
    .index("by_externalId", ["externalId"]),

  games: defineTable({
    gameType: v.string(),
    mode: v.union(v.literal("single"), v.literal("multi")),
    status: v.union(
      v.literal("lobby"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("ended")
    ),
    /** Extensible per–game-type state (question index, timers, etc.). */
    currentState: v.optional(v.any()),
    roomId: v.optional(v.id("rooms")),
    hostUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_host", ["hostUserId"])
    .index("by_status", ["status"]),

  rooms: defineTable({
    code: v.string(),
    gameId: v.id("games"),
    hostUserId: v.id("users"),
    maxPlayers: v.number(),
    status: v.union(
      v.literal("open"),
      v.literal("playing"),
      v.literal("closed")
    ),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_game", ["gameId"]),

  roomPlayers: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    score: v.number(),
    streak: v.number(),
    joinedAt: v.number(),
    ready: v.boolean(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_user", ["userId"]),

  attempts: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    questionId: v.id("questions"),
    answer: v.string(),
    correct: v.boolean(),
    pointsEarned: v.number(),
    timeMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_game_user", ["gameId", "userId"])
    .index("by_game", ["gameId"])
    .index("by_question", ["questionId"]),
});
