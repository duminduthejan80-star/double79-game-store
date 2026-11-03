import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Crown, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminProManager({ onSaved }: { onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [expiry, setExpiry] = useState("");
  const [lifetime, setLifetime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const qc = useQueryClient();
  const save = async (action: "dated" | "lifetime" | "revoke") => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("Enter a registered email address");
    const date = new Date(expiry);
    if (action === "dated" && (!expiry || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) return toast.error("Choose a future expiry date");
    if (action === "revoke" && !confirm(`Remove Pro access for ${email.trim()}?`)) return;
    setBusy(true);
    setResult("");
    const { error } = await supabase.rpc("manage_pro_by_email", {
      _email: email.trim(), _action: action,
      ...(action === "dated" ? { _expires_at: date.toISOString() } : {}),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const message = action === "revoke" ? `Pro removed for ${email.trim()}` : action === "lifetime" ? `Lifetime Pro active for ${email.trim()}` : `Pro active until ${date.toLocaleString()} for ${email.trim()}`;
    setResult(message);
    toast.success(message);
    qc.invalidateQueries({ queryKey: ["pro-status"] });
    onSaved();
  };
  return (
    <form className="space-y-4 border-b border-border py-6" onSubmit={(e) => { e.preventDefault(); void save(lifetime ? "lifetime" : "dated"); }}>
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Crown className="h-5 w-5 text-accent" /> Manage Pro access</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="pro-email">Registered email</Label><Input id="pro-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@example.com" /></div>
        <div className="space-y-2"><Label htmlFor="pro-expiry">Expiry date and time</Label><Input id="pro-expiry" type="datetime-local" disabled={lifetime} required={!lifetime} value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-3"><Switch id="pro-lifetime" checked={lifetime} onCheckedChange={setLifetime} /><Label htmlFor="pro-lifetime">Lifetime Pro</Label></div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} type="submit"><Crown className="mr-2 h-4 w-4" />{busy ? "Saving…" : "Activate / update Pro"}</Button>
        <Button disabled={busy} type="button" variant="outline" className="text-destructive" onClick={() => void save("revoke")}><ShieldOff className="mr-2 h-4 w-4" /> Remove Pro</Button>
      </div>
      {result && <p role="status" className="text-sm text-accent">{result}</p>}
    </form>
  );
}