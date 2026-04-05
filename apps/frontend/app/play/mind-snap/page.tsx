"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthState } from "@/lib/auth";
import type { MindSnapPuzzle } from "@/lib/mindSnapTypes";
import {
  cellKey,
  isTargetCell,
  listEligiblePuzzles,
  pickRandomPuzzleNoRepeat,
} from "@/lib/mindSnapPack";
import { useSession } from "@/lib/session";

type Phase = "menu" | "flash" | "recall" | "results";

type RunStats = {
  correctClicks: number;
  wrongClicks: number;
  missed: number;
  score: number;
};

function computeScore(puzzle: MindSnapPuzzle, stats: Omit<RunStats, "score">): number {
  const { scoring } = puzzle;
  return (
    stats.correctClicks * scoring.correctClick +
    stats.wrongClicks * scoring.wrongClick +
    stats.missed * scoring.missedPenalty
  );
}

function MindSnapInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const applyPoints = useMutation(api.quizGame.applyLocalQuizPoints);

  const dept = searchParams.get("dept") ?? "all";
  const diffRaw = searchParams.get("diff");
  const difficulty: number | "all" =
    diffRaw === null || diffRaw === "all"
      ? "all"
      : Math.min(3, Math.max(1, Number(diffRaw) || 1));

  const filters = useMemo(
    () => ({
      department: dept === "all" || !dept ? "all" : dept,
      difficulty,
    }),
    [dept, difficulty]
  );

  const eligibleCount = useMemo(
    () => listEligiblePuzzles(filters).length,
    [filters]
  );

  const [puzzle, setPuzzle] = useState<MindSnapPuzzle | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("menu");
  const [flashLeft, setFlashLeft] = useState(0);
  const [recallLeft, setRecallLeft] = useState(0);

  const [correctFound, setCorrectFound] = useState<Set<string>>(new Set());
  const [wrongTapped, setWrongTapped] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<RunStats | null>(null);

  const finishedRef = useRef(false);

  const userRow = useQuery(
    api.users.getCurrentUser,
    token ? { sessionToken: token } : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Reset seen-puzzle pool when filters change so new dept/difficulty starts fresh
  useEffect(() => {
    setSeenIds(new Set());
  }, [filters]);

  const finishRound = useCallback(
    (p: MindSnapPuzzle, found: Set<string>, wrong: Set<string>) => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      let missed = 0;
      for (const c of p.correctCells) {
        const k = cellKey(c.row, c.col);
        if (!found.has(k)) missed += 1;
      }
      const correctClicks = found.size;
      const wrongClicks = wrong.size;
      const score = computeScore(p, { correctClicks, wrongClicks, missed });
      setStats({
        correctClicks,
        wrongClicks,
        missed,
        score,
      });
      setPhase("results");
      if (token) {
        void applyPoints({
          sessionToken: token,
          pointsEarned: Math.max(0, score),
          streak: correctClicks,
        }).catch(() => {});
      }
    },
    [applyPoints, token]
  );

  const startRound = useCallback(() => {
    const result = pickRandomPuzzleNoRepeat(filters, seenIds);
    if (!result) return;
    const { puzzle: p, nextSeenIds } = result;
    finishedRef.current = false;
    setPuzzle(p);
    setSeenIds(nextSeenIds);
    setCorrectFound(new Set());
    setWrongTapped(new Set());
    setStats(null);
    setPhase("flash");
    setFlashLeft(p.displayTime);
    setRecallLeft(p.recallTime);
  }, [filters, seenIds]);

  /** Flash countdown */
  useEffect(() => {
    if (phase !== "flash" || !puzzle) return;
    if (flashLeft <= 0) {
      setPhase("recall");
      setRecallLeft(puzzle.recallTime);
      return;
    }
    const t = window.setTimeout(() => {
      setFlashLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, puzzle, flashLeft]);

  /** Recall countdown */
  useEffect(() => {
    if (phase !== "recall" || !puzzle) return;
    if (recallLeft <= 0) return;
    const t = window.setTimeout(() => {
      setRecallLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, puzzle, recallLeft]);

  /** All targets found */
  useEffect(() => {
    if (phase !== "recall" || !puzzle) return;
    if (correctFound.size < puzzle.correctCells.length) return;
    finishRound(puzzle, correctFound, wrongTapped);
  }, [phase, puzzle, correctFound, wrongTapped, finishRound]);

  /** Recall time expired */
  useEffect(() => {
    if (phase !== "recall" || !puzzle) return;
    if (recallLeft > 0) return;
    finishRound(puzzle, correctFound, wrongTapped);
  }, [phase, puzzle, recallLeft, correctFound, wrongTapped, finishRound]);

  const onCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== "recall" || !puzzle) return;
      const k = cellKey(row, col);
      if (correctFound.has(k) || wrongTapped.has(k)) return;

      if (isTargetCell(puzzle, row, col)) {
        setCorrectFound((prev) => new Set([...prev, k]));
      } else {
        setWrongTapped((prev) => new Set([...prev, k]));
      }
    },
    [phase, puzzle, correctFound, wrongTapped]
  );

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  const displayScore = userRow?.score ?? user.score ?? 0;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/Game-bg.png)' }}
      />
      
      {/* Texture overlay */}
      <div
        className="fixed inset-0 z-5 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: "url(/texture.png)",
          backgroundSize: "200px 200px",
          backgroundRepeat: "repeat",
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(111,255,0,0.06), transparent 70%)",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 liquid-glass px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="font-mono text-xs text-neon hover:underline">
              ← Dashboard
            </Link>
            <Link href="/play" className="font-mono text-xs text-cream/80 hover:text-white">
              Arena
            </Link>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] text-neon">
            {displayScore} pts
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 pb-20">
        <div className="liquid-glass rounded-[28px] border border-white/10 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:p-8 backdrop-blur-xl [--glass-bg:rgba(0,0,0,0.65)] [--glass-bg-accent:rgba(255,255,255,0.02)]">
        {eligibleCount === 0 && (
          <p className="font-mono text-sm text-amber-200">
            No 4×4 puzzles for these filters. Choose &quot;All&quot; or widen filters.
          </p>
        )}

        {phase === "menu" && (
          <div className="space-y-6">
            <div>
              <h1 className="font-grotesk text-3xl uppercase tracking-wide text-cream">
                Mind Snap
              </h1>
              <p className="mt-2 font-mono text-sm leading-relaxed text-cream/70">
                Flash phase shows every cell for <strong className="text-cyan-400">displayTime</strong>{" "}
                seconds. Then recall: tap all cells that belong to{" "}
                <code className="text-cyan-200">correctCells</code> before{" "}
                <strong className="text-amber-300">recallTime</strong> runs out.
              </p>
            </div>
            <button
              type="button"
              disabled={eligibleCount === 0}
              onClick={startRound}
              className="w-full rounded-[14px] bg-neon py-4 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_28px_rgba(111,255,0,0.25)] hover:brightness-110 disabled:opacity-40"
            >
              Start round
            </button>
          </div>
        )}

        {puzzle && phase === "flash" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs uppercase tracking-widest text-cream/50">
                Memorize · {puzzle.department} · L{puzzle.difficulty}
              </p>
              <p className="font-mono text-2xl tabular-nums text-neon">{flashLeft}s</p>
            </div>
            <p className="font-mono text-sm text-cream/90">{puzzle.hint}</p>
            <Grid4
              puzzle={puzzle}
              mode="flash"
              correctFound={correctFound}
              wrongTapped={wrongTapped}
              onCellClick={() => {}}
            />
          </div>
        )}

        {puzzle && phase === "recall" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-mono text-xs uppercase tracking-widest text-amber-300/90">
                Recall — tap target cells
              </p>
              <p className="font-mono text-2xl tabular-nums text-amber-300">{recallLeft}s</p>
            </div>
            <p className="font-mono text-xs text-cream/55">
              Found {correctFound.size}/{puzzle.correctCells.length}
            </p>
            <Grid4
              puzzle={puzzle}
              mode="recall"
              correctFound={correctFound}
              wrongTapped={wrongTapped}
              onCellClick={onCellClick}
            />
          </div>
        )}

        {puzzle && phase === "results" && stats && (
          <div className="space-y-6">
            <h2 className="font-grotesk text-3xl uppercase text-neon">Round result</h2>
            <div className="border-t border-white/10 pt-6">
              <p className="font-mono text-5xl font-semibold tabular-nums text-neon">
                {stats.score}
                <span className="ml-2 text-base font-normal text-cream/50">points</span>
              </p>
              <ul className="mt-4 space-y-2 font-mono text-sm text-cream/80">
                <li>
                  Correct taps: {stats.correctClicks} × {puzzle.scoring.correctClick} ={" "}
                  {stats.correctClicks * puzzle.scoring.correctClick}
                </li>
                <li>
                  Wrong taps: {stats.wrongClicks} × {puzzle.scoring.wrongClick} ={" "}
                  {stats.wrongClicks * puzzle.scoring.wrongClick}
                </li>
                <li>
                  Missed targets: {stats.missed} × {puzzle.scoring.missedPenalty} ={" "}
                  {stats.missed * puzzle.scoring.missedPenalty}
                </li>
              </ul>
              <p className="mt-6 border-t border-white/10 pt-4 font-mono text-sm leading-relaxed text-cream/75">
                {puzzle.explanation}
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  setPhase("menu");
                  setPuzzle(null);
                  setStats(null);
                }}
                className="liquid-glass rounded-[12px] border border-white/20 px-5 py-3 font-grotesk uppercase text-cream hover:bg-white/10"
              >
                Menu
              </button>
              <button
                type="button"
                onClick={startRound}
                className="rounded-[12px] bg-neon px-5 py-3 font-grotesk uppercase text-[#010828] hover:brightness-110"
              >
                Another puzzle
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

