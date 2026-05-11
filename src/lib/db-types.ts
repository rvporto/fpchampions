// Tipos do banco (Supabase). Mantenha sincronizado com 0001_init.sql.

export type GameStatus = "scheduled" | "in_progress" | "finished";

export interface DbProfile {
  id: string;
  nickname: string | null;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_rank: number | null;
  lifetime_winnings: number;
  profile_completed: boolean;
}

export interface DbTempPlayer {
  id: string;
  nickname: string;
  full_name: string | null;
  gender: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DbGame {
  id: string;
  name: string;
  date: string;
  season_year: number;
  month: number;
  buy_in: number;
  rebuy_value: number;
  rake_as: number;
  rake_month: number;
  croupier_fee: number;
  total_pot: number;
  prize_pool: number;
  status: GameStatus;
  description: string | null;
  created_at: string;
  is_as_game: boolean;
  as_prize_amount: number;
}

export interface DbParticipation {
  id: string;
  game_id: string;
  user_id: string | null;
  temp_player_id: string | null;
  snapshot_nickname: string | null;
  snapshot_avatar_url: string | null;
  entries: number;
  rebuys: number;
  total_invested: number;
  position: number | null;
  is_winner: boolean;
  ko_points: number;
  ranking_points: number;
  xp_earned: number;
  prize_won: number;
}

export interface GameWithParticipants extends DbGame {
  participations: (DbParticipation & {
    profile?: DbProfile | null;
    temp_player?: DbTempPlayer | null;
  })[];
}

export function participantDisplay(p: {
  profile?: DbProfile | null;
  temp_player?: DbTempPlayer | null;
  snapshot_nickname?: string | null;
  snapshot_avatar_url?: string | null;
}) {
  if (p.profile) return { nickname: p.profile.nickname ?? "Sem apelido", avatarId: p.profile.avatar_url ?? "a1", isTemp: false };
  if (p.temp_player) return { nickname: p.temp_player.nickname, avatarId: p.temp_player.avatar_url ?? "a1", isTemp: true };
  return { nickname: p.snapshot_nickname ?? "Jogador", avatarId: p.snapshot_avatar_url ?? "a1", isTemp: false };
}

// Total de ações = soma de entries+rebuys; total de jogadores = participations.length
export function gameTotals(parts: { entries: number; rebuys: number }[]) {
  const totalPlayers = parts.length;
  const totalActions = parts.reduce((s, p) => s + (p.entries || 0) + (p.rebuys || 0), 0);
  return { totalPlayers, totalActions };
}
