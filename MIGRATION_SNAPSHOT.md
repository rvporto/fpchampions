# Família Poker Champions (FPC) — Snapshot Técnico Completo para Migração

> Documento único que responde aos 3 prompts (Gemini / Codex / ChatGPT).
> Objetivo: permitir que outro desenvolvedor (ou outra IA) baixe o código, recrie o banco no Supabase e publique na Vercel sem perda de funcionalidade.
> Última revisão: 2026-05-04. Verificado contra o repositório atual.

---

## 1. Visão geral

**FPC – Família Poker Champions / Liga de Torneios** é um SPA React que gerencia uma liga privada de poker entre amigos:

- Cadastro de partidas (torneios) com buy-in, rebuys, KO, posições.
- Pontuação proprietária `pontos = (PBT × FM) + KO` (ver `src/lib/scoring.ts`).
- Ranking sazonal (por ano) e ranking mensal.
- Perfis com nível, XP, conquistas (algumas repetíveis, RR), prêmios acumulados (`lifetime_winnings`).
- Controle financeiro com 3 rakes por partida (Ás, Mês, Croupier) e premiação calculada.
- Hall da Fama com 4 categorias: Vencedores de Rodada, Vencedores do Mês, Ás do Poker, K do Poker.
- Jogadores temporários (criados pelo admin) que podem ser vinculados a um usuário real via solicitação.

**Tipos de usuário:**
- `user` (padrão): vê tudo público + perfil próprio + pode solicitar vínculo a um temporário.
- `admin`: tudo acima + CRUD de partidas, finanças, vínculos, encerramento de mês/temporada.

**Rotas (definidas em `src/App.tsx`):**

| Rota | Acesso | Componente |
|---|---|---|
| `/` | público (com layout) | `pages/Dashboard.tsx` |
| `/partidas` | público | `pages/Partidas.tsx` |
| `/ranking` | público | `pages/Ranking.tsx` |
| `/hall-da-fama` | logado | `pages/HallDaFama.tsx` |
| `/perfil` | logado | `pages/Perfil.tsx` |
| `/estatisticas` | admin | `pages/Estatisticas.tsx` |
| `/admin/financeiro` | admin | `pages/AdminFinanceiro.tsx` |
| `/admin/vinculos` | admin | `pages/AdminVinculos.tsx` |
| `/auth` | — | `pages/Auth.tsx` |
| `/complete-profile` | logado, profile incompleto | `pages/CompleteProfile.tsx` |
| `*` | — | `pages/NotFound.tsx` |

Gating: `src/components/ProtectedRoute.tsx` (lê `useAuth()`; redireciona para `/auth`, `/complete-profile` ou `/` conforme o caso).

---

## 2. Stack técnica

- **Framework:** React 18 + Vite 5 + TypeScript 5.
- **Roteamento:** `react-router-dom` v6 (BrowserRouter, rotas declarativas em `App.tsx`).
- **Estado servidor:** `@tanstack/react-query` v5 (todos os hooks em `src/hooks/`).
- **Estado client:** Context API (`AuthContext`) + `useState` local. Não há Redux/Zustand.
- **UI:** Tailwind CSS v3 + shadcn/ui (componentes em `src/components/ui/`) + `lucide-react` (ícones).
- **Forms / validação:** `react-hook-form` + `zod` + `@hookform/resolvers`.
- **Backend / DB / Auth / Storage:** Supabase (`@supabase/supabase-js` v2).
- **Gráficos:** `recharts`.
- **Relatórios JPEG:** `html2canvas` (`src/lib/reports.ts` + `src/components/Reports.tsx`).
- **Notificações:** `sonner` (toasts).
- **Tema:** `next-themes` (dark fixo no projeto).
- **Datas:** `date-fns`.
- **Animações:** `tailwindcss-animate`.
- **Testes:** `vitest` + `@testing-library/react` + `jsdom`.
- **Build/Lint:** `eslint`, `@vitejs/plugin-react-swc`.

Ver lista exata em `package.json` (cole no novo repo sem mudanças).

---

## 3. Estrutura de pastas (`src/`)

