import { useEffect, useState, useSyncExternalStore } from "react";
import { createDesktopPoller } from "@/lib/desktopPoller";
import {
  listDesktopDownloads,
  listDesktopGames,
  waitForDesktop,
  type DesktopDownload,
  type DesktopGame,
} from "@/lib/desktopBridge";

const downloadsStore = createDesktopPoller<DesktopDownload>(listDesktopDownloads, (items) =>
  items.some((item) => ["resolving", "downloading", "extracting"].includes(item.status)) ? 750 : 3000,
);
const gamesStore = createDesktopPoller<DesktopGame>(listDesktopGames, () => 5000);
const noSubscription = () => () => {};

const useDesktopAvailable = () => {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const ready = () => !cancelled && setAvailable(true);
    window.addEventListener("pywebviewready", ready);
    waitForDesktop().then((ok) => !cancelled && setAvailable(ok));
    return () => { cancelled = true; window.removeEventListener("pywebviewready", ready); };
  }, []);
  return available;
};

/** Shared, non-overlapping native polling; unchanged lists don't rerender. */
export const useDesktopDownloads = () => {
  const available = useDesktopAvailable();
  const items = useSyncExternalStore(available ? downloadsStore.subscribe : noSubscription, downloadsStore.getSnapshot);
  useEffect(() => {
    if (!available) return;
    window.addEventListener("d79:download-started", downloadsStore.refresh);
    return () => window.removeEventListener("d79:download-started", downloadsStore.refresh);
  }, [available]);
  return { available, items };
};

/** Live list of games installed by the PC app (polled every 2s). */
export const useDesktopGames = () => {
  const available = useDesktopAvailable();
  const games = useSyncExternalStore(available ? gamesStore.subscribe : noSubscription, gamesStore.getSnapshot);
  useEffect(() => {
    if (!available) return;
    window.addEventListener("d79:games-changed", gamesStore.refresh);
    return () => {
      window.removeEventListener("d79:games-changed", gamesStore.refresh);
    };
  }, [available]);

  return { available, games };
};

/** Hosts that need a visitor session (cookie) the browser can't fake —
 *  a hidden <a download> would save their web page as a 4 KB "game". */
const SESSION_HOSTS = /(gofile\.io|buzzheavier\.com|mediafire\.com|pixeldrain\.com|mega\.nz)/i;

/**
 * Browser (non-PC-app) Pro download.
 * - Plain direct file links: download in place (no new tab).
 * - Gofile & similar hosts: open in a new tab so the host gives the visitor
 *   its session and serves the real file (never saves a page as .rar).
 * Returns "tab" when a new tab was opened.
 */
export const directBrowserDownload = (url: string, filename?: string): "inline" | "tab" => {
  if (SESSION_HOSTS.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "tab";
  }
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.download = filename || "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
  return "inline";
};
