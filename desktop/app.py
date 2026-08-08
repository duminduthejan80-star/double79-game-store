"""
Double79 Game Store - Desktop App (Windows / macOS / Linux)

Features:
  * Login is remembered  -> private_mode=False + a real profile folder
  * Intro video + YouTube -> modern engine + desktop user agent
  * New game notifications -> background poller with native OS notifications
  * Built-in download manager -> folder picker + threaded direct downloads
    with real-time progress, speed (MB/s), percent and time remaining.

Run:
    pip install -r requirements.txt
    python app.py
"""

import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
import uuid

import webview

# ---------------------------------------------------------------- config
SITE_URL = os.environ.get("D79_SITE_URL", "https://double79-game-store.lovable.app")

SUPABASE_URL = "https://tgbskrfbyvbigpxcbyim.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYnNrcmZieXZiaWdweGNieWltIiwicm9sZSI6ImFub24i"
    "LCJpYXQiOjE3Nzc1NTYxNzQsImV4cCI6MjA5MzEzMjE3NH0."
    "4tHpSMAqazpG4VWnmhGl7MdY0BLjonOMUNhD-vtVbG8"
)
RESOLVE_ENDPOINT = f"{SUPABASE_URL}/functions/v1/resolve-download"

POLL_SECONDS = 60

APP_NAME = "Double79 Game Store"
# Persistent profile -> cookies + localStorage (Supabase session) survive restarts
PROFILE_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA") or os.path.expanduser("~/.local/share"),
    "Double79GameStore",
)
STATE_FILE = os.path.join(PROFILE_DIR, "last_seen_game.json")
SETTINGS_FILE = os.path.join(PROFILE_DIR, "settings.json")
os.makedirs(PROFILE_DIR, exist_ok=True)

# Desktop Chrome UA: Google OAuth refuses "embedded webview" user agents
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


# ------------------------------------------------------------ notifications
def notify(title: str, message: str) -> None:
    try:
        if sys.platform.startswith("win"):
            from winotify import Notification, audio

            toast = Notification(app_id=APP_NAME, title=title, msg=message, duration="short")
            toast.set_audio(audio.Default, loop=False)
            toast.add_actions(label="Open store", launch=SITE_URL)
            toast.show()
            return
    except Exception:
        pass
    try:
        from plyer import notification as plyer_notification

        plyer_notification.notify(title=title, message=message, app_name=APP_NAME, timeout=10)
    except Exception as exc:  # notifications are best-effort
        print(f"[notify] {title}: {message} ({exc})")


# --------------------------------------------------------------- new games
def _load_last_seen() -> "str | None":
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh).get("created_at")
    except Exception:
        return None


def _save_last_seen(created_at: str) -> None:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as fh:
            json.dump({"created_at": created_at}, fh)
    except Exception:
        pass


def _fetch_games(since: "str | None"):
    params = {
        "select": "id,title,created_at",
        "order": "created_at.desc",
        "limit": "10",
    }
    if since:
        params["created_at"] = f"gt.{since}"
    url = f"{SUPABASE_URL}/rest/v1/games?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def watch_new_games() -> None:
    last_seen = _load_last_seen()
    if last_seen is None:
        try:
            rows = _fetch_games(None)
            if rows:
                last_seen = rows[0]["created_at"]
                _save_last_seen(last_seen)
        except Exception:
            pass

    while True:
        time.sleep(POLL_SECONDS)
        try:
            rows = _fetch_games(last_seen)
        except Exception:
            continue
        if not rows:
            continue
        rows.reverse()  # oldest first
        for row in rows:
            notify("New game available - Free now!", row.get("title") or "A new game was added")
        last_seen = rows[-1]["created_at"]
        _save_last_seen(last_seen)


# ---------------------------------------------------------- download engine
def _safe_name(name: str) -> str:
    keep = "".join(c for c in name if c.isalnum() or c in " ._-()[]")
    return (keep.strip() or "download")[:120]


