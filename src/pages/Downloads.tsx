import { Link } from "react-router-dom";
import { Download, X, Trash2, Inbox } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useDownloads, formatBytes, formatSpeed, formatEta, type DownloadItem } from "@/lib/downloads";

const statusVariant = (s: DownloadItem["status"]) => {
  switch (s) {
    case "downloading": return "default";
    case "completed": return "secondary";
    case "failed":
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

const Downloads = () => {
  const { items, cancel, remove, clearCompleted } = useDownloads();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Download className="h-7 w-7 text-primary" /> Downloads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Live progress, speed and ETA — Steam-style.</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearCompleted}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear finished
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card-gradient p-16 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">No downloads yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Start a download from a game page to see live progress here.</p>
            <Button asChild><Link to="/">Browse store</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const pct = item.totalBytes ? Math.min(100, (item.receivedBytes / item.totalBytes) * 100) : 0;
              const active = item.status === "downloading" || item.status === "queued";
              return (
                <div key={item.id} className="rounded-lg border border-border bg-card-gradient p-4 shadow-card">
                  <div className="flex gap-4">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="h-20 w-32 object-cover rounded-md flex-shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={statusVariant(item.status) as any} className="capitalize">
                              {item.status}
                            </Badge>
                            {item.simulated && active && (
                              <span className="text-[11px] text-muted-foreground">estimated progress</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => (active ? cancel(item.id) : remove(item.id))}
                          aria-label={active ? "Cancel" : "Remove"}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
                        <div>
                          <div className="text-muted-foreground">Progress</div>
                          <div className="font-medium">{pct.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Downloaded</div>
                          <div className="font-medium">
                            {formatBytes(item.receivedBytes)}{item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ""}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Speed</div>
                          <div className="font-medium">{item.status === "downloading" ? formatSpeed(item.speed) : "—"}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">ETA</div>
                          <div className="font-medium">{formatEta(item)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Downloads;