```
src/
├── App.tsx                         # Roteador + providers
├── main.tsx                        # bootstrap React
├── index.css                       # tokens HSL + utilitários (.fpc-card, .fpc-text-gold, ...)
├── App.css
├── vite-env.d.ts
│
├── assets/
│   ├── logo.png                    # Brasão dourado
│   ├── gender-warning.jpg          # imagem do diálogo "ESCOLHA UMA OPÇÃO VÁLIDA"
│   └── avatars/avatar-1..5.jpg     # 5 avatares fixos
│
├── integrations/supabase/
│   └── client.ts                   # createClient(SUPABASE_URL, ANON_KEY)
│
├── contexts/
│   └── AuthContext.tsx             # user, session, profile, isAdmin, signOut, refreshProfile
│
├── components/
│   ├── AppLayout.tsx               # header desktop + mobile + FAB drawer
│   ├── ProtectedRoute.tsx          # gating logado/admin/profile_completed
│   ├── Logo.tsx, NavLink.tsx
│   ├── PlayerAvatar.tsx, AvatarPicker.tsx     # 5 fixos + upload bucket avatars
│   ├── PlayerSelector.tsx, TempPlayerDialog.tsx
│   ├── CreateGameModal.tsx, GameDetailsModal.tsx
│   ├── LinkTempPlayerDialog.tsx
│   ├── InvalidGenderDialog.tsx     # alerta para gênero "Outro"
│   ├── RankIndicators.tsx, Reports.tsx
│   └── ui/                         # shadcn/ui (não editar à mão)
│
├── hooks/
│   ├── useGames.ts                 # CRUD de partidas, participações, finalize
│   ├── useRanking.ts               # ranking sazonal/mensal com filtros
│   ├── useFinance.ts               # expenses, as_pool, monthly_rankings, season_champions
│   ├── useHallOfFame.ts            # rounds/months/year/as
│   ├── useLinkRequests.ts          # solicitações de vínculo + aprovar/rejeitar
│   ├── usePlayerStats.ts           # stats por jogador
│   ├── use-toast.ts, use-mobile.tsx
│
├── lib/
│   ├── scoring.ts                  # calcTournamentPoints (PBT × FM + KO)
│   ├── xpSystem.ts                 # XP por evento, catálogo ACHIEVEMENTS
│   ├── achievements.ts             # computeAchievements(history,...)
│   ├── recalc.ts                   # recalcRankingAndXp (rodada client-side)
│   ├── reports.ts                  # geração JPEG (html2canvas)
│   ├── avatars.ts                  # FIXED_AVATARS map id → asset
│   ├── db-types.ts                 # interfaces espelho do banco
│   ├── format.ts                   # formatBRL, formatDateTime, formatPoints
│   ├── mockData.ts                 # mocks (não usados em prod)
│   └── utils.ts                    # cn(), helpers
│
├── pages/
│   ├── Dashboard.tsx               # ranking do mês + sazonal + boas-vindas
│   ├── Partidas.tsx
│   ├── Ranking.tsx
│   ├── HallDaFama.tsx
│   ├── Perfil.tsx
│   ├── Estatisticas.tsx            # admin only — inclui aba "Meses Vencidos"
│   ├── AdminFinanceiro.tsx
│   ├── AdminVinculos.tsx
│   ├── Auth.tsx
│   ├── CompleteProfile.tsx
│   └── NotFound.tsx
│
└── test/                           # vitest setup + exemplo
```

Pastas raiz extras: `supabase-sql/` (migrations cronológicas), `public/`, configs `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `eslint.config.js`, `postcss.config.js`, `vitest.config.ts`, `components.json`.

---

## 4. Como rodar localmente

**Pré-requisitos:** Node ≥ 20 (Vite 5 + Vitest 3). Recomendado **Node 20 LTS** ou 22. npm/pnpm/bun (qualquer um).

```bash
# 1. Instalar
npm install              # ou: pnpm install / bun install

# 2. Variáveis de ambiente (NÃO usadas no código atual!)
#    Hoje URL e ANON estão hardcoded em src/integrations/supabase/client.ts.
#    Recomendado migrar para .env.local antes do deploy (ver §14).

cp .env.example .env.local

# 3. Dev
npm run dev              # http://localhost:5173

# 4. Build/preview
npm run build
npm run preview

# 5. Testes
npm test                 # vitest run
```

`.env.example` sugerido (criar):
```
VITE_SUPABASE_URL=https://sgbuvlqmbdtfojmwwwyq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> Hoje, `src/integrations/supabase/client.ts` lê valores diretos. Para migrar fora do Lovable, refatore para:
> ```ts
> const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
> const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;
> ```

---

## 5. Supabase — uso completo

### Conexão
- Arquivo: `src/integrations/supabase/client.ts`.
- URL atual: `https://sgbuvlqmbdtfojmwwwyq.supabase.co`.
- Apenas a **anon key** é usada no frontend. **Nenhum service role aparece no client** (verificado).
- Persistência da sessão em `localStorage`, autoRefreshToken ativo.

### Auth
- Email/senha + Google (via Supabase Auth).
- Trigger `handle_new_user` cria automaticamente o `profiles` e atribui role `user` ao novo usuário.
- A camada de "perfil completo" é controlada por `profiles.profile_completed`. `ProtectedRoute` força `/complete-profile` enquanto `false`.
- Admin é detectado via tabela separada `user_roles` (NÃO em `profiles`, para evitar privilege escalation) e função `has_role()` SECURITY DEFINER.

