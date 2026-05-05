import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatPoints, formatBRL } from "@/lib/format";
import { useGames } from "@/hooks/useGames";
import { useMonthlyRankings } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { DbParticipation, DbProfile, DbTempPlayer } from "@/lib/db-types";
import { Loader2, ArrowUp, ArrowDown, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

  const { data: monthlyRankings = [] } = useMonthlyRankings(year);

  const { data: meta } = useQuery({
    queryKey: ["stats-meta", year, parts.length, monthlyRankings.length],
    enabled: parts.length > 0 || monthlyRankings.length > 0,
    queryFn: async () => {
      const userIds = [
        ...new Set([
          ...parts.map((p) => p.user_id).filter(Boolean) as string[],
          ...monthlyRankings.map((m) => m.champion_user_id).filter(Boolean) as string[],
        ]),
      ];
      const tempIds = [
        ...new Set([
          ...parts.map((p) => p.temp_player_id).filter(Boolean) as string[],
          ...monthlyRankings.map((m) => m.champion_temp_player_id).filter(Boolean) as string[],
        ]),
      ];
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
      const cur: Stat = map.get(key) ?? {
        key, id: (p.user_id ?? p.temp_player_id) as string, isTemp,
        nickname: m?.nickname ?? p.snapshot_nickname ?? "Jogador",
        avatarId: m?.avatar_url ?? p.snapshot_avatar_url ?? "a1",
        games: 0, wins: 0, points: 0, kos: 0, entries: 0, rebuys: 0, prize: 0, invested: 0,
      };
      cur.games += 1;
      if (p.position === 1) cur.wins += 1;
      cur.points += Number(p.ranking_points || 0);
      cur.kos += Number(p.ko_points || 0);
      cur.entries += Number(p.entries || 0);
      cur.rebuys += Number(p.rebuys || 0);
      cur.prize += Number((p as any).prize_won || 0);
      cur.invested += Number(p.total_invested || 0);
      map.set(key, cur);
    }
    // soma prêmios de meses vencidos ao prize (e portanto ao lucro)
    for (const mr of monthlyRankings) {
      const isTemp = !!mr.champion_temp_player_id;
      const id = mr.champion_user_id ?? mr.champion_temp_player_id;
      if (!id) continue;
      const key = isTemp ? `t:${mr.champion_temp_player_id}` : `u:${mr.champion_user_id}`;
      const m: any = isTemp ? meta.temp.get(mr.champion_temp_player_id!) : meta.prof.get(mr.champion_user_id!);
      const cur: Stat = map.get(key) ?? {
        key, id: id as string, isTemp,
        nickname: m?.nickname ?? "Jogador",
        avatarId: m?.avatar_url ?? "a1",
        games: 0, wins: 0, points: 0, kos: 0, entries: 0, rebuys: 0, prize: 0, invested: 0,
      };
      cur.prize += Number(mr.prize_amount || 0);
      map.set(key, cur);
    }
    return [...map.values()];
  }, [parts, meta, monthlyRankings]);

  const [sortKey, setSortKey] = useState<SortKey>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...stats];
    const getter = (s: Stat): number | string => {
      switch (sortKey) {
        case "nickname": return s.nickname.toLowerCase();
        case "games": return s.games;
        case "wins": return s.wins;
        case "kos": return s.kos;
        case "entriesTotal": return s.entries + s.rebuys;
        case "points": return s.points;
        case "avg": return s.games ? s.points / s.games : 0;
        case "prize": return s.prize;
        case "invested": return s.invested;
        case "profit": return s.prize - s.invested;
      }
    };
    arr.sort((a, b) => {
      const va = getter(a), vb = getter(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [stats, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "nickname" ? "asc" : "desc"); }
  };

  const SortTh = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-2 px-2 ${align === "right" ? "text-right" : "text-left"} select-none`}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-primary transition ${sortKey === k ? "text-primary" : ""}`}
      >
        {label}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl fpc-text-gold">Estatísticas</h1>
        <Tabs value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <TabsList>{list.map((y) => <TabsTrigger key={y} value={String(y)}>{y}</TabsTrigger>)}</TabsList>
        </Tabs>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="months">Meses Vencidos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="fpc-card">
            <CardHeader><CardTitle className="font-display fpc-text-gold">Visão Geral por Jogador — {year}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {(gLoading || pLoading) ? <div className="flex justify-center py-10"><Loader2 className="size-6 text-primary animate-spin" /></div> : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <SortTh k="nickname" label="Jogador" align="left" />
                      <SortTh k="games" label="Partidas" />
                      <SortTh k="wins" label="Vitórias" />
                      <SortTh k="kos" label="KOs" />
                      <SortTh k="entriesTotal" label="Entradas" />
                      <SortTh k="points" label="Pontos" />
                      <SortTh k="avg" label="Média" />
                      <SortTh k="prize" label="Prêmio" />
                      <SortTh k="invested" label="Investido" />
                      <SortTh k="profit" label="Lucro" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((s) => {
                      const profit = s.prize - s.invested;
                      return (
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
                          <td className="text-right px-2">
                            <div className="font-medium">{s.entries + s.rebuys}</div>
                            <div className="text-[10px] text-muted-foreground">{s.entries} BI · {s.rebuys} RB</div>
                          </td>
                          <td className="text-right px-2 text-primary font-display">{formatPoints(s.points)}</td>
                          <td className="text-right px-2">{formatPoints(s.games ? Math.round(s.points / s.games) : 0)}</td>
                          <td className="text-right px-2">{formatBRL(s.prize)}</td>
                          <td className="text-right px-2">{formatBRL(s.invested)}</td>
                          <td className={`text-right px-2 font-medium ${profit > 0 ? "text-success" : profit < 0 ? "text-destructive" : ""}`}>{formatBRL(profit)}</td>
                        </tr>
                      );
                    })}
                    {sorted.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-muted-foreground py-8 text-sm">Sem partidas finalizadas nesta temporada.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="months">
          <Card className="fpc-card">
            <CardHeader><CardTitle className="font-display fpc-text-gold">Meses Vencidos — {year}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {monthlyRankings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhum mês encerrado nesta temporada.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-2 text-left">Mês</th>
                      <th className="py-2 px-2 text-left">Campeão</th>
                      <th className="py-2 px-2 text-right">Prêmio</th>
                      <th className="py-2 px-2 text-right">Encerrado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthlyRankings].sort((a, b) => a.month - b.month).map((mr) => {
                      const isTemp = !!mr.champion_temp_player_id;
                      const m: any = isTemp
                        ? meta?.temp.get(mr.champion_temp_player_id!)
                        : mr.champion_user_id ? meta?.prof.get(mr.champion_user_id) : null;
                      const nickname = m?.nickname ?? "—";
                      const avatarId = m?.avatar_url ?? "a1";
                      return (
                        <tr key={mr.id} className="border-b border-border/40">
                          <td className="py-2 px-2 font-medium">{MONTH_NAMES[mr.month - 1] ?? mr.month}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              {m ? <PlayerAvatar avatarId={avatarId} name={nickname} size={28} /> : <Trophy className="size-5 text-primary" />}
                              <span className="break-words">{nickname}{isTemp && <span className="ml-2 text-[10px] uppercase text-muted-foreground">temp</span>}</span>
                            </div>
                          </td>
                          <td className="text-right px-2 text-success font-medium">{formatBRL(Number(mr.prize_amount || 0))}</td>
                          <td className="text-right px-2 text-muted-foreground">{new Date(mr.closed_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
