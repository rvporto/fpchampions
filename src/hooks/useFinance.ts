import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbExpense {
  id: string;
  description: string;
  amount: number;
  created_by: string | null;
  author_name: string | null;
  created_at: string;
}

export interface DbAsPoolEntry {
  id: string;
  game_id: string | null;
  expense_id: string | null;
  description: string | null;
  amount: number;
  created_at: string;
}

export interface DbMonthlyRanking {
  id: string;
  season_year: number;
  month: number;
  champion_user_id: string | null;
  champion_temp_player_id: string | null;
  prize_amount: number;
  closed_at: string;
}

export interface DbSeasonChampion {
  id: string;
  year: number;
  k_user_id: string | null;
  as_user_id: string | null;
  as_temp_player_id: string | null;
  closed_at: string;
  as_indicated_at: string | null;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbExpense[];
    },
  });
}

export function useAsPool() {
  return useQuery({
    queryKey: ["as_pool"],
    queryFn: async () => {
      const { data, error } = await supabase.from("as_pool").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbAsPoolEntry[];
    },
  });
}

export function useMonthlyRankings(year: number) {
  return useQuery({
    queryKey: ["monthly_rankings", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_rankings")
        .select("*")
        .eq("season_year", year);
      if (error) throw error;
      return (data ?? []) as DbMonthlyRanking[];
    },
  });
}

export function useAllMonthlyRankings() {
  return useQuery({
    queryKey: ["monthly_rankings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("monthly_rankings").select("*");
      if (error) throw error;
      return (data ?? []) as DbMonthlyRanking[];
    },
  });
}

export function useSeasonChampions() {
  return useQuery({
    queryKey: ["season_champions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("season_champions").select("*").order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbSeasonChampion[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { description: string; amount: number; author_name?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: exp, error } = await supabase
        .from("expenses")
        .insert({
          description: input.description.trim(),
          amount: input.amount,
          author_name: input.author_name ?? null,
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // débito no as_pool
      const { error: e2 } = await supabase.from("as_pool").insert({
        expense_id: (exp as any).id,
        description: `Despesa: ${input.description}`,
        amount: -Math.abs(input.amount),
      });
      if (e2) throw e2;
      return exp as DbExpense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["as_pool"] });
    },
  });
}

export function useCloseMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      year: number;
      month: number;
      champion_user_id: string | null;
      champion_temp_player_id?: string | null;
      prize_amount: number;
    }) => {
      const { error } = await supabase
        .from("monthly_rankings")
        .upsert(
          {
            season_year: input.year,
            month: input.month,
            champion_user_id: input.champion_user_id,
            champion_temp_player_id: input.champion_temp_player_id ?? null,
            prize_amount: input.prize_amount,
            closed_at: new Date().toISOString(),
          },
          { onConflict: "season_year,month" }
        );
      if (error) throw error;
      // adiciona ao lifetime_winnings apenas se já houver usuário cadastrado
      if (input.champion_user_id && input.prize_amount > 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("lifetime_winnings")
          .eq("id", input.champion_user_id)
          .maybeSingle();
        const cur = Number((prof as any)?.lifetime_winnings || 0);
        await supabase
          .from("profiles")
          .update({ lifetime_winnings: cur + input.prize_amount })
          .eq("id", input.champion_user_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_rankings"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function useCloseSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { year: number; k_user_id: string | null; as_user_id?: string | null; as_temp_player_id?: string | null }) => {
      const { error } = await supabase
        .from("season_champions")
        .upsert(
          {
            year: input.year,
            season_year: input.year,
            k_user_id: input.k_user_id,
            as_user_id: input.as_user_id ?? null,
            as_temp_player_id: input.as_temp_player_id ?? null,
            closed_at: new Date().toISOString(),
            as_indicated_at: input.as_user_id || input.as_temp_player_id ? new Date().toISOString() : null,
          } as any,
          { onConflict: "year" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["season_champions"] }),
  });
}

export function useIndicateAs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { year: number; as_user_id?: string | null; as_temp_player_id?: string | null }) => {
      const { data: existing } = await supabase
        .from("season_champions")
        .select("*")
        .eq("year", input.year)
        .maybeSingle();
      const { error } = await supabase
        .from("season_champions")
        .upsert(
          {
            year: input.year,
            season_year: input.year,
            k_user_id: (existing as any)?.k_user_id ?? null,
            as_user_id: input.as_user_id ?? null,
            as_temp_player_id: input.as_temp_player_id ?? null,
            closed_at: (existing as any)?.closed_at ?? new Date().toISOString(),
            as_indicated_at: new Date().toISOString(),
          } as any,
          { onConflict: "year" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["season_champions"] }),
  });
}
