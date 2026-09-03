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

const REQUIRED_AMOUNT = 200;
const TARGET_NUMBER = "0704962595";

const sha256 = async (bytes: Uint8Array) => {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return json({ ok: false, status: "rejected", reason: "Please sign in first" }, 401);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return json({ ok: false, status: "rejected", reason: "Please sign in first" }, 401);
  }
  const userId = userData.user.id;

  let body: { image?: unknown; mime?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, status: "rejected", reason: "Invalid request" }, 400);
  }

  const dataUrl = typeof body.image === "string" ? body.image : "";
  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return json({ ok: false, status: "rejected", reason: "Upload a JPG/PNG photo of the receipt" }, 400);

  const mime = m[1];
  const b64 = m[3];
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return json({ ok: false, status: "rejected", reason: "Could not read the image" }, 400);
  }
  if (bytes.length > 8_000_000) {
    return json({ ok: false, status: "rejected", reason: "Image too large (max 8MB)" }, 400);
  }

  const hash = await sha256(bytes);

  // 1) Duplicate image check (same picture used before)
  const { data: dupImg } = await supabase
    .from("pro_receipts")
    .select("id, user_id, status")
    .eq("image_hash", hash)
    .eq("status", "accepted")
    .maybeSingle();

  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${mime.split("/")[1]}`;
  await supabase.storage.from("pro-receipts").upload(path, bytes, { contentType: mime, upsert: false });

  const finish = async (
    status: "accepted" | "rejected",
    reason: string | null,
    extra: { ref_no?: string | null; amount?: number | null; ai_notes?: string | null } = {},
  ) => {
    await supabase.from("pro_receipts").insert({
      user_id: userId,
      image_path: path,
      image_hash: hash,
      status,
      reason,
      ref_no: extra.ref_no ?? null,
      amount: extra.amount ?? null,
      ai_notes: extra.ai_notes ?? null,
    });
    return json({ ok: status === "accepted", status, reason });
  };

  if (dupImg) {
    return await finish("rejected", "USED — this receipt was already used");
  }

  // 2) AI vision check
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!aiKey) return await finish("rejected", "Verification service unavailable, try later");

  const prompt = `You are a strict payment receipt verifier for a Sri Lankan mobile reload (Mobitel) top-up.
Check the image and answer ONLY with JSON:
{"is_receipt":bool,"edited":bool,"amount":number|null,"ref_no":string|null,"to_number":string|null,"reason":string}
Rules:
- "is_receipt": true only if it is a genuine mobile reload / bank transfer confirmation slip or SMS screenshot.
- "edited": true if there are ANY signs of tampering: mismatched fonts, misaligned text baselines, blurry patches, cloned pixels, inconsistent colors, cropped-in numbers, photoshop artifacts.
- "amount": the reload/transfer amount in LKR as a plain number.
- "ref_no": the reference / transaction / serial number exactly as printed (null if absent).
- "to_number": the recipient mobile number as printed.
- "reason": short English explanation.`;

  let ai: any = null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (res.status === 429) return await finish("rejected", "Too many checks right now — try again in a minute");
    if (!res.ok) return await finish("rejected", "Could not verify the receipt, try again");
    const out = await res.json();
    const text: string = out?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    ai = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (_e) {
    return await finish("rejected", "Could not verify the receipt, try again");
  }

  if (!ai) return await finish("rejected", "Could not read the receipt clearly — upload a clear photo");

  const notes = typeof ai.reason === "string" ? ai.reason.slice(0, 400) : null;
  const refNo = typeof ai.ref_no === "string" && ai.ref_no.trim() ? ai.ref_no.trim().slice(0, 60) : null;
  const amount = typeof ai.amount === "number" ? ai.amount : Number(String(ai.amount ?? "").replace(/[^\d.]/g, "")) || null;

  if (!ai.is_receipt) return await finish("rejected", "INVALID — this is not a reload receipt", { ai_notes: notes });
  if (ai.edited === true) return await finish("rejected", "EDITED — this receipt looks modified", { ref_no: refNo, amount, ai_notes: notes });
  if (amount === null || amount < REQUIRED_AMOUNT) {
    return await finish("rejected", `WRONG AMOUNT — Rs.${REQUIRED_AMOUNT} required`, { ref_no: refNo, amount, ai_notes: notes });
  }

  const digits = String(ai.to_number ?? "").replace(/\D/g, "");
  if (digits && !digits.endsWith(TARGET_NUMBER.slice(-9))) {
    return await finish("rejected", `WRONG NUMBER — reload must go to ${TARGET_NUMBER}`, { ref_no: refNo, amount, ai_notes: notes });
  }

  // 3) Duplicate reference number check
  if (refNo) {
    const { data: dupRef } = await supabase
      .from("pro_receipts")
      .select("id")
      .eq("ref_no", refNo)
      .eq("status", "accepted")
      .maybeSingle();
    if (dupRef) return await finish("rejected", "USED — this receipt number was already used", { ref_no: refNo, amount, ai_notes: notes });
  }

  const expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  const { error: subErr } = await supabase.from("pro_subscriptions").upsert(
    { user_id: userId, activated_at: new Date().toISOString(), expires_at: expiresAt, code: refNo },
    { onConflict: "user_id" },
  );
  if (subErr) return await finish("rejected", "Could not activate Pro, contact support", { ref_no: refNo, amount, ai_notes: notes });

  await supabase.from("pro_receipts").insert({
    user_id: userId,
    image_path: path,
    image_hash: hash,
    status: "accepted",
    reason: null,
    ref_no: refNo,
    amount,
    ai_notes: notes,
  });

  return json({ ok: true, status: "accepted", expires_at: expiresAt });
});