### Bucket de Storage
- `avatars` — público — uploads do `AvatarPicker`. Política pública de leitura, escrita autenticada.

### Tabelas (públicas, todas com RLS ativa)

| Tabela | Função |
|---|---|
| `profiles` | espelho 1:1 de `auth.users` (nickname, full_name, phone, gender, avatar_url, level, xp, current_rank, lifetime_winnings, profile_completed) |
| `user_roles` | (`user_id`, `role app_role`) — `app_role` enum (`admin`, `user`) |
| `temporary_players` | jogadores fictícios criados pelo admin |
| `games` | partidas (data, season_year, month, buy_in, rebuy_value, rake_as, rake_month, croupier_fee, total_pot, prize_pool, status, description) |
| `game_participations` | participação por partida (XOR user_id/temp_player_id, entries, rebuys, total_invested, position, is_winner, ko_points, ranking_points, xp_earned, prize_won, snapshots) |
| `link_requests` | solicitação user → temp_player (status pending/approved/rejected) |
| `monthly_rankings` | campeão de cada mês (`champion_user_id` ou `champion_temp_player_id`, prize_amount) |
| `season_champions` | K do Poker (ano) + Ás do Poker indicado |
| `expenses` | despesas (debitam o pool do Ás) |
| `as_pool` | ledger do Ás (entradas + saídas) |

> Não há `public_rankings` materializada: o ranking sazonal é agregado em runtime por `useRanking`. Não há views/funções RPC além de `has_role` e `handle_new_user`.

### Operações que o frontend faz direto no Supabase
Tudo via supabase-js do cliente (sem edge functions hoje):
- SELECT em todas as tabelas listadas.
- INSERT/UPDATE em `games`, `game_participations`, `temporary_players`, `link_requests`, `expenses`, `as_pool`, `monthly_rankings`, `season_champions`, `profiles` (pelo dono).
- `recalcRankingAndXp` (`src/lib/recalc.ts`) roda no client após finalizar partida — recalcula `ranking_points`, `xp_earned`, `is_winner` e atualiza `profiles.xp` e `profiles.level`.

---

## 6. Histórico cronológico de SQL executado no Supabase

Arquivos vivem em `supabase-sql/` (entregue todos para o novo dev). A ordem para reconstruir do zero é a numérica + a seção "Schema base" abaixo (que reúne o que foi feito antes de `0005`).

### 6.0 Schema base (Fases 1–4, executadas implicitamente pelo Lovable Cloud)
> Não há arquivos `0001..0004` no repo, mas as estruturas existem no Supabase. Este bloco reconstrói tudo idempotentemente. Rode-o **antes** dos arquivos `0005…0010`.

```sql
-- ENUMS
do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.game_status as enum ('scheduled','in_progress','finished');
exception when duplicate_object then null; end $$;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  full_name text,
  phone text,
  gender text,
  avatar_url text,
  level int not null default 1,
  xp int not null default 0,
  current_rank int,
  lifetime_winnings numeric(12,2) not null default 0,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- USER ROLES
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role (SECURITY DEFINER — evita recursão RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- TRIGGER: cria profile + role 'user' ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, profile_completed) values (new.id, false)
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- TEMPORARY PLAYERS
create table if not exists public.temporary_players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  full_name text,
  gender text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.temporary_players enable row level security;

-- GAMES
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date timestamptz not null,
  season_year int not null,
  month int not null check (month between 1 and 12),
  buy_in numeric(12,2) not null default 0,
  rebuy_value numeric(12,2) not null default 0,
  rake_as numeric(12,2) not null default 0,
  rake_month numeric(12,2) not null default 0,
  croupier_fee numeric(12,2) not null default 0,
  total_pot numeric(12,2) not null default 0,
  prize_pool numeric(12,2) not null default 0,
  status public.game_status not null default 'scheduled',
  description text,
  created_at timestamptz not null default now()
);
alter table public.games enable row level security;

-- GAME PARTICIPATIONS
create table if not exists public.game_participations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  temp_player_id uuid references public.temporary_players(id) on delete set null,
  snapshot_nickname text,
  snapshot_avatar_url text,
  entries int not null default 1,
  rebuys int not null default 0,
  total_invested numeric(12,2) not null default 0,
  position int,
  is_winner boolean not null default false,
  ko_points int not null default 0,
  ranking_points numeric(10,2) not null default 0,
  xp_earned int not null default 0,
  -- prize_won adicionado em 0006
  check ((user_id is not null)::int + (temp_player_id is not null)::int = 1)
);
alter table public.game_participations enable row level security;
create index if not exists gp_game_idx on public.game_participations(game_id);
create index if not exists gp_user_idx on public.game_participations(user_id);
create index if not exists gp_temp_idx on public.game_participations(temp_player_id);

-- POLÍTICAS RLS BÁSICAS (leitura pública, escrita admin)
-- profiles: leitura pública, dono atualiza
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles for select using (true);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- user_roles: leitura pelo próprio + admin write
drop policy if exists "roles_read_self_or_admin" on public.user_roles;
create policy "roles_read_self_or_admin" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
drop policy if exists "roles_admin_write" on public.user_roles;
create policy "roles_admin_write" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- temporary_players, games, game_participations: leitura pública, escrita admin
do $$
declare t text;
begin
  foreach t in array array['temporary_players','games','game_participations'] loop
    execute format('drop policy if exists "%I_read_all" on public.%I', t, t);
    execute format('create policy "%I_read_all" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%I_admin_write" on public.%I', t, t);
    execute format('create policy "%I_admin_write" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t, t);
  end loop;
end $$;

-- Bucket avatars
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Policies do bucket
drop policy if exists "avatars_read_all" on storage.objects;
create policy "avatars_read_all" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_write" on storage.objects;
create policy "avatars_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');
```

