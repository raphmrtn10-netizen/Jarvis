// =========================================================
// J.A.R.V.I.S. SYSTEM ENGINE — APPLICATION SCRIPT
// =========================================================

let selectedVoice = null;
let draggedTaskId = null;
window.jarvisHudState = 'idle';

// ---------------------------------------------------------
// Sound engine — short synthesized tones via Web Audio API.
// No audio files needed, works offline, tiny footprint.
// Browsers block audio until a user gesture; ensureContext()
// silently no-ops until the first click/tap, which is normal.
// ---------------------------------------------------------
const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ensureContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, duration, type = 'sine', gain = 0.05, delay = 0) {
    if (!enabled) return;
    try {
      ensureContext();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = 0;
      osc.connect(g).connect(ctx.destination);
      const t0 = ctx.currentTime + delay;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch (e) { /* audio unavailable — fail silently */ }
  }

  return {
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    click() { tone(1200, 0.05, 'square', 0.03); },
    send() { tone(880, 0.08, 'sine', 0.05); },
    receive() { tone(660, 0.09, 'sine', 0.05); tone(990, 0.09, 'sine', 0.04, 0.08); },
    bootComplete() { tone(440, 0.15, 'sine', 0.05); tone(880, 0.2, 'sine', 0.05, 0.12); },
    taskDone() { tone(1046, 0.12, 'sine', 0.05); tone(1318, 0.14, 'sine', 0.04, 0.1); },
    alert() { tone(330, 0.15, 'triangle', 0.05); tone(330, 0.15, 'triangle', 0.05, 0.22); },
    error() { tone(220, 0.2, 'sawtooth', 0.04); }
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  initThemeAndModal();
  initSoundToggle();
  initTaskBoard();        // must run before boot: completeBoot() reads `tasks` for the greeting
  initSpeechSynthesis();  // must run before boot: completeBoot() speaks via the picked voice
  initBootSequence();
  initTabNavigation();
  initCircuitBoard();
  initClock();
  initWeather();
  initInteractiveBlob();
  initCursorGlow();
  initDraggableWidgets();
  initScratchpad();
  initPomodoroTimer();
  initCommsFormAndSpeech();
  initBriefingButton();
  initWorkplaceTerminal();
  initAmbientSound();
  initConnections();
  initCommandPalette();
  initAlertCenter();
});

// ---------------------------------------------------------
// HUD reactive state — shared by comms, mic, and the blob canvas.
// Updates EVERY .hud-core instance on the page at once (the main
// Dashboard core and the compact Comms indicator stay in sync).
// ---------------------------------------------------------
function setHudState(state) {
  document.querySelectorAll('.hud-core').forEach(hudCore => {
    hudCore.classList.remove('listening', 'thinking', 'speaking');
    if (state) hudCore.classList.add(state);
  });
  window.jarvisHudState = state || 'idle';
  const label = state === 'listening' ? 'LISTENING'
    : state === 'thinking' ? 'THINKING'
    : state === 'speaking' ? 'RESPONDING'
    : 'READY';
  document.querySelectorAll('.hud-status-value').forEach(el => { el.textContent = label; });
}

// ---------------------------------------------------------
// 1. Theme + Settings modal (API key)
// ---------------------------------------------------------
const THEME_KEY = 'jarvis-theme';
const THEME_ORDER = ['blue', 'amber', 'red'];

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.getAttribute('data-theme') === theme);
  });
}

// ---------------------------------------------------------
// Interface sound toggle (header speaker icon)
// ---------------------------------------------------------
function initSoundToggle() {
  const btn = document.getElementById('btn-sound-toggle');
  if (!btn) return;
  const saved = localStorage.getItem('jarvis-sound-enabled');
  const enabled = saved === null ? true : saved === 'true';
  Sound.setEnabled(enabled);
  btn.classList.toggle('active', enabled);

  btn.addEventListener('click', () => {
    const now = !Sound.isEnabled();
    Sound.setEnabled(now);
    btn.classList.toggle('active', now);
    try { localStorage.setItem('jarvis-sound-enabled', String(now)); } catch (e) { /* storage unavailable */ }
    if (now) Sound.click();
  });
}

// ---------------------------------------------------------
// Holographic cursor glow — a soft light that tracks the mouse
// across the Dashboard, like a targeting reticle picking up
// motion. Purely decorative, ignored entirely on touch devices.
// ---------------------------------------------------------
function initCursorGlow() {
  const panel = document.getElementById('panel-dashboard');
  const glow = document.getElementById('cursor-glow');
  if (!panel || !glow) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch screens

  panel.addEventListener('mousemove', (e) => {
    const rect = panel.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top = (e.clientY - rect.top) + 'px';
    glow.style.opacity = '1';
  });
  panel.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
}

function initThemeAndModal() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'blue';
  applyTheme(savedTheme);

  document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      Sound.click();
      const theme = swatch.getAttribute('data-theme');
      applyTheme(theme);
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ }
    });
  });

  // Header sun icon cycles through themes as a quick shortcut
  const cycleBtn = document.getElementById('btn-theme-toggle');
  if (cycleBtn) {
    cycleBtn.addEventListener('click', () => {
      Sound.click();
      const current = document.documentElement.getAttribute('data-theme') || 'blue';
      const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
    });
  }

  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-settings-toggle');
  const chatHintBtn = document.getElementById('chat-hint-btn');
  const closeBtn = document.getElementById('btn-modal-close');
  const saveBtn = document.getElementById('btn-modal-save');
  const apiKeyInput = document.getElementById('api-key-input');
  const chatHint = document.getElementById('chat-hint');
  const sysApiStatus = document.getElementById('sys-api-status');

  function refreshApiStatus() {
    const key = localStorage.getItem('jarvis_api_key') || '';
    if (chatHint) chatHint.style.display = key ? 'none' : 'block';
    if (sysApiStatus) sysApiStatus.textContent = key ? 'Key saved in this browser' : 'Not set';
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    if (apiKeyInput) {
      apiKeyInput.value = localStorage.getItem('jarvis_api_key') || '';
      apiKeyInput.focus();
    }
  }
  function closeModal() { if (modal) modal.classList.remove('open'); }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (chatHintBtn) chatHintBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const val = apiKeyInput ? apiKeyInput.value.trim() : '';
      try {
        if (val) localStorage.setItem('jarvis_api_key', val);
        else localStorage.removeItem('jarvis_api_key');
      } catch (e) { /* storage unavailable */ }
      refreshApiStatus();
      closeModal();
    });
  }

  refreshApiStatus();
}

