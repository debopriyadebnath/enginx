export type QuestionType = "mcq" | "code_output" | "debug" | "math";

export type PublicQuestion = {
  _id: string;
  type: QuestionType;
  category: string;
  topic?: string;
  difficulty?: string;
  question: string;
  options?: string[];
  timeLimit: number;
  points: number;
  tags: string[];
  answer?: string;
  explanation?: string;
};
