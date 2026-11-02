import { useEffect, useState } from "react";
import {
  listDesktopDownloads,
  listDesktopGames,
  waitForDesktop,
  type DesktopDownload,
  type DesktopGame,
} from "@/lib/desktopBridge";

/** Live list of downloads running inside the PC app (polled every 500ms). */
export const useDesktopDownloads = () => {
  const [available, setAvailable] = useState(false);
  const [items, setItems] = useState<DesktopDownload[]>([]);

  useEffect(() => {
    let cancelled = false;
    waitForDesktop().then((ok) => !cancelled && setAvailable(ok));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!available) return;
    let stop = false;
    const tick = async () => {
      const list = await listDesktopDownloads();
      if (!stop) setItems(list);
    };
    tick();
    const id = window.setInterval(tick, 500);
    window.addEventListener("d79:download-started", tick);
    return () => {
      stop = true;
      window.clearInterval(id);
      window.removeEventListener("d79:download-started", tick);
    };
  }, [available]);

  return { available, items };
};

/** Live list of games installed by the PC app (polled every 2s). */
export const useDesktopGames = () => {
  const [available, setAvailable] = useState(false);
  const [games, setGames] = useState<DesktopGame[]>([]);

  useEffect(() => {
    let cancelled = false;
    waitForDesktop().then((ok) => !cancelled && setAvailable(ok));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!available) return;
    let stop = false;
    const tick = async () => {
      const list = await listDesktopGames();
      if (!stop) setGames(list);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    window.addEventListener("d79:download-started", tick);
    return () => {
      stop = true;
      window.clearInterval(id);
      window.removeEventListener("d79:download-started", tick);
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