### 6.1 `supabase-sql/0005_phase5.sql` — Financeiro
Cria `expenses`, `as_pool`, `monthly_rankings`, `season_champions`, `season_champions.as_indicated_at`, `profiles.lifetime_winnings`. RLS leitura pública + escrita admin. (Conteúdo completo no arquivo.)

### 6.2 `0006_prize_won.sql`
```sql
alter table public.game_participations
  add column if not exists prize_won numeric(12,2) not null default 0;
```

### 6.3 `0007_monthly_temp_champion.sql`
Permite vencedor temporário no encerramento mensal: adiciona `champion_temp_player_id`, torna `champion_user_id` nullable, adiciona constraint XOR.

### 6.4 `0008_monthly_rankings_unique_index.sql`
```sql
create unique index if not exists monthly_rankings_season_year_month_idx
  on public.monthly_rankings (season_year, month);
```

### 6.5 `0009_link_requests_table.sql`
Cria `link_requests` idempotentemente, adiciona `reviewed_at`, `reviewed_by`, RLS (leitura pública, insert pelo próprio user, escrita admin).

### 6.6 `0010_expenses_author_name.sql`
```sql
alter table public.expenses
  add column if not exists author_name text;
```

### 6.7 `0011_games_as_flag.sql` — Marcação de partida do Ás
```sql
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_as_game boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS as_prize_amount numeric NOT NULL DEFAULT 0;
```
Permite marcar uma partida como "do Ás" e usar o saldo do pool do Ás como premiação extra.

### 6.8 `0012_season_champions_as_indicated_at.sql`
```sql
ALTER TABLE public.season_champions
  ADD COLUMN IF NOT EXISTS as_indicated_at TIMESTAMP WITH TIME ZONE;
```
(Idempotente — também aparece em `0005`. Mantido para reforço.)

### 6.9 `0013_season_champions_as_temp_player.sql` — Ás pode ser jogador temporário
```sql
ALTER TABLE public.season_champions
  ADD COLUMN IF NOT EXISTS as_temp_player_id uuid
  REFERENCES public.temporary_players(id) ON DELETE SET NULL;
```

### Ordem recomendada para reconstruir o banco do zero
1. Bloco "Schema base" da §6.0
2. `0005_phase5.sql`
3. `0006_prize_won.sql`
4. `0007_monthly_temp_champion.sql`
5. `0008_monthly_rankings_unique_index.sql`
6. `0009_link_requests_table.sql`
7. `0010_expenses_author_name.sql`
8. `0011_games_as_flag.sql`
9. `0012_season_champions_as_indicated_at.sql`
10. `0013_season_champions_as_temp_player.sql`

### Checklist de validação do banco
- [ ] Enums `app_role` e `game_status` existem.
- [ ] Tabelas: `profiles, user_roles, temporary_players, games, game_participations, link_requests, monthly_rankings, season_champions, expenses, as_pool`.
- [ ] `RLS` habilitado em todas as 10 tabelas.
- [ ] Função `public.has_role(uuid, app_role)` existe e é `SECURITY DEFINER`.
- [ ] Trigger `on_auth_user_created` em `auth.users`.
- [ ] Bucket `avatars` público + 3 policies.
- [ ] `monthly_rankings` tem `champion_temp_player_id` + índice único `(season_year, month)`.
- [ ] `expenses.author_name` existe.
- [ ] `link_requests` tem `reviewed_at`, `reviewed_by`, `status default 'pending'`.
- [ ] `profiles.lifetime_winnings` existe.
- [ ] `games.is_as_game` (bool) e `games.as_prize_amount` (numeric) existem.
- [ ] `season_champions.as_indicated_at` e `season_champions.as_temp_player_id` existem.

