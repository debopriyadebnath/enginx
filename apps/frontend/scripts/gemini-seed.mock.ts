import type {
  QuestionJson,
  QuestionPackFile,
  QuestionPackMeta,
} from "../convex/seed/questionPack";

export type GeminiDepartment = QuestionJson["category"];
export type GeminiDifficulty = QuestionJson["difficulty"];

export type GeminiSeedRequest = {
  department: GeminiDepartment;
  difficulty: GeminiDifficulty;
  count?: number;
  extraInstructions?: string;
};

export type GeminiSeedJob = {
  department: GeminiDepartment;
  difficulty: GeminiDifficulty;
  sourceFile: string;
  targetQuestionCount: number;
  topicHints: string[];
  prompt: string;
};

type DepartmentSeedConfig = {
  department: GeminiDepartment;
  displayName: string;
  sourceFile: string;
  topicHints: Record<GeminiDifficulty, readonly string[]>;
  defaultCount: Record<GeminiDifficulty, number>;
};

export const GEMINI_DEPARTMENT_SOURCES = {
  aiml: {
    department: "aiml",
    displayName: "AI / ML",
    sourceFile: "packages/aiml.json",
    topicHints: {
      easy: ["basics", "evaluation metrics", "intro concepts"],
      medium: ["optimization", "model selection", "supervised learning"],
      hard: ["regularization", "deep learning", "advanced evaluation"],
    },
    defaultCount: {
      easy: 8,
      medium: 8,
      hard: 6,
    },
  },
  cs_fundamentals: {
    department: "cs_fundamentals",
    displayName: "Computer Science Fundamentals",
    sourceFile: "packages/cs_fundamental.json",
    topicHints: {
      easy: ["data structures", "algorithms", "operating systems"],
      medium: ["concurrency", "memory", "networking"],
      hard: ["paging", "synchronization", "performance tradeoffs"],
    },
    defaultCount: {
      easy: 8,
      medium: 8,
      hard: 6,
    },
  },
  programming: {
    department: "programming",
    displayName: "Programming",
    sourceFile: "packages/programming.json",
    topicHints: {
      easy: ["syntax", "types", "basic control flow"],
      medium: ["functions", "data handling", "OOP"],
      hard: ["generators", "recursion", "runtime behavior"],
    },
    defaultCount: {
      easy: 8,
      medium: 8,
      hard: 6,
    },
  },
  math: {
    department: "math",
    displayName: "Mathematics",
    sourceFile: "packages/maths.json",
    topicHints: {
      easy: ["arithmetic", "algebra", "geometry"],
      medium: ["probability", "number theory", "trigonometry"],
      hard: ["calculus", "linear algebra", "combinatorics"],
    },
    defaultCount: {
      easy: 8,
      medium: 8,
      hard: 6,
    },
  },
} satisfies Record<GeminiDepartment, DepartmentSeedConfig>;

export const GEMINI_MODEL_NAME = "gemini-2.0-flash";

export function buildGeminiSeedPrompt(request: GeminiSeedRequest): string {
  const config = GEMINI_DEPARTMENT_SOURCES[request.department];
  const questionCount = request.count ?? config.defaultCount[request.difficulty];
  const topics = config.topicHints[request.difficulty].join(", ");

  return [
    `You are generating a JSON question pack for ${config.displayName}.`,
    `Source JSON file: ${config.sourceFile}`,
    `Target department: ${config.department}`,
    `Target difficulty: ${request.difficulty}`,
    `Target question count: ${questionCount}`,
    `Topic focus: ${topics}`,
    `Return valid JSON matching the QuestionPackFile shape exactly.`,
    `Use the following rules:`,
    `- meta.version should be a semantic version string.`,
    `- meta.lastUpdated should be an ISO-8601 timestamp.`,
    `- Each question must use source="gemini" and isFallback=false.`,
    `- category must be "${config.department}" for every question.`,
    `- difficulty must be "${request.difficulty}" for every question.`,
    `- Keep the answer consistent with the options array when options are present.`,
    `- Write explanations that teach the concept briefly but clearly.`,
    request.extraInstructions ? `Additional instructions: ${request.extraInstructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildGeminiSeedJobs(
  requests: GeminiSeedRequest[]
): GeminiSeedJob[] {
  return requests.map((request) => {
    const config = GEMINI_DEPARTMENT_SOURCES[request.department];
    const count = request.count ?? config.defaultCount[request.difficulty];
    return {
      department: request.department,
      difficulty: request.difficulty,
      sourceFile: config.sourceFile,
      targetQuestionCount: count,
      topicHints: [...config.topicHints[request.difficulty]],
      prompt: buildGeminiSeedPrompt({ ...request, count }),
    };
  });
}

export function createMockGeminiPack(
  meta: QuestionPackMeta,
  questions: QuestionJson[]
): QuestionPackFile {
  return {
    meta,
    questions,
  };
}

export function getGeminiSourceFile(department: GeminiDepartment): string {
  return GEMINI_DEPARTMENT_SOURCES[department].sourceFile;
}

export function getGeminiDepartments(): GeminiDepartment[] {
  return Object.keys(GEMINI_DEPARTMENT_SOURCES) as GeminiDepartment[];
}

export function getGeminiDifficulties(): GeminiDifficulty[] {
  return ["easy", "medium", "hard"];
}
