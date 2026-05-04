-- ============================================================
-- Suporte a vencedor temporário no encerramento mensal.
-- Rodar uma única vez no SQL Editor do Supabase.
-- ============================================================

alter table public.monthly_rankings
  add column if not exists champion_temp_player_id uuid references public.temporary_players(id) on delete set null;

alter table public.monthly_rankings
  alter column champion_user_id drop not null;

alter table public.monthly_rankings
  drop constraint if exists monthly_rankings_check;

alter table public.monthly_rankings
  add constraint monthly_rankings_check
  check (
    (champion_user_id is not null and champion_temp_player_id is null)
    or
    (champion_user_id is null and champion_temp_player_id is not null)
  );
