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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-wrap items-center justify-center gap-8 px-8 md:gap-16">
        {selectedMascots.map((m, i) => (
          <div
            key={m}
            className={`flex flex-col items-center transition-all duration-500 transform ${
              step >= i 
                ? "scale-100 opacity-100" 
                : "scale-90 opacity-0"
            }`}
          >
            <div className="relative h-40 w-40 md:h-56 md:w-56">
              <Image
                src={`/mascots/${m}`}
                alt={`Mascot ${i + 1}`}
                fill
                sizes="(max-width: 768px) 160px, 224px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
