import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatPoints, formatBRL } from "@/lib/format";
import { useGames } from "@/hooks/useGames";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { DbParticipation, DbProfile, DbTempPlayer } from "@/lib/db-types";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "nickname" | "games" | "wins" | "kos" | "entriesTotal" | "points" | "avg" | "prize" | "invested" | "profit";

interface Stat {
  key: string;
  id: string;
  isTemp: boolean;
  nickname: string;
  avatarId: string;
  games: number;
  wins: number;
  points: number;
  kos: number;
  entries: number;
  rebuys: number;
  prize: number;
  invested: number;
}

export default function Estatisticas() {
  const { data: games = [], isLoading: gLoading } = useGames();
  const seasons = [...new Set(games.map((g) => g.season_year))].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const list = seasons.length ? seasons : [currentYear];

  const finishedIds = useMemo(
    () => games.filter((g) => g.status === "finished" && g.season_year === year).map((g) => g.id),
    [games, year]
  );

  const { data: parts = [], isLoading: pLoading } = useQuery({
    queryKey: ["stats-parts", year, finishedIds.length],
    enabled: finishedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("game_participations").select("*").in("game_id", finishedIds);
      if (error) throw error;
      return (data ?? []) as DbParticipation[];
    },
  });

  const { data: meta } = useQuery({
    queryKey: ["stats-meta", year, parts.length],
    enabled: parts.length > 0,
    queryFn: async () => {
      const userIds = [...new Set(parts.map((p) => p.user_id).filter(Boolean) as string[])];
      const tempIds = [...new Set(parts.map((p) => p.temp_player_id).filter(Boolean) as string[])];
      const [{ data: profs }, { data: temps }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, nickname, avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
        tempIds.length ? supabase.from("temporary_players").select("id, nickname, avatar_url").in("id", tempIds) : Promise.resolve({ data: [] }),
      ]);
      return {
        prof: new Map((profs ?? []).map((p: any) => [p.id, p as DbProfile])),
        temp: new Map((temps ?? []).map((p: any) => [p.id, p as DbTempPlayer])),
      };
    },
  });

  const stats: Stat[] = useMemo(() => {
    if (!meta) return [];
    const map = new Map<string, Stat>();
    for (const p of parts) {
      if (!p.user_id && !p.temp_player_id) continue;
      const isTemp = !!p.temp_player_id;
      const key = isTemp ? `t:${p.temp_player_id}` : `u:${p.user_id}`;
      const m: any = isTemp ? meta.temp.get(p.temp_player_id!) : meta.prof.get(p.user_id!);
      const cur = map.get(key) ?? {
        key, id: (p.user_id ?? p.temp_player_id) as string, isTemp,
        nickname: m?.nickname ?? p.snapshot_nickname ?? "Jogador",
        avatarId: m?.avatar_url ?? p.snapshot_avatar_url ?? "a1",
        games: 0, wins: 0, points: 0, kos: 0, entries: 0, rebuys: 0,
      };
      cur.games += 1;
      if (p.position === 1) cur.wins += 1;
      cur.points += Number(p.ranking_points || 0);
      cur.kos += Number(p.ko_points || 0);
      cur.entries += Number(p.entries || 0);
      cur.rebuys += Number(p.rebuys || 0);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.points - a.points);
  }, [parts, meta]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl fpc-text-gold">Estatísticas</h1>
        <Tabs value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <TabsList>{list.map((y) => <TabsTrigger key={y} value={String(y)}>{y}</TabsTrigger>)}</TabsList>
        </Tabs>
      </div>
      <Card className="fpc-card">
        <CardHeader><CardTitle className="font-display fpc-text-gold">Visão Geral por Jogador — {year}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {(gLoading || pLoading) ? <div className="flex justify-center py-10"><Loader2 className="size-6 text-primary animate-spin" /></div> : (
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
                  <tr key={s.key} className="border-b border-border/40">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar avatarId={s.avatarId} name={s.nickname} size={28} />
                        <span className="break-words line-clamp-2">{s.nickname}{s.isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}</span>
                      </div>
                    </td>
                    <td className="text-right px-2">{s.games}</td>
                    <td className="text-right px-2">{s.wins}</td>
                    <td className="text-right px-2">{s.kos}</td>
                    <td className="text-right px-2">{s.entries}</td>
                    <td className="text-right px-2">{s.rebuys}</td>
                    <td className="text-right px-2 text-primary font-display">{formatPoints(s.points)}</td>
                    <td className="text-right px-2">{formatPoints(s.games ? Math.round(s.points / s.games) : 0)}</td>
                  </tr>
                ))}
                {stats.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted-foreground py-8 text-sm">Sem partidas finalizadas nesta temporada.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
