/** Payloads from `apps/backend` Socket.IO quiz flow. */

export type PresenceUser = {
  userId: string;
  username: string;
};

export type ChallengeGameType = "quiz" | "bug_finder";

export type ChallengeReceivedPayload = {
  challengeId: string;
  fromUserId: string;
  fromUsername: string;
  /** Omitted / `quiz` = live quiz; `bug_finder` = CS bug-finder blanks */
  gameType?: ChallengeGameType;
};

export type MultiplayerPlayer = {
  socketId: string;
  username: string;
  score: number;
};

export type GameStartedPayload = {
  roomId: string;
  players: MultiplayerPlayer[];
};

export type SocketQuestionWire = {
  id: string;
  type: string;
  text: string;
  options: string[];
  timeLimit: number;
};

export type QuestionEventPayload = {
  questionIndex: number;
  totalQuestions: number;
  question: SocketQuestionWire;
};

export type AnswerScoreEntry = {
  answer: string | null;
  isCorrect: boolean;
  /** Round delta: positive for correct, 0 or negative if wrong-answer penalty applies */
  points: number;
};

export type AnswerTimeUpPayload = {
  correctAnswer: string;
  scores: Record<string, AnswerScoreEntry>;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
};

export type GameEndedPayload = {
  finalLeaderboard: LeaderboardEntry[];
  message: string;
};

export type JoinGameAck =
  | { status: "waiting" }
  | {
      status: "game_started";
      roomId: string;
      players: MultiplayerPlayer[];
    }
  | { status: "error"; message?: string };

/** Ack payload from `get-state` (server `socket.ts`). */
export type GetStateAck =
  | { error: string }
  | {
      roomId: string;
      gameState: string;
      questionIndex: number;
      totalQuestions: number;
      question: SocketQuestionWire | null;
      leaderboard: LeaderboardEntry[];
      players: MultiplayerPlayer[];
    };
