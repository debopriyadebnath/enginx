/** Source file: `apps/frontend/data/suduku.json` — copy from `packages/suduku.json` when updating puzzles. */
import pack from "@/data/suduku.json";
import type { MindSnapPack, MindSnapPuzzle } from "./mindSnapTypes";

const data = pack as MindSnapPack;

function isGrid4x4(p: MindSnapPuzzle): boolean {
  if (p.grid.length !== 4) return false;
  return p.grid.every((row) => row.length === 4);
}

export function getDepartments(): string[] {
  const s = new Set<string>();
  for (const p of data.puzzles) {
    if (isGrid4x4(p)) s.add(p.department);
  }
  return [...s].sort();
}

export function getDifficulties(): number[] {
  return [1, 2, 3];
}

export type MindSnapFilters = {
  department: string;
  difficulty: number | "all";
};

export function listEligiblePuzzles(filters: MindSnapFilters): MindSnapPuzzle[] {
  return data.puzzles.filter((p) => {
    if (!isGrid4x4(p)) return false;
    if (filters.department !== "all" && p.department !== filters.department) {
      return false;
    }
    if (filters.difficulty !== "all" && p.difficulty !== filters.difficulty) {
      return false;
    }
    return true;
  });
}

export function pickRandomPuzzle(filters: MindSnapFilters): MindSnapPuzzle | null {
  const pool = listEligiblePuzzles(filters);
  if (pool.length === 0) return null;
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? null;
}

/**
 * Pick a random puzzle that hasn't appeared in `seenIds` yet.
 * When all puzzles have been seen, the pool resets automatically.
 * Returns the chosen puzzle AND the updated seenIds set.
 */
export function pickRandomPuzzleNoRepeat(
  filters: MindSnapFilters,
  seenIds: Set<string>
): { puzzle: MindSnapPuzzle; nextSeenIds: Set<string> } | null {
  const pool = listEligiblePuzzles(filters);
  if (pool.length === 0) return null;

  // Unseen first; if pool exhausted, reset and use full pool
  let candidates = pool.filter((p) => !seenIds.has(p.id));
  if (candidates.length === 0) candidates = pool;

  const picked = candidates[Math.floor(Math.random() * candidates.length)]!;
  const nextSeenIds = new Set(candidates === pool ? [picked.id] : [...seenIds, picked.id]);
  return { puzzle: picked, nextSeenIds };
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function isTargetCell(
  puzzle: MindSnapPuzzle,
  row: number,
  col: number
): boolean {
  return puzzle.correctCells.some((c) => c.row === row && c.col === col);
}
