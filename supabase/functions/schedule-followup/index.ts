import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const gameId = body?.game_id ?? null;
    const gameTitle = String(body?.game_title ?? "").trim();
    if (!gameTitle) {
      return new Response(JSON.stringify({ error: "game_title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("phone_e164, phone_verified").eq("id", userId).maybeSingle();
    if (!profile?.phone_verified || !profile.phone_e164) {
      return new Response(JSON.stringify({ error: "Phone not verified" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sendAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await admin.from("scheduled_messages").insert({
      user_id: userId,
      phone_e164: profile.phone_e164,
      game_id: gameId,
      game_title: gameTitle,
      send_at: sendAt,
      status: "pending",
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, send_at: sendAt }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("schedule-followup error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
