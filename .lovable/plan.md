# Família Poker Champions — Plano (revisão 2)

Plataforma de torneios de poker entre amigos: ranking sazonal, perfis, XP/conquistas, controle financeiro com rakes separados e Hall da Fama. Backend em **Supabase próprio** (conexão externa). Sem geração de avatar por IA — usuário escolhe entre **5 avatares fixos** ou faz upload.

**Fórmula de pontuação:** `pontos = (PBT × FM) + KO`

Stack: React 18 + Vite + TS + Tailwind + shadcn/ui + Supabase + react-router + react-query + zod + sonner + html2canvas (relatórios).

---

## 1. Identidade visual

- Nome: **Família Poker Champions** / *Liga de Torneios*. Logo brasão dourado anexado em `src/assets/logo.png`.
- Tema dark+dourado (HSL em `src/index.css`): bg `0 0% 4%`, card `0 0% 10%`, primary dourado `46 65% 52%`, primary-glow `49 89% 60%`, tournament `25 95% 55%`. Gradientes/sombras `gradient-bg`, `gradient-gold`, `gradient-card`, `shadow-gold`. Fonte Inter.
- Classes utilitárias: `.fpc-card`, `.fpc-text-gold`, `.fpc-gold-gradient`, `.glass-effect`, `.fpc-hover-gold`, `.fpc-chip`. Tokens semânticos obrigatórios.

## 2. Avatares (sem IA)

5 avatares fixos em `src/assets/avatars/avatar-1..5.png` expostos via `FIXED_AVATARS` em `src/lib/avatars.ts`. Componente `AvatarPicker` mostra grade dos 5 + botão "Enviar foto" (upload p/ bucket `avatars`). Usado em complete-profile, editar perfil e criar jogador temporário.

## 3. Layout & Rotas

**Desktop:** header sticky `glass-effect` h-16, logo+título à esquerda, nav central, badge Admin + Sair à direita. **Mobile:** header com logo central entre ornamentos dourados (esconde ao rolar), FAB dourado fixo abre Sheet com nav completa.

| Rota | Acesso |
|---|---|
| `/` Dashboard | público |
| `/partidas` | público (CRUD admin) |
| `/ranking` | público |
| `/hall-da-fama` | logado |
| `/perfil` | logado |
| `/estatisticas` | admin |
| `/admin/financeiro` | admin |
| `/admin/vinculos` | admin |
| `/auth`, `/complete-profile` | — |

## 4. Backend — Supabase próprio

Após aprovação, o usuário conecta seu Supabase. Migrations criam:

**Tabelas (RLS ativo em todas):**
- `profiles` (1:1 auth.users): nickname, full_name, phone, gender, avatar_url, level, xp, current_rank, profile_completed.
- `user_roles` + enum `app_role('admin','user')` + função `has_role()` SECURITY DEFINER.
- `temporary_players`: nickname, full_name, gender, avatar_url, created_by.
- `seasons`: year, status('open'|'closed'), champion_user_id (K do Poker), as_winner_user_id, as_indicated_by_admin_at.
- `games`: name, date, season_year, month (1-12), buy_in, rebuy_value, **rake_as**, **rake_month**, **croupier_fee**, status, total_pot, prize_pool (= total_pot − rake_as − rake_month − croupier_fee), description.
- `game_participations`: XOR user_id/temp_player_id, snapshot, entries, rebuys, total_invested, position, is_winner, ko_points, ranking_points, xp_earned.
- `link_requests`, `public_rankings` (sazonal), `monthly_rankings` (por season+month, com champion_user_id e prize_amount), `season_champions`.
- **`as_pool`**: ledger de movimentação do Ás (game_id ou expense_id, valor +/−, descrição, data).
- **`expenses`**: descrição, valor, criado_por, created_at — sempre debitam o `as_pool`.
- **`achievements`**: catálogo (code, name, description, xp_reward, repeatable).
- **`user_achievements`**: user_id, achievement_code, count, last_awarded_at, total_xp_from.
- **`hall_of_fame`** (view materializada ou query): vencedores de rodada, mês, Ás e ano agrupados por usuário.

Trigger `handle_new_user` cria profile + role 'user'. Bucket `avatars` público. Auth email/senha + Google. RLS pública para leitura, escrita admin via `has_role`.

## 5. Pontuação (`src/lib/scoring.ts`)

`pontos = (PBT × FM) + KO`
- **PBT** — tabela base por (colocação × total de jogadores 6→20). `<6`→col 6; `>20`→col 20.
- **FM** por total de ações (entries+rebuys): ≤25→1.0 · ≤35→1.2 · ≤45→1.4 · ≤55→1.5 · ≤69→1.6 · 70+→2.0
- Arredondamento de PBT×FM: `≥0.6`↑ senão↓. KO somado depois.
- API: `calcTournamentPoints({ totalPlayers, position, totalActions, koPoints })`.

## 6. Financeiro (rakes separados) — **NOVO**

