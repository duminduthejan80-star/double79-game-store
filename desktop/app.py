# Double79 Game Store — PC app (pywebview shell + native game manager)
#
# Steam-like flow, all native:
#   Download (Gofile direct link, resume, live progress)
#   -> auto-extract the RAR/ZIP into the library folder
#   -> find the game .exe
#   -> Play / Open folder / Uninstall from the website UI.
#
# The website talks to this file through window.pywebview.api (see
# src/lib/desktopBridge.ts). Login stays signed in because the window
# runs with private_mode=False, so the site's storage persists.

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid

import requests
import webview

APP_NAME = "Double79 Game Store"
SITE_URL = "https://double79-game-store1.lovable.app"
LIBRARY_FOLDER_NAME = "Double79 Store"
POLICY_URL = "https://tgbskrfbyvbigpxcbyim.supabase.co/rest/v1/rpc/desktop_download_policy"

# ---------------------------------------------------------------- app data
def _data_dir() -> str:
    base = os.environ.get("APPDATA") or os.path.expanduser("~")
    path = os.path.join(base, "Double79")
    os.makedirs(path, exist_ok=True)
    return path

DATA_DIR = _data_dir()
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")
GAMES_PATH = os.path.join(DATA_DIR, "games.json")

_lock = threading.Lock()


