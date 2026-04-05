import type { Question } from "../types/types.js";
import type { QuestionJson } from "./packQuestion.js";
import { calculatePointsWithBonuses } from "./scoring.js";

/** Normalize free-text answers for comparison (legacy bank). */
export function normalizeAnswer(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isAnswerCorrect(question: Question, rawAnswer: string): boolean {
  return normalizeAnswer(rawAnswer) === normalizeAnswer(question.correctAnswer);
}

/**
 * Same rules as `apps/frontend/lib/quizFromPack.ts` `checkAnswerJson`
 * (MCQ index answers, case-insensitive text).
 */
export function checkAnswerJson(q: QuestionJson, raw: string): boolean {
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

/** Human-readable correct answer for results UI. */
export function correctAnswerDisplay(q: QuestionJson): string {
  const ans = q.answer.trim();
  if (q.type === "mcq" && q.options && q.options.length > 0) {
    const byIndex = /^\d+$/.test(ans) ? parseInt(ans, 10) : NaN;
    if (!Number.isNaN(byIndex) && q.options[byIndex] !== undefined) {
      return q.options[byIndex]!;
    }
  }
  return q.answer;
}

export function scoreQuizAnswer(args: {
  question: Question;
  rawAnswer: string;
  timeToAnswerMs: number;
  streak: number;
}): { correct: boolean; points: number } {
  const correct = isAnswerCorrect(args.question, args.rawAnswer);
  const points = calculatePointsWithBonuses({
    isCorrect: correct,
    timeToAnswer: args.timeToAnswerMs,
    playerStreak: args.streak,
  });
  return { correct, points };
}

/** Fixed countdown for live 1v1 (server + clients use this, not JSON `timeLimit`). */
export const MULTIPLAYER_QUESTION_SECONDS = 10;

/** Minimal payload for Socket.IO (no answer / explanation). */
export function packQuestionToPayload(q: QuestionJson): {
  id: string;
  type: QuestionJson["type"];
  text: string;
  options: string[];
  timeLimit: number;
} {
  return {
    id: q.id,
    type: q.type,
    text: q.question,
    options: q.options ?? [],
    timeLimit: q.timeLimit,
  };
}

/** Same as `packQuestionToPayload` but always `timeLimit: MULTIPLAYER_QUESTION_SECONDS`. */
export function packQuestionToPayloadMultiplayer(q: QuestionJson) {
  return {
    ...packQuestionToPayload(q),
    timeLimit: MULTIPLAYER_QUESTION_SECONDS,
  };
}
