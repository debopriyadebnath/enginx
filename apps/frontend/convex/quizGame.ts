import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUserId } from "./auth/session";
import { toPublicQuestion } from "./questions";

const categoryV = v.union(
  v.literal("aiml"),
  v.literal("cs_fundamentals"),
  v.literal("programming"),
  v.literal("math")
);

type QuizPhase = "lobby" | "running" | "ended";

interface QuizState {
  phase: QuizPhase;
  questionIds: Id<"questions">[];
  currentIndex: number;
  deadlineAt: number;
  questionCount: number;
  /** Set when the run was started with a category filter */
  category?: Doc<"questions">["category"];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function checkAnswer(q: Doc<"questions">, raw: string): boolean {
  const s = raw.trim();
  if (q.type === "mcq" && q.options && q.options.length > 0) {
    const ans = q.answer.trim();
    const byIndex = /^\d+$/.test(ans) ? parseInt(ans, 10) : NaN;
    if (!Number.isNaN(byIndex) && q.options[byIndex] !== undefined) {
      const expected = q.options[byIndex]!.trim().toLowerCase();
      return (
        s.toLowerCase() === expected ||
        s === String(byIndex) ||
        s.toLowerCase() === ans.toLowerCase()
      );
    }
    return s.toLowerCase() === ans.toLowerCase();
  }
  return s.toLowerCase() === q.answer.trim().toLowerCase();
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const n = Math.min(Math.max(limit ?? 25, 1), 100);
    const all = await ctx.db.query("users").collect();
    return all
      .map((u) => ({
        userId: u._id,
        name: u.name ?? u.email ?? "Player",
        score: u.score ?? 0,
        bestStreak: u.bestStreak ?? 0,
        avatarUrl: u.avatarUrl,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  },
});

export const getGameState = query({
  args: { sessionToken: v.optional(v.string()), gameId: v.id("games") },
  handler: async (ctx, { sessionToken, gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) return null;

    const state = game.currentState as QuizState | undefined;
    const room = game.roomId
      ? await ctx.db
          .query("rooms")
          .withIndex("by_game", (q) => q.eq("gameId", gameId))
          .first()
      : null;

    let players: {
      userId: Id<"users">;
      score: number;
      streak: number;
    }[] = [];
    if (room) {
      const rp = await ctx.db
        .query("roomPlayers")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      players = rp.map((p) => ({
        userId: p.userId,
        score: p.score,
        streak: p.streak,
      }));
    }

    let currentQuestion = null as Record<string, unknown> | null;
    if (
      state?.phase === "running" &&
      state.questionIds.length > 0 &&
      state.currentIndex < state.questionIds.length
    ) {
      const qid = state.questionIds[state.currentIndex]!;
      const qdoc = await ctx.db.get(qid);
      if (qdoc) {
        currentQuestion = toPublicQuestion(qdoc, false);
      }
    }

    return {
      game,
      room,
      players,
      quiz: state ?? null,
      currentQuestion,
    };
  },
});

export const createRoom = mutation({
  args: {
    sessionToken: v.string(),
    mode: v.union(v.literal("single"), v.literal("multi")),
    maxPlayers: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, mode, maxPlayers }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const now = Date.now();

    const gameId = await ctx.db.insert("games", {
      gameType: "quiz",
      mode,
      status: "lobby",
      currentState: { phase: "lobby", questionIds: [], currentIndex: 0 },
      hostUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    const cap =
      mode === "single" ? 1 : Math.min(Math.max(maxPlayers ?? 8, 2), 32);

    let code = randomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!clash) break;
      code = randomCode();
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      gameId,
      hostUserId: userId,
      maxPlayers: cap,
      status: "open",
      createdAt: now,
    });

    await ctx.db.patch(gameId, { roomId, updatedAt: now });

    await ctx.db.insert("roomPlayers", {
      roomId,
      userId,
      score: 0,
      streak: 0,
      joinedAt: now,
      ready: true,
    });

    return { gameId, roomId, code };
  },
});

export const joinRoom = mutation({
  args: { sessionToken: v.string(), code: v.string() },
  handler: async (ctx, { sessionToken, code }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .first();
    if (!room || room.status !== "open") {
      throw new ConvexError("Room not found or closed");
    }

    const existing = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId)
      )
      .first();
    if (existing) {
      return { gameId: room.gameId, roomId: room._id };
    }

    const players = await ctx.db
      .query("roomPlayers")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length >= room.maxPlayers) {
      throw new ConvexError("Room is full");
    }

    await ctx.db.insert("roomPlayers", {
      roomId: room._id,
      userId,
      score: 0,
      streak: 0,
      joinedAt: Date.now(),
      ready: false,
    });

    return { gameId: room.gameId, roomId: room._id };
  },
});

export const startGame = mutation({
  args: {
    sessionToken: v.string(),
    gameId: v.id("games"),
    category: v.optional(categoryV),
    questionCount: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, gameId, category, questionCount }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const game = await ctx.db.get(gameId);
    if (!game || game.hostUserId !== userId) {
      throw new ConvexError("Not allowed");
    }
    if (game.status !== "lobby") {
      throw new ConvexError("Game already started");
    }

    const count = Math.min(Math.max(questionCount ?? 5, 1), 25);
    let pool: Doc<"questions">[];
    if (category) {
      pool = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else {
      pool = await ctx.db.query("questions").take(200);
    }
    if (pool.length === 0) {
      throw new ConvexError(
        "No questions in database. Run seedBuiltinQuestions first."
      );
    }

    const picked = shuffle(pool).slice(0, count);
    const questionIds = picked.map((p) => p._id);
    const first = await ctx.db.get(questionIds[0]!);
    if (!first) throw new ConvexError("Invalid question");

    const now = Date.now();
    const deadlineAt = now + first.timeLimit * 1000;

    const quizState: QuizState = {
      phase: "running",
      questionIds,
      currentIndex: 0,
      deadlineAt,
      questionCount: count,
      category,
    };

    await ctx.db.patch(gameId, {
      status: "running",
      currentState: quizState,
      updatedAt: now,
    });

    if (game.roomId) {
      await ctx.db.patch(game.roomId, { status: "playing" });
    }

    return { started: true, questionCount: count };
  },
});

