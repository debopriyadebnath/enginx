import { Server } from "socket.io";
import type { CustomSocket } from "../types/types.js";
import { socketAuthMiddleware } from "../middleware/auth.js";
import { bugFinderGameManager } from "../game/bugFinderGameManager.js";
import {
  checkBlankAnswer,
  packChallengeWire,
} from "../game/bugFinderCodes.js";
import { gameManager } from "../game/gameManager.js";
import {
  createChallenge,
  deleteChallenge,
  emitToUser,
  getChallenge,
  getPresenceList,
  getUsernameForUser,
  pruneExpiredChallenges,
  registerPresence,
  removeSocket,
  clearChallengesForUser,
} from "../presence/presenceManager.js";
import type { ChallengeGameType } from "../presence/presenceManager.js";
import {
  MULTIPLAYER_QUESTION_SECONDS,
  checkAnswerJson,
  correctAnswerDisplay,
  packQuestionToPayloadMultiplayer,
} from "../game/quizEvaluator.js";

const ANSWER_DISPLAY_TIMEOUT = 3000; // 3 seconds to show answer
const NEXT_QUESTION_DELAY = 1000; // 1 second before next question
const MAX_USERNAME_LENGTH = 30;

function sanitizeUsername(raw: string | undefined, fallback: string): string {
  const name = (raw ?? "").replace(/[<>"'&]/g, "").trim().slice(0, MAX_USERNAME_LENGTH);
  return name || fallback;
}

interface RoomState {
  questionTimer?: NodeJS.Timeout;
  answerTimer?: NodeJS.Timeout;
}

const roomTimers = new Map<string, RoomState>();

function clearRoomTimers(roomId: string): void {
  const state = roomTimers.get(roomId);
  if (state) {
    clearTimeout(state.questionTimer);
    clearTimeout(state.answerTimer);
    roomTimers.delete(roomId);
  }
}

const MAX_ANSWER_LENGTH = 500;
const ANSWER_RATE_LIMIT_MS = 500;
const lastAnswerTime = new Map<string, number>();

function isAnswerRateLimited(socketId: string): boolean {
  const now = Date.now();
  const last = lastAnswerTime.get(socketId) ?? 0;
  if (now - last < ANSWER_RATE_LIMIT_MS) return true;
  lastAnswerTime.set(socketId, now);
  return false;
}

function broadcastPresence(io: Server): void {
  io.emit("presence_update", { users: getPresenceList() });
}

function beginGame(io: Server, roomId: string): void {
  const room = gameManager.getRoom(roomId);
  if (!room) return;

  room.players.forEach((_, playerSocketId) => {
    const playerSocket = io.sockets.sockets.get(playerSocketId);
    playerSocket?.join(roomId);
  });

  console.log(`[GAME_START] Room ${roomId} started with 2 players`);

  io.to(roomId).emit("game-started", {
    roomId,
    players: Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      username: p.username,
      score: p.score,
    })),
  });

  setTimeout(() => {
    sendQuestion(io, roomId);
  }, NEXT_QUESTION_DELAY);
}

