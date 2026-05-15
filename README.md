# 🃏 Família Poker Champions (FPC)

Sistema web para gerenciamento de uma liga privada de poker — partidas, ranking, XP, conquistas, Hall da Fama e controle financeiro.

---

## Visão Geral

O FPC é um SPA (Single Page Application) construído com React + TypeScript + Supabase. Permite que um grupo de amigos registre torneios de poker, acompanhe o desempenho individual ao longo das temporadas e mantenha um histórico completo de resultados, finanças e títulos.

**O que o sistema faz:**

- Cadastro e gerenciamento de partidas com buy-in, rebuys, KO e posições
- Pontuação proprietária: `pontos = (PBT × FM) + KO` — onde PBT é a tabela base por colocação/número de jogadores e FM é o multiplicador por volume de ações
- Ranking sazonal (por ano) e ranking mensal
- Sistema de XP e níveis por partida jogada, pódios, vitórias e KOs
- 12 conquistas, algumas repetíveis (com sufixo `_rr`), que concedem XP adicional
- Controle financeiro com três rakes por partida: Ás, Mês e Croupier
- Encerramento mensal com premiação automática ao líder do mês
- Títulos de temporada: K do Poker (ranking anual) e Ás do Poker (torneio especial)
- Hall da Fama com vitórias por rodada, meses conquistados e títulos de temporada
- Suporte a jogadores temporários que podem ser vinculados a contas reais
- Geração de relatórios em JPEG para compartilhamento

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Roteamento | React Router v6 |
| Estado servidor | TanStack Query v5 |
| UI | Tailwind CSS v3 + shadcn/ui (Radix) |
| Ícones | Lucide React |
| Backend / Auth / DB | Supabase (JS v2) |
| Recálculo de ranking | Supabase Edge Function (`recalc-ranking`) |
| Relatórios | html2canvas |
| Notificações | Sonner |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |
| Testes | Vitest + Testing Library |

---

## Estrutura de Pastas

```
src/
├── components/         # Componentes reutilizáveis
│   ├── ui/             # shadcn/ui (gerados)
│   ├── GameDetailsModal.tsx
│   ├── GameQuickViewModal.tsx
│   ├── HallReport.tsx
│   ├── Reports.tsx
│   └── ...
├── contexts/
│   └── AuthContext.tsx # Sessão, perfil e role do usuário
├── hooks/              # TanStack Query — toda comunicação com o banco
│   ├── useGames.ts
│   ├── useRanking.ts
│   ├── useHallOfFame.ts
│   ├── useFinance.ts
│   └── ...
├── lib/                # Lógica de negócio pura
│   ├── scoring.ts      # PBT_TABLE + getFM + calcTournamentPoints
│   ├── xpSystem.ts     # xpForGame + levelFromXp + ACHIEVEMENTS
│   ├── achievements.ts # computeAchievements + totalAchievementXp
│   ├── recalc.ts       # Chama a Edge Function recalc-ranking
│   ├── db-types.ts     # Interfaces TypeScript sincronizadas com o banco
│   ├── format.ts       # formatBRL, formatDate, MONTHS_PT
│   └── reports.ts      # renderAndCapture (html2canvas)
├── pages/              # Uma página por rota
│   ├── Dashboard.tsx
│   ├── Partidas.tsx
│   ├── Ranking.tsx
│   ├── HallDaFama.tsx
│   ├── Perfil.tsx
│   ├── Estatisticas.tsx
│   ├── AdminFinanceiro.tsx
│   └── AdminVinculos.tsx
└── integrations/
    └── supabase/
        └── client.ts   # createClient com variáveis de ambiente
```

---

## Rotas

| Rota | Acesso | Página |
|---|---|---|
| `/` | público | Dashboard |
| `/partidas` | público | Lista de partidas |
| `/ranking` | público | Ranking sazonal e mensal |
| `/hall-da-fama` | público | Hall da Fama |
| `/perfil` | logado | Perfil do jogador |
| `/estatisticas` | admin | Estatísticas gerais |
| `/admin/financeiro` | admin | Controle financeiro |
| `/admin/vinculos` | admin | Vínculos de jogadores temporários |
| `/auth` | — | Login / Cadastro |
| `/complete-profile` | logado | Completar perfil obrigatório |

---

## Sistema de Pontuação

```
Pontos = (PBT × FM) + KO
```

- **PBT** — Pontuação Base da Tabela: depende da colocação (1–20) e do número de jogadores (6–20). Definida em `src/lib/scoring.ts`
- **FM** — Multiplicador de Faixa de Ações (total de entries + rebuys):

| Ações | FM |
|---|---|
| ≤ 25 | 1.0 |
| ≤ 35 | 1.2 |
| ≤ 45 | 1.4 |
| ≤ 55 | 1.5 |
| ≤ 69 | 1.6 |
| ≥ 70 | 2.0 |

- **KO** — pontos de eliminação, somados diretamente

---

## Sistema de XP e Níveis

