import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplate } from "../_shared/whatsapp.ts";

// Runs on a schedule: 2 days after a game download (free or Pro), asks the
// player on WhatsApp whether the game works and for their feedback.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const due = new Date(now - 48 * 3600_000).toISOString();
  const oldest = new Date(now - 5 * 24 * 3600_000).toISOString();

  const { data: rows, error } = await admin.from("game_downloads")
    .select("id,user_id,user_name,game_id,game_title,downloaded_at")
    .is("whatsapp_followup_status", null)
    .lte("downloaded_at", due).gte("downloaded_at", oldest)
    .order("downloaded_at").limit(100);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  let sent = 0, skipped = 0, failed = 0;
  const done = new Set<string>();
  for (const r of rows ?? []) {
    const key = `${r.user_id}:${r.game_id}`;
    const mark = (status: string, err: string | null = null) =>
      admin.from("game_downloads").update({
        whatsapp_followup_status: status, whatsapp_followup_at: new Date().toISOString(), whatsapp_followup_error: err,
      }).eq("id", r.id);

    // Only one message per player per game
    const { count } = await admin.from("game_downloads").select("id", { count: "exact", head: true })
      .eq("user_id", r.user_id).eq("game_id", r.game_id).eq("whatsapp_followup_status", "sent");
    if (done.has(key) || (count ?? 0) > 0) { await mark("duplicate"); skipped++; continue; }

    const { data: p } = await admin.from("profiles").select("phone,phone_verified,display_name")
      .eq("id", r.user_id).maybeSingle();
    if (!p?.phone || !p.phone_verified) { await mark("no_phone"); skipped++; continue; }

    const name = (p.display_name || r.user_name || "Player").split("@")[0].slice(0, 40);
    const res = await sendTemplate(p.phone.replace(/\D/g, ""), "d79_game_feedback", [name, r.game_title.slice(0, 60)]);
    if (res.ok) { await mark("sent"); done.add(key); sent++; }
    else {
      // Keep it queued so it retries (e.g. while the message is still waiting for Meta approval)
      await admin.from("game_downloads").update({ whatsapp_followup_error: `${res.status}: ${res.body}`.slice(0, 500) }).eq("id", r.id);
      failed++;
    }
  }
  return new Response(JSON.stringify({ sent, skipped, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