Cada partida tem 4 valores editáveis no fechamento:
- **Rake Ás** (acumula no pool anual do torneio especial Ás do Poker)
- **Rake Mês** (acumula no pool do mês corrente — vai para o vencedor do mês)
- **Croupier** (despesa operacional da partida)
- **Premiação** = `total_pot − rake_as − rake_month − croupier`

No `GameDetailsModal`, na aba "Resultados", inputs para os 3 rakes/fee + cálculo automático da premiação. Ao finalizar:
- grava em `games`,
- insere linha em `as_pool` (+rake_as),
- insere linha em `monthly_rankings.prize_amount` accumulator (+rake_month),
- recalcula ranking + XP + conquistas via edge function.

**Aba `/admin/financeiro` (admin):**
- Tabela "Por mês" (linhas = meses do ano): Arrecadado Ás, Arrecadado Mês, Premiação Distribuída, Saldo Ás (acumulado).
- Cards de totais: Total Ás (ano), Total Premiação Mensal (ano), Total Despesas Ás.
- Seção **Despesas**: botão "Nova despesa" + extrato cronológico com data, descrição, valor, autor. Toda despesa debita o `as_pool` (linha negativa).
- Botão "Encerrar Mês X" (admin): seleciona o vencedor do mês corrente (top 1 do `monthly_rankings`), grava `champion_user_id` + `prize_amount`, marca o mês como fechado, dispara conquista "Vencedor do Mês RR" (+500 XP) e adiciona o valor ao "lucro" do jogador (campo agregado em `profiles.lifetime_winnings` exibido no perfil).
- Botão "Encerrar Temporada" (admin): paga o Ás (admin indica vencedor) + define K do Poker automaticamente (top 1 do ranking sazonal) e arquiva em `season_champions`.

## 7. Hall da Fama — **NOVO**

Página `/hall-da-fama` com 4 seções (tabs ou accordions):
1. **Vencedores de Rodada** — todos que venceram qualquer partida; lista com avatar, nickname e contador "X vitórias". Ordenado por contagem.
2. **Vencedores do Mês** — lista com nickname e quantos meses venceu.
3. **Ás do Poker** — apenas o perfil do vencedor de cada ano (cards grandes por temporada). Botão admin "Indicar Vencedor do Ás" abre dialog para escolher jogador.
4. **K do Poker (Campeão do Ano)** — apenas o perfil do vencedor de cada temporada. Lançado automaticamente ao encerrar temporada.

Cada card é clicável → abre `PlayerSummaryModal`.

## 8. Dashboard — Ranking do Mês (substitui Sprints) — **NOVO**

Card "Ranking do Mês" mostra:
- Top 5 do mês corrente (avatar, posição, nickname, pontos do mês).
- Se o usuário logado não estiver no top 5, aparece como **6ª linha destacada** com sua posição real (ex.: "12º — Você").
- Botão **"Expandir Ranking"** (Sheet/Dialog) com lista completa do mês.
- Botão **"Gerar Relatório"** (JPEG dark+dourado do ranking mensal).

Dashboard também mantém: card boas-vindas (avatar, nível/XP, ranking), grid 2×2 stats (Partidas, Vitórias, Pontos, Posição), Top 5 sazonal com pódio, Partidas Recentes, Progresso de Nível (SVG), Conquistas X/N.

## 9. Páginas

**Partidas:** tabs por temporada, busca, "Nova Partida" (admin), cards horizontais com nome, badge Torneio laranja, status, data, buy-in, rebuy, # jogadores, pote.

**Ranking:** barra admin (Recalcular, Vínculos, Resetar Temporada), tabs de temporada, "Gerar Relatório" (JPEG), pódio top 3 + lista. Mobile em 2 linhas verticais; nomes nunca truncados (`line-clamp-2 break-words`); botão "Solicitar Vínculo" para temporário; badge "Temporário".

**Perfil:** cabeçalho avatar/nickname/nível/XP/editar, 4 stat cards, **lifetime_winnings** (R$ ganhos em prêmios mensais/Ás/ano), histórico de partidas com pontos+XP, lista de conquistas com contagem (RR mostra "×N").

**Estatísticas (admin):** tabela ordenável por temporada — Jogador, Partidas, Vitórias, KOs, Entradas, Rebuys, Ações, Pontos, Média.

**Vínculos (admin):** lista pending user↔temp + Aprovar/Rejeitar.

**Auth + Complete-profile:** email/senha + Google, wizard com nickname, full_name, phone, gênero, AvatarPicker.

## 10. Modais

