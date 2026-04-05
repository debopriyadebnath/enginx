import type { LeaderboardEntry, MultiplayerPlayer } from "@/lib/multiplayerTypes";

export type BugFinderChallengeWire = {
  id: string;
  type: string;
  difficulty: string;
  concept: string;
  title: string;
  description: string;
  codeTemplate: string;
  options: string[];
};

export type BFQuestionEventPayload = {
  questionIndex: number;
  totalQuestions: number;
  challenge: BugFinderChallengeWire;
};

export type BFAnswerScoreEntry = {
  answer: string | null;
  isCorrect: boolean;
  points: number;
};

export type BFAnswerTimeUpPayload = {
  correctAnswer: string;
  explanation: string;
  scores: Record<string, BFAnswerScoreEntry>;
};

export type BFGameStartedPayload = {
  roomId: string;
  gameKind: "bug_finder";
  players: MultiplayerPlayer[];
};

export type BFGameEndedPayload = {
  finalLeaderboard: LeaderboardEntry[];
  message: string;
};
