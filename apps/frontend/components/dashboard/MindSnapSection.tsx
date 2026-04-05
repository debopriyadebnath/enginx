"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Brain } from "lucide-react";
import { getDepartments, getDifficulties } from "@/lib/mindSnapPack";

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
    <section id="mind-snap" className="mb-10 scroll-mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="text-cyan-400" size={18} />
        <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">
          Memory · Mind Snap
        </span>
      </div>

      <div className="liquid-glass relative overflow-hidden rounded-[24px] border border-cyan-500/20 bg-cyan-500/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-8">
        <div
          className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-center">
          <div>
            <h2 className="font-grotesk text-2xl uppercase tracking-wide text-cream sm:text-3xl">
              Mind Snap
            </h2>
            <p className="mt-3 max-w-xl font-mono text-sm leading-relaxed text-cream/70">
              Memorize a 4×4 grid during the flash phase, then tap the cells that
              match <code className="rounded bg-white/10 px-1 text-cyan-200/90">correctCells</code>{" "}
              from <code className="rounded bg-white/10 px-1">packages/suduku.json</code>.
              Scoring uses each puzzle&apos;s rules: bonuses for right taps, penalties for
              wrong taps and missed targets.
            </p>
          </div>

          <div className="liquid-glass rounded-[20px] border border-white/10 p-5">
            <label className="font-mono text-[10px] uppercase tracking-wider text-cream/50">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-cyan-400/50 focus:outline-none"
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
              className="mt-2 w-full rounded-[12px] border border-white/15 bg-[#010828]/70 px-4 py-3 font-mono text-sm text-cream focus:border-cyan-400/50 focus:outline-none"
            >
              <option value="all">All levels</option>
              {getDifficulties().map((d) => (
                <option key={d} value={String(d)}>
                  Level {d}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={play}
              className="mt-5 w-full rounded-[14px] bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 font-grotesk uppercase tracking-wide text-[#010828] shadow-[0_0_24px_rgba(34,211,238,0.25)] transition hover:brightness-110"
            >
              Play Mind Snap
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
