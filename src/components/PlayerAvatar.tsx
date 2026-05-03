import { resolveAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function PlayerAvatar({ avatarId, name, size = 40, className }: { avatarId?: string | null; name?: string; size?: number; className?: string }) {
  const url = resolveAvatar(avatarId);
  return (
    <img
      src={url}
      alt={name ?? "Avatar"}
      width={size}
      height={size}
      loading="lazy"
      className={cn("rounded-full object-cover ring-2 ring-primary/30 shadow-sm", className)}
      style={{ width: size, height: size }}
    />
  );
}