// ---------------------------------------------------------
// 2. Boot sequence
// ---------------------------------------------------------
function initBootSequence() {
  const overlay = document.getElementById('boot-overlay');
  const bar = document.getElementById('boot-bar-fill');
  const log = document.getElementById('boot-log');
  const shell = document.getElementById('app-shell');
  const skipBtn = document.getElementById('boot-skip-btn');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const logs = [
    'INITIALIZING CORE MEMORY...',
    'LOADING NEURAL NETWORKS...',
    'ESTABLISHING ENCRYPTED TELEMETRY...',
    'ALL SYSTEMS OPERATIONAL.'
  ];

  function completeBoot() {
    if (overlay) overlay.classList.add('hidden');
    if (shell) shell.classList.add('revealed');

    const overdueCount = tasks.filter(t => t.status !== 'done' && t.due && isOverdue(t.due)).length;
    const greeting = overdueCount > 0
      ? `Jarvis online. Systems operational. You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} requiring attention, Raphael.`
      : 'Jarvis online. Systems operational.';
    Sound.bootComplete();
    speakResponse(greeting);
    setTimeout(() => { if (overlay) overlay.remove(); }, 700);
  }

  if (reducedMotion) {
    completeBoot();
    return;
  }

  let currentLog = 0;
  const logInterval = setInterval(() => {
    if (currentLog < logs.length) {
      const line = document.createElement('div');
      line.textContent = `> ${logs[currentLog]}`;
      if (log) log.appendChild(line);
      currentLog++;
    } else {
      clearInterval(logInterval);
    }
  }, 400);

  setTimeout(() => { if (bar) bar.style.width = '100%'; }, 100);

  const bootTimer = setTimeout(completeBoot, 2400);
  if (skipBtn) skipBtn.addEventListener('click', () => { clearTimeout(bootTimer); clearInterval(logInterval); completeBoot(); });
}

// ---------------------------------------------------------
// 3. Tab navigation
// ---------------------------------------------------------
function initTabNavigation() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      const targetId = btn.getAttribute('data-panel');
      btns.forEach(b => b.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.classList.remove('active'));
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// ---------------------------------------------------------
// 4. Circuit board background — PCB-style traces with
//    traveling signal pulses, theme-color aware
// ---------------------------------------------------------
function initCircuitBoard() {
  const canvas = document.getElementById('particle-field');
  if (!canvas) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) { canvas.remove(); return; }

  const ctx = canvas.getContext('2d');
  const GRID = 48; // matches body background-size in style.css
  let w, h, traces, signals;

  function themeColor(varName, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  function buildTraces() {
    const cols = Math.max(4, Math.floor(w / GRID));
    const rows = Math.max(4, Math.floor(h / GRID));
    const count = Math.min(22, Math.max(8, Math.floor((w * h) / 130000)));
    const list = [];

    for (let i = 0; i < count; i++) {
      let x = Math.floor(Math.random() * cols) * GRID;
      let y = Math.floor(Math.random() * rows) * GRID;
      const points = [{ x, y }];
      let horizontal = Math.random() < 0.5;
      const segments = 3 + Math.floor(Math.random() * 4);

      for (let s = 0; s < segments; s++) {
        const runCells = 1 + Math.floor(Math.random() * 3);
        const dir = Math.random() < 0.5 ? 1 : -1;
        if (horizontal) x = Math.min(cols * GRID, Math.max(0, x + dir * runCells * GRID));
        else y = Math.min(rows * GRID, Math.max(0, y + dir * runCells * GRID));
        points.push({ x, y });
        horizontal = !horizontal;
      }

      let total = 0;
      const segLens = [];
      for (let p = 1; p < points.length; p++) {
        const len = Math.hypot(points[p].x - points[p - 1].x, points[p].y - points[p - 1].y);
        segLens.push(len);
        total += len;
      }
      if (total > 0) list.push({ points, segLens, total });
    }
    return list;
  }

  function pointAtProgress(trace, t) {
    let dist = Math.max(0, Math.min(1, t)) * trace.total;
    for (let i = 0; i < trace.segLens.length; i++) {
      const segLen = trace.segLens[i];
      if (dist <= segLen || i === trace.segLens.length - 1) {
        const segT = segLen > 0 ? Math.min(1, dist / segLen) : 0;
        const p0 = trace.points[i], p1 = trace.points[i + 1];
        return { x: p0.x + (p1.x - p0.x) * segT, y: p0.y + (p1.y - p0.y) * segT };
      }
      dist -= segLen;
    }
    return trace.points[trace.points.length - 1];
  }

  function spawnSignal() {
    return {
      traceIndex: Math.floor(Math.random() * traces.length),
      t: Math.random() * -0.4,
      speed: 0.0025 + Math.random() * 0.004,
      color: Math.random() < 0.72 ? themeColor('--accent', '#4fd8e6') : themeColor('--warn', '#e6a04f')
    };
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    traces = buildTraces();
    const signalCount = Math.max(6, Math.round(traces.length * 0.7));
    signals = Array.from({ length: signalCount }, spawnSignal);
  }

  function drawBoard() {
    if (!traces || !traces.length) return;
    const traceColor = themeColor('--accent-dim', '#1c5e68');
    ctx.strokeStyle = traceColor;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    traces.forEach(trace => {
      ctx.beginPath();
      trace.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.fillStyle = traceColor;
      trace.points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); });
    });
    ctx.globalAlpha = 1;
  }

  function drawSignals() {
    signals.forEach(sig => {
      sig.t += sig.speed;
      if (sig.t > 1.15) { Object.assign(sig, spawnSignal()); return; }
      if (sig.t < 0) return;

      const trace = traces[sig.traceIndex];
      const head = pointAtProgress(trace, sig.t);
      const tail = pointAtProgress(trace, sig.t - 0.05);

      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, sig.color);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = sig.color;
      ctx.shadowBlur = 9;
      ctx.shadowColor = sig.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    drawBoard();
    drawSignals();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
}

// ---------------------------------------------------------
// 5. Digital clock
// ---------------------------------------------------------
function initClock() {
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  const zoneEl = document.getElementById('clock-zone');

  function update() {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toTimeString().split(' ')[0];
    if (dateEl) {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-GB', options).toUpperCase();
    }
    if (zoneEl) zoneEl.textContent = `REGION: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  }
  update();
  setInterval(update, 1000);
}

// ---------------------------------------------------------
// 6. Weather (Open-Meteo — free, no API key required)
// ---------------------------------------------------------
function initWeather() {
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');
  const humidityEl = document.getElementById('weather-humidity');
  const windEl = document.getElementById('weather-wind');

  const WMO = {
    0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
    75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };

  async function fetchWeather(lat, lon) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&temperature_unit=celsius`);
      const data = await res.json();
      const c = data.current;
      if (tempEl) tempEl.textContent = `${Math.round(c.temperature_2m)}°C`;
      if (descEl) descEl.textContent = (WMO[c.weather_code] || 'Unknown').toUpperCase();
      if (humidityEl) humidityEl.textContent = Math.round(c.relative_humidity_2m);
      if (windEl) windEl.textContent = Math.round(c.wind_speed_10m);
    } catch (err) {
      if (descEl) descEl.textContent = 'OFFLINE';
      if (tempEl) tempEl.textContent = '--°';
    }
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(48.8566, 2.3522), // Paris fallback if permission denied
      { timeout: 6000 }
    );
  } else {
    fetchWeather(48.8566, 2.3522);
  }
}

