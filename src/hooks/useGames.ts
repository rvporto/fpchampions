import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbGame, DbParticipation, DbProfile, DbTempPlayer, GameWithParticipants, GameStatus } from "@/lib/db-types";

// ---------------- PROFILES & TEMP PLAYERS ----------------

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_completed", true)
        .order("nickname");
      if (error) throw error;
      return (data ?? []) as DbProfile[];
    },
  });
}

export function useTempPlayers() {
  return useQuery({
    queryKey: ["temp_players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("temporary_players").select("*").order("nickname");
      if (error) throw error;
      return (data ?? []) as DbTempPlayer[];
    },
  });
}

export function useCreateTempPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nickname: string; full_name?: string; gender?: string; avatar_url?: string }) => {
      const { data, error } = await supabase
        .from("temporary_players")
        .insert({
          nickname: input.nickname.trim(),
          full_name: input.full_name?.trim() || null,
          gender: (input.gender as any) || null,
          avatar_url: input.avatar_url || "a1",
        })
        .select()
        .single();
      if (error) throw error;
      return data as DbTempPlayer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["temp_players"] }),
  });
}

// ---------------- GAMES ----------------

export function useGames() {
  return useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbGame[];
    },
  });
}

export function useGame(id: string | null) {
  return useQuery({
    queryKey: ["game", id],
    enabled: !!id,
    queryFn: async (): Promise<GameWithParticipants | null> => {
      if (!id) return null;
      const { data: game, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!game) return null;

      const { data: parts, error: e2 } = await supabase
        .from("game_participations")
        .select("*")
        .eq("game_id", id);
      if (e2) throw e2;

      const userIds = [...new Set((parts ?? []).map((p) => p.user_id).filter(Boolean) as string[])];
      const tempIds = [...new Set((parts ?? []).map((p) => p.temp_player_id).filter(Boolean) as string[])];

      const [{ data: profs }, { data: temps }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("*").in("id", userIds)
          : Promise.resolve({ data: [] as DbProfile[] }),
        tempIds.length
          ? supabase.from("temporary_players").select("*").in("id", tempIds)
          : Promise.resolve({ data: [] as DbTempPlayer[] }),
      ]);

      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p as DbProfile]));
      const tempMap = new Map((temps ?? []).map((p: any) => [p.id, p as DbTempPlayer]));

      return {
        ...(game as DbGame),
        participations: (parts as DbParticipation[]).map((p) => ({
          ...p,
          profile: p.user_id ? profMap.get(p.user_id) ?? null : null,
          temp_player: p.temp_player_id ? tempMap.get(p.temp_player_id) ?? null : null,
        })),
      };
    },
  });
}

export interface CreateGameInput {
  name: string;
  date: string;
  season_year: number;
  month: number;
  buy_in: number;
  rebuy_value: number;
  description?: string;
  participants: { user_id?: string | null; temp_player_id?: string | null }[];
}

export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGameInput) => {
      // garantir season existe
      await supabase.from("seasons").upsert({ year: input.season_year }, { onConflict: "year" });

      const { data: game, error } = await supabase
        .from("games")
        .insert({
          name: input.name.trim(),
          date: input.date,
          season_year: input.season_year,
          month: input.month,
          buy_in: input.buy_in,
          rebuy_value: input.rebuy_value,
          description: input.description?.trim() || null,
          status: "scheduled" as GameStatus,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.participants.length > 0) {
        const rows = input.participants.map((p) => ({
          game_id: (game as DbGame).id,
          user_id: p.user_id ?? null,
          temp_player_id: p.temp_player_id ?? null,
          entries: 1,
          rebuys: 0,
          total_invested: input.buy_in,
        }));
        const { error: e2 } = await supabase.from("game_participations").insert(rows);
        if (e2) throw e2;
      }
      return game as DbGame;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["games"] }),
  });
}

export function useDeleteGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["games"] }),
  });
}

// Atualiza linhas de participação (entries, rebuys, position, ko_points, ranking_points, xp_earned)
export function useUpdateParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DbParticipation> }) => {
      const { error } = await supabase.from("game_participations").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["game"] });
    },
  });
}

export function useAddParticipations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { game_id: string; buy_in: number; participants: { user_id?: string | null; temp_player_id?: string | null }[] }) => {
      if (!input.participants.length) return;
      const rows = input.participants.map((p) => ({
        game_id: input.game_id,
        user_id: p.user_id ?? null,
        temp_player_id: p.temp_player_id ?? null,
        entries: 1,
        rebuys: 0,
        total_invested: input.buy_in,
      }));
      const { error } = await supabase.from("game_participations").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["game"] }),
  });
}

export function useRemoveParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("game_participations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["game"] }),
  });
}

// Atualiza dados do game (nome, data, rakes...)
export function useUpdateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<DbGame> }) => {
      const { error } = await supabase.from("games").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game"] });
    },
  });
}
