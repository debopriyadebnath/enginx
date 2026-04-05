import type { Server } from "socket.io";

export type PresenceUser = {
  userId: string;
  username: string;
};

type OnlineEntry = {
  userId: string;
  username: string;
  socketIds: Set<string>;
};

const onlineByUser = new Map<string, OnlineEntry>();
const socketToUserId = new Map<string, string>();

export type ChallengeGameType = "quiz" | "bug_finder";

export type ChallengeRecord = {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromSocketId: string;
  fromUsername: string;
  createdAt: number;
  /** Default `quiz` for backwards compatibility */
  gameType: ChallengeGameType;
};

const challenges = new Map<string, ChallengeRecord>();
const CHALLENGE_TTL_MS = 120_000;

let challengeSeq = 0;

function newChallengeId(): string {
  challengeSeq += 1;
  return `ch-${Date.now()}-${challengeSeq}-${Math.random().toString(36).slice(2, 9)}`;
}

export function registerPresence(
  socketId: string,
  userId: string,
  username: string
): void {
  socketToUserId.set(socketId, userId);
  let entry = onlineByUser.get(userId);
  if (!entry) {
    entry = { userId, username: username.trim() || "Player", socketIds: new Set() };
    onlineByUser.set(userId, entry);
  }
  entry.username = username.trim() || entry.username;
  entry.socketIds.add(socketId);
}

export function removeSocket(socketId: string): string | undefined {
  const userId = socketToUserId.get(socketId);
  if (!userId) return undefined;
  socketToUserId.delete(socketId);
  const entry = onlineByUser.get(userId);
  if (entry) {
    entry.socketIds.delete(socketId);
    if (entry.socketIds.size === 0) {
      onlineByUser.delete(userId);
    }
  }
  return userId;
}

export function getPresenceList(excludeUserId?: string): PresenceUser[] {
  const out: PresenceUser[] = [];
  for (const e of onlineByUser.values()) {
    if (excludeUserId && e.userId === excludeUserId) continue;
    out.push({ userId: e.userId, username: e.username });
  }
  return out.sort((a, b) => a.username.localeCompare(b.username));
}

export function isUserOnline(userId: string): boolean {
  const e = onlineByUser.get(userId);
  return Boolean(e && e.socketIds.size > 0);
}

export function getSocketIdsForUser(userId: string): string[] {
  const e = onlineByUser.get(userId);
  if (!e) return [];
  return [...e.socketIds];
}

export function createChallenge(
  fromUserId: string,
  toUserId: string,
  fromSocketId: string,
  fromUsername: string,
  gameType: ChallengeGameType = "quiz"
): ChallengeRecord | null {
  if (fromUserId === toUserId) return null;
  if (!isUserOnline(toUserId)) return null;
  const id = newChallengeId();
  const rec: ChallengeRecord = {
    id,
    fromUserId,
    toUserId,
    fromSocketId,
    fromUsername: fromUsername.trim() || "Player",
    createdAt: Date.now(),
    gameType,
  };
  challenges.set(id, rec);
  return rec;
}

export function getUsernameForUser(userId: string): string {
  const e = onlineByUser.get(userId);
  return e?.username ?? "Player";
}

export function getChallenge(id: string): ChallengeRecord | undefined {
  return challenges.get(id);
}

export function deleteChallenge(id: string): void {
  challenges.delete(id);
}

/** Remove challenges where this user is sender or receiver (disconnect / timeout). */
export function clearChallengesForUser(userId: string): ChallengeRecord[] {
  const removed: ChallengeRecord[] = [];
  for (const [id, c] of challenges) {
    if (c.fromUserId === userId || c.toUserId === userId) {
      challenges.delete(id);
      removed.push(c);
    }
  }
  return removed;
}

export function pruneExpiredChallenges(): ChallengeRecord[] {
  const now = Date.now();
  const removed: ChallengeRecord[] = [];
  for (const [id, c] of challenges) {
    if (now - c.createdAt > CHALLENGE_TTL_MS) {
      challenges.delete(id);
      removed.push(c);
    }
  }
  return removed;
}

export function emitToUser(
  io: Server,
  userId: string,
  event: string,
  payload: unknown
): void {
  const ids = getSocketIdsForUser(userId);
  for (const sid of ids) {
    io.sockets.sockets.get(sid)?.emit(event, payload);
  }
}
