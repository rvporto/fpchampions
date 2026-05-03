import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function LevelBadge({ level, className }: { level?: number | null; className?: string }) {
  if (!level && level !== 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-[10px] font-display leading-none",
        "px-1.5 py-0.5 rounded-md bg-gradient-gold text-primary-foreground shadow-gold",
        className,
      )}
      title={`Nível ${level}`}
    >
      {level}
    </span>
  );
}

export function PositionDelta({ delta, className }: { delta: number | null | undefined; className?: string }) {
  if (delta === undefined) return null;
  if (delta === null) {
    return <Minus className={cn("size-3.5 text-muted-foreground", className)} aria-label="novo" />;
  }
  if (delta > 0) {
    return (
      <span className={cn("inline-flex items-center text-success text-[11px] font-medium", className)} aria-label={`subiu ${delta}`}>
        <ArrowUp className="size-3.5" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className={cn("inline-flex items-center text-destructive text-[11px] font-medium", className)} aria-label={`desceu ${-delta}`}>
        <ArrowDown className="size-3.5" />
        {-delta}
      </span>
    );
  }
  return <Minus className={cn("size-3.5 text-muted-foreground", className)} aria-label="manteve" />;
}
