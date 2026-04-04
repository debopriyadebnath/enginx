/**
 * Frontend Example - Next.js + Convex Integration
 * 
 * This shows how to connect to the quiz backend from a Next.js frontend
 * using Convex authentication.
 * 
 * Usage:
 * import { useQuizConnection } from "@/hooks/useQuizConnection"
 * 
 * export function QuizGame() {
 *   const { connect, emit, on } = useQuizConnection()
 *   // ... use the socket connection
 * }
 */

// ============================================
// CLIENT-SIDE HOOK: useQuizConnection
// ============================================

import { useConvexAuth } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface Question {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
}

export interface Player {
  socketId: string;
  username: string;
  score: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
}

export function useQuizConnection() {
  const { idToken } = useConvexAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "waiting" | "playing" | "ended"
  >("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameEnded, setGameEnded] = useState(false);

  // Connect to socket
  const connect = (username: string) => {
    if (!idToken) {
      console.error("No auth token available");
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_QUIZ_API_URL || "http://localhost:4000", {
      auth: {
        token: idToken,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to quiz server");
      setIsConnected(true);

      // Join game
      socket.emit("join-game", { username }, (response: any) => {
        if (response.status === "waiting") {
          setStatus("waiting");
        } else if (response.status === "game_started") {
          setStatus("playing");
          setRoomId(response.roomId);
        }
      });
    });

    // Game events
    socket.on("waiting-for-opponent", () => {
      setStatus("waiting");
    });

    socket.on("game-started", (data: any) => {
      setStatus("playing");
      setRoomId(data.roomId);
      setPlayers(data.players);
      setLeaderboard(data.players);
    });

    socket.on("question", (data: any) => {
      setCurrentQuestion(data.question);
    });

    socket.on("answer-time-up", (data: any) => {
      console.log("Answer time up:", data);
      // Show results before next question
    });

    socket.on("leaderboard-update", (data: any) => {
      setLeaderboard(data.leaderboard);
    });

    socket.on("game-ended", (data: any) => {
      setStatus("ended");
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
    });

    socket.on("player-disconnected", (data: any) => {
      console.warn(data.message);
      setStatus("idle");
    });

    socket.on("error", (error: any) => {
      console.error("Socket error:", error);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from quiz server");
      setIsConnected(false);
      setStatus("idle");
    });

    socketRef.current = socket;
  };

  // Submit answer
  const submitAnswer = (answer: string) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("submit-answer", { roomId, answer });
    }
  };

  // Get game state
  const getState = (callback?: (state: any) => void) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit("get-state", { roomId }, callback);
    }
  };

  // Disconnect
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      setIsConnected(false);
      setStatus("idle");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    submitAnswer,
    getState,
    isConnected,
    status,
    roomId,
    currentQuestion,
    players,
    leaderboard,
    gameEnded,
  };
}

// ============================================
// EXAMPLE COMPONENT: QuizGameComponent
// ============================================

export function QuizGameComponent() {
  const {
    connect,
    disconnect,
    submitAnswer,
    status,
    currentQuestion,
    players,
    leaderboard,
    gameEnded,
  } = useQuizConnection();

  const [username, setUsername] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const handleJoinGame = () => {
    if (username.trim()) {
      connect(username);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer && currentQuestion) {
      submitAnswer(selectedAnswer);
      setSelectedAnswer(null); // Reset for next question
    }
  };

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-4xl font-bold">Quiz Game</h1>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded"
        />
        <button
          onClick={handleJoinGame}
          disabled={!username.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Join Game
        </button>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-4xl font-bold">Waiting for opponent...</h1>
        <div className="animate-spin text-4xl">⏳</div>
        <button
          onClick={disconnect}
          className="px-6 py-2 bg-red-500 text-white rounded"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (status === "ended" || gameEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
        <h1 className="text-4xl font-bold">Quiz Finished!</h1>
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Final Leaderboard</h2>
          {leaderboard.map((entry, idx) => (
            <div key={idx} className="flex justify-between p-2 border-b">
              <span className="font-semibold">{entry.username}</span>
              <span className="text-lg font-bold">{entry.score} pts</span>
            </div>
          ))}
        </div>
        <button
          onClick={disconnect}
          className="px-6 py-2 bg-blue-500 text-white rounded"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-8 bg-gradient-to-b from-blue-50 to-white">
      {/* Header with Score */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Quiz Challenge</h1>
          <button
            onClick={disconnect}
            className="px-4 py-1 bg-red-500 text-white rounded text-sm"
          >
            Quit
          </button>
        </div>

        {/* Quick Leaderboard */}
        <div className="flex gap-8">
          {players.map((player) => (
            <div
              key={player.socketId}
              className="px-4 py-2 bg-white rounded shadow"
            >
              <div className="text-sm text-gray-600">{player.username}</div>
              <div className="text-2xl font-bold text-blue-600">
                {player.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-semibold mb-8">{currentQuestion.text}</h2>

          {/* Options */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                className={`p-4 text-lg font-semibold rounded border-2 transition ${
                  selectedAnswer === option
                    ? "border-blue-500 bg-blue-100"
                    : "border-gray-300 bg-white hover:border-blue-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
            className="w-full py-3 bg-green-500 text-white text-lg font-bold rounded disabled:opacity-50"
          >
            Submit Answer
          </button>

          {/* Timer */}
          <div className="mt-6 text-center text-gray-500 text-sm">
            Time limit: {currentQuestion.timeLimit} seconds
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ENVIRONMENT VARIABLES (.env.local)
// ============================================

/*
NEXT_PUBLIC_QUIZ_API_URL=http://localhost:4000
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
*/