function Grid4({
  puzzle,
  mode,
  correctFound,
  wrongTapped,
  onCellClick,
}: {
  puzzle: MindSnapPuzzle;
  mode: "flash" | "recall";
  correctFound: Set<string>;
  wrongTapped: Set<string>;
  onCellClick: (row: number, col: number) => void;
}) {
  return (
    <div
      className="grid grid-cols-4 gap-1.5 sm:gap-2"
      style={{ touchAction: "manipulation" }}
    >
      {puzzle.grid.map((row, r) =>
        row.map((cell, c) => {
          const k = cellKey(r, c);
          const showValue = mode === "flash";
          const isOk = correctFound.has(k);
          const isBad = wrongTapped.has(k);
          return (
            <button
              key={k}
              type="button"
              disabled={false}
              onClick={() => onCellClick(r, c)}
              className={`group flex min-h-[4.5rem] flex-col items-center justify-center rounded-xl border p-1.5 text-center transition-all duration-300 sm:min-h-[5.25rem] backdrop-blur-md hover:-translate-y-1 hover:shadow-xl ${
                mode === "recall"
                  ? isOk
                    ? "liquid-glass border-neon [--glass-bg:rgba(111,255,0,0.15)] [--glass-bg-accent:rgba(111,255,0,0.05)] text-neon shadow-[0_0_20px_rgba(111,255,0,0.2)]"
                    : isBad
                      ? "liquid-glass border-rose-500/60 [--glass-bg:rgba(244,63,94,0.15)] shadow-[0_0_20px_rgba(244,63,94,0.15)] text-rose-200"
                      : "liquid-glass border-white/10 [--glass-bg:rgba(0,0,0,0.6)] text-cream shadow-md cursor-pointer hover:[--glass-bg:rgba(0,0,0,0.8)] hover:border-neon hover:shadow-[0_0_20px_rgba(111,255,0,0.15)] active:scale-95"
                  : "liquid-glass border-cyan-500/30 [--glass-bg:rgba(6,182,212,0.15)] [--glass-bg-accent:rgba(6,182,212,0.05)] text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.15)] cursor-default hover:[--glass-bg:rgba(6,182,212,0.25)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
              }`}
            >
              <span
                className={`line-clamp-4 w-full break-words font-mono text-[10px] leading-tight transition-all sm:text-xs ${
                  showValue ? "text-cyan-100 font-medium group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "text-cream/90 group-hover:text-neon"
                }`}
              >
                {showValue
                  ? cell || "—"
                  : isOk
                    ? "✓"
                    : isBad
                      ? "✗"
                      : "?"}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

export default function MindSnapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
          <p className="font-mono text-cream/60 text-sm">Loading…</p>
        </div>
      }
    >
      <MindSnapInner />
    </Suspense>
  );
}
