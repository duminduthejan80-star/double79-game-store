import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "7997";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const code = req.headers.get("x-admin-code");
  if (code !== ADMIN_CODE) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [profilesRes, libRes, dlRes, gamesRes, gdRes] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, avatar_url, created_at"),
    supabase.from("user_library").select("user_id, game_id, created_at, games(title)").limit(50000),
    supabase.from("download_events").select("user_id, game_id, game_title, created_at").order("created_at", { ascending: false }).limit(50000),
    supabase.from("game_downloads").select("user_id, game_id, game_title, downloaded_at").order("downloaded_at", { ascending: false }).limit(50000),
    supabase.from("games").select("id, title").limit(50000),
  ]);

  const err = profilesRes.error || libRes.error || dlRes.error || gamesRes.error || gdRes.error;
  if (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allDownloads = [
    ...(dlRes.data ?? []).map((d) => ({
      user_id: d.user_id,
      game_id: d.game_id,
      game_title: d.game_title,
      created_at: d.created_at,
    })),
    ...(gdRes.data ?? []).map((d) => ({
      user_id: d.user_id,
      game_id: d.game_id,
      game_title: d.game_title,
      created_at: d.downloaded_at,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const gameMap = new Map((gamesRes.data ?? []).map((g) => [String(g.id), g.title as string]));
  console.log("games loaded", gameMap.size);

  const users = (profilesRes.data ?? []).map((p) => {
    const libs = (libRes.data ?? []).filter((l) => l.user_id === p.id);
    const seen = new Set<string>();
    const dls = allDownloads.filter((d) => {
      if (d.user_id !== p.id) return false;
      const k = `${d.game_id}|${d.created_at}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      joined_at: p.created_at,
      library_count: libs.length,
      download_count: dls.length,
      library: libs.map((l) => ({
        game_id: l.game_id,
        title: (l as any).games?.title ?? gameMap.get(String(l.game_id)) ?? "Unknown",
        added_at: l.created_at,
      })),
      downloads: dls.map((d) => ({
        game_id: d.game_id,
        title: d.game_title ?? gameMap.get(String(d.game_id)) ?? "Unknown",
        at: d.created_at,
      })),
    };
  });

  return new Response(
    JSON.stringify({
      total_users: users.length,
      total_downloads: allDownloads.length,
      users,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
