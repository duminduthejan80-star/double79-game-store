import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Download, Gauge, ShieldAlert, ShieldCheck, Zap, BadgeX, Upload, Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProStatus, useInvalidatePro } from "@/hooks/usePro";
import { toast } from "sonner";

const RELOAD_NUMBER = "0704962595";
const RELOAD_AMOUNT = 200;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  freeUrl: string | null;
  proUrl: string | null;
  onPick: (url: string, tier: "free" | "pro") => void;
}

type Verdict = { status: "accepted" | "rejected"; reason?: string | null } | null;

const DownloadChoiceDialog = ({ open, onOpenChange, freeUrl, proUrl, onPick }: Props) => {
  const { data: pro } = useProStatus();
  const invalidatePro = useInvalidatePro();
  const [showPay, setShowPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setShowPay(false);
    setPreview(null);
    setVerdict(null);
  };

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
    setVerdict(null);
    setPreview(null);
    setShowPay(true);
  };

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Upload an image of the receipt");
    if (file.size > 8_000_000) return toast.error("Image too large (max 8MB)");
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setVerdict(null);
  };

  const submitReceipt = async () => {
    if (!preview) return toast.error("Upload the receipt photo first");
    setBusy(true);
    setVerdict(null);
    const { data, error } = await supabase.functions.invoke("pro-receipt", { body: { image: preview } });
    setBusy(false);
    if (error && !data) {
      setVerdict({ status: "rejected", reason: "Could not verify right now — try again" });
      return;
    }
    if (data?.status === "accepted") {
      setVerdict({ status: "accepted" });
      invalidatePro();
      return;
    }
    setVerdict({ status: "rejected", reason: data?.reason || "Receipt rejected" });
  };

  const continuePro = () => {
    const url = proUrl || freeUrl;
    reset();
    if (url) {
      onPick(url, "pro");
      onOpenChange(false);
    } else {
      toast.error("No pro download link available");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {showPay ? "Activate Pro" : "Choose your download"}
          </DialogTitle>
        </DialogHeader>

        {!showPay ? (
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
                <span className="text-sm font-semibold text-foreground">- 1 month</span>
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
          <div className="pt-2 max-w-md mx-auto text-center">
            <Crown className="h-10 w-10 text-amber-300 mx-auto mb-3" />

            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/[0.07] p-4 text-left">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Smartphone className="h-4 w-4" /> Step 1 — Reload
              </div>
              <p className="mt-2 text-sm text-amber-100/90">
                Do a <b>Mobitel normal money reload of Rs.{RELOAD_AMOUNT}</b> to this number:
              </p>
              <div className="mt-2 text-2xl font-bold tracking-widest text-amber-200">{RELOAD_NUMBER}</div>
              <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/15 p-2 text-xs font-bold text-destructive">
                WARNING: reload eka dana davasema risit ekath meketa upload karala Pro active kara ganna. Anit davasaka risit ekak accept venne na.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
              <div className="flex items-center gap-2 font-bold">
                <Upload className="h-4 w-4" /> Step 2 — Upload the receipt
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a clear photo of the reload receipt. It is checked automatically.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
              />

              {preview ? (
                <img src={preview} alt="Uploaded reload receipt" className="mt-3 max-h-56 w-full rounded-xl object-contain bg-black/30" />
              ) : null}

              <Button variant="outline" className="w-full mt-3" onClick={() => fileRef.current?.click()}>
                {preview ? "Choose a different photo" : "Upload receipt photo"}
              </Button>
            </div>

            {verdict?.status === "rejected" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/15 p-3 text-left text-sm font-bold text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <span className="uppercase tracking-wide">{verdict.reason}</span>
              </div>
            )}

            {verdict?.status === "accepted" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-400/15 p-3 text-left text-sm font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                PRO ACTIVE NOW — 30 days
              </div>
            )}

            {verdict?.status === "accepted" ? (
              <Button className="w-full mt-3 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold" onClick={continuePro}>
                Continue to Pro download
              </Button>
            ) : (
              <Button
                className="w-full mt-3 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold"
                disabled={busy || !preview}
                onClick={submitReceipt}
              >
                {busy ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking receipt...</>) : "Submit receipt"}
              </Button>
            )}

            <button
              type="button"
              onClick={reset}
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
