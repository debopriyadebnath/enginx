"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthState } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { motion } from "framer-motion";
import { Trophy, Swords, Users, ChevronRight, Zap, Bug, BarChart2, Cpu } from "lucide-react";

const MODES = [
  {
    title: "1v1 Quiz Battle",
    description: "10 rounds of rapid-fire questions. First to most correct answers wins.",
    icon: Swords,
    href: "/play/multi",
    accentColor: "#6FFF00",
    glowColor: "rgba(111,255,0,0.3)",
    tag: "LIVE",
    tagColor: "bg-[#6FFF00]/20 text-neon",
  },
  {
    title: "1v1 Bug Finder",
    description: "Both players get the same code challenges. Race to solve more accurately.",
    icon: Bug,
    href: "/play/bug-finder/multi",
    accentColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.3)",
    tag: "LIVE",
    tagColor: "bg-amber-500/20 text-amber-300",
  },
  {
    title: "Solo Big-O Sprint",
    description: "Beat the clock on complexity drills. Post your score to the leaderboard.",
    icon: BarChart2,
    href: "/play/big-o-sprint",
    accentColor: "#6FFF00",
    glowColor: "rgba(111,255,0,0.2)",
    tag: "SCORE ATTACK",
    tagColor: "bg-white/10 text-cream/60",
  },
  {
    title: "Solo Bit Twiddler",
    description: "Bitwise puzzles against the timer. How deep does your bit-fu go?",
    icon: Cpu,
    href: "/play/bit-twiddler",
    accentColor: "#b724ff",
    glowColor: "rgba(183,36,255,0.2)",
    tag: "SCORE ATTACK",
    tagColor: "bg-white/10 text-cream/60",
  },
];

