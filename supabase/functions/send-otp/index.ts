import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(p: string): string | null {
  const cleaned = p.replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(cleaned)) return null;
  return cleaned;
}

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
    const phone = normalizePhone(String(body?.phone ?? ""));
    if (!phone) {
      return new Response(JSON.stringify({ error: "Invalid phone. Use E.164 format e.g. +94771234567" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit: 60s between sends
    const { data: last } = await admin
      .from("phone_otps")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) {
      return new Response(JSON.stringify({ error: "Please wait before requesting another code." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    const { error: insErr } = await admin.from("phone_otps").insert({
      user_id: userId, phone_e164: phone, code_hash: codeHash, expires_at: expiresAt,
    });
    if (insErr) throw insErr;

    const instanceId = Deno.env.get("WAAPI_INSTANCE_ID");
    const token = Deno.env.get("WAAPI_TOKEN");
    if (!instanceId || !token) throw new Error("WaAPI credentials not configured");

    const waResp = await fetch(`https://api.waapi.app/v1/instances/${instanceId}/client/action/send-message`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chatId: `${phone.replace("+", "")}@c.us`,
        message: `Your Double79 verification code is: ${code}\n\nThis code expires in 5 minutes.`,
      }),
    });
    const waText = await waResp.text();
    if (!waResp.ok) {
      console.error("WaAPI error", waResp.status, waText);
      return new Response(JSON.stringify({ error: "Failed to send WhatsApp message", details: waText }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, phone }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-otp error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
