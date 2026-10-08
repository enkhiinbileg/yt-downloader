"""Татах хөдөлгүүр: видео мэдээлэл авах, татан авалтын дараалал, явц, цуцлалт."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid

import imageio_ffmpeg
import yt_dlp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")
DEFAULT_DIR = os.path.join(os.path.expanduser("~"), "Downloads")


# ---------------------------------------------------------------- ffmpeg
def _ensure_ffmpeg() -> str:
    """imageio-ffmpeg-ийн exe-г bin/ffmpeg.exe нэрээр хуулна (yt-dlp яг энэ нэрийг хайдаг)."""
    bin_dir = os.path.join(BASE_DIR, "bin")
    exe = os.path.join(bin_dir, "ffmpeg.exe")
    if not os.path.isfile(exe):
        os.makedirs(bin_dir, exist_ok=True)
        shutil.copy2(imageio_ffmpeg.get_ffmpeg_exe(), exe)
    # yt-dlp-ийн хэсэгчлэн татагч (FFmpegFD) зөвхөн PATH дээрээс ffmpeg хайдаг
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    return exe


FFMPEG_PATH = _ensure_ffmpeg()


# ---------------------------------------------------------------- utils
def fmt_time(secs: float | None, sep: str = ":") -> str:
    if secs is None:
        return ""
    secs = int(round(secs))
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}{sep}{m:02d}{sep}{s:02d}" if h else f"{m}{sep}{s:02d}"


_ANSI = re.compile(r"\x1b\[[0-9;]*m")
_ERRORS = [
    ("private video", "Энэ видео хувийн (private) тул татах боломжгүй."),
    ("video unavailable", "Видео олдсонгүй эсвэл устгагдсан байна."),
    ("confirm your age", "Насны хязгаартай видео тул нэвтрэлт шаардлагатай."),
    ("sign in to confirm", "YouTube баталгаажуулалт шаардлаа. Түр хүлээгээд дахин оролдоно уу."),
    ("members-only", "Зөвхөн сувгийн гишүүдэд зориулсан видео."),
    ("join this channel", "Зөвхөн сувгийн гишүүдэд зориулсан видео."),
    ("live event will begin", "Шууд дамжуулалт хараахан эхлээгүй байна."),
    ("is not a valid url", "Линк буруу байна."),
    ("unsupported url", "Энэ линкийг дэмжихгүй байна."),
    ("getaddrinfo failed", "Интернэт холболтоо шалгана уу."),
    ("unable to download webpage", "Интернэт холболтоо шалгана уу."),
    ("timed out", "Холболт удаан байна. Дахин оролдоно уу."),
    ("http error 403", "YouTube хандалтыг хаалаа (403 Forbidden). Түр хүлээгээд дахин оролдоно уу."),
    ("403 forbidden", "YouTube хандалтыг хаалаа (403 Forbidden). Түр хүлээгээд дахин оролдоно уу."),
    ("3436169992", "YouTube хандалтыг хаалаа (403 Forbidden). Түр хүлээгээд дахин оролдоно уу."),
    ("requested format is not available", "Сонгосон чанар энэ видеонд байхгүй байна."),
    ("no space left", "Диск дээр зай дууссан байна."),
    ("permission denied", "Хавтас руу бичих эрхгүй байна. Өөр хавтас сонгоно уу."),
]


def friendly_error(err) -> str:
    msg = _ANSI.sub("", str(err)).replace("ERROR: ", "").strip()
    low = msg.lower()
    for key, text in _ERRORS:
        if key in low:
            return text
    msg = re.sub(r"^\[[^\]]+\]\s*[\w-]+:\s*", "", msg)  # "[youtube] abc123: " угтварыг хасах
    return msg[:280] or "Тодорхойгүй алдаа гарлаа."


def _size(f: dict, duration) -> float:
    s = f.get("filesize") or f.get("filesize_approx")
    if s:
        return float(s)
    if f.get("tbr") and duration:
        return f["tbr"] * 1000 / 8 * duration
    return 0.0


def _thumb(entry: dict) -> str | None:
    if entry.get("thumbnail"):
        return entry["thumbnail"]
    thumbs = entry.get("thumbnails") or []
    if thumbs:
        return thumbs[-1].get("url")
    if entry.get("id"):
        return f"https://i.ytimg.com/vi/{entry['id']}/mqdefault.jpg"
    return None


# ---------------------------------------------------------------- settings
_settings_lock = threading.Lock()


def load_settings() -> dict:
    data = {"out_dir": DEFAULT_DIR}
    try:
        with open(SETTINGS_FILE, encoding="utf-8") as fh:
            data.update(json.load(fh))
    except (OSError, ValueError):
        pass
    return data


def save_settings(patch: dict) -> dict:
    with _settings_lock:
        data = load_settings()
        data.update({k: v for k, v in patch.items() if k in ("out_dir",)})
        with open(SETTINGS_FILE, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        return data


def _base_opts() -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    node_exe = shutil.which("node")
    if node_exe:
        opts["js_runtimes"] = {"node": {"path": node_exe}}
    return opts


# ---------------------------------------------------------------- info
def _is_playlist_url(url: str) -> bool:
    return bool(re.search(r"youtube\.com/playlist\?", url)) or (
        "list=" in url and "v=" not in url and "youtu.be/" not in url
    )


def get_info(url: str, playlist: bool = False) -> dict:
    url = url.strip()
    playlist = playlist or _is_playlist_url(url)
    opts = _base_opts()
    opts.update({"skip_download": True})
    if playlist:
        opts.update(extract_flat="in_playlist", noplaylist=False)
    else:
        opts.update(noplaylist=True)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if info.get("_type") == "playlist" or info.get("entries") is not None:
        entries = []
        total = 0
        for i, e in enumerate(info.get("entries") or [], 1):
            if not e:
                continue
            total += e.get("duration") or 0
            entries.append({
                "index": i,
                "id": e.get("id"),
                "title": e.get("title") or "(нэргүй)",
                "duration": e.get("duration"),
                "channel": e.get("channel") or e.get("uploader"),
                "thumbnail": _thumb(e),
            })
        return {
            "type": "playlist",
            "url": url,
            "title": info.get("title") or "Playlist",
            "channel": info.get("uploader") or info.get("channel"),
            "count": len(entries),
            "total_duration": total,
            "thumbnail": entries[0]["thumbnail"] if entries else None,
            "entries": entries,
        }
    return _video_info(info, url)


def _video_info(info: dict, url: str) -> dict:
    duration = info.get("duration")
    fmts = info.get("formats") or []

    audios = [f for f in fmts if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")]
    best_audio = max(audios, key=lambda f: f.get("abr") or f.get("tbr") or 0, default=None)
    audio_size = _size(best_audio, duration) if best_audio else 0

    by_height: dict[int, dict] = {}
    for f in fmts:
        h, w = f.get("height"), f.get("width")
        if f.get("vcodec") in (None, "none") or not h:
            continue
        cur = by_height.get(h)
        size = _size(f, duration)
        is_h264 = "avc" in (f.get("vcodec") or "").lower()
        cur_is_h264 = "avc" in (cur.get("vcodec") or "").lower() if cur else False
        has_real_size = bool(f.get("filesize"))
        cur_has_real_size = bool(cur.get("has_real_size")) if cur else False

        should_replace = False
        if not cur:
            should_replace = True
        elif is_h264 and not cur_is_h264:
            should_replace = True
        elif is_h264 == cur_is_h264 and has_real_size and not cur_has_real_size:
            should_replace = True
        elif is_h264 == cur_is_h264 and (has_real_size == cur_has_real_size) and size > cur["vsize"]:
            should_replace = True

        short_side = min(h, w) if w else h
        fps_val = max(f.get("fps") or 0, (cur or {}).get("fps") or 0)
        if should_replace:
            by_height[h] = {
                "height": h,
                "label": f"{short_side}p",
                "short": short_side,
                "fps": fps_val,
                "vsize": size,
                "vcodec": f.get("vcodec") or "",
                "has_real_size": has_real_size,
            }
        else:
            cur["fps"] = fps_val
    qualities = []
    seen = set()
    for h in sorted(by_height, reverse=True):
        q = by_height[h]
        if q["label"] in seen or q["short"] < 144:
            continue
        seen.add(q["label"])
        badge = ("8K" if q["short"] >= 4320 else "4K" if q["short"] >= 2160 else "2K" if q["short"] >= 1440
                 else "Full HD" if q["short"] >= 1080 else "HD" if q["short"] >= 720 else "")
        qualities.append({
            "height": h,
            "label": q["label"],
            "badge": badge,
            "fps": int(q["fps"] or 0),
            "size": (q["vsize"] + audio_size) or None,
        })

    return {
        "type": "video",
        "url": info.get("webpage_url") or url,
        "id": info.get("id"),
        "title": info.get("title"),
        "channel": info.get("channel") or info.get("uploader"),
        "duration": duration,
        "thumbnail": info.get("thumbnail"),
        "views": info.get("view_count"),
        "upload_date": info.get("upload_date"),
        "is_live": bool(info.get("is_live")),
        "has_playlist": "list=" in url,
        "qualities": qualities,
        "audio_size": audio_size or None,
        "audio_abr": (best_audio or {}).get("abr"),
    }


# ---------------------------------------------------------------- jobs
PP_LABELS = {
    "Merger": "Видео, дууг нэгтгэж байна…",
    "FFmpegMerger": "Видео, дууг нэгтгэж байна…",
    "ExtractAudio": "Аудио хөрвүүлж байна…",
    "FFmpegExtractAudio": "Аудио хөрвүүлж байна…",
    "EmbedThumbnail": "Нүүр зураг оруулж байна…",
    "FFmpegMetadata": "Мэдээлэл бичиж байна…",
    "MoveFiles": "Дуусгаж байна…",
}


class Job:
    def __init__(self, req: dict, out_dir: str):
        self.id = uuid.uuid4().hex[:10]
        self.req = req
        self.out_dir = out_dir
        self.created = time.time()
        self.status = "queued"  # queued|downloading|processing|done|error|canceled
        self.progress = 0.0
        self.speed = None
        self.eta = None
        self.message = "Дараалалд байна…"
        self.error = None
        self.filepath = None
        self.item = None  # (n, total) playlist-д
        self.cancel = threading.Event()
        self._tmp_files: set[str] = set()

    def to_dict(self) -> dict:
        r = self.req
        return {
            "id": self.id,
            "title": r.get("title") or r.get("url"),
            "thumbnail": r.get("thumbnail"),
            "mode": r.get("mode"),
            "label": r.get("label"),
            "status": self.status,
            "progress": round(self.progress, 1),
            "speed": self.speed,
            "eta": self.eta,
            "message": self.message,
            "error": self.error,
            "filepath": self.filepath,
            "item": self.item,
            "created": self.created,
        }


class JobManager:
    def __init__(self, max_parallel: int = 2):
        self.jobs: dict[str, Job] = {}
        self.lock = threading.Lock()
        self.sem = threading.Semaphore(max_parallel)

    # --- public
    def add(self, req: dict) -> Job:
        job = Job(req, load_settings()["out_dir"])
        with self.lock:
            self.jobs[job.id] = job
        threading.Thread(target=self._run, args=(job,), daemon=True).start()
        return job

    def list(self) -> list[dict]:
        with self.lock:
            jobs = list(self.jobs.values())
        return [j.to_dict() for j in sorted(jobs, key=lambda j: j.created, reverse=True)]

    def get(self, job_id: str) -> Job | None:
        return self.jobs.get(job_id)

    def cancel(self, job_id: str):
        job = self.get(job_id)
        if job and job.status in ("queued", "downloading", "processing"):
            job.cancel.set()
            if job.status == "queued":
                job.status, job.message = "canceled", "Цуцалсан"

    def retry(self, job_id: str) -> Job | None:
        job = self.get(job_id)
        if not job:
            return None
        self.remove(job_id)
        return self.add(job.req)

    def remove(self, job_id: str):
        with self.lock:
            job = self.jobs.get(job_id)
            if job and job.status in ("done", "error", "canceled"):
                del self.jobs[job_id]

    def clear_finished(self):
        with self.lock:
            for jid in [j.id for j in self.jobs.values() if j.status in ("done", "error", "canceled")]:
                del self.jobs[jid]

    @property
    def active(self) -> int:
        return sum(1 for j in self.jobs.values() if j.status in ("queued", "downloading", "processing"))

    # --- internals
    def _run(self, job: Job):
        with self.sem:
            if job.cancel.is_set():
                job.status, job.message = "canceled", "Цуцалсан"
                return
            job.status, job.message = "downloading", "Холбогдож байна…"
            stop_monitor = threading.Event()
            monitor_t = threading.Thread(target=self._monitor_progress, args=(job, stop_monitor), daemon=True)
            try:
                os.makedirs(job.out_dir, exist_ok=True)
                opts = self._options(job)
                monitor_t.start()
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(job.req["url"], download=True)
                if job.req.get("playlist"):
                    title = (info or {}).get("title") or "Playlist"
                    job.filepath = job.filepath and os.path.dirname(job.filepath) or os.path.join(job.out_dir, title)
                elif not job.filepath and info:
                    rd = info.get("requested_downloads") or []
                    if rd:
                        job.filepath = rd[0].get("filepath")
                job.status, job.progress, job.message = "done", 100.0, "Дууслаа"
                job.speed = job.eta = None
            except yt_dlp.utils.DownloadCancelled:
                job.status, job.message, job.speed, job.eta = "canceled", "Цуцалсан", None, None
            except Exception as e:  # noqa: BLE001
                if job.cancel.is_set():
                    job.status, job.message = "canceled", "Цуцалсан"
                else:
                    job.status, job.error = "error", friendly_error(e)
                    job.message = job.error
                job.speed = job.eta = None
            finally:
                stop_monitor.set()
                self._cleanup(job)

    def _monitor_progress(self, job: Job, stop_ev: threading.Event):
        prog_file = getattr(job, "_prog_file", None)
        sec_start = job.req.get("start") or 0
        sec_end = job.req.get("end")
        sec_len = (sec_end - sec_start) if sec_end else None

        while not stop_ev.is_set():
            time.sleep(0.4)
            if job.status != "downloading":
                break
            if prog_file and os.path.isfile(prog_file):
                try:
                    with open(prog_file, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()[-25:]
                    vals = {}
                    for line in lines:
                      if "=" in line:
                        k, v = line.strip().split("=", 1)
                        vals[k] = v
                    out_us = int(vals.get("out_time_us") or vals.get("out_time_ms", 0))
                    cur_sec = out_us / 1000000.0
                    total_b = int(vals.get("total_size") or 0)
                    speed_val = vals.get("speed", "").strip()

                    if sec_len and sec_len > 0:
                        pct = min(99.0, (cur_sec / sec_len) * 100.0)
                        job.progress = max(job.progress, pct)
                        mb = f" · {total_b / 1048576:.1f} MB" if total_b else ""
                        sp = f" · {speed_val}" if speed_val else ""
                        job.message = f"{fmt_time(cur_sec)} / {fmt_time(sec_len)}{mb}{sp}"
                    elif cur_sec > 0:
                        mb = f" ({total_b / 1048576:.1f} MB)" if total_b else ""
                        job.message = f"{fmt_time(cur_sec)} татсан{mb}"
                except Exception:
                    pass

    @staticmethod
    def _cleanup(job: Job):
        for f in job._tmp_files:
            for p in (f, f + ".part", f + ".ytdl"):
                try:
                    if os.path.isfile(p):
                        os.remove(p)
                except OSError:
                    pass
        prog_file = getattr(job, "_prog_file", None)
        if prog_file and os.path.isfile(prog_file):
            try:
                os.remove(prog_file)
            except OSError:
                pass

    def _options(self, job: Job) -> dict:
        r = job.req
        start, end = r.get("start"), r.get("end")
        section = start is not None or end is not None

        if r.get("playlist"):
            outtmpl = os.path.join(job.out_dir, "%(playlist_title)s", "%(playlist_index)02d - %(title)s.%(ext)s")
        else:
            name = "%(title)s"
            if section:
                name += f" [{fmt_time(start or 0, '-')}_{fmt_time(end, '-') if end is not None else 'end'}]"
            outtmpl = os.path.join(job.out_dir, name + ".%(ext)s")

        import tempfile
        prog_file = os.path.join(tempfile.gettempdir(), f"tatagch_prog_{job.id}.txt")
        job._prog_file = prog_file

        opts: dict = {
            **_base_opts(),
            "outtmpl": outtmpl,
            "ffmpeg_location": FFMPEG_PATH,
            "windowsfilenames": True,
            "noplaylist": not r.get("playlist"),
            "progress_hooks": [lambda d: self._on_progress(job, d)],
            "postprocessor_hooks": [lambda d: self._on_pp(job, d)],
            "post_hooks": [lambda path: setattr(job, "filepath", path)],
            "retries": 10,
            "fragment_retries": 10,
            "concurrent_fragment_downloads": 8,
            "external_downloader_args": {
                "ffmpeg_i": [
                    "-reconnect", "1",
                    "-reconnect_streamed", "1",
                    "-reconnect_delay_max", "5",
                    "-multiple_requests", "1",
                    "-tcp_nodelay", "1",
                ],
                "ffmpeg": ["-progress", prog_file],
                "default": ["-progress", prog_file],
            },
        }
        if r.get("playlist") and r.get("items"):
            opts["playlist_items"] = ",".join(str(int(i)) for i in r["items"])

        if section:
            def ranges(info, ydl, s=start or 0, e=end):
                dur = info.get("duration")
                stop = e if e is not None else dur
                if dur and s >= dur:
                    raise yt_dlp.utils.DownloadError("Эхлэх хугацаа видеоны уртаас их байна.")
                if dur and stop and stop > dur:
                    stop = dur
                yield {"start_time": s, "end_time": stop}

            opts["download_ranges"] = ranges

        if r.get("mode") == "audio":
            codec = r.get("audio_format") or "mp3"
            opts["format"] = "bestaudio[ext=m4a]/bestaudio/best" if codec == "m4a" else "bestaudio/best"
            pp = {"key": "FFmpegExtractAudio", "preferredcodec": codec}
            if codec == "mp3":
                pp["preferredquality"] = str(r.get("bitrate") or 192)
            opts["postprocessors"] = [
                pp,
                {"key": "FFmpegMetadata", "add_metadata": True},
                {"key": "EmbedThumbnail"},
            ]
            opts["writethumbnail"] = True
        else:
            h = r.get("height")
            fps = r.get("fps")
            lim = f"[height<={int(h)}]" if h else ""
            opts["format"] = f"bestvideo{lim}+bestaudio/best{lim}/best"
            if fps:
                fps_val = int(fps)
                opts["format_sort"] = ["res", f"fps:{fps_val}", "vcodec:h264", "acodec:m4a"]
            else:
                opts["format_sort"] = ["res", "vcodec:h264", "acodec:m4a"]
            opts["merge_output_format"] = "mp4"
        return opts

    def _on_progress(self, job: Job, d: dict):
        if job.cancel.is_set():
            raise yt_dlp.utils.DownloadCancelled("Цуцалсан")
        info = d.get("info_dict") or {}
        if d.get("filename"):
            job._tmp_files.add(d["filename"])
        n = info.get("playlist_autonumber")
        total_items = info.get("n_entries") or info.get("playlist_count")
        if job.req.get("playlist") and n and total_items:
            job.item = [int(n), int(total_items)]

        if d["status"] == "downloading":
            job.status = "downloading"
            done = d.get("downloaded_bytes") or 0
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            frac = min(done / total, 1.0) if total else None

            # видео + аудио тусдаа татагдах үед нийт явцыг жигнэх
            rf = info.get("requested_formats") or []
            fid = str(info.get("format_id") or "")
            if len(rf) == 2 and "+" not in fid and frac is not None:
                sizes = [_size(f, info.get("duration")) for f in rf]
                ws = [s / sum(sizes) for s in sizes] if all(sizes) else [0.9, 0.1]
                idx = next((i for i, f in enumerate(rf) if str(f.get("format_id")) == fid), 0)
                frac = sum(ws[:idx]) + ws[idx] * frac

            if frac is not None:
                if job.item:
                    frac = ((job.item[0] - 1) + frac) / job.item[1]
                # playlist-д явц зүйл бүрээр тооцогдоно; дан видеонд ухрахгүй байлгана
                job.progress = frac * 100 if job.item else max(job.progress, frac * 100)
                job.message = None
            else:
                job.message = f"{done / 1048576:.1f} MB татсан"
            job.speed = d.get("speed")
            job.eta = d.get("eta")
        elif d["status"] == "finished":
            job.speed = job.eta = None

    def _on_pp(self, job: Job, d: dict):
        if d.get("status") == "started":
            job.status = "processing"
            job.message = PP_LABELS.get(d.get("postprocessor"), "Боловсруулж байна…")
            job.speed = job.eta = None


# ---------------------------------------------------------------- OS helpers
def reveal_in_explorer(path: str):
    if path and os.path.exists(path):
        if os.path.isdir(path):
            os.startfile(path)
        else:
            subprocess.Popen(f'explorer /select,"{os.path.normpath(path)}"')


def open_path(path: str):
    if path and os.path.exists(path):
        os.startfile(path)


def read_clipboard() -> str:
    """Windows clipboard-оос текст уншина (зөвшөөрөл асуухгүй)."""
    import ctypes
    from ctypes import wintypes

    user32, kernel32 = ctypes.windll.user32, ctypes.windll.kernel32
    user32.GetClipboardData.restype = wintypes.HANDLE
    user32.GetClipboardData.argtypes = [wintypes.UINT]
    kernel32.GlobalLock.restype = ctypes.c_void_p
    kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
    kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
    CF_UNICODETEXT = 13
    if not user32.OpenClipboard(None):
        return ""
    try:
        h = user32.GetClipboardData(CF_UNICODETEXT)
        if not h:
            return ""
        p = kernel32.GlobalLock(h)
        if not p:
            return ""
        try:
            return ctypes.wstring_at(p)
        finally:
            kernel32.GlobalUnlock(h)
    finally:
        user32.CloseClipboard()
