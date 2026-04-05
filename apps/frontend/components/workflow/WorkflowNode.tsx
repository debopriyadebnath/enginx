"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export type WorkflowNodeData = {
  label: string;
  axis: "x" | "y";
};

function WorkflowNodeInner({ data, selected }: NodeProps) {
  const d = data as WorkflowNodeData;
  const vertical = d.axis === "y";

  const handleCls =
    "!h-4 !w-4 !rounded-full !border-2 !border-neon/70 !bg-[#010828] hover:!border-neon hover:!bg-neon/20 transition-all duration-100 cursor-crosshair";

  return (
    <div
      className="relative min-w-[120px] rounded-xl border bg-[#0a1228] px-4 py-3 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-150"
      style={{
        borderColor: selected ? "#6fff00" : "rgba(111,255,0,0.38)",
        boxShadow: selected
          ? "0 0 0 2px rgba(111,255,0,0.22)"
          : undefined,
      }}
    >
      {/* Handles — use className only, NOT style prop, so React Flow can position them */}
      {vertical ? (
        <>
          <Handle type="target" position={Position.Top} className={handleCls} />
          <p className="pointer-events-none font-mono text-[12px] font-semibold leading-snug text-cream">
            {d.label}
          </p>
          <Handle type="source" position={Position.Bottom} className={handleCls} />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left} className={handleCls} />
          <p className="pointer-events-none font-mono text-[12px] font-semibold leading-snug text-cream">
            {d.label}
          </p>
          <Handle type="source" position={Position.Right} className={handleCls} />
        </>
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeInner);
