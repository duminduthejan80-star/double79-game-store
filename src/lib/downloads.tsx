import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled" | "external";

export interface DownloadItem {
  id: string;
  gameId?: string;
  title: string;
  url: string;
  imageUrl?: string;
  totalBytes: number; // 0 if unknown
  receivedBytes: number;
  speed: number; // bytes/sec
  status: DownloadStatus;
  startedAt: number;
  finishedAt?: number;
  simulated: boolean;
  error?: string;
}

type Action =
  | { type: "add"; item: DownloadItem }
  | { type: "update"; id: string; patch: Partial<DownloadItem> }
  | { type: "remove"; id: string }
  | { type: "clearCompleted" };

interface State { items: DownloadItem[]; }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "add":
      return { items: [action.item, ...state.items] };
    case "update":
      return {
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
      };
    case "remove":
      return { items: state.items.filter((i) => i.id !== action.id) };
    case "clearCompleted":
      return { items: state.items.filter((i) => i.status !== "completed" && i.status !== "cancelled" && i.status !== "failed") };
  }
};

interface Ctx {
  items: DownloadItem[];
  startDownload: (opts: { url: string; title: string; gameId?: string; imageUrl?: string; estimatedSizeMB?: number }) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
}

const DownloadCtx = createContext<Ctx | null>(null);

export const useDownloads = () => {
  const ctx = useContext(DownloadCtx);
  if (!ctx) throw new Error("useDownloads must be used inside DownloadsProvider");
  return ctx;
};

const newId = () => Math.random().toString(36).slice(2, 10);

export const DownloadsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const simTimers = useRef<Map<string, number>>(new Map());

  const stopSim = (id: string) => {
    const t = simTimers.current.get(id);
    if (t) {
      clearInterval(t);
      simTimers.current.delete(id);
    }
  };

  // Trigger the actual file download via a hidden iframe so the user stays
  // on the current page. The server responds with Content-Disposition:
  // attachment, which the browser handles without navigating.
  const triggerHiddenDownload = (url: string) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      // Clean up after a while; download has already started.
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* noop */ }
      }, 60_000);
    } catch (e) {
      console.warn("hidden download failed", e);
    }
  };

  // Steam-style simulated progress (real progress is impossible cross-origin
  // due to CORS — the browser owns the actual download stream).
  const startSimulatedProgress = (id: string, totalBytes: number) => {
    stopSim(id);
    const total = totalBytes > 0 ? totalBytes : 1.5 * 1024 * 1024 * 1024; // default 1.5 GB
    let received = 0;
    const startedAt = performance.now();
    dispatch({
      type: "update",
      id,
      patch: { totalBytes: total, status: "downloading", simulated: true, speed: 0 },
    });

    const timer = window.setInterval(() => {
      // Realistic curve: faster near start, slower near end.
      const remaining = total - received;
      const elapsed = (performance.now() - startedAt) / 1000;
      // base speed 4–12 MB/s with mild jitter
      const baseSpeed = (4 + Math.random() * 8) * 1024 * 1024;
      // ease out as we approach 100%
      const ease = Math.max(0.15, remaining / total);
      const speed = baseSpeed * ease;
      const tickBytes = Math.min(remaining, speed * 0.5); // 500ms tick
      received += tickBytes;

      if (received >= total - 1024) {
        received = total;
        dispatch({
          type: "update",
          id,
          patch: {
            receivedBytes: received,
            totalBytes: total,
            speed: 0,
            status: "completed",
            finishedAt: Date.now(),
          },
        });
        stopSim(id);
        return;
      }

      dispatch({ type: "update", id, patch: { receivedBytes: received, speed } });
      // Quiet: avoid using `elapsed` lint warn
      void elapsed;
    }, 500);

    simTimers.current.set(id, timer);
  };

  const startDownload: Ctx["startDownload"] = async ({ url, title, gameId, imageUrl, estimatedSizeMB }) => {
    if (!url) {
      toast.error("No download link available");
      return;
    }
    const id = newId();
    const item: DownloadItem = {
      id,
      gameId,
      title,
      url,
      imageUrl,
      totalBytes: estimatedSizeMB ? estimatedSizeMB * 1024 * 1024 : 0,
      receivedBytes: 0,
      speed: 0,
      status: "downloading",
      startedAt: Date.now(),
      simulated: true,
    };
    dispatch({ type: "add", item });
    toast.info(`Starting download: ${title}`);

    // Show the Steam-style progress bar immediately.
    startSimulatedProgress(id, item.totalBytes);

    // log download event (best-effort)
    if (gameId) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase.from("download_events").insert({
            user_id: data.user.id,
            game_id: gameId,
            game_title: title,
          }).then(({ error }) => { if (error) console.warn("download log failed", error.message); });
        }
      });
    }

    // Resolve share-page URLs (Gofile / Buzzheavier) into a fresh direct
    // link in the background, then start the actual file transfer via a
    // hidden iframe so the user never leaves this page.
    let resolvedUrl = url;
    const needsResolve = /gofile\.io|buzzheavier\.com/i.test(url);
    if (needsResolve) {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-download", {
          body: { url },
        });
        if (error) throw error;
        if (data?.direct) resolvedUrl = data.direct;
      } catch (e) {
        console.warn("resolve-download failed, using original url", e);
        toast.warning("Couldn't refresh link — trying original");
      }
    }

    dispatch({ type: "update", id, patch: { url: resolvedUrl } });
    triggerHiddenDownload(resolvedUrl);
  };

  const cancel = (id: string) => {
    stopSim(id);
    dispatch({ type: "update", id, patch: { status: "cancelled", speed: 0 } });
  };

  const remove = (id: string) => {
    stopSim(id);
    dispatch({ type: "remove", id });
  };

  const clearCompleted = () => dispatch({ type: "clearCompleted" });

  useEffect(() => {
    return () => {
      simTimers.current.forEach((t) => clearInterval(t));
      simTimers.current.clear();
    };
  }, []);

  return (
    <DownloadCtx.Provider value={{ items: state.items, startDownload, cancel, remove, clearCompleted }}>
      {children}
    </DownloadCtx.Provider>
  );
};

// Formatting helpers
export const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

export const formatSpeed = (bps: number) => `${formatBytes(bps)}/s`;

export const formatEta = (item: DownloadItem) => {
  if (item.status !== "downloading" || !item.speed || !item.totalBytes) return "—";
  const remaining = item.totalBytes - item.receivedBytes;
  const sec = Math.max(0, Math.round(remaining / item.speed));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
