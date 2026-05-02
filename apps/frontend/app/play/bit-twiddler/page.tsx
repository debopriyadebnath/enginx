"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { DifficultyBadge } from "@/components/ui/badge";
import { CodeTerminal } from "@/components/ui/code-terminal";
import { useAuthState } from "@/lib/auth";
import { useSession } from "@/lib/session";
import {
  type BitQuestion,
  checkBitAnswer,
  pickBitRun,
  pointsForBit,
} from "@/lib/bitTwiddlerPack";

const QUESTION_TIME = 15;
const RUN_SIZE = 10;

type ResultRow = {
  id: string;
  title: string;
  difficulty: string;
  selected: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  pointsEarned: number;
};

function BitTwiddlerInner() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const applyPoints = useMutation(api.quizGame.applyLocalQuizPoints);

  const questions = useMemo(() => pickBitRun(RUN_SIZE), []);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; pointsEarned: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runTotal, setRunTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [results, setResults] = useState<ResultRow[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmittedRef = useRef(false);

  const q = questions[index];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    setTimeLeft(QUESTION_TIME);
    setSelected(null);
    setFeedback(null);
    setShowHint(false);
    autoSubmittedRef.current = false;
  }, [index]);

  useEffect(() => {
    if (phase !== "running" || feedback) return;
    if (timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, feedback, timeLeft]);

  const doSubmit = useCallback(async (forcedAnswer: string | null) => {
    if (!token || !q || submitting || feedback) return;
    setSubmitting(true);
    const answer = forcedAnswer ?? selected;
    const correct = answer !== null ? checkBitAnswer(q, answer) : false;
    const pointsEarned = pointsForBit(q, correct);
    const newStreak = correct ? streak + 1 : 0;

    try {
      await applyPoints({ sessionToken: token, pointsEarned, streak: newStreak });
    } catch {
      toast.error("Points couldn't be saved — check your connection.");
    }

    setStreak(correct ? newStreak : 0);
    if (correct) setRunTotal((t) => t + pointsEarned);
    setResults((prev) => [
      ...prev,
      {
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        selected: answer ?? "(timed out)",
        correct,
        correctAnswer: q.answer,
        explanation: q.explanation,
        pointsEarned: correct ? pointsEarned : 0,
      },
    ]);
    setFeedback({ correct, pointsEarned: correct ? pointsEarned : 0 });
    setSubmitting(false);
  }, [token, q, submitting, feedback, selected, streak, applyPoints]);

  useEffect(() => {
    if (phase !== "running" || feedback || timeLeft > 0 || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void doSubmit(null);
  }, [phase, feedback, timeLeft, doSubmit]);

  const advance = useCallback(() => {
    if (index + 1 >= questions.length) {
      setPhase("done");
      toast.success(`Twiddling done! +${runTotal} pts`);
      return;
    }
    setIndex((i) => i + 1);
  }, [index, questions.length, runTotal]);

  const userRow = useQuery(api.users.getCurrentUser, token ? { sessionToken: token } : "skip");

  if (isLoading || !isAuthenticated || user === undefined) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]"><p className="font-mono text-cream/60 text-sm">Loading…</p></div>;
  }
  if (!user || !token) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]"><p className="font-mono text-cream/60 text-sm">Loading…</p></div>;
  }

  const displayScore = userRow?.score ?? user.score ?? 0;
  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 8 ? "#b724ff" : timeLeft > 4 ? "#f59e0b" : "#f43f5e";

  if (phase === "done") {
    return (
      <div className="relative min-h-[100dvh] overflow-hidden">
        <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url(/Game-bg.png)" }} />
        <div className="fixed inset-0 z-5 pointer-events-none opacity-[0.08]" style={{ backgroundImage: "url(/texture.png)", backgroundSize: "200px 200px" }} />
        <div className="relative z-20 mx-auto max-w-2xl px-4 py-12">
          <div className="liquid-glass rounded-[28px] border border-white/12 p-8 text-center shadow-[0_32px_120px_rgba(0,0,0,0.65)] sm:p-10 [--glass-bg:rgba(0,0,0,0.75)] [--glass-bg-accent:rgba(183,36,255,0.05)]">
            <p className="font-mono text-xs uppercase tracking-widest text-cream/50">Bit Twiddler complete</p>
            <p className="font-grotesk mt-2 text-3xl uppercase text-purple-400 sm:text-4xl">Results</p>
            <p className="mt-6 font-mono text-cream">Run score · <span className="text-xl font-semibold text-purple-400 tabular-nums">{runTotal}</span> pts</p>
            <p className="mt-2 font-mono text-sm text-cream/65">Total · {displayScore} pts · best streak · {userRow?.bestStreak ?? user.bestStreak ?? 0}</p>
          </div>
          <ul className="mt-8 space-y-4">
            {results.map((row, i) => (
              <li key={`${row.id}-${i}`} className={`liquid-glass rounded-[20px] border p-5 backdrop-blur-lg ${row.correct ? "border-emerald-500/30 [--glass-bg:rgba(0,0,0,0.65)] [--glass-bg-accent:rgba(16,185,129,0.08)]" : "border-rose-500/30 [--glass-bg:rgba(0,0,0,0.7)] [--glass-bg-accent:rgba(244,63,94,0.08)]"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-cream/45">Q{i + 1}</span>
                  <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${row.correct ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>{row.correct ? "Correct" : "Miss"}</span>
                  <DifficultyBadge difficulty={row.difficulty} />
                  {row.pointsEarned > 0 && <span className="ml-auto font-mono text-xs text-purple-400">+{row.pointsEarned}</span>}
                </div>
                <p className="mt-2 font-grotesk text-lg text-cream">{row.title}</p>
                <p className="mt-2 font-mono text-sm text-cream/80">Your pick: <span className="text-cream">{row.selected}</span></p>
                <p className="font-mono text-sm text-cream/90">Answer: <span className="text-purple-400">{row.correctAnswer}</span></p>
                <p className="mt-2 border-t border-white/10 pt-2 font-mono text-sm leading-relaxed text-cream/70">{row.explanation}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="liquid-glass rounded-[12px] px-5 py-3 font-grotesk uppercase text-cream hover:bg-white/10">Dashboard</Link>
            <Link href="/play/bit-twiddler" className="rounded-[12px] bg-purple-600 px-5 py-3 font-grotesk uppercase text-white shadow-[0_0_24px_rgba(183,36,255,0.3)] hover:bg-purple-500">Play again</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url(/Game-bg.png)" }} />
      <div className="fixed inset-0 z-5 pointer-events-none opacity-[0.08]" style={{ backgroundImage: "url(/texture.png)", backgroundSize: "200px 200px" }} />
      <div className="pointer-events-none fixed inset-0 z-10 opacity-20" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(183,36,255,0.08), transparent 70%)" }} />

      <header className="sticky top-0 z-40 border-b border-white/10 liquid-glass px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-mono text-xs text-neon hover:underline">← Dashboard</Link>
            <span className="font-grotesk text-sm text-purple-400 uppercase tracking-wider">Bit Twiddler</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-cream/80">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-neon">{displayScore} pts</span>
            <span className="rounded-full border border-white/15 px-2.5 py-1">🔥 {streak}</span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 tabular-nums">{index + 1}/{questions.length}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-6 pb-16">
        {/* Timer bar */}
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor, boxShadow: `0 0 8px ${timerColor}` }}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cream/45">{q.category}</span>
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          <span className="font-mono tabular-nums text-lg" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>

        <h1 className="font-grotesk text-2xl uppercase leading-tight text-cream sm:text-3xl mb-2">{q.title}</h1>
        <p className="font-mono text-sm text-cream/70 mb-5">{q.question}</p>

        {/* Expression display */}
        <CodeTerminal title="bits.c" subtitle="bit twiddler · evaluate the expression">
          <pre className="font-mono text-base text-purple-200 leading-relaxed whitespace-pre-wrap">{q.expression}</pre>
        </CodeTerminal>

        {/* Hint toggle */}
        {!feedback && (
          <button
            type="button"
            onClick={() => setShowHint((h) => !h)}
            className="mt-3 font-mono text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showHint ? "Hide hint ↑" : "Show hint ↓"}
          </button>
        )}
        {showHint && !feedback && (
          <p className="mt-1 font-mono text-sm text-amber-300/80 leading-relaxed">💡 {q.hint}</p>
        )}

        {feedback ? (
          <div className={`liquid-glass mt-6 rounded-[18px] px-5 py-4 ${feedback.correct ? "border-emerald-400/40" : "border-rose-400/40"}`}>
            <p className="font-grotesk text-lg uppercase text-cream">{feedback.correct ? "Correct!" : "Not quite"}</p>
            <p className="font-mono text-sm text-cream/70 mt-1">Answer: <span className="text-purple-400">{q.answer}</span></p>
            {feedback.pointsEarned > 0 && <p className="font-mono text-sm text-cream/90 mt-1">+{feedback.pointsEarned} pts</p>}
            <p className="mt-2 font-mono text-sm text-cream/60 leading-relaxed">{q.explanation}</p>
            <button
              type="button"
              onClick={advance}
              className="mt-4 w-full rounded-[12px] bg-purple-600 py-3 font-grotesk uppercase text-white shadow-[0_0_20px_rgba(183,36,255,0.3)] hover:bg-purple-500"
            >
              {index + 1 >= questions.length ? "See results" : "Next"}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-5 w-max rounded-full bg-black/40 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-cream/70">
              Pick the result
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {q.options.map((opt) => {
                const active = selected === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelected(opt)}
                    className={`rounded-xl border px-4 py-3 font-mono text-sm transition text-left backdrop-blur-md ${
                      active
                        ? "liquid-glass border-purple-500 [--glass-bg:rgba(183,36,255,0.15)] text-purple-200 shadow-[0_0_20px_rgba(183,36,255,0.2)]"
                        : "liquid-glass border-white/10 [--glass-bg:rgba(0,0,0,0.6)] text-cream hover:[--glass-bg:rgba(0,0,0,0.8)] hover:border-purple-500/40"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={selected === null || submitting}
              onClick={() => void doSubmit(selected)}
              className="mt-8 w-full rounded-[14px] bg-purple-600 py-4 font-grotesk uppercase tracking-wide text-white shadow-[0_0_28px_rgba(183,36,255,0.3)] hover:bg-purple-500 disabled:opacity-40"
            >
              {submitting ? "Checking…" : "Lock in"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default function BitTwiddlerPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]"><p className="font-mono text-cream/60 text-sm">Loading…</p></div>}>
      <BitTwiddlerInner />
    </Suspense>
  );
}
