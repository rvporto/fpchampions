import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation } from "@/lib/db-types";

export interface PlayerGameRow {
  game: DbGame;
  participation: DbParticipation;
}

export interface PlayerStats {
  games: number;
  wins: number;
  podiums: number;
  points: number;
  ko: number;
  invested: number;
  history: PlayerGameRow[];
}

export function usePlayerStats(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["player-stats", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlayerStats> => {
      if (!userId) return { games: 0, wins: 0, podiums: 0, points: 0, ko: 0, invested: 0, history: [] };
      const { data: parts, error } = await supabase
        .from("game_participations")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      const list = (parts ?? []) as DbParticipation[];
      const ids = [...new Set(list.map((p) => p.game_id))];
      if (!ids.length) return { games: 0, wins: 0, podiums: 0, points: 0, ko: 0, invested: 0, history: [] };
      const { data: games, error: e2 } = await supabase
        .from("games")
        .select("*")
        .in("id", ids);
      if (e2) throw e2;
      const gMap = new Map((games ?? []).map((g: any) => [g.id, g as DbGame]));

      const finished = list.filter((p) => gMap.get(p.game_id)?.status === "finished");
      const history: PlayerGameRow[] = finished
        .map((p) => ({ participation: p, game: gMap.get(p.game_id)! }))
        .sort((a, b) => +new Date(b.game.date) - +new Date(a.game.date));

      return {
        games: finished.length,
        wins: finished.filter((p) => p.position === 1).length,
        podiums: finished.filter((p) => p.position && p.position <= 3).length,
        points: finished.reduce((s, p) => s + Number(p.ranking_points || 0), 0),
        ko: finished.reduce((s, p) => s + Number(p.ko_points || 0), 0),
        invested: finished.reduce((s, p) => s + Number(p.total_invested || 0), 0),
        history,
      };
    },
  });
}
