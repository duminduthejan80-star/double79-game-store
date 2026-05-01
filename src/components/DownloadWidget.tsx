import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDownloads, formatBytes, formatSpeed, formatEta, type DownloadItem } from "@/lib/downloads";
import { cn } from "@/lib/utils";

const statusLabel: Record<DownloadItem["status"], string> = {
  queued: "Queued",
  downloading: "Downloading",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  external: "Handled by browser",
};

const Row = ({ item }: { item: DownloadItem }) => {
  const { cancel, remove } = useDownloads();
  const pct = item.totalBytes ? Math.min(100, (item.receivedBytes / item.totalBytes) * 100) : 0;
  const active = item.status === "downloading" || item.status === "queued";
  return (
    <div className="rounded-md border border-border/60 bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{statusLabel[item.status]}</span>
            {item.simulated && active && <span className="text-accent">(estimated)</span>}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => (active ? cancel(item.id) : remove(item.id))}
          aria-label={active ? "Cancel" : "Remove"}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          {formatBytes(item.receivedBytes)}
          {item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ""}
        </span>
        <span>
          {item.status === "downloading" ? formatSpeed(item.speed) : "—"} · ETA {formatEta(item)}
        </span>
      </div>
    </div>
  );
};

const DownloadWidget = () => {
  const { items, clearCompleted } = useDownloads();
  const [open, setOpen] = useState(true);

  if (items.length === 0) return null;

  const active = items.filter((i) => i.status === "downloading" || i.status === "queued").length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-lg border border-border bg-card-gradient shadow-elevated overflow-hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-1 hover:bg-surface-3 transition-smooth"
        >
          <div className="flex items-center gap-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-primary-gradient", active > 0 && "shadow-glow")}>
              <Download className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">Downloads</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {active > 0 ? `${active} active` : `${items.length} item${items.length > 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
            {items.slice(0, 4).map((i) => (
              <Row key={i.id} item={i} />
            ))}
            <div className="flex items-center justify-between pt-1">
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link to="/downloads">
                  <ExternalLink className="h-3 w-3 mr-1" /> View all
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearCompleted}>
                Clear finished
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadWidget;
