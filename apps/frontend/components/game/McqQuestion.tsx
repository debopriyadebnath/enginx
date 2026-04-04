"use client";

import type { PublicQuestion } from "./types";

type Props = {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export function McqQuestion({ question, value, onChange, disabled }: Props) {
  const opts = question.options ?? [];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {opts.map((opt, i) => {
        const id = String(i);
        const selected = value === id;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`rounded-[16px] border px-4 py-4 text-left font-mono text-sm transition ${
              selected
                ? "border-neon bg-neon/20 text-cream shadow-[0_0_20px_rgba(111,255,0,0.15)]"
                : "border-white/20 bg-white/[0.06] text-cream hover:border-white/35 hover:bg-white/10"
            }`}
          >
            <span className="font-anton mr-2 text-neon">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
