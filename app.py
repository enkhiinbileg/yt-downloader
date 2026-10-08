"""YouTube татагч — YouTube линкээр видео / аудио татах энгийн програм."""

import os
import queue
import shutil
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import imageio_ffmpeg
import yt_dlp


def _ensure_ffmpeg() -> str:
    """imageio-ffmpeg-ийн exe-г bin/ffmpeg.exe нэрээр хуулна (yt-dlp яг энэ нэрийг хайдаг)."""
    bin_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bin")
    exe = os.path.join(bin_dir, "ffmpeg.exe")
    if not os.path.isfile(exe):
        os.makedirs(bin_dir, exist_ok=True)
        shutil.copy2(imageio_ffmpeg.get_ffmpeg_exe(), exe)
    # yt-dlp-ийн хэсэгчлэн татагч (FFmpegFD) зөвхөн PATH дээрээс ffmpeg хайдаг
    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
    return exe


FFMPEG_PATH = _ensure_ffmpeg()
DEFAULT_DIR = os.path.join(os.path.expanduser("~"), "Downloads")

QUALITIES = {
    "Хамгийн сайн": None,
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
    "360p": 360,
}


def parse_time(text: str):
    """'90', '1:30', '1:02:03' -> секунд. Хоосон бол None."""
    text = text.strip()
    if not text:
        return None
    parts = text.split(":")
    if len(parts) > 3:
        raise ValueError(f"Буруу хугацаа: {text}")
    try:
        nums = [float(p) for p in parts]
    except ValueError:
        raise ValueError(f"Буруу хугацаа: {text}  (жишээ нь 1:30 эсвэл 01:02:03)") from None
    if any(n < 0 for n in nums) or any(n >= 60 for n in nums[1:]):
        raise ValueError(f"Буруу хугацаа: {text}")
    secs = 0.0
    for n in nums:
        secs = secs * 60 + n
    return secs


def fmt_time(secs: float, sep: str = ":") -> str:
    secs = int(secs)
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}{sep}{m:02d}{sep}{s:02d}" if h else f"{m}{sep}{s:02d}"


