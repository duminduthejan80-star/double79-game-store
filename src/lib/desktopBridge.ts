// Bridge between the web UI and the Python desktop app (pywebview js_api).
// When running inside the desktop app, downloads are handled natively:
// folder picker -> Python downloader -> in-app progress.

export interface DesktopDownload {
  id: string;
  title: string;
  status: "resolving" | "downloading" | "completed" | "failed" | "cancelled";
  path: string;
  folder: string;
  totalBytes: number;
  receivedBytes: number;
  percent: number;
  speed: number;
  speedMBps: number;
  timeLeft: number;
  error: string;
}

type PyApi = {
  ping: () => Promise<unknown>;
  choose_folder: () => Promise<{ folder?: string | null; error?: string }>;
  start_download: (
    url: string,
    title: string,
    folder?: string | null,
  ) => Promise<{ id?: string; folder?: string; cancelled?: boolean; error?: string }>;
  list_downloads: () => Promise<DesktopDownload[]>;
  cancel_download: (id: string) => Promise<unknown>;
  remove_download: (id: string) => Promise<unknown>;
  open_folder: (path: string) => Promise<unknown>;
};

const getApi = (): PyApi | null => {
  const w = window as unknown as { pywebview?: { api?: PyApi } };
  return w.pywebview?.api ?? null;
};

export const isDesktopApp = () => getApi() !== null;

/** Waits briefly for the pywebview bridge to be injected on first load. */
export const waitForDesktop = async (timeoutMs = 1500): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (getApi()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return getApi() !== null;
};

export const chooseFolder = async (): Promise<string | null> => {
  const api = getApi();
  if (!api) return null;
  const res = await api.choose_folder();
  return res?.folder ?? null;
};

/**
 * Starts a native download. Returns false when not running in the desktop app
 * (caller should fall back to opening the link in the browser).
 */
export const startDesktopDownload = async (
  url: string,
  title: string,
): Promise<"started" | "cancelled" | "unavailable"> => {
  const api = getApi();
  if (!api) return "unavailable";
  const folder = await chooseFolder();
  if (!folder) return "cancelled";
  const res = await api.start_download(url, title, folder);
  if (res?.cancelled) return "cancelled";
  if (res?.error) throw new Error(res.error);
  window.dispatchEvent(new CustomEvent("d79:download-started"));
  return "started";
};

export const listDesktopDownloads = async (): Promise<DesktopDownload[]> => {
  const api = getApi();
  if (!api) return [];
  try {
    return (await api.list_downloads()) ?? [];
  } catch {
    return [];
  }
};

export const cancelDesktopDownload = (id: string) => getApi()?.cancel_download(id);
export const removeDesktopDownload = (id: string) => getApi()?.remove_download(id);
export const openDownloadFolder = (path: string) => getApi()?.open_folder(path);

export const formatMB = (bytes: number) => {
  if (!bytes) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatTimeLeft = (sec: number) => {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
