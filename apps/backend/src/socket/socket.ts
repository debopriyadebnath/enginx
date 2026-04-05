import { Server } from "socket.io";
import type { CustomSocket } from "../types/types.js";
import { socketAuthMiddleware } from "../middleware/auth.js";
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
import {
  MULTIPLAYER_QUESTION_SECONDS,
  checkAnswerJson,
  correctAnswerDisplay,
  packQuestionToPayloadMultiplayer,
} from "../game/quizEvaluator.js";

const ANSWER_DISPLAY_TIMEOUT = 3000; // 3 seconds to show answer
const NEXT_QUESTION_DELAY = 1000; // 1 second before next question

interface RoomState {
  questionTimer?: NodeJS.Timeout;
  answerTimer?: NodeJS.Timeout;
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
        const username =
          data?.username?.trim() || `Player-${userId.slice(-4)}`;
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
        data: { targetUserId: string; username?: string },
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
          const fromUsername =
            data.username?.trim() || `Player-${userId.slice(-4)}`;
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
            fromUsername
          );
          if (!rec) {
            callback({ ok: false, error: "offline_or_self" });
            return;
          }

          emitToUser(io, data.targetUserId, "challenge_received", {
            challengeId: rec.id,
            fromUserId: userId,
            fromUsername: rec.fromUsername,
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
          const roomId = gameManager.createRoomFromPair(
            [c.fromSocketId, socket.id],
            [nameA, nameB]
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
        const username = data?.username || `Player-${userId?.slice(-4)}`;
        const roomId = gameManager.joinGame(socket.id);

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
        const { roomId, answer } = data;
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
      gameManager.removeFromQueue(socket.id);

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
          gameManager.endGame(room.id);
        }
      });
    });
  });
};

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
  const roomState: RoomState = {};
  roomState.questionTimer = setTimeout(() => {
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
    roomState.answerTimer = setTimeout(() => {
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
          gameManager.endGame(roomId);
        }, 5000);
      }
    }, ANSWER_DISPLAY_TIMEOUT);
  }, MULTIPLAYER_QUESTION_SECONDS * 1000);
}
