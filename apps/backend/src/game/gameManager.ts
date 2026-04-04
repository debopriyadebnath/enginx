import type { GameRoom, Player, LeaderboardEntry } from "../types/types.js";
import type { QuestionJson } from "./packQuestion.js";
import { pickRoundQuestions } from "./packLoader.js";
import { checkAnswerJson } from "./quizEvaluator.js";

const ROUNDS_PER_MATCH = 10;

class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private waitingQueue: string[] = [];
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Add player to waiting queue and auto-match when a *different* socket joins.
   * Guards: no duplicate queue entries; never match a socket with itself (double "Find match").
   */
  joinGame(playerId: string): string {
    if (this.waitingQueue.includes(playerId)) {
      return "";
    }

    if (this.waitingQueue.length >= 1) {
      const otherPlayerId = this.waitingQueue.shift()!;
      if (otherPlayerId === playerId) {
        this.waitingQueue.unshift(otherPlayerId);
        return "";
      }
      return this.createRoom([playerId, otherPlayerId]);
    }

    this.waitingQueue.push(playerId);
    return "";
  }

  /**
   * Create a new game room with two players and a shared random question run from `packages/*.json`.
   */
  private createRoom(playerIds: [string, string]): string {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const roundQuestions = pickRoundQuestions(ROUNDS_PER_MATCH, roomId);

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
      roundQuestions,
      currentQuestionIndex: 0,
      gameState: "playing",
      startTime: Date.now(),
      questionStartTime: Date.now(),
    };

    this.rooms.set(roomId, room);
    return roomId;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getCurrentQuestion(roomId: string): QuestionJson | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.roundQuestions[room.currentQuestionIndex] ?? null;
  }

  getRoundCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room?.roundQuestions.length ?? 0;
  }

  recordAnswer(roomId: string, playerId: string, answer: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.currentAnswer = answer;
    }
  }

  calculateRoundScores(roomId: string): Map<string, number> {
    const room = this.rooms.get(roomId);
    if (!room) return new Map();

    const question = room.roundQuestions[room.currentQuestionIndex];
    if (!question) return new Map();

    const scores = new Map<string, number>();

    room.players.forEach((player) => {
      const raw = player.currentAnswer ?? "";
      const correct = checkAnswerJson(question, raw);
      if (correct) {
        const pts = question.points;
        player.score += pts;
        scores.set(player.socketId, pts);
      } else {
        scores.set(player.socketId, 0);
      }
    });

    return scores;
  }

  nextQuestion(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.currentQuestionIndex++;

    room.players.forEach((player) => {
      player.currentAnswer = null;
    });

    room.questionStartTime = Date.now();

    if (room.currentQuestionIndex >= room.roundQuestions.length) {
      room.gameState = "ended";
      return false;
    }

    room.gameState = "question";
    return true;
  }

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

  endGame(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
    }

    this.rooms.delete(roomId);
  }

  removeFromQueue(playerId: string): void {
    this.waitingQueue = this.waitingQueue.filter((id) => id !== playerId);
  }

  isInQueue(playerId: string): boolean {
    return this.waitingQueue.includes(playerId);
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  updatePlayerName(roomId: string, playerId: string, username: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.username = username;
    }
  }
}

export const gameManager = new GameManager();
