"use client";

import dynamic from "next/dynamic";

const WorkflowGame = dynamic(
  () =>
    import("@/components/workflow/WorkflowGame").then((m) => m.WorkflowGame),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828] font-mono text-sm text-cream/60">
        Loading workflow lab…
      </div>
    ),
  }
);

export default function WorkflowPlayPage() {
  return <WorkflowGame />;
}
