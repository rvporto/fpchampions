import { ACHIEVEMENTS, type AchievementDef } from "@/lib/xpSystem";
import type { DbGame, DbParticipation } from "@/lib/db-types";

export interface ComputedAchievement {
  def: AchievementDef;
  count: number; // quantas vezes conquistada
  unlocked: boolean;
}

interface Input {
  history: { game: DbGame; participation: DbParticipation }[]; // ordenado por data desc
  monthsWon: number; // vezes que o jogador foi campeão do mês
  asTitles: number;  // vezes Ás do Poker
  kTitles: number;   // vezes K do Poker
}

export function computeAchievements({ history, monthsWon, asTitles, kTitles }: Input): ComputedAchievement[] {
  const games = history.length;
  const wins = history.filter((h) => h.participation.position === 1).length;

  // sequências (ordem cronológica ascendente)
  const asc = [...history].sort((a, b) => +new Date(a.game.date) - +new Date(b.game.date));
  let backToBack = 0;
  for (let i = 1; i < asc.length; i++) {
    if (asc[i].participation.position === 1 && asc[i - 1].participation.position === 1) backToBack += 1;
  }
  let consistente = 0;
  const isPodium = (p: DbParticipation) => !!p.position && p.position <= 3;
  for (let i = 1; i < asc.length; i++) {
    if (isPodium(asc[i].participation) && isPodium(asc[i - 1].participation)) consistente += 1;
  }

  const valueFor = (code: string): number => {
    switch (code) {
      case "aprendiz": return games >= 10 ? 1 : 0;
      case "engajado": return games >= 25 ? 1 : 0;
      case "veterano": return games >= 50 ? 1 : 0;
      case "vencedor_rr": return Math.floor(wins / 5);
      case "k_poker_rr": return kTitles;
      case "back_to_back_rr": return backToBack;
      case "as_poker_rr": return asTitles;
      case "vencedor_mes_rr": return monthsWon;
      case "consistente_rr": return consistente;
      default: return 0;
    }
  };

  return ACHIEVEMENTS.map((def) => {
    const count = valueFor(def.code);
    return { def, count, unlocked: count > 0 };
  });
}

export function totalAchievementXp(list: ComputedAchievement[]): number {
  return list.reduce((s, a) => s + a.count * a.def.xpReward, 0);
}
