import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    /** PBKDF2-SHA256 hash (hex), with passwordSalt */
    passwordHash: v.optional(v.string()),
    passwordSalt: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
  questions: defineTable({
    id: v.string(),
    type: v.union(
      v.literal("mcq"),
      v.literal("code_output"),
      v.literal("debug"),
      v.literal("math")
    ),
    category: v.string(),
    topic: v.string(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    question: v.string(),
    options: v.array(v.string()),
    answer: v.string(),
    explanation: v.string(),
    timeLimit: v.number(),
    points: v.number(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    source: v.union(v.literal("gemini"), v.literal("local")),
    isFallback: v.boolean(),
  })
    .index("by_id", ["id"])
    .index("by_category", ["category"])
    .index("by_difficulty", ["difficulty"])
    .index("by_type", ["type"])
    .index("by_category_and_difficulty", ["category", "difficulty"])
    .index("by_category_and_type", ["category", "type"])
    .index("by_difficulty_and_type", ["difficulty", "type"])
    .index("by_category_and_difficulty_and_type", [
      "category",
      "difficulty",
      "type",
    ]),
  gameConfigs: defineTable({
    key: v.string(),
    gameType: v.string(),
    version: v.number(),
    config: v.any(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_gameType_and_version", ["gameType", "version"])
    .index("by_gameType_and_isActive", ["gameType", "isActive"]),
  games: defineTable({
    gameType: v.string(),
    mode: v.union(v.literal("single"), v.literal("multi")),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed")
    ),
    currentState: v.any(),
    currentQuestionIndex: v.number(),
    roomId: v.optional(v.id("rooms")),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    configKey: v.optional(v.string()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_status_and_gameType", ["status", "gameType"]),
  rooms: defineTable({
    roomCode: v.string(),
    hostId: v.string(),
    maxPlayers: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("completed")
    ),
    gameId: v.optional(v.id("games")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_roomCode", ["roomCode"])
    .index("by_hostId", ["hostId"])
    .index("by_status", ["status"]),
  roomPlayers: defineTable({
    roomId: v.id("rooms"),
    userId: v.string(),
    score: v.number(),
    joinedAt: v.number(),
    isReady: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_roomId", ["roomId"])
    .index("by_userId", ["userId"])
    .index("by_roomId_and_userId", ["roomId", "userId"])
    .index("by_roomId_and_score", ["roomId", "score"]),
  attempts: defineTable({
    userId: v.string(),
    gameId: v.id("games"),
    questionId: v.id("questions"),
    selectedAnswer: v.string(),
    isCorrect: v.boolean(),
    timeTaken: v.number(),
    pointsAwarded: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_gameId", ["gameId"])
    .index("by_gameId_and_userId", ["gameId", "userId"])
    .index("by_gameId_and_questionId", ["gameId", "questionId"]),
});
