import raw from "@/data/bit-twiddler.json";

export type BitQuestion = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  title: string;
  expression: string;
  question: string;
  answer: string;
  options: string[];
  hint: string;
  explanation: string;
};

const ALL = raw as BitQuestion[];

export function pickBitRun(count: number): BitQuestion[] {
  const shuffled = shuffle([...ALL]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function checkBitAnswer(q: BitQuestion, selected: string): boolean {
  return selected.trim() === q.answer.trim();
}

export function pointsForBit(q: BitQuestion, correct: boolean): number {
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
