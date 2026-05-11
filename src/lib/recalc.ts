import { supabase } from "@/integrations/supabase/client";
import { calcTournamentPoints } from "@/lib/scoring";
import { xpForGame, levelFromXp } from "@/lib/xpSystem";
import { computeAchievements, totalAchievementXp } from "@/lib/achievements";
import type { DbGame, DbParticipation } from "@/lib/db-types";

type MonthlyChampionRow = { champion_user_id: string | null };
type SeasonChampionRow = { k_user_id: string | null; as_user_id: string | null; k_temp_player_id?: string | null; as_temp_player_id?: string | null };
type ProfileIdRow = { id: string };

/**
 * Recalcula ranking_points e xp_earned de todas as partidas finalizadas
 * + atualiza profiles.xp e profiles.level a partir do somatório.
 */
export async function recalcRankingAndXp(): Promise<{ games: number; participations: number; profiles: number }> {
  const { data: games, error } = await supabase.from("games").select("*").eq("status", "finished");
  if (error) throw error;
  const list = (games ?? []) as DbGame[];
  const gameMap = new Map(list.map((g) => [g.id, g]));
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

  // 1ª passagem: calcula tudo em memória, sem tocar no banco
  const partUpdates: { id: string; ranking_points: number; xp_earned: number; is_winner: boolean }[] = [];
  const xpByUser = new Map<string, number>();
  const historyByUser = new Map<string, { game: DbGame; participation: DbParticipation }[]>();
  const currentYearPoints = new Map<string, number>();
  const currentYear = new Date().getFullYear();

  for (const [gameId, ps] of byGame.entries()) {
    const game = gameMap.get(gameId);
    const totalPlayers = ps.length;
    const totalActions = ps.reduce((s, p) => s + (p.entries || 0) + (p.rebuys || 0), 0);
    for (const p of ps) {
      const points = p.position
        ? calcTournamentPoints({ totalPlayers, position: p.position, totalActions, koPoints: p.ko_points || 0 }).total
        : 0;
      const xp = p.position
        ? xpForGame({ position: p.position, koCount: p.ko_points || 0 })
        : 0;
      const is_winner = p.position === 1;

      partUpdates.push({ id: p.id, ranking_points: points, xp_earned: xp, is_winner });

      if (p.user_id) {
        const participation = { ...p, ranking_points: points, xp_earned: xp, is_winner };
        xpByUser.set(p.user_id, (xpByUser.get(p.user_id) || 0) + xp);
        if (game) {
          const history = historyByUser.get(p.user_id) ?? [];
          history.push({ game, participation });
          historyByUser.set(p.user_id, history);
          if (game.season_year === currentYear) {
            currentYearPoints.set(p.user_id, (currentYearPoints.get(p.user_id) || 0) + points);
          }
        }
      }
    }
  }

  // updates de participações em paralelo (sem await em série)
  const updatePromises = partUpdates.map(({ id, ranking_points, xp_earned, is_winner }) =>
    supabase
      .from("game_participations")
      .update({ ranking_points, xp_earned, is_winner })
      .eq("id", id)
  );
  const results = await Promise.all(updatePromises);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw firstError;
  const updatedParts = partUpdates.length;

  const monthsByUser = new Map<string, number>();
  const asByUser = new Map<string, number>();
  const kByUser = new Map<string, number>();

  const [{ data: months, error: monthsError }, { data: seasons, error: seasonsError }] = await Promise.all([
    supabase.from("monthly_rankings").select("champion_user_id"),
    supabase.from("season_champions").select("k_user_id, as_user_id, k_temp_player_id, as_temp_player_id"),
  ]);
  if (monthsError) console.warn("monthly achievements ignored", monthsError);
  if (seasonsError) console.warn("season achievements ignored", seasonsError);
  for (const row of months ?? []) {
    const userId = (row as MonthlyChampionRow).champion_user_id;
    if (userId) monthsByUser.set(userId, (monthsByUser.get(userId) || 0) + 1);
  }
  for (const row of seasons ?? []) {
    const { k_user_id: kUserId, as_user_id: asUserId } = row as SeasonChampionRow;
    if (kUserId) kByUser.set(kUserId, (kByUser.get(kUserId) || 0) + 1);
    if (asUserId) asByUser.set(asUserId, (asByUser.get(asUserId) || 0) + 1);
  }

  const rankByUser = new Map<string, number>();
  [...currentYearPoints.entries()].sort((a, b) => b[1] - a[1]).forEach(([userId], index) => {
    rankByUser.set(userId, index + 1);
  });

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id");
  if (profilesError) throw profilesError;

  // 2ª passagem: monta array de updates de perfis em memória
  const profileUpdates: { id: string; xp: number; level: number; current_rank: number | null }[] = [];
  for (const profile of profiles ?? []) {
    const userId = (profile as ProfileIdRow).id;
    const achievements = computeAchievements({
      history: historyByUser.get(userId) ?? [],
      monthsWon: monthsByUser.get(userId) ?? 0,
      asTitles: asByUser.get(userId) ?? 0,
      kTitles: kByUser.get(userId) ?? 0,
    });
    const xp = (xpByUser.get(userId) ?? 0) + totalAchievementXp(achievements);
    const { level } = levelFromXp(xp);
    profileUpdates.push({ id: userId, xp, level, current_rank: rankByUser.get(userId) ?? null });
  }

  // um único upsert para todos os perfis
  const profilePromises = profileUpdates.map(({ id, xp, level, current_rank }) =>
  supabase
    .from("profiles")
    .update({ xp, level, current_rank })
    .eq("id", id)
);
const profileResults = await Promise.all(profilePromises);
const firstProfileError = profileResults.find((r) => r.error)?.error;
if (firstProfileError) throw firstProfileError;
const updatedProfiles = profileUpdates.length;
}


