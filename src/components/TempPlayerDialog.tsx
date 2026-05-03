import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AvatarPicker } from "@/components/AvatarPicker";
import { useCreateTempPlayer } from "@/hooks/useGames";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import type { DbTempPlayer } from "@/lib/db-types";

interface Props {
  trigger?: React.ReactNode;
  onCreated?: (t: DbTempPlayer) => void;
}

export function TempPlayerDialog({ trigger, onCreated }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"masculino" | "feminino" | "outro">("masculino");
  const [avatar, setAvatar] = useState("a1");
  const create = useCreateTempPlayer();

  const submit = async () => {
    if (!nickname.trim()) return toast.error("Apelido é obrigatório.");
    try {
      const t = await create.mutateAsync({ nickname, full_name: fullName, gender, avatar_url: avatar });
      toast.success("Jogador temporário criado.");
      onCreated?.(t);
      setOpen(false);
      setNickname(""); setFullName(""); setAvatar("a1");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao criar jogador.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline"><UserPlus className="size-4 mr-1" />Novo Temporário</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold">Novo Jogador Temporário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-2 block">Avatar</Label>
            <AvatarPicker value={avatar} onChange={setAvatar} userId={user?.id} />
          </div>
          <div>
            <Label>Apelido *</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={30} placeholder="Bia" />
          </div>
          <div>
            <Label>Nome (opcional)</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="mb-2 block">Gênero</Label>
            <RadioGroup value={gender} onValueChange={(v) => setGender(v as any)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="masculino" id="t-m" /><Label htmlFor="t-m" className="cursor-pointer">Masc</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="feminino" id="t-f" /><Label htmlFor="t-f" className="cursor-pointer">Fem</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="outro" id="t-o" /><Label htmlFor="t-o" className="cursor-pointer">Outro</Label></div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
