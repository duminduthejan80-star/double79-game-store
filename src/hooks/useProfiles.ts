import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
  is_pro: boolean;
  library_count: number;
  download_count: number;
}

export interface PublicProfileGame {
  game_id: string;
  title: string;
  image_url: string | null;
  kind: "library" | "download";
}

const db = supabase as any;

export const usePublicProfiles = () =>
  useQuery<PublicProfile[]>({
    queryKey: ["public-profiles"],
    queryFn: async () => {
      const { data, error } = await db.rpc("public_profiles");
      if (error) throw error;
      return (data ?? []) as PublicProfile[];
    },
  });

export const usePublicProfileGames = (userId?: string) =>
  useQuery<PublicProfileGame[]>({
    queryKey: ["public-profile-games", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db.rpc("public_profile_games", { _user_id: userId });
      if (error) throw error;
      return (data ?? []) as PublicProfileGame[];
    },
  });
