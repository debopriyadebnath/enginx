"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TimerState = {
  remainingSeconds: number;
  expired: boolean;
};

/**
 * Countdown timer for single-player workflow puzzles.
 */
export function useWorkflowTimer(initialSeconds: number, enabled: boolean) {
  const [remainingSeconds, setRemaining] = useState(initialSeconds);
  const [expired, setExpired] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(initialSeconds);
    setExpired(false);
    startedAt.current = Date.now();
  }, [initialSeconds]);

  useEffect(() => {
    if (!enabled || expired) return;

    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setExpired(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [enabled, expired, initialSeconds]);

  const reset = useCallback((seconds: number) => {
    setRemaining(seconds);
    setExpired(false);
    startedAt.current = Date.now();
  }, []);

  return { remainingSeconds, expired, reset };
}
