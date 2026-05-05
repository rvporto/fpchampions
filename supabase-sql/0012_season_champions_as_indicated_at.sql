-- Adiciona coluna que registra quando o ÁS do Poker foi indicado
ALTER TABLE public.season_champions
ADD COLUMN IF NOT EXISTS as_indicated_at TIMESTAMP WITH TIME ZONE;
