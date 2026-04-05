import type { Edge, Node } from "@xyflow/react";
import type { WorkflowEdgeJson, WorkflowNodeJson } from "./types";

export function nodesToFlow(
  nodes: WorkflowNodeJson[],
  layoutAxis: "x" | "y"
): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    position: n.position,
    data: { label: n.label, axis: layoutAxis },
    type: "workflow",
  }));
}

export function edgesToFlow(edges: WorkflowEdgeJson[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: "rgba(111, 255, 0, 0.55)", strokeWidth: 2 },
  }));
}