// ---------------------------------------------------------
// 7. Interactive canvas blob — reacts to mouse, theme color,
//    and the current HUD state (idle/listening/thinking/speaking)
// ---------------------------------------------------------
function initInteractiveBlob() {
  document.querySelectorAll('.hud-core').forEach(hudCore => {
    const canvas = hudCore.querySelector('.blob-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let time = Math.random() * 10; // desync multiple instances slightly
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    hudCore.addEventListener('mousemove', (e) => {
      const rect = hudCore.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    function getHudColor() {
      const val = getComputedStyle(hudCore).getPropertyValue('--hud-c').trim();
      return val || '#4fd8e6';
    }

    function drawBlob() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let amplitude = 6, freqMul = 1;
      switch (window.jarvisHudState) {
        case 'listening': amplitude = 10; freqMul = 1.8; break;
        case 'thinking': amplitude = 14; freqMul = 2.4; break;
        case 'speaking': amplitude = 9; freqMul = 1.5; break;
        default: amplitude = 6; freqMul = 1;
      }
      time += 0.04 * freqMul;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = canvas.width * 0.25;
      const points = 12;
      const color = getHudColor();

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pull = Math.max(0, (80 - dist) / 80) * 12;

        const offset = Math.sin(time + i * 1.5) * amplitude * 0.7 + Math.cos(time * 0.8 + i) * amplitude * 0.5 + pull;
        const r = baseRadius + offset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, canvas.width * 0.32);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradient;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fill();

      requestAnimationFrame(drawBlob);
    }

    drawBlob();
  });
}

// ---------------------------------------------------------
// 8. Free-form draggable dashboard widgets (desktop only —
//    positions persist in localStorage; mobile keeps normal
//    grid flow for usability). Uses position:absolute relative
//    to the dashboard-grid container (not position:fixed), so
//    widgets scroll along with the page like normal content
//    while still being draggable to anywhere within that area.
// ---------------------------------------------------------
const WIDGET_POS_KEY = 'jarvis-widget-positions-v2';

function loadWidgetPositions() {
  try { return JSON.parse(localStorage.getItem(WIDGET_POS_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveWidgetPosition(id, x, y) {
  const all = loadWidgetPositions();
  all[id] = { x, y };
  try { localStorage.setItem(WIDGET_POS_KEY, JSON.stringify(all)); } catch (e) { /* storage unavailable */ }
}

function initDraggableWidgets() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;
  const widgets = Array.from(grid.querySelectorAll('.widget'));
  const positions = loadWidgetPositions();
  const desktopQuery = window.matchMedia('(min-width: 880px)');

  function updateContainerHeight() {
    let maxBottom = 0;
    widgets.forEach(w => {
      const bottom = w.offsetTop + w.offsetHeight;
      if (bottom > maxBottom) maxBottom = bottom;
    });
    grid.style.minHeight = Math.max(640, maxBottom + 32) + 'px';
  }

  function clampToContainer(x, y, widgetEl) {
    const margin = 4;
    const maxX = grid.clientWidth - widgetEl.offsetWidth - margin;
    return {
      x: Math.max(margin, Math.min(x, Math.max(margin, maxX))),
      y: Math.max(margin, y) // no upper bound on Y — the container grows to fit
    };
  }

  function enableFreeDrag() {
    grid.classList.add('free-drag');
    const gridRect = grid.getBoundingClientRect();
    widgets.forEach(w => {
      const saved = positions[w.id];
      let x, y;
      if (saved) {
        x = saved.x; y = saved.y;
      } else {
        // First time going free-form: keep wherever the normal grid flow
        // had placed it, converted to container-relative coordinates.
        const r = w.getBoundingClientRect();
        x = r.left - gridRect.left;
        y = r.top - gridRect.top;
      }
      const clamped = clampToContainer(x, y, w);
      w.style.left = clamped.x + 'px';
      w.style.top = clamped.y + 'px';
    });
    updateContainerHeight();
  }

  function disableFreeDrag() {
    grid.classList.remove('free-drag');
    grid.style.minHeight = '';
    widgets.forEach(w => { w.style.left = ''; w.style.top = ''; });
  }

  function handleChange() { desktopQuery.matches ? enableFreeDrag() : disableFreeDrag(); }
  desktopQuery.addEventListener('change', handleChange);
  handleChange();

  widgets.forEach(w => {
    const handle = w.querySelector('.widget-header');
    if (!handle) return;
    let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

    handle.addEventListener('pointerdown', (e) => {
      if (!desktopQuery.matches) return;
      dragging = true;
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
      // Raw client coordinates are fine here even though positioning is
      // container-relative: pointer deltas during a single drag gesture
      // are scroll-independent, so we only need the delta, not an
      // absolute conversion.
      startX = e.clientX; startY = e.clientY;
      origLeft = parseFloat(w.style.left) || 0;
      origTop = parseFloat(w.style.top) || 0;
      w.classList.add('dragging-widget');
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const clamped = clampToContainer(origLeft + dx, origTop + dy, w);
      w.style.left = clamped.x + 'px';
      w.style.top = clamped.y + 'px';
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      w.classList.remove('dragging-widget');
      saveWidgetPosition(w.id, parseFloat(w.style.left) || 0, parseFloat(w.style.top) || 0);
      updateContainerHeight();
    }
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });

  // Keep widgets within bounds horizontally if the window is resized narrower
  window.addEventListener('resize', () => {
    if (!desktopQuery.matches) return;
    widgets.forEach(w => {
      const x = parseFloat(w.style.left) || 0;
      const y = parseFloat(w.style.top) || 0;
      const clamped = clampToContainer(x, y, w);
      if (clamped.x !== x || clamped.y !== y) {
        w.style.left = clamped.x + 'px';
        w.style.top = clamped.y + 'px';
        saveWidgetPosition(w.id, clamped.x, clamped.y);
      }
    });
    updateContainerHeight();
  });
}

// ---------------------------------------------------------
// 9. Scratchpad — persists to localStorage
// ---------------------------------------------------------
function initScratchpad() {
  const ta = document.getElementById('daily-scratchpad');
  if (!ta) return;

  const saved = localStorage.getItem('jarvis-scratchpad');
  if (saved !== null) ta.value = saved;

  let debounceTimer = null;
  ta.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try { localStorage.setItem('jarvis-scratchpad', ta.value); } catch (e) { /* storage unavailable */ }
    }, 350);
  });
}

// ---------------------------------------------------------
// 10. Focus Cycle Pomodoro Timer
// ---------------------------------------------------------
function initPomodoroTimer() {
  let timer = null;
  let timeLeft = 25 * 60;
  const display = document.getElementById('pomo-display');
  const startBtn = document.getElementById('pomo-start');
  const resetBtn = document.getElementById('pomo-reset');

  function updateDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    if (display) display.textContent = `${mins}:${secs}`;
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
        startBtn.textContent = 'START';
      } else {
        startBtn.textContent = 'PAUSE';
        timer = setInterval(() => {
          if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
          } else {
            clearInterval(timer);
            timer = null;
            startBtn.textContent = 'START';
            Sound.taskDone();
            speakResponse('Focus cycle complete.');
          }
        }, 1000);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; }
      timeLeft = 25 * 60;
      if (startBtn) startBtn.textContent = 'START';
      updateDisplay();
    });
  }
}

