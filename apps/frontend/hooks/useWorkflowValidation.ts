"use client";

import { useMemo } from "react";
import type { WorkflowEdgeJson, WorkflowNodeJson, WorkflowPuzzle } from "@/lib/workflow/types";
import { validatePuzzle } from "@/lib/workflow/validate";

/**
 * Reusable validation for future graph games (circuits, ML pipelines, OS flows).
 */
export function useWorkflowValidation(
  puzzle: WorkflowPuzzle,
  nodes: WorkflowNodeJson[],
  edges: WorkflowEdgeJson[]
) {
  return useMemo(
    () => validatePuzzle(puzzle.mode, puzzle, nodes, edges),
    [puzzle, nodes, edges]
  );
}
