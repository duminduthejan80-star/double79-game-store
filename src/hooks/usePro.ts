import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ProStatus {
  isPro: boolean;
  expiresAt: string | null;
  daysLeft: number;
}

export const useProStatus = () => {
  const { user } = useAuth();
  return useQuery<ProStatus>({
    queryKey: ["pro-status", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pro_subscriptions")
        .select("expires_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const exp = data?.expires_at ?? null;
      const active = !!exp && new Date(exp).getTime() > Date.now();
      return {
        isPro: active,
        expiresAt: exp,
        daysLeft: active ? Math.max(0, Math.ceil((new Date(exp!).getTime() - Date.now()) / 86400000)) : 0,
      };
    },
  });
};

export const useInvalidatePro = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["pro-status"] });
};