// ---------------------------------------------------------
// 11. Task board — 3-column kanban with drag-and-drop,
//     priority, due dates, and localStorage persistence
// ---------------------------------------------------------
const TASKS_KEY = 'jarvis-tasks';
const TASK_STATUSES = ['todo', 'developing', 'done'];
let tasks = [];
let nextTaskId = 1;

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveTasks() {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch (e) { /* storage unavailable */ }
}

function formatDue(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function isOverdue(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

let editingTaskId = null; // which task card (if any) is currently in inline-edit mode

function renderTasks() {
  TASK_STATUSES.forEach(status => {
    const listEl = document.getElementById(`list-${status}`);
    const emptyEl = document.getElementById(`empty-${status}`);
    const countEl = document.getElementById(`count-${status}`);
    if (!listEl) return;

    const items = tasks.filter(t => t.status === status);
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = items.length ? 'none' : 'block';
    if (countEl) countEl.textContent = items.length;

    items.forEach(task => {
      const idx = TASK_STATUSES.indexOf(status);
      const li = document.createElement('li');
      li.className = 'kanban-item';

      if (editingTaskId === task.id) {
        // ---- Inline edit mode: text, priority, and due date all editable ----
        li.classList.add('editing');
        li.draggable = false;
        li.innerHTML = `
          <div class="card-edit">
            <input type="text" class="edit-text" value="${escapeHtml(task.text)}">
            <div class="edit-row">
              <select class="edit-priority">
                <option value="low"${task.priority === 'low' ? ' selected' : ''}>Low</option>
                <option value="medium"${task.priority === 'medium' ? ' selected' : ''}>Medium</option>
                <option value="high"${task.priority === 'high' ? ' selected' : ''}>High</option>
              </select>
              <input type="date" class="edit-due" value="${escapeHtml(task.due || '')}">
            </div>
            <div class="edit-actions">
              <button type="button" class="edit-cancel">CANCEL</button>
              <button type="button" class="edit-save">SAVE</button>
            </div>
          </div>
        `;

        const textInput = li.querySelector('.edit-text');
        const prioritySelect = li.querySelector('.edit-priority');
        const dueInput = li.querySelector('.edit-due');

        function commitEdit() {
          const newText = textInput.value.trim();
          if (newText) task.text = newText;
          task.priority = prioritySelect.value;
          task.due = dueInput.value || null;
          editingTaskId = null;
          saveTasks();
          renderTasks();
        }

        li.querySelector('.edit-save').addEventListener('click', commitEdit);
        li.querySelector('.edit-cancel').addEventListener('click', () => {
          editingTaskId = null;
          renderTasks();
        });
        textInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
          if (e.key === 'Escape') { editingTaskId = null; renderTasks(); }
        });

        listEl.appendChild(li);
        return;
      }

      // ---- Normal display mode ----
      li.draggable = true;

      const metaBits = [`<span class="badge ${task.priority}">${task.priority}</span>`];
      if (task.due) {
        const overdue = status !== 'done' && isOverdue(task.due);
        metaBits.push(`<span class="due-date${overdue ? ' overdue' : ''}">${overdue ? '⚠ ' : ''}Due ${formatDue(task.due)}</span>`);
      }

      li.innerHTML = `
        <span class="card-text"></span>
        <div class="card-meta">${metaBits.join('')}</div>
        <div class="card-actions">
          <div class="card-move">
            <button class="move-back" aria-label="Move to previous category">‹</button>
            <button class="move-fwd" aria-label="Move to next category">›</button>
          </div>
          <div class="card-right-actions">
            <button class="card-edit-btn" aria-label="Edit task">✎</button>
            <button class="card-del" aria-label="Delete task">✕</button>
          </div>
        </div>
      `;
      li.querySelector('.card-text').textContent = task.text;

      const backBtn = li.querySelector('.move-back');
      const fwdBtn = li.querySelector('.move-fwd');
      backBtn.disabled = idx === 0;
      fwdBtn.disabled = idx === TASK_STATUSES.length - 1;
      backBtn.addEventListener('click', () => moveTaskStep(task, -1));
      fwdBtn.addEventListener('click', () => moveTaskStep(task, 1));

      li.querySelector('.card-edit-btn').addEventListener('click', () => {
        editingTaskId = task.id;
        renderTasks();
      });

      li.querySelector('.card-del').addEventListener('click', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        if (editingTaskId === task.id) editingTaskId = null;
        saveTasks();
        renderTasks();
      });

      li.addEventListener('dragstart', (e) => {
        draggedTaskId = task.id;
        li.classList.add('dragging-task');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(task.id));
      });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging-task');
        draggedTaskId = null;
      });

      listEl.appendChild(li);
    });
  });

  updateAlertBadge();
}

function moveTaskTo(task, newStatus) {
  if (task.status === newStatus) return;
  task.status = newStatus;
  if (newStatus === 'done') Sound.taskDone(); else Sound.click();
  saveTasks();
  renderTasks();
}
function moveTaskStep(task, direction) {
  const idx = TASK_STATUSES.indexOf(task.status);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= TASK_STATUSES.length) return;
  moveTaskTo(task, TASK_STATUSES[newIdx]);
}

function addNewTask(title, priority = 'medium', due = null) {
  tasks.push({ id: nextTaskId++, text: title, priority, due: due || null, status: 'todo' });
  saveTasks();
  renderTasks();
}

