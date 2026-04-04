/** Shared quiz lobby → `/play/run` URL (dashboard + /play). */

export const QUIZ_CATEGORY_OPTIONS = [
  { id: "math" as const, label: "Math" },
  { id: "aiml" as const, label: "AI / ML" },
  { id: "cs_fundamentals" as const, label: "CS Fundamentals" },
  { id: "programming" as const, label: "Programming" },
];

export type QuizCategoryId = (typeof QUIZ_CATEGORY_OPTIONS)[number]["id"];

export function buildPlayRunQuery(
  category: QuizCategoryId,
  count: number,
  useTimer: boolean
): string {
  const q = new URLSearchParams({
    category,
    count: String(count),
  });
  if (useTimer) q.set("timer", "1");
  return q.toString();
}
