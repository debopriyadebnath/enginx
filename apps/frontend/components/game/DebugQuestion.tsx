"use client";

import type { PublicQuestion } from "./types";

type Props = {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export function DebugQuestion({ question, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div className="liquid-glass rounded-[14px] p-4 ring-1 ring-red-500/20">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-red-200">
          Bug hunt
        </p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-cream">
          {question.question}
        </pre>
      </div>
      <p className="font-mono text-xs text-cream/70">
        Describe the issue (e.g. &quot;off-by-one&quot;, &quot;null pointer&quot;).
      </p>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 font-mono text-sm text-cream placeholder:text-cream/35 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30"
        placeholder="Short answer…"
      />
    </div>
  );
}
