"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import { GameHud } from "@/components/game/GameHud";
import { QuestionRenderer } from "@/components/game/QuestionRenderer";
import type { PublicQuestion } from "@/components/game/types";
import { useAuthState } from "@/lib/auth";
import {
  checkAnswerJson,
  computePointsEarned,
  formatAnswerForDisplay,
  formatCorrectAnswerDisplay,
  getQuestionsForRun,
  jsonToPublicQuestion,
} from "@/lib/quizFromPack";
import { useSession } from "@/lib/session";

const CATEGORIES = [
  "all",
  "math",
  "aiml",
  "cs_fundamentals",
  "programming",
] as const;

const FIXED_TIMER_SEC = 10;

function isCategory(s: string): s is (typeof CATEGORIES)[number] {
  return (CATEGORIES as readonly string[]).includes(s);
}

export type QuestionResultRow = {
  id: string;
  question: string;
  type: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation?: string;
  pointsEarned: number;
};

function PlayRunInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const applyPoints = useMutation(api.quizGame.applyLocalQuizPoints);

  const rawCat = searchParams.get("category") ?? "all";
  const category = isCategory(rawCat) ? rawCat : "all";
  const count = Math.min(
    25,
    Math.max(1, Number(searchParams.get("count") ?? 5) || 5)
  );
  const useFixedTimer =
    searchParams.get("timer") === "1" || searchParams.get("timer") === "true";

  const questions = useMemo(
    () => getQuestionsForRun(category, count),
    [category, count]
  );

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    pointsEarned: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState(() => Date.now() + 30_000);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [runTotal, setRunTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<"running" | "done">("running");
  const [results, setResults] = useState<QuestionResultRow[]>([]);
  const timeoutHandledRef = useRef(false);

  const qJson = questions[index];
  const timeLimitSec = useMemo(() => {
    if (!qJson) return 30;
    return useFixedTimer ? FIXED_TIMER_SEC : qJson.timeLimit;
  }, [qJson, useFixedTimer]);

  const q = useMemo(
    () => (qJson ? jsonToPublicQuestion(qJson) : null),
    [qJson]
  );

  useEffect(() => {
    timeoutHandledRef.current = false;
    const qRow = questions[index];
    if (!qRow) return;
    const sec = useFixedTimer ? FIXED_TIMER_SEC : qRow.timeLimit;
    setDeadlineAt(Date.now() + sec * 1000);
    setAnswer("");
    setFeedback(null);
  }, [index, questions, useFixedTimer]);

  useEffect(() => {
    if (!qJson || phase !== "running") {
      setSecondsLeft(0);
      return;
    }
    const tick = () => {
      setSecondsLeft(
        Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000))
      );
    };
    tick();
    const id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [deadlineAt, qJson, phase]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const userRow = useQuery(
    api.users.getCurrentUser,
    token ? { sessionToken: token } : "skip"
  );

  const onSubmit = useCallback(
    async (force = false) => {
      if (!token || !qJson || submitting || feedback) return;
      const raw = answer.trim();
      if (!force && !raw) return;
      setSubmitting(true);
      const now = Date.now();
      const late = now > deadlineAt + 2000;
      const correct = !late && checkAnswerJson(qJson, raw);
      const pointsEarned = computePointsEarned(
        qJson,
        correct,
        deadlineAt,
        now,
        timeLimitSec
      );
      const newStreak = correct ? streak + 1 : 0;

      try {
        await applyPoints({
          sessionToken: token,
          pointsEarned,
          streak: newStreak,
        });
      } catch {
        timeoutHandledRef.current = false;
        setFeedback({ correct: false, pointsEarned: 0 });
        setSubmitting(false);
        return;
      }

      setStreak(newStreak);
      setRunTotal((t) => t + pointsEarned);
      setResults((prev) => [
        ...prev,
        {
          id: qJson.id,
          question: qJson.question,
          type: qJson.type,
          userAnswer: formatAnswerForDisplay(qJson, raw),
          correctAnswer: formatCorrectAnswerDisplay(qJson),
          correct,
          explanation: qJson.explanation,
          pointsEarned,
        },
      ]);
      setFeedback({ correct, pointsEarned });
      setSubmitting(false);
    },
    [
      token,
      qJson,
      answer,
      submitting,
      feedback,
      deadlineAt,
      streak,
      timeLimitSec,
      applyPoints,
    ]
  );

  useEffect(() => {
    if (phase !== "running" || feedback !== null || submitting) return;
    if (secondsLeft > 0) return;
    if (timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;
    void onSubmit(true);
  }, [secondsLeft, phase, feedback, submitting, onSubmit]);

  const advance = useCallback(() => {
    if (index + 1 >= questions.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
  }, [index, questions.length]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading profile…</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  if (questions.length === 0) {
    return (
      <div className="relative min-h-[100dvh] bg-[#010828] px-4 py-10">
        <div className="relative z-10 mx-auto max-w-lg">
          <Link href="/play" className="font-mono text-sm text-neon hover:underline">
            ← Lobby
          </Link>
          <p className="mt-6 font-mono text-cream/70">
            No questions for this category in the local pack. Pick another category
            or add items to{" "}
            <code className="text-neon">convex/seed/builtinQuestions.json</code>.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const displayScore = userRow?.score ?? user.score ?? 0;
    return (
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        {/* Background Image */}
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/Game-bg.png)' }}
        />
        
        {/* Texture overlay */}
        <div
          className="fixed inset-0 z-5 pointer-events-none opacity-[0.08]"
          style={{
            backgroundColor: '#010828',
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
          }}
        />

        <div
          className="pointer-events-none fixed inset-0 z-10 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(111,255,0,0.1), transparent 70%)",
          }}
        />
        <div className="relative z-20 mx-auto w-full max-w-2xl px-4 py-12">
          <div className="liquid-glass rounded-[28px] border border-white/12 p-8 text-center shadow-[0_32px_120px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-10 [--glass-bg:rgba(255, 255, 255, 0.7)] [--glass-bg-accent:rgba(111,255,0,0.05)]">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cream/60">
              Run complete
            </p>
            <p className="font-grotesk mt-2 text-3xl uppercase text-neon sm:text-4xl">
              Results
            </p>
            <p className="mt-4 font-mono text-cream">
              This run ·{" "}
              <span className="text-xl font-semibold text-neon tabular-nums">
                {runTotal}
              </span>{" "}
              pts
            </p>
            <p className="mt-2 font-mono text-sm text-cream/75">
              Career total ·{" "}
              <span className="tabular-nums text-cream">{displayScore}</span> pts ·
              best streak ·{" "}
              <span className="tabular-nums">
                {userRow?.bestStreak ?? user.bestStreak ?? 0}
              </span>
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="font-grotesk text-lg uppercase tracking-wide text-cream">
              Review — answers & explanations
            </h3>
            <ul className="space-y-4">
              {results.map((row, i) => (
                <li
                  key={`${row.id}-${i}`}
                  className={`liquid-glass rounded-[24px] border p-6 text-left transition-all backdrop-blur-lg ${
                    row.correct
                      ? "border-emerald-500/30 [--glass-bg:rgba(0,0,0,0.66)] [--glass-bg-accent:rgba(16,185,129,0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                      : "border-rose-500/30 [--glass-bg:rgba(0,0,0,0.75)] [--glass-bg-accent:rgba(244,63,94,0.08)] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-cream/50">
                      Q{i + 1}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${
                        row.correct
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-rose-500/20 text-rose-200"
                      }`}
                    >
                      {row.correct ? "Correct" : "Miss"}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-cream/45">
                      {row.type}
                    </span>
                    {row.pointsEarned > 0 ? (
                      <span className="ml-auto font-mono text-xs text-neon">
                        +{row.pointsEarned} pts
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-grotesk text-base leading-snug text-cream">
                    {row.question}
                  </p>
                  <p className="mt-3 font-mono text-sm text-cream/85">
                    <span className="text-cream/50">Your answer: </span>
                    {row.userAnswer}
                  </p>
                  <p className="mt-1 font-mono text-sm text-cream">
                    <span className="text-cream/50">Correct: </span>
                    {row.correctAnswer}
                  </p>
                  {row.explanation ? (
                    <p className="mt-3 border-t border-white/10 pt-3 font-mono text-sm leading-relaxed text-cream/75">
                      {row.explanation}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/play"
              className="liquid-glass rounded-[12px] bg-pink px-5 py-3 text-center font-grotesk uppercase text-cream hover:bg-white/10"
            >
              Play again
            </Link>
            <Link
              href="/dashboard"
              className="rounded-[12px] bg-neon px-5 py-3 text-center font-grotesk uppercase text-[#010828] hover:brightness-110"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!q || !qJson) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  const displayScore = userRow?.score ?? user.score ?? 0;

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/Game-bg.png)' }}
      />
      
      {/* Texture overlay */}
      <div
        className="fixed inset-0 z-5 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'url(/texture.png)',
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(111,255,0,0.06), transparent 70%)",
        }}
      />

      <header className="relative z-40 flex flex-wrap items-center gap-3 border-b border-white/15 liquid-glass px-4 py-3">
        <Link
          href="/play"
          className="shrink-0 font-mono text-xs font-medium text-neon hover:underline"
        >
          ← Lobby
        </Link>
        {useFixedTimer ? (
          <span className="rounded-full bg-neon/15 px-2 py-0.5 font-mono text-[10px] uppercase text-neon">
            {FIXED_TIMER_SEC}s mode
          </span>
        ) : null}
        <GameHud
          score={displayScore}
          streak={streak}
          bestStreak={userRow?.bestStreak ?? user.bestStreak ?? 0}
          questionIndex={index}
          totalQuestions={questions.length}
          secondsLeft={secondsLeft}
          phase="running"
        />
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-10">
        <div className="mx-auto max-w-3xl space-y-5">
          {feedback ? (
            <div
              className={`liquid-glass rounded-[18px] px-5 py-4 font-mono text-sm shadow-lg ${
                feedback.correct
                  ? "border-emerald-400/50 text-emerald-100"
                  : "border-rose-400/45 text-rose-50"
              }`}
            >
              <p className="font-grotesk text-lg uppercase tracking-wide text-cream">
                {feedback.correct ? "Correct" : "Not quite"}
              </p>
              {feedback.pointsEarned > 0 ? (
                <p className="mt-2 text-cream/90">
                  +{feedback.pointsEarned} pts
                  {feedback.correct ? " (speed bonus may apply)" : ""}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-cream/70">
                Full answers and explanations appear after the last question.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  advance();
                }}
                className="mt-5 w-full rounded-[12px] bg-neon py-3.5 font-grotesk uppercase tracking-wide text-[#010828] hover:brightness-110"
              >
                {index + 1 >= questions.length ? "See results" : "Next question"}
              </button>
            </div>
          ) : null}

          {!feedback ? (
            <div className="liquid-glass rounded-[28px] border border-white/10 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)] sm:p-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cream/90">
                  {q.type}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-cream/55">
                  {q.category}
                </span>
                {q.topic ? (
                  <span className="font-mono text-[10px] text-cream/45">
                    · {q.topic}
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-[10px] text-cream/45">
                  {useFixedTimer
                    ? `${FIXED_TIMER_SEC}s limit`
                    : `${qJson.timeLimit}s limit`}
                </span>
              </div>
              {q.type !== "debug" &&
              !(q.type === "math" && (!q.options || q.options.length === 0)) ? (
                <h2 className="font-grotesk mt-4 text-xl leading-snug text-cream sm:text-2xl">
                  {q.question}
                </h2>
              ) : null}

              <div className="mt-6">
                <QuestionRenderer
                  question={q as PublicQuestion}
                  value={answer}
                  onChange={setAnswer}
                  disabled={submitting || !!feedback}
                />
              </div>

              <button
                type="button"
                disabled={submitting || !answer.trim() || !!feedback}
                onClick={() => void onSubmit(false)}
                className="mt-8 w-full rounded-[14px] bg-neon py-4 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_28px_rgba(111,255,0,0.25)] hover:brightness-110 disabled:opacity-40"
              >
                {submitting ? "Checking…" : "Lock in answer"}
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function PlayRunPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
          <p className="font-mono text-cream/60 text-sm">Loading…</p>
        </div>
      }
    >
      <PlayRunInner />
    </Suspense>
  );
}
