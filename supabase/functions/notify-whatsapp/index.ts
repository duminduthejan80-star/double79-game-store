import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const instanceId = Deno.env.get("greenapi_instance_id");
    const token = Deno.env.get("greenapi_token");
    const chatId = Deno.env.get("GREENAPI_GROUP_CHAT_ID");

    if (!instanceId || !token || !chatId) {
      console.error("Green API credentials missing");
      return new Response(JSON.stringify({ error: "Service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();

    const res = await fetch(
      `https://api.greenapi.com/waInstance${instanceId}/sendFileByUrl/${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          urlFile: body.imageUrl || "https://placehold.co/600x400?text=Game",
          fileName: (body.gameName || "Game") + ".jpg",
          caption: `🎮 *New Game Added!* 🎮\n\n📌 *Title:* ${body.gameName || "Unknown"}\n🔗 *Link:* ${body.link || "#"}`
        })
      }
    );

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, greenApiResponse: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("notify-whatsapp error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
