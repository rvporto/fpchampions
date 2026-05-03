import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbProfile, DbTempPlayer } from "@/lib/db-types";
import { recalcRankingAndXp } from "@/lib/recalc";

export type LinkRequestStatus = "pending" | "approved" | "rejected";

export interface DbLinkRequest {
  id: string;
  user_id: string;
  temp_player_id: string;
  status: LinkRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface LinkRequestRow extends DbLinkRequest {
  profile?: Pick<DbProfile, "id" | "nickname" | "avatar_url"> | null;
  temp_player?: Pick<DbTempPlayer, "id" | "nickname" | "avatar_url"> | null;
}

export function useLinkRequests(status: LinkRequestStatus | "all" = "pending") {
  return useQuery({
    queryKey: ["link_requests", status],
    queryFn: async (): Promise<LinkRequestRow[]> => {
      let q = supabase.from("link_requests").select("*").order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as DbLinkRequest[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const tempIds = [...new Set(rows.map((r) => r.temp_player_id))];
      const [{ data: profs }, { data: temps }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, nickname, avatar_url").in("id", userIds)
          : Promise.resolve({ data: [] as Pick<DbProfile, "id" | "nickname" | "avatar_url">[] }),
        tempIds.length
          ? supabase.from("temporary_players").select("id, nickname, avatar_url").in("id", tempIds)
          : Promise.resolve({ data: [] as Pick<DbTempPlayer, "id" | "nickname" | "avatar_url">[] }),
      ]);
      const pm = new Map(((profs ?? []) as Pick<DbProfile, "id" | "nickname" | "avatar_url">[]).map((p) => [p.id, p]));
      const tm = new Map(((temps ?? []) as Pick<DbTempPlayer, "id" | "nickname" | "avatar_url">[]).map((p) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        profile: pm.get(r.user_id) ?? null,
        temp_player: tm.get(r.temp_player_id) ?? null,
      }));
    },
  });
}

export function useCreateLinkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; temp_player_id: string }) => {
      const { data, error } = await supabase
        .from("link_requests")
        .insert({ user_id: input.user_id, temp_player_id: input.temp_player_id, status: "pending" })
        .select()
        .single();
      if (error) throw error;
      return data as DbLinkRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["link_requests"] }),
  });
}

// Aprova: migra game_participations do temp para o user, marca request como approved e recalcula XP histórico.
export function useApproveLinkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: DbLinkRequest) => {
      // 1) Migrar participações
      const { error: e1 } = await supabase
        .from("game_participations")
        .update({ user_id: req.user_id, temp_player_id: null })
        .eq("temp_player_id", req.temp_player_id);
      if (e1) throw e1;

      // 2) Marcar request
      const { error: e2 } = await supabase
        .from("link_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", req.id);
      if (e2) throw e2;

      // 3) Remove o jogador temporário e contabiliza partidas já existentes no XP/nível do usuário
      const { error: e3 } = await supabase.from("temporary_players").delete().eq("id", req.temp_player_id);
      if (e3) throw e3;
      await recalcRankingAndXp();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["link_requests"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
  });
}

export function useRejectLinkRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("link_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["link_requests"] }),
  });
}

// Admin: vincula diretamente um temp_player a um user e apaga o temp
export function useMergeTempIntoUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; temp_player_id: string }) => {
      const { error: e1 } = await supabase
        .from("game_participations")
        .update({ user_id: input.user_id, temp_player_id: null })
        .eq("temp_player_id", input.temp_player_id);
      if (e1) throw e1;
      // marca quaisquer link_requests deste temp como aprovadas
      await supabase
        .from("link_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("temp_player_id", input.temp_player_id)
        .eq("status", "pending");
      const { error: e3 } = await supabase
        .from("temporary_players")
        .delete()
        .eq("id", input.temp_player_id);
      if (e3) throw e3;
      await recalcRankingAndXp();
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
