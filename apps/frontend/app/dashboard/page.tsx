"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthState } from "@/lib/auth";
import { useAuthenticatedGameSocket } from "@/lib/socket";
import { useSession } from "@/lib/session";
import {
  Calculator, Code2, BarChart2, Grid3x3,
  Bot, Eye, Shield, TrendingUp,
  Zap, Search, Activity, Cpu,
  Bug, Layers, Swords, ChevronRight,
  CheckCircle, QrCode, Gamepad2, ClipboardList,
  Trophy, Radio, Users, Plus
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: Gamepad2, label: 'ARENA', active: true },
  { icon: ClipboardList, label: 'QUESTS', active: false },
  { icon: Trophy, label: 'COMPETE', active: false },
  { icon: Radio, label: 'FEED', active: false },
  { icon: Users, label: 'GROUP PLAY', active: false },
  { icon: Plus, label: 'MORE', active: false },
];

const CATEGORIES = ['MATH', 'AI/ML', 'ELECTRONICS', 'BONUS'] as const;

type Category = typeof CATEGORIES[number];

interface GameCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  mode: 'SOLO' | 'MULTIPLAYER';
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
      { title: 'MEMORY MATCH', desc: 'Match tech terms with their definitions in this card flip game.', icon: Layers, mode: 'SOLO' },
      { title: 'QUIZ BATTLE', desc: 'Multiplayer rapid-fire subject quizzes against other players.', icon: Swords, mode: 'MULTIPLAYER' },
    ],
  },
};

