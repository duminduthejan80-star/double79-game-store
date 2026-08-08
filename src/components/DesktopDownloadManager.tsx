import { useEffect, useState } from "react";
import { Download, X, FolderOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  listDesktopDownloads,
  cancelDesktopDownload,
  removeDesktopDownload,
  openDownloadFolder,
  formatMB,
  formatTimeLeft,
  waitForDesktop,
  type DesktopDownload,
} from "@/lib/desktopBridge";

const statusLabel: Record<DesktopDownload["status"], string> = {
  resolving: "Preparing link…",
  downloading: "Downloading",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const Row = ({ item }: { item: DesktopDownload }) => {
  const active = item.status === "downloading" || item.status === "resolving";
  return (
    <div className="rounded-md border border-border/60 bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {item.status === "resolving" && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{statusLabel[item.status]}</span>
            {item.status === "downloading" && <span>· {item.percent.toFixed(1)}%</span>}
            {item.error && <span className="text-destructive truncate">· {item.error}</span>}
          </div>
        </div>
        {item.status === "completed" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => openDownloadFolder(item.path)}
            aria-label="Open folder"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => (active ? cancelDesktopDownload(item.id) : removeDesktopDownload(item.id))}
          aria-label={active ? "Cancel" : "Remove"}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Progress value={item.percent} className="h-2" />

      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums font-mono">
        <span>
          {formatMB(item.receivedBytes)}
          {item.totalBytes ? ` / ${formatMB(item.totalBytes)}` : ""}
        </span>
        <span>
          {item.status === "downloading" ? `${item.speedMBps.toFixed(2)} MB/s` : "—"} · ETA{" "}
          {item.status === "downloading" ? formatTimeLeft(item.timeLeft) : "—"}
        </span>
      </div>
    </div>
  );
};

const DesktopDownloadManager = () => {
  const [available, setAvailable] = useState(false);
  const [items, setItems] = useState<DesktopDownload[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    waitForDesktop().then((ok) => !cancelled && setAvailable(ok));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!available) return;
    let stop = false;
    const tick = async () => {
      const list = await listDesktopDownloads();
      if (!stop) setItems(list);
    };
    tick();
    const id = window.setInterval(tick, 500);
    const onStart = () => tick();
    window.addEventListener("d79:download-started", onStart);
    return () => {
      stop = true;
      window.clearInterval(id);
      window.removeEventListener("d79:download-started", onStart);
    };
  }, [available]);

  if (!available || items.length === 0) return null;

  const active = items.filter((i) => i.status === "downloading" || i.status === "resolving").length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-lg border border-border bg-card-gradient shadow-elevated overflow-hidden backdrop-blur-sm">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-1 hover:bg-surface-3 transition-smooth"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-gradient">
              <Download className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">Download Manager</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {active > 0 ? `${active} active` : `${items.length} item${items.length > 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {open && (
          <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto">
            {items.map((i) => (
              <Row key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopDownloadManager;
