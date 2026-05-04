-- ============================================================
-- Suporte a vencedor temporário no encerramento mensal.
-- Rodar uma única vez no SQL Editor do Supabase.
-- ============================================================

alter table public.monthly_rankings
  add column if not exists champion_temp_player_id uuid references public.temporary_players(id) on delete set null;

alter table public.monthly_rankings
  alter column champion_user_id drop not null;
