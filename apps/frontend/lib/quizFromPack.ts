import BUILTIN_PACK from "../convex/seed/builtinQuestions.json";
import type { QuestionJson, QuestionPackFile } from "./questionPack";
import type { PublicQuestion } from "@/components/game/types";

const pack = BUILTIN_PACK as QuestionPackFile;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Only questions whose `category` matches — from the JSON pack only. */
export function getQuestionsForRun(
  category: QuestionJson["category"],
  count: number
): QuestionJson[] {
  const pool = shuffle(
    pack.questions.filter((q) => q.category === category)
  );
  if (pool.length === 0) return [];
  const n = Math.min(Math.max(count, 1), 50, pool.length);
  return pool.slice(0, n);
}

export function jsonToPublicQuestion(q: QuestionJson): PublicQuestion {
  return {
    _id: q.id,
    type: q.type,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    timeLimit: q.timeLimit,
    points: q.points,
    tags: q.tags,
  };
}

/** Mirrors `convex/quizGame.ts` `checkAnswer` for JSON questions. */
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

/** `timeLimitSec` is the active countdown length (JSON `timeLimit` or fixed 10s). */
export function computePointsEarned(
  q: QuestionJson,
  correct: boolean,
  deadlineAt: number,
  now: number,
  timeLimitSec: number
): number {
  const late = now > deadlineAt + 2000;
  if (!correct || late) return 0;
  const basePoints = q.points;
  const denom = Math.max(1, timeLimitSec) * 1000;
  const speedBonus = Math.max(
    0,
    Math.floor(((deadlineAt - now) / denom) * 30)
  );
  return Math.min(basePoints + speedBonus, q.points * 2);
}

/** Human-readable answer for review (MCQ index → option label). */
export function formatAnswerForDisplay(q: QuestionJson, raw: string): string {
  const s = raw.trim();
  if (q.type === "mcq" && q.options && q.options.length > 0 && /^\d+$/.test(s)) {
    const i = parseInt(s, 10);
    if (q.options[i] !== undefined) {
      return `${String.fromCharCode(65 + i)}. ${q.options[i]}`;
    }
  }
  return s || "—";
}

export function formatCorrectAnswerDisplay(q: QuestionJson): string {
  const a = q.answer.trim();
  if (q.type === "mcq" && q.options && q.options.length > 0 && /^\d+$/.test(a)) {
    const i = parseInt(a, 10);
    if (q.options[i] !== undefined) {
      return `${String.fromCharCode(65 + i)}. ${q.options[i]} (${a})`;
    }
  }
  return a;
}
