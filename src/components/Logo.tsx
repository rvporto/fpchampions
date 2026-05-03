import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export const Logo = ({ className, withText = true, size = 40 }: { className?: string; withText?: boolean; size?: number }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <img src={logo} alt="Família Poker Champions" width={size} height={size} className="drop-shadow-[0_0_12px_hsl(var(--primary)/0.45)]" loading="eager" />
    {withText && (
      <div className="leading-tight">
        <div className="font-display text-base sm:text-lg fpc-text-gold">Família Poker</div>
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-muted-foreground">Champions</div>
      </div>
    )}
  </div>
);
