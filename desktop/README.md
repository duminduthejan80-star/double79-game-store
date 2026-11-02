# Double79 Game Store — PC app

A Steam-like desktop shell for the Double79 website.

## What it does

- Opens the Double79 website in a native window (login stays saved between launches).
- **Pro downloads run natively**: resolves Gofile share links to real direct links,
  downloads with live progress (%, MB, speed, time left), resumes after a dropped
  connection, and never saves a web page as a game file.
- **Auto-extracts** the downloaded RAR/ZIP into the library folder.
- **Finds the game .exe** inside the extracted folder.
- **Play / Open folder / Uninstall** from the website's Library page.
- Steam-style install location: you pick a drive/folder once, and the app keeps a
  `Double79 Store` folder there with one subfolder per game.

## Build (Windows)

```bat
pip install -r requirements.txt
:: Put UnRAR.exe (from rarlab.com) into desktop\bin\ so RAR extraction works offline.
pyinstaller --onefile --windowed --name Double79GameStore --add-binary "bin/UnRAR.exe;bin" app.py
```

The GitHub Actions workflow in `.github/workflows/build-desktop.yml` builds the
.exe and the installer automatically on every push that changes `desktop/`.

## Bridge contract

The website talks to the app through `window.pywebview.api`
(see `src/lib/desktopBridge.ts`). Methods: `ping`, `get_library_root`,
`choose_folder`, `start_download`, `list_downloads`, `cancel_download`,
`remove_download`, `open_folder`, `list_games`, `play_game`, `uninstall_game`,
`open_game_folder`.
