import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useGame } from "@/hooks/useGames";
import { participantDisplay } from "@/lib/db-types";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Calendar, Coins, Loader2, Trophy, Users, Swords } from "lucide-react";

interface Props {
  gameId: string | null;
  onOpenChange: (v: boolean) => void;
}

export function GameQuickViewModal({ gameId, onOpenChange }: Props) {
  const open = !!gameId;
  const { data: game, isLoading } = useGame(gameId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold break-words">
            {game?.name ?? "Partida"}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !game ? (
          <div className="flex justify-center py-10"><Loader2 className="size-6 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className="bg-gradient-tournament text-tournament-foreground border-0">Torneio</Badge>
              <Badge variant={game.status === "finished" ? "default" : game.status === "in_progress" ? "secondary" : "outline"}>
                {game.status === "finished" ? "Finalizada" : game.status === "in_progress" ? "Em andamento" : "Agendada"}
              </Badge>
              {game.is_as_game && <Badge className="bg-warning/20 text-warning border-warning/40">🂡 Ás</Badge>}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="fpc-card p-3 flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <span>{formatDateTime(game.date)}</span>
              </div>
              <div className="fpc-card p-3 flex items-center gap-2">
                <Coins className="size-4 text-primary" />
                <span>Buy-in {formatBRL(Number(game.buy_in))} · Rebuy {formatBRL(Number(game.rebuy_value))}</span>
              </div>
              <div className="fpc-card p-3 flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <span>Pote {formatBRL(Number(game.total_pot))} · Prêmio {formatBRL(Number(game.prize_pool))}</span>
              </div>
              <div className="fpc-card p-3 flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span>{game.participations.length} jogadores</span>
              </div>
            </div>

            <div>
              <h3 className="font-display fpc-text-gold text-sm mb-2">Resultados</h3>
              <div className="space-y-1.5">
                {[...game.participations]
                  .sort((a, b) => {
                    const pa = a.position ?? 9999;
                    const pb = b.position ?? 9999;
                    return pa - pb;
                  })
                  .map((p) => {
                    const d = participantDisplay(p);
                    const medal = p.position === 1 ? "text-warning" : p.position === 2 ? "text-muted-foreground" : p.position === 3 ? "text-tournament" : "text-foreground";
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary/40">
                        <span className={`font-display text-base w-8 text-center ${medal}`}>
                          {p.position ? `${p.position}º` : "—"}
                        </span>
                        <PlayerAvatar avatarId={d.avatarId} name={d.nickname} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-words line-clamp-2">
                            {d.nickname}
                            {d.isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><Swords className="size-3" />{p.ko_points} KOs</span>
                            <span>{Number(p.ranking_points || 0).toLocaleString("pt-BR")} pts</span>
                            {Number(p.prize_won || 0) > 0 && (
                              <span className="text-primary">{formatBRL(Number(p.prize_won))}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
