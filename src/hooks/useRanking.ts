import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation, DbProfile, DbTempPlayer } from "@/lib/db-types";
import { computeAchievements, totalAchievementXp } from "@/lib/achievements";
import { levelFromXp } from "@/lib/xpSystem";

export interface RankingRow {
  id: string;
  isTemp: boolean;
  nickname: string;
  avatarId: string;
  level?: number;
  points: number;
  games: number;
  wins: number;
}

interface Opts {
  year: number;
  month?: number;
  monthMax?: number;
  excludeGameIds?: string[];
}

async function fetchRanking({ year, month, monthMax, excludeGameIds }: Opts): Promise<RankingRow[]> {
  let q = supabase
    .from("games")
    .select("id, season_year, month, status, date")
    .eq("season_year", year)
    .eq("status", "finished");
  if (month) q = q.eq("month", month);
  if (monthMax) q = q.lte("month", monthMax);
  const { data: games, error } = await q;
  if (error) throw error;
  let gameIds = (games ?? []).map((g: any) => g.id as string);
  if (excludeGameIds && excludeGameIds.length) {
    const exclude = new Set(excludeGameIds);
    gameIds = gameIds.filter((id) => !exclude.has(id));
  }
  if (gameIds.length === 0) return [];

  const { data: parts, error: e2 } = await supabase
    .from("game_participations")
    .select("*")
    .in("game_id", gameIds);
  if (e2) throw e2;

  const userIds = [...new Set((parts ?? []).map((p: any) => p.user_id).filter(Boolean) as string[])];
  const tempIds = [...new Set((parts ?? []).map((p: any) => p.temp_player_id).filter(Boolean) as string[])];

  const [{ data: profs }, { data: temps }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, nickname, avatar_url, level").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    tempIds.length
      ? supabase.from("temporary_players").select("id, nickname, avatar_url").in("id", tempIds)
      : Promise.resolve({ data: [] as Pick<DbTempPlayer, "id" | "nickname" | "avatar_url">[] }),
  ]);
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const tempMap = new Map((temps ?? []).map((p: any) => [p.id, p]));

  const rows = new Map<string, RankingRow>();
  for (const p of (parts ?? []) as DbParticipation[]) {
    const key = p.user_id ? `u:${p.user_id}` : p.temp_player_id ? `t:${p.temp_player_id}` : null;
    if (!key) continue;
    const isTemp = !!p.temp_player_id;
    const meta: any = isTemp ? tempMap.get(p.temp_player_id!) : profMap.get(p.user_id!);
    const row = rows.get(key) ?? {
      id: (p.user_id ?? p.temp_player_id) as string,
      isTemp,
      nickname: meta?.nickname ?? p.snapshot_nickname ?? "Jogador",
      avatarId: meta?.avatar_url ?? p.snapshot_avatar_url ?? "a1",
      level: !isTemp ? Number(meta?.level ?? 1) : undefined,
      points: 0,
      games: 0,
      wins: 0,
    };
    row.points += Number(p.ranking_points || 0);
    row.games += 1;
    if (p.position === 1) row.wins += 1;
    rows.set(key, row);
  }
  // Recalcula nível dinamicamente (XP de TODAS as partidas + conquistas), independente do filtro
  const userRows = [...rows.values()].filter((r) => !r.isTemp);
  if (userRows.length) {
    const uids = userRows.map((r) => r.id);
    const [{ data: allParts }, { data: allGames }, { data: months }, { data: seasons }] = await Promise.all([
      supabase.from("game_participations").select("*").in("user_id", uids),
      supabase.from("games").select("*").eq("status", "finished"),
      supabase.from("monthly_rankings").select("champion_user_id").in("champion_user_id", uids),
      supabase.from("season_champions").select("k_user_id, as_user_id"),
    ]);
    const gMap = new Map(((allGames ?? []) as DbGame[]).map((g) => [g.id, g]));
    const histByUser = new Map<string, { game: DbGame; participation: DbParticipation }[]>();
    const xpByUser = new Map<string, number>();
    for (const p of ((allParts ?? []) as DbParticipation[])) {
      const g = gMap.get(p.game_id);
      if (!g || !p.user_id) continue;
      const arr = histByUser.get(p.user_id) ?? [];
      arr.push({ game: g, participation: p });
      histByUser.set(p.user_id, arr);
      xpByUser.set(p.user_id, (xpByUser.get(p.user_id) || 0) + Number(p.xp_earned || 0));
    }
    const monthsByUser = new Map<string, number>();
    for (const r of (months ?? []) as any[]) {
      if (r.champion_user_id) monthsByUser.set(r.champion_user_id, (monthsByUser.get(r.champion_user_id) || 0) + 1);
    }
    const asByUser = new Map<string, number>();
    const kByUser = new Map<string, number>();
    for (const r of (seasons ?? []) as any[]) {
      if (r.k_user_id) kByUser.set(r.k_user_id, (kByUser.get(r.k_user_id) || 0) + 1);
      if (r.as_user_id) asByUser.set(r.as_user_id, (asByUser.get(r.as_user_id) || 0) + 1);
    }
    for (const row of userRows) {
      const ach = computeAchievements({
        history: histByUser.get(row.id) ?? [],
        monthsWon: monthsByUser.get(row.id) ?? 0,
        asTitles: asByUser.get(row.id) ?? 0,
        kTitles: kByUser.get(row.id) ?? 0,
      });
      const totalXp = (xpByUser.get(row.id) ?? 0) + totalAchievementXp(ach);
      row.level = levelFromXp(totalXp).level;
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points);
}

export function useRanking({ year, month }: Opts) {
  return useQuery({
    queryKey: ["ranking", year, month ?? "season"],
    queryFn: () => fetchRanking({ year, month }),
  });
}

export function rowKey(r: { id: string; isTemp: boolean }) {
  return `${r.isTemp ? "t" : "u"}:${r.id}`;
}

/**
 * delta > 0 = subiu, < 0 = desceu, 0 = manteve, null = novo.
 * Compara ranking atual da temporada vs ranking ANTES da última partida finalizada.
 * Assim as setas refletem o efeito do último jogo registrado.
 */
export function useSeasonRankingDelta(year: number) {
  return useQuery({
    queryKey: ["ranking-delta", year, "last-game"],
    staleTime: 5 * 60 * 1000, // não refetch por 5 minutos
    queryFn: async () => {
      const delta = new Map<string, number | null>();
      // Pega a última partida finalizada da temporada
      const { data: lastGames } = await supabase
        .from("games")
        .select("id, date")
        .eq("season_year", year)
        .eq("status", "finished")
        .order("date", { ascending: false })
        .limit(1);
      const lastGameId = lastGames?.[0]?.id as string | undefined;
      if (!lastGameId) return delta;

      const [current, previous] = await Promise.all([
        fetchRanking({ year }),
        fetchRanking({ year, excludeGameIds: [lastGameId] }),
      ]);
      const prevPos = new Map<string, number>();
      previous.forEach((r, i) => prevPos.set(rowKey(r), i + 1));
      current.forEach((r, i) => {
        const k = rowKey(r);
        const prev = prevPos.get(k);
        delta.set(k, prev === undefined ? null : prev - (i + 1));
      });
      return delta;
    },
  });
}
