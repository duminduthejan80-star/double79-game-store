import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FEEDBACK_FROM_EMAIL") || Deno.env.get("SMTP_USER") || "";
const FROM_NAME = Deno.env.get("FEEDBACK_FROM_NAME") || "Double79";
const SITE_URL = Deno.env.get("SITE_URL") || "https://double79-game-store.lovable.app";

function buildHtml(name: string, gameTitle: string, gameId: string) {
  const link = `${SITE_URL}/game/${gameId}#reviews`;
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#0f172a;padding:24px;color:#e2e8f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#1e293b;border-radius:12px;overflow:hidden">
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#f8fafc">හායි ${name},</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#cbd5e1">
        ඔයා ඩවුන්ලෝඩ් කරපු <strong style="color:#fbbf24">${gameTitle}</strong> ගේම් එක වැඩ කරාද?
        Errors මුකුත් ආවද? ඔයාගේ අදහස අපිට කියන්න.
        මොකක් හරි ගැටළුවක් තියෙනවා නම් අපිට මැසේජ් එකක් දාන්න!
      </p>
      <p style="margin:24px 0;text-align:center">
        <a href="${link}" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;display:inline-block">
          ⭐ Rate &amp; Review ${gameTitle}
        </a>
      </p>
      <p style="font-size:13px;color:#94a3b8;margin:24px 0 0">— Double79 Team</p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendOne(to: string, name: string, gameTitle: string, gameId: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to, name }],
      subject: `${gameTitle} ගැන ඔයාගේ අදහස කියන්න`,
      htmlContent: buildHtml(name, gameTitle, gameId),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Brevo ${res.status}: ${txt}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");
    if (!FROM_EMAIL) throw new Error("FEEDBACK_FROM_EMAIL not configured");

    let body: any = null;
    if (req.method === "POST") {
      try { body = await req.json(); } catch (_) { body = null; }
    }

    // Test mode: send a sample feedback email to a single address
    if (body?.test === true) {
      const to = String(body.to || FROM_EMAIL);
      const name = String(body.name || "Tester");
      const gameTitle = String(body.gameTitle || "Sample Game");
      const gameId = String(body.gameId || "00000000-0000-0000-0000-000000000000");
      try {
        await sendOne(to, name, gameTitle, gameId);
        return new Response(
          JSON.stringify({ ok: true, mode: "test", to, delivered: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ ok: false, mode: "test", to, delivered: false, error: e?.message ?? String(e) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await admin
      .from("game_downloads")
      .select("id, user_email, user_name, game_id, game_title")
      .eq("email_status", "pending")
      .lte("downloaded_at", cutoff)
      .limit(50);

    if (error) throw error;

    let sent = 0, failed = 0;
    for (const r of rows ?? []) {
      try {
        await sendOne(r.user_email, r.user_name || "Player", r.game_title, r.game_id);
        await admin.from("game_downloads").update({
          email_status: "sent", email_sent_at: new Date().toISOString(),
        }).eq("id", r.id);
        sent++;
      } catch (e: any) {
        console.error("send-feedback-email failed for", r.id, e?.message);
        await admin.from("game_downloads").update({ email_status: "failed" }).eq("id", r.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, failed, considered: rows?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-feedback-email error", e);
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
