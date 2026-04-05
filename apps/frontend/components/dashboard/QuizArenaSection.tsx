"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Sparkles, Timer } from "lucide-react";
import {
  QUIZ_CATEGORY_OPTIONS,
  type QuizCategoryId,
  buildPlayRunQuery,
} from "@/lib/quizLobby";
import { MascotCountdown } from "./MascotCountdown";
import { motion } from "framer-motion";

export function QuizArenaSection() {
  const router = useRouter();
  const [category, setCategory] = useState<QuizCategoryId>("math");
  const [count, setCount] = useState(5);
  const [useTimer, setUseTimer] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

  function start() {
    setShowCountdown(true);
  }

  function handleCountdownComplete() {
    const qs = buildPlayRunQuery(category, count, useTimer);
    router.push(`/play/run?${qs}`);
  }

  return (
    <motion.section 
      id="quiz-arena" 
      className="mb-10 scroll-mt-8"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-neon" size={18} />
          <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">
            Quiz Arena
          </span>
        </div>
        <span className="hidden font-mono text-[10px] text-cream/40 sm:inline">
          Category-only · review at end
        </span>
      </div>

      <motion.div 
        whileHover={{ scale: 1.005 }}
        className="liquid-glass group relative [--glass-border-start:rgba(111,255,0,0.6)] [--glass-border-mid:rgba(111,255,0,0.15)] [--glass-bg:rgba(111,255,0,0.05)] [--glass-bg-accent:rgba(111,255,0,0.1)] overflow-hidden rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[0_20px_80px_rgba(111,255,0,0.1)] hover:[--glass-bg:rgba(111,255,0,0.08)] hover:[--glass-border-start:rgba(111,255,0,0.8)] md:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#6FFF00]/10 blur-3xl transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="text-neon" size={22} />
              <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream sm:text-3xl">
                Engineering <span className="text-neon">quiz</span>
              </h2>
            </div>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-cream/70">
              Pick a topic and run length. Questions come from your JSON pack for
              that category only. Optional 10s timer per question. Full answers and
              explanations unlock when you finish the run.
            </p>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-cream/55">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-neon rounded-full" />
                Points and streaks sync to your profile
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-neon rounded-full" />
                Leaderboard updates on the right →
              </li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="liquid-glass rounded-[20px] border border-white/10 p-5 backdrop-blur-sm"
          >
            <label className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as QuizCategoryId)
              }
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/60 px-4 py-3 font-mono text-sm text-cream focus:border-[#6FFF00]/50 focus:outline-none transition-all hover:bg-[#010828]/80 cursor-pointer"
            >
              {QUIZ_CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Questions
            </label>
            <input
              type="number"
              min={1}
              max={25}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/60 px-4 py-3 font-mono text-sm text-cream tabular-nums focus:border-[#6FFF00]/50 focus:outline-none transition-all hover:bg-[#010828]/80"
            />

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-3 hover:bg-white/[0.08] transition-colors">
              <input
                type="checkbox"
                checked={useTimer}
                onChange={(e) => setUseTimer(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 bg-white/10 text-[#6FFF00] focus:ring-[#6FFF00]/40"
              />
              <span className="flex items-start gap-2">
                <Timer size={16} className="mt-0.5 shrink-0 text-cream/70" />
                <span>
                  <span className="font-mono text-sm font-medium text-cream">
                    10s timer per question
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-cream/50">
                    Off = use each question&apos;s time from the pack
                  </span>
                </span>
              </span>
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => start()}
              className="mt-5 w-full rounded-[14px] bg-[#6FFF00] py-3.5 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_28px_rgba(111,255,0,0.2)] transition-all hover:brightness-110 font-bold"
            >
              Start run
            </motion.button>
            <Link
              href="/play/multi"
              className="mt-3 block text-center font-mono text-xs text-neon/90 underline-offset-4 hover:underline transition-all hover:text-neon"
            >
              Or play 1v1 multiplayer →
            </Link>
          </motion.div>
        </div>
      </motion.div>
      {showCountdown && <MascotCountdown onComplete={handleCountdownComplete} />}
    </motion.section>
  );
}
