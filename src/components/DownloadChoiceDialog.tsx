import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Download, Gauge, ShieldAlert, ShieldCheck, MessageCircle, Zap, BadgeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProStatus, useInvalidatePro } from "@/hooks/usePro";
import { toast } from "sonner";

const OWNER_WA = "94704962595";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  freeUrl: string | null;
  proUrl: string | null;
  onPick: (url: string, tier: "free" | "pro") => void;
}

const DownloadChoiceDialog = ({ open, onOpenChange, freeUrl, proUrl, onPick }: Props) => {
  const { data: pro } = useProStatus();
  const invalidatePro = useInvalidatePro();
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFree = () => {
    if (!freeUrl) return toast.error("No free download link available");
    onPick(freeUrl, "free");
    onOpenChange(false);
  };

  const pickPro = () => {
    if (pro?.isPro) {
      const url = proUrl || freeUrl;
      if (!url) return toast.error("No pro download link available");
      onPick(url, "pro");
      onOpenChange(false);
      return;
    }
    setShowCode(true);
  };

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return toast.error("Enter the code you received");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("pro-redeem", { body: { code: c } });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "Invalid or expired code");
      return;
    }
    toast.success("Pro activated for 30 days 🎉");
    invalidatePro();
    setShowCode(false);
    setCode("");
    const url = proUrl || freeUrl;
    if (url) {
      onPick(url, "pro");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setShowCode(false); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Choose your download</DialogTitle>
        </DialogHeader>

        {!showCode ? (
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {/* FREE */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-bold">Free</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                <li className="flex gap-2"><Gauge className="h-4 w-4 mt-0.5 shrink-0" /> Very slow download speed</li>
                <li className="flex gap-2"><ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" /> Ads on the download page</li>
                <li className="flex gap-2"><BadgeX className="h-4 w-4 mt-0.5 shrink-0" /> Higher chance of game errors</li>
                <li className="flex gap-2"><ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" /> No priority support</li>
              </ul>
              <Button variant="outline" className="w-full mt-5" onClick={pickFree}>
                Download Free
              </Button>
            </div>

            {/* PRO */}
            <div className="relative rounded-2xl border border-amber-300/40 bg-amber-400/[0.06] p-5 flex flex-col backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-amber-300" />
                <span className="text-lg font-bold text-amber-300">Pro</span>
                {pro?.isPro && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Active · {pro.daysLeft}d left
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-amber-100/80 flex-1">
                <li className="flex gap-2"><Zap className="h-4 w-4 mt-0.5 shrink-0" /> Very fast download speed</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> No ads</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> No errors — tested builds</li>
                <li className="flex gap-2"><Crown className="h-4 w-4 mt-0.5 shrink-0" /> Priority support</li>
              </ul>
              <Button
                className="w-full mt-5 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold"
                onClick={pickPro}
              >
                {pro?.isPro ? "Download Pro" : "Get Pro Download"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-2 max-w-sm mx-auto text-center">
            <Crown className="h-10 w-10 text-amber-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Enter your Pro code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your account is not Pro yet. Enter the activation code below.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={12}
              className="text-center text-xl tracking-[0.4em] font-bold"
              autoFocus
            />
            <Button
              className="w-full mt-3 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold"
              disabled={busy}
              onClick={redeem}
            >
              Activate Pro
            </Button>
            <a
              href={`https://wa.me/${OWNER_WA}?text=${encodeURIComponent("game store pro code please")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[hsl(142_70%_45%)]/50 px-4 py-2.5 text-sm font-bold text-[hsl(142_70%_55%)] hover:bg-[hsl(142_70%_45%)]/10"
            >
              <MessageCircle className="h-4 w-4" /> Get a code
            </a>
            <button
              type="button"
              onClick={() => setShowCode(false)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DownloadChoiceDialog;
