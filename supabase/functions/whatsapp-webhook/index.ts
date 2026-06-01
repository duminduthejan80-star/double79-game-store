import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Extracts phone (E.164) and a numeric 1-5 rating from a WaAPI inbound webhook payload.
function parsePayload(payload: any): { phone: string | null; rating: number | null } {
  // WaAPI typical structure: { event: "message", data: { message: { from: "94xxx@c.us", body: "5" } } }
  const m = payload?.data?.message ?? payload?.message ?? payload;
  const from: string = m?.from ?? m?.chatId ?? m?._data?.from ?? "";
  const body: string = m?.body ?? m?.text ?? m?._data?.body ?? "";
  const digits = from.split("@")[0].replace(/\D/g, "");
  const phone = digits ? `+${digits}` : null;
  const match = String(body).trim().match(/^([1-5])(\s*\/\s*5)?$/);
  const rating = match ? parseInt(match[1], 10) : null;
  return { phone, rating };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    console.log("whatsapp-webhook payload:", JSON.stringify(payload).slice(0, 500));

    const { phone, rating } = parsePayload(payload);
    if (!phone || !rating) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "no phone or rating" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find latest sent follow-up for this phone (within last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: fu } = await admin
      .from("scheduled_messages")
      .select("user_id, game_id, game_title, sent_at")
      .eq("phone_e164", phone)
      .eq("status", "sent")
      .gte("sent_at", cutoff)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fu || !fu.game_id) {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "no matching follow-up" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("profiles").select("display_name, email").eq("id", fu.user_id).maybeSingle();
    const username = profile?.display_name || profile?.email?.split("@")[0] || "Player";

    const { error } = await admin.from("game_reviews").insert({
      game_id: fu.game_id,
      user_id: fu.user_id,
      username,
      rating,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, posted: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("whatsapp-webhook error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
