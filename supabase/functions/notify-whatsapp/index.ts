import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // බ්‍රවුසර් එකෙන් මුලින්ම එවන OPTIONS (Preflight) රික්වෙස්ට් එක හැන්ඩ්ල් කරනවා
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

    const body = await req.json();
    
    // Green-API එකට ඩේටා යවනවා
    const res = await fetch(
      "https://api.greenapi.com/waInstance7103980145/sendFileByUrl/56eccbf54d2e46e5a400f91884ea2ebf25091fa16db3405cba",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: "120363385732296489@g.us",
          urlFile: body.imageUrl,
          fileName: body.gameName + ".jpg",
          caption: `🎮 *New Game Added!* 🎮\n\n📌 *Title:* ${body.gameName}\n🔗 *Link:* ${body.link}`
        })
      }
    );

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, greenApiResponse: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
