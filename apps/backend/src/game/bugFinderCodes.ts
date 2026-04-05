import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CodeChallenge } from "./bugFinderTypes.js";

const __dirname = import.meta.dir;

function repoBackendData(): string {
  return join(__dirname, "..", "..", "data", "codes.json");
}

let cached: CodeChallenge[] | null = null;

export function loadCodeChallenges(): CodeChallenge[] {
  if (cached) return cached;
  const path = repoBackendData();
  if (!existsSync(path)) {
    console.warn(`[bugFinderCodes] Missing ${path}`);
    cached = [];
    return cached;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    cached = [];
    return cached;
  }
  cached = raw as CodeChallenge[];
  return cached;
}

/** Deterministic shuffle — same seed → same order for both players. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0;
  }
  const a = [...items];
  const rand = (idx: number) => {
    h = Math.imul(h ^ idx, 2654435761);
    h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(i) * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function pickBugFinderRound(
  count: number,
  roomSeed: string
): CodeChallenge[] {
  const all = loadCodeChallenges();
  if (all.length === 0) return [];
  const shuffled = seededShuffle(all, roomSeed);
  const n = Math.min(Math.max(count, 1), 25, shuffled.length);
  return shuffled.slice(0, n);
}

export function checkBlankAnswer(q: CodeChallenge, selected: string): boolean {
  const expected = q.blanks[0]?.correctAnswer?.trim();
  if (!expected) return false;
  return selected.trim() === expected;
}

export function pointsForBug(q: CodeChallenge, correct: boolean): number {
  if (!correct) return 0;
  if (q.difficulty === "hard") return 120;
  if (q.difficulty === "medium") return 100;
  return 80;
}

/** Client-safe payload (no correct answer until round ends). */
export function packChallengeWire(q: CodeChallenge) {
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    concept: q.concept,
    title: q.title,
    description: q.description,
    codeTemplate: q.codeTemplate,
    options: q.options,
  };
}
