"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthState } from "@/lib/auth";
import { useAuthenticatedGameSocket } from "@/lib/socket";
import { useSession } from "@/lib/session";
import { QuizArenaSection } from "@/components/dashboard/QuizArenaSection";
import { BugFinderSection } from "@/components/dashboard/BugFinderSection";
import { MindSnapSection } from "@/components/dashboard/MindSnapSection";
import {
  Calculator, Code2, BarChart2, Grid3x3,
  Bot, Eye, Shield, TrendingUp,
  Zap, Search, Activity, Cpu,
  Bug, Layers, Swords, ChevronRight,
  CheckCircle, QrCode, Gamepad2, ClipboardList,
  Trophy, Radio, Users, Plus, Mic
} from 'lucide-react';
import { motion, useScroll, useTransform } from "framer-motion";

const NAV_ITEMS: {
  icon: typeof Gamepad2;
  label: string;
  active: boolean;
  scrollToQuiz?: boolean;
  href?: string;
}[] = [
  { icon: Gamepad2, label: "ARENA", active: true, scrollToQuiz: true },
  { icon: Mic, label: "VOICE HR", active: false, href: "/interview" },
  { icon: ClipboardList, label: "QUESTS", active: false },
  { icon: Trophy, label: "COMPETE", active: false },
  { icon: Radio, label: "FEED", active: false },
  { icon: Users, label: "GROUP PLAY", active: false },
  { icon: Plus, label: "MORE", active: false },
];

const CATEGORIES = ['MATH', 'AI/ML', 'CS FUNDAMENTALS', 'ELECTRONICS', 'BONUS'] as const;

type Category = typeof CATEGORIES[number];

interface GameCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  mode: 'SOLO' | 'MULTIPLAYER';
  scrollTo?: "bug-finder";
  href?: string;
}

const GAMES: Record<Category, { cursive: string; cards: GameCard[] }> = {
  MATH: {
    cursive: 'Math Games',
    cards: [
      { title: 'SPEED SOLVER', desc: 'Solve quick arithmetic questions against a timer.', icon: Calculator, mode: 'SOLO' },
      { title: 'EQUATION BUILDER', desc: 'Arrange numbers and operators to form a correct equation.', icon: Code2, mode: 'SOLO' },
      { title: 'GRAPH MATCH', desc: 'Match equations with their correct graphs.', icon: BarChart2, mode: 'SOLO' },
      { title: 'PUZZLE GRID', desc: 'Fill a grid following math rules or patterns.', icon: Grid3x3, mode: 'SOLO' },
    ],
  },
  'AI/ML': {
    cursive: 'AI/ML Games',
    cards: [
      { title: 'TRAIN THE BOT', desc: 'Give examples to train a simple AI and watch its accuracy improve.', icon: Bot, mode: 'SOLO' },
      { title: 'IMAGE GUESS AI', desc: 'Guess what the AI is recognizing from blurry, partial images.', icon: Eye, mode: 'SOLO' },
      { title: 'BIAS DETECTOR', desc: 'Identify biased vs unbiased datasets in real scenarios.', icon: Shield, mode: 'SOLO' },
      { title: 'PREDICTION GAME', desc: 'Guess outcomes based on data trends shown in charts.', icon: TrendingUp, mode: 'SOLO' },
    ],
  },
  'CS FUNDAMENTALS': {
    cursive: 'Code & logic',
    cards: [
      {
        title: 'BUG FINDER',
        desc: 'C snippets from codes.json — pick the missing token in the terminal.',
        icon: Bug,
        mode: 'SOLO',
        scrollTo: 'bug-finder',
      },
      { title: 'STRUCT PAD', desc: 'Coming soon — structs and memory layout quick checks.', icon: Layers, mode: 'SOLO' },
      { title: 'BIG-O SPRINT', desc: 'Coming soon — complexity drills against the clock.', icon: BarChart2, mode: 'SOLO' },
      { title: 'BIT TWIDDLER', desc: 'Coming soon — masks, shifts, and bitwise puzzles.', icon: Cpu, mode: 'SOLO' },
    ],
  },
  ELECTRONICS: {
    cursive: 'Electronics Games',
    cards: [
      { title: 'CIRCUIT BUILDER', desc: 'Drag and connect components to complete a working circuit.', icon: Zap, mode: 'SOLO' },
      { title: 'FAULT FINDER', desc: 'Identify what is wrong in a broken circuit diagram.', icon: Search, mode: 'SOLO' },
      { title: 'VOLTAGE RUNNER', desc: 'Guide current safely through paths avoiding overloads.', icon: Activity, mode: 'SOLO' },
      { title: 'COMPONENT MATCH', desc: 'Match electronic symbols with their real-world components.', icon: Cpu, mode: 'SOLO' },
    ],
  },
  BONUS: {
    cursive: 'Bonus Games',
    cards: [
      { title: 'DEBUG CHALLENGE', desc: 'Find errors in small code snippets before time runs out.', icon: Bug, mode: 'SOLO' },
      {
        title: 'MIND SNAP',
        desc: 'Memorize a 4×4 grid, then tap the correct cells — timing and scoring from suduku.json.',
        icon: Layers,
        mode: 'SOLO',
        href: '/play/mind-snap',
      },
      { title: 'QUIZ BATTLE', desc: 'Multiplayer rapid-fire subject quizzes against other players.', icon: Swords, mode: 'MULTIPLAYER' },
    ],
  },
};

