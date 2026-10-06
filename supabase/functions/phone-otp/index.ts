import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizePhone, sendTemplate, sendGreenApiText, backupHealth } from "../_shared/whatsapp.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (new URL(req.url).searchParams.get("health") === "1") return json(await backupHealth());
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user) return json({ error: "Please sign in again" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "send") {
      const phone = normalizePhone(body?.phone);
      if (!phone) return json({ error: "Enter a valid phone number" }, 400);

      const { data: last } = await admin.from("phone_otps").select("created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) {
        return json({ error: "Please wait 1 minute before asking for a new code" }, 429);
      }

      // One number = one account
      const { data: taken } = await admin.from("profiles").select("id")
        .eq("phone", "+" + phone).eq("phone_verified", true).neq("id", user.id).limit(1);
      if (taken && taken.length) return json({ error: "This number is already used by another account" }, 409);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await admin.from("phone_otps").insert({
        user_id: user.id, phone, code_hash: await sha256(code),
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      });

      // 1) Official business number (authentication template)
      let sent = (await sendTemplate(phone, "d79_login_code", [code], [
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
      ])).ok;
      // 2) Backup sender
      if (!sent) {
        sent = (await sendGreenApiText(phone,
          `Double79 verification code: *${code}*\n\nThis code expires in 5 minutes. Do not share it with anyone.`)).ok;
      }
      if (!sent) return json({ error: "Could not send the WhatsApp code. Check the number has WhatsApp and try again." }, 502);
      return json({ ok: true, phone: "+" + phone });
    }

    if (action === "verify") {
      const code = String(body?.code || "").replace(/\D/g, "");
      if (code.length !== 6) return json({ error: "Enter the 6-digit code" }, 400);
      const { data: otp } = await admin.from("phone_otps").select("*")
        .eq("user_id", user.id).is("consumed_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
        return json({ error: "Code expired. Ask for a new one." }, 400);
      }
      if (otp.attempts >= 5) return json({ error: "Too many wrong tries. Ask for a new code." }, 429);
      if ((await sha256(code)) !== otp.code_hash) {
        await admin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
        return json({ error: "Wrong code" }, 400);
      }
      await admin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
      const { error } = await admin.from("profiles").update({
        phone: "+" + otp.phone, phone_verified: true, phone_verified_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
