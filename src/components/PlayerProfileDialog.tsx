import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LevelBadge } from "@/components/RankIndicators";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation, DbProfile, DbTempPlayer } from "@/lib/db-types";
import { computeAchievements, totalAchievementXp } from "@/lib/achievements";
import { levelFromXp } from "@/lib/xpSystem";
import { formatPoints } from "@/lib/format";
import { Loader2, Trophy, Award, Target, Zap, Calendar, Spade, Crown, TrendingUp, Hash } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: string | null;
  isTemp: boolean;
}

type YearFilter = number | "all";

export function PlayerProfileDialog({ open, onOpenChange, playerId, isTemp }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<YearFilter>(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["player-profile", playerId, isTemp],
    enabled: !!playerId && open,
    queryFn: async () => {
      if (!playerId) return null;
      // perfil
      let profile: DbProfile | null = null;
      let temp: DbTempPlayer | null = null;
      if (isTemp) {
        const { data } = await supabase.from("temporary_players").select("*").eq("id", playerId).maybeSingle();
        temp = (data as any) ?? null;
      } else {
        const { data } = await supabase.from("profiles").select("*").eq("id", playerId).maybeSingle();
        profile = (data as any) ?? null;
      }

      // participações + games
      const col = isTemp ? "temp_player_id" : "user_id";
      const { data: parts } = await supabase.from("game_participations").select("*").eq(col, playerId);
      const list = ((parts ?? []) as DbParticipation[]);
      const ids = [...new Set(list.map((p) => p.game_id))];
      const gamesRes = ids.length
        ? await supabase.from("games").select("*").in("id", ids)
        : { data: [] as DbGame[] };
      const gMap = new Map(((gamesRes.data ?? []) as DbGame[]).map((g) => [g.id, g]));
      const finished = list
        .map((p) => ({ p, g: gMap.get(p.game_id) }))
        .filter((x): x is { p: DbParticipation; g: DbGame } => !!x.g && x.g.status === "finished");

      // monthly + season
      const [{ data: monthly }, { data: champs }] = await Promise.all([
        isTemp
          ? supabase.from("monthly_rankings").select("*").eq("champion_temp_player_id", playerId)
          : supabase.from("monthly_rankings").select("*").eq("champion_user_id", playerId),
        isTemp
          ? supabase.from("season_champions").select("*").or(`k_temp_player_id.eq.${playerId},as_temp_player_id.eq.${playerId}`)
          : supabase.from("season_champions").select("*").or(`k_user_id.eq.${playerId},as_user_id.eq.${playerId}`),
      ]);

      // ranking position by year (todas temporadas que o jogador participou)
      const seasonsSet = new Set<number>(finished.map((x) => x.g.season_year));
      const seasons = [...seasonsSet].sort((a, b) => b - a);
      const positions = new Map<number, number>();
      for (const y of seasons) {
        // Buscar TODAS as partidas finalizadas da temporada (não apenas as do jogador)
        const { data: yearGames } = await supabase
          .from("games")
          .select("id")
          .eq("season_year", y)
          .eq("status", "finished");
        const yearGameIds = (yearGames ?? []).map((g: any) => g.id as string);
        if (!yearGameIds.length) continue;
        const { data: allParts } = await supabase
          .from("game_participations")
          .select("user_id, temp_player_id, ranking_points, game_id")
          .in("game_id", yearGameIds);
        const totals = new Map<string, number>();
        for (const ap of (allParts ?? []) as any[]) {
          const k = ap.user_id ? `u:${ap.user_id}` : ap.temp_player_id ? `t:${ap.temp_player_id}` : null;
          if (!k) continue;
          totals.set(k, (totals.get(k) ?? 0) + Number(ap.ranking_points || 0));
        }
        const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        const myKey = isTemp ? `t:${playerId}` : `u:${playerId}`;
        const idx = sorted.findIndex(([k]) => k === myKey);
        if (idx >= 0) positions.set(y, idx + 1);
      }

      return { profile, temp, finished, monthly: monthly ?? [], champs: champs ?? [], seasons, positions };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const filter = (g: DbGame) => year === "all" || g.season_year === year;
    const filteredFinished = data.finished.filter((x) => filter(x.g));
    const filteredMonthly = data.monthly.filter((m: any) => year === "all" || m.season_year === year);
    const filteredChamps = data.champs.filter((c: any) => year === "all" || c.year === year);
    const playerId = data.profile?.id ?? data.temp?.id;
    return {
      games: filteredFinished.length,
      wins: filteredFinished.filter((x) => x.p.position === 1).length,
      podiums: filteredFinished.filter((x) => x.p.position && x.p.position <= 3).length,
      monthsWon: filteredMonthly.length,
      kos: filteredFinished.reduce((s, x) => s + Number(x.p.ko_points || 0), 0),
      entries: filteredFinished.reduce((s, x) => s + Number(x.p.entries || 0) + Number(x.p.rebuys || 0), 0),
      asTitles: filteredChamps.filter((c: any) => isTemp ? c.as_temp_player_id === playerId : c.as_user_id === playerId).length,
      kTitles: filteredChamps.filter((c: any) => isTemp ? c.k_temp_player_id === playerId : c.k_user_id === playerId).length,
      rankPos: typeof year === "number" ? data.positions.get(year) ?? null : null,
      history: filteredFinished.map((x) => ({ game: x.g, participation: x.p })),
    };
  }, [data, year]);

  const achievements = useMemo(() => {
    if (!data || !stats) return [];
    return computeAchievements({
      history: stats.history,
      monthsWon: stats.monthsWon,
      asTitles: stats.asTitles,
      kTitles: stats.kTitles,
    });
  }, [data, stats]);

  // XP/level computado dinamicamente do histórico completo + conquistas (não depende do filtro de ano)
  const liveLevelInfo = useMemo(() => {
    if (!data) return null;
    const allHistory = data.finished.map((x) => ({ game: x.g, participation: x.p }));
    const xpFromGames = allHistory.reduce((s, h) => s + Number(h.participation.xp_earned || 0), 0);
    const playerKey = data.profile?.id ?? data.temp?.id;
    const monthsWonAll = data.monthly.length;
    const asAll = data.champs.filter((c: any) => isTemp ? c.as_temp_player_id === playerKey : c.as_user_id === playerKey).length;
    const kAll = data.champs.filter((c: any) => isTemp ? c.k_temp_player_id === playerKey : c.k_user_id === playerKey).length;
    const ach = computeAchievements({ history: allHistory, monthsWon: monthsWonAll, asTitles: asAll, kTitles: kAll });
    const totalXp = xpFromGames + totalAchievementXp(ach);
    return { totalXp, ...levelFromXp(totalXp) };
  }, [data, isTemp]);

  const display = data?.profile
    ? { nickname: data.profile.nickname ?? "Jogador", avatarId: data.profile.avatar_url ?? "a1", level: liveLevelInfo?.level ?? data.profile.level, isTemp: false }
    : data?.temp
    ? { nickname: data.temp.nickname, avatarId: data.temp.avatar_url ?? "a1", level: undefined, isTemp: true }
    : null;

  const yearOptions: YearFilter[] = ["all", ...((data?.seasons ?? []).length ? data!.seasons : [currentYear])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display fpc-text-gold">Perfil do Jogador</DialogTitle>
        </DialogHeader>

        {isLoading || !data || !display || !stats ? (
          <div className="flex justify-center py-16"><Loader2 className="size-8 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4 flex-wrap">
              <PlayerAvatar avatarId={display.avatarId} name={display.nickname} size={72} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-2xl break-words">{display.nickname}</h2>
                  {display.level !== undefined && <LevelBadge level={display.level} />}
                  {display.isTemp && <Badge variant="outline">Temporário</Badge>}
                </div>
                {data.profile?.full_name && <p className="text-xs text-muted-foreground">{data.profile.full_name}</p>}
              </div>
              <Select value={String(year)} onValueChange={(v) => setYear(v === "all" ? "all" : parseInt(v))}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={String(y)} value={String(y)}>{y === "all" ? "Geral (todos os anos)" : y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBlock icon={<Trophy className="size-4" />} label="Partidas" value={stats.games} />
              {year === "all" ? (
                <>
                  <StatBlock icon={<Award className="size-4" />} label="Vitórias" value={stats.wins} />
                  <StatBlock icon={<Target className="size-4" />} label="Pódios" value={stats.podiums} />
                  <StatBlock icon={<Calendar className="size-4" />} label="Meses Vencidos" value={stats.monthsWon} />
                  <StatBlock icon={<Spade className="size-4" />} label="Ás Vencidos" value={stats.asTitles} />
                  <StatBlock icon={<Crown className="size-4" />} label="K do Poker" value={stats.kTitles} />
                  <StatBlock icon={<Zap className="size-4" />} label="KOs" value={stats.kos} />
                  <StatBlock icon={<Hash className="size-4" />} label="Entradas" value={stats.entries} />
                </>
              ) : (
                <>
                  <StatBlock icon={<TrendingUp className="size-4" />} label="Posição Ranking" value={stats.rankPos ?? "—"} />
                  <StatBlock icon={<Award className="size-4" />} label="Vitórias" value={stats.wins} />
                  <StatBlock icon={<Target className="size-4" />} label="Pódios" value={stats.podiums} />
                  <StatBlock icon={<Calendar className="size-4" />} label="Meses Vencidos" value={stats.monthsWon} />
                  <StatBlock icon={<Spade className="size-4" />} label="Ás Vencidos" value={stats.asTitles} />
                  <StatBlock icon={<Crown className="size-4" />} label="K do Poker" value={stats.kTitles} />
                  <StatBlock icon={<Zap className="size-4" />} label="KOs" value={stats.kos} />
                </>
              )}
            </div>

            {year === "all" && (
              <Card className="fpc-card">
                <CardContent className="p-4">
                  <h3 className="font-display fpc-text-gold mb-3 flex items-center gap-2"><Award className="size-5" />Conquistas Desbloqueadas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {achievements.filter((a) => a.unlocked).map((a) => (
                      <div key={a.def.code} className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 flex items-start gap-2">
                        <span className="text-xl leading-none">{a.def.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{a.def.name}{a.def.repeatable && a.count > 1 ? ` ×${a.count}` : ""}</p>
                          <p className="text-[10px] text-muted-foreground">{a.def.description}</p>
                        </div>
                      </div>
                    ))}
                    {achievements.filter((a) => a.unlocked).length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-full text-center py-4">Nenhuma conquista ainda.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="fpc-card rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="font-display text-lg fpc-text-gold mt-1">{value}</p>
    </div>
  );
}
