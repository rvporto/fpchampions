import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlayerSelector, SelectedParticipant } from "@/components/PlayerSelector";
import { useCreateGame } from "@/hooks/useGames";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function CreateGameModal({ open, onOpenChange }: Props) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [name, setName] = useState("");
  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [seasonYear, setSeasonYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [buyIn, setBuyIn] = useState("50");
  const [rebuy, setRebuy] = useState("30");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<SelectedParticipant[]>([]);
  const create = useCreateGame();

  const reset = () => {
    setName(""); setDescription(""); setParticipants([]);
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Nome da partida obrigatório.");
    const bi = parseFloat(buyIn); const rb = parseFloat(rebuy);
    if (isNaN(bi) || bi < 0) return toast.error("Buy-in inválido.");
    if (isNaN(rb) || rb < 0) return toast.error("Rebuy inválido.");
    try {
      await create.mutateAsync({
        name,
        date: new Date(dateTime).toISOString(),
        season_year: seasonYear,
        month,
        buy_in: bi,
        rebuy_value: rb,
        description,
        participants: participants.map((p) => ({ user_id: p.user_id ?? null, temp_player_id: p.temp_player_id ?? null })),
      });
      toast.success("Partida criada!");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao criar partida.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold">Nova Partida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rodada #14 — Sexta Premium" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Temporada</Label>
                <Input type="number" value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value || `${now.getFullYear()}`))} />
              </div>
              <div>
                <Label>Mês</Label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Buy-in (R$)</Label>
              <Input type="number" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
            </div>
            <div>
              <Label>Rebuy (R$)</Label>
              <Input type="number" value={rebuy} onChange={(e) => setRebuy(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="mb-2 block">Jogadores</Label>
            <PlayerSelector value={participants} onChange={setParticipants} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-gradient-gold text-primary-foreground" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar Partida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
