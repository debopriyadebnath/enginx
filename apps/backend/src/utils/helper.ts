/**
 * Helper Utilities
 */

/**
 * Generate unique room ID
 */
export const generateRoomId = (): string => {
  return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate answer is in options
 */
export const isValidAnswer = (answer: string, options: string[]): boolean => {
  return options.includes(answer);
};

/**
 * Format countdown timer
 */
export const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  return `${secs}s`;
};

/**
 * Parse duration from milliseconds
 */
export const parseDuration = (
  ms: number
): {
  minutes: number;
  seconds: number;
  milliseconds: number;
} => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    minutes,
    seconds,
    milliseconds: ms % 1000,
  };
};

/**
 * Create leaderboard summary
 */
export const createLeaderboardSummary = (
  leaderboard: Array<{ username: string; score: number }>
): string => {
  return leaderboard
    .map(
      (entry, idx) => `${idx + 1}. ${entry.username} - ${entry.score} points`
    )
    .join("\n");
};

/**
 * Check if question index is valid
 */
export const isValidQuestionIndex = (
  index: number,
  totalQuestions: number
): boolean => {
  return index >= 0 && index < totalQuestions;
};

/**
 * Sanitize username
 */
export const sanitizeUsername = (username: string): string => {
  return username
    .trim()
    .slice(0, 32) // Max 32 chars
    .replace(/[^a-zA-Z0-9-_ ]/g, "") // Only alphanumeric, dash, underscore, space
    || "Anonymous"; // Fallback if empty
};

/**
 * Deep clone object for immutability
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj)) as T;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Check if game time is valid
 */
export const isGameActive = (startTime: number, maxDuration: number): boolean => {
  return Date.now() - startTime < maxDuration;
};

/**
 * Random element from array
 */
export const randomElement = <T>(array: T[]): T | undefined => {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Shuffle array
 */
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get timestamp for logging
 */
export const getTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Log with timestamp
 */
export const log = (message: string, data?: any) => {
  const timestamp = getTimestamp();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};