export const initializeSocket = (io: Server) => {
  io.use(socketAuthMiddleware);

  // Hook when client connects
  io.on("connection", (socket: CustomSocket) => {
    const userId = socket.data.user?.id;
    console.log(`[CONNECT] User ${userId} connected - Socket ID: ${socket.id}`);

    /**
     * Lobby: register display name and receive `presence_update` broadcasts.
     */
    socket.on("register_presence", (data: { username?: string }) => {
      try {
        if (!userId) return;
        const username = sanitizeUsername(data?.username, `Player-${userId.slice(-4)}`);
        registerPresence(socket.id, userId, username);
        broadcastPresence(io);
      } catch (e) {
        console.error("[REGISTER_PRESENCE]", e);
      }
    });

    /**
     * Challenge another online user (by Convex user id). They receive `challenge_received`.
     */
    socket.on(
      "challenge_user",
      (
        data: {
          targetUserId: string;
          username?: string;
          gameType?: ChallengeGameType;
        },
        callback: (ack: {
          ok: boolean;
          challengeId?: string;
          error?: string;
        }) => void
      ) => {
        try {
          if (!userId) {
            callback({ ok: false, error: "auth" });
            return;
          }
          const fromUsername = sanitizeUsername(data.username, `Player-${userId.slice(-4)}`);
          const gameType: ChallengeGameType =
            data.gameType === "bug_finder" ? "bug_finder" : "quiz";
          registerPresence(socket.id, userId, fromUsername);

          for (const c of pruneExpiredChallenges()) {
            emitToUser(io, c.fromUserId, "challenge_expired", {
              challengeId: c.id,
            });
            emitToUser(io, c.toUserId, "challenge_expired", { challengeId: c.id });
          }

          const rec = createChallenge(
            userId,
            data.targetUserId,
            socket.id,
            fromUsername,
            gameType
          );
          if (!rec) {
            callback({ ok: false, error: "offline_or_self" });
            return;
          }

          emitToUser(io, data.targetUserId, "challenge_received", {
            challengeId: rec.id,
            fromUserId: userId,
            fromUsername: rec.fromUsername,
            gameType: rec.gameType,
          });

          callback({ ok: true, challengeId: rec.id });
        } catch (error) {
          console.error("[CHALLENGE_USER]", error);
          callback({ ok: false, error: "server" });
        }
      }
    );

    /**
     * Accept or decline an incoming challenge (only the target user).
     */
    socket.on(
      "challenge_response",
      (
        data: { challengeId: string; accept: boolean },
        callback: (ack: { ok: boolean; error?: string; roomId?: string }) => void
      ) => {
        try {
          if (!userId) {
            callback({ ok: false, error: "auth" });
            return;
          }
          const c = getChallenge(data.challengeId);
          if (!c || c.toUserId !== userId) {
            callback({ ok: false, error: "invalid" });
            return;
          }

          deleteChallenge(data.challengeId);

          if (!data.accept) {
            emitToUser(io, c.fromUserId, "challenge_declined", {
              challengeId: c.id,
              byUserId: userId,
            });
            callback({ ok: true });
            return;
          }

          const nameA = c.fromUsername;
          const nameB = getUsernameForUser(userId);

          if (c.gameType === "bug_finder") {
            const roomId = bugFinderGameManager.createRoomFromPair(
              [c.fromSocketId, socket.id],
              [nameA, nameB],
              [c.fromUserId, userId]
            );
            beginBugFinderGame(io, roomId);
            callback({ ok: true, roomId });
            return;
          }

          const roomId = gameManager.createRoomFromPair(
            [c.fromSocketId, socket.id],
            [nameA, nameB],
            [c.fromUserId, userId]
          );

          beginGame(io, roomId);
          callback({ ok: true, roomId });
        } catch (error) {
          console.error("[CHALLENGE_RESPONSE]", error);
          callback({ ok: false, error: "server" });
        }
      }
    );

    /**
     * Legacy: quick queue match (optional)
     */
    socket.on("join-game", (data: { username?: string }, callback) => {
      try {
        if (!userId) {
          callback({ status: "error", message: "Auth required" });
          return;
        }
        const username = data?.username || `Player-${userId?.slice(-4)}`;
        const roomId = gameManager.joinGame(socket.id, userId);

        if (!roomId) {
          socket.emit("waiting-for-opponent");
          callback({ status: "waiting" });
        } else {
          const room = gameManager.getRoom(roomId);
          if (room) {
            gameManager.updatePlayerName(roomId, socket.id, username);
            beginGame(io, roomId);
            callback({
              status: "game_started",
              roomId,
              players: Array.from(room.players.values()).map((p) => ({
                socketId: p.socketId,
                username: p.username,
                score: p.score,
              })),
            });
          }
        }
      } catch (error) {
        console.error("[JOIN_GAME] Error:", error);
        callback({ status: "error", message: "Failed to join game" });
      }
    });

    /**
     * Player submits answer
     */
    socket.on("submit-answer", (data: { roomId: string; answer: string }) => {
      try {
        if (isAnswerRateLimited(socket.id)) return;
        const { roomId } = data;
        const answer = String(data.answer ?? "").slice(0, MAX_ANSWER_LENGTH);
        const room = gameManager.getRoom(roomId);

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        gameManager.recordAnswer(roomId, socket.id, answer);
        socket.emit("answer-received", { message: "Answer recorded" });
      } catch (error) {
        console.error("[SUBMIT_ANSWER] Error:", error);
        socket.emit("error", { message: "Failed to submit answer" });
      }
    });

    /**
     * Get current game state
     */
    socket.on("get-state", (data: { roomId: string }, callback) => {
      try {
        const room = gameManager.getRoom(data.roomId);
        if (!room) {
          callback({ error: "Room not found" });
          return;
        }

        const question = gameManager.getCurrentQuestion(data.roomId);
        const leaderboard = gameManager.getLeaderboard(data.roomId);

        callback({
          roomId: data.roomId,
          gameState: room.gameState,
          questionIndex: room.currentQuestionIndex,
          totalQuestions: gameManager.getRoundCount(data.roomId),
          question: question ? packQuestionToPayloadMultiplayer(question) : null,
          leaderboard,
          players: Array.from(room.players.values()).map((p) => ({
            socketId: p.socketId,
            username: p.username,
            score: p.score,
          })),
        });
      } catch (error) {
        console.error("[GET_STATE] Error:", error);
        callback({ error: "Failed to get state" });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on("disconnect", () => {
      console.log(`[DISCONNECT] User ${userId} disconnected`);
      lastAnswerTime.delete(socket.id);
      gameManager.removeFromQueue(socket.id);
      bugFinderGameManager.removeFromQueue(socket.id);

      const leftUserId = removeSocket(socket.id);
      if (leftUserId) {
        for (const ch of clearChallengesForUser(leftUserId)) {
          const peer =
            ch.fromUserId === leftUserId ? ch.toUserId : ch.fromUserId;
          emitToUser(io, peer, "challenge_cancelled", { challengeId: ch.id });
        }
        broadcastPresence(io);
      }

      // Find and clean up any room the player was in
      gameManager.getAllRooms().forEach((room) => {
        if (room.players.has(socket.id)) {
          console.log(
            `[DISCONNECT] Ending room ${room.id} due to player disconnect`
          );
          io.to(room.id).emit("player-disconnected", {
            message: "Opponent disconnected",
          });
          clearRoomTimers(room.id);
          gameManager.endGame(room.id);
        }
      });
      bugFinderGameManager.getAllRooms().forEach((room) => {
        if (room.players.has(socket.id)) {
          io.to(room.id).emit("player-disconnected", {
            message: "Opponent disconnected",
          });
          clearRoomTimers(room.id);
          bugFinderGameManager.endGame(room.id);
        }
      });
    });

    /** Bug finder: queue match (same pattern as join-game) */
    socket.on("join-bug-game", (data: { username?: string }, callback) => {
      try {
        if (!userId) {
          callback({ status: "error", message: "Auth required" });
          return;
        }
        const username = data?.username || `Player-${userId?.slice(-4)}`;
        const roomId = bugFinderGameManager.joinGame(socket.id, userId);
        if (!roomId) {
          socket.emit("bf-waiting-for-opponent");
          callback({ status: "waiting" });
        } else {
          const room = bugFinderGameManager.getRoom(roomId);
          if (room) {
            bugFinderGameManager.updatePlayerName(roomId, socket.id, username);
            beginBugFinderGame(io, roomId);
            callback({
              status: "game_started",
              roomId,
              players: Array.from(room.players.values()).map((p) => ({
                socketId: p.socketId,
                username: p.username,
                score: p.score,
              })),
            });
          }
        }
      } catch (error) {
        console.error("[JOIN_BUG_GAME]", error);
        callback({ status: "error", message: "Failed to join" });
      }
    });

    socket.on(
      "submit-bug-answer",
      (data: { roomId: string; answer: string }) => {
        try {
          if (isAnswerRateLimited(socket.id)) return;
          const answer = String(data.answer ?? "").slice(0, MAX_ANSWER_LENGTH);
          const room = bugFinderGameManager.getRoom(data.roomId);
          if (!room) {
            socket.emit("error", { message: "Room not found" });
            return;
          }
          bugFinderGameManager.recordAnswer(data.roomId, socket.id, answer);
          socket.emit("bf-answer-received", { message: "Answer recorded" });
        } catch (error) {
          console.error("[SUBMIT_BUG_ANSWER]", error);
          socket.emit("error", { message: "Failed to submit answer" });
        }
      }
    );

    socket.on("get-bf-state", (data: { roomId: string }, callback) => {
      try {
        const room = bugFinderGameManager.getRoom(data.roomId);
        if (!room) {
          callback({ error: "Room not found" });
          return;
        }
        const ch = bugFinderGameManager.getCurrentChallenge(data.roomId);
        const leaderboard = bugFinderGameManager.getLeaderboard(data.roomId);
        callback({
          roomId: data.roomId,
          gameState: room.gameState,
          questionIndex: room.currentQuestionIndex,
          totalQuestions: bugFinderGameManager.getRoundCount(data.roomId),
          challenge: ch ? packChallengeWire(ch) : null,
          leaderboard,
          players: Array.from(room.players.values()).map((p) => ({
            socketId: p.socketId,
            username: p.username,
            score: p.score,
          })),
        });
      } catch (error) {
        console.error("[GET_BF_STATE]", error);
        callback({ error: "Failed to get state" });
      }
    });
  });
};

function beginBugFinderGame(io: Server, roomId: string): void {
  const room = bugFinderGameManager.getRoom(roomId);
  if (!room) return;
  room.players.forEach((_, playerSocketId) => {
    io.sockets.sockets.get(playerSocketId)?.join(roomId);
  });
  io.to(roomId).emit("bf-game-started", {
    roomId,
    gameKind: "bug_finder" as const,
    players: Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      username: p.username,
      score: p.score,
    })),
  });
  setTimeout(() => {
    sendBugFinderQuestion(io, roomId);
  }, NEXT_QUESTION_DELAY);
}

