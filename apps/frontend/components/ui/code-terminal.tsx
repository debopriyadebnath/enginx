"use client";

import { cn } from "@/lib/utils";

type CodeTerminalProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Aceternity-style macOS terminal chrome for showcasing code (static content).
 */
export function CodeTerminal({
  title = "bug-finder.c",
  subtitle = "clang · C99",
  children,
  className,
}: CodeTerminalProps) {
  return (
    <div
      className={cn(
        "liquid-glass overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#161b22] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-sm" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-sm" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f] shadow-sm" />
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-mono text-[11px] text-cream/55">{title}</p>
          {subtitle ? (
            <p className="truncate font-mono text-[10px] text-cream/35">{subtitle}</p>
          ) : null}
        </div>
        <div className="w-14 shrink-0" aria-hidden />
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#6fff00]/[0.03] to-transparent" />
        <div className="max-h-[min(52vh,420px)] overflow-auto p-4 font-mono text-[13px] leading-relaxed tracking-tight text-[#e6edf3] sm:text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
