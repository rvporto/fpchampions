import { useRef, useState } from "react";
import { FIXED_AVATARS, resolveAvatar } from "@/lib/avatars";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  value: string | null;
  onChange: (avatarRef: string) => void;
  userId?: string;
}

export function AvatarPicker({ value, onChange, userId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!userId) {
      toast.error("Faça login para enviar uma foto.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Máximo 3MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    toast.success("Foto enviada!");
  };

  const isCustom = value && !FIXED_AVATARS.find((a) => a.id === value);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {FIXED_AVATARS.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              className={cn(
                "relative rounded-full overflow-hidden ring-2 transition-all aspect-square",
                selected ? "ring-primary shadow-gold scale-105" : "ring-border hover:ring-primary/50"
              )}
              aria-label={a.label}
            >
              <img src={a.url} alt={a.label} className="w-full h-full object-cover" />
              {selected && (
                <span className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                  <Check className="size-5 text-primary-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "size-14 rounded-full overflow-hidden ring-2 flex items-center justify-center bg-secondary/40 transition-all",
            isCustom ? "ring-primary shadow-gold" : "ring-border hover:ring-primary/50"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 text-primary animate-spin" />
          ) : isCustom ? (
            <img src={resolveAvatar(value)} alt="Sua foto" className="w-full h-full object-cover" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </button>
        <div className="text-xs text-muted-foreground">
          <p>Ou envie uma foto sua.</p>
          <p>JPG/PNG, até 3 MB.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