// ---------------------------------------------------------
// Alert Center — a header bell showing overdue tasks at a
// glance. Recomputed automatically every time renderTasks()
// runs, so it's always in sync with the actual board state.
// ---------------------------------------------------------
function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  const listEl = document.getElementById('alert-list');
  if (!badge || !listEl) return;

  const overdue = tasks.filter(t => t.status !== 'done' && t.due && isOverdue(t.due));

  if (overdue.length) {
    badge.style.display = 'flex';
    badge.textContent = overdue.length > 9 ? '9+' : String(overdue.length);
  } else {
    badge.style.display = 'none';
  }

  listEl.innerHTML = '';
  if (!overdue.length) {
    listEl.innerHTML = '<li class="alert-empty">No active alerts, Raphael. All clear.</li>';
    return;
  }

  overdue.forEach(task => {
    const li = document.createElement('li');
    li.className = 'alert-item';
    li.innerHTML = `<span class="alert-text"></span><span class="alert-due"></span>`;
    li.querySelector('.alert-text').textContent = task.text;
    li.querySelector('.alert-due').textContent = `⚠ Due ${formatDue(task.due)}`;
    li.addEventListener('click', () => {
      document.querySelector('.tab-btn[data-panel="panel-tasks"]')?.click();
      document.getElementById('alert-dropdown')?.classList.remove('open');
    });
    listEl.appendChild(li);
  });
}

function initAlertCenter() {
  const btn = document.getElementById('btn-alerts');
  const dropdown = document.getElementById('alert-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('open');
  });

  updateAlertBadge(); // reflect current state immediately, don't wait for the next task edit
}

function initTaskBoard() {
  tasks = loadTasks();
  nextTaskId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  const form = document.getElementById('task-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const textInput = document.getElementById('task-input-text');
      const priorityInput = document.getElementById('task-input-priority');
      const dueInput = document.getElementById('task-input-due');
      if (textInput && textInput.value.trim()) {
        addNewTask(textInput.value.trim(), priorityInput ? priorityInput.value : 'medium', dueInput ? dueInput.value : null);
        textInput.value = '';
        if (dueInput) dueInput.value = '';
        if (priorityInput) priorityInput.value = 'medium';
      }
    });
  }

  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = Number(e.dataTransfer.getData('text/plain')) || draggedTaskId;
      const task = tasks.find(t => t.id === id);
      if (task) moveTaskTo(task, col.dataset.status);
    });
  });

  const kanban = document.getElementById('kanban');
  document.querySelectorAll('.task-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.task-tab-btn').forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      if (kanban) kanban.dataset.active = btn.dataset.status;
    });
  });

  renderTasks();
}

// ---------------------------------------------------------
// 12. Comms — Gemini API chat + local command interception
//     + voice input
// ---------------------------------------------------------
let chatHistory = []; // Gemini format: { role: 'user'|'model', parts: [{ text }] }

function goToTab(panelId) {
  document.querySelector(`.tab-btn[data-panel="${panelId}"]`)?.click();
}

// Reveals JARVIS's replies a few characters at a time for a teletype/
// terminal feel, instead of the text just appearing all at once.
function typeIntoBubble(bubble, fullText, speed = 14) {
  let i = 0;
  const chunk = 2;
  function tick() {
    i = Math.min(fullText.length, i + chunk);
    bubble.textContent = fullText.slice(0, i);
    const log = document.getElementById('chat-log');
    if (log) log.scrollTop = log.scrollHeight;
    if (i < fullText.length) setTimeout(tick, speed);
  }
  tick();
}

function appendChatMessage(sender, text) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const emptyMsg = document.getElementById('chat-empty') || log.querySelector('.chat-empty');
  if (emptyMsg) emptyMsg.style.display = 'none';

  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  const label = sender === 'user' ? 'RAPHAEL' : sender === 'jarvis' ? 'JARVIS' : 'SYSTEM';
  div.innerHTML = `<div class="who">${label}</div><div class="bubble"></div>`;
  const bubble = div.querySelector('.bubble');
  log.appendChild(div);

  if (sender === 'jarvis') {
    typeIntoBubble(bubble, text);
  } else {
    bubble.textContent = text;
  }
  log.scrollTop = log.scrollHeight;
}

// ---------------------------------------------------------
// Daily Briefing — a JARVIS-style situation report built from
// data already on the page (time, weather, task board). Fully
// local and offline — no API key required for this to work.
// ---------------------------------------------------------
function buildBriefingText() {
  const now = new Date();
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const weatherDesc = (document.getElementById('weather-desc')?.textContent || 'unavailable').toLowerCase();
  const weatherTemp = document.getElementById('weather-temp')?.textContent || '--';

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const devCount = tasks.filter(t => t.status === 'developing').length;
  const overdue = tasks.filter(t => t.status !== 'done' && t.due && isOverdue(t.due));

  const parts = [];
  parts.push(`${timeGreeting}, Raphael.`);
  parts.push(`Current conditions: ${weatherTemp}, ${weatherDesc}.`);
  parts.push(`You have ${todoCount} task${todoCount !== 1 ? 's' : ''} queued and ${devCount} in development.`);
  if (overdue.length) {
    const names = overdue.slice(0, 3).map(t => t.text).join(', ');
    parts.push(`${overdue.length} item${overdue.length > 1 ? 's are' : ' is'} overdue: ${names}${overdue.length > 3 ? ', and others' : ''}.`);
  } else {
    parts.push('No overdue items. All caught up.');
  }
  parts.push('Systems nominal.');
  return parts.join(' ');
}

function deliverBriefing() {
  goToTab('panel-comms');
  const briefing = buildBriefingText();
  Sound.receive();
  appendChatMessage('jarvis', briefing);
  speakResponse(briefing);
}

function initBriefingButton() {
  const btn = document.getElementById('btn-briefing');
  if (btn) btn.addEventListener('click', deliverBriefing);
}