def _resolve_direct(url: str) -> str:
    """Ask the backend to turn a share-page URL into a direct file URL so the
    download happens inside the app instead of opening Gofile in a browser."""
    try:
        body = json.dumps({"url": url}).encode("utf-8")
        req = urllib.request.Request(
            RESOLVE_ENDPOINT,
            data=body,
            headers={
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            },
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data.get("direct") or url
    except Exception as exc:
        print(f"[resolve] failed: {exc}")
        return url


class DownloadJob:
    def __init__(self, job_id: str, title: str, url: str, folder: str):
        self.id = job_id
        self.title = title
        self.url = url
        self.folder = folder
        self.path = ""
        self.status = "resolving"  # resolving|downloading|completed|failed|cancelled
        self.total = 0
        self.received = 0
        self.speed = 0.0  # bytes/s
        self.time_left = 0  # seconds
        self.error = ""
        self.cancel = threading.Event()

    def to_dict(self):
        pct = (self.received / self.total * 100) if self.total else 0
        return {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "path": self.path,
            "folder": self.folder,
            "totalBytes": self.total,
            "receivedBytes": self.received,
            "percent": round(pct, 2),
            "speed": round(self.speed, 2),
            "speedMBps": round(self.speed / (1024 * 1024), 2),
            "timeLeft": int(self.time_left),
            "error": self.error,
        }


class Api:
    """Exposed to the website as window.pywebview.api"""

    def __init__(self):
        self.jobs = {}
        self.lock = threading.Lock()
        self.window = None

    # ---- environment
    def ping(self):
        return {"desktop": True, "app": APP_NAME}

    def _settings(self):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception:
            return {}

    def _save_settings(self, data):
        try:
            with open(SETTINGS_FILE, "w", encoding="utf-8") as fh:
                json.dump(data, fh)
        except Exception:
            pass

    # ---- folder picker (Steam-like "choose install location")
    def choose_folder(self):
        last = self._settings().get("last_folder") or os.path.expanduser("~")
        try:
            result = self.window.create_file_dialog(
                webview.FOLDER_DIALOG, directory=last
            )
        except Exception as exc:
            return {"folder": None, "error": str(exc)}
        if not result:
            return {"folder": None}
        folder = result[0] if isinstance(result, (list, tuple)) else result
        settings = self._settings()
        settings["last_folder"] = folder
        self._save_settings(settings)
        return {"folder": folder}

    # ---- downloads
    def start_download(self, url, title, folder=None):
        if not url:
            return {"error": "No download link"}
        if not folder:
            picked = self.choose_folder()
            folder = picked.get("folder")
            if not folder:
                return {"cancelled": True}

        job = DownloadJob(uuid.uuid4().hex[:10], title or "Game", url, folder)
        with self.lock:
            self.jobs[job.id] = job
        threading.Thread(target=self._run_job, args=(job,), daemon=True).start()
        return {"id": job.id, "folder": folder}

    def list_downloads(self):
        with self.lock:
            return [j.to_dict() for j in self.jobs.values()]

    def cancel_download(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
        if job:
            job.cancel.set()
        return {"ok": True}

    def remove_download(self, job_id):
        with self.lock:
            job = self.jobs.get(job_id)
            if job:
                job.cancel.set()
                self.jobs.pop(job_id, None)
        return {"ok": True}

    def open_folder(self, path):
        target = path or ""
        if target and os.path.isfile(target):
            target = os.path.dirname(target)
        try:
            if sys.platform.startswith("win"):
                os.startfile(target)  # noqa: S606
            elif sys.platform == "darwin":
                os.system(f'open "{target}"')
            else:
                os.system(f'xdg-open "{target}"')
        except Exception as exc:
            return {"error": str(exc)}
        return {"ok": True}

    # ---- worker
    def _run_job(self, job: DownloadJob):
        try:
            direct = _resolve_direct(job.url)
            job.status = "downloading"

            req = urllib.request.Request(direct, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as resp:
                filename = ""
                disp = resp.headers.get("Content-Disposition") or ""
                if "filename=" in disp:
                    filename = disp.split("filename=")[-1].strip('";\' ')
                if not filename:
                    filename = os.path.basename(urllib.parse.urlparse(direct).path)
                if not filename or "." not in filename:
                    filename = f"{_safe_name(job.title)}.zip"
                filename = _safe_name(urllib.parse.unquote(filename))

                job.path = os.path.join(job.folder, filename)
                job.total = int(resp.headers.get("Content-Length") or 0)

                start = time.time()
                last_tick = start
                last_bytes = 0
                with open(job.path, "wb") as fh:
                    while True:
                        if job.cancel.is_set():
                            job.status = "cancelled"
                            break
                        chunk = resp.read(256 * 1024)
                        if not chunk:
                            break
                        fh.write(chunk)
                        job.received += len(chunk)

                        now = time.time()
                        if now - last_tick >= 0.4:
                            job.speed = (job.received - last_bytes) / (now - last_tick)
                            last_bytes = job.received
                            last_tick = now
                            if job.total and job.speed > 0:
                                job.time_left = max(0, (job.total - job.received) / job.speed)

            if job.status == "cancelled":
                try:
                    os.remove(job.path)
                except Exception:
                    pass
                return

            job.speed = 0
            job.time_left = 0
            if not job.total:
                job.total = job.received
            job.status = "completed"
            notify("Download complete", f"{job.title} saved to {job.folder}")
        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            job.speed = 0
            notify("Download failed", f"{job.title}: {exc}")


# ------------------------------------------------------------------- main
def main() -> None:
    threading.Thread(target=watch_new_games, daemon=True).start()

    api = Api()
    window = webview.create_window(
        APP_NAME,
        SITE_URL,
        js_api=api,
        width=1400,
        height=900,
        min_size=(1000, 650),
        background_color="#05070d",
        text_select=False,
    )
    api.window = window

    # New windows/target=_blank (external links) open in the system browser
    def _on_loaded():
        try:
            window.evaluate_js(
                """
                window.__D79_DESKTOP__ = true;
                document.addEventListener('click', function (e) {
                  var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
                  if (a && a.href) { e.preventDefault(); window.open(a.href, '_blank'); }
                }, true);
                """
            )
        except Exception:
            pass

    window.events.loaded += _on_loaded

    webview.start(
        gui=None,
        debug=bool(os.environ.get("D79_DEBUG")),
        private_mode=False,          # keeps the Google login session
        storage_path=PROFILE_DIR,    # cookies + localStorage on disk
        user_agent=USER_AGENT,       # allows Google OAuth + YouTube playback
    )


if __name__ == "__main__":
    main()
