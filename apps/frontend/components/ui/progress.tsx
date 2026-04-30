import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  color = "neon",
  className,
}: {
  value: number;
  max?: number;
  color?: "neon" | "amber" | "sky" | "rose";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const bar: Record<string, string> = {
    neon:  "bg-[#6fff00]",
    amber: "bg-amber-400",
    sky:   "bg-sky-400",
    rose:  "bg-rose-400",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", bar[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
