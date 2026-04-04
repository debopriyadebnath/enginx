import type { GameRoom, Player, LeaderboardEntry } from "../types/types.js";
import { getQuestion, getTotalQuestions } from "./questionBank.js";

const QUESTION_TIMEOUT = 15000; // 15 seconds to collect answers
const ANSWER_DISPLAY_TIMEOUT = 3000; // 3 seconds to show correct answer
const WAITING_TIMEOUT = 30000; // 30 seconds to wait for second player

class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private waitingQueue: string[] = [];
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Add player to waiting queue and auto-match if 2 players waiting
   */
  joinGame(playerId: string): string {
    // Check if player can join waiting room
    if (this.waitingQueue.length === 1) {
      const otherPlayerId = this.waitingQueue.pop()!;
      const roomId = this.createRoom([playerId, otherPlayerId]);
      return roomId;
    }

    this.waitingQueue.push(playerId);
    return ""; // Empty string means waiting for another player
  }

  /**
   * Create a new game room with two players
   */
  private createRoom(playerIds: [string, string]): string {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const players: Map<string, Player> = new Map([
      [
        playerIds[0],
        {
          socketId: playerIds[0],
          userId: playerIds[0],
          username: `Player ${this.rooms.size + 1}`,
          score: 0,
          currentAnswer: null,
          isReady: true,
        },
      ],
      [
        playerIds[1],
        {
          socketId: playerIds[1],
          userId: playerIds[1],
          username: `Player ${this.rooms.size + 2}`,
          score: 0,
          currentAnswer: null,
          isReady: true,
        },
      ],
    ]);

    const room: GameRoom = {
      id: roomId,
      players,
      currentQuestionIndex: 0,
      gameState: "playing",
      startTime: Date.now(),
      questionStartTime: Date.now(),
    };

    this.rooms.set(roomId, room);
    return roomId;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get current question for a room
   */
  getCurrentQuestion(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return getQuestion(room.currentQuestionIndex);
  }

  /**
   * Record player answer
   */
  recordAnswer(roomId: string, playerId: string, answer: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.currentAnswer = answer;
    }
  }

  /**
   * Calculate scores based on answers
   */
  calculateRoundScores(roomId: string): Map<string, number> {
    const room = this.rooms.get(roomId);
    if (!room) return new Map();

    const question = getQuestion(room.currentQuestionIndex);
    if (!question) return new Map();

    const scores = new Map<string, number>();

    room.players.forEach((player) => {
      if (player.currentAnswer === question.correctAnswer) {
        player.score += 10;
        scores.set(player.socketId, 10);
      } else {
        scores.set(player.socketId, 0);
      }
    });

    return scores;
  }

  /**
   * Move to next question
   */
  nextQuestion(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.currentQuestionIndex++;

    // Reset answers for next round
    room.players.forEach((player) => {
      player.currentAnswer = null;
    });

    room.questionStartTime = Date.now();

    // Check if game is over
    if (room.currentQuestionIndex >= getTotalQuestions()) {
      room.gameState = "ended";
      return false;
    }

    room.gameState = "question";
    return true;
  }

  /**
   * Get leaderboard for a room
   */
  getLeaderboard(roomId: string): LeaderboardEntry[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.players.values())
      .map((player) => ({
        userId: player.userId,
        username: player.username,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * End game and clean up room
   */
  endGame(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
    }

    this.rooms.delete(roomId);
  }

  /**
   * Remove player from waiting queue
   */
  removeFromQueue(playerId: string): void {
    this.waitingQueue = this.waitingQueue.filter((id) => id !== playerId);
  }

  /**
   * Check if player is in waiting queue
   */
  isInQueue(playerId: string): boolean {
    return this.waitingQueue.includes(playerId);
  }

  /**
   * Get all active rooms (for debugging)
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Update player display name
   */
  updatePlayerName(roomId: string, playerId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.username = username;
    }
  }
}

// Export singleton instance
export const gameManager = new GameManager();
