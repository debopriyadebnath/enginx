"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthState } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Zap, Bug, Brain, Cpu, BarChart2, Layers, Trophy } from "lucide-react";

type Quest = {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  xp: number;
  href: string;
  completed: boolean;
  type: "daily" | "weekly";
  accentColor: string;
  glowColor: string;
};

const DAILY_QUESTS: Quest[] = [
  {
    id: "q1",
    icon: Zap,
    name: "Speed Quiz",
    description: "Complete a 10-round quiz battle.",
    xp: 50,
    href: "/play",
    completed: false,
    type: "daily",
    accentColor: "text-neon",
    glowColor: "rgba(111,255,0,0.3)",
  },
  {
    id: "q2",
    icon: Bug,
    name: "Bug Hunter",
    description: "Solve 5 bug-finder challenges.",
    xp: 40,
    href: "/play/bug-finder",
    completed: false,
    type: "daily",
    accentColor: "text-amber-300",
    glowColor: "rgba(245,158,11,0.3)",
  },
  {
    id: "q3",
    icon: Brain,
    name: "Mind Snap",
    description: "Complete one Mind Snap round.",
    xp: 30,
    href: "/play/mind-snap",
    completed: true,
    type: "daily",
    accentColor: "text-cyan-400",
    glowColor: "rgba(6,182,212,0.3)",
  },
  {
    id: "q4",
    icon: BarChart2,
    name: "Big-O Sprint",
    description: "Complete a full Big-O Sprint run.",
    xp: 60,
    href: "/play/big-o-sprint",
    completed: false,
    type: "daily",
    accentColor: "text-neon",
    glowColor: "rgba(111,255,0,0.3)",
  },
];

const WEEKLY_QUESTS: Quest[] = [
  {
    id: "wq1",
    icon: Cpu,
    name: "Bit Twiddler Master",
    description: "Score 500+ pts across Bit Twiddler sessions this week.",
    xp: 200,
    href: "/play/bit-twiddler",
    completed: false,
    type: "weekly",
    accentColor: "text-purple-400",
    glowColor: "rgba(183,36,255,0.3)",
  },
  {
    id: "wq2",
    icon: Layers,
    name: "Memory Architect",
    description: "Complete 3 Struct Pad runs.",
    xp: 150,
    href: "/play/struct-pad",
    completed: false,
    type: "weekly",
    accentColor: "text-sky-400",
    glowColor: "rgba(56,189,248,0.3)",
  },
  {
    id: "wq3",
    icon: Trophy,
    name: "Multiplayer Victor",
    description: "Win 2 multiplayer Bug Finder matches.",
    xp: 250,
    href: "/play/bug-finder/multi",
    completed: false,
    type: "weekly",
    accentColor: "text-yellow-400",
    glowColor: "rgba(250,204,21,0.3)",
  },
];

function QuestCard({ quest }: { quest: Quest }) {
  const Icon = quest.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`liquid-glass rounded-[20px] border p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-0.5 ${
        quest.completed
          ? "border-emerald-500/30 [--glass-bg:rgba(16,185,129,0.05)]"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div
        className={`shrink-0 w-12 h-12 rounded-[14px] flex items-center justify-center ${
          quest.completed ? "bg-emerald-500/20" : "bg-white/5"
        }`}
        style={quest.completed ? {} : { boxShadow: `0 0 20px ${quest.glowColor}`, background: `rgba(0,0,0,0.3)` }}
      >
        {quest.completed ? (
          <CheckCircle size={22} className="text-emerald-400" />
        ) : (
          <Icon size={22} className={quest.accentColor} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-grotesk text-[15px] text-cream uppercase">{quest.name}</p>
          <span className={`shrink-0 font-mono text-xs px-2 py-0.5 rounded-full ${quest.completed ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-cream/50"}`}>
            +{quest.xp} XP
          </span>
        </div>
        <p className="font-mono text-xs text-cream/55 mt-1 leading-relaxed">{quest.description}</p>

        {quest.completed ? (
          <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <CheckCircle size={12} /> Completed
          </span>
        ) : (
          <Link
            href={quest.href}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] rounded-lg px-3 py-1.5 transition-all"
            style={{ background: `${quest.glowColor.replace("0.3", "0.15")}`, color: "white", border: `1px solid ${quest.glowColor.replace("0.3", "0.4")}` }}
          >
            Play now →
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function QuestsPage() {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const userRow = useQuery(api.users.getCurrentUser, token ? { sessionToken: token } : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#010828]"><p className="font-mono text-cream/60 text-sm">Loading…</p></div>;
  }

  const displayScore = userRow?.score ?? user?.score ?? 0;
  const completedCount = [...DAILY_QUESTS, ...WEEKLY_QUESTS].filter((q) => q.completed).length;
  const totalCount = DAILY_QUESTS.length + WEEKLY_QUESTS.length;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#010828]">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url(/Game-bg.png)" }} />
      <div className="fixed inset-0 z-5 pointer-events-none opacity-[0.05]" style={{ backgroundImage: "url(/texture.png)", backgroundSize: "200px 200px" }} />
      <div className="pointer-events-none fixed inset-0 z-6 opacity-30" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(183,36,255,0.06), transparent 60%)" }} />

      <header className="sticky top-0 z-40 border-b border-white/10 liquid-glass px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-mono text-xs text-neon hover:underline">← Dashboard</Link>
            <span className="font-grotesk text-sm text-cream/60 uppercase tracking-wider">Daily Quests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-neon">{displayScore} pts</span>
            <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-yellow-400">⭐ 35 XP</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-8 pb-20">
        {/* Header section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-grotesk text-3xl uppercase text-cream">Quests</h1>
          <p className="font-mono text-sm text-cream/60 mt-1">Complete challenges to earn XP and climb the ranks.</p>
          {/* Progress summary */}
          <div className="mt-5 liquid-glass rounded-[18px] border border-white/10 p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-cream/60">Today&apos;s progress</span>
                <span className="font-mono text-xs text-neon">{completedCount}/{totalCount}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_8px_rgba(183,36,255,0.5)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400">
              <Clock size={14} />
              <span>Resets in 07:49</span>
            </div>
          </div>
        </motion.div>

        {/* Daily quests */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">Daily</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="font-mono text-[10px] text-cream/30">Resets at midnight</span>
          </div>
          <div className="space-y-3">
            {DAILY_QUESTS.map((quest, i) => (
              <motion.div key={quest.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <QuestCard quest={quest} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Weekly quests */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="font-grotesk text-[11px] uppercase tracking-widest text-cream/50">Weekly</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="font-mono text-[10px] text-cream/30">Resets Monday</span>
          </div>
          <div className="space-y-3">
            {WEEKLY_QUESTS.map((quest, i) => (
              <motion.div key={quest.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 + i * 0.08 }}>
                <QuestCard quest={quest} />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
