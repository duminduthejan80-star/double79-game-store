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
  totalBytes: number;
  receivedBytes: number;
  speed: number;
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
      return { items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
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
  const controllers = useRef<Map<string, AbortController>>(new Map());

  // 🌐 Gofile එක ෆේල් වුණොත් බ්‍රවුසර් එකෙන් බැක්ග්‍රවුන්ඩ් එකේ බාන්න සලස්වන සේෆ්ටි ෆන්ක්ෂන් එක
  const triggerBrowserDownload = (url: string) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 2000);
    } catch {
      window.open(url, "_blank");
    }
  };

  // 🤖 FRONTEND BOT: Gofile සයිට් එක ඇතුළට රහසිගතව රිංගා රියල් ඩිරෙක්ට් ලින්ක් එක ගලවා ගැනීම
  const fetchGofileDirectLink = async (gofileUrl: string): Promise<string | null> => {
    if (!gofileUrl.includes("gofile.io/d/")) return null;
    try {
      const folderId = gofileUrl.split("/d/")[1];
      // CORS Bypass Proxy එකක් හරහා Gofile Contents API එකට රිංගීම
      const proxyApiUrl = `https://cors-anywhere.herokuapp.com/https://api.gofile.io/contents/${folderId}?wt=4019c11e84ab1b66beae1d78828a2f4a`;
      
      const response = await fetch(proxyApiUrl);
      const data = await response.json();

      if (data.status === "ok" && data.data && data.data.contents) {
        const fileId = Object.keys(data.data.contents)[0];
        const directLink = data.data.contents[fileId].link;
        return directLink; // 🚀 රියල් ඩිරෙක්ට් ලින්ක් එක හමු විය!
      }
    } catch (error) {
      console.error("Frontend Bot failed to scrape Gofile:", error);
    }
    return null;
  };

  const tryRealDownload = async (item: DownloadItem, dynamicUrl: string) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    try {
      // 📈 CORS බ්ලොක් එක නැති කර රියල් බයිට්ස් ස්ට්‍රීම් එක වෙබ් සයිට් එකට ඇදලා ගැනීම
      const proxiedUrl = `https://cors-anywhere.herokuapp.com/${dynamicUrl}`;
      
      const res = await fetch(proxiedUrl, { signal: controller.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      
      const totalBytes = Number(res.headers.get("Content-Length") || item.totalBytes || 0);
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
        
        // 📉 100% Real Live Speed & Progress Tracking (Steam Style)
        if (dt >= 0.25) {
          const speed = (received - lastReceived) / dt;
          lastTick = now;
          lastReceived = received;
          dispatch({ type: "update", id: item.id, patch: { receivedBytes: received, speed } });
        }
      }

      // බාගත කරගත් සම්පූර්ණ ඩේටා එකතු කර .zip ෆයිල් එකක් ලෙස සේව් කිරීම
      const blob = new Blob(chunks);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = item.title.endsWith(".zip") || item.title.endsWith(".rar") ? item.title : `${item.title}.zip`;
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
      toast.success(`${item.title} download finished ✅`);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.warn("Real streaming failed, falling back to browser download:", err);
      
      // සයිට් එකේ ස්ට්‍රීම් එක ෆේල් වුණොත් ගේම් එක බ්ලොක් කරන්නේ නැතුව බ්‍රවුසර් එකට බාන්න දෙනවා
      triggerBrowserDownload(dynamicUrl);
      dispatch({
        type: "update",
        id: item.id,
        patch: { status: "external", speed: 0, finishedAt: Date.now() },
      });
      toast.info(`${item.title} is downloading via your browser`);
    } compression: {
      controllers.current.delete(item.id);
    }
  };

  const startDownload: Ctx["startDownload"] = async ({ url, title, gameId, imageUrl, estimatedSizeMB }) => {
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

    let resolvedUrl = url;

    // 🤖 Gofile ලින්ක් එකක් නම්, ලොවබල් එකේ ෆන්ක්ෂන් එක ෆේල් නිසා අපේ සයිට් එකෙන්ම ඩිරෙක්ට් ලින්ක් එක ගලවනවා
    if (url.includes("gofile.io/d/")) {
      const directLink = await fetchGofileDirectLink(url);
      if (directLink) {
        resolvedUrl = directLink;
      } else {
        // ලොවබල් එකේ පරණ එජ් ෆන්ක්ෂන් එකට අවස්තාවක් දීම (Fallback)
        try {
          const { data, error } = await supabase.functions.invoke("resolve-download", { body: { url } });
          if (!error && data?.direct) resolvedUrl = data.direct;
        } catch (e) {
          console.warn("Edge function fallback failed", e);
        }
      }
    }

    dispatch({ type: "update", id: item.id, patch: { url: resolvedUrl } });
    tryRealDownload({ ...item, url: resolvedUrl }, resolvedUrl);
  };

  const cancel = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    dispatch({ type: "update", id, patch: { status: "cancelled", speed: 0 } });
  };

  const remove = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
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
