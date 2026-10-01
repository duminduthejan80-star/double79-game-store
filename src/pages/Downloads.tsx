import { Download, FolderOpen, X, Loader2, Monitor, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useDesktopDownloads } from "@/hooks/useDesktopDownloads";
import {
  cancelDesktopDownload,
  removeDesktopDownload,
  openDownloadFolder,
  formatMB,
  formatTimeLeft,
  type DesktopDownload,
} from "@/lib/desktopBridge";

const Row = ({ item }: { item: DesktopDownload }) => {
  const active = item.status === "downloading" || item.status === "resolving";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{item.title}</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {item.status === "resolving" && <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>}
            {item.status === "downloading" && <><Download className="h-4 w-4 text-primary" /> Downloading</>}
            {item.status === "completed" && <><CheckCircle2 className="h-4 w-4 text-primary" /> Completed</>}
            {(item.status === "failed" || item.status === "cancelled") && (
              <><XCircle className="h-4 w-4 text-destructive" /> {item.status === "failed" ? `Failed ${item.error ? "· " + item.error : ""}` : "Cancelled"}</>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {item.status === "completed" && (
            <Button size="icon" variant="ghost" onClick={() => openDownloadFolder(item.path)} aria-label="Open folder">
              <FolderOpen className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => (active ? cancelDesktopDownload(item.id) : removeDesktopDownload(item.id))}
            aria-label={active ? "Cancel" : "Remove"}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-primary-gradient transition-all" style={{ width: `${item.percent}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Complete" value={`${item.percent.toFixed(1)}%`} />
        <Stat label="Downloaded" value={`${formatMB(item.receivedBytes)}${item.totalBytes ? " / " + formatMB(item.totalBytes) : ""}`} />
        <Stat label="Speed" value={item.status === "downloading" ? `${item.speedMBps.toFixed(2)} MB/s` : "—"} />
        <Stat label="Time left" value={item.status === "downloading" ? formatTimeLeft(item.timeLeft) : "—"} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-white/[0.04] p-2.5">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-mono font-bold tabular-nums">{value}</div>
  </div>
);

const Downloads = () => {
  const { available, items } = useDesktopDownloads();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold">Downloads</h1>
        <p className="mb-8 text-sm text-muted-foreground">Pro downloads with live progress, speed and time left.</p>

        {!available ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
            <Monitor className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold">Live progress works in the Double79 PC app</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              On the website, Pro downloads start straight in your browser. Open the PC app to see
              % complete, MB downloaded, speed and time left here.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-muted-foreground">
            No downloads yet. Pick a game and choose Pro download.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((i) => <Row key={i.id} item={i} />)}
          </div>
        )}
      </main>
    </div>
  );
};

export default Downloads;
