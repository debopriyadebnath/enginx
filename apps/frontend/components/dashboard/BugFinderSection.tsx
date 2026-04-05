"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bug, Terminal } from "lucide-react";
import { getAllConcepts } from "@/lib/codesPack";
import { MascotCountdown } from "./MascotCountdown";

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
    <section id="bug-finder" className="mb-10 scroll-mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Bug className="text-amber-400" size={18} />
        <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">
          CS fundamentals · Bug finder
        </span>
      </div>

      <div className="liquid-glass relative [--glass-border-start:rgba(245,158,11,0.5)] [--glass-border-mid:rgba(245,158,11,0.15)] [--glass-bg:rgba(245,158,11,0.04)] [--glass-bg-accent:rgba(245,158,11,0.08)] overflow-hidden rounded-[24px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-8">
        <div
          className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="text-amber-300" size={24} />
              <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream sm:text-3xl">
                Bug finder
              </h2>
            </div>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-cream/70">
              Random challenges from{" "}
              <code className="rounded bg-white/10 px-1 text-[12px] text-amber-200/90">
                data/codes.json
              </code>
              . Read the snippet in the terminal, pick the token that fills the blank,
              then review explanations when you finish the run.
            </p>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-cream/55">
              <li>· Solo: filter by concept, fill blanks, review explanations</li>
              <li>· 1v1 live: same C challenges for both players (challenge or queue)</li>
            </ul>
          </div>

          <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
            <label className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Concept
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-amber-400/50 focus:outline-none"
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
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream tabular-nums focus:border-amber-400/50 focus:outline-none"
            />

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => start()}
                className="w-full rounded-[14px] bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_24px_rgba(245,158,11,0.25)] transition hover:brightness-110"
              >
                Solo run
              </button>
              <button
                type="button"
                onClick={() => goMulti()}
                className="w-full rounded-[14px] border border-amber-400/50 bg-amber-500/10 py-3 font-grotesk uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/20"
              >
                1v1 live (multiplayer)
              </button>
            </div>
          </div>
        </div>
      </div>
      {showCountdown && <MascotCountdown onComplete={handleCountdownComplete} />}
    </section>
  );
}
