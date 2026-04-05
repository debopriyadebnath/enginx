"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bug, Terminal } from "lucide-react";
import { getAllConcepts } from "@/lib/codesPack";
import { MascotCountdown } from "./MascotCountdown";
import { motion } from "framer-motion";


export function BugFinderSection() {
  const router = useRouter();
  const concepts = useMemo(() => ["all", ...getAllConcepts()], []);
  const [concept, setConcept] = useState<string>("all");
  const [count, setCount] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);

  function start() {
    setShowCountdown(true);
  }

  function handleCountdownComplete() {
    const q = new URLSearchParams({ count: String(count) });
    if (concept !== "all") q.set("concept", concept);
    router.push(`/play/bug-finder?${q.toString()}`);
  }

  function goMulti() {
    router.push("/play/bug-finder/multi");
  }

  return (
    <motion.section 
      id="bug-finder" 
      className="mb-10 scroll-mt-8"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Bug className="text-amber-400" size={18} />
        <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">
          CS fundamentals · Bug finder
        </span>
      </div>

      <motion.div 
        whileHover={{ scale: 1.005 }}
        className="liquid-glass group relative [--glass-border-start:rgba(245,158,11,0.5)] [--glass-border-mid:rgba(245,158,11,0.15)] [--glass-bg:rgba(245,158,11,0.04)] [--glass-bg-accent:rgba(245,158,11,0.08)] overflow-hidden rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:shadow-[0_20px_80px_rgba(245,158,11,0.08)] hover:[--glass-bg:rgba(245,158,11,0.07)] hover:[--glass-border-start:rgba(245,158,11,0.7)] md:p-8"
      >
        <div
          className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl transition-opacity group-hover:opacity-100"
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <Terminal className="text-amber-300" size={24} />
              <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream sm:text-3xl">
                Bug <span className="text-amber-400">finder</span>
              </h2>
            </div>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-cream/70">
              Random challenges from{" "}
              <code className="rounded bg-amber-400/10 px-1 text-[12px] text-amber-200/90 font-bold border border-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                data/codes.json
              </code>
              . Read the snippet in the terminal, pick the token that fills the blank,
              then review explanations when you finish the run.
            </p>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-cream/55">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-amber-400 rounded-full" />
                Solo: filter by concept, fill blanks, review explanations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 bg-amber-400 rounded-full" />
                1v1 live: same C challenges for both players (challenge or queue)
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
              Concept
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-amber-400/50 focus:outline-none transition-all hover:bg-[#010828]/90 cursor-pointer"
            >
              {concepts.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All concepts" : c}
                </option>
              ))}
            </select>

            <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Challenges
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream tabular-nums focus:border-amber-400/50 focus:outline-none transition-all hover:bg-[#010828]/90"
            />

            <div className="mt-5 flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => start()}
                className="w-full rounded-[14px] bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_24px_rgba(245,158,11,0.25)] transition-all hover:brightness-110 font-bold active:shadow-inner"
              >
                Solo run
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => goMulti()}
                className="w-full rounded-[14px] border border-amber-400/50 bg-amber-500/10 py-3 font-grotesk uppercase tracking-wide text-amber-100 transition-all hover:bg-amber-500/20 font-medium"
              >
                1v1 live (multiplayer)
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      {showCountdown && <MascotCountdown onComplete={handleCountdownComplete} />}
    </motion.section>
  );
}
