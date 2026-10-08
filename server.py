"""Локал HTTP API + вэб интерфэйс."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request, send_from_directory

import core

WEB_DIR = os.path.join(core.BASE_DIR, "web")

app = Flask(__name__, static_folder=None)
jobs = core.JobManager(max_parallel=2)

_folder_picker = None  # main.py тохируулна: fn(initial_dir) -> str | None


def set_folder_picker(fn):
    global _folder_picker
    _folder_picker = fn


def _tk_folder_picker(initial: str):
    import tkinter as tk
    from tkinter import filedialog

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        return filedialog.askdirectory(initialdir=initial, parent=root) or None
    finally:
        root.destroy()


def _err(msg: str, code: int = 400):
    return jsonify({"error": msg}), code


@app.after_request
def _no_cache(resp):
    resp.headers["Cache-Control"] = "no-store"
    return resp


# ------------------------------------------------------------- static
@app.get("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.get("/<path:name>")
def static_files(name):
    return send_from_directory(WEB_DIR, name)


# ------------------------------------------------------------- api
@app.post("/api/info")
def api_info():
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    if not url:
        return _err("Линк хоосон байна.")
    try:
        return jsonify(core.get_info(url, bool(body.get("playlist"))))
    except Exception as e:  # noqa: BLE001
        return _err(core.friendly_error(e))


@app.post("/api/download")
def api_download():
    b = request.get_json(silent=True) or {}
    if not b.get("url"):
        return _err("Линк хоосон байна.")
    req = {
        "url": b["url"],
        "title": b.get("title"),
        "thumbnail": b.get("thumbnail"),
        "label": b.get("label"),
        "mode": b.get("mode") if b.get("mode") in ("video", "audio", "mute") else "video",
        "height": b.get("height"),
        "fps": int(b["fps"]) if b.get("fps") else None,
        "audio_format": b.get("audio_format") if b.get("audio_format") in ("mp3", "m4a") else "mp3",
        "bitrate": b.get("bitrate"),
        "start": b.get("start"),
        "end": b.get("end"),
        "playlist": bool(b.get("playlist")),
        "items": b.get("items"),
    }
    return jsonify(jobs.add(req).to_dict())


@app.get("/api/jobs")
def api_jobs():
    return jsonify({"jobs": jobs.list(), "active": jobs.active})


@app.post("/api/jobs/<job_id>/<action>")
def api_job_action(job_id, action):
    job = jobs.get(job_id)
    if not job:
        return _err("Олдсонгүй", 404)
    if action == "cancel":
        jobs.cancel(job_id)
    elif action == "retry":
        jobs.retry(job_id)
    elif action == "remove":
        jobs.remove(job_id)
    elif action == "open":
        core.open_path(job.filepath or job.out_dir)
    elif action == "reveal":
        core.reveal_in_explorer(job.filepath or job.out_dir)
    else:
        return _err("Буруу үйлдэл")
    return jsonify({"ok": True})


@app.post("/api/jobs/clear")
def api_jobs_clear():
    jobs.clear_finished()
    return jsonify({"ok": True})


@app.get("/api/settings")
def api_settings():
    return jsonify(core.load_settings())


@app.post("/api/pick-folder")
def api_pick_folder():
    current = core.load_settings()["out_dir"]
    picker = _folder_picker or _tk_folder_picker
    try:
        chosen = picker(current)
    except Exception as e:  # noqa: BLE001
        return _err(str(e), 500)
    if chosen:
        return jsonify(core.save_settings({"out_dir": os.path.normpath(chosen)}))
    return jsonify(core.load_settings())


@app.post("/api/open-folder")
def api_open_folder():
    d = core.load_settings()["out_dir"]
    os.makedirs(d, exist_ok=True)
    os.startfile(d)
    return jsonify({"ok": True})


@app.get("/api/clipboard")
def api_clipboard():
    try:
        return jsonify({"text": core.read_clipboard()[:2000]})
    except Exception:  # noqa: BLE001
        return jsonify({"text": ""})
