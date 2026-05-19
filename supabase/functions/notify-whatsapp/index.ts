Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let reqBody: { gameName: string; imageUrl: string; link: string };

  try {
    reqBody = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!reqBody.gameName || !reqBody.imageUrl || !reqBody.link) {
    return new Response("Missing required fields: gameName, imageUrl, link", {
      status: 400,
    });
  }

  const GREEN_API_URL =
    "https://api.greenapi.com/waInstance7103980145/sendFileByUrl/56eccbf54d2e46e5a400f91884ea2ebf25091fa16db3405cba";

  const payload = {
    chatId: "120363385732296489@g.us",
    urlFile: reqBody.imageUrl,
    fileName: reqBody.gameName + ".jpg",
    caption:
      "🎮 *New Game Added!* 🎮\n\n📌 *Title:* " +
      reqBody.gameName +
      "\n🔗 *Link:* " +
      reqBody.link,
  };

  try {
    const greenApiResponse = await fetch(GREEN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await greenApiResponse.json();

    if (!greenApiResponse.ok) {
      console.error("Green-API error:", responseData);
      return new Response(
        JSON.stringify({ error: "Green-API request failed", details: responseData }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp notification sent successfully:", responseData);
    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fetch to Green-API failed:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
