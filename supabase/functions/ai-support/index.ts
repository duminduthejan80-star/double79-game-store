import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-14) : [];
    const pageContext = typeof body?.context === "string" ? body.context.slice(0, 800) : "";
    const voiceMode = body?.voice === true;
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Give the bot live knowledge of the store catalogue
    let catalogue = "";
    try {
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data } = await supa
        .from("games")
        .select("title, genre, categories, size, online")
        .order("created_at", { ascending: false })
        .limit(120);
      catalogue = (data ?? [])
        .map((g: any) =>
          `- ${g.title}${g.genre ? ` (${g.genre})` : ""}${g.size ? ` | size: ${g.size}` : ""}${
            g.online === true ? " | Online" : g.online === false ? " | Offline" : ""
          }`,
        )
        .join("\n");
    } catch (_) {
      // catalogue is optional
    }

    const systemPrompt = `ඔබ "Double79 Game Store" වෙබ් අඩවියේ AI Support සහායකයාය.

භාෂාව: පරිශීලකයා ලියන භාෂාවෙන්ම පිළිතුරු දෙන්න. සිංහලෙන් හෝ සිංහල-ඉංග්‍රීසි (Singlish) ලිව්වොත් සිංහලෙන් උත්තර දෙන්න. කෙටියෙන්, මිත්‍රශීලීව, පැහැදිලිව ලියන්න (වචන 120ට අඩුවෙන්).

වෙබ් අඩවිය ගැන දැනගත යුතු කරුණු:
- මෙය pre-installed PC games බාගත කරගත හැකි අඩවියකි. ලියාපදිංචිය Google sign-in එකෙන් පමණි.
- පිටු: Store (/home), Library (/library), How to Download (/how-to-download), Profiles (/profiles).
- Download කරන විදිය: Store එකේ game card එකට යන්න → Download බොත්තම → Free හෝ Pro තෝරන්න.
- Free link: download speed එක අඩුයි, ads එනවා, ඇතැම් විට errors එන්න පුළුවන්.
- Pro link: ඉතා වේගවත්, ads නැහැ, errors නැහැ. Pro එක මාසයක් (දින 30) වලංගුයි.
- Pro ගන්න විදිය: 0704962595 නම්බරයට Rs.200ක් reload කරන්න, ඒ **එදාම** එම receipt එකේ ඡායාරූපය Pro dialog එකෙන් upload කරන්න. AI එකෙන් receipt එක පරීක්ෂා කර Pro එක වහාම active වේ. එකම receipt එකක් දෙපාරක් භාවිත කළ නොහැක; edit කළ receipt ප්‍රතික්ෂේප වේ.
- අලුත් game එකක් ඕන නම් navbar එකේ "Request Game" WhatsApp බොත්තමෙන් (+94704962595) ඉල්ලන්න.
- Game එකක් install/open කරන ආකාරය How to Download පිටුවේ වීඩියෝ වලින් බලාගත හැක.
- "Can I Run It?" මගින් ඔබේ PC එකට game එක ගැළපෙනවාද කියා පරීක්ෂා කළ හැක.

${catalogue ? `දැනට අඩවියේ ඇති සමහර games:\n${catalogue}` : ""}

ඔබ දන්නේ නැති දෙයක් ගැන අනුමාන නොකරන්න — WhatsApp (+94704962595) හරහා owner ට කතා කරන්න කියන්න.

${pageContext ? `පරිශීලකයා දැන් බලමින් සිටින්නේ: ${pageContext}\nඑය ගැන ස්වභාවිකව අදහස් දක්වන්න (හොඳ game එකක් නම් "මේක නම් සුපිරි!" වගේ, අලුත් එකක් නම් "මේක අලුත්ම game එකක්" වගේ). Download කරන්න යනවා නම් Free (හෙමින්, ads, errors එන්න පුළුවන්) සහ Pro (ඉතා වේගවත්, ads නෑ, errors නෑ, මාසයක්) වෙනස කෙටියෙන් කියන්න.` : ""}

${voiceMode ? "දැන් ඔබ VOICE CALL එකක ඉන්නවා. කතා කරන විදියට කෙටියෙන් (වචන 60ට අඩුවෙන්) ලියන්න. bullet points, emoji, markdown, links, numbers list භාවිත නොකරන්න — හුදෙක් සරල වාක්‍ය පමණයි." : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      const msg =
        res.status === 429
          ? "ඉල්ලීම් වැඩියි. විනාඩියකින් නැවත උත්සාහ කරන්න."
          : res.status === 402
            ? "AI credits ඉවරයි. Owner ට කතා කරන්න."
            : "AI සේවාව දැන් ලබාගත නොහැක.";
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("ai-support error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
