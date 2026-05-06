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
  // controllers for real fetch downloads
  const controllers = useRef<Map<string, AbortController>>(new Map());

  const triggerBrowserDownload = (url: string, title: string) => {
    // Hand off to the browser's native download manager. We cannot observe
    // its progress from a web page (browser security), so we mark the item
    // as "external" instead of showing fake numbers.
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, "_blank");
    }
  };

  const tryRealDownload = async (item: DownloadItem) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    try {
      const res = await fetch(item.url, { signal: controller.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const totalBytes = Number(res.headers.get("Content-Length") || 0);
      dispatch({ type: "update", id: item.id, patch: { totalBytes, status: "downloading" } });

      const reader = res.body.getReader();
      let received = 0;
      let lastTick = performance.now();
      let lastReceived = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as BlobPart);
        received += value.length;
        const now = performance.now();
        const dt = (now - lastTick) / 1000;
        if (dt >= 0.25) {
          const speed = (received - lastReceived) / dt;
          lastTick = now;
          lastReceived = received;
          dispatch({ type: "update", id: item.id, patch: { receivedBytes: received, speed } });
        }
      }

      const blob = new Blob(chunks);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = item.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      dispatch({
        type: "update",
        id: item.id,
        patch: {
          receivedBytes: received,
          totalBytes: totalBytes || received,
          speed: 0,
          status: "completed",
          finishedAt: Date.now(),
        },
      });
      toast.success(`${item.title} download finished`);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      // Real fetch failed (most likely CORS). Hand off to the browser's
      // native downloader and clearly mark the item as external — no fake
      // progress numbers.
      console.warn("Real progress unavailable, handing off to browser:", err);
      triggerBrowserDownload(item.url, item.title);
      dispatch({
        type: "update",
        id: item.id,
        patch: { status: "external", speed: 0, finishedAt: Date.now() },
      });
      toast.info(`${item.title} is downloading via your browser (progress not available)`);
    } finally {
      controllers.current.delete(item.id);
    }
  };

  const startDownload: Ctx["startDownload"] = ({ url, title, gameId, imageUrl, estimatedSizeMB }) => {
    if (!url) {
      toast.error("No download link available");
      return;
    }
    const item: DownloadItem = {
      id: newId(),
      gameId,
      title,
      url,
      imageUrl,
      totalBytes: estimatedSizeMB ? estimatedSizeMB * 1024 * 1024 : 0,
      receivedBytes: 0,
      speed: 0,
      status: "queued",
      startedAt: Date.now(),
      simulated: false,
    };
    dispatch({ type: "add", item });
    toast.info(`Starting download: ${title}`);
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
    // try real progress first; fallback handled inside
    tryRealDownload(item);
  };

  const stopSim = (id: string) => {
    const t = simTimers.current.get(id);
    if (t) { window.clearInterval(t); simTimers.current.delete(id); }
  };

  const cancel = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    stopSim(id);
    dispatch({ type: "update", id, patch: { status: "cancelled", speed: 0 } });
  };

  const remove = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    stopSim(id);
    dispatch({ type: "remove", id });
  };

  const clearCompleted = () => dispatch({ type: "clearCompleted" });

  useEffect(() => {
    return () => {
      controllers.current.forEach((c) => c.abort());
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