export const submitAnswer = mutation({
  args: {
    sessionToken: v.string(),
    gameId: v.id("games"),
    answer: v.string(),
  },
  handler: async (ctx, { sessionToken, gameId, answer }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== "running") {
      throw new ConvexError("Game not active");
    }

    const state = game.currentState as QuizState | undefined;
    if (!state || state.phase !== "running") {
      throw new ConvexError("Invalid game phase");
    }

    const qid = state.questionIds[state.currentIndex];
    if (!qid) throw new ConvexError("No current question");

    const qdoc = await ctx.db.get(qid);
    if (!qdoc) throw new ConvexError("Question missing");

    const now = Date.now();
    const late = now > state.deadlineAt + 2000;
    const correct = !late && checkAnswer(qdoc, answer);
    const questionStart = state.deadlineAt - qdoc.timeLimit * 1000;
    const timeMs = Math.max(0, now - questionStart);
    const basePoints = correct ? qdoc.points : 0;
    const speedBonus =
      correct && !late
        ? Math.max(
            0,
            Math.floor(((state.deadlineAt - now) / (qdoc.timeLimit * 1000)) * 30)
          )
        : 0;
    const pointsEarned = Math.min(basePoints + speedBonus, qdoc.points * 2);

    await ctx.db.insert("attempts", {
      gameId,
      userId,
      questionId: qid,
      answer,
      correct,
      pointsEarned,
      timeMs: late ? undefined : timeMs,
      createdAt: now,
    });

    let roomPlayer = null as Doc<"roomPlayers"> | null;
    if (game.roomId) {
      roomPlayer = await ctx.db
        .query("roomPlayers")
        .withIndex("by_room_user", (q) =>
          q.eq("roomId", game.roomId!).eq("userId", userId)
        )
        .first();
    }

    let newStreak = 0;
    if (roomPlayer) {
      newStreak = correct ? roomPlayer.streak + 1 : 0;
      await ctx.db.patch(roomPlayer._id, {
        score: roomPlayer.score + pointsEarned,
        streak: newStreak,
      });
    }

    const user = await ctx.db.get(userId);
    if (user) {
      const total = (user.score ?? 0) + pointsEarned;
      const best = Math.max(user.bestStreak ?? 0, newStreak);
      await ctx.db.patch(userId, {
        score: total,
        bestStreak: best,
        lastStreak: newStreak,
        updatedAt: now,
      });
    }

    const nextIndex = state.currentIndex + 1;
    let ended = false;
    if (nextIndex >= state.questionIds.length) {
      ended = true;
      await ctx.db.patch(gameId, {
        status: "ended",
        currentState: { ...state, phase: "ended" as const, currentIndex: nextIndex },
        endedAt: now,
        updatedAt: now,
      });
      if (game.roomId) {
        await ctx.db.patch(game.roomId, { status: "closed" });
      }
    } else {
      const nextQ = await ctx.db.get(state.questionIds[nextIndex]!);
      const deadlineAt = now + (nextQ?.timeLimit ?? 30) * 1000;
      await ctx.db.patch(gameId, {
        currentState: {
          ...state,
          currentIndex: nextIndex,
          deadlineAt,
          phase: "running",
        },
        updatedAt: now,
      });
    }

    return {
      correct,
      pointsEarned,
      streak: newStreak,
      explanation: qdoc.explanation,
      correctAnswer: qdoc.answer,
      ended,
      nextIndex: ended ? nextIndex : nextIndex,
    };
  },
});

/**
 * Solo quiz loaded from local JSON (no `games` / DB questions).
 * Call after each graded answer to sync profile score and streak.
 */
export const applyLocalQuizPoints = mutation({
  args: {
    sessionToken: v.string(),
    pointsEarned: v.number(),
    streak: v.number(),
  },
  handler: async (ctx, { sessionToken, pointsEarned, streak }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User missing");
    const now = Date.now();
    const total = (user.score ?? 0) + pointsEarned;
    const best = Math.max(user.bestStreak ?? 0, streak);
    await ctx.db.patch(userId, {
      score: total,
      bestStreak: best,
      lastStreak: streak,
      updatedAt: now,
    });
    return { score: total };
  },
});

export const advanceState = mutation({
  args: { sessionToken: v.string(), gameId: v.id("games") },
  handler: async (ctx, { sessionToken, gameId }) => {
    await requireUserId(ctx, sessionToken);
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    return { status: game.status, currentState: game.currentState };
  },
});

export const endGame = mutation({
  args: { sessionToken: v.string(), gameId: v.id("games") },
  handler: async (ctx, { sessionToken, gameId }) => {
    const userId = await requireUserId(ctx, sessionToken);
    const game = await ctx.db.get(gameId);
    if (!game || game.hostUserId !== userId) {
      throw new ConvexError("Not allowed");
    }
    const now = Date.now();
    await ctx.db.patch(gameId, {
      status: "ended",
      endedAt: now,
      updatedAt: now,
    });
    if (game.roomId) {
      await ctx.db.patch(game.roomId, { status: "closed" });
    }
    return { ended: true };
  },
});
