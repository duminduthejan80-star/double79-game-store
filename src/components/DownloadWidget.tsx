import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, X, ExternalLink, Loader2 } from "lucide-react";
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
  
  // 🚀 Real-time Tracking States
  const [realProgress, setRealProgress] = useState(0);
  const [realReceived, setRealReceived] = useState(0);
  const [realTotal, setRealTotal] = useState(0);
  const [realSpeed, setRealSpeed] = useState(0);
  const [realEta, setRealEta] = useState(0);
  
  // 🤖 Bot States
  const [isBotFindingLink, setIsBotFindingLink] = useState(false);
  const [botDownloadStarted, setBotDownloadStarted] = useState(false);

  useEffect(() => {
    if (item.status === "downloading" && !botDownloadStarted) {
      const runGofileBotAndDownload = async () => {
        setIsBotFindingLink(true);
        let directDownloadUrl = item.url;

        // 🤖 BOT ACTION: Gofile වෙබ් ලින්ක් එකක් නම් විතරක් ඇතුළට රිංගලා ඩිරෙක්ට් ලින්ක් එක ගලවනවා
        if (item.url.includes("gofile.io/d/")) {
          try {
            const folderId = item.url.split("/d/")[1];
            
            // CORS bypass කරලා Gofile API එකට හොරෙන් රිංගනවා
            const botApiUrl = `https://cors-anywhere.herokuapp.com/https://api.gofile.io/contents/${folderId}?wt=4019c11e84ab1b66beae1d78828a2f4a`;
            
            const response = await fetch(botApiUrl);
            const data = await response.json();

            if (data.status === "ok" && data.data && data.data.contents) {
              const fileId = Object.keys(data.data.contents)[0];
              directDownloadUrl = data.data.contents[fileId].link; // බොටා හොයාගත්තු රියල් ඩිරෙක්ට් ලින්ක් එක
              console.log("🤖 Bot Successfully Found Direct Link:", directDownloadUrl);
            }
          } catch (e) {
            console.error("🤖 Bot failed to bypass Gofile, falling back to original url", e);
          }
        }

        setIsBotFindingLink(false);
        setBotDownloadStarted(true);

        // 📈 100% REAL DOWNLOAD & SPEED TRACKING WITH XHR
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        
        // Proxy එක හරහා රියල් ස්ට්‍රීම් එක බ්‍රවුසර් එකට ඇදලා ගන්නවා
        const proxyStreamUrl = `https://cors-anywhere.herokuapp.com/${directDownloadUrl}`;
        
        xhr.open("GET", proxyStreamUrl, true);
        xhr.responseType = "blob";

        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            setRealReceived(event.loaded);
            setRealTotal(event.total);

            const percent = (event.loaded / event.total) * 100;
            setRealProgress(percent);

            const durationInSeconds = (Date.now() - startTime) / 1000;
            const speedBytes = durationInSeconds > 0 ? event.loaded / durationInSeconds : 0;
            setRealSpeed(speedBytes);

            const remainingBytes = event.total - event.loaded;
            const etaSeconds = speedBytes > 0 ? remainingBytes / speedBytes : 0;
            setRealEta(etaSeconds);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const blob = xhr.response;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = item.title || "game-download.zip";
            a.click();
            setBotDownloadStarted(false);
          }
        };

        xhr.onerror = () => {
          // මොකක් හරි ලෙඩක් ආවොත් ගේම් එක හිර කරන්නේ නැතුව බ්‍රවුසර් එකටම තල්ලු කරනවා සේෆ්ටි එකට
          window.open(item.url, "_blank");
          setBotDownloadStarted(false);
        };

        xhr.send();
      };

      runGofileDownload();
    }
  }, [item.status, item.url, botDownloadStarted]);

  const active = item.status === "downloading" || item.status === "queued";
  const pct = item.status === "downloading" ? realProgress : (item.totalBytes ? Math.min(100, (item.receivedBytes / item.totalBytes) * 100) : 0);

  return (
    <div className="rounded-md border border-border/60 bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.title}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>{statusLabel[item.status]}</span>
            {isBotFindingLink && (
              <span className="text-amber-400 flex items-center gap-1 font-semibold">
                <Loader2 className="h-3 w-3 animate-spin" /> 🤖 Bot bypasses Gofile...
              </span>
            )}
            {item.status === "downloading" && !isBotFindingLink && (
              <span className="text-blue-400 font-bold">● 100% Real Live</span>
            )}
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

      <Progress value={pct} className="h-2 bg-slate-800" />
      
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums font-mono">
        <span>
          {item.status === "downloading" ? formatBytes(realReceived) : formatBytes(item.receivedBytes)}
          {realTotal ? ` / ${formatBytes(realTotal)}` : ""}
        </span>
        <span>
          {item.status === "downloading" ? formatSpeed(realSpeed) : "—"} · ETA {item.status === "downloading" ? `${Math.floor(realEta / 60)}m ${Math.floor(realEta % 60)}s` : formatEta(item)}
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
      <div className="rounded-lg border border-border bg-card-gradient shadow-elevated overflow-hidden backdrop-blur-sm">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-1 hover:bg-surface-3 transition-smooth"
        >
          <div className="flex items-center gap-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-primary-gradient", active > 0 && "shadow-glow")}>
              <Download className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold leading-tight">Downloads Store</div>
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
