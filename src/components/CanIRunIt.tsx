import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cpu,
  MemoryStick,
  Monitor,
  HardDrive,
  Settings2,
  ScanLine,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useHardwareProfile, compareSpecs, HardwareProfile } from "@/lib/hardwareProfile";
import { detectSpecs, DetectedSpecs } from "@/lib/autoDetectSpecs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  game: {
    min_cpu: string | null;
    min_gpu: string | null;
    min_ram: string | null;
    min_storage: string | null;
  };
}

const iconFor = (label: string) => {
  switch (label) {
    case "CPU":
      return <Cpu className="h-4 w-4" />;
    case "GPU":
      return <Monitor className="h-4 w-4" />;
    case "RAM":
      return <MemoryStick className="h-4 w-4" />;
    case "Storage":
      return <HardDrive className="h-4 w-4" />;
    default:
      return null;
  }
};

const ProfileEditor = ({ onSaved }: { onSaved?: () => void }) => {
  const { profile, setProfile } = useHardwareProfile();
  const [draft, setDraft] = useState<HardwareProfile>(profile);

  const update = <K extends keyof HardwareProfile>(k: K, v: HardwareProfile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    setProfile(draft);
    toast.success("Hardware profile updated");
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cpu" className="flex items-center gap-2"><Cpu className="h-4 w-4" /> CPU</Label>
        <Input id="cpu" placeholder="e.g. Intel Core i5-12400F" value={draft.cpu} onChange={(e) => update("cpu", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gpu" className="flex items-center gap-2"><Monitor className="h-4 w-4" /> GPU</Label>
        <Input id="gpu" placeholder="e.g. NVIDIA RTX 3060" value={draft.gpu} onChange={(e) => update("gpu", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ram" className="flex items-center gap-2"><MemoryStick className="h-4 w-4" /> RAM (GB)</Label>
          <Input id="ram" type="number" min={0} placeholder="16" value={draft.ram || ""} onChange={(e) => update("ram", parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="storage" className="flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage (GB)</Label>
          <Input id="storage" type="number" min={0} placeholder="500" value={draft.storage || ""} onChange={(e) => update("storage", parseFloat(e.target.value) || 0)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} className="w-full">Save profile</Button>
      </DialogFooter>
    </div>
  );
};

export const HardwareProfileDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" /> My PC specs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your hardware profile</DialogTitle>
          <DialogDescription>
            Saved locally on this device. Used to check if a game runs on your PC.
          </DialogDescription>
        </DialogHeader>
        <ProfileEditor onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

const mergeProfile = (manual: HardwareProfile, detected: DetectedSpecs | null): HardwareProfile => {
  if (!detected) return manual;
  return {
    cpu: manual.cpu || (detected.cores ? `${detected.cores}-core CPU` : ""),
    gpu: manual.gpu || detected.gpu || "",
    ram: manual.ram || detected.ram || 0,
    storage: manual.storage || 0,
  };
};

type ScanState = "idle" | "scanning" | "done" | "blocked";

const CanIRunIt = ({ game }: Props) => {
  const { profile, hasProfile } = useHardwareProfile();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [detected, setDetected] = useState<DetectedSpecs | null>(null);

  const runScan = () => {
    setScanState("scanning");
    setDetected(null);
    // 1s simulated scan animation for the high-tech feel
    window.setTimeout(() => {
      const d = detectSpecs();
      if (!d) {
        setScanState("blocked");
        return;
      }
      setDetected(d);
      setScanState("done");
    }, 1000);
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAnyReq = !!(game.min_cpu || game.min_gpu || game.min_ram || game.min_storage);
  if (!hasAnyReq) return null;

  // Scanning UI
  if (scanState === "scanning") {
    return (
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-5 backdrop-blur scan-sweep">
        <div className="flex items-center gap-3">
          <ScanLine className="h-5 w-5 text-primary scan-blink" />
          <div>
            <div className="font-semibold text-sm text-primary">Scanning system hardware…</div>
            <div className="text-xs text-muted-foreground">Reading GPU, CPU cores and memory</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground font-mono">
          <div className="scan-blink">› GPU.detect()</div>
          <div className="scan-blink">› CPU.cores()</div>
          <div className="scan-blink">› MEM.size()</div>
        </div>
      </div>
    );
  }

  if (scanState === "blocked") {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center justify-between gap-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-amber-400">Hardware scan blocked</div>
            <div className="text-xs text-muted-foreground">
              Your browser limited the auto-detection. Run it manually or set specs by hand.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={runScan}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Scan now
          </Button>
          <HardwareProfileDialog />
        </div>
      </div>
    );
  }

  const merged = mergeProfile(profile, detected);
  const hasAnything = hasProfile || !!detected;
  const report = compareSpecs(merged, game);

  if (!hasAnything) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 backdrop-blur p-4 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Can I run this game?</div>
            <div className="text-xs text-muted-foreground">Set your PC specs to check compatibility.</div>
          </div>
        </div>
        <HardwareProfileDialog />
      </div>
    );
  }

  const tone =
    report.overall === "pass"
      ? {
          ring: "ring-1 ring-emerald-500/40",
          bg: "bg-emerald-500/10",
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" />,
          title: "✅ Recommended: Your PC meets the requirements!",
          subtitle: "All components are equal to or better than required. Ready to install.",
          accent: "text-emerald-400",
        }
      : report.overall === "fail"
      ? {
          ring: "ring-1 ring-red-500/50",
          bg: "bg-red-500/10",
          icon: <XCircle className="h-6 w-6 text-red-400" />,
          title: "❌ Not recommended. Your PC lacks the minimum requirements.",
          subtitle: "See breakdown below for the missing component.",
          accent: "text-red-400",
        }
      : {
          ring: "ring-1 ring-amber-500/40",
          bg: "bg-amber-500/10",
          icon: <AlertCircle className="h-6 w-6 text-amber-400" />,
          title: "Compatibility partially checked.",
          subtitle: "Some specs couldn't be auto-detected.",
          accent: "text-amber-400",
        };

  return (
    <div className={cn("rounded-xl p-5 backdrop-blur animate-fade-in", tone.bg, tone.ring)}>
      <div className="flex items-start gap-4">
        <div className="shrink-0">{tone.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cn("font-semibold", tone.accent)}>{tone.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {tone.subtitle}
                {detected && (
                  <span className="ml-1 opacity-70">· auto-scanned in 1s</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={runScan} className="shrink-0">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Re-scan
              </Button>
              <HardwareProfileDialog
                trigger={
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <Settings2 className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                }
              />
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-2">
            {report.items.map((item) => {
              const ok = item.status === "pass";
              const fail = item.status === "fail";
              const warn = item.status === "unknown";
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-xs",
                    ok && "border-emerald-500/30 bg-emerald-500/5",
                    fail && "border-red-500/40 bg-red-500/5",
                    warn && "border-amber-500/40 bg-amber-500/5",
                    !ok && !fail && !warn && "border-border/60 bg-background/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 font-medium w-16 shrink-0",
                      ok && "text-emerald-400",
                      fail && "text-red-400",
                      warn && "text-amber-400",
                    )}
                  >
                    {iconFor(item.label)}
                    {item.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground truncate">
                      Requires <span className="text-foreground">{item.required}</span>
                    </div>
                    <div
                      className={cn(
                        "truncate",
                        fail ? "text-red-400" : warn ? "text-amber-400" : "text-muted-foreground",
                      )}
                    >
                      You have <span className="text-foreground">{item.yours}</span>
                      {warn && item.label === "GPU" && (
                        <span className="ml-1 opacity-80">· maybe compatible</span>
                      )}
                    </div>
                  </div>
                  {ok && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  {fail && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                  {warn && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanIRunIt;
