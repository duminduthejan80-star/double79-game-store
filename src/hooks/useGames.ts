import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Game, GameInput } from "@/types/game";

export const useGames = () =>
  useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Game[];
    },
  });

export const useGame = (id: string | undefined) =>
  useQuery({
    queryKey: ["game", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Game | null;
    },
  });

export const useUpsertGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GameInput & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("games").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("games").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      qc.invalidateQueries({ queryKey: ["game"] });
    },
  });
};

export const useDeleteGame = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["games"] }),
  });
};
