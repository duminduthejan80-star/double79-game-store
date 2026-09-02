import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-code",
};

const ADMIN_CODE = "4998";

// Popular Steam app IDs (top sellers / most played). Extend freely.
const APP_IDS = [
  730, 570, 578080, 1172470, 271590, 1085660, 1245620, 292030, 1091500, 105600,
  359550, 252490, 381210, 892970, 346110, 440, 550, 236390, 294100, 304930,
  413150, 289070, 8930, 322330, 648800, 739630, 1551360, 1811260, 1938090,
  1599340, 2050650, 1716740, 1238810, 1677740, 1449850, 814380, 582010, 431960,
  1240440, 960090, 1151340, 367520, 250900, 242760, 387990, 526870, 646570,
  311210, 238320, 227300, 255710, 281990, 394360, 236850, 313120, 594650,
  489830, 72850, 374320, 218620, 242550, 286160, 219150, 284160, 203160,
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CATEGORY_MAP: Record<string, string> = {
  Action: "Action",
  Adventure: "Adventure",
  RPG: "Role-playing Game",
  "Role-Playing": "Role-playing Game",
  Racing: "Racing",
  Horror: "Horror",
  Indie: "Indie",
  Simulation: "Simulation",
  Sports: "Sports",
  Strategy: "Strategy",
  "Massively Multiplayer": "Multiplayer",
  Multiplayer: "Multiplayer",
  FPS: "First-person Shooter",
  Shooter: "Shooters",
  "Open World": "Open World",
  Survival: "Survival",
  "Sci-fi": "Sci-fi",
  VR: "Virtual Reality",
  Anime: "Anime",
  Building: "Building",
};

function mapCategories(genres: { description: string }[] = []): string[] {
  const out = new Set<string>();
  for (const g of genres) {
    const mapped = CATEGORY_MAP[g.description];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

async function fetchAppDetails(appid: number) {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic,name,short_description,header_image,screenshots,movies,genres,developers,publishers,release_date,pc_requirements`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data?.[String(appid)];
  if (!entry?.success) return null;
  return entry.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-admin-code") !== ADMIN_CODE) return json({ error: "unauthorized" }, 401);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  if (!token) return json({ error: "unauthorized" }, 401);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const { data: roleRow } = await supabase
    .from("user_roles").select("role")
    .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "unauthorized" }, 401);

  // Optional: { appids: [...] } to import a custom list
  let appids = APP_IDS;
  try {
    const body = await req.json();
    if (Array.isArray(body?.appids) && body.appids.length) appids = body.appids;
  } catch (_) { /* no body */ }

  // Existing titles to avoid duplicates
  const { data: existing } = await supabase.from("games").select("title");
  const existingTitles = new Set((existing ?? []).map((g: any) => (g.title || "").toLowerCase().trim()));

  let added = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const appid of appids) {
    try {
      const d = await fetchAppDetails(appid);
      if (!d || d.type !== "game") { skipped++; continue; }
      const title: string = d.name;
      if (!title || existingTitles.has(title.toLowerCase().trim())) { skipped++; continue; }

      const categories = mapCategories(d.genres ?? []);
      const reqMin = d.pc_requirements?.minimum || "";
      const pick = (label: string) => {
        const m = reqMin.match(new RegExp(label + "\\s*:?\\s*<\\/strong>\\s*([^<]+)", "i"))
          || reqMin.match(new RegExp(label + "\\s*:?\\s*([^<\\n]+)", "i"));
        return m ? m[1].trim() : "";
      };

      const screenshots = (d.screenshots ?? []).slice(0, 4).map((s: any) => s.path_full);
      const trailer = d.movies?.[0]?.mp4?.max || d.movies?.[0]?.webm?.max || null;

      const { error } = await supabase.from("games").insert({
        title,
        description: d.short_description || null,
        image_url: d.header_image || null,
        download_url: null,
        download_url_pro: null,
        is_free: true,
        price: 0,
        mode: "offline",
        genre: categories.join(", ") || null,
        categories,
        developer: d.developers?.[0] || null,
        publisher: d.publishers?.[0] || null,
        release_date: d.release_date?.date || null,
        min_os: pick("OS") || null,
        min_cpu: pick("Processor") || null,
        min_ram: pick("Memory") || null,
        min_gpu: pick("Graphics") || null,
        min_storage: pick("Storage") || null,
        screenshots,
        trailer_url: trailer,
      });

      if (error) { failed++; errors.push(`${title}: ${error.message}`); continue; }
      existingTitles.add(title.toLowerCase().trim());
      added++;
      // Be polite to Steam's API
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e: any) {
      failed++;
      errors.push(`appid ${appid}: ${e?.message}`);
    }
  }

  return json({ ok: true, added, skipped, failed, errors: errors.slice(0, 10) });
});