const ICON_STYLES: Record<Category, { bg: string; text: string }> = {
  MATH: { bg: 'bg-gradient-to-br from-[#6FFF00]/20 to-[#6FFF00]/5', text: 'text-[#6FFF00]' },
  'AI/ML': { bg: 'bg-gradient-to-br from-[#b724ff]/20 to-[#7c3aed]/5', text: 'text-purple-400' },
  ELECTRONICS: { bg: 'bg-gradient-to-br from-yellow-400/20 to-orange-500/5', text: 'text-yellow-400' },
  BONUS: { bg: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/5', text: 'text-blue-400' },
};

const QUESTS = [
  { name: "Mini-Sudoku's Daily Challenge", progress: 0, total: 1 },
  { name: "Math's Daily Challenge", progress: 0, total: 1 },
  { name: "Mind Snap Duel", progress: 1, total: 1 },
];

const Home = () => {
  const router = useRouter();
  const { token } = useSession();
  const { isLoading, isAuthenticated, user } = useAuthState();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const { connected: socketConnected, error: socketError } =
    useAuthenticatedGameSocket();
  const [activeTab, setActiveTab] = useState<Category>("MATH");

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
    <div className="flex flex-col h-screen bg-[#010828] relative">
      {/* Background video */}
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0 opacity-15">
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4" type="video/mp4" />
      </video>

      {/* Texture overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ backgroundImage: 'url(/texture.png)', backgroundSize: 'cover', mixBlendMode: 'lighten', opacity: 0.6 }}
      />

      {/* TOP BAR */}
      <header className="liquid-glass border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-anton text-[16px] uppercase text-cream tracking-wider">EngineX</Link>

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
              <span className="font-anton text-[10px] text-cream">
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
          <span className="liquid-glass rounded-full px-3 py-1 font-mono text-sm text-cream hidden sm:inline-flex">🔥 0</span>
          <span className="liquid-glass rounded-full px-3 py-1 font-mono text-sm text-yellow-400 hidden sm:inline-flex">⭐ 35 XP</span>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-[240px] liquid-glass border-r border-white/10 py-8 px-4 gap-2 shrink-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] font-mono text-sm cursor-pointer transition ${
                  item.active
                    ? 'bg-[#6FFF00]/10 text-neon border border-[#6FFF00]/30'
                    : 'text-cream/70 hover:bg-white/10 hover:text-cream'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}

          <div className="mt-auto flex items-center gap-3 px-4 pt-6">
            <div className="w-9 h-9 bg-white/10 liquid-glass rounded-full overflow-hidden flex items-center justify-center shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-anton text-[10px] text-cream">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-anton text-[13px] text-cream uppercase truncate max-w-[140px]">
              {displayName}
            </span>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-[1400px]">
            {/* DAILY CHALLENGE */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-anton text-[11px] text-cream/50 uppercase tracking-widest">Daily Challenge</span>
              <span className="font-mono text-neon text-sm">⏱ 07:49</span>
            </div>
            <div className="flex gap-4 mb-10">
              <div className="liquid-glass rounded-[20px] px-6 py-5 flex-1 flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                <span className="font-anton text-[28px] text-neon">PUZZLE</span>
                <ChevronRight className="text-cream/50" size={24} />
              </div>
              <div className="liquid-glass rounded-[20px] px-6 py-5 flex-1 flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                <span className="font-anton text-[28px] text-cream">MATH</span>
                <ChevronRight className="text-cream/50" size={24} />
              </div>
            </div>

            {/* GAME CATEGORIES */}
            <span className="font-anton text-[11px] text-cream/50 uppercase tracking-widest">Game Categories</span>

            {/* Tabs */}
            <div className="flex gap-3 my-4 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`font-anton uppercase rounded-full px-5 py-2 text-sm whitespace-nowrap transition ${
                    activeTab === cat
                      ? 'bg-neon text-[#010828]'
                      : 'liquid-glass text-cream/60 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* All category sections */}
            {CATEGORIES.map((cat) => {
              const { cursive, cards } = GAMES[cat];
              const styles = ICON_STYLES[cat];
              return (
                <div key={cat} className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-anton text-[20px] text-cream uppercase">{cat}</span>
                      <span className="font-condiment text-neon text-[18px]">{cursive}</span>
                    </div>
                    <span className="font-mono text-neon/70 text-xs hover:text-neon cursor-pointer">SEE ALL →</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((game) => {
                      const GameIcon = game.icon;
                      return (
                        <div
                          key={game.title}
                          className="liquid-glass rounded-[24px] p-5 flex flex-col gap-3 hover:bg-white/10 hover:scale-[1.02] transition-all cursor-pointer group"
                        >
                          <div className={`rounded-[14px] w-12 h-12 flex items-center justify-center ${styles.bg}`}>
                            <GameIcon size={22} className={styles.text} />
                          </div>
                          <span className="font-anton text-[15px] text-cream uppercase mt-1">{game.title}</span>
                          <span className="font-mono text-cream/50 text-xs leading-relaxed line-clamp-2">{game.desc}</span>
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                              game.mode === 'SOLO'
                                ? 'bg-[#6FFF00]/10 text-neon'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {game.mode}
                            </span>
                            <div className="w-8 h-8 bg-gradient-to-br from-[#b724ff] to-[#7c3aed] rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 transition">
                              <ChevronRight size={14} className="text-white" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden xl:flex flex-col gap-4 w-[320px] p-6 overflow-y-auto border-l border-white/10 shrink-0">
          {/* DAILY QUESTS */}
          <div className="liquid-glass rounded-[20px] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-anton text-[13px] text-cream uppercase">Daily Quest</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-neon text-xs">⏱ 07:49</span>
                <span className="font-mono text-cream/40 text-xs cursor-pointer">VIEW ALL</span>
              </div>
            </div>
            {QUESTS.map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <span className="font-mono text-cream text-sm">{q.name}</span>
                <div className="w-full h-1.5 bg-white/10 rounded-full">
                  <div className="h-full bg-neon rounded-full" style={{ width: `${(q.progress / q.total) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cream/40 text-xs">{q.progress}/{q.total}</span>
                  {q.progress >= q.total ? (
                    <CheckCircle size={18} className="text-neon" />
                  ) : (
                    <button className="rounded-[10px] px-3 py-1.5 bg-neon text-[#010828] font-anton uppercase text-xs hover:brightness-110">
                      Play Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DOWNLOAD APP */}
          <div className="liquid-glass rounded-[20px] p-5 flex flex-col gap-3">
            <span className="font-anton text-[16px] text-cream uppercase">Download Mobile App</span>
            <span className="font-mono text-cream/50 text-xs">Scan the QR code using your phone</span>
            <div className="w-24 h-24 bg-white/5 liquid-glass rounded-[12px] flex items-center justify-center">
              <QrCode size={40} className="text-cream/30" />
            </div>
            <div className="flex gap-2">
              <button className="liquid-glass rounded-[12px] px-3 py-2 font-mono text-xs text-cream/70">🍎 App Store</button>
              <button className="liquid-glass rounded-[12px] px-3 py-2 font-mono text-xs text-cream/70">▶️ Play Store</button>
            </div>
          </div>
        </aside>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass border-t border-white/10 flex justify-around py-3">
        {[
          { icon: Gamepad2, label: 'Arena', active: true },
          { icon: ClipboardList, label: 'Quests', active: false },
          { icon: Trophy, label: 'Compete', active: false },
          { icon: Radio, label: 'Feed', active: false },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`flex flex-col items-center gap-1 cursor-pointer ${item.active ? 'text-neon' : 'text-cream/50'}`}>
              <Icon size={20} />
              <span className="font-mono text-[10px]">{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Home;
