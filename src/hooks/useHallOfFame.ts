import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation } from "@/lib/db-types";

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
  roundsAll: HallEntry[];
  roundsByYear: Record<number, HallEntry[]>;
  monthsAll: HallEntry[];
  monthsByYear: Record<number, HallEntry[]>;
  yearChampions: HallEntry[];
  asChampions: HallEntry[];
  years: number[];
}

const sortDesc = (entries: HallEntry[]) => entries.sort((a, b) => b.count - a.count);

const aggregate = (entries: HallEntry[]): HallEntry[] => {
  const map = new Map<string, HallEntry>();
  for (const e of entries) {
    const cur = map.get(e.key);
    if (cur) cur.count += e.count;
    else map.set(e.key, { ...e, count: e.count });
  }
  return sortDesc([...map.values()]);
};

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
      const gameYearMap = new Map(gamesList.map((g) => [g.id, g.season_year]));

      const [{ data: champs }, { data: profsAll }, { data: monthlyClosed }, { data: tempsAll }] = await Promise.all([
        supabase.from("season_champions").select("*"),
        supabase.from("profiles").select("id, nickname, avatar_url"),
        supabase.from("monthly_rankings").select("*"),
        supabase.from("temporary_players").select("id, nickname, avatar_url"),
      ]);
      const profAllMap = new Map((profsAll ?? []).map((p: any) => [p.id, p]));
      const tempAllMap = new Map((tempsAll ?? []).map((t: any) => [t.id, t]));

      const buildMonthEntry = (row: any): HallEntry | null => {
        if (row.champion_user_id) {
          const p: any = profAllMap.get(row.champion_user_id);
          return { key: `u:${row.champion_user_id}`, isTemp: false, id: row.champion_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: row.season_year };
        }
        if (row.champion_temp_player_id) {
          const t: any = tempAllMap.get(row.champion_temp_player_id);
          return { key: `t:${row.champion_temp_player_id}`, isTemp: true, id: row.champion_temp_player_id, nickname: t?.nickname ?? "—", avatarId: t?.avatar_url ?? "a1", count: 1, year: row.season_year };
        }
        return null;
      };

      const buildYearChamps = (): HallEntry[] => {
        const list: HallEntry[] = [];
        for (const c of (champs ?? []) as any[]) {
          if (c.k_user_id) {
            const p: any = profAllMap.get(c.k_user_id);
            list.push({ key: `u:${c.k_user_id}`, isTemp: false, id: c.k_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year });
          } else if (c.k_temp_player_id) {
            const t: any = tempAllMap.get(c.k_temp_player_id);
            list.push({ key: `t:${c.k_temp_player_id}`, isTemp: true, id: c.k_temp_player_id, nickname: t?.nickname ?? "—", avatarId: t?.avatar_url ?? "a1", count: 1, year: c.year });
          }
        }
        return list;
      };

      const buildAsChamps = (): HallEntry[] => {
        const list: HallEntry[] = [];
        for (const c of (champs ?? []) as any[]) {
          if (c.as_user_id) {
            const p: any = profAllMap.get(c.as_user_id);
            list.push({ key: `u:${c.as_user_id}`, isTemp: false, id: c.as_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year });
          } else if (c.as_temp_player_id) {
            const t: any = tempAllMap.get(c.as_temp_player_id);
            list.push({ key: `t:${c.as_temp_player_id}`, isTemp: true, id: c.as_temp_player_id, nickname: t?.nickname ?? "—", avatarId: t?.avatar_url ?? "a1", count: 1, year: c.year });
          }
        }
        return list;
      };

      // Months by year
      const monthsByYearMap: Record<number, Map<string, HallEntry>> = {};
      const monthsAllList: HallEntry[] = [];
      for (const row of (monthlyClosed ?? []) as any[]) {
        const e = buildMonthEntry(row);
        if (!e) continue;
        const y = row.season_year as number;
        if (!monthsByYearMap[y]) monthsByYearMap[y] = new Map();
        const cur = monthsByYearMap[y].get(e.key);
        if (cur) cur.count += 1;
        else monthsByYearMap[y].set(e.key, { ...e, count: 1 });
        monthsAllList.push(e);
      }
      const monthsByYear: Record<number, HallEntry[]> = {};
      for (const [y, m] of Object.entries(monthsByYearMap)) {
        monthsByYear[Number(y)] = sortDesc([...m.values()]);
      }
      const monthsAll = aggregate(monthsAllList);

      // Years set
      const yearsSet = new Set<number>();
      for (const g of gamesList) yearsSet.add(g.season_year);
      for (const r of (monthlyClosed ?? []) as any[]) yearsSet.add(r.season_year);
      for (const c of (champs ?? []) as any[]) if (c.year) yearsSet.add(c.year);

      const yearChampions = buildYearChamps().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      const asChampions = buildAsChamps().sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

      if (!gameIds.length) {
        return {
          roundsAll: [],
          roundsByYear: {},
          monthsAll,
          monthsByYear,
          yearChampions,
          asChampions,
          years: [...yearsSet].sort((a, b) => b - a),
        };
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

      const roundsByYearMap: Record<number, Map<string, HallEntry>> = {};
      const roundsAllMap = new Map<string, HallEntry>();
      for (const p of (parts ?? []) as DbParticipation[]) {
        if (p.position !== 1) continue;
        if (!p.user_id && !p.temp_player_id) continue;
        const y = gameYearMap.get(p.game_id);
        if (y == null) continue;
        const m = meta(p);
        if (!roundsByYearMap[y]) roundsByYearMap[y] = new Map();
        const cy = roundsByYearMap[y].get(m.key);
        if (cy) cy.count += 1;
        else roundsByYearMap[y].set(m.key, { ...m, count: 1, year: y });
        const ca = roundsAllMap.get(m.key);
        if (ca) ca.count += 1;
        else roundsAllMap.set(m.key, { ...m, count: 1 });
      }
      const roundsByYear: Record<number, HallEntry[]> = {};
      for (const [y, m] of Object.entries(roundsByYearMap)) {
        roundsByYear[Number(y)] = sortDesc([...m.values()]);
      }
      const roundsAll = sortDesc([...roundsAllMap.values()]);

      return {
        roundsAll,
        roundsByYear,
        monthsAll,
        monthsByYear,
        yearChampions,
        asChampions,
        years: [...yearsSet].sort((a, b) => b - a),
      };
    },
  });
}
