'use strict';

/* ================================================================
   Helpers
   ================================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  video: '<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  mute: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  play: '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  list: '<path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/><path d="m16 12 5 3-5 3v-6Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  crosshair: '<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const ic = (n, cls = '') => `<span class="ic ${cls}">${svg(n)}</span>`;
const hydrateIcons = (root = document) => $$('[data-ic]', root).forEach((el) => { el.innerHTML = svg(el.dataset.ic); });

const fmtTime = (s) => {
  if (s == null || isNaN(s)) return '--:--';
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
};
const parseTime = (t) => {
  t = String(t).trim();
  if (!t) return null;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return NaN;
  const p = t.split(':').map(Number);
  if (p.slice(1).some((n) => n >= 60)) return NaN;
  return p.reduce((a, n) => a * 60 + n, 0);
};
const fmtSize = (b) => {
  if (!b) return '';
  if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
};
const fmtViews = (n) => {
  if (n == null) return '';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' тэрбум';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' сая';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' мянга';
  return String(n);
};
const fmtDate = (d) => (d && d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}` : '');
const fmtEta = (s) => (s == null ? '' : s >= 3600 ? `${Math.floor(s / 3600)}ц ${Math.floor((s % 3600) / 60)}м` : s >= 60 ? `${Math.floor(s / 60)}м ${s % 60}с` : `${s}с`);
const isYtUrl = (t) => /^(https?:\/\/)?([\w-]+\.)?(youtube\.com|youtu\.be)\/\S+/i.test(String(t).trim());

async function api(path, body) {
  const opt = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch('/api' + path, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Алдаа гарлаа');
  return j;
}

/* ================================================================
   Toasts
   ================================================================ */
