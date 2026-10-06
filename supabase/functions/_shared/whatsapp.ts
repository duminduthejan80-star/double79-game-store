// Sends WhatsApp messages through the connected Meta Business number,
// with Green-API as a backup for verification codes.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

export function normalizePhone(input: string): string | null {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "94" + d.slice(1); // Sri Lanka local
  if (d.length === 9 && d.startsWith("7")) d = "94" + d;
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export async function sendTemplate(
  to: string,
  name: string,
  bodyParams: string[],
  extraComponents: unknown[] = [],
): Promise<{ ok: boolean; status: number; body: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
  if (!LOVABLE_API_KEY || !WHATSAPP_API_KEY) {
    return { ok: false, status: 500, body: "WhatsApp is not configured" };
  }
  const components: unknown[] = [];
  if (bodyParams.length) {
    components.push({ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) });
  }
  components.push(...extraComponents);
  const res = await fetch(`${GATEWAY_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": WHATSAPP_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name, language: { code: "en_US" }, components },
    }),
  });
  const body = await res.text();
  if (!res.ok) console.error(`WhatsApp template ${name} failed [${res.status}]: ${body}`);
  return { ok: res.ok, status: res.status, body };
}

async function tryGreen(to: string, message: string) {
  const id = Deno.env.get("greenapi_instance_id");
  const token = Deno.env.get("greenapi_token");
  if (!id || !token) return { ok: false, body: "Green-API not configured" };
  const res = await fetch(`https://api.green-api.com/waInstance${id}/sendMessage/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: `${to}@c.us`, message }),
  });
  const body = await res.text();
  if (!res.ok) console.error(`Green-API send failed [${res.status}]: ${body}`);
  return { ok: res.ok, body };
}

async function tryWaapi(to: string, message: string) {
  const id = Deno.env.get("WAAPI_INSTANCE_ID");
  const token = Deno.env.get("WAAPI_TOKEN");
  if (!id || !token) return { ok: false, body: "WaAPI not configured" };
  const res = await fetch(`https://waapi.app/api/v1/instances/${id}/client/action/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ chatId: `${to}@c.us`, message }),
  });
  const body = await res.text();
  const ok = res.ok && !/"status"\s*:\s*"error"/.test(body);
  if (!ok) console.error(`WaAPI send failed [${res.status}]: ${body}`);
  return { ok, body };
}

async function tryWhapi(to: string, message: string) {
  const token = Deno.env.get("WHAPI_TOKEN");
  if (!token) return { ok: false, body: "Whapi not configured" };
  const res = await fetch("https://gate.whapi.cloud/messages/text", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, body: message }),
  });
  const body = await res.text();
  if (!res.ok) console.error(`Whapi send failed [${res.status}]: ${body}`);
  return { ok: res.ok, body };
}

/** Backup senders for plain text, tried in order until one works. */
export async function sendGreenApiText(to: string, message: string) {
  for (const fn of [tryGreen, tryWhapi, tryWaapi]) {
    try {
      const r = await fn(to, message);
      if (r.ok) return r;
    } catch (e) { console.error("backup sender error", e); }
  }
  return { ok: false, body: "All backup senders failed" };
}

/** Checks which backup senders are connected, without sending anything. */
export async function backupHealth() {
  const out: Record<string, number | string> = {};
  const w = Deno.env.get("WHAPI_TOKEN");
  out.whapi = w ? (await fetch("https://gate.whapi.cloud/health", { headers: { Authorization: `Bearer ${w}` } }).then(async (r) => `${r.status} ${(await r.text()).slice(0, 120)}`)) : "missing";
  const wi = Deno.env.get("WAAPI_INSTANCE_ID"), wt = Deno.env.get("WAAPI_TOKEN");
  out.waapi = wi && wt ? (await fetch(`https://waapi.app/api/v1/instances/${wi}/client/status`, { headers: { Authorization: `Bearer ${wt}` } }).then(async (r) => `${r.status} ${(await r.text()).slice(0, 120)}`)) : "missing";
  const gi = Deno.env.get("greenapi_instance_id"), gt = Deno.env.get("greenapi_token");
  out.green = gi && gt ? (await fetch(`https://api.green-api.com/waInstance${gi}/getStateInstance/${gt}`).then(async (r) => `${r.status} ${await r.text()}`)) : "missing";
  return out;
}
