import type { Player, LeaderboardEntry } from "../types/types.js";
import type { CodeChallenge } from "./bugFinderTypes.js";
import {
  checkBlankAnswer,
  pickBugFinderRound,
  pointsForBug,
} from "./bugFinderCodes.js";

const ROUNDS_PER_MATCH = 8;

const WRONG_PENALTY = Math.max(
  0,
  parseInt(process.env.MULTIPLAYER_WRONG_PENALTY ?? "2", 10) || 0
);

type QueuedPlayer = { socketId: string; convexUserId: string };

class BugFinderGameManager {
  private rooms: Map<string, BugFinderRoom> = new Map();
  private waitingQueue: QueuedPlayer[] = [];

  joinGame(playerSocketId: string, convexUserId: string): string {
    if (this.waitingQueue.some((q) => q.socketId === playerSocketId)) {
      return "";
    }
    if (this.waitingQueue.length >= 1) {
      const other = this.waitingQueue.shift()!;
      if (other.socketId === playerSocketId) {
        this.waitingQueue.unshift(other);
        return "";
      }
      return this.createRoomFromPair(
        [other.socketId, playerSocketId],
        [`Player ${this.rooms.size + 1}`, `Player ${this.rooms.size + 2}`],
        [other.convexUserId, convexUserId]
      );
    }
    this.waitingQueue.push({ socketId: playerSocketId, convexUserId });
    return "";
  }

  createRoomFromPair(
    socketIds: [string, string],
    usernames: [string, string],
    convexUserIds?: [string, string]
  ): string {
    const roomId = `bf-room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const challenges = pickBugFinderRound(ROUNDS_PER_MATCH, roomId);
    const uid0 = convexUserIds?.[0] ?? socketIds[0];
    const uid1 = convexUserIds?.[1] ?? socketIds[1];

    const players: Map<string, Player> = new Map([
      [
        socketIds[0],
        {
          socketId: socketIds[0],
          userId: uid0,
          username: usernames[0].trim() || "Player",
          score: 0,
          currentAnswer: null,
          isReady: true,
        },
      ],
      [
        socketIds[1],
        {
          socketId: socketIds[1],
          userId: uid1,
          username: usernames[1].trim() || "Player",
          score: 0,
          currentAnswer: null,
          isReady: true,
        },
      ],
    ]);

    const room: BugFinderRoom = {
      id: roomId,
      players,
      challenges,
      currentQuestionIndex: 0,
      gameState: "playing",
      startTime: Date.now(),
      questionStartTime: Date.now(),
    };
    this.rooms.set(roomId, room);
    return roomId;
  }

  getRoom(roomId: string): BugFinderRoom | undefined {
    return this.rooms.get(roomId);
  }

  getCurrentChallenge(roomId: string): CodeChallenge | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.challenges[room.currentQuestionIndex] ?? null;
  }

  getRoundCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room?.challenges.length ?? 0;
  }

  recordAnswer(roomId: string, playerId: string, answer: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.currentAnswer = answer;
  }

  calculateRoundScores(roomId: string): Map<string, number> {
    const room = this.rooms.get(roomId);
    if (!room) return new Map();
    const q = room.challenges[room.currentQuestionIndex];
    if (!q) return new Map();

    const scores = new Map<string, number>();
    room.players.forEach((player) => {
      const raw = player.currentAnswer ?? "";
      const correct = checkBlankAnswer(q, raw);
      if (correct) {
        const pts = pointsForBug(q, true);
        player.score += pts;
        scores.set(player.socketId, pts);
      } else if (WRONG_PENALTY > 0) {
        const before = player.score;
        player.score = Math.max(0, player.score - WRONG_PENALTY);
        const lost = before - player.score;
        scores.set(player.socketId, -lost);
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
    room.players.forEach((p) => {
      p.currentAnswer = null;
    });
    room.questionStartTime = Date.now();
    if (room.currentQuestionIndex >= room.challenges.length) {
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
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  endGame(roomId: string): void {
    this.rooms.delete(roomId);
  }

  removeFromQueue(playerSocketId: string): void {
    this.waitingQueue = this.waitingQueue.filter(
      (q) => q.socketId !== playerSocketId
    );
  }

  getAllRooms(): BugFinderRoom[] {
    return Array.from(this.rooms.values());
  }

  updatePlayerName(roomId: string, playerId: string, username: string): void {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(playerId);
    if (player) player.username = username;
  }
}

interface BugFinderRoom {
  id: string;
  players: Map<string, Player>;
  challenges: CodeChallenge[];
  currentQuestionIndex: number;
  gameState: string;
  startTime: number;
  questionStartTime: number;
}

export const bugFinderGameManager = new BugFinderGameManager();
