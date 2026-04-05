"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeWithBlank } from "@/components/bug-finder/CodeWithBlank";
import { CodeTerminal } from "@/components/ui/code-terminal";
import { useAuthState } from "@/lib/auth";
import {
  useAuthenticatedGameSocket,
  useBugFinderMultiplayer,
} from "@/lib/socket";
import { useSession } from "@/lib/session";

export default function BugFinderMultiPage() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const [displayName, setDisplayName] = useState("");
  const { socket, connected, error: socketConnectError } =
    useAuthenticatedGameSocket();

  const {
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
    errorMessage,
  } = useBugFinderMultiplayer(socket, connected, {
    displayName,
    myUserId: user?._id ?? null,
    sessionToken: token ?? null,
  });

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
    if (phase !== "playing" || !currentRound || hasSubmitted) return;
    if (!deadlineAt || Date.now() < deadlineAt) return;
    if (selected === null) return;
    submitAnswer();
  }, [
    secondsLeft,
    phase,
    currentRound,
    hasSubmitted,
    deadlineAt,
    selected,
    submitAnswer,
  ]);

  const myScore = useMemo(() => {
    const id = user?._id;
    if (id) {
      const byUser = leaderboard.find((e) => e.userId === id);
      if (byUser) return byUser.score;
    }
    if (!mySocketId) return 0;
    return (
      leaderboard.find((e) => e.userId === mySocketId)?.score ?? 0
    );
  }, [leaderboard, mySocketId, user?._id]);

  const myReveal = useMemo(() => {
    if (!lastReveal || !mySocketId) return null;
    return lastReveal.scores[mySocketId] ?? null;
  }, [lastReveal, mySocketId]);

  const opponent = useMemo(() => {
    if (!mySocketId) return null;
    return players.find((p) => p.socketId !== mySocketId) ?? null;
  }, [players, mySocketId]);

  const handleChallenge = useCallback(
    (targetUserId: string) => {
      sendChallenge(targetUserId);
    },
    [sendChallenge]
  );

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!token) return null;

  const q = currentRound?.challenge;

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
          href="/play/bug-finder"
          className="font-mono text-sm text-amber-400 hover:underline"
        >
          ← Bug finder (solo)
        </Link>

        <h1 className="font-anton mt-6 text-3xl uppercase text-cream">
          1v1 bug finder
        </h1>
        <p className="mt-2 font-mono text-sm leading-relaxed text-cream/70">
          Same C fill-the-blank challenges for both players.{" "}
          <span className="text-amber-400">10 second</span> rounds. Wrong answers
          can cost points (server rules).
        </p>

        {!connected && (
          <p className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-mono text-sm text-amber-100">
            {socketConnectError
              ? `Cannot reach game server: ${socketConnectError}`
              : "Connecting…"}
          </p>
        )}

        {connected &&
          errorMessage &&
          (phase === "idle" || phase === "waiting_challenge") && (
            <p className="mt-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-100">
              {errorMessage}
            </p>
          )}

        {phase === "playing" && !currentRound && (
          <div className="liquid-glass mt-8 space-y-4 rounded-[24px] border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center">
            <p className="font-anton text-xl uppercase text-cream">
              Opponent found
            </p>
            <p className="font-mono text-sm text-cream/70">
              Loading first challenge…
            </p>
            {opponent && (
              <p className="font-mono text-sm text-cream">
                vs <span className="text-amber-400">{opponent.username}</span>
              </p>
            )}
            {roomId && (
              <p className="font-mono text-[10px] text-cream/40">{roomId}</p>
            )}
            <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-cream/20 border-t-amber-400" />
          </div>
        )}

        {(phase === "idle" || phase === "waiting_challenge") && (
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
              disabled={!connected || phase === "waiting_challenge"}
              onClick={() => findBugMatch(displayName.trim() || "Player")}
              className="w-full rounded-[12px] border border-amber-500/40 bg-amber-500/15 px-4 py-3 font-mono text-sm font-semibold uppercase text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
            >
              {phase === "waiting_challenge"
                ? "Finding opponent…"
                : "Quick match (queue)"}
            </button>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
                Or challenge someone online
              </p>
              {!user?._id && (
                <p className="mt-2 font-mono text-sm text-amber-200/90">
                  Sign in to see the player list.
                </p>
              )}
              {user?._id && presenceUsers.length === 0 && (
                <p className="mt-3 font-mono text-sm text-cream/55">
                  No one else online yet.
                </p>
              )}
              {user?._id && presenceUsers.length > 0 && (
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {presenceUsers.map((u) => (
                    <li
                      key={u.userId}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <span className="font-mono text-sm text-cream">
                        {u.username}
                      </span>
                      <button
                        type="button"
                        disabled={
                          !connected || phase === "waiting_challenge"
                        }
                        onClick={() => handleChallenge(u.userId)}
                        className="shrink-0 rounded-[10px] bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 font-mono text-xs font-semibold uppercase text-[#010828] hover:brightness-110 disabled:opacity-50"
                      >
                        Challenge
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {phase === "waiting_challenge" && (
              <p className="text-center font-mono text-sm text-cream/70">
                Waiting…
              </p>
            )}
          </div>
        )}

        {incomingChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="liquid-glass max-w-md rounded-[24px] border border-amber-500/30 p-8 shadow-2xl">
              <p className="font-mono text-xs uppercase tracking-wider text-cream/50">
                Bug finder challenge
              </p>
              <p className="font-mono mt-2 text-lg text-cream">
                <span className="text-amber-400">
                  {incomingChallenge.fromUsername}
                </span>{" "}
                wants a 1v1 C bug-finder match.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    respondChallenge(incomingChallenge.challengeId, true)
                  }
                  className="flex-1 rounded-[12px] bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 font-anton uppercase text-[#010828] hover:brightness-110"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() =>
                    respondChallenge(incomingChallenge.challengeId, false)
                  }
                  className="flex-1 rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 font-mono text-sm text-cream hover:bg-white/15"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "playing" && q && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-cream/80">
              <span className="rounded-full border border-amber-500/30 px-2.5 py-1 text-amber-200">
                {myScore} pts
              </span>
              <span className="tabular-nums text-amber-200/90">
                {secondsLeft}s · {currentRound.questionIndex + 1}/
                {currentRound.totalQuestions}
              </span>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase text-cream/45">
                {q.concept} · {q.difficulty}
              </p>
              <h2 className="font-grotesk mt-1 text-xl uppercase text-cream">
                {q.title}
              </h2>
              <p className="mt-2 font-mono text-sm text-cream/70">
                {q.description}
              </p>
            </div>

            <CodeTerminal title={`${q.id}.c`} subtitle="bug-finder · 1v1">
              <CodeWithBlank
                codeTemplate={q.codeTemplate}
                blankDisplay={selected}
              />
            </CodeTerminal>

            <p className="font-mono text-[11px] uppercase tracking-wider text-cream/50">
              Pick the token for the blank
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => setSelected(opt)}
                  className={`rounded-xl border px-3 py-3 font-mono text-sm transition ${
                    selected === opt
                      ? "border-amber-400 bg-amber-500/25 text-amber-100"
                      : "border-white/15 text-cream hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={selected === null || hasSubmitted}
              onClick={() => submitAnswer()}
              className="w-full rounded-[14px] bg-gradient-to-r from-amber-500 to-orange-500 py-4 font-grotesk uppercase text-[#010828] disabled:opacity-40"
            >
              {hasSubmitted ? "Locked in" : "Lock in"}
            </button>

            {lastReveal && myReveal && (
              <div className="liquid-glass rounded-[18px] border border-white/10 p-5">
                <p className="font-mono text-xs uppercase text-cream/50">
                  Round result
                </p>
                <p className="mt-2 font-mono text-sm text-cream">
                  Correct blank:{" "}
                  <span className="text-amber-400">{lastReveal.correctAnswer}</span>
                </p>
                <p className="mt-1 font-mono text-sm text-cream/80">
                  {lastReveal.explanation}
                </p>
                <p className="mt-2 font-mono text-sm">
                  You: {myReveal.isCorrect ? "✓" : "✗"} ·{" "}
                  {myReveal.points >= 0 ? "+" : ""}
                  {myReveal.points} pts
                </p>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
                <p className="font-mono text-xs uppercase text-cream/50">
                  Standings
                </p>
                <ol className="mt-3 space-y-2 font-mono text-sm text-cream">
                  {leaderboard.map((row, i) => (
                    <li key={row.userId} className="flex justify-between gap-4">
                      <span>
                        {i + 1}. {row.username}
                        {(row.userId === user?._id ||
                          row.userId === mySocketId) && (
                          <span className="text-amber-400"> (you)</span>
                        )}
                      </span>
                      <span className="tabular-nums">{row.score} pts</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {phase === "ended" && (
          <div className="liquid-glass mt-8 rounded-[24px] border border-amber-500/25 p-8 text-center">
            <p className="font-anton text-xl uppercase text-cream">Match over</p>
            <p className="mt-4 font-mono text-neon tabular-nums text-2xl">
              {myScore} pts
            </p>
            <button
              type="button"
              onClick={resetToLobby}
              className="mt-6 rounded-[12px] bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-grotesk uppercase text-[#010828]"
            >
              Back to lobby
            </button>
          </div>
        )}

        {phase === "aborted" && (
          <div className="mt-8 rounded-[20px] border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="font-mono text-cream">Match ended (disconnect).</p>
            <button
              type="button"
              onClick={resetToLobby}
              className="mt-4 rounded-[12px] border border-white/20 px-4 py-2 font-mono text-sm text-cream"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