async function callGemini(userText) {
  const apiKey = localStorage.getItem('jarvis_api_key') || '';
  if (!apiKey) {
    appendChatMessage('system', 'No API key set. Click the gear icon and add your Google AI Studio API key to enable live responses.');
    return;
  }

  chatHistory.push({ role: 'user', parts: [{ text: userText }] });
  setHudState('thinking');

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatHistory,
        systemInstruction: {
          parts: [{ text: 'You are JARVIS, a courteous, efficient personal AI assistant addressing the user as "sir" or "Raphael". Keep replies concise, confident, and professional, in the style of a helpful sci-fi assistant, without being overly theatrical.' }]
        },
        generationConfig: { maxOutputTokens: 1024 }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Request failed (${res.status})`);
    }

    const data = await res.json();
    const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim() || '(Empty response)';
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    setHudState(null);
    Sound.receive();
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
  } catch (err) {
    setHudState(null);
    Sound.error();
    appendChatMessage('system', `Error: ${err.message}`);
  }
}

function handleUserMessage(rawInput) {
  const text = rawInput.toLowerCase();

  // Local command: daily briefing
  if (text.includes('brief') || text.includes('status report') || text.includes('daily report') || text.includes('sitrep')) {
    const briefing = buildBriefingText();
    Sound.receive();
    appendChatMessage('jarvis', briefing);
    speakResponse(briefing);
    return;
  }

  // Local command: create task
  if (text.includes('task') && (text.includes('creat') || text.includes('add'))) {
    let title = rawInput.replace(/(creat\w*|add)\s+task\s+/i, '');
    let priority = 'medium';
    if (text.includes('priority:high') || text.includes('high priority')) priority = 'high';
    if (text.includes('priority:low') || text.includes('low priority')) priority = 'low';
    title = title.replace(/priority:\w+/gi, '').replace(/deadline:[\d/-]+/gi, '').trim();
    if (!title) title = 'New Directive Task';

    addNewTask(title, priority);
    const reply = `Task "${title}" created and added to the Task Board, sir.`;
    Sound.receive();
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // Local command: create folder
  if (text.includes('folder') && (text.includes('creat') || text.includes('mkdir'))) {
    const name = rawInput.replace(/(creat\w*|mkdir)\s+folder\s+/i, '').trim() || 'New_Folder';
    executeWorkspaceCommand(`mkdir ${name}`);
    const reply = `Directory /${name} created in the Workplace files.`;
    Sound.receive();
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // Local command: create file
  if (text.includes('file') && (text.includes('creat') || text.includes('touch'))) {
    const name = rawInput.replace(/(creat\w*|touch)\s+file\s+/i, '').trim() || 'script.js';
    executeWorkspaceCommand(`touch ${name}`);
    const reply = `File ${name} created in the Workplace files.`;
    Sound.receive();
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // Nothing local matched — hand off to Gemini for a real reply
  callGemini(rawInput);
}

function initCommsFormAndSpeech() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const micBtn = document.getElementById('btn-mic');
  const micText = document.getElementById('mic-text');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;
      Sound.send();
      appendChatMessage('user', msg);
      input.value = '';
      handleUserMessage(msg);
    });
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && micBtn) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
      try {
        recognition.start();
      } catch (err) {
        try { recognition.stop(); } catch (e2) { /* ignore */ }
      }
    });

    recognition.onstart = () => {
      micBtn.classList.add('recording');
      if (micText) micText.textContent = 'LISTENING...';
      setHudState('listening');
    };
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (input) input.value = transcript;
    };
    recognition.onend = () => {
      micBtn.classList.remove('recording');
      if (micText) micText.textContent = 'MIC';
      setHudState(null);
      if (input && input.value.trim() && form) form.requestSubmit();
    };
    recognition.onerror = () => {
      micBtn.classList.remove('recording');
      if (micText) micText.textContent = 'MIC';
      setHudState(null);
    };
  } else if (micBtn) {
    micBtn.disabled = true;
    micBtn.title = 'Voice input not supported in this browser';
  }
}

// ---------------------------------------------------------
// 13. Workplace: virtual file tree (persisted) + terminal
// ---------------------------------------------------------
const FS_KEY = 'jarvis-fs';
let fsItems = [];

function loadFs() {
  try {
    const raw = localStorage.getItem(FS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to defaults */ }
  return [
    { type: 'folder', name: '/root' },
    { type: 'file', name: 'app.js' },
    { type: 'file', name: 'index.html' },
    { type: 'file', name: 'style.css' }
  ];
}
function saveFs() {
  try { localStorage.setItem(FS_KEY, JSON.stringify(fsItems)); } catch (e) { /* storage unavailable */ }
}

function renderFileTree() {
  const list = document.getElementById('fs-root-list');
  if (!list) return;
  list.innerHTML = '';
  fsItems.forEach(item => {
    const li = document.createElement('li');
    li.className = `fs-item ${item.type}`;
    li.textContent = item.type === 'folder' ? `📁 ${item.name}` : `📄 ${item.name}`;
    list.appendChild(li);
  });
}

function appendTerminalLog(text, className = 'sys-msg') {
  const output = document.getElementById('terminal-output');
  if (!output) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${className}`;
  entry.textContent = text;
  output.appendChild(entry);
  output.scrollTop = output.scrollHeight;
}

function executeWorkspaceCommand(cmdStr) {
  const parts = cmdStr.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ').trim();

  switch (command) {
    case 'mkdir':
      if (args) {
        fsItems.push({ type: 'folder', name: `/${args}` });
        saveFs();
        renderFileTree();
        appendTerminalLog(`Created directory: /${args}`, 'success');
      }
      break;

    case 'touch':
    case 'create':
      if (args) {
        fsItems.push({ type: 'file', name: args });
        saveFs();
        renderFileTree();
        appendTerminalLog(`Created file: ${args}`, 'success');
      }
      break;

    case 'clear': {
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
      break;
    }

    case 'help':
      appendTerminalLog('Available commands: mkdir <dir>, touch <file>, clear, help', 'sys-msg');
      break;

    default:
      appendTerminalLog(`Command not recognized: '${command}'.`, 'sys-msg');
      break;
  }
}

function initWorkplaceTerminal() {
  fsItems = loadFs();
  renderFileTree();

  const input = document.getElementById('terminal-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (!cmd) return;
      appendTerminalLog(`> ${cmd}`, 'user-cmd');
      executeWorkspaceCommand(cmd);
      input.value = '';
    }
  });
}

