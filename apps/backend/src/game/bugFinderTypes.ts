/** Mirrors `apps/frontend/data/codes.json` items. */
export type CodeChallenge = {
  id: string;
  type: string;
  difficulty: string;
  concept: string;
  title: string;
  description: string;
  codeTemplate: string;
  blanks: { id: string; correctAnswer: string }[];
  options: string[];
  hint?: string;
  explanation: string;
};
