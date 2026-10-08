"""Tatagch — програмыг эхлүүлэгч.

    python main.py            # тусдаа цонхонд нээнэ (pywebview / WebView2)
    python main.py --browser  # үндсэн браузерт нээнэ
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import tempfile
import threading
import webbrowser

from werkzeug.serving import make_server

import server

TITLE = "Tatagch — YouTube татагч"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _run_webview(url: str) -> bool:
    try:
        import webview
    except ImportError:
        return False
    window = webview.create_window(
        TITLE, url, width=1240, height=820, min_size=(960, 660), background_color="#0a0a0f",
    )

    def pick(initial):
        res = window.create_file_dialog(webview.FileDialog.FOLDER, directory=initial)
        return res[0] if res else None

    server.set_folder_picker(pick)
    try:
        webview.start()
        return True
    except Exception:  # noqa: BLE001
        return False


def _run_edge_app(url: str) -> bool:
    for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles")):
        exe = base and os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe")
        if exe and os.path.isfile(exe):
            profile = os.path.join(tempfile.gettempdir(), "tatagch-edge")
            subprocess.call([exe, f"--app={url}", f"--user-data-dir={profile}",
                             "--window-size=1240,820", "--no-first-run"])
            return True
    return False


def main():
    port = _free_port()
    srv = make_server("127.0.0.1", port, server.app, threaded=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{port}/"

    if "--browser" in sys.argv:
        print(f"Tatagch: {url}  (зогсоох: Ctrl+C)")
        webbrowser.open(url)
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            pass
    elif not (_run_webview(url) or _run_edge_app(url)):
        webbrowser.open(url)
        threading.Event().wait()
    srv.shutdown()


if __name__ == "__main__":
    main()