// ---------------------------------------------------------
// 14. Masculine voice synthesis (with persisted rate/pitch)
// ---------------------------------------------------------
function pickMasculineVoice(voices) {
  if (!voices.length) return null;
  const englishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const pool = englishVoices.length ? englishVoices : voices;

  const nameHints = ['david', 'mark', 'george', 'daniel', 'alex', 'fred', 'guy', 'ryan', 'male', 'man', 'tom', 'james', 'arthur'];
  const femaleHints = ['female', 'woman', 'samantha', 'victoria', 'karen', 'susan', 'zira', 'moira', 'tessa', 'fiona', 'allison', 'ava'];

  const scored = pool.map(v => {
    const n = v.name.toLowerCase();
    let score = 0;
    if (nameHints.some(h => n.includes(h))) score += 2;
    if (femaleHints.some(h => n.includes(h))) score -= 3;
    if (v.localService) score += 1; // prefer higher-quality local voices when available
    return { voice: v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0] ? scored[0].voice : pool[0];
}

function initSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;

  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    selectedVoice = pickMasculineVoice(voices);
    const label = document.getElementById('voice-name-label');
    if (label && selectedVoice) label.textContent = selectedVoice.name;
  }

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;

  const speedInput = document.getElementById('sys-voice-speed');
  const pitchInput = document.getElementById('sys-voice-pitch');
  const savedRate = localStorage.getItem('jarvis-voice-rate');
  const savedPitch = localStorage.getItem('jarvis-voice-pitch');
  if (speedInput && savedRate) speedInput.value = savedRate;
  if (pitchInput && savedPitch) pitchInput.value = savedPitch;
  if (speedInput) speedInput.addEventListener('input', () => { try { localStorage.setItem('jarvis-voice-rate', speedInput.value); } catch (e) { /* ignore */ } });
  if (pitchInput) pitchInput.addEventListener('input', () => { try { localStorage.setItem('jarvis-voice-pitch', pitchInput.value); } catch (e) { /* ignore */ } });

  const testBtn = document.getElementById('btn-test-voice');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      speakResponse('Voice synthesis check online. Masculine profile active, sir.');
    });
  }
}

function speakResponse(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);

  const pitchInput = document.getElementById('sys-voice-pitch');
  const speedInput = document.getElementById('sys-voice-speed');
  utter.pitch = pitchInput ? parseFloat(pitchInput.value) : 0.8;
  utter.rate = speedInput ? parseFloat(speedInput.value) : 1.0;
  if (selectedVoice) utter.voice = selectedVoice;

  utter.onstart = () => setHudState('speaking');
  utter.onend = () => setHudState(null);

  window.speechSynthesis.speak(utter);
}

// ---------------------------------------------------------
// 15. Ambient sound — rain & white noise, generated live via
//     Web Audio API (no audio files, works offline)
// ---------------------------------------------------------
const AmbientSound = (() => {
  let ctx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let rainSource = null, rainGain = null, rainLow = null, rainHigh = null;
  let whiteSource = null, whiteGain = null;

  function buildNoiseBuffer(seconds) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, rate * seconds, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
      noiseBuffer = buildNoiseBuffer(4);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setVolume(v) { if (masterGain) masterGain.gain.value = v; }
  function isRainPlaying() { return !!rainSource; }
  function isWhitePlaying() { return !!whiteSource; }

  function playRain() {
    ensureContext();
    if (rainSource) return;
    rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    rainLow = ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.value = 2200;

    rainHigh = ctx.createBiquadFilter();
    rainHigh.type = 'highpass';
    rainHigh.frequency.value = 280;

    rainGain = ctx.createGain();
    rainGain.gain.value = 0.9;

    rainSource.connect(rainLow).connect(rainHigh).connect(rainGain).connect(masterGain);
    rainSource.start();
  }

  function stopRain() {
    if (rainSource) {
      try { rainSource.stop(); } catch (e) { /* already stopped */ }
      rainSource.disconnect();
      rainSource = null;
    }
  }

  function playWhite() {
    ensureContext();
    if (whiteSource) return;
    whiteSource = ctx.createBufferSource();
    whiteSource.buffer = noiseBuffer;
    whiteSource.loop = true;
    whiteGain = ctx.createGain();
    whiteGain.gain.value = 0.5;
    whiteSource.connect(whiteGain).connect(masterGain);
    whiteSource.start();
  }

  function stopWhite() {
    if (whiteSource) {
      try { whiteSource.stop(); } catch (e) { /* already stopped */ }
      whiteSource.disconnect();
      whiteSource = null;
    }
  }

  return { playRain, stopRain, playWhite, stopWhite, isRainPlaying, isWhitePlaying, setVolume, ensureContext };
})();

function initAmbientSound() {
  const rainBtn = document.getElementById('btn-ambient-rain');
  const whiteBtn = document.getElementById('btn-ambient-white');
  const volumeInput = document.getElementById('ambient-volume');

  const savedVolume = localStorage.getItem('jarvis-ambient-volume');
  if (volumeInput && savedVolume !== null) volumeInput.value = savedVolume;

  if (volumeInput) {
    volumeInput.addEventListener('input', () => {
      AmbientSound.setVolume(parseFloat(volumeInput.value));
      try { localStorage.setItem('jarvis-ambient-volume', volumeInput.value); } catch (e) { /* ignore */ }
    });
  }

  if (rainBtn) {
    rainBtn.addEventListener('click', () => {
      if (AmbientSound.isRainPlaying()) {
        AmbientSound.stopRain();
        rainBtn.classList.remove('active-state');
      } else {
        AmbientSound.setVolume(volumeInput ? parseFloat(volumeInput.value) : 0.4);
        AmbientSound.playRain();
        rainBtn.classList.add('active-state');
      }
    });
  }

  if (whiteBtn) {
    whiteBtn.addEventListener('click', () => {
      if (AmbientSound.isWhitePlaying()) {
        AmbientSound.stopWhite();
        whiteBtn.classList.remove('active-state');
      } else {
        AmbientSound.setVolume(volumeInput ? parseFloat(volumeInput.value) : 0.4);
        AmbientSound.playWhite();
        whiteBtn.classList.add('active-state');
      }
    });
  }
}

// ---------------------------------------------------------
// 16. Connections — a quick-launch hub for other sites/apps.
//     Honesty note: this does NOT log in to anything or hold
//     any real credentials. A static site has nowhere safe to
//     keep OAuth secrets, so this simply opens saved links in
//     a new tab — a personal shortcut panel, not integration.
// ---------------------------------------------------------
const CONNECTIONS_KEY = 'jarvis-connections';

const CONNECTION_PRESETS = [
  { name: 'Google', url: 'https://google.com' },
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: 'Instagram', url: 'https://instagram.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Spotify', url: 'https://open.spotify.com' }
];

// Deterministic color per name so each badge looks distinct but stable
const BADGE_COLORS = ['#4fd8e6', '#e6a04f', '#e65f5f', '#6fcf97', '#a78bfa', '#f472b6'];
function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

