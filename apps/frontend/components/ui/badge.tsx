import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "neon" | "success" | "warning" | "error" | "info" | "difficulty-easy" | "difficulty-medium" | "difficulty-hard";

const variants: Record<BadgeVariant, string> = {
  default:           "border-white/15 bg-white/8 text-cream/70",
  neon:              "border-[#6fff00]/30 bg-[#6fff00]/10 text-[#6fff00]",
  success:           "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  warning:           "border-amber-400/30 bg-amber-500/10 text-amber-300",
  error:             "border-rose-400/30 bg-rose-500/10 text-rose-300",
  info:              "border-sky-400/30 bg-sky-500/10 text-sky-300",
  "difficulty-easy": "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  "difficulty-medium":"border-amber-400/30 bg-amber-500/10 text-amber-300",
  "difficulty-hard": "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant =
    difficulty === "hard"
      ? "difficulty-hard"
      : difficulty === "medium"
        ? "difficulty-medium"
        : "difficulty-easy";
  return <Badge variant={variant}>{difficulty}</Badge>;
}
