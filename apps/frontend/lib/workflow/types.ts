export type WorkflowMode = "arrange" | "connect" | "hybrid";

export type WorkflowDepartment =
  | "cs"
  | "aiml"
  | "electronics"
  | "maths"
  | "bonus";

export type WorkflowNodeJson = {
  id: string;
  label: string;
  position: { x: number; y: number };
  /** Used for order validation along layoutAxis */
  orderIndex?: number;
};

export type WorkflowEdgeJson = {
  id: string;
  source: string;
  target: string;
};

export type WorkflowScoring = {
  correctNodePoints: number;
  correctEdgePoints: number;
  timeBonusMax: number;
  positionTolerancePx: number;
  wrongEdgePenalty: number;
  wrongPositionPenalty: number;
};

export type WorkflowPuzzle = {
  id: string;
  title: string;
  department: WorkflowDepartment;
  mode: WorkflowMode;
  description: string;
  timeLimitSeconds: number;
  scoring: WorkflowScoring;
  /** Primary axis for order checks (pipeline left→right or top→bottom) */
  layoutAxis: "x" | "y";
  shuffledNodes: WorkflowNodeJson[];
  correctNodes: WorkflowNodeJson[];
  shuffledEdges: WorkflowEdgeJson[];
  correctEdges: WorkflowEdgeJson[];
};

export type WorkflowPack = {
  version: number;
  puzzles: WorkflowPuzzle[];
};

export type ValidationResult = {
  ok: boolean;
  correctNodes: number;
  totalNodes: number;
  correctEdges: number;
  totalEdges: number;
  misplacedNodeIds: string[];
  missingEdges: Array<{ source: string; target: string }>;
  extraEdges: Array<{ source: string; target: string }>;
  orderViolations: string[];
};

export type ScoreBreakdown = {
  nodePoints: number;
  edgePoints: number;
  timeBonus: number;
  penalties: number;
  total: number;
};