### Nada foi descartado
Nenhum SQL anterior foi marcado como obsoleto. Todos os arquivos `0005..0010` ainda devem ser aplicados.

---

## 7. Regras de negócio

**Pontuação (`src/lib/scoring.ts`):**
`pontos = round(PBT × FM) + KO`, com:
- **PBT**: tabela base por (colocação, total de jogadores 6 a 20). `<6` → coluna 6; `>20` → coluna 20.
- **FM** por total de ações (entries+rebuys de TODOS): ≤25→1.0 · ≤35→1.2 · ≤45→1.4 · ≤55→1.5 · ≤69→1.6 · ≥70→2.0.
- Arredondamento de PBT×FM: `frac ≥ 0.6` ↑ senão ↓. KO somado depois.

**XP (`src/lib/xpSystem.ts`):**
- 100 XP por partida concluída.
- +200 XP por pódio (1º/2º/3º).
- +100 XP adicional ao vencedor (= 300 no pódio do 1º).
- 10 XP por KO.
- `level = floor(xp/1000) + 1`. XP/conquistas acumulam entre temporadas.

**Conquistas (catálogo em `xpSystem.ts`, cálculo em `lib/achievements.ts`):**
| Code | XP | Repetível |
|---|---|---|
| aprendiz (10 partidas) | 500 | não |
| engajado (25) | 1000 | não |
| veterano (50) | 2000 | não |
| vencedor_rr (a cada 5 vitórias) | 1000 | sim |
| k_poker_rr (campeão do ano) | 5000 | sim |
| back_to_back_rr (2 torneios seguidos) | 500 | sim |
| as_poker_rr | 1000 | sim |
| vencedor_mes_rr | 500 | sim |
| consistente_rr (2 pódios em sequência) | 300 | sim |

**Financeiro:**
- Cada partida finalizada grava 3 rakes: `rake_as`, `rake_month`, `croupier_fee`.
- `prize_pool = total_pot − rake_as − rake_month − croupier_fee`.
- Encerrar mês: admin escolhe top 1 do `monthly_rankings`, soma `prize_amount` ao `lifetime_winnings` do vencedor, dispara `vencedor_mes_rr`.
- Encerrar temporada: top 1 do ranking sazonal vira K do Poker; admin pode também indicar Ás do Poker via Hall da Fama.
- Toda despesa em `expenses` debita `as_pool` (linha negativa correspondente).

**Vínculos:**
- `link_requests` permite que um usuário real reivindique um jogador temporário. Aprovação migra todas as participações (`game_participations.temp_player_id` → `user_id`) e remove o temporário.

**Restrições de admin (UI + RLS):**
- Criar/editar/finalizar partidas, criar despesas, encerrar mês/temporada, aprovar vínculos, indicar Ás do Poker, recalcular ranking, criar jogador temporário.

**Validações:**
- Frontend: `zod` em todos os formulários (Auth, CompleteProfile, EditProfile, Create/Edit Game, TempPlayer, Expense).
- Banco: `check ((user_id is not null) XOR (temp_player_id is not null))` em participações; `check (month between 1 and 12)`; `check (amount > 0)` em expenses; constraint XOR em monthly_rankings.

**Aba "Meses Vencidos" (Estatísticas):** lista por jogador todos os meses em que foi campeão, somando `prize_amount` ao lucro exibido.

---

## 8. Autenticação & Autorização

- **Login/Cadastro** (`pages/Auth.tsx`): email/senha + Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Sessão**: persistida em `localStorage`, refresh automático.
- **AuthContext** (`src/contexts/AuthContext.tsx`):
  - Registra `onAuthStateChange` antes de `getSession` (padrão Supabase recomendado).
  - Carrega `profiles` + `user_roles` para popular `profile` e `isAdmin`.
- **Detecção de admin**: query em `user_roles` por `role='admin'`. Nunca lida via metadados/profile.
- **Gating de rota**: `ProtectedRoute` (logado) e `ProtectedRoute adminOnly` (admin). Sem perfil completo → `/complete-profile`.
- **Segurança no banco**: RLS + `has_role` SECURITY DEFINER. Policies escritas para impedir que usuário comum modifique partidas/finanças/roles.

**Pontos a verificar antes de produção:** OAuth Redirect URLs no Supabase (ver §14), garantir que não há service role no cliente (verificado), revisar policies de UPDATE em `profiles` (atualmente só dono ou admin).

---

## 9. Integrações

