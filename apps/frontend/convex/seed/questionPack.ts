/**
 * Canonical shape for hardcoded / exported question JSON files.
 * Maps into Convex `questions` (externalId ← id, createdAt as ms).
 */

export type QuestionPackSource = "gemini" | "local";

export type QuestionPackMeta = {
  version: string;
  /** ISO-8601 */
  lastUpdated: string;
};

export type QuestionJson = {
  id: string;
  type: "mcq" | "code_output" | "debug" | "math";
  category: "aiml" | "cs_fundamentals" | "programming" | "math";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  /** Omit or use [] for types without options */
  options?: string[];
  answer: string;
  explanation: string;
  timeLimit: number;
  points: number;
  tags: string[];
  /** ISO-8601 string or legacy millisecond number */
  createdAt: string | number;
  source: QuestionPackSource;
  isFallback: boolean;
};

export type QuestionPackFile = {
  meta: QuestionPackMeta;
  questions: QuestionJson[];
};

export function parseQuestionCreatedAt(createdAt: string | number): number {
  if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
    return createdAt;
  }
  const ms = Date.parse(String(createdAt));
  if (!Number.isFinite(ms)) {
    return Date.now();
  }
  return ms;
}

/** Row shape for `ctx.db.insert("questions", …)` */
export function questionJsonToConvexInsert(q: QuestionJson) {
  const options =
    q.options === undefined || q.options.length === 0 ? undefined : q.options;
  return {
    externalId: q.id,
    type: q.type,
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    options,
    answer: q.answer,
    explanation: q.explanation,
    timeLimit: q.timeLimit,
    points: q.points,
    tags: q.tags,
    createdAt: parseQuestionCreatedAt(q.createdAt),
    source: q.source,
    isFallback: q.isFallback,
  };
}
