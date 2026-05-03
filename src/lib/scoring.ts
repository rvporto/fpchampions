// Família Poker Champions — fórmula de pontuação
// pontos = (PBT × FM) + KO

// Tabela base PBT[colocacao][totalJogadores 6..20]
// Linhas = colocação (1..N), Colunas = total de jogadores (6..20).
// Construída para premiar pódios, decair conforme posição.
function buildPbtTable(): number[][] {
  const sizes = Array.from({ length: 15 }, (_, i) => 6 + i); // 6..20
  const table: number[][] = [];
  for (let pos = 1; pos <= 20; pos++) {
    const row: number[] = [];
    for (const total of sizes) {
      if (pos > total) { row.push(0); continue; }
      // base: vencedor recebe ~ total*10, decai linearmente até ~0 no último
      const base = (total - pos + 1) / total; // 1..1/total
      const podiumBoost = pos === 1 ? 1.6 : pos === 2 ? 1.3 : pos === 3 ? 1.15 : 1;
      const value = base * total * 10 * podiumBoost;
      row.push(Math.round(value));
    }
    table.push(row);
  }
  return table;
}

const PBT_TABLE = buildPbtTable();

export function getPBT(position: number, totalPlayers: number): number {
  if (position < 1) return 0;
  const total = Math.max(6, Math.min(20, totalPlayers));
  const colIndex = total - 6;
  const rowIndex = Math.max(0, Math.min(19, position - 1));
  if (position > total) return 0;
  return PBT_TABLE[rowIndex][colIndex] ?? 0;
}

export function getFM(totalActions: number): number {
  if (totalActions <= 25) return 1.0;
  if (totalActions <= 35) return 1.2;
  if (totalActions <= 45) return 1.4;
  if (totalActions <= 55) return 1.5;
  if (totalActions <= 69) return 1.6;
  return 2.0;
}

// Arredondamento custom: parte fracionária >= 0.6 sobe, senão desce
function customRound(v: number): number {
  const floor = Math.floor(v);
  const frac = v - floor;
  return frac >= 0.6 ? floor + 1 : floor;
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
