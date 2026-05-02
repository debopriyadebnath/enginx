import raw from "@/data/struct-pad.json";

export type StructQuestion = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  title: string;
  code: string;
  question: string;
  answer: string;
  options: string[];
  layout: string;
  explanation: string;
};

const ALL = raw as StructQuestion[];

export function pickStructRun(count: number): StructQuestion[] {
  const shuffled = shuffle([...ALL]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function checkStructAnswer(q: StructQuestion, selected: string): boolean {
  return selected.trim() === q.answer.trim();
}

export function pointsForStruct(q: StructQuestion, correct: boolean): number {
  if (!correct) return 0;
  if (q.difficulty === "hard") return 120;
  if (q.difficulty === "medium") return 100;
  return 80;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