const ICON_STYLES: Record<Category, { bg: string; text: string }> = {
  MATH: { bg: 'bg-gradient-to-br from-[#6FFF00]/20 to-[#6FFF00]/5', text: 'text-[#6FFF00]' },
  'AI/ML': { bg: 'bg-gradient-to-br from-[#b724ff]/20 to-[#7c3aed]/5', text: 'text-purple-400' },
  'CS FUNDAMENTALS': { bg: 'bg-gradient-to-br from-amber-400/25 to-orange-600/10', text: 'text-amber-300' },
  ELECTRONICS: { bg: 'bg-gradient-to-br from-yellow-400/20 to-orange-500/5', text: 'text-yellow-400' },
  BONUS: { bg: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/5', text: 'text-blue-400' },
};

const QUESTS = [
  { name: "Mini-Sudoku's Daily Challenge", progress: 0, total: 1 },
  { name: "Math's Daily Challenge", progress: 0, total: 1 },
  { name: "Mind Snap Duel", progress: 1, total: 1 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  },
};

const Home = () => {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const leaderboard = useQuery(api.quizGame.getLeaderboard, { limit: 8 });
  const { connected: socketConnected, error: socketError } =
    useAuthenticatedGameSocket();
  const [activeTab, setActiveTab] = useState<Category>("MATH");

  // Scroll Parallax logic
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 1000], [0, 250]);
  const orbY = useTransform(scrollY, [0, 1000], [0, -150]);
  const orbX = useTransform(scrollY, [0, 1000], [0, 100]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      void createOrUpdateUser({ sessionToken: token });
    }
  }, [isAuthenticated, token, createOrUpdateUser]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex flex-col h-screen bg-[#010828] items-center justify-center">
        <p className="font-mono text-cream/70 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.name ?? user.email ?? "Player";
  const score = user.score ?? 0;

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col bg-[#010828] overflow-hidden">
      {/* Parallax background video */}
      <motion.div style={{ y: bgY }} className="fixed inset-0 z-0">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-15">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Floating Parallax Orbs */}
      <motion.div 
        style={{ y: orbY, x: orbX }}
        className="fixed top-1/4 -left-20 w-96 h-96 bg-neon/10 rounded-full blur-[120px] pointer-events-none z-0" 
      />
      <motion.div 
        style={{ y: orbX, x: orbY }}
        className="fixed bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none z-0" 
      />

      {/* Texture overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ backgroundSize: 'cover', mixBlendMode: 'lighten', opacity: 0.6 }}
      />

      {/* TOP BAR */}
      <header className="liquid-glass border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-grotesk text-[16px] uppercase text-cream tracking-wider">EngineX</Link>
        </div>

        {/* Current player */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="relative w-10 h-10 bg-white/10 liquid-glass rounded-full overflow-hidden flex items-center justify-center shrink-0">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-grotesk text-[10px] text-cream">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span
              className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
              style={{ backgroundColor: "#6FFF00" }}
            />
          </div>
          <span className="font-mono text-cream/80 text-sm max-w-[160px] truncate">
            {displayName}
          </span>
        </div>

        {/* Right badges */}
        <div className="flex items-center gap-2">
          <span
            className="liquid-glass rounded-full px-3 py-1 font-mono text-xs text-cream/80 hidden md:inline-flex max-w-[200px] truncate"
            title={socketError ?? undefined}
          >
            {socketError
              ? `Server: ${socketError}`
              : socketConnected
                ? "Game server: live"
                : "Game server: …"}
          </span>
          <span className="liquid-glass rounded-full px-3 py-1 font-mono text-sm text-neon">
            🟢 {score}
          </span>
          <span className="liquid-glass rounded-full px-3 py-1 font-mono text-sm text-cream hidden sm:inline-flex">🔥 {user.bestStreak ?? 0}</span>
          <span className="liquid-glass rounded-full px-3 py-1 font-mono text-sm text-yellow-400 hidden sm:inline-flex">⭐ 35 XP</span>
        </div>
      </header>

      {/* BODY — min-h-0 lets flex children shrink so main can scroll */}
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden relative z-10">
        {/* LEFT SIDEBAR */}
        <aside className="hidden min-h-0 shrink-0 flex-col gap-2 overflow-y-auto border-r border-white/10 px-4 py-8 liquid-glass lg:flex lg:w-[240px]">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const goQuiz = () =>
              document.getElementById("quiz-arena")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            const content = (
              <>
                <Icon size={18} />
                <span>{item.label}</span>
              </>
            );
            
            if (item.href) {
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <Link
                    href={item.href}
                    className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 font-mono text-sm text-cream/70 transition hover:bg-white/10 hover:text-cream"
                  >
                    {content}
                  </Link>
                </motion.div>
              );
            }
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                type="button"
                onClick={() => {
                  if (item.scrollToQuiz) goQuiz();
                }}
                className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left font-mono text-sm transition ${
                  item.active
                    ? "cursor-pointer border border-[#6FFF00]/30 bg-[#6FFF00]/10 text-neon"
                    : "cursor-default text-cream/70 hover:bg-white/10 hover:text-cream"
                }`}
              >
                {content}
              </motion.button>
            );
          })}

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 1 }}
            className="mt-auto flex items-center gap-3 px-4 pt-6"
          >
            <div className="w-9 h-9 bg-white/10 liquid-glass rounded-full overflow-hidden flex items-center justify-center shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-grotesk text-[10px] text-cream">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-grotesk text-[13px] text-cream uppercase truncate max-w-[140px]">
              {displayName}
            </span>
          </motion.div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-8 pb-24 lg:pb-8 scroll-smooth">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-[1400px]"
          >
            {/* DAILY CHALLENGE */}
            <motion.div variants={sectionVariants}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-grotesk text-[11px] text-cream/50 uppercase tracking-widest">Daily Challenge</span>
                <span className="font-mono text-neon text-sm">⏱ 07:49</span>
              </div>
              <div className="flex gap-4 mb-8">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("quiz-arena")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="liquid-glass relative [--glass-border-start:rgba(111,255,0,0.5)] [--glass-bg:rgba(111,255,0,0.04)] [--glass-bg-accent:rgba(111,255,0,0.08)] rounded-[20px] px-6 py-5 flex-1 flex items-center justify-between hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer text-left group"
                >
                  <span className="font-grotesk text-[28px] text-neon group-hover:drop-shadow-[0_0_8px_rgba(111,255,0,0.5)] transition-all">QUIZ</span>
                  <ChevronRight className="text-cream/50 group-hover:translate-x-1 transition-transform" size={24} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("bug-finder")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="liquid-glass relative [--glass-border-start:rgba(245,158,11,0.5)] [--glass-bg:rgba(245,158,11,0.04)] [--glass-bg-accent:rgba(245,158,11,0.08)] rounded-[20px] px-6 py-5 flex-1 flex items-center justify-between hover:bg-white/10 transition-all hover:scale-[1.01] cursor-pointer text-left group"
                >
                  <span className="font-grotesk text-[28px] text-amber-300 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all">BUG</span>
                  <ChevronRight className="text-cream/50 group-hover:translate-x-1 transition-transform" size={24} />
                </button>
              </div>
            </motion.div>

            <motion.div variants={sectionVariants} viewport={{ once: true, margin: "-100px" }}>
              <QuizArenaSection />
            </motion.div>

            <motion.div variants={sectionVariants} viewport={{ once: true, margin: "-100px" }}>
              <BugFinderSection />
            </motion.div>

            <motion.div variants={sectionVariants} viewport={{ once: true, margin: "-100px" }}>
              <MindSnapSection />
            </motion.div>

            {/* GAME CATEGORIES */}
            <motion.div variants={sectionVariants}>
              <span className="font-grotesk text-[11px] text-cream/50 uppercase tracking-widest">Game Categories</span>

              {/* Tabs */}
              <div className="flex gap-3 my-4 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`font-grotesk uppercase rounded-full px-5 py-2 text-sm whitespace-nowrap transition-all duration-300 ${
                      activeTab === cat
                        ? 'bg-neon text-[#010828] shadow-[0_0_20px_rgba(111,255,0,0.3)] scale-105'
                        : 'liquid-glass text-cream/60 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* All category sections */}
              <div className="relative">
                {CATEGORIES.map((cat) => {
                  if (activeTab !== cat) return null;
                  const { cursive, cards } = GAMES[cat];
                  const styles = ICON_STYLES[cat];
                  return (
                    <motion.div 
                      key={cat} 
                      className="mb-10"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-3">
                          <span className="font-grotesk text-[20px] text-cream uppercase">{cat}</span>
                          <span className="font-condiment text-neon text-[18px]">{cursive}</span>
                        </div>
                        <span className="font-mono text-neon/70 text-xs hover:text-neon cursor-pointer transition-colors">SEE ALL →</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {cards.map((game, idx) => {
                          const GameIcon = game.icon;
                          return (
                            <motion.div
                              key={game.title}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              role={(game.scrollTo || game.href) ? "button" : undefined}
                              tabIndex={(game.scrollTo || game.href) ? 0 : undefined}
                              onClick={() => {
                                if (game.scrollTo === "bug-finder") {
                                  document.getElementById("bug-finder")?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                } else if (game.href) {
                                  router.push(game.href);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (game.scrollTo === "bug-finder") {
                                    document.getElementById("bug-finder")?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start",
                                    });
                                  } else if (game.href) {
                                    router.push(game.href);
                                  }
                                }
                              }}
                              className={`liquid-glass rounded-[24px] p-5 flex flex-col gap-3 hover:bg-white/10 hover:scale-[1.02] transition-all group ${
                                game.scrollTo ? "cursor-pointer" : ""
                              }`}
                            >
                              <div className={`rounded-[14px] w-12 h-12 flex items-center justify-center transition-transform group-hover:rotate-6 ${styles.bg}`}>
                                <GameIcon size={22} className={styles.text} />
                              </div>
                              <span className="font-grotesk text-[15px] text-cream uppercase mt-1 group-hover:text-neon transition-colors">{game.title}</span>
                              <span className="font-mono text-cream/50 text-xs leading-relaxed line-clamp-2">{game.desc}</span>
                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                                  game.mode === 'SOLO'
                                    ? 'bg-[#6FFF00]/10 text-neon'
                                    : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {game.mode}
                                </span>
                                <div className="w-8 h-8 bg-gradient-to-br from-[#b724ff] to-[#7c3aed] rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 transition group-hover:shadow-purple-500/50">
                                  <ChevronRight size={14} className="text-white" />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden min-h-0 w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 p-6 xl:flex">
          {leaderboard && leaderboard.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="liquid-glass flex flex-col gap-2 rounded-[20px] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-grotesk text-[13px] uppercase text-cream">
                  Leaderboard
                </span>
                <Trophy size={16} className="text-neon" />
              </div>
              {leaderboard.map((row, i) => (
                <div
                  key={row.userId}
                  className="flex items-center justify-between font-mono text-xs text-cream/85"
                >
                  <span className="truncate pr-2">
                    {i + 1}. {row.name}
                  </span>
                  <span className="shrink-0 text-neon">{row.score}</span>
                </div>
              ))}
              <p className="mt-1 text-center font-mono text-[10px] text-cream/45">
                Updates when you finish quiz or bug finder below
              </p>
            </motion.div>
          ) : null}

          {/* DAILY QUESTS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="liquid-glass rounded-[20px] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-grotesk text-[13px] text-cream uppercase">Daily Quest</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-neon text-xs">⏱ 07:49</span>
                <span className="font-mono text-cream/40 text-xs cursor-pointer">VIEW ALL</span>
              </div>
            </div>
            {QUESTS.map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <span className="font-mono text-cream text-sm">{q.name}</span>
                <div className="w-full h-1.5 bg-white/10 rounded-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(q.progress / q.total) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    className="h-full bg-neon rounded-full" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cream/40 text-xs">{q.progress}/{q.total}</span>
                  {q.progress >= q.total ? (
                    <CheckCircle size={18} className="text-neon" />
                  ) : (
                    <button className="rounded-[10px] px-3 py-1.5 bg-neon text-[#010828] font-grotesk uppercase text-xs hover:brightness-110 active:scale-95 transition-all">
                      Play Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* DOWNLOAD APP */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="liquid-glass rounded-[20px] p-5 flex flex-col gap-3"
          >
            <span className="font-grotesk text-[16px] text-cream uppercase">Download Mobile App</span>
            <span className="font-mono text-cream/50 text-xs">Scan the QR code using your phone</span>
            <div className="w-24 h-24 bg-white/5 liquid-glass rounded-[12px] flex items-center justify-center">
              <QrCode size={40} className="text-cream/30" />
            </div>
            <div className="flex gap-2">
              <button className="liquid-glass rounded-[12px] px-3 py-2 font-mono text-xs text-cream/70 hover:bg-white/10 transition-colors">🍎 App Store</button>
              <button className="liquid-glass rounded-[12px] px-3 py-2 font-mono text-xs text-cream/70 hover:bg-white/10 transition-colors">▶️ Play Store</button>
            </div>
          </motion.div>
        </aside>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass border-t border-white/10 flex justify-around py-2">
        {[
          { icon: Gamepad2, label: "Arena", active: true, scrollToQuiz: true },
          { icon: Mic, label: "Voice", href: "/interview" as const },
          { icon: ClipboardList, label: "Quests", active: false },
          { icon: Trophy, label: "Compete", active: false },
        ].map((item) => {
          const Icon = item.icon;
          if ("href" in item && item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-1 text-cream/50 hover:text-neon transition-colors"
              >
                <Icon size={20} />
                <span className="font-mono text-[10px]">{item.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if ("scrollToQuiz" in item && item.scrollToQuiz) {
                  document.getElementById("quiz-arena")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              className={`flex flex-col items-center gap-1 transition-colors ${
                item.active ? "text-neon" : "text-cream/50 hover:text-neon"
              }`}
            >
              <Icon size={20} />
              <span className="font-mono text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Home;
