import type {
  ValidationResult,
  WorkflowEdgeJson,
  WorkflowMode,
  WorkflowNodeJson,
  WorkflowPuzzle,
} from "./types";

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function edgeKey(source: string, target: string): string {
  return `${source}\0${target}`;
}

function parseEdgeSet(edges: WorkflowEdgeJson[]): Set<string> {
  const s = new Set<string>();
  for (const e of edges) {
    s.add(edgeKey(e.source, e.target));
  }
  return s;
}

/**
 * Compares current node positions to `correctNodes` within tolerance.
 */
export function validateNodePositions(
  current: WorkflowNodeJson[],
  correct: WorkflowNodeJson[],
  tolerancePx: number
): { correctCount: number; misplacedIds: string[] } {
  const byId = new Map(current.map((n) => [n.id, n]));
  const misplaced: string[] = [];
  let correctCount = 0;
  for (const c of correct) {
    const u = byId.get(c.id);
    if (!u) {
      misplaced.push(c.id);
      continue;
    }
    if (dist(u.position, c.position) <= tolerancePx) {
      correctCount++;
    } else {
      misplaced.push(c.id);
    }
  }
  return { correctCount, misplacedIds: misplaced };
}

/**
 * Validates that nodes appear in increasing order along layoutAxis (pipeline constraint).
 */
export function validateOrder(
  current: WorkflowNodeJson[],
  correct: WorkflowNodeJson[],
  layoutAxis: "x" | "y"
): string[] {
  const withOrder = correct
    .filter((n) => typeof n.orderIndex === "number")
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  if (withOrder.length < 2) return [];

  const pos = new Map(current.map((n) => [n.id, n.position]));
  const violations: string[] = [];
  for (let i = 0; i < withOrder.length - 1; i++) {
    const a = withOrder[i];
    const b = withOrder[i + 1];
    if (!a || !b) continue;
    const pa = pos.get(a.id);
    const pb = pos.get(b.id);
    if (!pa || !pb) continue;
    const va = layoutAxis === "x" ? pa.x : pa.y;
    const vb = layoutAxis === "x" ? pb.x : pb.y;
    if (va >= vb - 0.5) {
      violations.push(`${a.label} should come before ${b.label} on the ${layoutAxis}-axis`);
    }
  }
  return violations;
}

export function validateEdges(
  current: WorkflowEdgeJson[],
  expected: WorkflowEdgeJson[]
): {
  correctCount: number;
  missing: Array<{ source: string; target: string }>;
  extra: Array<{ source: string; target: string }>;
} {
  const cur = parseEdgeSet(current);
  const exp = parseEdgeSet(expected);
  const missing: Array<{ source: string; target: string }> = [];
  const extra: Array<{ source: string; target: string }> = [];

  for (const k of exp) {
    if (!cur.has(k)) {
      const [source, target] = k.split("\0");
      missing.push({ source, target });
    }
  }
  for (const k of cur) {
    if (!exp.has(k)) {
      const [source, target] = k.split("\0");
      extra.push({ source, target });
    }
  }

  const correctCount = expected.filter((e) =>
    cur.has(edgeKey(e.source, e.target))
  ).length;

  return {
    correctCount,
    missing,
    extra,
  };
}

export function validatePuzzle(
  mode: WorkflowMode,
  puzzle: WorkflowPuzzle,
  currentNodes: WorkflowNodeJson[],
  currentEdges: WorkflowEdgeJson[]
): ValidationResult {
  const tol = puzzle.scoring.positionTolerancePx;
  const { correctCount: nodeMatchCount, misplacedIds } = validateNodePositions(
    currentNodes,
    puzzle.correctNodes,
    tol
  );
  const orderViolations = validateOrder(
    currentNodes,
    puzzle.correctNodes,
    puzzle.layoutAxis
  );

  let correctEdges = 0;
  let missingEdges: ValidationResult["missingEdges"] = [];
  let extraEdges: ValidationResult["extraEdges"] = [];

  if (mode === "connect" || mode === "hybrid") {
    const ev = validateEdges(currentEdges, puzzle.correctEdges);
    correctEdges = ev.correctCount;
    missingEdges = ev.missing;
    extraEdges = ev.extra;
  } else {
    correctEdges = puzzle.correctEdges.length;
    missingEdges = [];
    extraEdges = [];
  }

  const totalNodes = puzzle.correctNodes.length;
  const totalEdges = puzzle.correctEdges.length;

  const nodesOk =
    nodeMatchCount === totalNodes && orderViolations.length === 0;
  const edgesOk =
    mode === "arrange" ? true : missingEdges.length === 0 && extraEdges.length === 0;

  return {
    ok: nodesOk && edgesOk,
    correctNodes: nodeMatchCount,
    totalNodes,
    correctEdges:
      mode === "arrange" ? totalEdges : correctEdges,
    totalEdges,
    misplacedNodeIds: misplacedIds,
    missingEdges,
    extraEdges,
    orderViolations,
  };
}