function loadConnections() {
  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveConnections(list) {
  try { localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function renderConnections() {
  const grid = document.getElementById('connections-grid');
  const emptyEl = document.getElementById('connections-empty');
  const presetsWrap = document.getElementById('connections-presets');
  if (!grid) return;

  const list = loadConnections();
  grid.innerHTML = '';
  if (emptyEl) emptyEl.style.display = list.length ? 'none' : 'block';

  list.forEach((conn, index) => {
    const tile = document.createElement('a');
    tile.className = 'connection-tile';
    tile.href = conn.url;
    tile.target = '_blank';
    tile.rel = 'noopener noreferrer';

    const initial = (conn.name || '?').trim().charAt(0).toUpperCase() || '?';
    tile.innerHTML = `
      <span class="connection-badge" style="background:${colorForName(conn.name)}">${initial}</span>
      <span class="connection-name"></span>
      <button type="button" class="connection-del" aria-label="Remove ${conn.name}">✕</button>
    `;
    tile.querySelector('.connection-name').textContent = conn.name;

    const delBtn = tile.querySelector('.connection-del');
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = loadConnections();
      current.splice(index, 1);
      saveConnections(current);
      renderConnections();
    });

    grid.appendChild(tile);
  });

  // Grey out preset buttons already added, so it's clear at a glance
  if (presetsWrap) {
    const addedNames = list.map(c => c.name.toLowerCase());
    presetsWrap.querySelectorAll('.preset-btn').forEach(btn => {
      btn.disabled = addedNames.includes(btn.dataset.name.toLowerCase());
    });
  }
}

function addConnection(name, url) {
  const cleanUrl = normalizeUrl(url);
  if (!name.trim() || !cleanUrl) return;
  const list = loadConnections();
  if (list.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) return; // no duplicates
  list.push({ name: name.trim(), url: cleanUrl });
  saveConnections(list);
  Sound.click();
  renderConnections();
}

function initConnections() {
  const presetsWrap = document.getElementById('connections-presets');
  if (presetsWrap) {
    CONNECTION_PRESETS.forEach(preset => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-btn';
      btn.dataset.name = preset.name;
      btn.innerHTML = `<span>+</span> ${preset.name}`;
      btn.addEventListener('click', () => addConnection(preset.name, preset.url));
      presetsWrap.appendChild(btn);
    });
  }

  const form = document.getElementById('connection-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('connection-name');
      const urlInput = document.getElementById('connection-url');
      addConnection(nameInput.value, urlInput.value);
      nameInput.value = '';
      urlInput.value = '';
    });
  }

  renderConnections();
}

// ---------------------------------------------------------
// 17. Command Palette — Ctrl+K / Cmd+K quick actions.
//     A fast, JARVIS-appropriate way to jump anywhere or fire
//     an action without hunting through tabs.
// ---------------------------------------------------------
function initCommandPalette() {
  const overlay = document.getElementById('palette-overlay');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  const triggerBtn = document.getElementById('palette-trigger');
  if (!overlay || !input || !list) return;

  let activeIndex = 0;
  let filtered = [];

  function getCommands() {
    return [
      { icon: '01', label: 'Go to Dashboard', hint: 'Tab', run: () => switchTab('panel-dashboard') },
      { icon: '02', label: 'Go to Comms', hint: 'Tab', run: () => switchTab('panel-comms') },
      { icon: '03', label: 'Go to Tasks', hint: 'Tab', run: () => switchTab('panel-tasks') },
      { icon: '04', label: 'Go to Systems', hint: 'Tab', run: () => switchTab('panel-systems') },
      { icon: '05', label: 'Go to Workplace', hint: 'Tab', run: () => switchTab('panel-workplace') },
      { icon: '06', label: 'Go to Connections', hint: 'Tab', run: () => switchTab('panel-connections') },
      { icon: '⚙', label: 'Open API key settings', hint: 'Modal', run: () => document.getElementById('btn-settings-toggle')?.click() },
      { icon: '◐', label: 'Cycle interface theme', hint: 'Blue → Amber → Red', run: () => document.getElementById('btn-theme-toggle')?.click() },
      { icon: '⏱', label: 'Start / pause focus cycle', hint: 'Pomodoro', run: () => document.getElementById('pomo-start')?.click() },
      { icon: '🌧', label: 'Toggle rain sound', hint: 'Ambient', run: () => document.getElementById('btn-ambient-rain')?.click() },
      { icon: '▓', label: 'Toggle white noise', hint: 'Ambient', run: () => document.getElementById('btn-ambient-white')?.click() },
      { icon: '🔊', label: 'Test JARVIS voice', hint: 'Speech', run: () => document.getElementById('btn-test-voice')?.click() },
      { icon: '🎙', label: 'Daily briefing', hint: 'Comms', run: () => deliverBriefing() },
      { icon: '🔈', label: 'Toggle interface sound', hint: 'Header', run: () => document.getElementById('btn-sound-toggle')?.click() },
      { icon: '+', label: 'Focus new task field', hint: 'Tasks', run: () => { switchTab('panel-tasks'); setTimeout(() => document.getElementById('task-input-text')?.focus(), 50); } },
      { icon: '+', label: 'Focus scratchpad', hint: 'Dashboard', run: () => { switchTab('panel-dashboard'); setTimeout(() => document.getElementById('daily-scratchpad')?.focus(), 50); } }
    ];
  }

  function switchTab(panelId) {
    const btn = document.querySelector(`.tab-btn[data-panel="${panelId}"]`);
    if (btn) btn.click();
  }

  function render() {
    const query = input.value.trim().toLowerCase();
    const all = getCommands();
    filtered = query ? all.filter(c => c.label.toLowerCase().includes(query)) : all;
    activeIndex = 0;

    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li class="palette-empty">No matching command, sir.</li>';
      return;
    }

    filtered.forEach((cmd, i) => {
      const li = document.createElement('li');
      li.className = 'palette-item' + (i === activeIndex ? ' active-item' : '');
      li.innerHTML = `<span class="palette-icon">${cmd.icon}</span><span>${cmd.label}</span><span class="palette-hint">${cmd.hint}</span>`;
      li.addEventListener('click', () => runActive(i));
      li.addEventListener('mouseenter', () => { activeIndex = i; highlightActive(); });
      list.appendChild(li);
    });
  }

  function highlightActive() {
    Array.from(list.children).forEach((li, i) => li.classList.toggle('active-item', i === activeIndex));
  }

  function runActive(index) {
    const cmd = filtered[index !== undefined ? index : activeIndex];
    if (cmd) cmd.run();
    closePalette();
  }

  function openPalette() {
    Sound.click();
    overlay.classList.add('open');
    input.value = '';
    render();
    setTimeout(() => input.focus(), 30);
  }
  function closePalette() {
    overlay.classList.remove('open');
  }

  if (triggerBtn) triggerBtn.addEventListener('click', openPalette);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePalette(); });
  input.addEventListener('input', render);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); highlightActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); highlightActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
    else if (e.key === 'Escape') { closePalette(); }
  });

  document.addEventListener('keydown', (e) => {
    const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (isShortcut) {
      e.preventDefault();
      overlay.classList.contains('open') ? closePalette() : openPalette();
    }
  });
}