function sendBugFinderQuestion(io: Server, roomId: string) {
  const room = bugFinderGameManager.getRoom(roomId);
  const ch = bugFinderGameManager.getCurrentChallenge(roomId);
  if (!room || !ch) {
    console.log(`[BF_SEND] Room or challenge missing: ${roomId}`);
    return;
  }
  room.gameState = "question";
  room.players.forEach((p) => {
    p.currentAnswer = null;
  });
  const total = bugFinderGameManager.getRoundCount(roomId);
  io.to(roomId).emit("bf-question", {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: total,
    challenge: packChallengeWire(ch),
  });

  const bfState: RoomState = {};
  roomTimers.set(roomId, bfState);
  bfState.questionTimer = setTimeout(() => {
    room.gameState = "answer";
    const scores = bugFinderGameManager.calculateRoundScores(roomId);
    const correctToken = ch.blanks[0]?.correctAnswer ?? "";
    io.to(roomId).emit("bf-answer-time-up", {
      correctAnswer: correctToken,
      explanation: ch.explanation,
      scores: Object.fromEntries(
        Array.from(room.players.entries()).map(([socketId, player]) => [
          socketId,
          {
            answer: player.currentAnswer,
            isCorrect: checkBlankAnswer(ch, player.currentAnswer ?? ""),
            points: scores.get(socketId) ?? 0,
          },
        ])
      ),
    });
    io.to(roomId).emit("bf-leaderboard-update", {
      leaderboard: bugFinderGameManager.getLeaderboard(roomId),
    });
    bfState.answerTimer = setTimeout(() => {
      const more = bugFinderGameManager.nextQuestion(roomId);
      if (more) {
        sendBugFinderQuestion(io, roomId);
      } else {
        room.gameState = "ended";
        const finalLeaderboard = bugFinderGameManager.getLeaderboard(roomId);
        io.to(roomId).emit("bf-game-ended", {
          finalLeaderboard,
          message: "Bug finder match complete!",
        });
        setTimeout(() => {
          clearRoomTimers(roomId);
          bugFinderGameManager.endGame(roomId);
        }, 5000);
      }
    }, ANSWER_DISPLAY_TIMEOUT);
  }, MULTIPLAYER_QUESTION_SECONDS * 1000);
}

