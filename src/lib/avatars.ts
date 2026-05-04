import a1 from "@/assets/avatars/avatar-1.jpg";
import a2 from "@/assets/avatars/avatar-2.jpg";
import a3 from "@/assets/avatars/avatar-3.jpg";
import a4 from "@/assets/avatars/avatar-4.jpg";
import a5 from "@/assets/avatars/avatar-5.jpg";

export const FIXED_AVATARS = [
  { id: "a1", url: a1, label: "Tubarão" },
  { id: "a2", url: a2, label: "Cavalheiro" },
  { id: "a3", url: a3, label: "Veterano" },
  { id: "a4", url: a4, label: "Prodígio" },
  { id: "a5", url: a5, label: "Galã" },
] as const;

export const DEFAULT_AVATAR = a1;

export function resolveAvatar(url?: string | null) {
  if (!url) return DEFAULT_AVATAR;
  const fixed = FIXED_AVATARS.find((a) => a.id === url);
  return fixed ? fixed.url : url;
}
