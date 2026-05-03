// Família Poker Champions — Regulamento de Pontuação por Ações (Temporada 2026)
// Pontuação Final = Pontuação Base (tabela oficial) × Multiplicador da Faixa de Ações
// Tabela base oficial: linhas = colocação (1..20), colunas = total de jogadores (6..20)
// Células vazias no documento = 0 pontos.

// PBT_TABLE[position-1][totalPlayers-6]
const PBT_TABLE: number[][] = [
  // Pos 1 — totals 6..20
  [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
  // Pos 2
  [20, 25, 25, 25, 30, 35, 40, 40, 40, 50, 55, 60, 60, 65, 70],
  // Pos 3
  [15, 20, 20, 20, 25, 25, 30, 30, 35, 40, 45, 50, 50, 55, 60],
  // Pos 4
  [10, 15, 13, 15, 20, 20, 25, 25, 30, 35, 35, 40, 40, 45, 50],
  // Pos 5
  [8, 10, 11, 13, 15, 17, 20, 20, 25, 30, 30, 35, 35, 40, 45],
  // Pos 6
  [4, 8, 7, 11, 13, 15, 17, 17, 20, 25, 25, 30, 30, 35, 40],
  // Pos 7
  [0, 4, 4, 7, 11, 13, 15, 15, 17, 20, 20, 25, 25, 30, 35],
  // Pos 8
  [0, 0, 2, 4, 7, 11, 13, 13, 15, 17, 17, 20, 20, 25, 30],
  // Pos 9
  [0, 0, 0, 2, 4, 7, 11, 11, 13, 15, 15, 17, 17, 20, 25],
  // Pos 10
  [0, 0, 0, 0, 2, 4, 7, 9, 11, 13, 13, 15, 15, 17, 22],
  // Pos 11
  [0, 0, 0, 0, 0, 2, 4, 7, 9, 11, 11, 13, 13, 15, 20],
  // Pos 12
  [0, 0, 0, 0, 0, 0, 2, 4, 7, 9, 9, 11, 11, 13, 18],
  // Pos 13
  [0, 0, 0, 0, 0, 0, 0, 2, 4, 7, 7, 9, 9, 11, 16],
  // Pos 14
  [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 7, 7, 9, 14],
  // Pos 15
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 5, 5, 7, 12],
  // Pos 16
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 4, 5, 10],
  // Pos 17
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 8],
  // Pos 18
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 6],
  // Pos 19
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4],
  // Pos 20
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
];

export function getPBT(position: number, totalPlayers: number): number {
  if (position < 1 || position > 20) return 0;
  // <6 jogadores → usa coluna de 6; >20 → usa coluna de 20
  const total = Math.max(6, Math.min(20, totalPlayers));
  if (position > total) return 0;
  return PBT_TABLE[position - 1][total - 6] ?? 0;
}

export function getFM(totalActions: number): number {
  if (totalActions <= 25) return 1.0;
  if (totalActions <= 35) return 1.2;
  if (totalActions <= 45) return 1.4;
  if (totalActions <= 55) return 1.5;
  if (totalActions <= 69) return 1.6;
  return 2.0;
}

// Preserva a primeira casa decimal (ex.: 5.6)
function customRound(v: number): number {
  return Math.round(v * 10) / 10;
}

export interface ScoringInput {
  totalPlayers: number;
  position: number;
  totalActions: number;
  koPoints: number;
}

export interface ScoringBreakdown {
  pbt: number;
  fm: number;
  pbtTimesFm: number;
  ko: number;
  total: number;
}

export function calcTournamentPoints(input: ScoringInput): ScoringBreakdown {
  const pbt = getPBT(input.position, input.totalPlayers);
  const fm = getFM(input.totalActions);
  const pbtTimesFm = customRound(pbt * fm);
  const ko = Math.max(0, Math.round(input.koPoints || 0));
  return { pbt, fm, pbtTimesFm, ko, total: pbtTimesFm + ko };
}
