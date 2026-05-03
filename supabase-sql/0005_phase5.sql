-- ============================================================
-- Família Poker Champions — Fase 5
-- Rodar uma única vez no SQL Editor do Supabase.
-- ============================================================

-- 1) DESPESAS (debitam do Ás)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
drop policy if exists "expenses_read_all" on public.expenses;
create policy "expenses_read_all" on public.expenses for select using (true);
drop policy if exists "expenses_admin_write" on public.expenses;
create policy "expenses_admin_write" on public.expenses
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 2) LEDGER DO ÁS (entradas e saídas)
create table if not exists public.as_pool (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete set null,
  expense_id uuid references public.expenses(id) on delete set null,
  description text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
alter table public.as_pool enable row level security;
drop policy if exists "as_pool_read_all" on public.as_pool;
create policy "as_pool_read_all" on public.as_pool for select using (true);
drop policy if exists "as_pool_admin_write" on public.as_pool;
create policy "as_pool_admin_write" on public.as_pool
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 3) RANKING MENSAL (campeão do mês após encerramento)
create table if not exists public.monthly_rankings (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  month int not null check (month between 1 and 12),
  champion_user_id uuid references public.profiles(id) on delete set null,
  prize_amount numeric(12,2) not null default 0,
  closed_at timestamptz not null default now(),
  unique (season_year, month)
);
alter table public.monthly_rankings enable row level security;
drop policy if exists "monthly_read_all" on public.monthly_rankings;
create policy "monthly_read_all" on public.monthly_rankings for select using (true);
drop policy if exists "monthly_admin_write" on public.monthly_rankings;
create policy "monthly_admin_write" on public.monthly_rankings
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 4) CAMPEÕES DE TEMPORADA (K do Poker + Ás do Poker)
create table if not exists public.season_champions (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  k_user_id uuid references public.profiles(id) on delete set null,
  as_user_id uuid references public.profiles(id) on delete set null,
  closed_at timestamptz not null default now()
);
alter table public.season_champions enable row level security;
drop policy if exists "champions_read_all" on public.season_champions;
create policy "champions_read_all" on public.season_champions for select using (true);
drop policy if exists "champions_admin_write" on public.season_champions;
create policy "champions_admin_write" on public.season_champions
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 5) ÁS INDICADO POR ANO (separado para permitir indicação avulsa via Hall)
alter table public.season_champions
  add column if not exists as_indicated_at timestamptz;

-- 6) Coluna de prêmios acumulados no profile
alter table public.profiles
  add column if not exists lifetime_winnings numeric(12,2) not null default 0;

-- ============================================================
-- Pronto. Recarregue o app.
-- ============================================================
