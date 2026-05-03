import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Coins, Trophy, Loader2 } from "lucide-react";
import { useGames } from "@/hooks/useGames";
import { formatBRL, formatDateTime } from "@/lib/format";
import { CreateGameModal } from "@/components/CreateGameModal";
import { GameDetailsModal } from "@/components/GameDetailsModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Partidas() {
  const { isAdmin } = useAuth();
  const { data: games, isLoading } = useGames();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>
      ) : !games || games.length === 0 ? (
        <Card className="fpc-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma partida ainda. {isAdmin && "Clique em \"Nova Partida\" para começar."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
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
        </div>
      )}

      <CreateGameModal open={createOpen} onOpenChange={setCreateOpen} />
      <GameDetailsModal gameId={detailsId} onOpenChange={(v) => !v && setDetailsId(null)} />
    </div>
  );
}