| Integração | Onde | Variáveis | Notas |
|---|---|---|---|
| **Supabase (Auth/DB/Storage)** | `src/integrations/supabase/client.ts` + todos os hooks | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Hoje hardcoded. Migrar para env. |
| **Google OAuth** | `pages/Auth.tsx` | configurado no painel Supabase → Auth → Providers | Adicionar URL Vercel em "Redirect URLs". |
| **html2canvas** | `src/lib/reports.ts` | — | 100% client-side, funciona em qualquer host. |

Não há outras integrações externas (sem Stripe, sem email, sem analytics, sem edge functions deployadas).

---

## 10. Componentes principais

| Arquivo | Função |
|---|---|
| `AppLayout.tsx` | Header desktop sticky `glass-effect` + header mobile com FAB drawer (Sheet). |
| `ProtectedRoute.tsx` | Gate logado/admin/perfil completo. |
| `AvatarPicker.tsx` | Grid 5 fixos + upload bucket `avatars`. |
| `PlayerAvatar.tsx` | Renderiza avatar (fixo ou URL de upload). |
| `PlayerSelector.tsx` | Chips com seções Usuários/Temporários + sub-dialog para criar temp. |
| `CreateGameModal.tsx` / `GameDetailsModal.tsx` | CRUD de partidas + aba "Resultados" (admin) com inputs de KO, posição, rakes, fee, prêmio computado em tempo real. |
| `LinkTempPlayerDialog.tsx` | Solicitação de vínculo do user a um temp. |
| `InvalidGenderDialog.tsx` | Aviso "ESCOLHA UMA OPÇÃO VÁLIDA" + imagem `gender-warning.jpg`. |
| `Reports.tsx` | Templates ocultos para `html2canvas` (relatórios JPEG). |
| `Logo.tsx`, `NavLink.tsx`, `RankIndicators.tsx` | UI de marca/nav/medals. |

Todos os componentes consomem dados via hooks de `src/hooks/` e estilizam com tokens do `index.css` (sem cores hardcoded em componentes).

---

## 11. Hooks, serviços e utilitários

| Arquivo | Resumo |
|---|---|
| `useGames.ts` | `useProfiles`, `useTempPlayers`, `useGames`, `useCreateGame`, `useUpdateGame`, `useDeleteGame`, `useFinalizeGame` (faz `recalcRankingAndXp`), `useCreateTempPlayer`. |
| `useRanking.ts` | Agrega participações por season/month → `RankingRow[]`. Suporta exclusão de games. |
| `useFinance.ts` | `useExpenses`, `useCreateExpense` (insere em `expenses` + `as_pool`), `useAsPool`, `useMonthlyRankings`, `useCloseMonth`, `useSeasonChampions`, `useCloseSeason`, `useIndicateAs`. |
| `useHallOfFame.ts` | Computa rounds/months/yearChampions/asChampions a partir de `games`, `monthly_rankings`, `season_champions`. |
| `useLinkRequests.ts` | Lista solicitações + aprovar (migra participações, deleta temp, recalcula ranking) / rejeitar. |
| `usePlayerStats.ts` | Stats completas de um jogador, opcionalmente filtradas por temporada. |
| `lib/scoring.ts` | `calcTournamentPoints({ totalPlayers, position, totalActions, koPoints })`. |
| `lib/xpSystem.ts` | `xpForGame()`, catálogo `ACHIEVEMENTS`. |
| `lib/achievements.ts` | `computeAchievements(...)` decide quais conquistas/contagens o jogador tem. |
| `lib/recalc.ts` | `recalcRankingAndXp(gameId)` — chamado após finalizar partida ou aprovar vínculo. |
| `lib/reports.ts` | `generateGameReport`, `generateRankingReport`, `generateMonthlyRankingReport` via `html2canvas`. |
| `lib/avatars.ts` | `FIXED_AVATARS` (id → asset). |
| `lib/db-types.ts` | Interfaces TS espelhando o schema. **Sincronizar com qualquer mudança SQL.** |
| `lib/format.ts` | `formatBRL`, `formatDateTime`, `formatPoints`. |

---

## 12. Fluxos passo a passo

**Login com email**
1. `Auth.tsx` → `supabase.auth.signInWithPassword`.
2. `AuthContext.onAuthStateChange` → carrega `profiles` + `user_roles`.
3. Se `profile_completed=false` → redireciona para `/complete-profile`.

**Cadastro**
1. `Auth.tsx` → `supabase.auth.signUp`.
2. Trigger `handle_new_user` cria `profiles` (incompleto) e `user_roles(user)`.
3. Usuário é redirecionado para `/complete-profile` (wizard com nickname, full_name, phone, gender, AvatarPicker).
4. Update em `profiles` setando `profile_completed=true`.