| Evento | XP |
|---|---|
| Participar de uma partida | +100 |
| Terminar no pódio (top 3) | +200 |
| Vencer a partida | +100 adicional |
| Cada KO | +10 |

- **Nível:** `nível = floor(XP total / 1000) + 1`
- XP de conquistas é somado ao total

---

## Conquistas

| Código | Nome | Descrição | XP | Repetível |
|---|---|---|---|---|
| `aprendiz` | Aprendiz | 10 partidas jogadas | 500 | Não |
| `engajado` | Engajado | 25 partidas jogadas | 1.000 | Não |
| `veterano` | Veterano | 50 partidas jogadas | 2.000 | Não |
| `vencedor_rr` | Vencedor | A cada 5 vitórias | 1.000 | Sim |
| `k_poker_rr` | K do Poker | Campeão do ano | 5.000 | Sim |
| `back_to_back_rr` | Back-to-Back | 2 torneios seguidos vencidos | 500 | Sim |
| `as_poker_rr` | Ás do Poker | Vencedor do Ás | 1.000 | Sim |
| `vencedor_mes_rr` | Vencedor do Mês | Cada mês conquistado | 500 | Sim |
| `consistente_rr` | Consistente | 2 pódios em sequência | 300 | Sim |
| `sniper_rr` | Sniper | A cada 50 KOs acumulados | 300 | Sim |
| `fenix_rr` | Fênix | Vencer com 4+ reentradas | 200 | Sim |
| `tribuna_rr` | Tribuna | A cada 10 pódios | 1.000 | Sim |

---

## Financeiro

Cada partida registra três rakes:

- **Rake Ás** — acumula no fundo do Ás do Poker (descontam-se despesas operacionais)
- **Rake Mês** — distribuído ao campeão mensal ao encerrar o mês
- **Croupier** — taxa operacional da partida

**Títulos da temporada:**
- **K do Poker** — 1º colocado do ranking anual ao encerrar a temporada
- **Ás do Poker** — vencedor do torneio especial, indicado pelo admin

---

## Edge Function — `recalc-ranking`

O recálculo de XP, nível e ranking de todos os jogadores roda no servidor via Supabase Edge Function. O frontend chama `supabase.functions.invoke("recalc-ranking")` e aguarda o resultado.

A função usa `service_role_key` para atualizar todos os perfis sem restrições de RLS. É disparada automaticamente ao finalizar ou reabrir uma partida, ao aceitar vínculos e manualmente pelo admin na página de Ranking.

---

## Configuração Local

```bash
# 1. Clone o repositório
git clone https://github.com/rvporto/fpchampions.git
cd fpchampions

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com sua URL e anon key do Supabase

# 4. Rode o projeto
npm run dev        # http://localhost:5173

# 5. Outros comandos úteis
npm run build      # build de produção
npm run preview    # preview do build
npm test           # rodar testes
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Anon key (segura no client) |

> A `service_role_key` **não vai para o frontend**. Ela é usada exclusivamente pela Edge Function `recalc-ranking`, que o Supabase injeta automaticamente no ambiente da função.

---

## Deploy (Vercel)

1. Conecte o repositório na Vercel
2. Configure o preset como **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
6. No painel do Supabase → **Auth → URL Configuration**, adicione:
   - Site URL: `https://seu-dominio.vercel.app`
   - Redirect URLs: `https://seu-dominio.vercel.app/auth`, `https://seu-dominio.vercel.app/complete-profile`

---

## Banco de Dados (Supabase)

As migrations estão em `supabase-sql/` e devem ser aplicadas em ordem:

| Arquivo | Descrição |
|---|---|
| `0005_phase5.sql` | Estrutura base (partidas, participações, perfis) |
| `0006_prize_won.sql` | Campo prize_won nas participações |
| `0007_monthly_temp_champion.sql` | Suporte a campeão temporário mensal |
| `0008_monthly_rankings_unique_index.sql` | Índice único no ranking mensal |
| `0009_link_requests_table.sql` | Tabela de solicitações de vínculo |
| `0010_expenses_author_name.sql` | Nome do autor nas despesas |
| `0011_games_as_flag.sql` | Flag is_as_game e as_prize_amount |
| `0012_season_champions_as_indicated_at.sql` | Data de indicação do Ás |
| `0013_season_champions_as_temp_player.sql` | Ás temporário na temporada |
| `0014_season_champions_k_temp_player.sql` | K temporário na temporada |

Para documentação completa do esquema, regras de negócio e histórico de SQL, consulte `MIGRATION_SNAPSHOT.md`.

---

## Tipos de Usuário

| Role | Permissões |
|---|---|
| `user` | Visualiza tudo público + perfil próprio + solicita vínculo a temporário |
| `admin` | Tudo acima + CRUD de partidas + finanças + vínculos + encerramento de mês/temporada |

O gating de rotas é feito por `src/components/ProtectedRoute.tsx` que lê o `AuthContext`.

---

## Licença

Projeto privado — uso restrito ao grupo Família Poker Champions.
