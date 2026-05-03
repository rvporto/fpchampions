// XP & conquistas — Família Poker Champions

export const XP_PER_LEVEL = 1000;

export interface XpSourceInput {
  position: number;        // colocação na partida
  koCount: number;         // KOs na partida
}

export function xpForGame({ position, koCount }: XpSourceInput): number {
  let xp = 100; // por partida jogada
  if (position >= 1 && position <= 3) xp += 200; // pódio
  if (position === 1) xp += 100; // vencedor
  xp += Math.max(0, koCount) * 10;
  return xp;
}

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;
  const progress = xpInLevel / XP_PER_LEVEL;
  return { level, xpInLevel, xpToNext, progress };
}

export type AchievementCode =
  | "aprendiz" | "engajado" | "veterano"
  | "vencedor_rr" | "k_poker_rr" | "back_to_back_rr"
  | "as_poker_rr" | "vencedor_mes_rr" | "consistente_rr";

export interface AchievementDef {
  code: AchievementCode;
  name: string;
  description: string;
  xpReward: number;
  repeatable: boolean;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "aprendiz", name: "Aprendiz", description: "Jogou 10 partidas", xpReward: 500, repeatable: false, icon: "🃏" },
  { code: "engajado", name: "Engajado", description: "Jogou 25 partidas", xpReward: 1000, repeatable: false, icon: "🎯" },
  { code: "veterano", name: "Veterano", description: "Jogou 50 partidas", xpReward: 2000, repeatable: false, icon: "🛡️" },
  { code: "vencedor_rr", name: "Vencedor", description: "A cada 5 vitórias", xpReward: 1000, repeatable: true, icon: "🏆" },
  { code: "k_poker_rr", name: "K do Poker", description: "Campeão do ano", xpReward: 5000, repeatable: true, icon: "👑" },
  { code: "back_to_back_rr", name: "Back-to-Back Champion", description: "2 torneios seguidos vencidos", xpReward: 500, repeatable: true, icon: "🔥" },
  { code: "as_poker_rr", name: "Ás do Poker", description: "Vencedor do Ás", xpReward: 1000, repeatable: true, icon: "🂡" },
  { code: "vencedor_mes_rr", name: "Vencedor do Mês", description: "Cada mês conquistado", xpReward: 500, repeatable: true, icon: "📅" },
  { code: "consistente_rr", name: "Consistente", description: "2 pódios em sequência", xpReward: 300, repeatable: true, icon: "⭐" },
];
