import type { Edge, Node } from "@xyflow/react";
import type { WorkflowEdgeJson, WorkflowNodeJson, WorkflowPuzzle } from "@/lib/workflow/types";

export function flowNodesToJson(
  nodes: Node[],
  puzzle: WorkflowPuzzle
): WorkflowNodeJson[] {
  const order = new Map(
    puzzle.correctNodes.map((n) => [n.id, n.orderIndex] as const)
  );
  return nodes.map((n) => ({
    id: n.id,
    label: String((n.data as { label?: string })?.label ?? ""),
    position: n.position,
    orderIndex: order.get(n.id),
  }));
}

export function flowEdgesToJson(edges: Edge[]): WorkflowEdgeJson[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}
