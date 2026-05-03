-- Adiciona coluna de premiação por participante
alter table public.participations
  add column if not exists prize_won numeric(12,2) not null default 0;
