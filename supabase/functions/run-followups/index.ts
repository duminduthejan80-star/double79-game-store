import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const instanceId = Deno.env.get("WAAPI_INSTANCE_ID");
  const token = Deno.env.get("WAAPI_TOKEN");
  if (!instanceId || !token) {
    return new Response(JSON.stringify({ error: "WaAPI credentials missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: due, error } = await admin
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(50);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let sent = 0, failed = 0;
  for (const row of due ?? []) {
    const message = `ඔයා ඊයේ ගත්ත ${row.game_title} ගේම් එක හොඳයිද enjoy කරාද? ගේම් එකට rate එක කීයක්ද දෙනවද ? /5`;
    try {
      const r = await fetch(`https://api.waapi.app/v1/instances/${instanceId}/client/action/send-message`, {
        method: "POST",
        headers: { "accept": "application/json", "authorization": `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ chatId: `${row.phone_e164.replace("+", "")}@c.us`, message }),
      });
      const txt = await r.text();
      if (!r.ok) throw new Error(`WaAPI ${r.status}: ${txt}`);
      await admin.from("scheduled_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
      sent++;
    } catch (e: any) {
      await admin.from("scheduled_messages").update({ status: "failed", error: String(e.message ?? e) }).eq("id", row.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: due?.length ?? 0, sent, failed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
