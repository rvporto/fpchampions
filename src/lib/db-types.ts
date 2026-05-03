// Tipos do banco (Supabase). Mantenha sincronizado com as migrations.

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
  total_players: number;
  total_actions: number;
  description: string | null;
  created_at: string;
}

export interface DbParticipation {
  id: string;
  game_id: string;
  user_id: string | null;
  temp_player_id: string | null;
  nickname_snapshot: string | null;
  avatar_snapshot: string | null;
  entries: number;
  rebuys: number;
  total_invested: number;
  position: number | null;
  is_winner: boolean;
  ko_points: number;
  ranking_points: number;
  xp_earned: number;
}

// Forma rica usada no cliente (game + participantes resolvidos)
export interface GameWithParticipants extends DbGame {
  participations: (DbParticipation & {
    profile?: DbProfile | null;
    temp_player?: DbTempPlayer | null;
  })[];
}

// Helpers de display
export function participantDisplay(p: { profile?: DbProfile | null; temp_player?: DbTempPlayer | null; nickname_snapshot?: string | null; avatar_snapshot?: string | null }) {
  if (p.profile) return { nickname: p.profile.nickname ?? "Sem apelido", avatarId: p.profile.avatar_url ?? "a1", isTemp: false };
  if (p.temp_player) return { nickname: p.temp_player.nickname, avatarId: p.temp_player.avatar_url ?? "a1", isTemp: true };
  return { nickname: p.nickname_snapshot ?? "Jogador", avatarId: p.avatar_snapshot ?? "a1", isTemp: false };
}
