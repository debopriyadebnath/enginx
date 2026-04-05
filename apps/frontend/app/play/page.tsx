"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthState } from "@/lib/auth";
import {
  QUIZ_CATEGORY_OPTIONS,
  type QuizCategoryId,
  buildPlayRunQuery,
} from "@/lib/quizLobby";
import { useSession } from "@/lib/session";

export default function PlayLobbyPage() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated } = useAuthState();
  const [category, setCategory] = useState<QuizCategoryId>("math");
  const [count, setCount] = useState(5);
  const [useTimer, setUseTimer] = useState(false);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]">
        <p className="font-mono text-cream/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  function handleStart() {
    router.push(`/play/run?${buildPlayRunQuery(category, count, useTimer)}`);
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#010828] px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundColor: '#010828',
          backgroundSize: "cover",
          mixBlendMode: "lighten",
        }}
      />
      <div className="relative z-10 mx-auto max-w-lg">
        <Link
          href="/dashboard"
          className="font-mono text-sm text-neon hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-anton mt-6 text-3xl uppercase text-cream">
          Quiz Arena
        </h1>
        <p className="mt-2 font-mono text-sm leading-relaxed text-cream/70">
          Solo runs use your JSON pack by category. Live 1v1 uses the same pools
          on the game server—queue for a quick match with another signed-in
          player.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cream/50">
              Mode
            </p>
            <h2 className="font-grotesk mt-2 text-lg text-cream">Solo practice</h2>
            <p className="mt-2 font-mono text-xs leading-relaxed text-cream/60">
              Category, count, optional fixed timer. Points save to your profile.
            </p>
          </div>
          <Link
            href="/play/multi"
            className="liquid-glass group block rounded-[20px] border border-neon/25 bg-neon/[0.06] p-5 transition hover:border-neon/50"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-neon/80">
              Mode
            </p>
            <h2 className="font-grotesk mt-2 text-lg text-cream group-hover:text-neon">
              1v1 multiplayer
            </h2>
            <p className="mt-2 font-mono text-xs leading-relaxed text-cream/60">
              Real-time matchmaking · server-timed rounds · live leaderboard
            </p>
            <span className="mt-3 inline-block font-mono text-xs text-neon">
              Open arena →
            </span>
          </Link>
        </div>

        <div className="liquid-glass mt-8 space-y-6 rounded-[24px] border border-white/10 p-6">
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-cream/50">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as QuizCategoryId)
              }
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-cream"
            >
              {QUIZ_CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-cream/50">
              Questions
            </label>
            <input
              type="number"
              min={1}
              max={25}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-cream"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <input
              type="checkbox"
              checked={useTimer}
              onChange={(e) => setUseTimer(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-neon focus:ring-neon/40"
            />
            <span>
              <span className="font-mono text-sm font-medium text-cream">
                10-second timer per question
              </span>
              <span className="mt-1 block font-mono text-xs text-cream/55">
                When off, each question uses its own time limit from the pack.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => handleStart()}
            className="w-full rounded-[12px] bg-neon px-4 py-3 font-anton uppercase text-[#010828] hover:brightness-110"
          >
            Start quiz
          </button>
        </div>
      </div>
    </div>
  );
}
