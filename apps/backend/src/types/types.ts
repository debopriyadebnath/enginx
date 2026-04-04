import { Socket } from "socket.io";

export interface ConvexUser {
  id: string;
  email?: string;
  name?: string;
}

export interface SocketUser {
  id: string;
}

export interface Player {
  socketId: string;
  userId: string;
  username: string;
  score: number;
  currentAnswer: string | null;
  isReady: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  timeLimit: number; // in seconds
}

export interface GameRoom {
  id: string;
  players: Map<string, Player>;
  currentQuestionIndex: number;
  gameState: "waiting" | "playing" | "question" | "answer" | "ended";
  startTime: number;
  questionStartTime: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
}

export interface GameAnswer {
  playerId: string;
  questionId: string;
  answer: string;
  timeToAnswer: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: SocketUser;
    }
  }
}

export type CustomSocket = Socket & {
  data: {
    user?: SocketUser;
  };
};
