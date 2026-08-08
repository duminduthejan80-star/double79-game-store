"""
Double79 Game Store - Desktop App (Windows / macOS / Linux)

Fixes vs a plain webview wrapper:
  * Login is remembered  -> private_mode=False + a real profile folder
  * Intro video + YouTube -> modern engine (Edge WebView2 / WKWebView) + desktop user agent
  * New game notifications -> background poller with native OS notifications

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

POLL_SECONDS = 60

APP_NAME = "Double79 Game Store"
# Persistent profile -> cookies + localStorage (Supabase session) survive restarts
PROFILE_DIR = os.path.join(
    os.environ.get("LOCALAPPDATA") or os.path.expanduser("~/.local/share"),
    "Double79GameStore",
)
STATE_FILE = os.path.join(PROFILE_DIR, "last_seen_game.json")
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
def _load_last_seen() -> str | None:
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


def _fetch_games(since: str | None):
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


# ------------------------------------------------------------------- main
def main() -> None:
    threading.Thread(target=watch_new_games, daemon=True).start()

    window = webview.create_window(
        APP_NAME,
        SITE_URL,
        width=1400,
        height=900,
        min_size=(1000, 650),
        background_color="#05070d",
        text_select=False,
    )

    # New windows/target=_blank (download links) open in the system browser
    def _on_loaded():
        try:
            window.evaluate_js(
                """
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
