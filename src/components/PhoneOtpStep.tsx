import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("phone-otp", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error || msg; } catch { /* ignore */ }
    }
    throw new Error(msg);
  }
  return data;
}

const PhoneOtpStep = ({ onVerified }: { onVerified: () => void }) => {
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await call({ action: "send", phone });
      setSentTo(r.phone);
      setWait(60);
      toast.success("Code sent to your WhatsApp");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true);
    try {
      await call({ action: "verify", code });
      toast.success("Phone number verified");
      onVerified();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  if (!sentTo) {
    return (
      <div className="text-left mt-2 space-y-3">
        <div>
          <Label>WhatsApp number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="070 496 2595" maxLength={20} autoFocus inputMode="tel" />
        </div>
        <Button className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90" disabled={busy || wait > 0} onClick={send}>
          {wait > 0 ? `Wait ${wait}s` : "Send code on WhatsApp"}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-left mt-2 space-y-3">
      <p className="text-sm text-muted-foreground">Enter the 6-digit code we sent to <b className="text-foreground">{sentTo}</b> on WhatsApp.</p>
      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" className="text-center text-2xl tracking-[0.5em]" autoFocus />
      <Button className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90" disabled={busy || code.length !== 6} onClick={verify}>Verify</Button>
      <div className="flex justify-between text-xs">
        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setSentTo(null); setCode(""); }}>Change number</button>
        <button type="button" className="text-primary disabled:opacity-50" disabled={wait > 0 || busy} onClick={send}>
          {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
};

export default PhoneOtpStep;
