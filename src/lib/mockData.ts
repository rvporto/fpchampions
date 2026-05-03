import { FIXED_AVATARS } from "./avatars";

export interface MockPlayer {
  id: string;
  nickname: string;
  full_name: string;
  avatarId: string;
  isTemp?: boolean;
  xp: number;
  lifetime_winnings: number;
}

export const CURRENT_USER_ID = "u-me";

export const PLAYERS: MockPlayer[] = [
  { id: "u-me", nickname: "VocêPoker", full_name: "Você Mesmo", avatarId: "a1", xp: 4720, lifetime_winnings: 1850 },
  { id: "u-2", nickname: "ReiDosBlinds", full_name: "Carlos Mendes", avatarId: "a3", xp: 8920, lifetime_winnings: 5400 },
  { id: "u-3", nickname: "DamaDeCopas", full_name: "Ana Souza", avatarId: "a2", xp: 7210, lifetime_winnings: 3200 },
  { id: "u-4", nickname: "BluffMaster", full_name: "João Silva", avatarId: "a4", xp: 6100, lifetime_winnings: 2100 },
  { id: "u-5", nickname: "RainhaDoFlop", full_name: "Marina Costa", avatarId: "a5", xp: 5430, lifetime_winnings: 1700 },
  { id: "u-6", nickname: "AllInGuy", full_name: "Pedro Lima", avatarId: "a1", xp: 3920, lifetime_winnings: 900 },
  { id: "u-7", nickname: "PocketAces", full_name: "Rafael Dias", avatarId: "a3", xp: 3100, lifetime_winnings: 600 },
  { id: "u-8", nickname: "ChipLeader", full_name: "Fernanda Reis", avatarId: "a5", xp: 2540, lifetime_winnings: 400 },
  { id: "u-9", nickname: "CardShark", full_name: "Lucas Almeida", avatarId: "a4", xp: 2100, lifetime_winnings: 250 },
  { id: "u-10", nickname: "QueenBee", full_name: "Patrícia Nogueira", avatarId: "a2", xp: 1800, lifetime_winnings: 200 },
];

export const playerById = (id: string) => PLAYERS.find((p) => p.id === id);

const seasonYear = new Date().getFullYear();
const month = new Date().getMonth() + 1;

export interface MockGame {
  id: string;
  name: string;
  date: string;
  buy_in: number;
  rebuy_value: number;
  total_pot: number;
  rake_as: number;
  rake_month: number;
  croupier_fee: number;
  prize_pool: number;
  status: "scheduled" | "in_progress" | "finished";
  total_players: number;
  total_actions: number;
  season_year: number;
  month: number;
  participants: { playerId: string; position: number; koPoints: number; entries: number; rebuys: number; points: number; xp: number }[];
}

export const GAMES: MockGame[] = [
  {
    id: "g-1", name: "Rodada #12 — Mata-Mata", date: new Date(Date.now() - 86400000 * 2).toISOString(),
    buy_in: 50, rebuy_value: 30, total_pot: 1280, rake_as: 100, rake_month: 80, croupier_fee: 100, prize_pool: 1000,
    status: "finished", total_players: 12, total_actions: 28, season_year: seasonYear, month,
    participants: [
      { playerId: "u-2", position: 1, koPoints: 25, entries: 1, rebuys: 1, points: 320, xp: 550 },
      { playerId: "u-3", position: 2, koPoints: 15, entries: 1, rebuys: 2, points: 240, xp: 350 },
      { playerId: "u-me", position: 3, koPoints: 10, entries: 1, rebuys: 1, points: 180, xp: 400 },
      { playerId: "u-4", position: 4, koPoints: 5, entries: 1, rebuys: 1, points: 110, xp: 150 },
    ],
  },
  {
    id: "g-2", name: "Rodada #11 — Sexta Premium", date: new Date(Date.now() - 86400000 * 7).toISOString(),
    buy_in: 50, rebuy_value: 30, total_pot: 1450, rake_as: 120, rake_month: 100, croupier_fee: 100, prize_pool: 1130,
    status: "finished", total_players: 14, total_actions: 32, season_year: seasonYear, month,
    participants: [
      { playerId: "u-3", position: 1, koPoints: 30, entries: 1, rebuys: 1, points: 350, xp: 600 },
      { playerId: "u-me", position: 2, koPoints: 20, entries: 1, rebuys: 2, points: 260, xp: 400 },
      { playerId: "u-5", position: 3, koPoints: 10, entries: 1, rebuys: 0, points: 200, xp: 410 },
    ],
  },
  {
    id: "g-3", name: "Rodada #10 — Clássico", date: new Date(Date.now() - 86400000 * 14).toISOString(),
    buy_in: 50, rebuy_value: 30, total_pot: 1100, rake_as: 80, rake_month: 70, croupier_fee: 100, prize_pool: 850,
    status: "finished", total_players: 10, total_actions: 22, season_year: seasonYear, month: month === 1 ? 12 : month - 1,
    participants: [
      { playerId: "u-4", position: 1, koPoints: 20, entries: 1, rebuys: 1, points: 280, xp: 500 },
      { playerId: "u-2", position: 2, koPoints: 15, entries: 1, rebuys: 0, points: 220, xp: 350 },
      { playerId: "u-me", position: 5, koPoints: 5, entries: 1, rebuys: 1, points: 90, xp: 150 },
    ],
  },
  {
    id: "g-4", name: "Rodada #13 — Próxima", date: new Date(Date.now() + 86400000 * 3).toISOString(),
    buy_in: 50, rebuy_value: 30, total_pot: 0, rake_as: 0, rake_month: 0, croupier_fee: 0, prize_pool: 0,
    status: "scheduled", total_players: 0, total_actions: 0, season_year: seasonYear, month,
    participants: [],
  },
];

