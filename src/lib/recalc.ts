import { supabase } from "@/integrations/supabase/client";
import { calcTournamentPoints } from "@/lib/scoring";
import { xpForGame } from "@/lib/xpSystem";
import type { DbGame, DbParticipation } from "@/lib/db-types";

/**
 * Recalcula ranking_points e xp_earned de todas as partidas finalizadas
 * + atualiza profiles.xp e profiles.level a partir do somatório.
 */
export async function recalcRankingAndXp(): Promise<{ games: number; participations: number; profiles: number }> {
  const { data: games, error } = await supabase.from("games").select("*").eq("status", "finished");
  if (error) throw error;
  const list = (games ?? []) as DbGame[];
  const ids = list.map((g) => g.id);
  if (ids.length === 0) return { games: 0, participations: 0, profiles: 0 };

  const { data: parts, error: e2 } = await supabase
    .from("game_participations")
    .select("*")
    .in("game_id", ids);
  if (e2) throw e2;
  const partList = (parts ?? []) as DbParticipation[];

  // agrupa por game para totais
  const byGame = new Map<string, DbParticipation[]>();
  for (const p of partList) {
    if (!byGame.has(p.game_id)) byGame.set(p.game_id, []);
    byGame.get(p.game_id)!.push(p);
  }

  let updatedParts = 0;
  const xpByUser = new Map<string, number>();

  for (const [gameId, ps] of byGame.entries()) {
    const totalPlayers = ps.length;
    const totalActions = ps.reduce((s, p) => s + (p.entries || 0) + (p.rebuys || 0), 0);
    for (const p of ps) {
      const points = p.position
        ? calcTournamentPoints({ totalPlayers, position: p.position, totalActions, koPoints: p.ko_points || 0 }).total
        : 0;
      const xp = p.position
        ? xpForGame({ position: p.position, koCount: p.ko_points || 0 })
        : 0;
      const { error: ue } = await supabase
        .from("game_participations")
        .update({ ranking_points: points, xp_earned: xp, is_winner: p.position === 1 })
        .eq("id", p.id);
      if (ue) throw ue;
      updatedParts += 1;
      if (p.user_id) xpByUser.set(p.user_id, (xpByUser.get(p.user_id) || 0) + xp);
    }
  }

  // atualiza profiles.xp e level
  let updatedProfiles = 0;
  for (const [userId, xp] of xpByUser.entries()) {
    const level = Math.floor(xp / 1000) + 1;
    const { error: pe } = await supabase.from("profiles").update({ xp, level }).eq("id", userId);
    if (pe) throw pe;
    updatedProfiles += 1;
  }

  // atualiza current_rank com base no total de pontos de todas temporadas (ranking global atual ano)
  const year = new Date().getFullYear();
  const yearGames = list.filter((g) => g.season_year === year).map((g) => g.id);
  if (yearGames.length) {
    const yearParts = partList.filter((p) => yearGames.includes(p.game_id) && p.user_id);
    const userPoints = new Map<string, number>();
    for (const p of yearParts) {
      userPoints.set(p.user_id!, (userPoints.get(p.user_id!) || 0) + Number(p.ranking_points || 0));
    }
    const sorted = [...userPoints.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < sorted.length; i++) {
      await supabase.from("profiles").update({ current_rank: i + 1 }).eq("id", sorted[i][0]);
    }
  }

  return { games: list.length, participations: updatedParts, profiles: updatedProfiles };
}
