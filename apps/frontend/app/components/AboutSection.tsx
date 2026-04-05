import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronRight, Cpu, Layers, Zap, Terminal } from 'lucide-react';
import { useRef, useState } from 'react';
import { ScrollPath } from './ScrollPath';

const CARDS = [
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4",
    score: "8.7/10",
    big: "Real-Time Multiplayer Battles",
    small: "Compete with other players in fast-paced rounds where speed and accuracy decide the winner.",
    details: ["Latency: <50ms", "Engine: Socket.io", "Sync: Delta Compression"],
    icon: <Zap size={14} className="text-neon" />,
    code: `socket.on("action", (data) => {\n  updateState(data);\n});`
  },
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4",
    score: "9/10",
    big: "Diverse Engineering Challenges",
    small: "Solve coding, computer science, and math problems designed to test your logic and problem-solving skills.",
    details: ["Complexity: High", "Topics: DS & Algo", "Types: Logical / Bitwise"],
    icon: <Cpu size={14} className="text-purple-400" />,
    code: `const solution = (input) => {\n  return input.reduce((a, b) => a ^ b);\n};`
  },
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4",
    score: "8.2/10",
    big: "Track Your Performance",
    small: "Track your performance, build winning streaks, and climb the leaderboard as you improve.",
    details: ["Leaderboard: Real-time", "Analytics: Advanced", "Growth: Exponential"],
    icon: <Layers size={14} className="text-amber-400" />,
    code: `export const getLeaderboard = async () => {\n  return await db.query("users");\n};`
  },
];

const LazyVideo = ({ src }: { src: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.1 });

  return (
    <div ref={ref} className="absolute inset-0 w-full h-full">
      {isInView ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          className="w-full h-full object-cover transition-opacity duration-700 opacity-100"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <div className="w-full h-full bg-[#010828] flex items-center justify-center font-mono text-[10px] text-cream/20 uppercase tracking-widest">
          Loading Visuals...
        </div>
      )}
    </div>
  );
};

const TiltCard = ({ children }: { children: React.ReactNode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="relative w-full h-full"
    >
      <div 
        style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
        className="relative z-10"
      >
        {children}
      </div>
      {/* Ghost reflection / shadow */}
      <motion.div 
        style={{ 
          rotateX, rotateY, 
          transform: "translateZ(-20px) scale(0.95)",
          opacity: 0.5
        }}
        className="absolute inset-0 bg-neon/5 blur-2xl rounded-[32px] pointer-events-none"
      />
    </motion.div>
  );
};

const AboutSection = () => {
  const containerRef = useRef(null);

  return (
    <section ref={containerRef} className="relative py-16 sm:py-24 lg:py-32 overflow-visible" style={{ backgroundColor: '#010828', perspective: "1500px" }}>
      {/* Scroll Path - Meandering Line */}
      <ScrollPath />
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#6fff00]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#b724ff]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-[1831px] mx-auto px-4 sm:px-6 lg:px-10 z-10">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 sm:mb-20 gap-6">
          <motion.h2 
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-grotesk text-[32px] sm:text-[48px] lg:text-[60px] uppercase text-cream leading-[1.1]"
          >
            Collection of
            <br />
            <span className="ml-8 sm:ml-16">&nbsp;&nbsp;Games</span>
          </motion.h2>

          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group"
          >
            <div className="flex items-end gap-2">
              <span className="font-grotesk text-[32px] sm:text-[48px] lg:text-[60px] uppercase text-cream leading-none">SEE</span>
              <div className="flex flex-col font-grotesk uppercase text-cream leading-none">
                <span className="text-[20px] sm:text-[28px] lg:text-[36px]">ALL</span>
                <span className="text-[20px] sm:text-[28px] lg:text-[36px]">CREATORS</span>
              </div>
            </div>
            <div className="h-[6px] sm:h-[8px] lg:h-[10px] bg-neon w-full mt-2" />
          </motion.button>
        </div>

        {/* Card Grid */}
        <div className="space-y-12 sm:space-y-24 lg:space-y-32">
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-6 lg:gap-12 items-center`}
            >
              {/* Card */}
              <motion.div 
                className="w-full lg:w-1/2 max-w-[560px] relative"
              >
                {/* Floating Code Backdrop */}
                <pre className="absolute -top-10 -left-10 text-cream/5 font-mono text-[10px] sm:text-[12px] pointer-events-none select-none z-0">
                  {card.code}
                </pre>

                <TiltCard>
                  <div className="liquid-glass rounded-[32px] p-[18px] hover:bg-white/10 transition-colors cursor-pointer group/card focus:outline-none backdrop-blur-3xl shadow-[0_48px_100px_rgba(0,0,0,0.5)]">
                    <div className="relative w-full pb-[100%] rounded-[24px] overflow-hidden">
                      <LazyVideo src={card.video} />
                      
                      {/* Inner Glass Badge */}
                      <div className="absolute top-4 right-4 liquid-glass rounded-full px-3 py-1 flex items-center gap-2 border border-white/10">
                        <Terminal size={12} className="text-neon" />
                        <span className="text-[10px] font-mono text-cream/90 uppercase tracking-tighter">Live Preview</span>
                      </div>
                    </div>

                    {/* Overlay bar */}
                    <div className="liquid-glass rounded-[20px] px-5 py-4 mt-4 flex items-center justify-between border border-white/5">
                      <div>
                        <span className="text-[11px] text-cream/70 uppercase tracking-wider font-mono">RARITY SCORE:</span>
                        <span className="text-[16px] text-cream font-grotesk ml-2">{card.score}</span>
                      </div>
                      <button className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b724ff] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-purple-500/50 hover:scale-110 transition-transform">
                        <ChevronRight size={20} className="text-white" />
                      </button>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>

              {/* Feature text */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-[1px] bg-neon" />
                  <span className="font-mono text-[10px] text-neon uppercase tracking-[0.3em]">Module {i + 1}</span>
                </div>
                <motion.h3 
                  initial={{ opacity: 0, x: i % 2 === 1 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="font-grotesk text-[24px] sm:text-[32px] lg:text-[40px] uppercase text-cream leading-[1.1] mb-6"
                >
                  {card.big}
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="font-mono text-[14px] sm:text-[16px] text-cream/70 max-w-md leading-relaxed mb-8"
                >
                  {card.small}
                </motion.p>

                {/* Floating Chips / Content Density */}
                <div className="flex flex-wrap gap-3">
                  {card.details.map((detail, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      className="liquid-glass flex items-center gap-2 px-4 py-2 rounded-full border border-white/5"
                    >
                      {card.icon}
                      <span className="font-mono text-[11px] text-cream uppercase opacity-80">{detail}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Vertical Accent Line */}
                <div className={`absolute top-0 bottom-0 ${i % 2 === 1 ? 'right-full mr-12' : 'left-full ml-12'} hidden lg:block w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
