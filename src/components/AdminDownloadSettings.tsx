import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Gauge } from "lucide-react";
import { toast } from "sonner";

export default function AdminDownloadSettings() {
  const [speed, setSpeed] = useState("0");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("download_settings").select("free_speed_mbps").eq("id", true).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message);
      else setSpeed(String(data?.free_speed_mbps ?? 0));
      setBusy(false);
    });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(speed);
    if (!speed.trim() || !Number.isFinite(value) || value < 0 || value > 10000) return toast.error("Enter a speed between 0 and 10000 MB/s");
    setBusy(true);
    const { error } = await supabase.from("download_settings").upsert({ id: true, free_speed_mbps: value, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Free speed saved for new PC downloads");
  };
  return (
    <form onSubmit={save} className="max-w-lg space-y-4 py-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Gauge className="h-5 w-5 text-primary" /> Free download speed</h2>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="free-speed">Limit (MB/s)</Label>
        <Input id="free-speed" type="number" min="0" max="10000" step="0.1" required value={speed} onChange={(e) => setSpeed(e.target.value)} />
        <p className="text-sm text-muted-foreground">0 = unlimited · Pro = unlimited · Applies to new PC downloads</p>
      </div>
      <Button disabled={busy || !!error} type="submit"><Save className="mr-2 h-4 w-4" />{busy ? "Saving…" : "Save speed limit"}</Button>
    </form>
  );
}