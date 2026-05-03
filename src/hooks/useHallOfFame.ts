import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation, DbProfile, DbTempPlayer } from "@/lib/db-types";

export interface HallEntry {
  key: string;
  isTemp: boolean;
  id: string;
  nickname: string;
  avatarId: string;
  count: number;
  year?: number;
}

export interface HallData {
  rounds: HallEntry[]; // vencedores de partidas (acumulado)
  months: HallEntry[]; // meses vencidos
  yearChampions: HallEntry[]; // K do Poker (oficial via season_champions, fallback agregação)
  asChampions: HallEntry[]; // Ás do Poker (indicado pelo admin)
}

export function useHallOfFame() {
  return useQuery({
    queryKey: ["hall-of-fame"],
    queryFn: async (): Promise<HallData> => {
      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .eq("status", "finished");
      if (error) throw error;
      const gamesList = (games ?? []) as DbGame[];
      const gameIds = gamesList.map((g) => g.id);

      const [{ data: champs }, { data: profsAll }] = await Promise.all([
        supabase.from("season_champions").select("*"),
        supabase.from("profiles").select("id, nickname, avatar_url"),
      ]);
      const profAllMap = new Map((profsAll ?? []).map((p: any) => [p.id, p]));

      if (!gameIds.length) {
        const yearChampions = (champs ?? []).filter((c: any) => c.k_user_id).map((c: any) => {
          const p: any = profAllMap.get(c.k_user_id);
          return { key: `u:${c.k_user_id}`, isTemp: false, id: c.k_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year } as HallEntry;
        });
        const asChampions = (champs ?? []).filter((c: any) => c.as_user_id).map((c: any) => {
          const p: any = profAllMap.get(c.as_user_id);
          return { key: `u:${c.as_user_id}`, isTemp: false, id: c.as_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year } as HallEntry;
        });
        return { rounds: [], months: [], yearChampions, asChampions };
      }

      const { data: parts, error: e2 } = await supabase
        .from("game_participations")
        .select("*")
        .in("game_id", gameIds);
      if (e2) throw e2;

      const userIds = [...new Set((parts ?? []).map((p: any) => p.user_id).filter(Boolean) as string[])];
      const tempIds = [...new Set((parts ?? []).map((p: any) => p.temp_player_id).filter(Boolean) as string[])];
      const [{ data: profs }, { data: temps }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, nickname, avatar_url, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
        tempIds.length ? supabase.from("temporary_players").select("id, nickname, avatar_url, full_name").in("id", tempIds) : Promise.resolve({ data: [] }),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const tempMap = new Map((temps ?? []).map((p: any) => [p.id, p]));

      const meta = (p: DbParticipation) => {
        const isTemp = !!p.temp_player_id;
        const m: any = isTemp ? tempMap.get(p.temp_player_id!) : profMap.get(p.user_id!);
        return {
          key: isTemp ? `t:${p.temp_player_id}` : `u:${p.user_id}`,
          isTemp,
          id: (p.user_id ?? p.temp_player_id) as string,
          nickname: m?.nickname ?? p.snapshot_nickname ?? "Jogador",
          avatarId: m?.avatar_url ?? p.snapshot_avatar_url ?? "a1",
        };
      };

      const roundsMap = new Map<string, HallEntry>();
      for (const p of (parts ?? []) as DbParticipation[]) {
        if (p.position !== 1) continue;
        if (!p.user_id && !p.temp_player_id) continue;
        const m = meta(p);
        const e = roundsMap.get(m.key) ?? { ...m, count: 0 };
        e.count += 1;
        roundsMap.set(m.key, e);
      }

      const gMap = new Map(gamesList.map((g) => [g.id, g]));
      const monthAgg = new Map<string, Map<string, { entry: HallEntry; pts: number }>>();
      const yearAgg = new Map<number, Map<string, { entry: HallEntry; pts: number }>>();

      for (const p of (parts ?? []) as DbParticipation[]) {
        if (!p.user_id && !p.temp_player_id) continue;
        const g = gMap.get(p.game_id);
        if (!g) continue;
        const m = meta(p);
        const monthKey = `${g.season_year}-${g.month}`;
        const monthInner = monthAgg.get(monthKey) ?? new Map();
        const cur = monthInner.get(m.key) ?? { entry: { ...m, count: 0 }, pts: 0 };
        cur.pts += Number(p.ranking_points || 0);
        monthInner.set(m.key, cur);
        monthAgg.set(monthKey, monthInner);

        const yearInner = yearAgg.get(g.season_year) ?? new Map();
        const cur2 = yearInner.get(m.key) ?? { entry: { ...m, count: 0 }, pts: 0 };
        cur2.pts += Number(p.ranking_points || 0);
        yearInner.set(m.key, cur2);
        yearAgg.set(g.season_year, yearInner);
      }

      const monthsMap = new Map<string, HallEntry>();
      for (const inner of monthAgg.values()) {
        const arr = [...inner.values()].sort((a, b) => b.pts - a.pts);
        if (!arr.length || arr[0].pts <= 0) continue;
        const w = arr[0].entry;
        const e = monthsMap.get(w.key) ?? { ...w, count: 0 };
        e.count += 1;
        monthsMap.set(w.key, e);
      }

      // Year champions: priorizar season_champions oficiais; senão usar agregação
      const officialKYears = new Set((champs ?? []).filter((c: any) => c.k_user_id).map((c: any) => c.year));
      const yearChampions: HallEntry[] = (champs ?? [])
        .filter((c: any) => c.k_user_id)
        .map((c: any) => {
          const p: any = profAllMap.get(c.k_user_id);
          return { key: `u:${c.k_user_id}`, isTemp: false, id: c.k_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year };
        });
      for (const [year, inner] of yearAgg.entries()) {
        if (officialKYears.has(year)) continue;
        const arr = [...inner.values()].sort((a, b) => b.pts - a.pts);
        if (!arr.length || arr[0].pts <= 0) continue;
        yearChampions.push({ ...arr[0].entry, year, count: 1 });
      }

      const asChampions: HallEntry[] = (champs ?? [])
        .filter((c: any) => c.as_user_id)
        .map((c: any) => {
          const p: any = profAllMap.get(c.as_user_id);
          return { key: `u:${c.as_user_id}`, isTemp: false, id: c.as_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year };
        });

      return {
        rounds: [...roundsMap.values()].sort((a, b) => b.count - a.count),
        months: [...monthsMap.values()].sort((a, b) => b.count - a.count),
        yearChampions: yearChampions.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
        asChampions: asChampions.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
      };
    },
  });
}
