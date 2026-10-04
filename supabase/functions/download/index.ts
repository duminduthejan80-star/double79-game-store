// Pro direct download proxy.
//
// POST  (Authorization: Bearer <user JWT>, body { fileId })
//   -> checks the user has an active Pro subscription, returns a signed,
//      short-lived download URL for this function.
// GET   ?fileId=<game id>&t=<ticket>
//   -> looks up the real file link server-side (never sent to the browser),
//      fetches it (Gofile visitor pass handled here) and streams it back with
//      Content-Disposition: attachment so the browser's own downloader saves
//      it in place (progress, speed, time left, pause/resume via Range).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TICKET_SECRET = Deno.env.get("DOWNLOAD_TICKET_SECRET")!;
const TICKET_TTL_SEC = 12 * 60 * 60; // long enough to resume a big download

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- tickets
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) =>
  atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

let hmacKey: CryptoKey | null = null;
const getKey = async () =>
  hmacKey ??= await crypto.subtle.importKey(
    "raw", enc.encode(TICKET_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );

async function signTicket(gameId: string, userId: string) {
  const payload = b64url(enc.encode(JSON.stringify({
    g: gameId, u: userId, e: Math.floor(Date.now() / 1000) + TICKET_TTL_SEC,
  })));
  const sig = await crypto.subtle.sign("HMAC", await getKey(), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

async function verifyTicket(ticket: string, gameId: string): Promise<string | null> {
  const [payload, sig] = ticket.split(".");
  if (!payload || !sig) return null;
  const sigBytes = Uint8Array.from(fromB64url(sig), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", await getKey(), sigBytes, enc.encode(payload));
  if (!ok) return null;
  try {
    const data = JSON.parse(fromB64url(payload));
    if (data.g !== gameId || typeof data.e !== "number" || data.e < Date.now() / 1000) return null;
    return data.u as string;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Gofile
const GOFILE_SALT = "12af056dacea0b";
const GOFILE_LANG = "en-US";
let gofileToken: string | null = null;

async function sha256Hex(s: string) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function gofileHeaders(token = ""): Promise<Record<string, string>> {
  const slot = Math.floor(Date.now() / 1000 / 14400);
  const h: Record<string, string> = {
    "User-Agent": UA,
    Accept: "*/*",
    Origin: "https://gofile.io",
    Referer: "https://gofile.io/",
    "X-Website-Token": await sha256Hex(`${UA}::${GOFILE_LANG}::${token}::${slot}::${GOFILE_SALT}`),
    "X-BL": GOFILE_LANG,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getGofileToken(fresh = false) {
  if (gofileToken && !fresh) return gofileToken;
  const res = await fetch("https://api.gofile.io/accounts", {
    method: "POST",
    headers: { ...(await gofileHeaders("")), "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await res.json().catch(() => null);
  const tok = data?.data?.token;
  if (!tok) throw new Error(`Gofile token failed (${res.status})`);
  gofileToken = tok;
  return tok as string;
}

async function resolveGofile(url: string, token: string): Promise<string> {
  const m = url.match(/gofile\.io\/(?:d|download\/web|download\/direct|download)\/([A-Za-z0-9-]+)/i);
  if (!m) return url;
  const res = await fetch(`https://api.gofile.io/contents/${m[1]}`, { headers: await gofileHeaders(token) });
  const data = await res.json().catch(() => null);
  if (data?.status !== "ok") throw new Error(`Gofile: ${data?.status ?? res.status}`);
  const d = data.data ?? {};
  if (d.link) return d.link;
  const files = Object.values(d.children ?? {}).filter((c: any) => c?.link) as any[];
  if (!files.length) throw new Error("Gofile: folder is empty");
  files.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  return files[0].link;
}

// ---------------------------------------------------------------- source
// Supports Gofile links, any direct https link, and private storage paths
// written as "storage://<bucket>/<path>".
async function openUpstream(rawUrl: string, range: string | null, fresh = false): Promise<Response> {
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*" };
  if (range) headers.Range = range;
  let url = rawUrl.trim();

  if (url.startsWith("storage://")) {
    const [bucket, ...rest] = url.slice("storage://".length).split("/");
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(rest.join("/"), 600);
    if (error || !data) throw new Error("File not found in storage");
    url = data.signedUrl;
  } else if (/gofile\.io/i.test(url)) {
    const token = await getGofileToken(fresh);
    url = await resolveGofile(url, token);
    headers.Cookie = `accountToken=${token}`;
    headers.Referer = "https://gofile.io/";
  }
  return fetch(url, { headers, redirect: "follow" });
}

const looksLikePage = (res: Response) =>
  /text\/html|application\/json/i.test(res.headers.get("content-type") ?? "");

function pickFilename(res: Response, fallback: string) {
  const cd = res.headers.get("content-disposition") ?? "";
  const star = cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (star) return decodeURIComponent(star[1].replace(/"/g, ""));
  const plain = cd.match(/filename="?([^";]+)"?/i);
  if (plain) return plain[1];
  try {
    const last = decodeURIComponent(new URL(res.url).pathname.split("/").pop() ?? "");
    if (/\.[a-z0-9]{2,5}$/i.test(last)) return last;
  } catch { /* ignore */ }
  return fallback;
}

// ---------------------------------------------------------------- handlers
async function handleTicket(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Please sign in" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: claims, error } = await userClient.auth.getClaims(auth.slice(7));
  const userId = claims?.claims?.sub;
  if (error || !userId) return json({ error: "Please sign in" }, 401);

  const body = await req.json().catch(() => ({}));
  const fileId = String(body?.fileId ?? "");
  if (!UUID_RE.test(fileId)) return json({ error: "Invalid fileId" }, 400);

  const { data: sub } = await admin.from("pro_subscriptions")
    .select("expires_at").eq("user_id", userId).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!sub) return json({ error: "Pro is not active" }, 403);

  const { data: game } = await admin.from("games").select("id, download_url_pro").eq("id", fileId).maybeSingle();
  if (!game?.download_url_pro) return json({ error: "No Pro file for this game" }, 404);

  const t = await signTicket(fileId, userId);
  return json({ url: `${SUPABASE_URL}/functions/v1/download?fileId=${fileId}&t=${encodeURIComponent(t)}` });
}

async function handleStream(req: Request) {
  const u = new URL(req.url);
  const fileId = u.searchParams.get("fileId") ?? "";
  const ticket = u.searchParams.get("t") ?? "";
  if (!UUID_RE.test(fileId)) return new Response("Invalid fileId", { status: 400, headers: corsHeaders });
  if (!(await verifyTicket(ticket, fileId))) {
    return new Response("Download link expired. Go back and click Download again.", { status: 403, headers: corsHeaders });
  }

  const { data: game } = await admin.from("games")
    .select("title, download_url_pro").eq("id", fileId).maybeSingle();
  if (!game?.download_url_pro) return new Response("File not found", { status: 404, headers: corsHeaders });

  const range = req.headers.get("Range");
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await openUpstream(game.download_url_pro, range, attempt > 0);
      if ((upstream.ok || upstream.status === 206) && !looksLikePage(upstream)) break;
      await upstream.body?.cancel();
    } catch (e) {
      console.error("upstream attempt", attempt, e);
    }
    upstream = null;
  }
  if (!upstream) {
    return new Response("The file host did not return the game file. Please try again in a minute.", {
      status: 502, headers: corsHeaders,
    });
  }

  const safeTitle = (game.title || "game").replace(/[^\w.\- ]+/g, "").trim() || "game";
  const filename = pickFilename(upstream, `${safeTitle}.rar`);
  const out = new Headers({
    ...corsHeaders,
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "no-store",
    "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
  });
  const len = upstream.headers.get("content-length");
  if (len) out.set("Content-Length", len);
  const cr = upstream.headers.get("content-range");
  if (cr) out.set("Content-Range", cr);

  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers: out });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method === "POST") return await handleTicket(req);
    if (req.method === "GET" || req.method === "HEAD") return await handleStream(req);
    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("download error", e);
    return json({ error: e instanceof Error ? e.message : "Download failed" }, 500);
  }
});
