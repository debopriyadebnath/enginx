"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export type WorkflowNodeData = {
  label: string;
  axis: "x" | "y";
};

function WorkflowNodeInner({ data }: NodeProps) {
  const d = data as WorkflowNodeData;
  const horizontal = d.axis === "x";

  return (
    <div
      className="min-w-[112px] rounded-xl border border-neon/45 bg-[#0a1228] px-3 py-2.5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-transform hover:scale-[1.02]"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      {horizontal ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="!h-2.5 !w-2.5 !border-neon/60 !bg-[#010828]"
          />
          <p className="font-mono text-[11px] font-medium leading-snug text-cream">
            {d.label}
          </p>
          <Handle
            type="source"
            position={Position.Right}
            className="!h-2.5 !w-2.5 !border-neon/60 !bg-[#010828]"
          />
        </>
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="!h-2.5 !w-2.5 !border-neon/60 !bg-[#010828]"
          />
          <p className="font-mono text-[11px] font-medium leading-snug text-cream">
            {d.label}
          </p>
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-2.5 !w-2.5 !border-neon/60 !bg-[#010828]"
          />
        </>
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeInner);
