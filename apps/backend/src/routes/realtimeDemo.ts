/**
 * Demo HTTP surface for the hackathon track: documents the real-time / 1v1
 * event model without requiring WebSocket clients. Production gameplay stays on Socket.IO.
 */
import { Router, type Request, type Response } from "express";

export const realtimeDemoRouter = Router();

const SPEC = {
  name: "Enginx realtime multiplayer (demo spec)",
  version: 1,
  layers: {
    frontend: "Next.js (Vercel) — channels + UI",
    authority: "Bun + Express (Render) — game state, timers, scores",
    persistence: "Convex — users, questions, attempts, leaderboards",
    transport: "Socket.IO today; swappable for a managed pub/sub later",
  },
  identity: {
    token: "Convex session token or user _id string in handshake auth",
  },
  channels: {
    user: "user:{convexUserId}",
    match: "match:{matchId}",
  },
  eventTypes: [
    "presence_update",
    "challenge_request",
    "challenge_response",
    "match_found",
    "game_start",
    "new_round",
    "timer_sync",
    "submit_answer",
    "answer_result",
    "score_update",
    "game_over",
  ],
} as const;

/** GET /api/realtime/spec */
realtimeDemoRouter.get("/spec", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    ...SPEC,
    timestamp: new Date().toISOString(),
  });
});

/** GET /api/realtime/demo/match — static snapshot for judges / Postman */
realtimeDemoRouter.get("/demo/match", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    demo: true,
    matchId: "match-demo-001",
    gameType: "quiz",
    mode: "1v1_ranked",
    participants: [
      { convexUserId: "jh7...demo1", displayName: "Player A", score: 2 },
      { convexUserId: "kx9...demo2", displayName: "Player B", score: 1 },
    ],
    currentState: {
      round: 3,
      roundTotal: 10,
      questionId: "q_eng_042",
      deadlineAt: new Date(Date.now() + 12_000).toISOString(),
      phase: "answering",
    },
    lastEvents: [
      { type: "game_start", at: new Date(Date.now() - 60_000).toISOString() },
      { type: "new_round", at: new Date(Date.now() - 15_000).toISOString() },
      { type: "timer_sync", at: new Date().toISOString() },
    ],
    timestamp: new Date().toISOString(),
  });
});

type PublishBody = {
  type?: string;
  matchId?: string;
  fromUserId?: string;
  payload?: Record<string, unknown>;
};

/** POST /api/realtime/demo/publish — dummy ack (no side effects) */
realtimeDemoRouter.post("/demo/publish", (req: Request, res: Response) => {
  const body = (req.body || {}) as PublishBody;
  const type = typeof body.type === "string" ? body.type : "unknown";
  const known = SPEC.eventTypes as readonly string[];
  const accepted = known.includes(type);

  res.status(accepted ? 200 : 202).json({
    ok: true,
    demo: true,
    accepted,
    message: accepted
      ? "Would broadcast to match channel (dummy — no Socket.IO emit)."
      : "Unknown event type; still logged for demo.",
    relay: {
      type,
      matchId: body.matchId ?? null,
      fromUserId: body.fromUserId ?? null,
      payload: body.payload ?? {},
    },
    serverTime: new Date().toISOString(),
    sequence: Math.floor(Math.random() * 1_000_000),
  });
});
