import { supabase } from "@/integrations/supabase/client";

/**
 * Chama a Edge Function recalc-ranking no servidor.
 * Roda com service_role — bypassa RLS, sem problemas de constraint.
 */
export async function recalcRankingAndXp(): Promise<{ games: number; participations: number; profiles: number }> {
  const { data, error } = await supabase.functions.invoke("recalc-ranking");
  if (error) throw error;
  return data;
}
