import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { normalizeMobilePhone, PHONE_ERROR } from "@/lib/phone";
import { toast } from "sonner";

const PhoneNumberStep = ({ onSaved }: { onSaved: () => void }) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeMobilePhone(phone);
    if (!normalized) { setError(PHONE_ERROR); return; }
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: saveError } = await supabase.from("profiles")
        .update({ phone: normalized }).eq("id", user.id).select("phone").single();
      if (saveError) throw saveError;
      if (data.phone !== normalized) throw new Error("Number was not saved. Please try again.");
      toast.success("Phone number saved");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save phone number");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="text-left mt-2 space-y-3">
      <div>
        <Label htmlFor="required-phone">WhatsApp number</Label>
        <Input id="required-phone" value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }} placeholder="070 496 2595" maxLength={20} autoFocus inputMode="tel" autoComplete="tel" aria-invalid={!!error} aria-describedby={error ? "phone-error" : undefined} />
      </div>
      {error && <p id="phone-error" role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full bg-primary-gradient text-primary-foreground hover:opacity-90" disabled={busy}>{busy ? "Saving..." : "Save number"}</Button>
    </form>
  );
};

export default PhoneNumberStep;