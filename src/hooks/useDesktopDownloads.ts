import { useEffect, useState } from "react";
import { listDesktopDownloads, waitForDesktop, type DesktopDownload } from "@/lib/desktopBridge";

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

/** Triggers a direct browser download from a direct file URL (no new tab). */
export const directBrowserDownload = (url: string, filename?: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.download = filename || "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
};