**Criar jogador temporário** (admin) → `TempPlayerDialog` → INSERT em `temporary_players`.

**Criar/Editar Partida** (admin) → `CreateGameModal`/`EditGameModal` → INSERT/UPDATE em `games` + INSERT em `game_participations` (uma por jogador).

**Finalizar partida** (admin)
1. `GameDetailsModal` aba Resultados: preencher entries, rebuys, position, KO, e os 3 rakes/fee.
2. `useFinalizeGame`:
   - UPDATE participations (position, ko_points, total_invested, prize_won).
   - UPDATE games (status='finished', rakes, prize_pool, total_pot).
   - INSERT em `as_pool` (+rake_as).
   - `recalcRankingAndXp(gameId)`: recalcula `ranking_points`, `is_winner`, `xp_earned`; agrega XP em `profiles.xp` e atualiza `profiles.level`.

**Encerrar mês** (admin, `/admin/financeiro`) → `useCloseMonth` → UPSERT em `monthly_rankings` (con `season_year, month`) com `champion_*_id` + `prize_amount`. Se for user, soma ao `lifetime_winnings`. Concede conquista `vencedor_mes_rr`.

**Encerrar temporada** → `useCloseSeason` → INSERT em `season_champions(year, k_user_id)` (+ `as_user_id` se já indicado). Concede `k_poker_rr`.

**Solicitar vínculo** (user) → `LinkTempPlayerDialog` → INSERT em `link_requests(status=pending, user_id, temp_player_id)`.

**Aprovar vínculo** (admin, `/admin/vinculos`) → UPDATE participations (`temp_player_id` → `user_id`), DELETE temp, UPDATE link_requests (approved, reviewed_at, reviewed_by), recalcula ranking.

**Adicionar despesa** (admin) → INSERT em `expenses` + INSERT em `as_pool` (`-amount`, descrição "Despesa: ...").

**Indicar Ás do Poker** (admin, Hall da Fama) → UPSERT em `season_champions(year, as_user_id, as_indicated_at=now())`.

---

## 13. Estado atual

**Funcionando:**
- Auth completo, gating, completar perfil.
- CRUD de partidas, jogadores temporários, participações.
- Ranking sazonal e mensal, Dashboard "Ranking do Mês" (com fallback para o último mês com partidas).
- Hall da Fama 4 seções.
- Financeiro (despesas, encerrar mês/temporada, ledger Ás).
- Estatísticas com aba "Meses Vencidos" e lucro acumulado.
- Solicitação/aprovação de vínculo.
- Conquistas (RR com contador) e XP/level.
- Relatórios JPEG.
- AvatarPicker com 5 fixos + upload.
- Validação de gênero "Outro" com diálogo.

**Débitos técnicos / atenção:**
- URL/anon key hardcoded em `client.ts` — **trocar para env antes do deploy Vercel**.
- Não há edge functions: lógica de finalize/close roda no client. Aceitável porque protegida por RLS, mas para auditoria seria ideal mover para Edge Functions.
- Não há testes além de `src/test/example.test.ts`.
- `mockData.ts` não é usado em produção, pode ser removido.
- `recalcRankingAndXp` faz várias chamadas individuais; em ligas grandes pode ficar lento.

---

## 14. Deploy na Vercel

**Framework preset:** Vite.
**Build command:** `npm run build`
**Output directory:** `dist`
**Install command:** `npm install` (ou pnpm/bun, se preferir).
**Node version:** 20.x.

**Variáveis de ambiente (Project → Settings → Environment Variables):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(Após adicioná-las, refatore `client.ts` para `import.meta.env` — ver §4.)

**SPA fallback:** Vercel detecta Vite e já cuida. Caso refresh em deep-link dê 404, adicione `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Supabase → Auth → URL Configuration:**
- `Site URL`: `https://<seu-projeto>.vercel.app`
- `Redirect URLs`: `https://<seu-projeto>.vercel.app/**` + qualquer domínio custom + `http://localhost:5173/**` para dev.

**Google OAuth (Supabase → Providers → Google):** adicionar Authorized Redirect URI no Google Cloud Console:
`https://<ref>.supabase.co/auth/v1/callback`.

**Checklist pré-deploy:**
- [ ] `.env.local` populado e `client.ts` lendo de env.
- [ ] Build local `npm run build` ok.
- [ ] Variáveis cadastradas na Vercel.
- [ ] Site URL/Redirect URLs no Supabase.
- [ ] Bucket `avatars` público.
- [ ] Conferir checklist da §6.
- [ ] Smoke test: signup, login Google, criar partida, finalizar, encerrar mês.

---

## 15. Segurança & Produção

