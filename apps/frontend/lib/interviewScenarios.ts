/** HR-style voice scenarios — passed as overrides / context to the agent session. */

export type InterviewScenario = {
  id: string;
  label: string;
  description: string;
  /** Opening line the agent should use (override when supported). */
  firstMessage: string;
};

export const HR_SCENARIOS: InterviewScenario[] = [
  {
    id: "behavioral",
    label: "Behavioral HR",
    description: "STAR-style questions about past teamwork, conflict, and ownership.",
    firstMessage:
      "Hello, I'm your interviewer today. We'll keep this conversational. Start by telling me about a time you had to work with a difficult teammate — what happened and how did you handle it?",
  },
  {
    id: "general",
    label: "General screening",
    description: "Your background, motivation, and fit for the role.",
    firstMessage:
      "Hi — thanks for joining. I have about fifteen minutes. Walk me through your background and what drew you to this role.",
  },
  {
    id: "communication",
    label: "Communication skills",
    description: "Clarity, structure, and adapting explanations to the audience.",
    firstMessage:
      "I'm focusing on how clearly you communicate. Pick any concept you know well — technical or not — and explain it in about ninety seconds as if I'm not an expert in that area.",
  },
  {
    id: "situational",
    label: "Situational HR",
    description: "Hypothetical workplace scenarios and judgment.",
    firstMessage:
      "Imagine you discover a small mistake in a deliverable that already went to a client. No one else has noticed. What would you do?",
  },
];
