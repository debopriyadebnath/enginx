import { Server, Socket } from "socket.io";
import type { CustomSocket } from "../types/types.js";
import { authMiddleware } from "../middleware/auth.js";
import { gameManager } from "../game/gameManager.js";
import { getCurrentQuestion } from "../game/questionBank.js";

const QUESTION_TIMEOUT = 15000; // 15 seconds per question
const ANSWER_DISPLAY_TIMEOUT = 3000; // 3 seconds to show answer
const NEXT_QUESTION_DELAY = 1000; // 1 second before next question

interface RoomState {
  questionTimer?: NodeJS.Timeout;
  answerTimer?: NodeJS.Timeout;
}

export const initializeSocket = (io: Server) => {
  // Apply authentication middleware
  io.use(authMiddleware);

  // Hook when client connects
  io.on("connection", (socket: CustomSocket) => {
    const userId = socket.data.user?.id;
    console.log(`[CONNECT] User ${userId} connected - Socket ID: ${socket.id}`);

    /**
     * Player joins the game queue
     */
    socket.on("join-game", (data: { username?: string }, callback) => {
      try {
        const username = data?.username || `Player-${userId?.slice(-4)}`;
        const roomId = gameManager.joinGame(socket.id);

        if (!roomId) {
          // Waiting for opponent
          socket.emit("waiting-for-opponent");
          callback({ status: "waiting" });
        } else {
          // Game started
          const room = gameManager.getRoom(roomId);
          if (room) {
            gameManager.updatePlayerName(roomId, socket.id, username);

            socket.join(roomId);
            console.log(`[GAME_START] Room ${roomId} started with 2 players`);

            // Notify both players that game started
            io.to(roomId).emit("game-started", {
              roomId,
              players: Array.from(room.players.values()).map((p) => ({
                socketId: p.socketId,
                username: p.username,
                score: p.score,
              })),
            });

            // Send first question after a short delay
            setTimeout(() => {
              sendQuestion(io, roomId);
            }, NEXT_QUESTION_DELAY);

            callback({ status: "game_started", roomId });
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
          question: question
            ? {
                id: question.id,
                text: question.text,
                options: question.options,
                timeLimit: question.timeLimit,
              }
            : null,
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

  // Send question to all players in room
  io.to(roomId).emit("question", {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: 10,
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      timeLimit: question.timeLimit,
    },
  });

  // Set timer for answer submission
  const roomState: RoomState = {};
  roomState.questionTimer = setTimeout(() => {
    room.gameState = "answer";

    // Emit answer results
    const scores = gameManager.calculateRoundScores(roomId);
    const correctAnswer = question.correctAnswer;

    io.to(roomId).emit("answer-time-up", {
      correctAnswer,
      scores: Object.fromEntries(
        Array.from(room.players.entries()).map(([socketId, player]) => [
          socketId,
          {
            answer: player.currentAnswer,
            isCorrect: player.currentAnswer === correctAnswer,
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
  }, question.timeLimit * 1000);
}

/**
 * Helper to get current question (fix for import)
 */
function getCurrentQuestion(questionIndex: number) {
  const questions = [
    {
      id: "q1",
      text: "What is the capital of France?",
      options: ["London", "Paris", "Berlin", "Madrid"],
      correctAnswer: "Paris",
      timeLimit: 10,
    },
    {
      id: "q2",
      text: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "Mars",
      timeLimit: 10,
    },
    {
      id: "q3",
      text: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      timeLimit: 8,
    },
    {
      id: "q4",
      text: "Who wrote Romeo and Juliet?",
      options: [
        "Jane Austen",
        "William Shakespeare",
        "Charles Dickens",
        "Mark Twain",
      ],
      correctAnswer: "William Shakespeare",
      timeLimit: 12,
    },
    {
      id: "q5",
      text: "What is the largest ocean on Earth?",
      options: [
        "Atlantic Ocean",
        "Indian Ocean",
        "Arctic Ocean",
        "Pacific Ocean",
      ],
      correctAnswer: "Pacific Ocean",
      timeLimit: 10,
    },
    {
      id: "q6",
      text: "In what year did the Titanic sink?",
      options: ["1912", "1905", "1920", "1898"],
      correctAnswer: "1912",
      timeLimit: 10,
    },
    {
      id: "q7",
      text: "What is the chemical symbol for Gold?",
      options: ["Go", "Gd", "Au", "Ag"],
      correctAnswer: "Au",
      timeLimit: 10,
    },
    {
      id: "q8",
      text: "Which technology did Tim Berners-Lee invent?",
      options: ["The Internet", "The World Wide Web", "JavaScript", "TCP"],
      correctAnswer: "The World Wide Web",
      timeLimit: 12,
    },
    {
      id: "q9",
      text: "What is the smallest prime number?",
      options: ["0", "1", "2", "3"],
      correctAnswer: "2",
      timeLimit: 8,
    },
    {
      id: "q10",
      text: "Which country is home to Kangaroos?",
      options: ["New Zealand", "Australia", "South Africa", "Brazil"],
      correctAnswer: "Australia",
      timeLimit: 10,
    },
  ];

  return questions[questionIndex];
}
