import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useProfiles, useTempPlayers } from "@/hooks/useGames";
import { useIndicateAs, useIndicateK } from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  kind: "k" | "as";
}

export function AddHallChampionDialog({ kind }: Props) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear - 1);
  const [pick, setPick] = useState<string>("");
  const { data: profiles = [] } = useProfiles();
  const { data: tempPlayers = [] } = useTempPlayers();
  const indAs = useIndicateAs();
  const indK = useIndicateK();
  const qc = useQueryClient();

  const submit = async () => {
    if (!year || year < 2000 || year > 2999) return toast.error("Ano inválido.");
    if (!pick) return toast.error("Escolha o jogador.");
    const [k, id] = pick.split(":");
    try {
      if (kind === "as") {
        await indAs.mutateAsync({
          year,
          as_user_id: k === "u" ? id : null,
          as_temp_player_id: k === "t" ? id : null,
        });
      } else {
        await indK.mutateAsync({
          year,
          k_user_id: k === "u" ? id : null,
          k_temp_player_id: k === "t" ? id : null,
        });
      }
      qc.invalidateQueries({ queryKey: ["hall-of-fame"] });
      qc.invalidateQueries({ queryKey: ["player-profile"] });
      toast.success("Campeão adicionado ao Hall da Fama.");
      setOpen(false);
      setPick("");
    } catch (e: any) { toast.error(e.message); }
  };

  const title = kind === "k" ? "Adicionar K do Poker" : "Adicionar Ás do Poker";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="size-4 mr-1" />{title}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display fpc-text-gold">{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ano da Temporada</Label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || currentYear)} />
          </div>
          <div>
            <Label>Jogador</Label>
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => <SelectItem key={`u:${p.id}`} value={`u:${p.id}`}>{p.nickname}</SelectItem>)}
                {tempPlayers.map((t) => <SelectItem key={`t:${t.id}`} value={`t:${t.id}`}>{t.nickname} (temp)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={indAs.isPending || indK.isPending}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