def build_options(mode: str, quality: str, out_dir: str, playlist: bool, hook, section=None):
    """section: (start_sec | None, end_sec | None) — зөвхөн тэр хэсгийг татна."""
    name = "%(title)s"
    if section:
        start, end = section
        a = fmt_time(start or 0, "-")
        b = fmt_time(end, "-") if end is not None else "end"
        name += f" [{a}_{b}]"
    opts = {
        "outtmpl": os.path.join(out_dir, name + ".%(ext)s"),
        "ffmpeg_location": FFMPEG_PATH,
        "noplaylist": not playlist,
        "progress_hooks": [hook],
        "quiet": True,
        "no_warnings": True,
        "windowsfilenames": True,
    }
    if section:
        start, end = section

        def ranges(info, ydl):
            dur = info.get("duration")
            s = start or 0
            e = end if end is not None else dur
            if dur and s >= dur:
                raise yt_dlp.utils.DownloadError(
                    f"Эхлэх хугацаа ({fmt_time(s)}) видеоны уртаас ({fmt_time(dur)}) их байна.")
            if dur and e > dur:
                e = dur
            yield {"start_time": s, "end_time": e}

        opts["download_ranges"] = ranges
        opts["force_keyframes_at_cuts"] = True  # яг заасан секундээр огтлох
    if mode == "audio":
        opts["format"] = "bestaudio/best"
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    else:
        h = QUALITIES.get(quality)
        limit = f"[height<={h}]" if h else ""
        opts["format"] = f"bestvideo{limit}+bestaudio/best{limit}/best"
        opts["merge_output_format"] = "mp4"
    return opts


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("YouTube татагч")
        self.geometry("700x440")
        self.minsize(640, 420)
        self.msgs: queue.Queue = queue.Queue()
        self.busy = False

        pad = {"padx": 10, "pady": 5}
        frm = ttk.Frame(self, padding=10)
        frm.pack(fill="both", expand=True)
        frm.columnconfigure(1, weight=1)

        ttk.Label(frm, text="YouTube линк:").grid(row=0, column=0, sticky="w", **pad)
        self.url = tk.StringVar()
        url_entry = ttk.Entry(frm, textvariable=self.url)
        url_entry.grid(row=0, column=1, columnspan=2, sticky="ew", **pad)
        url_entry.focus()
        url_entry.bind("<Return>", lambda e: self.start())

        ttk.Label(frm, text="Төрөл:").grid(row=1, column=0, sticky="w", **pad)
        self.mode = tk.StringVar(value="video")
        mfrm = ttk.Frame(frm)
        mfrm.grid(row=1, column=1, columnspan=2, sticky="w", **pad)
        ttk.Radiobutton(mfrm, text="Видео (MP4)", variable=self.mode, value="video",
                        command=self._toggle_quality).pack(side="left")
        ttk.Radiobutton(mfrm, text="Аудио (MP3)", variable=self.mode, value="audio",
                        command=self._toggle_quality).pack(side="left", padx=15)

        ttk.Label(frm, text="Чанар:").grid(row=2, column=0, sticky="w", **pad)
        self.quality = tk.StringVar(value="Хамгийн сайн")
        self.quality_box = ttk.Combobox(frm, textvariable=self.quality, state="readonly",
                                        values=list(QUALITIES), width=15)
        self.quality_box.grid(row=2, column=1, sticky="w", **pad)

        self.playlist = tk.BooleanVar(value=False)
        ttk.Checkbutton(frm, text="Playlist бүтнээр нь татах", variable=self.playlist).grid(
            row=3, column=1, sticky="w", **pad)

        # --- Хугацаа тааруулах ---
        self.use_range = tk.BooleanVar(value=False)
        ttk.Checkbutton(frm, text="Хугацаа:", variable=self.use_range,
                        command=self._toggle_range).grid(row=4, column=0, sticky="w", **pad)
        tfrm = ttk.Frame(frm)
        tfrm.grid(row=4, column=1, columnspan=2, sticky="w", **pad)
        ttk.Label(tfrm, text="Эхлэх").pack(side="left")
        self.t_start = tk.StringVar(value="0:00")
        self.start_entry = ttk.Entry(tfrm, textvariable=self.t_start, width=10)
        self.start_entry.pack(side="left", padx=(5, 15))
        ttk.Label(tfrm, text="Дуусах").pack(side="left")
        self.t_end = tk.StringVar(value="")
        self.end_entry = ttk.Entry(tfrm, textvariable=self.t_end, width=10)
        self.end_entry.pack(side="left", padx=5)
        ttk.Label(tfrm, text="(жиш: 1:30, 1:02:03. Хоосон = төгсгөл хүртэл)",
                  foreground="gray").pack(side="left", padx=5)
        self._toggle_range()

        ttk.Label(frm, text="Хадгалах газар:").grid(row=5, column=0, sticky="w", **pad)
        self.out_dir = tk.StringVar(value=DEFAULT_DIR)
        ttk.Entry(frm, textvariable=self.out_dir).grid(row=5, column=1, sticky="ew", **pad)
        ttk.Button(frm, text="Сонгох...", command=self._pick_dir).grid(row=5, column=2, **pad)

        self.btn = ttk.Button(frm, text="Татах", command=self.start)
        self.btn.grid(row=6, column=0, columnspan=3, pady=10)

        self.progress = ttk.Progressbar(frm, maximum=100)
        self.progress.grid(row=7, column=0, columnspan=3, sticky="ew", **pad)
        self.status = tk.StringVar(value="Линкээ оруулаад 'Татах' дарна уу.")
        ttk.Label(frm, textvariable=self.status, wraplength=640).grid(
            row=8, column=0, columnspan=3, sticky="w", **pad)

        ttk.Button(frm, text="Хавтас нээх", command=self._open_dir).grid(
            row=9, column=0, columnspan=3, pady=5)

        self.after(100, self._poll)

    # --- UI helpers ---
    def _toggle_range(self):
        state = "normal" if self.use_range.get() else "disabled"
        self.start_entry.config(state=state)
        self.end_entry.config(state=state)

    def _toggle_quality(self):
        self.quality_box.config(state="disabled" if self.mode.get() == "audio" else "readonly")

    def _pick_dir(self):
        d = filedialog.askdirectory(initialdir=self.out_dir.get())
        if d:
            self.out_dir.set(d)

    def _open_dir(self):
        d = self.out_dir.get()
        if os.path.isdir(d):
            os.startfile(d)

    def _poll(self):
        try:
            while True:
                kind, val = self.msgs.get_nowait()
                if kind == "progress":
                    self.progress["value"] = val
                elif kind == "status":
                    self.status.set(val)
                elif kind == "done":
                    self.busy = False
                    self.btn.config(state="normal")
                    self.progress["value"] = 100
                    self.status.set(val)
                    messagebox.showinfo("Дууслаа", val)
                elif kind == "error":
                    self.busy = False
                    self.btn.config(state="normal")
                    self.status.set("Алдаа: " + val)
                    messagebox.showerror("Алдаа", val)
        except queue.Empty:
            pass
        self.after(100, self._poll)

    # --- download ---
    def _hook(self, d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            done = d.get("downloaded_bytes", 0)
            pct = done / total * 100 if total else 0
            speed = d.get("speed") or 0
            name = os.path.basename(d.get("filename", ""))
            self.msgs.put(("progress", pct))
            if total:
                info = f"{pct:.1f}%  —  {speed / 1024 / 1024:.2f} MB/s"
            else:
                info = f"{done / 1024 / 1024:.1f} MB татсан"
            self.msgs.put(("status", f"Татаж байна: {name}\n{info}"))
        elif d["status"] == "finished":
            self.msgs.put(("status", "Боловсруулж байна (нэгтгэх / хөрвүүлэх)..."))

    def start(self):
        if self.busy:
            return
        url = self.url.get().strip()
        if not url:
            messagebox.showwarning("Анхаар", "YouTube линк оруулна уу.")
            return
        out_dir = self.out_dir.get().strip() or DEFAULT_DIR
        os.makedirs(out_dir, exist_ok=True)

        section = None
        if self.use_range.get():
            try:
                s = parse_time(self.t_start.get())
                e = parse_time(self.t_end.get())
            except ValueError as err:
                messagebox.showwarning("Анхаар", str(err))
                return
            if e is not None and e <= (s or 0):
                messagebox.showwarning("Анхаар", "Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.")
                return
            if s or e is not None:
                section = (s, e)

        self.busy = True
        self.btn.config(state="disabled")
        self.progress["value"] = 0
        self.status.set("Мэдээлэл авч байна...")
        opts = build_options(self.mode.get(), self.quality.get(), out_dir,
                             self.playlist.get(), self._hook, section)
        threading.Thread(target=self._worker, args=(url, opts), daemon=True).start()

    def _worker(self, url, opts):
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
            title = info.get("title", "") if info else ""
            self.msgs.put(("done", f"Амжилттай татлаа: {title}"))
        except Exception as e:  # noqa: BLE001
            self.msgs.put(("error", str(e)))


if __name__ == "__main__":
    App().mainloop()
