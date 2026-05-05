ALTER TABLE public.season_champions
  ADD COLUMN IF NOT EXISTS as_temp_player_id uuid REFERENCES public.temporary_players(id) ON DELETE SET NULL;
