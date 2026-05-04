-- ============================================================
-- Correção do ON CONFLICT no encerramento mensal.
-- Rodar uma única vez no SQL Editor do Supabase.
-- ============================================================

create unique index if not exists monthly_rankings_season_year_month_idx
  on public.monthly_rankings (season_year, month);
