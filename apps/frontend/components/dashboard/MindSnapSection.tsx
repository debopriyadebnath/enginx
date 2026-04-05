"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Brain } from "lucide-react";
import { getDepartments, getDifficulties } from "@/lib/mindSnapPack";
import { motion } from "framer-motion";

export function MindSnapSection() {
  const router = useRouter();
  const departments = useMemo(() => ["all", ...getDepartments()], []);
  const difficulties = useMemo(() => ["all", ...getDifficulties()] as const, []);
  const [department, setDepartment] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<number | "all">("all");

  function play() {
    const q = new URLSearchParams();
    if (department !== "all") q.set("dept", department);
    if (difficulty !== "all") q.set("diff", String(difficulty));
    router.push(`/play/mind-snap?${q.toString()}`);
  }

  return (
    <motion.section 
      id="mind-snap" 
      className="mb-10 scroll-mt-8"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Brain className="text-cyan-400" size={18} />
        <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">
          Memory · Mind Snap
        </span>
      </div>

      <motion.div 
        whileHover={{ scale: 1.005 }}
        className="liquid-glass group relative [--glass-border-start:rgba(34,211,238,0.5)] [--glass-border-mid:rgba(34,211,238,0.15)] [--glass-bg:rgba(34,211,238,0.04)] [--glass-bg-accent:rgba(34,211,238,0.08)] overflow-hidden rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[0_20px_80px_rgba(34,211,238,0.1)] hover:[--glass-bg:rgba(34,211,238,0.07)] hover:[--glass-border-start:rgba(34,211,238,0.7)] md:p-8"
      >
        <div
          className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl transition-opacity group-hover:opacity-100"
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream sm:text-3xl">
              Mind <span className="text-cyan-400">Snap</span>
            </h2>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-cream/70">
              Memorize a 4×4 grid during the flash phase, then tap the cells that
              match <code className="rounded bg-cyan-400/10 px-1 text-cyan-200/90 font-bold border border-cyan-400/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">correctCells</code>{" "}
              from <code className="rounded bg-white/10 px-1 border border-white/10">packages/suduku.json</code>.
              Scoring uses each puzzle&apos;s rules: bonuses for right taps, penalties for
              wrong taps and missed targets.
            </p>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-cream/55">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                Adaptive difficulty based on your solve speed
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                Global leaderboard sync for cognitive mastery
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
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-cyan-400/50 focus:outline-none transition-all hover:bg-[#010828]/90 cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </option>
              ))}
            </select>

            <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Difficulty
            </label>
            <select
              value={difficulty === "all" ? "all" : String(difficulty)}
              onChange={(e) => {
                const v = e.target.value;
                setDifficulty(v === "all" ? "all" : Number(v));
              }}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-cyan-400/50 focus:outline-none transition-all hover:bg-[#010828]/90 cursor-pointer"
            >
              <option value="all">All levels</option>
              {getDifficulties().map((d) => (
                <option key={d} value={String(d)}>
                  Level {d}
                </option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={play}
              className="mt-5 w-full rounded-[14px] bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_24px_rgba(34,211,238,0.25)] transition-all hover:brightness-110 font-bold active:shadow-inner"
            >
              Play Mind Snap
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}
