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

      const [{ data: champs }, { data: profsAll }, { data: monthlyClosed }, { data: tempsAll }] = await Promise.all([
        supabase.from("season_champions").select("*"),
        supabase.from("profiles").select("id, nickname, avatar_url"),
        supabase.from("monthly_rankings").select("*"),
        supabase.from("temporary_players").select("id, nickname, avatar_url"),
      ]);
      const profAllMap = new Map((profsAll ?? []).map((p: any) => [p.id, p]));
      const tempAllMap = new Map((tempsAll ?? []).map((t: any) => [t.id, t]));

      // Helper: monta entry a partir de monthly_rankings (mês encerrado)
      const buildMonthEntry = (row: any): HallEntry | null => {
        if (row.champion_user_id) {
          const p: any = profAllMap.get(row.champion_user_id);
          return { key: `u:${row.champion_user_id}`, isTemp: false, id: row.champion_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1 };
        }
        if (row.champion_temp_player_id) {
          const t: any = tempAllMap.get(row.champion_temp_player_id);
          return { key: `t:${row.champion_temp_player_id}`, isTemp: true, id: row.champion_temp_player_id, nickname: t?.nickname ?? "—", avatarId: t?.avatar_url ?? "a1", count: 1 };
        }
        return null;
      };

      // K do Poker: apenas temporadas oficialmente encerradas
      const buildYearChamps = (): HallEntry[] => (champs ?? []).filter((c: any) => c.k_user_id).map((c: any) => {
        const p: any = profAllMap.get(c.k_user_id);
        return { key: `u:${c.k_user_id}`, isTemp: false, id: c.k_user_id, nickname: p?.nickname ?? "—", avatarId: p?.avatar_url ?? "a1", count: 1, year: c.year } as HallEntry;
      });

      // Ás do Poker: apenas indicações oficiais
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

      // Meses: apenas os encerrados (monthly_rankings)
      const buildMonths = (): HallEntry[] => {
        const map = new Map<string, HallEntry>();
        for (const row of (monthlyClosed ?? []) as any[]) {
          const e = buildMonthEntry(row);
          if (!e) continue;
          const cur = map.get(e.key) ?? { ...e, count: 0 };
          cur.count += 1;
          map.set(e.key, cur);
        }
        return [...map.values()];
      };

      if (!gameIds.length) {
        return {
          rounds: [],
          months: buildMonths(),
          yearChampions: buildYearChamps(),
          asChampions: buildAsChamps(),
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

      const roundsMap = new Map<string, HallEntry>();
      for (const p of (parts ?? []) as DbParticipation[]) {
        if (p.position !== 1) continue;
        if (!p.user_id && !p.temp_player_id) continue;
        const m = meta(p);
        const e = roundsMap.get(m.key) ?? { ...m, count: 0 };
        e.count += 1;
        roundsMap.set(m.key, e);
      }

      return {
        rounds: [...roundsMap.values()].sort((a, b) => b.count - a.count),
        months: buildMonths().sort((a, b) => b.count - a.count),
        yearChampions: buildYearChamps().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
        asChampions: buildAsChamps().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
      };
    },
  });
}
