"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/convex/_generated/api";
import type {
  BFGameEndedPayload,
  BFGameStartedPayload,
  BFAnswerTimeUpPayload,
  BFQuestionEventPayload,
} from "@/lib/bugFinderMultiplayerTypes";
import type {
  ChallengeReceivedPayload,
  JoinGameAck,
  LeaderboardEntry,
  MultiplayerPlayer,
  PresenceUser,
} from "@/lib/multiplayerTypes";
import type { BugFinderChallengeWire } from "@/lib/bugFinderMultiplayerTypes";

export type BFPhase =
  | "idle"
  | "waiting_challenge"
  | "playing"
  | "ended"
  | "aborted";

export type UseBugFinderMultiplayerOptions = {
  displayName: string;
  myUserId: string | null;
  sessionToken?: string | null;
};

export function useBugFinderMultiplayer(
  socket: Socket | null,
  connected: boolean,
  options: UseBugFinderMultiplayerOptions
) {
  const { displayName, myUserId, sessionToken } = options;
  const applyLocalQuizPoints = useMutation(api.quizGame.applyLocalQuizPoints);

  const [phase, setPhase] = useState<BFPhase>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRound, setCurrentRound] = useState<BFQuestionEventPayload | null>(
    null
  );
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastReveal, setLastReveal] = useState<BFAnswerTimeUpPayload | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] =
    useState<ChallengeReceivedPayload | null>(null);

  const mySocketIdRef = useRef<string | null>(null);
  const myUserIdRef = useRef<string | null>(null);
  myUserIdRef.current = myUserId;
  const sessionTokenRef = useRef<string | null>(null);
  sessionTokenRef.current = sessionToken ?? null;
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
    setSelected(null);
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
      if (data.gameType !== "bug_finder") return;
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

    const onBfWaiting = () => {
      setPhase("waiting_challenge");
      setErrorMessage(null);
    };

    const onBfGameStarted = (data: BFGameStartedPayload) => {
      setIncomingChallenge(null);
      setRoomId(data.roomId);
      setPlayers(data.players);
      setPhase("playing");
      setErrorMessage(null);
    };

    const onBfQuestion = (payload: BFQuestionEventPayload) => {
      submitSentForRoundRef.current = null;
      setCurrentRound(payload);
      setSelected(null);
      setHasSubmitted(false);
      setLastReveal(null);
      setDeadlineAt(Date.now() + 10_000);
      setPhase("playing");
    };

    const onBfAnswerTimeUp = (payload: BFAnswerTimeUpPayload) => {
      setLastReveal(payload);
    };

    const onBfLeaderboard = (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
    };

    const onBfGameEnded = (data: BFGameEndedPayload) => {
      setLeaderboard(data.finalLeaderboard);
      setPhase("ended");
      setCurrentRound(null);
      setDeadlineAt(null);

      const token = sessionTokenRef.current;
      const uid = myUserIdRef.current;
      const sid = mySocketIdRef.current;
      if (token && uid) {
        const row = data.finalLeaderboard.find(
          (e) => e.userId === uid || (sid !== null && e.userId === sid)
        );
        if (row) {
          void applyLocalQuizPoints({
            sessionToken: token,
            pointsEarned: row.score,
            streak: 0,
          }).catch(() => {});
        }
      }
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
    socket.on("bf-waiting-for-opponent", onBfWaiting);
    socket.on("bf-game-started", onBfGameStarted);
    socket.on("bf-question", onBfQuestion);
    socket.on("bf-answer-time-up", onBfAnswerTimeUp);
    socket.on("bf-leaderboard-update", onBfLeaderboard);
    socket.on("bf-game-ended", onBfGameEnded);
    socket.on("player-disconnected", onPlayerDisconnected);
    socket.on("error", onError);

    const registerPresence = () => {
      if (!socket.connected || !myUserId) return;
      socket.emit("register_presence", {
        username: displayName.trim() || undefined,
      });
    };
    socket.on("connect", registerPresence);
    registerPresence();

    return () => {
      socket.off("connect", registerPresence);
      socket.off("presence_update", onPresenceUpdate);
      socket.off("challenge_received", onChallengeReceived);
      socket.off("challenge_declined", onChallengeDeclined);
      socket.off("challenge_cancelled", onChallengeCancelled);
      socket.off("challenge_expired", onChallengeExpired);
      socket.off("bf-waiting-for-opponent", onBfWaiting);
      socket.off("bf-game-started", onBfGameStarted);
      socket.off("bf-question", onBfQuestion);
      socket.off("bf-answer-time-up", onBfAnswerTimeUp);
      socket.off("bf-leaderboard-update", onBfLeaderboard);
      socket.off("bf-game-ended", onBfGameEnded);
      socket.off("player-disconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [socket, myUserId, displayName, connected, applyLocalQuizPoints]);

  useEffect(() => {
    if (!socket?.connected || phase !== "playing" || !roomId) return;
    if (currentRound) return;

    const timer = window.setTimeout(() => {
      socket.emit("get-bf-state", { roomId }, (res: unknown) => {
        if (!res || typeof res !== "object") return;
        if ("error" in res) return;
        const r = res as {
          questionIndex: number;
          totalQuestions: number;
          challenge: BugFinderChallengeWire | null;
          players?: MultiplayerPlayer[];
          leaderboard?: LeaderboardEntry[];
        };
        if (r.players?.length) setPlayers(r.players);
        if (r.leaderboard?.length) setLeaderboard(r.leaderboard);
        if (r.challenge) {
          submitSentForRoundRef.current = null;
          setCurrentRound({
            questionIndex: r.questionIndex,
            totalQuestions: r.totalQuestions,
            challenge: r.challenge,
          });
          setSelected(null);
          setHasSubmitted(false);
          setLastReveal(null);
          setDeadlineAt(Date.now() + 10_000);
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
          gameType: "bug_finder" as const,
        },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack.ok) {
            setPhase("idle");
            setErrorMessage(
              ack.error === "offline_or_self"
                ? "That player is offline or unavailable."
                : "Could not send challenge."
            );
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
        (ack: { ok: boolean }) => {
          setIncomingChallenge(null);
          if (!ack.ok && accept) {
            setErrorMessage("Could not start match.");
            setPhase("idle");
          }
        }
      );
      if (!accept) setIncomingChallenge(null);
    },
    [socket]
  );

  const findBugMatch = useCallback(
    (username: string) => {
      if (!socket?.connected) {
        setErrorMessage("Not connected to game server");
        return;
      }
      setErrorMessage(null);
      setPhase("waiting_challenge");
      socket.emit(
        "join-bug-game",
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

  const submitAnswer = useCallback(() => {
    if (!socket || !roomId || !currentRound) return;
    const qIdx = currentRound.questionIndex;
    if (hasSubmitted || selected === null || submitSentForRoundRef.current === qIdx)
      return;
    submitSentForRoundRef.current = qIdx;
    socket.emit("submit-bug-answer", {
      roomId,
      answer: selected,
    });
    setHasSubmitted(true);
  }, [socket, roomId, currentRound, selected, hasSubmitted]);

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
    selected,
    setSelected,
    hasSubmitted,
    lastReveal,
    mySocketId,
    presenceUsers,
    incomingChallenge,
    sendChallenge,
    respondChallenge,
    findBugMatch,
    submitAnswer,
    resetToLobby,
    errorMessage: connected ? errorMessage : "Connecting…",
  };
}
