/**
 * Advanced Scoring Calculations
 * Optional module for more complex scoring logic
 */

import type { Player, Question } from "../types/types.js";

// Bonus multipliers
const SPEED_BONUS_THRESHOLD = 3000; // milliseconds (3 seconds)
const SPEED_BONUS_POINTS = 5;
const STREAK_BONUS_MULTIPLIER = 1.2; // 20% bonus

interface ScoringContext {
  isCorrect: boolean;
  timeToAnswer: number; // milliseconds
  playerStreak: number; // consecutive correct answers
}

/**
 * Calculate points for an answer with bonuses
 */
export const calculatePointsWithBonuses = (context: ScoringContext): number => {
  let points = context.isCorrect ? 10 : 0;

  if (!context.isCorrect) {
    return 0; // No bonus for wrong answers
  }

  // Speed bonus (fast correct answer)
  if (context.timeToAnswer < SPEED_BONUS_THRESHOLD) {
    points += SPEED_BONUS_POINTS;
  }

  // Streak bonus (consecutive correct answers)
  if (context.playerStreak > 2) {
    points = Math.floor(points * STREAK_BONUS_MULTIPLIER);
  }

  return points;
};

/**
 * Get performance tier
 */
export const getPerformanceTier = (
  score: number,
  totalQuestions: number
): "novice" | "intermediate" | "expert" | "master" => {
  const percentage = (score / (totalQuestions * 10)) * 100;

  if (percentage >= 90) return "master";
  if (percentage >= 70) return "expert";
  if (percentage >= 50) return "intermediate";
  return "novice";
};

/**
 * Calculate win probability based on scores
 */
export const calculateWinProbability = (
  player1Score: number,
  player2Score: number,
  questionsRemaining: number
): { player1: number; player2: number } => {
  const maxRemainingPoints = questionsRemaining * 10;
  const player1PossibleMax = player1Score + maxRemainingPoints;
  const player2PossibleMax = player2Score + maxRemainingPoints;

  const player1WinChance = player1PossibleMax / (player1PossibleMax + player2PossibleMax);

  return {
    player1: player1WinChance,
    player2: 1 - player1WinChance,
  };
};

/**
 * Format score for display
 */
export const formatScore = (score: number): string => {
  return `${score} pts`;
};

/**
 * Get score badge/emoji
 */
export const getScoreBadge = (score: number): string => {
  if (score >= 90) return "🏆"; // Gold
  if (score >= 70) return "🥈"; // Silver
  if (score >= 50) return "🥉"; // Bronze
  return "📊"; // Regular
};
