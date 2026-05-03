import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAMES, PLAYERS, playerById } from "@/lib/mockData";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatPoints } from "@/lib/format";

export default function Estatisticas() {
  const stats = PLAYERS.map((p) => {
    const games = GAMES.filter((g) => g.status === "finished" && g.participants.some((x) => x.playerId === p.id));
    const wins = games.filter((g) => g.participants.find((x) => x.playerId === p.id)?.position === 1).length;
    const points = games.reduce((s, g) => s + (g.participants.find((x) => x.playerId === p.id)?.points ?? 0), 0);
    const kos = games.reduce((s, g) => s + (g.participants.find((x) => x.playerId === p.id)?.koPoints ?? 0), 0);
    const entries = games.reduce((s, g) => s + (g.participants.find((x) => x.playerId === p.id)?.entries ?? 0), 0);
    const rebuys = games.reduce((s, g) => s + (g.participants.find((x) => x.playerId === p.id)?.rebuys ?? 0), 0);
    return { p, games: games.length, wins, points, kos, entries, rebuys, avg: games.length ? Math.round(points / games.length) : 0 };
  }).sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl fpc-text-gold">Estatísticas</h1>
      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Visão Geral por Jogador</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 px-2">Jogador</th>
                <th className="text-right py-2 px-2">Partidas</th>
                <th className="text-right py-2 px-2">Vitórias</th>
                <th className="text-right py-2 px-2">KOs</th>
                <th className="text-right py-2 px-2">Entradas</th>
                <th className="text-right py-2 px-2">Rebuys</th>
                <th className="text-right py-2 px-2">Pontos</th>
                <th className="text-right py-2 px-2">Média</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.p.id} className="border-b border-border/40">
                  <td className="py-2 px-2 flex items-center gap-2">
                    <PlayerAvatar avatarId={s.p.avatarId} name={s.p.nickname} size={28} />
                    <span className="break-words line-clamp-2">{s.p.nickname}</span>
                  </td>
                  <td className="text-right px-2">{s.games}</td>
                  <td className="text-right px-2">{s.wins}</td>
                  <td className="text-right px-2">{s.kos}</td>
                  <td className="text-right px-2">{s.entries}</td>
                  <td className="text-right px-2">{s.rebuys}</td>
                  <td className="text-right px-2 text-primary font-display">{formatPoints(s.points)}</td>
                  <td className="text-right px-2">{formatPoints(s.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
