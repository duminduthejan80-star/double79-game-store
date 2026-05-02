// Streams a remote file through this edge function so the browser can
// observe real download progress (bypasses CORS on the original host).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing 'url' query param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only http/https allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward Range so resumable / partial downloads work
    const upstreamHeaders: HeadersInit = {};
    const range = req.headers.get("range");
    if (range) upstreamHeaders["Range"] = range;

    const upstream = await fetch(parsed.toString(), {
      headers: upstreamHeaders,
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ error: `Upstream responded ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers = new Headers(corsHeaders);
    const passthrough = ["content-length", "content-type", "content-range", "accept-ranges", "last-modified", "etag"];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
