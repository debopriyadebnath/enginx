"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { rawSelectionToAnswerText } from "@/lib/quizFromPack";
import type {
  AnswerTimeUpPayload,
  GameEndedPayload,
  GameStartedPayload,
  JoinGameAck,
  LeaderboardEntry,
  MultiplayerPlayer,
  QuestionEventPayload,
} from "@/lib/multiplayerTypes";

export type MultiplayerPhase =
  | "idle"
  | "waiting"
  | "playing"
  | "ended"
  | "aborted";

export type UseMultiplayerQuiz = {
  phase: MultiplayerPhase;
  roomId: string | null;
  players: MultiplayerPlayer[];
  leaderboard: LeaderboardEntry[];
  currentRound: QuestionEventPayload | null;
  /** Local countdown target (ms) for active question */
  deadlineAt: number | null;
  answer: string;
  setAnswer: (v: string) => void;
  hasSubmitted: boolean;
  lastReveal: AnswerTimeUpPayload | null;
  mySocketId: string | null;
  findMatch: (username: string) => void;
  /** Ignores duplicate taps while already in queue */
  findMatchSafe: (username: string) => void;
  submitAnswer: () => void;
  resetToLobby: () => void;
  errorMessage: string | null;
};

export function useMultiplayerQuiz(
  socket: Socket | null,
  connected: boolean
): UseMultiplayerQuiz {
  const [phase, setPhase] = useState<MultiplayerPhase>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRound, setCurrentRound] = useState<QuestionEventPayload | null>(
    null
  );
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastReveal, setLastReveal] = useState<AnswerTimeUpPayload | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mySocketIdRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  /** Avoid duplicate emits when the timer hits 0 (Strict Mode / rapid ticks). */
  const submitSentForRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      mySocketIdRef.current = socket.id ?? null;
    };
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);

  /** Queue is keyed by socket id — if we disconnect while waiting, we are no longer in queue. */
  useEffect(() => {
    if (!socket) return;
    const onDisconnect = (reason: string) => {
      if (phaseRef.current === "waiting") {
        setPhase("idle");
        setErrorMessage(
          `Disconnected (${reason}). Tap Find match again after reconnect.`
        );
      }
    };
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const resetToLobby = useCallback(() => {
    submitSentForRoundRef.current = null;
    setPhase("idle");
    setRoomId(null);
    setPlayers([]);
    setLeaderboard([]);
    setCurrentRound(null);
    setDeadlineAt(null);
    setAnswer("");
    setHasSubmitted(false);
    setLastReveal(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => {
      setPhase("waiting");
      setErrorMessage(null);
    };

    const onGameStarted = (data: GameStartedPayload) => {
      setRoomId(data.roomId);
      setPlayers(data.players);
      setPhase("playing");
      setErrorMessage(null);
    };

    const onQuestion = (payload: QuestionEventPayload) => {
      submitSentForRoundRef.current = null;
      setCurrentRound(payload);
      setAnswer("");
      setHasSubmitted(false);
      setLastReveal(null);
      setDeadlineAt(Date.now() + payload.question.timeLimit * 1000);
      setPhase("playing");
    };

    const onAnswerTimeUp = (payload: AnswerTimeUpPayload) => {
      setLastReveal(payload);
    };

    const onLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
    };

    const onGameEnded = (data: GameEndedPayload) => {
      setLeaderboard(data.finalLeaderboard);
      setPhase("ended");
      setCurrentRound(null);
      setDeadlineAt(null);
    };

    const onPlayerDisconnected = () => {
      setPhase("aborted");
      setRoomId(null);
      setCurrentRound(null);
      setDeadlineAt(null);
    };

    const onError = (data: { message?: string }) => {
      setErrorMessage(data.message ?? "Socket error");
    };

    socket.on("waiting-for-opponent", onWaiting);
    socket.on("game-started", onGameStarted);
    socket.on("question", onQuestion);
    socket.on("answer-time-up", onAnswerTimeUp);
    socket.on("leaderboard-update", onLeaderboard);
    socket.on("game-ended", onGameEnded);
    socket.on("player-disconnected", onPlayerDisconnected);
    socket.on("error", onError);

    return () => {
      socket.off("waiting-for-opponent", onWaiting);
      socket.off("game-started", onGameStarted);
      socket.off("question", onQuestion);
      socket.off("answer-time-up", onAnswerTimeUp);
      socket.off("leaderboard-update", onLeaderboard);
      socket.off("game-ended", onGameEnded);
      socket.off("player-disconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [socket]);

  const findMatch = useCallback(
    (username: string) => {
      if (!socket?.connected) {
        setErrorMessage("Not connected to game server");
        return;
      }
      setErrorMessage(null);
      setPhase("waiting");
      socket.emit(
        "join-game",
        { username: username.trim() || undefined },
        (ack: JoinGameAck) => {
          if (ack.status === "waiting") {
            setPhase("waiting");
          } else if (ack.status === "game_started" && "roomId" in ack) {
            setRoomId(ack.roomId);
            setPhase("playing");
          } else if (ack.status === "error") {
            setPhase("idle");
            setErrorMessage(ack.message ?? "Could not join queue");
          }
        }
      );
    },
    [socket]
  );

  const findMatchSafe = useCallback(
    (username: string) => {
      if (phase === "waiting") return;
      findMatch(username);
    },
    [phase, findMatch]
  );

  const submitAnswer = useCallback(() => {
    if (!socket || !roomId || !currentRound) return;
    const qIdx = currentRound.questionIndex;
    if (hasSubmitted || submitSentForRoundRef.current === qIdx) return;
    submitSentForRoundRef.current = qIdx;
    const text = rawSelectionToAnswerText(
      currentRound.question,
      answer
    );
    socket.emit("submit-answer", { roomId, answer: text });
    setHasSubmitted(true);
  }, [socket, roomId, currentRound, answer, hasSubmitted]);

  const mySocketId = useMemo(
    () => socket?.id ?? mySocketIdRef.current,
    [socket, socket?.id]
  );

  return {
    phase,
    roomId,
    players,
    leaderboard,
    currentRound,
    deadlineAt,
    answer,
    setAnswer,
    hasSubmitted,
    lastReveal,
    mySocketId,
    findMatch,
    findMatchSafe,
    submitAnswer,
    resetToLobby,
    errorMessage: connected ? errorMessage : "Connecting…",
  };
}