export interface MonthlyRankRow {
  playerId: string;
  points: number;
  games: number;
  wins: number;
}

export function getMonthlyRanking(year: number, m: number): MonthlyRankRow[] {
  const map = new Map<string, MonthlyRankRow>();
  GAMES.filter((g) => g.season_year === year && g.month === m && g.status === "finished").forEach((g) => {
    g.participants.forEach((p) => {
      const row = map.get(p.playerId) ?? { playerId: p.playerId, points: 0, games: 0, wins: 0 };
      row.points += p.points;
      row.games += 1;
      if (p.position === 1) row.wins += 1;
      map.set(p.playerId, row);
    });
  });
  return [...map.values()].sort((a, b) => b.points - a.points);
}

export function getSeasonalRanking(year: number): MonthlyRankRow[] {
  const map = new Map<string, MonthlyRankRow>();
  GAMES.filter((g) => g.season_year === year && g.status === "finished").forEach((g) => {
    g.participants.forEach((p) => {
      const row = map.get(p.playerId) ?? { playerId: p.playerId, points: 0, games: 0, wins: 0 };
      row.points += p.points;
      row.games += 1;
      if (p.position === 1) row.wins += 1;
      map.set(p.playerId, row);
    });
  });
  return [...map.values()].sort((a, b) => b.points - a.points);
}

export interface HallEntry { playerId: string; count: number; year?: number }

export const HALL_OF_FAME = {
  rounds: () => {
    const map = new Map<string, number>();
    GAMES.forEach((g) => g.participants.forEach((p) => {
      if (p.position === 1) map.set(p.playerId, (map.get(p.playerId) ?? 0) + 1);
    }));
    return [...map.entries()].map(([playerId, count]) => ({ playerId, count })).sort((a, b) => b.count - a.count);
  },
  months: (): HallEntry[] => [
    { playerId: "u-2", count: 3 },
    { playerId: "u-3", count: 2 },
    { playerId: "u-me", count: 1 },
  ],
  asWinners: (): HallEntry[] => [
    { playerId: "u-2", count: 1, year: seasonYear - 1 },
  ],
  yearChampions: (): HallEntry[] => [
    { playerId: "u-3", count: 1, year: seasonYear - 1 },
  ],
};

export const FINANCE_BY_MONTH = Array.from({ length: 12 }, (_, i) => {
  const m = i + 1;
  const games = GAMES.filter((g) => g.season_year === seasonYear && g.month === m && g.status === "finished");
  const rakeAs = games.reduce((s, g) => s + g.rake_as, 0);
  const rakeMonth = games.reduce((s, g) => s + g.rake_month, 0);
  const prize = games.reduce((s, g) => s + g.prize_pool, 0);
  return { month: m, rakeAs, rakeMonth, prize };
});

export const EXPENSES = [
  { id: "e-1", description: "Compra de fichas reposição", amount: 220, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), author: "Admin" },
  { id: "e-2", description: "Troféu Ás do Poker", amount: 480, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), author: "Admin" },
];

export const USER_ACHIEVEMENTS: { code: string; count: number }[] = [
  { code: "aprendiz", count: 1 },
  { code: "vencedor_rr", count: 2 },
  { code: "consistente_rr", count: 1 },
  { code: "vencedor_mes_rr", count: 1 },
];
