const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBSITE_URL = "https://double79-game-store.lovable.app";
const GROUP_ID = "120363405710260136@g.us";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get("WHAPI_TOKEN");
    if (!token) throw new Error("WHAPI_TOKEN not set");

    const payload = await req.json();
    // Support both pg_net trigger payload { record: {...} } and direct calls
    const game = payload.record ?? payload.game ?? payload;
    const gameName = game?.title ?? "New Game";
    const gameId = game?.id;
    const link = gameId ? `${WEBSITE_URL}/game/${gameId}` : WEBSITE_URL;

    const caption =
`🎮 *New Game Added on Double79!* 🚀

🕹️ *Game Name:*
${gameName}

✨ Free to download now!

🔗 *Download Link:*
${link}`;

    const imageUrl = game?.image_url;
    let res: Response;

    if (imageUrl) {
    // 🚀 කෙළින්ම Green-API එකට ෆොටෝ එකයි මැසේජ් එකයි යවනවා
    res = await fetch("https://api.greenapi.com/waInstance7103980145/sendFileByUrl/56eccbf54d2e46e5a400f91884ea2ebf25091fa16db3405cba", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: "120363385732296489@g.us", // ඔයාගේ WhatsApp Group ID එක
        urlFile: imageUrl,
        fileName: `${game?.name || 'game'}.jpg`,
        caption: caption
      }),
    });
  } else {
      res = await fetch("https://gate.whapi.cloud/messages/text", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: GROUP_ID, body: caption }),
      });
    }

    const text = await res.text();
    console.log("Whapi response", res.status, text);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Whapi failed", status: res.status, detail: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-whatsapp error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
