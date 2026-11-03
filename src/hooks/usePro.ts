import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { calculateProStatus } from "@/lib/proStatus";

export interface ProStatus {
  isPro: boolean;
  expiresAt: string | null;
  daysLeft: number;
  isLifetime: boolean;
}

export const useProStatus = () => {
  const { user } = useAuth();
  return useQuery<ProStatus>({
    queryKey: ["pro-status", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return calculateProStatus(null);
      const { data, error } = await supabase
        .from("pro_subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return calculateProStatus(data?.expires_at ?? null);
    },
  });
};

export const useInvalidatePro = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["pro-status"] });
};