function toast(msg, { type = 'info', action, onAction, timeout = 3800 } = {}) {
  const icon = { ok: 'checkCircle', err: 'alert', info: 'info' }[type];
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${ic(icon)}<div class="msg">${esc(msg)}</div>${action ? `<button>${esc(action)}</button>` : ''}`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (action) el.querySelector('button').onclick = () => { onAction?.(); close(); };
  $('#toasts').appendChild(el);
  const list = $$('.toast');
  if (list.length > 3) list[0].remove();
  setTimeout(close, timeout);
}

/* ================================================================
   State
   ================================================================ */
const AUDIO_PRESETS = [
  { id: 'mp3-320', fmt: 'mp3', br: 320, name: 'MP3', sub: '320 kbps', badge: 'ДЭЭД' },
  { id: 'mp3-192', fmt: 'mp3', br: 192, name: 'MP3', sub: '192 kbps', badge: 'САНАЛ' },
  { id: 'mp3-128', fmt: 'mp3', br: 128, name: 'MP3', sub: '128 kbps', badge: '' },
  { id: 'm4a', fmt: 'm4a', br: null, name: 'M4A', sub: 'Эх чанар', badge: 'AAC' },
];
const PL_QUALITIES = [
  { height: null, label: 'Хамгийн сайн', badge: '' },
  { height: 1080, label: '1080p', badge: 'Full HD' },
  { height: 720, label: '720p', badge: 'HD' },
  { height: 480, label: '480p', badge: '' },
  { height: 360, label: '360p', badge: '' },
];

const S = {
  info: null,
  token: 0,
  mode: localStorage.getItem('mode') || 'video',
  fps: localStorage.getItem('fps') || '30',
  quality: null, // сонгосон quality объект
  audio: AUDIO_PRESETS.find((p) => p.id === localStorage.getItem('audio')) || AUDIO_PRESETS[1],
  trim: false,
  start: 0,
  end: 0,
  sel: new Set(),
  player: null,
  playerReady: false,
  previewing: false,
  lastClip: '',
};

const stage = $('#stage');
const urlInput = $('#urlInput');

/* ================================================================
   Stage states
   ================================================================ */
function renderEmpty() {
  destroyPlayer();
  S.info = null;
  stage.innerHTML = `
    <div class="empty enter">
      <div class="empty-art">${ic('download')}</div>
      <h1>Линкээ буулгаад эхэлцгээе</h1>
      <p>Видео, Shorts, Playlist — MP4 болон MP3 хэлбэрээр, хүссэн чанараараа хэдхэн секундэд.</p>
      <div class="kbd-hint">Хаана ч хамаагүй <kbd>Ctrl</kbd> + <kbd>V</kbd> дарахад л болно</div>
      <div class="features">
        <div class="feature"><div class="f-ic f-red">${ic('zap')}</div><h4>4K хүртэл чанар</h4><p>Бодит чанар, файлын хэмжээг урьдчилан харуулна.</p></div>
        <div class="feature"><div class="f-ic f-violet">${ic('scissors')}</div><h4>Хэсэг таслах</h4><p>Тоглуулагч дээр харж байгаад хэрэгтэй хэсгээ л татна.</p></div>
        <div class="feature"><div class="f-ic f-green">${ic('music')}</div><h4>MP3 + нүүр зураг</h4><p>Дууны нэр, нүүр зурагтай цэвэр аудио файл.</p></div>
      </div>
    </div>`;
}

function renderLoading() {
  destroyPlayer();
  stage.innerHTML = `
    <div class="card loading-card enter">
      <div class="sk sk-media"></div>
      <div class="lines">
        <div class="sk" style="height:12px;width:70px"></div>
        <div class="sk" style="height:22px;width:92%"></div>
        <div class="sk" style="height:22px;width:64%"></div>
        <div class="sk" style="height:14px;width:45%;margin-top:6px"></div>
        <div class="loading-status"><div class="spinner"></div>Видеоны мэдээллийг авч байна…</div>
      </div>
    </div>`;
}

function renderError(msg, retry) {
  destroyPlayer();
  stage.innerHTML = `
    <div class="card error-card enter">
      <div class="error-ic">${ic('alert')}</div>
      <h3>Мэдээлэл авч чадсангүй</h3>
      <p>${esc(msg)}</p>
      <button class="ghost-btn" id="retryBtn">${ic('refresh')}Дахин оролдох</button>
    </div>`;
  $('#retryBtn').onclick = retry;
}

async function lookup(url, { playlist = false } = {}) {
  url = (url ?? urlInput.value).trim();
  if (!url) { shake($('#searchBox')); urlInput.focus(); return; }
  if (!/^https?:\/\//i.test(url) && !isYtUrl(url)) {
    shake($('#searchBox'));
    toast('Энэ YouTube линк биш бололтой.', { type: 'err' });
    return;
  }
  urlInput.value = url;
  syncClearBtn();
  hideClip();
  const token = ++S.token;
  renderLoading();
  $('#fetchBtn').disabled = true;
  try {
    const info = await api('/info', { url, playlist });
    if (token !== S.token) return;
    S.info = info;
    info.type === 'playlist' ? renderPlaylist(info) : renderVideo(info);
  } catch (e) {
    if (token !== S.token) return;
    renderError(e.message, () => lookup(url, { playlist }));
  } finally {
    if (token === S.token) $('#fetchBtn').disabled = false;
  }
}

function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* ================================================================
   Shared option blocks
   ================================================================ */
function segmentedHTML() {
  return `
    <div class="segmented" id="modeSeg" role="group" aria-label="Төрөл">
      <div class="seg-thumb"></div>
      <button class="seg" data-mode="video" aria-pressed="${S.mode === 'video'}">${ic('video')}Видео <span class="seg-sub">Дуутай</span></button>
      <button class="seg" data-mode="mute" aria-pressed="${S.mode === 'mute'}">${ic('mute')}Дуугүй <span class="seg-sub">Mute 🔇</span></button>
      <button class="seg" data-mode="audio" aria-pressed="${S.mode === 'audio'}">${ic('music')}Аудио <span class="seg-sub">MP3 / M4A</span></button>
    </div>`;
}

function placeSegThumb() {
  const seg = $('#modeSeg');
  if (!seg) return;
  const on = seg.querySelector('[aria-pressed="true"]');
  const th = seg.querySelector('.seg-thumb');
  th.style.left = on.offsetLeft + 'px';
  th.style.width = on.offsetWidth + 'px';
}

function bindSegmented(onChange) {
  $$('#modeSeg .seg').forEach((b) => (b.onclick = () => {
    if (S.mode === b.dataset.mode) return;
    S.mode = b.dataset.mode;
    localStorage.setItem('mode', S.mode);
    $$('#modeSeg .seg').forEach((x) => x.setAttribute('aria-pressed', x === b));
    placeSegThumb();
    $('#fpsSection')?.classList.toggle('hidden', S.mode === 'audio');
    placeFpsThumb();
    onChange();
  }));
  requestAnimationFrame(placeSegThumb);
}

function fpsSegmentedHTML() {
  return `
    <div id="fpsSection" class="${S.mode === 'audio' ? 'hidden' : ''}">
      <div class="field-label"><span>Кадрын хурд (FPS)</span><span class="hint" id="fpsHint">30 FPS нь хэмжээ бага, түргэн татна</span></div>
      <div class="segmented" id="fpsSeg" role="group" aria-label="FPS">
        <div class="seg-thumb"></div>
        <button class="seg" data-fps="30" aria-pressed="${S.fps === '30'}">${ic('zap')}30 FPS <span class="seg-sub">Санал болгох</span></button>
        <button class="seg" data-fps="60" aria-pressed="${S.fps === '60'}">60 FPS / Дээд <span class="seg-sub">Оригинал</span></button>
      </div>
    </div>`;
}

function placeFpsThumb() {
  const seg = $('#fpsSeg');
  if (!seg) return;
  const on = seg.querySelector('[aria-pressed="true"]');
  const th = seg.querySelector('.seg-thumb');
  if (on && th) {
    th.style.left = on.offsetLeft + 'px';
    th.style.width = on.offsetWidth + 'px';
  }
}

function bindFps(onChange) {
  $$('#fpsSeg .seg').forEach((b) => (b.onclick = () => {
    if (S.fps === b.dataset.fps) return;
    S.fps = b.dataset.fps;
    localStorage.setItem('fps', S.fps);
    $$('#fpsSeg .seg').forEach((x) => x.setAttribute('aria-pressed', x === b));
    placeFpsThumb();
    onChange();
  }));
  requestAnimationFrame(placeFpsThumb);
}

function chipHTML({ key, title, badge, sub, pressed }) {
  return `
    <button class="chip" data-key="${esc(key)}" aria-pressed="${pressed}">
      <span class="chip-check">${ic('check')}</span>
      <div class="chip-top">${esc(title)}${badge ? `<span class="chip-badge">${esc(badge)}</span>` : ''}</div>
      <div class="chip-size">${esc(sub || ' ')}</div>
    </button>`;
}

function trimFactor() {
  const d = S.info?.duration;
  return S.trim && d ? (S.end - S.start) / d : 1;
}

function audioSize(p, duration) {
  if (!duration) return 0;
  if (p.fmt === 'mp3') return (p.br * 1000 / 8) * duration;
  return S.info?.audio_size || 0;
}

/* ================================================================
   Video card
   ================================================================ */
function pickDefaultQuality(qs) {
  if (!qs.length) return null;
  const pref = parseInt(localStorage.getItem('quality') || '1080', 10);
  return qs.find((q) => parseInt(q.label, 10) <= pref) || qs[qs.length - 1];
}

function renderVideo(v) {
  destroyPlayer();
  S.quality = pickDefaultQuality(v.qualities);
  S.trim = false;
  S.start = 0;
  S.end = v.duration || 0;
  const canTrim = !!v.duration && !v.is_live;

  stage.innerHTML = `
    <div class="card enter" id="videoCard">
      <div class="v-top">
        <div class="player-wrap">
          <div id="player"></div>
          <img class="poster" id="playerPoster" src="${esc(v.thumbnail)}" alt="">
          ${v.duration ? `<span class="dur-chip" id="durChip">${fmtTime(v.duration)}</span>` : ''}
        </div>
        <div class="v-meta">
          <div class="eyebrow">${ic(v.is_live ? 'zap' : 'video')}${v.is_live ? 'Шууд дамжуулалт' : 'Видео'}</div>
          <h2 class="v-title" title="${esc(v.title)}">${esc(v.title)}</h2>
          <div class="v-sub">
            ${v.channel ? `<span>${ic('user')}${esc(v.channel)}</span>` : ''}
            ${v.views != null ? `<span>${ic('eye')}${fmtViews(v.views)} үзэлт</span>` : ''}
            ${v.upload_date ? `<span>${ic('calendar')}${fmtDate(v.upload_date)}</span>` : ''}
            ${v.duration ? `<span>${ic('clock')}${fmtTime(v.duration)}</span>` : ''}
          </div>
          ${v.has_playlist ? `
            <div class="notice">${ic('list')}<span style="flex:1">Энэ видео playlist-д багтдаг.</span>
              <button class="link-btn" id="openPlaylist">Бүтэн playlist →</button></div>` : ''}
        </div>
      </div>

      <div class="opts">
        <div>
          <div class="field-label">Төрөл</div>
          ${segmentedHTML()}
        </div>
        <div>
          <div class="field-label"><span id="chipsLabel">Чанар</span><span class="hint" id="chipsHint"></span></div>
          <div class="chips" id="chips"></div>
        </div>
        ${fpsSegmentedHTML()}
        ${canTrim ? trimHTML(v.duration) : ''}
      </div>

      <div class="action-bar">
        <div class="sum">
          <div class="sum-main" id="sumMain"></div>
          <div class="sum-sub" id="sumSub"></div>
        </div>
        <button class="download-btn" id="dlBtn">${ic('download')}<span>Татах</span></button>
      </div>
    </div>`;

  bindSegmented(() => { renderVideoChips(); updateVideoSummary(); });
  bindFps(() => { updateVideoSummary(); });
  renderVideoChips();
  if (canTrim) bindTrim(v.duration);
  updateVideoSummary();
  $('#dlBtn').onclick = downloadVideo;
  $('#openPlaylist')?.addEventListener('click', () => lookup(v.url, { playlist: true }));
  mountPlayer(v.id);
}

function renderVideoChips() {
  const v = S.info;
  const box = $('#chips');
  if (!box) return;
  const f = trimFactor();
  if (S.mode === 'video' || S.mode === 'mute') {
    $('#chipsLabel').textContent = S.mode === 'mute' ? 'Видео чанар (Дуугүй 🔇)' : 'Видео чанар';
    $('#chipsHint').textContent = v.qualities.length ? `${v.qualities.length} сонголт` : '';
    if (!v.qualities.length) {
      box.innerHTML = chipHTML({ key: 'best', title: 'Хамгийн сайн', sub: 'Автомат', pressed: true });
      return;
    }
    box.innerHTML = v.qualities.map((q) => {
      const sz = S.mode === 'mute' ? (q.vsize || (q.size ? Math.max(0, q.size - (v.audio_size || 0)) : null)) : q.size;
      return chipHTML({
        key: q.height,
        title: q.label,
        badge: [q.badge, q.fps > 30 ? `${q.fps}fps` : ''].filter(Boolean).join(' · '),
        sub: sz ? '≈ ' + fmtSize(sz * f) : '—',
        pressed: S.quality && S.quality.height === q.height,
      });
    }).join('');
    $$('.chip', box).forEach((c) => (c.onclick = () => {
      S.quality = v.qualities.find((q) => String(q.height) === c.dataset.key);
      localStorage.setItem('quality', parseInt(S.quality.label, 10));
      $$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', x === c));
      updateVideoSummary();
    }));
  } else {
    $('#chipsLabel').textContent = 'Аудио формат';
    $('#chipsHint').textContent = 'Нүүр зураг, нэр автоматаар орно';
    box.innerHTML = AUDIO_PRESETS.map((p) => {
      const sz = audioSize(p, v.duration) * f;
      return chipHTML({ key: p.id, title: p.name, badge: p.badge, sub: p.sub + (sz ? ' · ≈ ' + fmtSize(sz) : ''), pressed: S.audio.id === p.id });
    }).join('');
    bindAudioChips(box, updateVideoSummary);
  }
}

function bindAudioChips(box, after) {
  $$('.chip', box).forEach((c) => (c.onclick = () => {
    S.audio = AUDIO_PRESETS.find((p) => p.id === c.dataset.key);
    localStorage.setItem('audio', S.audio.id);
    $$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', x === c));
    after();
  }));
}

function currentLabel() {
  if (S.mode === 'audio') return `${S.audio.name} · ${S.audio.sub}`;
  const q = S.quality;
  let fpsBadge = '';
  if (q && q.fps > 30) {
    fpsBadge = S.fps === '30' ? ' · 60fps (зөвхөн 60fps)' : ' · 60fps';
  } else if (S.fps === '30') {
    fpsBadge = ' · 30fps';
  }
  const muteBadge = S.mode === 'mute' ? ' (дуугүй 🔇)' : '';
  return `MP4${muteBadge} · ${q ? q.label : 'Хамгийн сайн'}${q && q.badge ? ' ' + q.badge : ''}${fpsBadge}`;
}

function updateVideoSummary() {
  const v = S.info;
  if (!v || v.type !== 'video') return;
  const f = trimFactor();
  const len = S.trim ? S.end - S.start : v.duration;
  let size = 0;
  if (S.mode === 'audio') {
    size = audioSize(S.audio, v.duration) * f;
  } else if (S.mode === 'mute') {
    const vs = S.quality?.vsize || (S.quality?.size ? Math.max(0, S.quality.size - (v.audio_size || 0)) : 0);
    size = vs * f;
  } else {
    size = (S.quality?.size || 0) * f;
  }
  const icon = S.mode === 'audio' ? 'music' : (S.mode === 'mute' ? 'mute' : 'video');
  $('#sumMain').innerHTML = `${ic(icon)}${esc(currentLabel())}`;
  const parts = [];
  if (size) parts.push('≈ ' + fmtSize(size));
  if (len) parts.push(`${fmtTime(len)} урт`);
  if (S.trim) parts.push(`${fmtTime(S.start)} – ${fmtTime(S.end)}`);
  $('#sumSub').textContent = parts.join('  ·  ') || 'Бэлэн';

  const hint = $('#fpsHint');
  if (hint && (S.mode === 'video' || S.mode === 'mute')) {
    if (S.quality && S.quality.fps > 30 && S.fps === '30') {
      hint.textContent = `${S.quality.label} нь YouTube дээр зөвхөн 60 FPS дээр байршсан байна`;
      hint.style.color = 'var(--accent)';
    } else {
      hint.textContent = '30 FPS нь хэмжээ бага, түргэн татна';
      hint.style.color = '';
    }
  }
}

async function downloadVideo() {
  const v = S.info;
  const btn = $('#dlBtn');
  if (btn.disabled) return;
  const full = !S.trim || (S.start <= 0 && S.end >= v.duration);
  const isVid = S.mode === 'video' || S.mode === 'mute';
  const payload = {
    url: v.url,
    title: v.title,
    thumbnail: v.thumbnail,
    mode: S.mode,
    height: isVid ? S.quality?.height ?? null : null,
    fps: isVid ? parseInt(S.fps, 10) : null,
    audio_format: S.audio.fmt,
    bitrate: S.audio.br,
    start: full ? null : S.start,
    end: full || S.end >= v.duration ? null : S.end,
    label: currentLabel() + (full ? '' : ` · ✂ ${fmtTime(S.start)}–${fmtTime(S.end)}`),
  };
  btn.disabled = true;
  try {
    await api('/download', payload);
    flashSent(btn);
    pollJobsSoon();
  } catch (e) {
    toast(e.message, { type: 'err' });
    btn.disabled = false;
  }
}

function flashSent(btn) {
  const html = btn.innerHTML;
  btn.classList.add('sent');
  btn.innerHTML = `${ic('check')}<span>Нэмэгдлээ</span>`;
  setTimeout(() => { btn.classList.remove('sent'); btn.innerHTML = html; btn.disabled = false; }, 1400);
}

/* ================================================================
   Trim
   ================================================================ */
function trimHTML(d) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => `<span>${fmtTime(d * p)}</span>`).join('');
  return `
    <div class="trim" id="trim">
      <div class="trim-head" id="trimHead">
        <div class="t-ic">${ic('scissors')}</div>
        <div class="grow"><div class="t">Хэсэг таслах</div><div class="d">Зөвхөн хэрэгтэй хэсгээ татах — тоглуулагч дээр харж тохируулна</div></div>
        <span class="trim-sel hidden" id="trimSel"></span>
        <label class="switch" title="Хэсэг таслах"><input type="checkbox" id="trimToggle"><span></span></label>
      </div>
      <div class="trim-body"><div class="trim-inner"><div class="trim-pad">
        <div class="range" id="range">
          <div class="range-track"><div class="range-fill" id="rangeFill"></div></div>
          <div class="range-playhead" id="playhead"></div>
          <div class="handle" id="hStart" tabindex="0" role="slider" aria-label="Эхлэх"><span class="tip"></span></div>
          <div class="handle" id="hEnd" tabindex="0" role="slider" aria-label="Дуусах"><span class="tip"></span></div>
        </div>
        <div class="ticks">${ticks}</div>
        <div class="trim-controls">
          <div class="time-field" id="startField">
            <label for="startIn">Эхлэх</label><input id="startIn" inputmode="numeric">
            <button class="mini-btn" id="setStart" title="Тоглуулагчийн одоогийн байрлалыг эхлэл болгох" disabled>${ic('crosshair')}Одоо</button>
          </div>
          <div class="time-field" id="endField">
            <label for="endIn">Дуусах</label><input id="endIn" inputmode="numeric">
            <button class="mini-btn" id="setEnd" title="Тоглуулагчийн одоогийн байрлалыг төгсгөл болгох" disabled>${ic('crosshair')}Одоо</button>
          </div>
          <button class="ghost-btn" id="previewBtn" style="height:40px" disabled>${ic('play', 'fill')}Урьдчилж харах</button>
          <div class="trim-len">Урт: <b id="trimLen"></b></div>
        </div>
      </div></div></div>
    </div>`;
}

function bindTrim(D) {
  const trim = $('#trim'), toggle = $('#trimToggle'), range = $('#range');
  const hS = $('#hStart'), hE = $('#hEnd');

  const setOn = (on) => {
    S.trim = on;
    trim.classList.toggle('on', on);
    toggle.checked = on;
    $('#trimSel').classList.toggle('hidden', !on);
    updateRange();
    renderVideoChips();
    updateVideoSummary();
  };
  toggle.onchange = () => setOn(toggle.checked);
  $('#trimHead').onclick = (e) => { if (!e.target.closest('.switch')) setOn(!S.trim); };

  let seekTimer = 0;
  const seekPreview = (t) => {
    if (!S.playerReady) return;
    clearTimeout(seekTimer);
    seekTimer = setTimeout(() => S.player.seekTo(t, true), 60);
  };
  const setT = (which, t, seek = true) => {
    t = Math.round(t);
    if (which === 'start') S.start = clamp(t, 0, S.end - 1);
    else S.end = clamp(t, S.start + 1, D);
    updateRange();
    renderVideoChips();
    updateVideoSummary();
    if (seek) seekPreview(which === 'start' ? S.start : S.end);
  };
  const xToT = (x) => {
    const r = range.getBoundingClientRect();
    return clamp((x - r.left) / r.width, 0, 1) * D;
  };

  const drag = (which, handle) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('drag');
    handle.focus();
    const move = (ev) => setT(which, xToT(ev.clientX));
    const up = () => {
      handle.classList.remove('drag');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };
  hS.addEventListener('pointerdown', drag('start', hS));
  hE.addEventListener('pointerdown', drag('end', hE));
  range.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.handle')) return;
    const t = xToT(e.clientX);
    const which = Math.abs(t - S.start) <= Math.abs(t - S.end) ? 'start' : 'end';
    setT(which, t);
    drag(which, which === 'start' ? hS : hE)(e);
  });
  const keys = (which) => (e) => {
    const step = e.shiftKey ? 10 : 1;
    const cur = which === 'start' ? S.start : S.end;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setT(which, cur - step);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setT(which, cur + step);
    else if (e.key === 'Home') setT(which, 0);
    else if (e.key === 'End') setT(which, D);
    else return;
    e.preventDefault();
  };
  hS.addEventListener('keydown', keys('start'));
  hE.addEventListener('keydown', keys('end'));

  const bindInput = (input, field, which) => {
    const commit = () => {
      const t = parseTime(input.value);
      const lo = which === 'start' ? 0 : S.start + 1;
      const hi = which === 'start' ? S.end - 1 : D;
      if (t === null && which === 'end') { setT('end', D); return; }
      if (t === null && which === 'start') { setT('start', 0); return; }
      if (isNaN(t) || t < lo || t > hi) {
        shake(field); field.classList.add('bad');
        setTimeout(() => field.classList.remove('bad'), 600);
        toast(isNaN(t) ? 'Хугацааг 1:30 эсвэл 1:02:03 хэлбэрээр бичнэ үү.' : `${fmtTime(lo)} – ${fmtTime(hi)} хооронд байх ёстой.`, { type: 'err' });
        updateRange();
        return;
      }
      setT(which, t);
    };
    input.addEventListener('change', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  };
  bindInput($('#startIn'), $('#startField'), 'start');
  bindInput($('#endIn'), $('#endField'), 'end');

  $('#setStart').onclick = () => S.playerReady && setT('start', S.player.getCurrentTime(), false);
  $('#setEnd').onclick = () => S.playerReady && setT('end', S.player.getCurrentTime(), false);
  $('#previewBtn').onclick = () => {
    if (!S.playerReady) return;
    S.player.seekTo(S.start, true);
    S.player.playVideo();
    S.previewing = true;
  };
  updateRange();
}

function updateRange() {
  const D = S.info?.duration;
  if (!D || !$('#range')) return;
  const a = (S.start / D) * 100, b = (S.end / D) * 100;
  $('#hStart').style.left = a + '%';
  $('#hEnd').style.left = b + '%';
  $('#hStart .tip').textContent = fmtTime(S.start);
  $('#hEnd .tip').textContent = fmtTime(S.end);
  $('#hStart').setAttribute('aria-valuetext', fmtTime(S.start));
  $('#hEnd').setAttribute('aria-valuetext', fmtTime(S.end));
  const fill = $('#rangeFill');
  fill.style.left = a + '%';
  fill.style.width = (b - a) + '%';
  if (document.activeElement !== $('#startIn')) $('#startIn').value = fmtTime(S.start);
  if (document.activeElement !== $('#endIn')) $('#endIn').value = fmtTime(S.end);
  $('#trimLen').textContent = fmtTime(S.end - S.start);
  $('#trimSel').textContent = `${fmtTime(S.start)} – ${fmtTime(S.end)}`;
}

/* ================================================================
   YouTube player (урьдчилж харах)
   ================================================================ */
let ytApi = null;
function loadYT() {
  if (ytApi) return ytApi;
  ytApi = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const t = setTimeout(() => resolve(null), 10000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(t); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { clearTimeout(t); resolve(null); };
    document.head.appendChild(s);
  });
  return ytApi;
}

async function mountPlayer(videoId) {
  const YT = await loadYT();
  if (!YT || S.info?.id !== videoId || !$('#player')) {
    if (!YT) playerUnavailable('Тоглуулагчийг ачаалж чадсангүй — хугацааг гараар оруулж болно.');
    return;
  }
  S.player = new YT.Player('player', {
    videoId,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: location.origin },
    events: {
      onReady: () => {
        if (S.info?.id !== videoId) return;
        S.playerReady = true;
        $('#playerPoster')?.remove();
        $('#durChip')?.remove();
        ['#setStart', '#setEnd', '#previewBtn'].forEach((s) => { const b = $(s); if (b) b.disabled = false; });
      },
      onError: () => playerUnavailable('Энэ видеог энд тоглуулах боломжгүй — гэхдээ татаж болно.'),
    },
  });
}

function playerUnavailable(msg) {
  S.playerReady = false;
  const wrap = $('.player-wrap');
  if (!wrap) return;
  $('#player')?.remove();
  wrap.querySelector('iframe')?.remove();
  if (!$('#playerPoster') && S.info?.thumbnail) {
    wrap.insertAdjacentHTML('afterbegin', `<img class="poster" id="playerPoster" src="${esc(S.info.thumbnail)}" alt="">`);
  }
  if (!wrap.querySelector('.player-note')) wrap.insertAdjacentHTML('beforeend', `<div class="player-note">${esc(msg)}</div>`);
}

function destroyPlayer() {
  try { S.player?.destroy?.(); } catch { /* ignore */ }
  S.player = null;
  S.playerReady = false;
  S.previewing = false;
}

setInterval(() => {
  const ph = $('#playhead');
  if (!S.playerReady || !ph || !S.info?.duration) { ph?.classList.remove('show'); return; }
  let t;
  try { t = S.player.getCurrentTime(); } catch { return; }
  ph.style.left = `calc(${(t / S.info.duration) * 100}% )`;
  ph.classList.toggle('show', S.trim);
  if (S.previewing && t >= S.end) {
    S.player.pauseVideo();
    S.previewing = false;
  }
}, 150);

/* ================================================================
   Playlist card
   ================================================================ */
function renderPlaylist(p) {
  destroyPlayer();
  S.sel = new Set(p.entries.map((e) => e.index));
  const prefH = parseInt(localStorage.getItem('quality') || '1080', 10);
  S.quality = PL_QUALITIES.find((q) => q.height && q.height <= prefH) || PL_QUALITIES[0];

  stage.innerHTML = `
    <div class="card enter" id="plCard">
      <div class="pl-head">
        <div class="pl-cover">
          ${p.thumbnail ? `<img src="${esc(p.thumbnail)}" alt="">` : ''}
          <div class="stack">${p.count}<small>видео</small></div>
        </div>
        <div class="v-meta">
          <div class="eyebrow">${ic('list')}Playlist</div>
          <h2 class="v-title">${esc(p.title)}</h2>
          <div class="v-sub">
            ${p.channel ? `<span>${ic('user')}${esc(p.channel)}</span>` : ''}
            <span>${ic('video')}${p.count} видео</span>
            ${p.total_duration ? `<span>${ic('clock')}${fmtTime(p.total_duration)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="opts">
        <div><div class="field-label">Төрөл</div>${segmentedHTML()}</div>
        ${fpsSegmentedHTML()}
        <div><div class="field-label"><span id="chipsLabel">Чанар</span><span class="hint" id="chipsHint"></span></div><div class="chips" id="chips"></div></div>
        <div>
          <div class="pl-list-head">
            <label class="check-label"><span class="check"><input type="checkbox" id="selAll" checked><span></span></span>Бүгдийг сонгох</label>
            <span class="hint" style="color:var(--text-3);font-size:13px" id="selCount"></span>
          </div>
          <div class="pl-list" id="plList">
            ${p.entries.map((e) => `
              <div class="pl-row" data-idx="${e.index}">
                <span class="check"><input type="checkbox" checked tabindex="-1"><span></span></span>
                <span class="idx">${e.index}</span>
                <img loading="lazy" src="${esc(e.thumbnail || '')}" alt="">
                <span class="tt" title="${esc(e.title)}">${esc(e.title)}</span>
                <span class="du">${e.duration ? fmtTime(e.duration) : ''}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="action-bar">
        <div class="sum"><div class="sum-main" id="sumMain"></div><div class="sum-sub" id="sumSub"></div></div>
        <button class="download-btn" id="dlBtn">${ic('download')}<span>Бүгдийг татах</span></button>
      </div>
    </div>`;

  bindSegmented(() => { renderPlaylistChips(); updatePlaylistSummary(); });
  bindFps(() => { updatePlaylistSummary(); });
  renderPlaylistChips();

  $('#plList').addEventListener('click', (e) => {
    const row = e.target.closest('.pl-row');
    if (!row) return;
    const idx = +row.dataset.idx;
    S.sel.has(idx) ? S.sel.delete(idx) : S.sel.add(idx);
    syncPlaylistSel();
  });
  $('#selAll').onchange = (e) => {
    S.sel = e.target.checked ? new Set(p.entries.map((x) => x.index)) : new Set();
    syncPlaylistSel();
  };
  $('#dlBtn').onclick = downloadPlaylist;
  syncPlaylistSel();
}

function renderPlaylistChips() {
  const box = $('#chips');
  if (S.mode === 'video' || S.mode === 'mute') {
    $('#chipsLabel').textContent = S.mode === 'mute' ? 'Видео чанар (Дуугүй 🔇)' : 'Видео чанар';
    $('#chipsHint').textContent = 'Байхгүй бол хамгийн ойрын чанараар';
    box.innerHTML = PL_QUALITIES.map((q) => chipHTML({ key: q.height ?? 'best', title: q.label, badge: q.badge, sub: q.height ? `${q.height}p хүртэл` : 'Автомат', pressed: S.quality === q })).join('');
    $$('.chip', box).forEach((c) => (c.onclick = () => {
      S.quality = PL_QUALITIES.find((q) => String(q.height ?? 'best') === c.dataset.key);
      if (S.quality.height) localStorage.setItem('quality', S.quality.height);
      $$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', x === c));
      updatePlaylistSummary();
    }));
  } else {
    $('#chipsLabel').textContent = 'Аудио формат';
    $('#chipsHint').textContent = 'Нүүр зураг, нэр автоматаар орно';
    box.innerHTML = AUDIO_PRESETS.map((p) => chipHTML({ key: p.id, title: p.name, badge: p.badge, sub: p.sub, pressed: S.audio.id === p.id })).join('');
    bindAudioChips(box, updatePlaylistSummary);
  }
}

function syncPlaylistSel() {
  const p = S.info;
  $$('#plList .pl-row').forEach((row) => {
    const on = S.sel.has(+row.dataset.idx);
    row.classList.toggle('off', !on);
    row.querySelector('input').checked = on;
  });
  const all = $('#selAll');
  all.checked = S.sel.size === p.count;
  all.indeterminate = S.sel.size > 0 && S.sel.size < p.count;
  $('#selCount').textContent = `${S.sel.size} / ${p.count} сонгосон`;
  const btn = $('#dlBtn');
  btn.disabled = S.sel.size === 0;
  btn.querySelector('span:last-child').textContent = S.sel.size === p.count ? 'Бүгдийг татах' : `${S.sel.size} видео татах`;
  updatePlaylistSummary();
}

function playlistLabel() {
  if (S.mode === 'audio') return `${S.audio.name} · ${S.audio.sub}`;
  const fpsText = S.fps === '30' ? ' · 30fps' : '';
  const muteBadge = S.mode === 'mute' ? ' (дуугүй 🔇)' : '';
  return `MP4${muteBadge} · ${S.quality.label}${fpsText}`;
}

function updatePlaylistSummary() {
  const p = S.info;
  if (!p || p.type !== 'playlist') return;
  const dur = p.entries.filter((e) => S.sel.has(e.index)).reduce((a, e) => a + (e.duration || 0), 0);
  const icon = S.mode === 'audio' ? 'music' : (S.mode === 'mute' ? 'mute' : 'video');
  $('#sumMain').innerHTML = `${ic(icon)}${esc(playlistLabel())}`;
  $('#sumSub').textContent = `${S.sel.size} видео${dur ? '  ·  ' + fmtTime(dur) + ' нийт урт' : ''}`;
}

async function downloadPlaylist() {
  const p = S.info;
  const btn = $('#dlBtn');
  if (btn.disabled || !S.sel.size) return;
  const items = S.sel.size === p.count ? null : [...S.sel].sort((a, b) => a - b);
  const isVid = S.mode === 'video' || S.mode === 'mute';
  btn.disabled = true;
  try {
    await api('/download', {
      url: p.url, playlist: true, items,
      title: p.title, thumbnail: p.thumbnail,
      mode: S.mode,
      height: isVid ? S.quality.height : null,
      fps: isVid && S.fps ? parseInt(S.fps, 10) : null,
      audio_format: S.audio.fmt, bitrate: S.audio.br,
      label: `Playlist · ${S.sel.size} видео · ${playlistLabel()}`,
    });
    flashSent(btn);
    pollJobsSoon();
  } catch (e) {
    toast(e.message, { type: 'err' });
    btn.disabled = false;
  }
}

/* ================================================================
   Jobs sidebar
   ================================================================ */
const jobEls = new Map();
const jobPrev = new Map();
let pollTimer = 0;

function pollJobsSoon() { clearTimeout(pollTimer); pollTimer = setTimeout(pollJobs, 150); }

async function pollJobs() {
  let active = 0;
  try {
    const data = await api('/jobs');
    active = data.active;
    renderJobs(data.jobs, active);
  } catch { /* сервер түр унтарсан байж болно */ }
  clearTimeout(pollTimer);
  pollTimer = setTimeout(pollJobs, active ? 500 : 1500);
}

function renderJobs(jobs, active) {
  const list = $('#jobList');
  const badge = $('#activeCount');
  badge.textContent = active;
  badge.classList.toggle('hidden', !active);
  document.title = active ? `(${active}) Tatagch — YouTube татагч` : 'Tatagch — YouTube татагч';

  if (!jobs.length) {
    jobEls.clear();
    if (!list.querySelector('.jobs-empty')) {
      list.innerHTML = `<div class="jobs-empty">${ic('inbox')}<b>Одоогоор хоосон байна</b>Татсан файлууд энд харагдана</div>`;
    }
    return;
  }
  list.querySelector('.jobs-empty')?.remove();

  const ids = new Set(jobs.map((j) => j.id));
  for (const [id, el] of jobEls) {
    if (!ids.has(id)) { el.remove(); jobEls.delete(id); jobPrev.delete(id); }
  }
  jobs.forEach((j, i) => {
    let el = jobEls.get(j.id);
    if (!el) { el = createJobEl(j); jobEls.set(j.id, el); }
    updateJobEl(el, j);
    if (list.children[i] !== el) list.insertBefore(el, list.children[i] || null);
    notifyTransition(j);
  });
}

function createJobEl(j) {
  const el = document.createElement('div');
  el.className = 'job';
  el.innerHTML = `
    <div class="job-thumb">${j.thumbnail ? `<img src="${esc(j.thumbnail)}" alt="">` : ''}<span class="job-type">${ic(j.mode === 'audio' ? 'music' : (j.mode === 'mute' ? 'mute' : 'video'))}</span></div>
    <div class="job-body">
      <div class="job-title" title="${esc(j.title)}">${esc(j.title)}</div>
      <div class="job-label">${esc(j.label || '')}</div>
      <div class="job-bar"><span></span></div>
      <div class="job-foot"><div class="job-status"></div><div class="job-acts"></div></div>
    </div>
    <button class="job-x hidden" title="Жагсаалтаас хасах">${ic('x')}</button>`;
  el.querySelector('.job-x').onclick = () => jobAction(j.id, 'remove', el);
  return el;
}

function statusText(j) {
  const item = j.item ? `${j.item[0]}/${j.item[1]} · ` : '';
  switch (j.status) {
    case 'queued': return `${ic('clock')}Дараалалд хүлээж байна`;
    case 'downloading': {
      const parts = [];
      if (j.progress > 0) parts.push(`${Math.floor(j.progress)}%`);
      if (j.message) {
        parts.push(j.message);
      } else {
        if (j.speed) parts.push(fmtSize(j.speed) + '/s');
        if (j.eta != null) parts.push(fmtEta(j.eta) + ' үлдсэн');
      }
      return esc(item + (parts.join(' · ') || 'Татаж байна…'));
    }
    case 'processing': return esc(item + (j.message || 'Боловсруулж байна…'));
    case 'done': return `${ic('checkCircle')}Дууссан`;
    case 'error': return `${ic('alert')}${esc(j.error || 'Алдаа гарлаа')}`;
    case 'canceled': return 'Цуцалсан';
    default: return '';
  }
}

function updateJobEl(el, j) {
  el.dataset.status = j.status;
  el.classList.toggle('indet', j.status === 'downloading' && !!j.message && !j.progress);
  el.querySelector('.job-bar span').style.width = (j.status === 'done' ? 100 : j.progress) + '%';
  el.querySelector('.job-status').innerHTML = statusText(j);
  const finished = ['done', 'error', 'canceled'].includes(j.status);
  el.querySelector('.job-x').classList.toggle('hidden', !finished);

  if (el.dataset.acts === j.status) return;
  el.dataset.acts = j.status;
  const acts = el.querySelector('.job-acts');
  if (!finished) {
    acts.innerHTML = `<button class="job-act" data-a="cancel" title="Цуцлах">${ic('x')}Цуцлах</button>`;
  } else if (j.status === 'done') {
    acts.innerHTML = `<button class="job-act primary" data-a="open">${ic('play', 'fill')}Нээх</button>
                      <button class="job-act" data-a="reveal" title="Хавтсанд харуулах">${ic('folder')}</button>`;
  } else {
    acts.innerHTML = `<button class="job-act" data-a="retry">${ic('refresh')}Дахин</button>`;
  }
  $$('[data-a]', acts).forEach((b) => (b.onclick = () => jobAction(j.id, b.dataset.a, el)));
}

async function jobAction(id, action, el) {
  try {
    if (action === 'remove') { el.classList.add('leaving'); await new Promise((r) => setTimeout(r, 250)); }
    await api(`/jobs/${id}/${action}`, {});
    pollJobsSoon();
  } catch (e) {
    el?.classList.remove('leaving');
    toast(e.message, { type: 'err' });
  }
}

function notifyTransition(j) {
  const prev = jobPrev.get(j.id);
  jobPrev.set(j.id, j.status);
  if (!prev || prev === j.status) return;
  const short = j.title.length > 48 ? j.title.slice(0, 46) + '…' : j.title;
  if (j.status === 'done') toast(`Татаж дууслаа: ${short}`, { type: 'ok', action: 'Нээх', onAction: () => api(`/jobs/${j.id}/open`, {}) });
  else if (j.status === 'error') toast(`Амжилтгүй: ${j.error || short}`, { type: 'err', timeout: 6000 });
}

/* ================================================================
   Clipboard, folder, theme
   ================================================================ */
async function readClip() {
  try { return ((await api('/clipboard')).text || '').trim(); } catch { return ''; }
}

async function checkClipboard() {
  const t = await readClip();
  if (!t || !isYtUrl(t) || t === S.lastClip || t === urlInput.value.trim() || t === S.info?.url) return;
  $('#clipUrl').textContent = t;
  $('#clipSuggest').classList.remove('hidden');
  $('#clipSuggest').dataset.url = t;
}
function hideClip() {
  const c = $('#clipSuggest');
  if (c.dataset.url) S.lastClip = c.dataset.url;
  c.classList.add('hidden');
}

function syncClearBtn() { $('#clearUrl').classList.toggle('hidden', !urlInput.value); }

async function loadSettings() {
  try {
    const s = await api('/settings');
    $('#folderPath').textContent = s.out_dir;
    $('#folderBtn').title = `Хадгалах хавтас: ${s.out_dir}\nДарж солино`;
  } catch { /* ignore */ }
}

function applyThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeBtn').innerHTML = ic(dark ? 'sun' : 'moon');
}

/* ================================================================
   Wire up
   ================================================================ */
function init() {
  hydrateIcons();
  applyThemeIcon();
  renderEmpty();
  loadSettings();
  pollJobs();

  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); lookup(); });
  urlInput.addEventListener('input', syncClearBtn);
  urlInput.addEventListener('paste', () => setTimeout(() => { if (isYtUrl(urlInput.value)) lookup(); }, 0));
  $('#clearUrl').onclick = () => { urlInput.value = ''; syncClearBtn(); urlInput.focus(); S.token++; renderEmpty(); $('#fetchBtn').disabled = false; };

  $('#pasteBtn').onclick = async () => {
    const t = await readClip();
    if (!t) { toast('Clipboard хоосон байна.', { type: 'info' }); return; }
    lookup(t);
  };
  $('#clipUse').onclick = () => lookup($('#clipSuggest').dataset.url);
  $('#clipDismiss').onclick = hideClip;
  window.addEventListener('focus', checkClipboard);

  // Хаана ч Ctrl+V дарахад линкийг барьж авах
  document.addEventListener('paste', (e) => {
    if (e.target.closest('input, textarea')) return;
    const t = (e.clipboardData?.getData('text') || '').trim();
    if (t) { e.preventDefault(); lookup(t); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest('input, textarea');
    if ((e.key === '/' && !typing) || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
      e.preventDefault(); urlInput.focus(); urlInput.select();
    } else if (e.ctrlKey && e.key === 'Enter') {
      $('#dlBtn')?.click();
    } else if (e.key === 'Escape' && document.activeElement === urlInput) {
      urlInput.blur();
    }
  });

  $('#folderBtn').onclick = async () => {
    try {
      const s = await api('/pick-folder', {});
      const before = $('#folderPath').textContent;
      await loadSettings();
      if (s.out_dir !== before) toast(`Хадгалах хавтас: ${s.out_dir}`, { type: 'ok' });
    } catch (e) { toast(e.message, { type: 'err' }); }
  };
  $('#openFolderBtn').onclick = () => api('/open-folder', {});
  $('#clearJobsBtn').onclick = async () => { await api('/jobs/clear', {}); pollJobsSoon(); };

  $('#themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    applyThemeIcon();
  };

  window.addEventListener('resize', placeSegThumb);
  document.fonts?.ready.then(placeSegThumb);

  const deep = new URLSearchParams(location.search).get('url');
  if (deep) lookup(deep);
  else { urlInput.focus(); checkClipboard(); }
}

init();