export default function CompetePage() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const leaderboard = useQuery(api.quizGame.getLeaderboard, { limit: 10 });
  const userRow = useQuery(api.users.getCurrentUser, token ? { sessionToken: token } : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]"><p className="font-mono text-cream/60 text-sm">Loading…</p></div>;
  }

  const displayScore = userRow?.score ?? user?.score ?? 0;
  const displayName = user?.name ?? user?.email ?? "Player";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#010828]">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-25" style={{ backgroundImage: "url(/Game-bg.png)" }} />
      <div className="fixed inset-0 z-5 pointer-events-none opacity-[0.05]" style={{ backgroundImage: "url(/texture.png)", backgroundSize: "200px 200px" }} />
      <div className="pointer-events-none fixed inset-0 z-6 opacity-30" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(111,255,0,0.05), transparent 60%)" }} />

      <header className="sticky top-0 z-40 border-b border-white/10 liquid-glass px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-mono text-xs text-neon hover:underline">← Dashboard</Link>
            <span className="font-grotesk text-sm text-cream/60 uppercase tracking-wider">Compete</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-neon">{displayScore} pts</span>
            <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-cream/60 hidden sm:inline-flex">🔥 {userRow?.bestStreak ?? 0}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 pb-20">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <h1 className="font-grotesk text-4xl uppercase text-cream sm:text-5xl">Compete</h1>
          <p className="font-mono text-sm text-cream/55 mt-2">
            Challenge players, post scores, and climb the global leaderboard.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game modes column */}
          <div className="lg:col-span-2 space-y-4">
            <span className="font-grotesk text-[11px] text-cream/50 uppercase tracking-widest">Game Modes</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {MODES.map((mode, i) => {
                const Icon = mode.icon;
                return (
                  <motion.div
                    key={mode.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      href={mode.href}
                      className="liquid-glass rounded-[20px] border border-white/10 p-5 flex flex-col gap-3 hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-300 group block"
                      style={{ ["--glow" as string]: mode.glowColor }}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                          style={{ background: `${mode.glowColor.replace("0.3", "0.15")}`, boxShadow: `0 0 20px ${mode.glowColor}` }}
                        >
                          <Icon size={22} style={{ color: mode.accentColor }} />
                        </div>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${mode.tagColor}`}>{mode.tag}</span>
                      </div>
                      <div>
                        <p className="font-grotesk text-[15px] text-cream uppercase group-hover:text-neon transition-colors">{mode.title}</p>
                        <p className="font-mono text-xs text-cream/50 mt-1 leading-relaxed">{mode.description}</p>
                      </div>
                      <div className="flex items-center justify-end mt-auto pt-2 border-t border-white/5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1"
                          style={{ background: `${mode.glowColor.replace("0.3", "0.2")}` }}
                        >
                          <ChevronRight size={14} style={{ color: mode.accentColor }} />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Challenge a friend CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="liquid-glass rounded-[20px] border border-white/10 p-5 flex items-center gap-4 mt-4 [--glass-bg:rgba(111,255,0,0.03)]"
            >
              <div className="w-12 h-12 rounded-[14px] bg-[#6FFF00]/10 flex items-center justify-center shrink-0">
                <Users size={22} className="text-neon" />
              </div>
              <div className="flex-1">
                <p className="font-grotesk text-[15px] text-cream uppercase">Challenge a friend</p>
                <p className="font-mono text-xs text-cream/50 mt-0.5">See who&apos;s online on the dashboard and send a direct challenge.</p>
              </div>
              <Link href="/dashboard" className="shrink-0 rounded-[10px] bg-[#6FFF00]/10 border border-neon/30 px-3 py-2 font-grotesk text-xs uppercase text-neon hover:bg-[#6FFF00]/20 transition-colors">
                Go →
              </Link>
            </motion.div>
          </div>

          {/* Leaderboard column */}
          <div className="space-y-4">
            <span className="font-grotesk text-[11px] text-cream/50 uppercase tracking-widest">Leaderboard</span>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="liquid-glass rounded-[20px] border border-white/10 p-5 mt-3 [--glass-border-start:rgba(111,255,0,0.2)]"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <span className="font-grotesk text-[13px] uppercase text-cream">Top Players</span>
                <Trophy size={16} className="text-neon" />
              </div>

              {leaderboard && leaderboard.length > 0 ? (
                <ul className="space-y-1">
                  {leaderboard.map((row, i) => {
                    const isMe = row.name === displayName;
                    return (
                      <li
                        key={row.userId}
                        className={`flex items-center justify-between font-mono text-xs rounded-lg px-2 py-2 transition-all ${
                          isMe
                            ? "bg-[#6FFF00]/10 border border-neon/20"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate pr-2 flex items-center gap-2">
                          <span className={
                            i === 0 ? "text-yellow-400 font-bold w-5 text-center" :
                            i === 1 ? "text-slate-300 font-bold w-5 text-center" :
                            i === 2 ? "text-amber-600 font-bold w-5 text-center" :
                            "text-cream/40 w-5 text-center"
                          }>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                          </span>
                          <span className={isMe ? "text-neon" : "text-cream/80"}>{row.name}</span>
                          {isMe && <span className="text-[9px] text-neon/60 ml-1">(you)</span>}
                        </span>
                        <span className="shrink-0 text-neon font-medium">{row.score}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="font-mono text-xs text-cream/40 text-center py-4">No scores yet — play to get on the board!</p>
              )}

              <div className="mt-4 pt-3 border-t border-white/5 text-center">
                <p className="font-mono text-[10px] text-cream/40">Updates after quiz and bug-finder runs.</p>
              </div>
            </motion.div>

            {/* Your rank card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="liquid-glass rounded-[20px] border border-white/10 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#6FFF00]/10 flex items-center justify-center font-grotesk text-sm text-neon">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-grotesk text-[13px] text-cream uppercase truncate max-w-[140px]">{displayName}</p>
                  <p className="font-mono text-[11px] text-neon">{displayScore} pts</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-white/5 p-3 text-center">
                  <p className="font-mono text-xs text-cream/40">Best Streak</p>
                  <p className="font-grotesk text-xl text-cream mt-0.5">🔥 {userRow?.bestStreak ?? 0}</p>
                </div>
                <div className="rounded-[12px] bg-white/5 p-3 text-center">
                  <p className="font-mono text-xs text-cream/40">Total XP</p>
                  <p className="font-grotesk text-xl text-yellow-400 mt-0.5">⭐ 35</p>
                </div>
              </div>
              <Link
                href="/play/multi"
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-[12px] bg-[#6FFF00]/10 border border-neon/20 py-2.5 font-grotesk text-xs uppercase text-neon hover:bg-[#6FFF00]/20 transition-colors"
              >
                <Zap size={14} /> Quick Match
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
