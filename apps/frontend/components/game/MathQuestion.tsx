"use client";

import type { PublicQuestion } from "./types";

type Props = {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export function MathQuestion({ question, value, onChange, disabled }: Props) {
  const opts = question.options;
  if (opts && opts.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {opts.map((opt, i) => {
          const id = String(i);
          const selected = value === id;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`rounded-[14px] border px-4 py-4 font-anton text-xl transition ${
                selected
                  ? "border-neon bg-neon text-[#010828] shadow-[0_0_24px_rgba(111,255,0,0.25)]"
                  : "border-white/20 bg-white/[0.06] text-cream hover:border-white/35 hover:bg-white/10"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="font-anton text-2xl leading-snug text-cream">{question.question}</p>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 font-mono text-lg text-cream placeholder:text-cream/35 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30"
        placeholder="Answer"
      />
    </div>
  );
}
