import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, FileText, Crown, Medal } from "lucide-react";
import { CURRENT_USER_ID, getSeasonalRanking, playerById } from "@/lib/mockData";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatPoints, ordinal } from "@/lib/format";
import { toast } from "sonner";

export default function Ranking() {
  const year = new Date().getFullYear();
  const ranking = useMemo(() => getSeasonalRanking(year), [year]);
  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl fpc-text-gold">Ranking — Temporada {year}</h1>
          <p className="text-sm text-muted-foreground">Pontuação acumulada por toda a temporada.</p>
        </div>
        <Button onClick={() => toast.success("Relatório gerado (mock)")} className="bg-gradient-gold text-primary-foreground">
          <FileText className="size-4 mr-1" />Gerar Relatório
        </Button>
      </div>

      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[1, 0, 2].map((order) => {
            const row = podium[order];
            if (!row) return <div key={order} />;
            const player = playerById(row.playerId);
            const place = order + 1;
            const heights = [1, 0, 2];
            void heights;
            const styles = place === 1 ? "scale-105 border-primary/60" : "";
            const icon = place === 1 ? <Crown className="size-6 text-warning" /> : place === 2 ? <Medal className="size-6 text-muted-foreground" /> : <Medal className="size-6 text-tournament" />;
            return (
              <Card key={row.playerId} className={`fpc-card ${styles}`}>
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
                  {icon}
                  <PlayerAvatar avatarId={player?.avatarId} name={player?.nickname} size={place === 1 ? 64 : 52} />
                  <p className="font-medium text-sm break-words line-clamp-2">{player?.nickname}</p>
                  <p className="font-display text-xl text-primary">{formatPoints(row.points)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ordinal(place)} lugar</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold flex items-center gap-2"><Trophy className="size-5" />Classificação completa</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ranking.map((row, i) => {
            const player = playerById(row.playerId);
            if (!player) return null;
            const me = row.playerId === CURRENT_USER_ID;
            return (
              <div key={row.playerId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${me ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/40"}`}>
                <span className="font-display text-lg w-8 text-center text-primary">{i + 1}º</span>
                <PlayerAvatar avatarId={player.avatarId} name={player.nickname} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm break-words line-clamp-2">{player.nickname}</p>
                  <p className="text-xs text-muted-foreground">{row.games} partidas · {row.wins} vitórias</p>
                </div>
                <p className="font-display text-base text-primary">{formatPoints(row.points)}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
