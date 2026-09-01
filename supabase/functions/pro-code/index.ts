import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "4998";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

  if (req.headers.get("x-admin-code") !== ADMIN_CODE) return json({ error: "unauthorized" }, 401);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ error: "unauthorized", reason: "no_token" }, 401);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "unauthorized", reason: "bad_token" }, 401);
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "unauthorized", reason: "not_admin" }, 401);

  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const { error } = await supabase.from("pro_codes").insert({
    code,
    created_by: userData.user.id,
    expires_at: expiresAt,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, code, expires_at: expiresAt });
});
