"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { rawSelectionToAnswerText } from "@/lib/quizFromPack";
import type {
  AnswerTimeUpPayload,
  ChallengeReceivedPayload,
  GameEndedPayload,
  GameStartedPayload,
  GetStateAck,
  JoinGameAck,
  LeaderboardEntry,
  MultiplayerPlayer,
  PresenceUser,
  QuestionEventPayload,
} from "@/lib/multiplayerTypes";

export type MultiplayerPhase =
  | "idle"
  | "waiting_challenge"
  | "playing"
  | "ended"
  | "aborted";

export type UseMultiplayerQuizOptions = {
  displayName: string;
  /** Convex `users` id — required for presence + challenges */
  myUserId: string | null;
};

export type UseMultiplayerQuiz = {
  phase: MultiplayerPhase;
  roomId: string | null;
  players: MultiplayerPlayer[];
  leaderboard: LeaderboardEntry[];
  currentRound: QuestionEventPayload | null;
  deadlineAt: number | null;
  answer: string;
  setAnswer: (v: string) => void;
  hasSubmitted: boolean;
  lastReveal: AnswerTimeUpPayload | null;
  mySocketId: string | null;
  presenceUsers: PresenceUser[];
  incomingChallenge: ChallengeReceivedPayload | null;
  sendChallenge: (targetUserId: string) => void;
  respondChallenge: (challengeId: string, accept: boolean) => void;
  /** Legacy queue match (optional) */
  findMatch: (username: string) => void;
  findMatchSafe: (username: string) => void;
  submitAnswer: () => void;
  resetToLobby: () => void;
  errorMessage: string | null;
};

