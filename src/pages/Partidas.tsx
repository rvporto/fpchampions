import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Coins, Trophy, Loader2 } from "lucide-react";
import { useGames } from "@/hooks/useGames";
import { formatBRL, formatDateTime, MONTHS_PT } from "@/lib/format";
import { CreateGameModal } from "@/components/CreateGameModal";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Partidas() {
  const { isAdmin } = useAuth();
  const { data: games, isLoading } = useGames();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [yearF, setYearF] = useState<number>(currentYear);
  const [monthF, setMonthF] = useState<"all" | number>("all");
  const [visible, setVisible] = useState(10);

  const years = useMemo(() => {
    const ys = new Set<number>([currentYear, ...(games ?? []).map((g) => g.season_year)]);
    return [...ys].sort((a, b) => b - a);
  }, [games, currentYear]);

  const filtered = useMemo(() => {
    return (games ?? []).filter(
      (g) => g.season_year === yearF && (monthF === "all" || g.month === monthF)
    );
  }, [games, yearF, monthF]);

  const shown = filtered.slice(0, visible);

  const onYearChange = (v: string) => { setYearF(Number(v)); setVisible(10); };
  const onMonthChange = (v: string) => { setMonthF(v === "all" ? "all" : Number(v)); setVisible(10); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl fpc-text-gold">Partidas</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de torneios da liga.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-gold text-primary-foreground">
            <Plus className="size-4 mr-1" />Nova Partida
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Temporada</span>
          <Select value={String(yearF)} onValueChange={onYearChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Mês</span>
          <Select value={String(monthF)} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {MONTHS_PT.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>
      ) : !filtered || filtered.length === 0 ? (
        <Card className="fpc-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma partida encontrada para o filtro selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((g) => (
            <Card
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailsId(g.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailsId(g.id); } }}
              className="fpc-card fpc-hover-gold cursor-pointer"
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg break-words">{g.name}</h3>
                    <Badge className="bg-gradient-tournament text-tournament-foreground border-0">Torneio</Badge>
                    <Badge variant={g.status === "finished" ? "default" : g.status === "in_progress" ? "secondary" : "outline"}>
                      {g.status === "finished" ? "Finalizada" : g.status === "in_progress" ? "Em andamento" : "Agendada"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Calendar className="size-3.5" />{formatDateTime(g.date)}</span>
                    <span className="flex items-center gap-1"><Coins className="size-3.5" />Buy-in {formatBRL(Number(g.buy_in))} · Rebuy {formatBRL(Number(g.rebuy_value))}</span>
                    <span className="flex items-center gap-1"><Trophy className="size-3.5" />Pote {formatBRL(Number(g.total_pot))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length > visible && (
            <Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + 10)}>
              Mostrar mais ({filtered.length - visible} restantes)
            </Button>
          )}
        </div>
      )}

      <CreateGameModal open={createOpen} onOpenChange={setCreateOpen} />
      <GameDetailsModal gameId={detailsId} onOpenChange={(v) => !v && setDetailsId(null)} />
    </div>
  );
}
