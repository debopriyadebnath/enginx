import type { ScoreBreakdown, ValidationResult, WorkflowPuzzle } from "./types";

export function computeScore(
  puzzle: WorkflowPuzzle,
  validation: ValidationResult,
  remainingSeconds: number
): ScoreBreakdown {
  const s = puzzle.scoring;
  const mode = puzzle.mode;

  const nodePoints =
    validation.correctNodes * s.correctNodePoints;

  let edgePoints = 0;
  if (mode === "connect" || mode === "hybrid") {
    edgePoints = validation.correctEdges * s.correctEdgePoints;
  }

  const wrongNodes = Math.max(
    0,
    validation.totalNodes - validation.correctNodes
  );
  const wrongEdges =
    mode === "arrange"
      ? 0
      : Math.max(0, validation.totalEdges - validation.correctEdges);

  const penalties =
    wrongNodes * s.wrongPositionPenalty +
    wrongEdges * s.wrongEdgePenalty;

  const t = Math.max(0, remainingSeconds);
  const T = Math.max(1, puzzle.timeLimitSeconds);
  const timeBonus = Math.round((t / T) * s.timeBonusMax);

  const raw = nodePoints + edgePoints + timeBonus - penalties;
  const total = Math.max(0, Math.round(raw));

  return {
    nodePoints,
    edgePoints,
    timeBonus,
    penalties,
    total,
  };
}