export function useMultiplayerQuiz(
  socket: Socket | null,
  connected: boolean,
  options: UseMultiplayerQuizOptions
): UseMultiplayerQuiz {
  const { displayName, myUserId } = options;

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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] =
    useState<ChallengeReceivedPayload | null>(null);

  const mySocketIdRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
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

  /** Register in lobby so you appear in others’ online lists */
  useEffect(() => {
    if (!socket?.connected || !myUserId) return;
    socket.emit("register_presence", {
      username: displayName.trim() || undefined,
    });
  }, [socket, connected, displayName, myUserId]);

  useEffect(() => {
    if (!socket) return;
    const onDisconnect = (reason: string) => {
      if (phaseRef.current === "waiting_challenge") {
        setPhase("idle");
        setErrorMessage(
          `Disconnected (${reason}). Try again after reconnect.`
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
    setIncomingChallenge(null);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onPresenceUpdate = (data: { users: PresenceUser[] }) => {
      setPresenceUsers(
        myUserId
          ? data.users.filter((u) => u.userId !== myUserId)
          : data.users
      );
    };

    const onChallengeReceived = (data: ChallengeReceivedPayload) => {
      setIncomingChallenge(data);
      setErrorMessage(null);
    };

    const onChallengeDeclined = () => {
      setPhase("idle");
      setErrorMessage("They declined the challenge.");
    };

    const onChallengeCancelled = () => {
      setPhase("idle");
      setIncomingChallenge(null);
      setErrorMessage("Challenge cancelled (other player went offline).");
    };

    const onChallengeExpired = () => {
      setPhase("idle");
      setIncomingChallenge(null);
      setErrorMessage("Challenge expired.");
    };

    const onWaiting = () => {
      setPhase("waiting_challenge");
      setErrorMessage(null);
    };

    const onGameStarted = (data: GameStartedPayload) => {
      setIncomingChallenge(null);
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

    socket.on("presence_update", onPresenceUpdate);
    socket.on("challenge_received", onChallengeReceived);
    socket.on("challenge_declined", onChallengeDeclined);
    socket.on("challenge_cancelled", onChallengeCancelled);
    socket.on("challenge_expired", onChallengeExpired);
    socket.on("waiting-for-opponent", onWaiting);
    socket.on("game-started", onGameStarted);
    socket.on("question", onQuestion);
    socket.on("answer-time-up", onAnswerTimeUp);
    socket.on("leaderboard-update", onLeaderboard);
    socket.on("game-ended", onGameEnded);
    socket.on("player-disconnected", onPlayerDisconnected);
    socket.on("error", onError);

    return () => {
      socket.off("presence_update", onPresenceUpdate);
      socket.off("challenge_received", onChallengeReceived);
      socket.off("challenge_declined", onChallengeDeclined);
      socket.off("challenge_cancelled", onChallengeCancelled);
      socket.off("challenge_expired", onChallengeExpired);
      socket.off("waiting-for-opponent", onWaiting);
      socket.off("game-started", onGameStarted);
      socket.off("question", onQuestion);
      socket.off("answer-time-up", onAnswerTimeUp);
      socket.off("leaderboard-update", onLeaderboard);
      socket.off("game-ended", onGameEnded);
      socket.off("player-disconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [socket, myUserId]);

  useEffect(() => {
    if (!socket?.connected || phase !== "playing" || !roomId) return;
    if (currentRound) return;

    const timer = window.setTimeout(() => {
      socket.emit("get-state", { roomId }, (res: unknown) => {
        if (!res || typeof res !== "object") return;
        if ("error" in res) return;
        const r = res as Extract<GetStateAck, { roomId: string }>;
        if (r.players?.length) setPlayers(r.players);
        if (r.leaderboard?.length) setLeaderboard(r.leaderboard);
        if (r.question) {
          submitSentForRoundRef.current = null;
          setCurrentRound({
            questionIndex: r.questionIndex,
            totalQuestions: r.totalQuestions,
            question: r.question,
          });
          setAnswer("");
          setHasSubmitted(false);
          setLastReveal(null);
          setDeadlineAt(Date.now() + r.question.timeLimit * 1000);
        }
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [socket, phase, roomId, currentRound]);

  const sendChallenge = useCallback(
    (targetUserId: string) => {
      if (!socket?.connected || !myUserId) {
        setErrorMessage("Not connected or not signed in");
        return;
      }
      setErrorMessage(null);
      setPhase("waiting_challenge");
      socket.emit(
        "challenge_user",
        {
          targetUserId,
          username: displayName.trim() || undefined,
        },
        (ack: { ok: boolean; challengeId?: string; error?: string }) => {
          if (!ack.ok) {
            setPhase("idle");
            if (ack.error === "offline_or_self") {
              setErrorMessage("That player is offline or unavailable.");
            } else {
              setErrorMessage("Could not send challenge.");
            }
          }
        }
      );
    },
    [socket, myUserId, displayName]
  );

  const respondChallenge = useCallback(
    (challengeId: string, accept: boolean) => {
      if (!socket?.connected) return;
      socket.emit(
        "challenge_response",
        { challengeId, accept },
        (ack: { ok: boolean; error?: string }) => {
          setIncomingChallenge(null);
          if (!ack.ok && accept) {
            setErrorMessage("Could not start match.");
            setPhase("idle");
          }
        }
      );
      if (!accept) {
        setIncomingChallenge(null);
      }
    },
    [socket]
  );

  const findMatch = useCallback(
    (username: string) => {
      if (!socket?.connected) {
        setErrorMessage("Not connected to game server");
        return;
      }
      setErrorMessage(null);
      setPhase("waiting_challenge");
      socket.emit(
        "join-game",
        { username: username.trim() || undefined },
        (ack: JoinGameAck) => {
          if (ack.status === "waiting") {
            setPhase("waiting_challenge");
          } else if (ack.status === "game_started" && "roomId" in ack) {
            setRoomId(ack.roomId);
            if ("players" in ack && ack.players?.length) {
              setPlayers(ack.players);
            }
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
      if (phase === "waiting_challenge") return;
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
    presenceUsers,
    incomingChallenge,
    sendChallenge,
    respondChallenge,
    findMatch,
    findMatchSafe,
    submitAnswer,
    resetToLobby,
    errorMessage: connected ? errorMessage : "Connecting…",
  };
}
