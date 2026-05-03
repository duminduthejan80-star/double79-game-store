import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "7997";
const BUCKET = "game-media";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.headers.get("x-admin-code") !== ADMIN_CODE) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Call Lovable AI to upscale/enhance the image
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Upscale this image to ultra-high resolution (4K quality). Enhance sharpness, detail, textures and clarity. Keep the exact same composition, subjects, colors and style — do not change content, only improve quality and resolution. Output a crisp, photorealistic high-detail version.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI upscale failed: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const dataUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url as
      | string
      | undefined;
    if (!dataUrl?.startsWith("data:")) throw new Error("No image returned from AI");

    // Decode base64
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:([^;]+)/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Upload to storage
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const path = `upscaled/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supa.storage
      .from(BUCKET)
      .upload(path, bin, { contentType: mime, upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("upscale-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