- `CreateGameModal`/`EditGameModal`: nome, data+hora, buy-in, rebuy_value, temporada+mês, descrição, `PlayerSelector` (chips, seções Usuários/Temporários, sub-dialog criar temp com AvatarPicker).
- `GameDetailsModal`: header + stat cards (Buy-in, Pote, # Jogadores, Ações + FM exibido). Aba **Resultados** (admin): inputs por participante (entries, rebuys, posição, KOs) com preview de pontos ao vivo + **inputs de Rake Ás, Rake Mês, Croupier e cálculo da Premiação**. Ações: Adicionar Jogador, Editar, Finalizar, Exportar CSV, Gerar Relatório JPEG.
- `EditProfileDialog`, `TempPlayerDialog`, `PlayerSummaryModal` (stats+histórico+conquistas).
- `ExpenseDialog` (admin financeiro), `IndicateAsWinnerDialog` (admin Hall da Fama / encerrar temporada), `CloseMonthDialog`.

## 11. Edge Functions (Supabase, Deno)

- `update-ranking` (admin): recalcula `public_rankings` e `monthly_rankings` (agregação por user/temp + season + mês), ordena, atualiza `profiles.current_rank`, recalcula XP e conquistas.
- `approve-link-request` (admin): migra participações do temp para o user, deleta temp, marca approved, dispara `update-ranking`.
- `close-month` (admin): define vencedor do mês, paga `prize_amount`, atualiza `profiles.lifetime_winnings`, concede conquista "Vencedor do Mês RR".
- `close-season` (admin): seta K do Poker (top 1 ranking sazonal), arquiva `season_champions`, concede conquistas "K do Poker RR" e (se admin já indicou) "Ás do Poker RR".

CORS, validação JWT em código, validação admin via `has_role`.

## 12. XP e Conquistas (`src/lib/xpSystem.ts`) — **REVISADO**

**XP por evento (concedido em `update-ranking` ao finalizar partida):**
- 100 XP por partida jogada.
- Pódio (1º/2º/3º): +200 XP.
- Vencedor: +100 XP adicional (total 300 no pódio).
- 10 XP por KO.

**Nível:** `level = floor(xp/1000) + 1`. **XP e conquistas acumulam entre temporadas.**

**Catálogo de conquistas:**
| Code | Nome | Critério | XP | Repetível |
|---|---|---|---|---|
| `aprendiz` | Aprendiz | 10 partidas | 500 | não |
| `engajado` | Engajado | 25 partidas | 1000 | não |
| `veterano` | Veterano | 50 partidas | 2000 | não |
| `vencedor_rr` | Vencedor | 5 vitórias (a cada bloco) | 1000 | **sim** |
| `k_poker_rr` | K do Poker | Campeão do ano | 5000 | **sim** |
| `back_to_back_rr` | Back-to-Back Champion | 2 torneios seguidos vencidos | 500 | **sim** |
| `as_poker_rr` | Ás do Poker | Vencedor do Ás | 1000 | **sim** |
| `vencedor_mes_rr` | Vencedor do Mês | Cada mês conquistado | 500 | **sim** |
| `consistente_rr` | Consistente | 2 pódios em sequência | 300 | **sim** |

Conquistas RR exibidas com contador `×N` no perfil. `user_achievements.count` incrementa e XP é creditado a cada nova ocorrência. Detecção de "seguidos/sequência" usa ordenação por `games.date` do usuário.

## 13. Relatórios (`src/lib/reports.ts`)

`html2canvas` para capturar componentes ocultos estilizados:
- `GameReportGenerator` → JPEG do torneio (dark+dourado, header com nome/data/ações/FM/pote/rakes/premiação + tabela).
- `RankingReportGenerator` (sazonal) → pódio + lista numerada.
- `MonthlyRankingReportGenerator` → ranking mensal com mês/ano no cabeçalho.
Canvas 2× retina, download automático.

## 14. Detalhes técnicos

- TS estrito, Zod + react-hook-form em todos os formulários.
- `AuthContext` provê `user, profile, isAdmin, loading, signOut`; `onAuthStateChange` antes de `getSession`.
- `ProtectedRoute` / `AdminRoute` para gating.
- Helpers `src/lib/format.ts` (`formatBRL`, `formatDateTime`, `formatPoints`).
- shadcn/ui customizado, variante `premium` de Button com gradient dourado.
- Logo + 5 avatares fixos importados de `src/assets/`.
- Nomes nunca truncados com `...` — sempre `line-clamp-2 break-words`.

## 15. Fases de execução

1. **Design system + layout + assets:** tokens, Tailwind, classes utilitárias, header desktop/mobile + FAB drawer, todas as rotas com mocks, logo e 5 avatares fixos.
2. **Conexão Supabase + auth:** migrations (todas as tabelas, enums, RLS, trigger, has_role, bucket avatars); `/auth`, `/complete-profile` com AvatarPicker; AuthContext + rotas protegidas.
3. **Partidas + pontuação + ranking sazonal/mensal:** `scoring.ts`; modais de partida + temp player + player selector; **inputs de rakes/croupier + cálculo de premiação**; edge function `update-ranking` (sazonal e mensal); páginas `/ranking` e `/admin/vinculos` + `approve-link-request`.
4. **Dashboard (Ranking do Mês) + perfil + estatísticas + relatórios:** card Ranking do Mês com top5 + linha do usuário + expandir + relatório; perfil com lifetime_winnings; página estatísticas; relatórios JPEG.
5. **Financeiro + Hall da Fama + XP/conquistas:** `/admin/financeiro` (tabelas mensais, totais, despesas, encerrar mês, encerrar temporada); `/hall-da-fama` (4 seções + indicar Ás); catálogo de conquistas + lógica de concessão (incluindo RR, sequências); edge functions `close-month` e `close-season`.