def _load_json(path: str, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _save_json(path: str, value) -> None:
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(value, f, indent=2)
    except Exception:
        pass


SETTINGS = _load_json(SETTINGS_PATH, {})
GAMES: dict = _load_json(GAMES_PATH, {})
DOWNLOADS: dict = {}


def resource_path(rel: str) -> str:
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


def safe_name(title: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]+', "", title).strip().strip(".")
    return name or "game"


# ---------------------------------------------------------------- Gofile
GOFILE_SALT = "12af056dacea0b"
GOFILE_LANG = "en-US"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
_gofile_token_cache: str | None = None


def gofile_headers(token: str = "") -> dict:
    slot = int(time.time()) // 14400  # token window: 4 hours
    wt = hashlib.sha256(
        f"{UA}::{GOFILE_LANG}::{token}::{slot}::{GOFILE_SALT}".encode()
    ).hexdigest()
    h = {
        "User-Agent": UA,
        "Accept": "*/*",
        "Origin": "https://gofile.io",
        "Referer": "https://gofile.io/",
        "X-Website-Token": wt,
        "X-BL": GOFILE_LANG,
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def gofile_token(fresh: bool = False) -> str:
    global _gofile_token_cache
    if _gofile_token_cache and not fresh:
        return _gofile_token_cache
    res = requests.post(
        "https://api.gofile.io/accounts",
        headers={**gofile_headers(""), "Content-Type": "application/json"},
        data="{}",
        timeout=30,
    )
    token = (res.json().get("data") or {}).get("token")
    if not token:
        raise RuntimeError(f"Gofile token failed ({res.status_code})")
    _gofile_token_cache = token
    return token


def resolve_source(url: str, fresh: bool = False):
    """Returns (direct_url, extra_headers). Handles Gofile share links."""
    url = url.strip()
    m = re.search(
        r"gofile\.io/(?:d|download/web|download/direct|download)/([A-Za-z0-9-]+)",
        url,
        re.I,
    )
    if not m:
        return url, {"User-Agent": UA, "Accept": "*/*"}
    token = gofile_token(fresh)
    res = requests.get(
        f"https://api.gofile.io/contents/{m.group(1)}",
        headers=gofile_headers(token),
        timeout=30,
    )
    data = res.json()
    if data.get("status") != "ok":
        raise RuntimeError(f"Gofile: {data.get('status') or res.status_code}")
    d = data.get("data") or {}
    link = d.get("link")
    if not link:
        children = [c for c in (d.get("children") or {}).values() if c.get("link")]
        if not children:
            raise RuntimeError("Gofile: folder is empty")
        link = max(children, key=lambda c: c.get("size") or 0)["link"]
    return link, {
        "User-Agent": UA,
        "Accept": "*/*",
        "Cookie": f"accountToken={token}",
        "Referer": "https://gofile.io/",
    }


# ---------------------------------------------------------------- extraction
def find_unrar() -> str | None:
    candidates = [
        resource_path(os.path.join("bin", "UnRAR.exe")),
        resource_path(os.path.join("bin", "unrar")),
        os.path.join(os.path.dirname(sys.executable), "UnRAR.exe"),
        shutil.which("unrar") or "",
        r"C:\Program Files\WinRAR\UnRAR.exe",
        r"C:\Program Files (x86)\WinRAR\UnRAR.exe",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def find_7z() -> str | None:
    for c in (shutil.which("7z"), r"C:\Program Files\7-Zip\7z.exe"):
        if c and os.path.exists(c):
            return c
    return None


def extract_archive(archive: str, dest: str, job: dict) -> None:
    """Extract .rar/.zip into dest, updating job['percent'] as it goes."""
    os.makedirs(dest, exist_ok=True)
    lower = archive.lower()

    if lower.endswith(".zip"):
        import zipfile

        with zipfile.ZipFile(archive) as z:
            members = z.infolist()
            total = max(1, sum(m.file_size for m in members))
            done = 0
            for m in members:
                _check_cancelled(job)
                z.extract(m, dest)
                done += m.file_size
                job["percent"] = round(done * 100 / total, 1)
        return

    if lower.endswith(".rar"):
        unrar = find_unrar()
        if unrar:
            import rarfile

            rarfile.UNRAR_TOOL = unrar
            with rarfile.RarFile(archive) as rf:
                members = rf.infolist()
                total = max(1, sum(m.file_size for m in members))
                done = 0
                for m in members:
                    _check_cancelled(job)
                    rf.extract(m, dest)
                    done += m.file_size
                    job["percent"] = round(done * 100 / total, 1)
            return
        seven = find_7z()
        if seven:
            job["percent"] = 50  # no per-file progress from 7z CLI
            subprocess.run(
                [seven, "x", "-y", f"-o{dest}", archive],
                check=True,
                capture_output=True,
            )
            job["percent"] = 100
            return
        raise RuntimeError(
            "No RAR extractor found. Install WinRAR or rebuild the app with UnRAR."
        )

    raise RuntimeError("Unknown archive type: " + os.path.basename(archive))


# ---------------------------------------------------------------- game exe
EXE_SKIP = re.compile(
    r"(unins|uninstall|setup|install|updater|crash|redist|vcredist|dxwebsetup|"
    r"dotnet|launcher|config|editor|server|benchmark|benchmark)",
    re.I,
)


def find_game_exe(folder: str) -> str | None:
    best = None
    best_score = -1.0
    for root, _dirs, files in os.walk(folder):
        depth = root[len(folder):].count(os.sep)
        for f in files:
            if not f.lower().endswith(".exe"):
                continue
            path = os.path.join(root, f)
            if EXE_SKIP.search(f):
                continue
            try:
                size = os.path.getsize(path)
            except OSError:
                continue
            # Prefer shallow, large executables.
            score = (10 - min(depth, 10)) * 1_000_000_000 + size
            if score > best_score:
                best_score = score
                best = path
    return best


def folder_size(folder: str) -> int:
    total = 0
    for root, _dirs, files in os.walk(folder):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


def register_game(title: str, folder: str) -> dict:
    exe = find_game_exe(folder)
    entry = {
        "id": uuid.uuid4().hex,
        "title": title,
        "folder": folder,
        "exe": exe,
        "sizeBytes": folder_size(folder),
        "installedAt": int(time.time()),
    }
    with _lock:
        GAMES[entry["id"]] = entry
        _save_json(GAMES_PATH, GAMES)
    return entry


# ---------------------------------------------------------------- downloads
class Cancelled(Exception):
    pass


def _check_cancelled(job: dict) -> None:
    if job.get("cancel"):
        raise Cancelled()


def _public_job(job: dict) -> dict:
    return {k: job.get(k) for k in (
        "id", "title", "status", "path", "folder", "totalBytes",
        "receivedBytes", "percent", "speed", "speedMBps", "timeLeft", "error",
    )}


def throttle_download(job: dict, received: int, started: float) -> None:
    limit = job.get("speed_limit_mbps", 0) * 1024 * 1024
    if not limit:
        return
    deadline = started + received / limit
    while time.monotonic() < deadline:
        _check_cancelled(job)
        time.sleep(max(0, min(0.1, deadline - time.monotonic())))


def _download_worker(job: dict) -> None:
    url, title, dest_folder = job["url"], job["title"], job["folder"]
    archive_path = ""
    try:
        job["status"] = "resolving"
        direct, headers = None, None
        for attempt in range(4):
            _check_cancelled(job)
            try:
                direct, headers = resolve_source(url, fresh=attempt > 0)
            except Exception as e:
                if attempt == 3:
                    raise
                time.sleep(1.5)
                continue

            # Resume support: keep what we already have in the .part file.
            part = archive_path or os.path.join(dest_folder, safe_name(title) + ".part")
            archive_path = part
            have = os.path.getsize(part) if os.path.exists(part) else 0
            h = dict(headers)
            if have:
                h["Range"] = f"bytes={have}-"
            with requests.get(direct, headers=h, stream=True, timeout=60) as res:
                if res.status_code not in (200, 206):
                    time.sleep(1.5)
                    continue
                if have and res.status_code == 200:
                    have = 0  # server ignored Range; start over
                total = int(res.headers.get("Content-Length") or 0) + have
                if total:
                    job["totalBytes"] = total
                job["status"] = "downloading"
                mode = "ab" if have else "wb"
                last_t, last_b = time.time(), have
                transfer_started, transfer_bytes = time.monotonic(), 0
                with open(part, mode) as f:
                    first_chunk = True
                    for chunk in res.iter_content(chunk_size=1024 * 512):
                        _check_cancelled(job)
                        if not chunk:
                            continue
                        # Never save a web page as a "game".
                        if first_chunk and not have:
                            head = chunk[:200].lstrip().lower()
                            if head.startswith((b"<!doctype", b"<html", b"<head", b"<?xml", b'{"status"')):
                                raise RuntimeError("The file host sent a web page instead of the game file. Try again.")
                            first_chunk = False
                        f.write(chunk)
                        have += len(chunk)
                        transfer_bytes += len(chunk)
                        throttle_download(job, transfer_bytes, transfer_started)
                        job["receivedBytes"] = have
                        now = time.time()
                        if now - last_t >= 0.5:
                            speed = (have - last_b) / (now - last_t)
                            job["speed"] = speed
                            job["speedMBps"] = round(speed / (1024 * 1024), 2)
                            if total:
                                job["percent"] = round(have * 100 / total, 1)
                                job["timeLeft"] = int((total - have) / speed) if speed > 0 else 0
                            last_t, last_b = now, have
                if total and have < total:
                    continue  # dropped connection: loop and resume
                break
        else:
            raise RuntimeError("The file host did not return the game file. Try again in a minute.")

        # Rename .part to its real archive name.
        ext = ".rar"
        cdisp = ""
        try:
            cdisp = res.headers.get("Content-Disposition", "")  # noqa: F821
        except Exception:
            pass
        m = re.search(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)", cdisp or "")
        fname = m.group(1) if m else ""
        if not fname:
            fname = os.path.basename(direct.split("?")[0]) or title
        if fname.lower().endswith(".zip"):
            ext = ".zip"
        final_archive = os.path.join(dest_folder, safe_name(title) + ext)
        os.replace(archive_path, final_archive)

        # Extract into the game's own folder inside the library.
        job["status"] = "extracting"
        job["percent"] = 0
        job["speedMBps"] = 0
        job["timeLeft"] = 0
        game_folder = os.path.join(dest_folder, safe_name(title))
        extract_archive(final_archive, game_folder, job)
        try:
            os.remove(final_archive)
        except OSError:
            pass

        entry = register_game(title, game_folder)
        job["status"] = "completed"
        job["percent"] = 100
        job["path"] = game_folder
        job["gameId"] = entry["id"]
    except Cancelled:
        job["status"] = "cancelled"
        try:
            if archive_path and os.path.exists(archive_path):
                os.remove(archive_path)
        except OSError:
            pass
    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)


# ---------------------------------------------------------------- bridge API
class Api:
    def ping(self):
        return {"ok": True, "app": APP_NAME}

    # ----- folders -----
    def get_library_root(self):
        root = SETTINGS.get("library_root")
        if not root:
            docs = os.path.join(os.path.expanduser("~"), "Documents")
            root = os.path.join(docs if os.path.isdir(docs) else os.path.expanduser("~"),
                                LIBRARY_FOLDER_NAME)
        return {"root": root}

    def choose_folder(self):
        """Steam-style install location picker. The chosen folder gets a
        'Double79 Store' folder inside it (unless it already is one)."""
        win = webview.windows[0] if webview.windows else None
        if not win:
            return {"error": "no window"}
        default = self.get_library_root()["root"]
        result = win.create_file_dialog(
            webview.FOLDER_DIALOG, directory=os.path.dirname(default) or None
        )
        if not result:
            return {"folder": None}
        chosen = result[0]
        if os.path.basename(chosen.rstrip(os.sep)) != LIBRARY_FOLDER_NAME:
            chosen = os.path.join(chosen, LIBRARY_FOLDER_NAME)
        os.makedirs(chosen, exist_ok=True)
        SETTINGS["library_root"] = chosen
        _save_json(SETTINGS_PATH, SETTINGS)
        return {"folder": chosen}

    # ----- downloads -----
    def start_managed_download(self, game_id: str, tier: str, access_token: str, public_key: str):
        """Resolve tier and speed on the server; never trust a UI-provided cap."""
        if tier not in ("free", "pro"):
            return {"error": "Invalid download tier"}
        try:
            res = requests.post(POLICY_URL, headers={
                "Authorization": f"Bearer {access_token}", "apikey": public_key,
                "Content-Type": "application/json",
            }, json={"_game_id": game_id, "_tier": tier}, timeout=30)
            policy = res.json()
            if not res.ok:
                return {"error": policy.get("message", "Could not check download access")}
            return self._start_download(policy["url"], self._game_title(game_id, access_token, public_key),
                                       speed_limit_mbps=float(policy["speed_limit_mbps"]))
        except Exception:
            return {"error": "Could not load download settings. Please try again."}

    def _game_title(self, game_id: str, token: str, key: str):
        res = requests.get(POLICY_URL.split("/rpc/")[0] + "/games",
                           headers={"Authorization": f"Bearer {token}", "apikey": key},
                           params={"id": f"eq.{game_id}", "select": "title"}, timeout=30)
        res.raise_for_status()
        rows = res.json()
        return rows[0]["title"] if rows else "game"

    def _start_download(self, url: str, title: str, folder: str | None = None, speed_limit_mbps: float = 0):
        if not folder:
            picked = self.choose_folder()
            folder = picked.get("folder")
            if not folder:
                return {"cancelled": True}
        os.makedirs(folder, exist_ok=True)
        job = {
            "id": uuid.uuid4().hex,
            "title": title,
            "url": url,
            "status": "resolving",
            "path": "",
            "folder": folder,
            "totalBytes": 0,
            "receivedBytes": 0,
            "percent": 0,
            "speed": 0,
            "speedMBps": 0,
            "timeLeft": 0,
            "error": "",
            "cancel": False,
            "speed_limit_mbps": speed_limit_mbps,
        }
        with _lock:
            DOWNLOADS[job["id"]] = job
        threading.Thread(target=_download_worker, args=(job,), daemon=True).start()
        return {"id": job["id"], "folder": folder}

    def list_downloads(self):
        with _lock:
            return [_public_job(j) for j in DOWNLOADS.values()]

    def cancel_download(self, id: str):
        job = DOWNLOADS.get(id)
        if job:
            job["cancel"] = True
        return {"ok": True}

    def remove_download(self, id: str):
        with _lock:
            job = DOWNLOADS.get(id)
            if job and job["status"] in ("downloading", "resolving", "extracting"):
                return {"error": "Cancel it first"}
            DOWNLOADS.pop(id, None)
        return {"ok": True}

    def open_folder(self, path: str):
        target = path if os.path.isdir(path) else os.path.dirname(path)
        if target and os.path.exists(target):
            os.startfile(target)  # type: ignore[attr-defined]
        return {"ok": True}

    # ----- installed games -----
    def list_games(self):
        with _lock:
            out = [dict(game) for game in GAMES.values()]
        # Never recursively scan game folders while holding the download lock.
        # Executable recovery belongs to Play, not every UI refresh.
        for game in out:
            game["missing"] = not os.path.isdir(game.get("folder", ""))
        out.sort(key=lambda game: game.get("installedAt", 0), reverse=True)
        return out

    def play_game(self, id: str):
        g = GAMES.get(id)
        if not g:
            return {"error": "Game not found"}
        exe = g.get("exe")
        if not exe or not os.path.exists(exe):
            exe = find_game_exe(g["folder"])
            if not exe:
                return {"error": "Could not find the game .exe in its folder"}
            g["exe"] = exe
            _save_json(GAMES_PATH, GAMES)
        try:
            subprocess.Popen([exe], cwd=os.path.dirname(exe), close_fds=True)
        except Exception as e:
            return {"error": f"Could not start the game: {e}"}
        return {"ok": True}

    def uninstall_game(self, id: str):
        g = GAMES.get(id)
        if not g:
            return {"error": "Game not found"}
        folder = g.get("folder", "")
        try:
            if folder and os.path.isdir(folder):
                shutil.rmtree(folder, ignore_errors=True)
        except Exception as e:
            return {"error": f"Could not delete the game files: {e}"}
        with _lock:
            GAMES.pop(id, None)
            _save_json(GAMES_PATH, GAMES)
        return {"ok": True}

    def open_game_folder(self, id: str):
        g = GAMES.get(id)
        if g:
            return self.open_folder(g.get("folder", ""))
        return {"error": "Game not found"}


def main():
    api = Api()
    window = webview.create_window(
        APP_NAME,
        SITE_URL,
        js_api=api,
        width=1280,
        height=800,
        min_size=(1000, 640),
    )

    def mark_desktop():
        try:
            window.evaluate_js("window.__D79_DESKTOP__ = true; document.documentElement.classList.add('desktop-runtime'); window.dispatchEvent(new Event('d79:desktop-ready'));")
        except Exception:
            pass

    window.events.loaded += mark_desktop
    # private_mode=False keeps site storage (login session) between launches.
    # Edge Chromium avoids the legacy Windows renderer; keep the same login store.
    webview.start(gui="edgechromium" if sys.platform == "win32" else None,
                  private_mode=False, storage_path=DATA_DIR, debug=False,
                  user_agent=UA + " Double79Desktop/3.0")


if __name__ == "__main__":
    main()