/**
 * Send question to all players in room
 */
function sendQuestion(io: Server, roomId: string) {
  const room = gameManager.getRoom(roomId);
  const question = gameManager.getCurrentQuestion(roomId);

  if (!room || !question) {
    console.log(`[SEND_QUESTION] Room or question not found: ${roomId}`);
    return;
  }

  room.gameState = "question";

  // Reset answers
  room.players.forEach((player) => {
    player.currentAnswer = null;
  });

  const totalRounds = gameManager.getRoundCount(roomId);

  io.to(roomId).emit("question", {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: totalRounds,
    question: packQuestionToPayloadMultiplayer(question),
  });

  // Set timer for answer submission
  const qState: RoomState = {};
  roomTimers.set(roomId, qState);
  qState.questionTimer = setTimeout(() => {
    room.gameState = "answer";

    const scores = gameManager.calculateRoundScores(roomId);
    const correctAnswer = correctAnswerDisplay(question);

    io.to(roomId).emit("answer-time-up", {
      correctAnswer,
      scores: Object.fromEntries(
        Array.from(room.players.entries()).map(([socketId, player]) => [
          socketId,
          {
            answer: player.currentAnswer,
            isCorrect: checkAnswerJson(
              question,
              player.currentAnswer ?? ""
            ),
            points: scores.get(socketId) || 0,
          },
        ])
      ),
    });

    // Show leaderboard
    io.to(roomId).emit("leaderboard-update", {
      leaderboard: gameManager.getLeaderboard(roomId),
    });

    // Move to next question or end game
    qState.answerTimer = setTimeout(() => {
      const hasMoreQuestions = gameManager.nextQuestion(roomId);

      if (hasMoreQuestions) {
        sendQuestion(io, roomId);
      } else {
        // Game ended
        room.gameState = "ended";
        const finalLeaderboard = gameManager.getLeaderboard(roomId);

        io.to(roomId).emit("game-ended", {
          finalLeaderboard,
          message: "Quiz completed!",
        });

        // Clean up room after a delay
        setTimeout(() => {
          clearRoomTimers(roomId);
          gameManager.endGame(roomId);
        }, 5000);
      }
    }, ANSWER_DISPLAY_TIMEOUT);
  }, MULTIPLAYER_QUESTION_SECONDS * 1000);
}
