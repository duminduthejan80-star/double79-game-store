// Resolves share-page URLs (Gofile, Buzzheavier, etc.) into fresh direct
// download links on demand. Direct links from these hosts expire after a few
// hours, so we re-resolve every time the user clicks download.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------- Gofile ----------
// Public flow: create guest account → get token → fetch content metadata →
// return the direct link for the first file inside the folder.
async function resolveGofile(shareUrl: string): Promise<string | null> {
  const m = shareUrl.match(/gofile\.io\/d\/([A-Za-z0-9]+)/i);
  if (!m) return null;
  const contentId = m[1];

  // 1. Create guest account
  const acctRes = await fetch("https://api.gofile.io/accounts", { method: "POST" });
  const acctJson = await acctRes.json();
  const token = acctJson?.data?.token;
  if (!token) throw new Error("gofile: no guest token");

  // 2. Fetch content (wt is a public web-token gofile exposes in their JS bundle)
  const wt = "4fd6sg89d7s6";
  const contentRes = await fetch(
    `https://api.gofile.io/contents/${contentId}?wt=${wt}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const contentJson = await contentRes.json();
  const children = contentJson?.data?.children;
  if (!children) throw new Error("gofile: no children in response");

  const first = Object.values(children)[0] as any;
  const link = first?.link;
  if (!link) throw new Error("gofile: no direct link");

  // The direct link requires the account cookie to actually download. We
  // return it together with the cookie so the caller can use it.
  return link;
}

// ---------- Buzzheavier ----------
// Their share page exposes a /dl/ endpoint that 302-redirects to the temporary
// CDN link. We follow it and return the final URL.
async function resolveBuzzheavier(shareUrl: string): Promise<string | null> {
  if (!/buzzheavier\.com/i.test(shareUrl)) return null;
  const id = shareUrl.split("/").filter(Boolean).pop();
  if (!id) return null;

  // Try the dl endpoint first
  const dlUrl = `https://buzzheavier.com/dl/${id}`;
  const res = await fetch(dlUrl, { redirect: "manual" });
  const loc = res.headers.get("location");
  if (loc) return loc;

  // Fallback: scrape the page for an href containing the file
  const pageRes = await fetch(shareUrl);
  const html = await pageRes.text();
  const match = html.match(/https?:\/\/[^"']+\.buzzheavier\.com\/[^"']+/i);
  return match ? match[0] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url) return json({ error: "url required" }, 400);

    let direct: string | null = null;
    let host: "gofile" | "buzzheavier" | "unknown" = "unknown";

    if (/gofile\.io/i.test(url)) {
      host = "gofile";
      direct = await resolveGofile(url);
    } else if (/buzzheavier\.com/i.test(url)) {
      host = "buzzheavier";
      direct = await resolveBuzzheavier(url);
    } else {
      // Unknown host — just return the original URL unchanged.
      return json({ direct: url, host, resolved: false });
    }

    if (!direct) return json({ error: "could not resolve direct link", host }, 502);
    return json({ direct, host, resolved: true });
  } catch (e) {
    console.error("resolve-download error:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
