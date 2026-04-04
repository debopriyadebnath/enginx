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
});
