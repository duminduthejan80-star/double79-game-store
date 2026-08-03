import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDownloadCounts = () =>
  useQuery({
    queryKey: ["download-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("game_download_counts");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { game_id: string; downloads: number }) => {
        map[r.game_id] = Number(r.downloads ?? 0);
      });
      return map;
    },
    staleTime: 60_000,
  });
