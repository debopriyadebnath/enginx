import type { Question } from "../types/types.js";

export const questionBank: Question[] = [
  {
    id: "q1",
    text: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctAnswer: "Paris",
    timeLimit: 10,
  },
  {
    id: "q2",
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: "Mars",
    timeLimit: 10,
  },
  {
    id: "q3",
    text: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    timeLimit: 8,
  },
  {
    id: "q4",
    text: "Who wrote Romeo and Juliet?",
    options: [
      "Jane Austen",
      "William Shakespeare",
      "Charles Dickens",
      "Mark Twain",
    ],
    correctAnswer: "William Shakespeare",
    timeLimit: 12,
  },
  {
    id: "q5",
    text: "What is the largest ocean on Earth?",
    options: [
      "Atlantic Ocean",
      "Indian Ocean",
      "Arctic Ocean",
      "Pacific Ocean",
    ],
    correctAnswer: "Pacific Ocean",
    timeLimit: 10,
  },
  {
    id: "q6",
    text: "In what year did the Titanic sink?",
    options: ["1912", "1905", "1920", "1898"],
    correctAnswer: "1912",
    timeLimit: 10,
  },
  {
    id: "q7",
    text: "What is the chemical symbol for Gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: "Au",
    timeLimit: 10,
  },
  {
    id: "q8",
    text: "Which technology did Tim Berners-Lee invent?",
    options: ["The Internet", "The World Wide Web", "JavaScript", "TCP"],
    correctAnswer: "The World Wide Web",
    timeLimit: 12,
  },
  {
    id: "q9",
    text: "What is the smallest prime number?",
    options: ["0", "1", "2", "3"],
    correctAnswer: "2",
    timeLimit: 8,
  },
  {
    id: "q10",
    text: "Which country is home to Kangaroos?",
    options: ["New Zealand", "Australia", "South Africa", "Brazil"],
    correctAnswer: "Australia",
    timeLimit: 10,
  },
];

export const getQuestion = (index: number): Question | undefined => {
  return questionBank[index];
};

export const getTotalQuestions = (): number => {
  return questionBank.length;
};
