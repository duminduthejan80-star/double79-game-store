import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ ok: false, error: "Please sign in first" }, 401);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return json({ ok: false, error: "Please sign in first" }, 401);
  const userId = userData.user.id;

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request" }, 400);
  }
  const raw = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4,12}$/.test(raw)) return json({ ok: false, error: "Invalid code format" }, 400);

  const { data: row } = await supabase
    .from("pro_codes")
    .select("id, expires_at, used_by")
    .eq("code", raw)
    .maybeSingle();

  if (!row) return json({ ok: false, error: "Invalid code" }, 400);
  if (row.used_by) return json({ ok: false, error: "This code was already used" }, 400);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ ok: false, error: "This code has expired" }, 400);
  }

  const { error: useErr } = await supabase
    .from("pro_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_by", null);
  if (useErr) return json({ ok: false, error: "Could not redeem this code" }, 400);

  const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  const { error: subErr } = await supabase.from("pro_subscriptions").upsert(
    { user_id: userId, activated_at: new Date().toISOString(), expires_at: expiresAt, code: raw },
    { onConflict: "user_id" },
  );
  if (subErr) return json({ ok: false, error: subErr.message }, 500);

  return json({ ok: true, expires_at: expiresAt });
});
