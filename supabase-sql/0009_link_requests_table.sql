-- Garante a tabela link_requests com todas as colunas usadas pelo app.
create table if not exists public.link_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  temp_player_id uuid not null references public.temporary_players(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

-- Caso a tabela já exista sem essas colunas
alter table public.link_requests add column if not exists reviewed_at timestamptz;
alter table public.link_requests add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.link_requests add column if not exists status text not null default 'pending';
alter table public.link_requests add column if not exists created_at timestamptz not null default now();

alter table public.link_requests enable row level security;

drop policy if exists "link_requests_read_all" on public.link_requests;
create policy "link_requests_read_all" on public.link_requests for select using (true);

drop policy if exists "link_requests_user_insert" on public.link_requests;
create policy "link_requests_user_insert" on public.link_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "link_requests_admin_write" on public.link_requests;
create policy "link_requests_admin_write" on public.link_requests
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
