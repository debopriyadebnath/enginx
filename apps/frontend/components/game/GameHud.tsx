"use client";

type Props = {
  score: number;
  streak: number;
  bestStreak: number;
  questionIndex: number;
  totalQuestions: number;
  secondsLeft: number;
  phase: string;
};

export function GameHud({
  score,
  streak,
  bestStreak,
  questionIndex,
  totalQuestions,
  secondsLeft,
  phase,
}: Props) {
  const progress =
    totalQuestions > 0
      ? Math.min(100, ((questionIndex + 1) / totalQuestions) * 100)
      : 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <div className="hidden h-1.5 w-full min-w-[120px] max-w-[200px] overflow-hidden rounded-full bg-white/10 sm:block">
        <div
          className="h-full rounded-full bg-neon transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 font-mono text-xs">
        <span className="liquid-glass rounded-full px-3 py-1.5 font-semibold text-neon">
          ⚡ {score} pts
        </span>
        <span className="liquid-glass rounded-full px-3 py-1.5 text-cream">
          🔥 {streak}
          {bestStreak > 0 ? (
            <span className="text-cream/70"> · best {bestStreak}</span>
          ) : null}
        </span>
        <span className="liquid-glass rounded-full px-3 py-1.5 text-cream tabular-nums">
          Q {Math.min(questionIndex + 1, totalQuestions)}/{totalQuestions}
        </span>
        <span
          className={`rounded-full px-3 py-1.5 tabular-nums ${
            secondsLeft <= 5
              ? "bg-red-500/25 font-semibold text-red-200 ring-1 ring-red-400/40"
              : "liquid-glass text-cream"
          }`}
        >
          ⏱ {Math.max(0, secondsLeft)}s
        </span>
        <span className="text-cream/60 uppercase tracking-wider">{phase}</span>
      </div>
    </div>
  );
}
