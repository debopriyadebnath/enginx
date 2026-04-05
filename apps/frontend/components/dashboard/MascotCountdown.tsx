"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type MascotCountdownProps = {
  onComplete: () => void;
};

const MASCOTS = ["M1.png", "M2.png", "M3.png", "M4.png", "M5.png", "M6.png", "M7.png", "M8.png", "M9.png"];

export function MascotCountdown({ onComplete }: MascotCountdownProps) {
  const [step, setStep] = useState(0);
  const [selectedMascots, setSelectedMascots] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Pick 3 random unique mascots
    const shuffled = [...MASCOTS].sort(() => 0.5 - Math.random());
    setSelectedMascots(shuffled.slice(0, 3));
    
    // Tiny delay to trigger fade-in
    const timeout = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (selectedMascots.length === 0) return;

    if (step >= 3) {
      const finalTimeout = setTimeout(onComplete, 300);
      return () => clearTimeout(finalTimeout);
    }

    const timer = setTimeout(() => {
      setStep((s) => s + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, selectedMascots, onComplete]);

  if (selectedMascots.length === 0) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 1. Base Background Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/Game-bg.png)' }}
      />

      {/* 2. Dark Blue / Obsidian Overlay */}
      <div className="fixed inset-0 z-[1] bg-[#010828]/60 backdrop-blur-sm" />

      {/* 3. Atmospheric Neon Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-[2] opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(111,255,0,0.15), transparent 70%)",
        }}
      />

      {/* Main Content */}
      <div className="relative z-[10] flex flex-col items-center gap-12">
        <div className="flex flex-wrap items-center justify-center gap-8 px-8 md:gap-16">
          {selectedMascots.map((m, i) => (
            <div
              key={m}
              className={`flex flex-col items-center transition-all duration-700 transform ease-[0.16, 1, 0.3, 1] ${
                step >= i 
                  ? "scale-100 opacity-100 translate-y-0" 
                  : "scale-75 opacity-0 translate-y-12"
              }`}
            >
              <div className="liquid-glass relative h-40 w-40 overflow-hidden rounded-3xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] md:h-56 md:w-56 md:p-8">
                <Image
                  src={`/mascots/${m}`}
                  alt={`Mascot ${i + 1}`}
                  fill
                  sizes="(max-width: 768px) 160px, 224px"
                  className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                  priority
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sync Status Text */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="h-[2px] w-12 bg-neon animate-pulse" />
            <span className="font-grotesk text-2xl uppercase tracking-[0.3em] text-cream drop-shadow-[0_0_12px_rgba(232,238,255,0.4)]">
              {step === 0 ? "INITIALIZING" : step === 1 ? "SYNCING ARENA" : "COMPLETING"}
            </span>
            <div className="h-[2px] w-12 bg-neon animate-pulse" />
          </div>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/5 border border-white/10">
            <div 
              className="h-full bg-neon transition-all duration-1000 ease-linear shadow-[0_0_15px_#6fff00]"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
