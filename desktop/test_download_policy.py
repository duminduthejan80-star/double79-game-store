import importlib.util
import io
import os
import sys
import tempfile
import types
import unittest
import zipfile
from unittest.mock import patch, Mock

sys.modules.setdefault("webview", types.SimpleNamespace(windows=[]))
sys.modules.setdefault("requests", types.SimpleNamespace())
test_data = tempfile.TemporaryDirectory()
os.environ["APPDATA"] = test_data.name
spec = importlib.util.spec_from_file_location("desktop_app", os.path.join(os.path.dirname(__file__), "app.py"))
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)

class DownloadRules(unittest.TestCase):
    def test_library_refresh_never_scans_executables_or_blocks_on_disk_under_lock(self):
        game = {"id": "missing-exe", "folder": "GameFolder", "exe": "GameFolder/old.exe", "installedAt": 1}
        def directory_exists(_path):
            self.assertFalse(app._lock.locked())
            return True
        with patch.dict(app.GAMES, {game["id"]: game}, clear=True), patch.object(app.os.path, "isdir", side_effect=directory_exists), patch.object(app, "find_game_exe") as scan:
            result = app.Api().list_games()
            self.assertEqual(result[0]["id"], "missing-exe")
            self.assertFalse(result[0]["missing"])
            scan.assert_not_called()

    def test_free_limit_waits_and_pro_does_not(self):
        with patch.object(app.time, "monotonic", side_effect=[0, 0, 1]), patch.object(app.time, "sleep") as sleep:
            app.throttle_download({"speed_limit_mbps": 1}, 1024 * 1024, 0)
            sleep.assert_called_once_with(0.1)
        with patch.object(app.time, "sleep") as sleep:
            app.throttle_download({"speed_limit_mbps": 0}, 1024 * 1024, 0)
            sleep.assert_not_called()

    def test_both_tiers_use_server_policy(self):
        for tier, limit in [("free", 2), ("pro", 0)]:
            response = Mock(ok=True)
            response.json.return_value = {"url": "https://gofile.io/d/test", "speed_limit_mbps": limit}
            api = app.Api()
            with patch.object(app.requests, "post", return_value=response, create=True) as post, patch.object(api, "_game_title", return_value="Game"), patch.object(api, "_start_download", return_value={"id": "job"}) as start:
                api.start_managed_download("game-id", tier, "test-token", "test-key")
                self.assertEqual(post.call_args.kwargs["json"]["_tier"], tier)
                start.assert_called_once_with("https://gofile.io/d/test", "Game", speed_limit_mbps=limit)

    def test_download_extract_register_play_uninstall(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            archive.writestr("Game.exe", b"test executable")
            archive.writestr("uninstall.exe", b"skip")
        payload = data.getvalue()
        response = Mock(status_code=200, headers={"Content-Length": str(len(payload)), "Content-Disposition": 'attachment; filename="Game.zip"'})
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [payload]
        with tempfile.TemporaryDirectory() as folder, patch.object(app, "resolve_source", return_value=("https://example.test/Game.zip", {})), patch.object(app.requests, "get", return_value=response, create=True):
            job = {"url": "source", "title": "Game", "folder": folder, "speed_limit_mbps": 0}
            app._download_worker(job)
            self.assertEqual(job["status"], "completed")
            game = app.GAMES[job["gameId"]]
            self.assertTrue(game["exe"].endswith("Game.exe"))
            with patch.object(app.subprocess, "Popen") as launch:
                self.assertTrue(app.Api().play_game(game["id"])["ok"])
                launch.assert_called_once()
            self.assertTrue(app.Api().uninstall_game(game["id"])["ok"])
            self.assertFalse(os.path.exists(game["folder"]))

if __name__ == "__main__":
    unittest.main()