import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return x === 0;
}

function diceBearAvatarUrl(seed: string): string {
  const s = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
}

export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }
    return { userId: session.userId };
  },
});

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, password, name }) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      throw new ConvexError("Valid email is required");
    }
    if (password.length < 8) {
      throw new ConvexError("Password must be at least 8 characters");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .first();
    if (existing) {
      throw new ConvexError("An account with this email already exists");
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      email: normalized,
      name: name?.trim() || undefined,
      passwordHash,
      passwordSalt: salt,
      avatarUrl: diceBearAvatarUrl(normalized),
      score: 0,
      createdAt: now,
      updatedAt: now,
    });

    const token = randomHex(32);
    const expiresAt = now + SESSION_MS;
    await ctx.db.insert("sessions", { token, userId, expiresAt });

    return { token };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalized))
      .first();

    if (!user?.passwordHash || !user.passwordSalt) {
      throw new ConvexError("Invalid email or password");
    }

    const candidate = await hashPassword(password, user.passwordSalt);
    if (!timingSafeEqualHex(candidate, user.passwordHash)) {
      throw new ConvexError("Invalid email or password");
    }

    const now = Date.now();
    const token = randomHex(32);
    const expiresAt = now + SESSION_MS;
    await ctx.db.insert("sessions", {
      token,
      userId: user._id,
      expiresAt,
    });

    return { token };
  },
});

export const signOut = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .first();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});
