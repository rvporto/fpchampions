-- Adiciona flag e valor para indicar partida do Ás do Poker
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_as_game boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS as_prize_amount numeric NOT NULL DEFAULT 0;
