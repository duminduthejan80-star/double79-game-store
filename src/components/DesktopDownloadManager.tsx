import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { useDesktopDownloads } from "@/hooks/useDesktopDownloads";

/** Small pill above the AI Support button showing the active download %. */
const DesktopDownloadManager = () => {
  const { available, items } = useDesktopDownloads();
  if (!available) return null;
  const active = items.filter((i) => i.status === "downloading" || i.status === "resolving");
  if (active.length === 0) return null;
  const top = active[0];

  return (
    <Link
      to="/downloads"
      className="fixed bottom-20 right-5 z-[60] flex w-60 items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.07] px-3 py-2 text-xs shadow-elevated backdrop-blur-2xl transition-transform hover:scale-105"
      aria-label="Open downloads"
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-gradient">
        <Download className="h-4 w-4 animate-bounce text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{top.title}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-primary-gradient transition-all" style={{ width: `${top.percent}%` }} />
        </div>
      </div>
      <span className="font-mono font-bold tabular-nums">
        {top.status === "resolving" ? "…" : `${top.percent.toFixed(0)}%`}
      </span>
      {active.length > 1 && <span className="text-muted-foreground">+{active.length - 1}</span>}
    </Link>
  );
};

export default DesktopDownloadManager;