- **Frontend usa apenas `anon key`** (verificado: `src/integrations/supabase/client.ts`).
- **Service role key não aparece no repo** (faça `rg "service_role"` antes do push para confirmar).
- **RLS habilitada em todas as tabelas públicas.** Policies seguem padrão "leitura pública + escrita admin via has_role"; `profiles` permite UPDATE pelo dono; `link_requests` permite INSERT pelo próprio user.
- **Privilege escalation**: roles ficam em `user_roles` separada, com `has_role` SECURITY DEFINER.
- **Validações**: existem em ambos os lados (zod no front, checks/RLS no banco). Nenhuma regra crítica vive só no front.
- **Riscos a verificar antes de produção:**
  - Confirmar que `user_roles` não permite INSERT/UPDATE para non-admin (só admin via policy).
  - Revisar policies de `monthly_rankings`/`season_champions`/`expenses`/`as_pool` (todas devem exigir admin).
  - Habilitar Email Confirmation se desejado em Auth → Settings.
  - Considerar mover `useFinalizeGame`/`useCloseMonth`/`useCloseSeason` para Edge Functions (não obrigatório, mas mais auditável).

---

## 16. O que entregar ao novo desenvolvedor

1. Código-fonte completo de `src/`, `public/`, `supabase-sql/`.
2. Configs raiz: `package.json`, `package-lock.json`/`pnpm-lock.yaml`/`bun.lockb`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`, `components.json`, `index.html`, `.gitignore`.
3. `.env.example` (modelo da §4).
4. **Este arquivo `MIGRATION_SNAPSHOT.md`**.
5. Pasta `supabase-sql/` (todos os 6 arquivos `0005..0010` + Schema base da §6.0 — você pode salvá-lo como `0000_base_schema.sql`).
6. Acesso de owner ao projeto Supabase (URL + ambas as keys, mas a service role só para o admin).
7. Acesso de owner ao Google Cloud (OAuth client) caso vá manter Google login.

Não há arquivos especiais gerados pelo Lovable que precisem ser exportados além do código (nenhum `.lovable/` é necessário em runtime, exceto `.lovable/plan.md` que é só documentação interna — opcional).

---

## 17. Resumo executivo de migração

**Do Lovable:** baixar todo o repositório (botão GitHub na UI do Lovable, ou exportar zip). Garantir que `supabase-sql/` veio junto.

**No Supabase:**
- Pode-se manter o mesmo projeto (já contém todos os dados). Apenas confira o checklist da §6.
- Se for criar novo projeto: rode os SQL na ordem da §6 e re-importe os dados (export por tabela → import).
- Atualize Site URL e Redirect URLs com o domínio Vercel.

**Na Vercel:**
- Importar repo do GitHub.
- Setar variáveis de ambiente.
- Deploy (build automático).
- Adicionar domínio custom se houver.

**Riscos principais da migração:**
1. **OAuth Google** quebrar se as Redirect URLs não forem atualizadas.
2. **`client.ts` hardcoded** — o app continua funcionando, mas você não consegue alternar entre staging/prod sem editar código.
3. **Sem edge functions**: se você mudar nicknames/`auth.users` à mão no Supabase, ranking precisa de recálculo manual via UI admin.
4. **RLS**: qualquer alteração em policies pode bloquear escrita silenciosamente — sempre testar com user comum + admin.

**Ordem recomendada:**
1. Criar repo GitHub a partir do código exportado.
2. Rodar `npm install` + `npm run dev` localmente apontando para o Supabase atual (ainda hardcoded).
3. Refatorar `client.ts` para env e criar `.env.local`.
4. Conectar repo na Vercel, setar envs, deploy de preview.
5. Atualizar Supabase Site URL / Redirect URLs com a URL de preview.
6. Smoke test completo (lista da §14).
7. Promover para produção / adicionar domínio..

---

## 18. Apêndice — arquivos estruturais

### `src/integrations/supabase/client.ts` (atual)
```ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sgbuvlqmbdtfojmwwwyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...<anon>...";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
});
```

### Versão recomendada para Vercel
```ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
});
```

### Tipos espelho do banco
Ver `src/lib/db-types.ts` (já no repositório) — interfaces `DbProfile`, `DbTempPlayer`, `DbGame`, `DbParticipation`, `GameWithParticipants`, `GameStatus`. Para finanças, ver `src/hooks/useFinance.ts` (`DbExpense`, `DbAsPoolEntry`, `DbMonthlyRanking`, `DbSeasonChampion`).

### `App.tsx`
Já listado na §1. Sem alterações necessárias para deploy.

---

**FIM.** Qualquer alteração futura no schema deve gerar um novo arquivo `supabase-sql/00NN_*.sql` + sincronizar `db-types.ts`/hooks correspondentes + atualizar §6 e §13 deste documento.
