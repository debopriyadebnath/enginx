"use client";

import { CodeOutputQuestion } from "./CodeOutputQuestion";
import { DebugQuestion } from "./DebugQuestion";
import { MathQuestion } from "./MathQuestion";
import { McqQuestion } from "./McqQuestion";
import type { PublicQuestion } from "./types";

type Props = {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export function QuestionRenderer({ question, value, onChange, disabled }: Props) {
  switch (question.type) {
    case "mcq":
      return (
        <McqQuestion
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "code_output":
      return (
        <CodeOutputQuestion
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "debug":
      return (
        <DebugQuestion
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "math":
      return (
        <MathQuestion
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      );
    default:
      return (
        <p className="font-mono text-sm text-red-400">Unknown question type</p>
      );
  }
}
