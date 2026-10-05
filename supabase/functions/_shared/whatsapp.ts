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

export async function sendGreenApiText(to: string, message: string) {
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
