import BUILTIN_PACK from "../convex/seed/builtinQuestions.json";
import MATH_PACK from "@/data/maths.json";
import AIML_PACK from "@/data/aiml.json";
import PROG_PACK from "@/data/programming.json";
import CS_PACK from "@/data/cs_fundamental.json";
import type { QuestionJson, QuestionPackFile } from "./questionPack";
import type { PublicQuestion } from "@/components/game/types";

const builtinPack = BUILTIN_PACK as QuestionPackFile;

/** All questions merged from every pack, deduped by id. */
const ALL_QUESTIONS: QuestionJson[] = (() => {
  const seen = new Set<string>();
  const merged: QuestionJson[] = [];
  const sources = [
    ...(MATH_PACK as QuestionPackFile).questions,
    ...(AIML_PACK as QuestionPackFile).questions,
    ...(PROG_PACK as QuestionPackFile).questions,
    ...(CS_PACK as QuestionPackFile).questions,
    ...builtinPack.questions,
  ];
  for (const q of sources) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      merged.push(q);
    }
  }
  return merged;
})();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Returns a shuffled subset of questions for a run.
 * Pass `"all"` to mix every category randomly.
 */
export function getQuestionsForRun(
  category: QuestionJson["category"] | "all",
  count: number
): QuestionJson[] {
  const pool = shuffle(
    category === "all"
      ? ALL_QUESTIONS
      : ALL_QUESTIONS.filter((q) => q.category === category)
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

/**
 * For Socket.IO / server grading: send the selected option text (not "0"/"1")
 * so it matches pack `answer` strings on the server.
 */
export function rawSelectionToAnswerText(
  q: { type: string; options?: string[] },
  raw: string
): string {
  const s = raw.trim();
  if (
    (q.type === "mcq" || q.type === "math") &&
    q.options &&
    q.options.length > 0 &&
    /^\d+$/.test(s)
  ) {
    const i = parseInt(s, 10);
    if (q.options[i] !== undefined) {
      return q.options[i]!.trim();
    }
  }
  return s;
}

/** Mirrors `convex/quizGame.ts` `checkAnswer` for JSON questions. */
export function checkAnswerJson(q: QuestionJson, raw: string): boolean {
  const s = raw.trim();
  if (q.type === "mcq" && q.options && q.options.length > 0) {
    const ans = q.answer.trim();
    const byIndex = /^\d+$/.test(ans) ? parseInt(ans, 10) : NaN;
    if (!Number.isNaN(byIndex) && q.options[byIndex] !== undefined) {
      // answer stored as option index (legacy builtinQuestions format)
      const expected = q.options[byIndex]!.trim().toLowerCase();
      return s.toLowerCase() === expected || s === String(byIndex);
    }
    // answer stored as option text (rich pack format) — find matching index
    const ansLower = ans.toLowerCase();
    const correctIndex = q.options.findIndex(
      (opt) => opt.trim().toLowerCase() === ansLower
    );
    if (correctIndex !== -1) {
      return s === String(correctIndex) || s.toLowerCase() === ansLower;
    }
    return s.toLowerCase() === ansLower;
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
  if (q.type === "mcq" && q.options && q.options.length > 0) {
    if (/^\d+$/.test(a)) {
      // index-based answer
      const i = parseInt(a, 10);
      if (q.options[i] !== undefined) {
        return `${String.fromCharCode(65 + i)}. ${q.options[i]}`;
      }
    } else {
      // text-based answer — find which option it corresponds to
      const ansLower = a.toLowerCase();
      const idx = q.options.findIndex(
        (opt) => opt.trim().toLowerCase() === ansLower
      );
      if (idx !== -1) {
        return `${String.fromCharCode(65 + idx)}. ${a}`;
      }
    }
  }
  return a;
}
