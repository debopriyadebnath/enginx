"use client";

import type { PublicQuestion } from "./types";

type Props = {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export function CodeOutputQuestion({ question, value, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      <label className="block font-mono text-xs font-medium text-cream/80">
        Your answer
      </label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Expected output"
        className="w-full rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 font-mono text-cream placeholder:text-cream/35 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30"
      />
    </div>
  );
}
