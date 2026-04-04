"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameHud } from "@/components/game/GameHud";
import { QuestionRenderer } from "@/components/game/QuestionRenderer";
import { useAuthState } from "@/lib/auth";
import { useAuthenticatedGameSocket } from "@/lib/socket";
import { socketQuestionToPublicQuestion } from "@/lib/socketQuestionAdapter";
import { useMultiplayerQuiz } from "@/lib/useMultiplayerQuiz";
import { useSession } from "@/lib/session";

export default function MultiplayerQuizPage() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const { socket, connected, error: socketConnectError } =
    useAuthenticatedGameSocket();
  const {
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
    findMatchSafe,
    submitAnswer,
    resetToLobby,
    errorMessage,
  } = useMultiplayerQuiz(socket, connected);

  const [displayName, setDisplayName] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (user?.name || user?.email) {
      setDisplayName((n) => n || user.name || user.email || "");
    }
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!deadlineAt || phase !== "playing" || !currentRound) {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadlineAt, phase, currentRound]);

  useEffect(() => {
    if (
      phase !== "playing" ||
      !currentRound ||
      hasSubmitted ||
      secondsLeft > 0
    ) {
      return;
    }
    submitAnswer();
  }, [secondsLeft, phase, currentRound, hasSubmitted, submitAnswer]);

  const myScore = useMemo(() => {
    if (!mySocketId) return 0;
    const row = leaderboard.find((e) => e.userId === mySocketId);
    return row?.score ?? 0;
  }, [leaderboard, mySocketId]);

  const myReveal = useMemo(() => {
    if (!lastReveal || !mySocketId) return null;
    return lastReveal.scores[mySocketId] ?? null;
  }, [lastReveal, mySocketId]);

  const opponent = useMemo(() => {
    if (!mySocketId) return null;
    return players.find((p) => p.socketId !== mySocketId) ?? null;
  }, [players, mySocketId]);

  const publicQ = useMemo(() => {
    if (!currentRound?.question) return null;
    return socketQuestionToPublicQuestion(currentRound.question);
  }, [currentRound]);

  const handleFindMatch = useCallback(() => {
    findMatchSafe(displayName.trim() || "Player");
  }, [findMatchSafe, displayName]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#010828] px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundImage: "url(/texture.png)",
          backgroundSize: "cover",
          mixBlendMode: "lighten",
        }}
      />
      <div className="relative z-10 mx-auto max-w-3xl">
        <Link
          href="/play"
          className="font-mono text-sm text-neon hover:underline"
        >
          ← Quiz Arena
        </Link>

        <h1 className="font-anton mt-6 text-3xl uppercase text-cream">
          1v1 live quiz
        </h1>
        <p className="mt-2 font-mono text-sm leading-relaxed text-cream/70">
          Match with another player in the queue. Questions are drawn from the
          same JSON packs as solo mode; the server picks a random run and keeps
          both players in sync. Submit before the timer ends.
        </p>

        {!connected && (
          <p className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-mono text-sm text-amber-100">
            {socketConnectError
              ? `Cannot reach game server: ${socketConnectError}`
              : "Connecting to game server…"}
          </p>
        )}

        {connected && errorMessage && phase === "idle" && (
          <p className="mt-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-100">
            {errorMessage}
          </p>
        )}

        {(phase === "idle" || phase === "waiting") && (
          <div className="liquid-glass mt-8 space-y-6 rounded-[24px] border border-white/10 p-6">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-cream/50">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How opponents see you"
                className="mt-2 w-full rounded-[12px] border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-cream/35"
              />
            </div>
            <button
              type="button"
              disabled={!connected}
              onClick={handleFindMatch}
              className="w-full rounded-[12px] bg-neon px-4 py-3 font-anton uppercase text-[#010828] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "waiting" ? "Finding opponent…" : "Find match"}
            </button>
            {phase === "waiting" && (
              <p className="text-center font-mono text-sm text-cream/60">
                Waiting for another player to join the queue…
              </p>
            )}
          </div>
        )}

        {phase === "playing" && publicQ && currentRound && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
                  Match
                </p>
                <p className="font-mono text-sm text-cream">
                  vs{" "}
                  <span className="text-neon">
                    {opponent?.username ?? "…"}
                  </span>
                </p>
                <p className="mt-1 font-mono text-[10px] text-cream/45">
                  {roomId}
                </p>
              </div>
              <GameHud
                score={myScore}
                streak={0}
                bestStreak={0}
                questionIndex={currentRound.questionIndex}
                totalQuestions={currentRound.totalQuestions}
                secondsLeft={secondsLeft}
                phase="multi"
              />
            </div>

            <div className="liquid-glass rounded-[24px] border border-white/10 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cream/90">
                  {publicQ.type}
                </span>
                <span className="font-mono text-[10px] text-cream/45">
                  {publicQ.timeLimit}s limit
                </span>
              </div>
              {publicQ.type !== "debug" &&
              !(
                publicQ.type === "math" &&
                (!publicQ.options || publicQ.options.length === 0)
              ) ? (
                <h2 className="font-grotesk mt-4 text-xl leading-snug text-cream sm:text-2xl">
                  {publicQ.question}
                </h2>
              ) : null}

              <div className="mt-6">
                <QuestionRenderer
                  question={publicQ}
                  value={answer}
                  onChange={setAnswer}
                  disabled={hasSubmitted}
                />
              </div>
              <button
                type="button"
                disabled={hasSubmitted || !connected}
                onClick={submitAnswer}
                className="mt-6 w-full rounded-[12px] border border-neon/50 bg-neon/15 px-4 py-3 font-anton uppercase text-neon hover:bg-neon/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {hasSubmitted ? "Answer locked" : "Submit answer"}
              </button>
            </div>

            {lastReveal && (
              <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
                <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
                  Round result
                </p>
                <p className="mt-2 font-mono text-sm text-cream">
                  Correct answer:{" "}
                  <span className="text-neon">{lastReveal.correctAnswer}</span>
                </p>
                {myReveal && (
                  <p className="mt-2 font-mono text-sm text-cream/90">
                    You: {myReveal.isCorrect ? "✓" : "✗"} · +{myReveal.points}{" "}
                    pts
                  </p>
                )}
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
                <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
                  Standings
                </p>
                <ol className="mt-3 space-y-2 font-mono text-sm text-cream">
                  {leaderboard.map((row, i) => (
                    <li key={row.userId} className="flex justify-between gap-4">
                      <span>
                        {i + 1}. {row.username}
                        {row.userId === mySocketId ? (
                          <span className="text-neon"> (you)</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-cream/90">
                        {row.score} pts
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {phase === "ended" && (
          <div className="liquid-glass mt-8 space-y-6 rounded-[24px] border border-white/10 p-8 text-center">
            <h2 className="font-anton text-2xl uppercase text-cream">
              Match finished
            </h2>
            <ol className="mx-auto max-w-sm space-y-2 text-left font-mono text-sm text-cream">
              {leaderboard.map((row, i) => (
                <li key={row.userId} className="flex justify-between gap-4">
                  <span>
                    {i + 1}. {row.username}
                  </span>
                  <span className="text-neon">{row.score} pts</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={resetToLobby}
              className="rounded-[12px] bg-neon px-6 py-3 font-anton uppercase text-[#010828] hover:brightness-110"
            >
              Play again
            </button>
          </div>
        )}

        {phase === "aborted" && (
          <div className="liquid-glass mt-8 rounded-[24px] border border-amber-500/20 p-8 text-center">
            <p className="font-mono text-cream">
              Opponent disconnected — match ended.
            </p>
            <button
              type="button"
              onClick={resetToLobby}
              className="mt-6 rounded-[12px] bg-neon px-6 py-3 font-anton uppercase text-[#010828] hover:brightness-110"
            >
              Back to lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
