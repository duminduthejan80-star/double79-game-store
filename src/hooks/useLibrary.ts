import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const useLibrary = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["library", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_library")
        .select("game_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((r) => r.game_id);
    },
  });
};

export const useAddToLibrary = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (gameId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_library")
        .insert({ user_id: user.id, game_id: gameId });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });
};

export const useRemoveFromLibrary = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (gameId: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_library")
        .delete()
        .eq("user_id", user.id)
        .eq("game_id", gameId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });
};
