# Double79 Game Store — Python PC App

## Run

```bash
cd desktop
pip install -r requirements.txt
python app.py
```

## What this fixes

| Problem in the old wrapper | Fix |
| --- | --- |
| Login asked again every launch | `private_mode=False` + `storage_path` — cookies and the Supabase session are saved in `%LOCALAPPDATA%\Double79GameStore` |
| Intro video / YouTube trailers not playing | Edge WebView2 (Windows) / WKWebView (macOS) engine + a normal desktop Chrome user agent |
| Google sign-in blocked (`disallowed_useragent`) | Same desktop user agent |
| No alerts for new games | Background poller checks the store every 60s and shows a native Windows/macOS/Linux notification |

Windows needs **Microsoft Edge WebView2 Runtime** (already present on Windows 10/11 up to date).
On Linux install `python3-gi gir1.2-webkit2-4.1`.

## Build a single .exe

```bash
cd desktop
pyinstaller --noconfirm --onefile --windowed --name "Double79 Game Store" app.py
```

The exe lands in `desktop/dist/`.

## Notes

- Download links (`target="_blank"`) open in the system browser, as on the website.
- Point the app at a different URL with `set D79_SITE_URL=https://...` before launching.
- `set D79_DEBUG=1` opens devtools.
