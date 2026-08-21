/* =========================================================
   J.A.R.V.I.S. INTERFACE — APPLICATION LOGIC
   ========================================================= */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   1. SOUND ENGINE
   ========================================================= */
const Sound = (() => {
  let ctx = null;
  let enabled = false;

  function ensureContext(){
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, duration, type = 'sine', gain = 0.05, delay = 0){
    if (!enabled) return;
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
  }

  return {
    setEnabled(v){ enabled = v; if (v) ensureContext(); },
    isEnabled(){ return enabled; },
    click(){ tone(1200, 0.05, 'square', 0.03); },
    send(){ tone(880, 0.08, 'sine', 0.05); },
    receive(){ tone(660, 0.09, 'sine', 0.05); tone(990, 0.09, 'sine', 0.04, 0.08); },
    bootComplete(){ tone(440, 0.15, 'sine', 0.05); tone(880, 0.2, 'sine', 0.05, 0.12); },
    taskDone(){ tone(1046, 0.12, 'sine', 0.05); tone(1318, 0.14, 'sine', 0.04, 0.1); },
    error(){ tone(220, 0.2, 'sawtooth', 0.04); }
  };
})();

/* =========================================================
   2. BOOT SEQUENCE
   ========================================================= */
(function boot(){
  const overlay = document.getElementById('boot-overlay');
  const log = document.getElementById('boot-log');
  const barFill = document.getElementById('boot-bar-fill');
  const skipBtn = document.getElementById('boot-skip');
  const shell = document.getElementById('shell');

  const lines = [
    'INITIALIZING CORE SYSTEMS…',
    'LOADING DIAGNOSTIC MODULES…',
    'CALIBRATING SENSOR ARRAY…',
    'ESTABLISHING SECURE LINK…',
    'ALL SYSTEMS NOMINAL.'
  ];

  function finishBoot(){
    if (!overlay || !shell) return;
    overlay.classList.add('hidden');
    shell.classList.add('revealed');
    Sound.bootComplete();
    setTimeout(() => overlay.remove(), 700);
  }

  if (reducedMotion){
    finishBoot();
    return;
  }

  lines.forEach((text, i) => {
    setTimeout(() => {
      if (log) {
        const div = document.createElement('div');
        div.textContent = `> ${text}`;
        log.appendChild(div);
      }
    }, i * 420);
  });

  if (barFill) requestAnimationFrame(() => { barFill.style.width = '100%'; });

  const bootTimer = setTimeout(finishBoot, 2300);
  if (skipBtn) skipBtn.addEventListener('click', () => { clearTimeout(bootTimer); finishBoot(); });
})();

/* =========================================================
   3. CIRCUIT BOARD FIELD
   ========================================================= */
(function circuitBoard(){
  const canvas = document.getElementById('particle-field');
  if (!canvas || reducedMotion){ if (canvas) canvas.remove(); return; }
  const ctx = canvas.getContext('2d');
  const GRID = 48;
  let w, h, traces, signals;

  function themeColor(varName, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  function buildTraces(){
    const cols = Math.max(4, Math.floor(w / GRID));
    const rows = Math.max(4, Math.floor(h / GRID));
    const count = Math.min(22, Math.max(8, Math.floor((w * h) / 130000)));
    const list = [];

    for (let i = 0; i < count; i++){
      let x = Math.floor(Math.random() * cols) * GRID;
      let y = Math.floor(Math.random() * rows) * GRID;
      const points = [{ x, y }];
      let horizontal = Math.random() < 0.5;
      const segments = 3 + Math.floor(Math.random() * 4);

      for (let s = 0; s < segments; s++){
        const runCells = 1 + Math.floor(Math.random() * 3);
        const dir = Math.random() < 0.5 ? 1 : -1;
        if (horizontal){
          x = Math.min(cols * GRID, Math.max(0, x + dir * runCells * GRID));
        } else {
          y = Math.min(rows * GRID, Math.max(0, y + dir * runCells * GRID));
        }
        points.push({ x, y });
        horizontal = !horizontal;
      }

      let total = 0;
      const segLens = [];
      for (let p = 1; p < points.length; p++){
        const len = Math.hypot(points[p].x - points[p - 1].x, points[p].y - points[p - 1].y);
        segLens.push(len);
        total += len;
      }
      if (total > 0) list.push({ points, segLens, total });
    }
    return list;
  }

  function pointAtProgress(trace, t){
    let dist = Math.max(0, Math.min(1, t)) * trace.total;
    for (let i = 0; i < trace.segLens.length; i++){
      const segLen = trace.segLens[i];
      if (dist <= segLen || i === trace.segLens.length - 1){
        const segT = segLen > 0 ? Math.min(1, dist / segLen) : 0;
        const p0 = trace.points[i], p1 = trace.points[i + 1];
        return { x: p0.x + (p1.x - p0.x) * segT, y: p0.y + (p1.y - p0.y) * segT };
      }
      dist -= segLen;
    }
    return trace.points[trace.points.length - 1];
  }

  function spawnSignal(){
    return {
      traceIndex: Math.floor(Math.random() * traces.length),
      t: Math.random() * -0.4,
      speed: 0.0025 + Math.random() * 0.004,
      color: Math.random() < 0.72 ? themeColor('--accent', '#4fd8e6') : themeColor('--warn', '#e6a04f')
    };
  }

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    traces = buildTraces();
    const signalCount = Math.max(6, Math.round(traces.length * 0.7));
    signals = Array.from({ length: signalCount }, spawnSignal);
  }

  function drawBoard(){
    if (!traces.length) return;
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
      trace.points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
  }

  function drawSignals(){
    signals.forEach(sig => {
      sig.t += sig.speed;
      if (sig.t > 1.15){ Object.assign(sig, spawnSignal()); return; }
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

  function tick(){
    ctx.clearRect(0, 0, w, h);
    drawBoard();
    drawSignals();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
})();

/* =========================================================
   4. TAB NAVIGATION
   ========================================================= */
(function tabs(){
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      buttons.forEach(b => b.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.classList.remove('active'));
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(`panel-${btn.dataset.tab}`);
      if (targetPanel) targetPanel.classList.add('active');

      if (btn.dataset.tab === 'workplace' && typeof window.renderFileTree === 'function') {
        window.renderFileTree();
      }
    });
  });
})();

/* =========================================================
   5. CLOCK / DATE READOUT
   ========================================================= */
(function clock(){
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  const zoneEl = document.getElementById('clock-zone');
  function tick(){
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
    if (zoneEl) zoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  tick();
  setInterval(tick, 1000);
})();

/* =========================================================
   6. WEATHER WIDGET
   ========================================================= */
(function weather(){
  const locEl = document.getElementById('weather-loc');
  const tempEl = document.getElementById('weather-temp');
  const condEl = document.getElementById('weather-cond');
  if (!locEl || !tempEl || !condEl) return;

  const WMO = {
    0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
    75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
  };

  async function fetchWeather(lat, lon, label){
    try{
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`);
      const data = await res.json();
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      locEl.textContent = label;
      tempEl.textContent = `${temp}°C`;
      condEl.textContent = WMO[code] || 'Unknown';
    }catch(err){
      locEl.textContent = 'Unavailable';
      tempEl.textContent = '--';
      condEl.textContent = 'Offline';
    }
  }

  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Current position'),
      () => fetchWeather(51.5074, -0.1278, 'London (default)'),
      { timeout: 6000 }
    );
  } else {
    fetchWeather(51.5074, -0.1278, 'London (default)');
  }
})();

/* =========================================================
   7. TASKS PANEL (With Robust Date Parser & Card Editing)
   ========================================================= */
(function tasks(){
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input');
  const priorityInput = document.getElementById('task-priority');
  const dueInput = document.getElementById('task-due');
  const summary = document.getElementById('task-summary');
  const kanban = document.getElementById('kanban');
  const tabButtons = document.querySelectorAll('.task-tab-btn');
  const columnEls = document.querySelectorAll('.kanban-col');

  const STATUSES = ['todo', 'developing', 'done'];
  const STORAGE_KEY = 'jarvis-tasks';

  const lists = {
    todo: document.getElementById('list-todo'),
    developing: document.getElementById('list-developing'),
    done: document.getElementById('list-done')
  };
  const emptyMsgs = {
    todo: document.getElementById('empty-todo'),
    developing: document.getElementById('empty-developing'),
    done: document.getElementById('empty-done')
  };
  const counts = {
    todo: document.getElementById('count-todo'),
    developing: document.getElementById('count-developing'),
    done: document.getElementById('count-done')
  };

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return parsed.map(t => ({
        id: t.id,
        text: t.text,
        status: t.status || (t.done ? 'done' : 'todo'),
        priority: t.priority || 'medium',
        due: t.due || null
      }));
    }catch(err){
      return [];
    }
  }

  function save(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksArr)); }
    catch(err){}
  }

  window.tasksArr = load();
  let nextId = window.tasksArr.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  let draggedId = null;

  window.saveTasks = save;

  window.addNewTask = function(text, priority = 'medium', due = null) {
    window.tasksArr.push({
      id: nextId++,
      text: text,
      status: 'todo',
      priority: priority,
      due: due
    });
    save();
    render();
    if (typeof Sound !== 'undefined') Sound.taskDone();
  };

  function moveTask(task, newStatus){
    if (task.status === newStatus) return;
    task.status = newStatus;
    if (newStatus === 'done') Sound.taskDone(); else Sound.click();
    save();
    render();
  }

  function moveTaskByStep(task, direction){
    const idx = STATUSES.indexOf(task.status);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= STATUSES.length) return;
    moveTask(task, STATUSES[newIdx]);
  }

  // Safe Multi-Format Date Parser & Formatter
  function formatDue(dateStr) {
    if (!dateStr) return '';
    const clean = dateStr.toString().trim().replace(/\//g, '-');
    const parts = clean.split('-');

    let year, month, day;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        [year, month, day] = parts;
      } else {
        [month, day, year] = parts;
      }
      const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isOverdue(dateStr){
    const today = new Date();
    today.setHours(0,0,0,0);
    const parsed = new Date(dateStr);
    return !isNaN(parsed.getTime()) && parsed < today;
  }

  function render(){
    STATUSES.forEach(status => {
      if (!lists[status]) return;
      const items = window.tasksArr.filter(t => t.status === status);
      lists[status].innerHTML = '';
      if (emptyMsgs[status]) emptyMsgs[status].style.display = items.length ? 'none' : 'block';
      if (counts[status]) counts[status].textContent = items.length;

      items.forEach(task => {
        const idx = STATUSES.indexOf(status);
        const li = document.createElement('li');
        li.className = 'kanban-card';
        li.draggable = true;
        li.title = "Double-click card to edit details";

        const formattedDate = formatDue(task.due);
        const metaBits = [`<span class="priority-badge ${task.priority}">${task.priority}</span>`];
        if (task.due && formattedDate){
          const overdue = status !== 'done' && isOverdue(task.due);
          metaBits.push(`<span class="due-date${overdue ? ' overdue' : ''}">${overdue ? '⚠ ' : ''}Due ${formattedDate}</span>`);
        }

        li.innerHTML = `
          <span class="card-text"></span>
          <div class="card-meta">${metaBits.join('')}</div>
          <div class="card-actions">
            <div class="card-move">
              <button class="move-back" aria-label="Move to previous category">‹</button>
              <button class="move-fwd" aria-label="Move to next category">›</button>
            </div>
            <button class="card-del" aria-label="Delete task">✕</button>
          </div>
        `;
        li.querySelector('.card-text').textContent = task.text;

        li.addEventListener('dblclick', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          
          const newTitle = prompt('Edit task title:', task.text);
          if (newTitle !== null && newTitle.trim() !== '') task.text = newTitle.trim();

          const newPrio = prompt('Edit priority (low, medium, high):', task.priority);
          if (newPrio && ['low', 'medium', 'high'].includes(newPrio.toLowerCase())) {
            task.priority = newPrio.toLowerCase();
          }

          const newDue = prompt('Edit due date (YYYY-MM-DD or MM/DD/YYYY):', task.due || '');
          if (newDue !== null) task.due = newDue.trim() || null;

          save();
          render();
          Sound.click();
        });

        const backBtn = li.querySelector('.move-back');
        const fwdBtn = li.querySelector('.move-fwd');
        backBtn.disabled = idx === 0;
        fwdBtn.disabled = idx === STATUSES.length - 1;
        backBtn.addEventListener('click', () => moveTaskByStep(task, -1));
        fwdBtn.addEventListener('click', () => moveTaskByStep(task, 1));

        li.querySelector('.card-del').addEventListener('click', () => {
          window.tasksArr = window.tasksArr.filter(t => t.id !== task.id);
          save();
          render();
        });

        li.addEventListener('dragstart', e => {
          draggedId = task.id;
          li.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(task.id));
        });
        li.addEventListener('dragend', () => {
          li.classList.remove('dragging');
          draggedId = null;
        });

        lists[status].appendChild(li);
      });
    });

    const total = window.tasksArr.length;
    const done = window.tasksArr.filter(t => t.status === 'done').length;
    if (summary) summary.textContent = total ? `${total} total · ${done} completed` : '';
  }

  window.renderTasks = render;

  columnEls.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = Number(e.dataTransfer.getData('text/plain')) || draggedId;
      const task = window.tasksArr.find(t => t.id === id);
      if (task) moveTask(task, col.dataset.status);
    });
  });

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      window.addNewTask(text, priorityInput.value, dueInput.value || null);
      input.value = '';
      if (dueInput) dueInput.value = '';
      if (priorityInput) priorityInput.value = 'medium';
      Sound.click();
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      tabButtons.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      if (kanban) kanban.dataset.active = btn.dataset.status;
    });
  });

  render();
})();

/* =========================================================
   8. SYSTEMS PANEL
   ========================================================= */
(function systems(){
  const battery = document.getElementById('sys-battery');
  const charging = document.getElementById('sys-charging');
  const online = document.getElementById('sys-online');
  const connType = document.getElementById('sys-conn-type');
  const resolution = document.getElementById('sys-resolution');
  const platform = document.getElementById('sys-platform');

  if ('getBattery' in navigator && battery && charging){
    navigator.getBattery().then(b => {
      function update(){
        battery.textContent = `${Math.round(b.level * 100)}%`;
        charging.textContent = b.charging ? 'Yes' : 'No';
      }
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    });
  } else if (battery && charging) {
    battery.textContent = 'Not supported';
    charging.textContent = '—';
  }

  function updateOnline(){ if (online) online.textContent = navigator.onLine ? 'Online' : 'Offline'; }
  updateOnline();
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  if (connType) connType.textContent = navigator.connection?.effectiveType || 'Unavailable';
  if (resolution) resolution.textContent = `${window.screen.width}×${window.screen.height}`;
  if (platform) platform.textContent = navigator.platform || navigator.userAgentData?.platform || 'Unknown';
})();

/* =========================================================
   9. THEME SWITCHER
   ========================================================= */
(function themes(){
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach(sw => {
    sw.addEventListener('click', () => {
      Sound.click();
      document.documentElement.setAttribute('data-theme', sw.dataset.theme);
      swatches.forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });
})();

/* =========================================================
   10. SOUND + VOICE TOGGLES
   ========================================================= */
let voiceReplyEnabled = false;
let handsFreeEnabled = false;

(function toggles(){
  const soundToggle = document.getElementById('sound-toggle');
  const voiceToggle = document.getElementById('voice-toggle');
  const handsFreeToggle = document.getElementById('handsfree-toggle');
  const handsFreeHint = document.getElementById('handsfree-hint');
  const muteHeaderBtn = document.getElementById('mute-toggle');

  function setSound(on){
    Sound.setEnabled(on);
    if (soundToggle) {
      soundToggle.classList.toggle('on', on);
      soundToggle.setAttribute('aria-pressed', on);
    }
    if (muteHeaderBtn) muteHeaderBtn.classList.toggle('active', on);
    if (on) Sound.click();
  }
  function setVoice(on){
    voiceReplyEnabled = on;
    if (voiceToggle) {
      voiceToggle.classList.toggle('on', on);
      voiceToggle.setAttribute('aria-pressed', on);
    }
    if (!on && handsFreeEnabled) setHandsFree(false);
  }
  function setHandsFree(on){
    handsFreeEnabled = on;
    if (handsFreeToggle) {
      handsFreeToggle.classList.toggle('on', on);
      handsFreeToggle.setAttribute('aria-pressed', on);
    }
    if (handsFreeHint) handsFreeHint.style.display = on ? 'block' : 'none';
    if (on && !voiceReplyEnabled) setVoice(true);
  }

  if (soundToggle) soundToggle.addEventListener('click', () => setSound(!Sound.isEnabled()));
  if (muteHeaderBtn) muteHeaderBtn.addEventListener('click', () => setSound(!Sound.isEnabled()));
  if (voiceToggle) voiceToggle.addEventListener('click', () => setVoice(!voiceReplyEnabled));
  if (handsFreeToggle) handsFreeToggle.addEventListener('click', () => setHandsFree(!handsFreeEnabled));
})();

/* =========================================================
   11. SETTINGS MODAL
   ========================================================= */
const GEMINI_KEY_STORAGE = 'jarvis-gemini-api-key';
let apiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';

(function settingsModal(){
  const modal = document.getElementById('settings-modal');
  const openBtns = [
    document.getElementById('settings-btn'),
    document.getElementById('chat-hint-btn'),
    document.getElementById('sys-settings-btn')
  ];
  const cancelBtn = document.getElementById('settings-cancel');
  const saveBtn = document.getElementById('settings-save');
  const input = document.getElementById('api-key-input');
  const chatHint = document.getElementById('chat-hint');
  const sysApiStatus = document.getElementById('sys-api-status');

  function refreshStatusUI(){
    if (apiKey){
      if (chatHint) chatHint.style.display = 'none';
      if (sysApiStatus) sysApiStatus.textContent = 'Key saved in this browser';
    } else {
      if (chatHint) chatHint.style.display = 'block';
      if (sysApiStatus) sysApiStatus.textContent = 'Not set';
    }
  }

  function open(){ if (modal) modal.classList.add('open'); if (input) { input.value = apiKey; input.focus(); } }
  function close(){ if (modal) modal.classList.remove('open'); }

  openBtns.forEach(btn => btn && btn.addEventListener('click', open));
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) close(); });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      apiKey = input ? input.value.trim() : '';
      Sound.click();
      if (apiKey){
        localStorage.setItem(GEMINI_KEY_STORAGE, apiKey);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
      refreshStatusUI();
      close();
    });
  }

  refreshStatusUI();
})();

/* =========================================================
   12. COMMS PANEL — Chat + Voice Engine Filter + Speech API
   ========================================================= */
(function comms(){
  const chatLog = document.getElementById('chat-log');
  const chatEmpty = document.getElementById('chat-empty');
  const form = document.getElementById('command-form');
  const input = document.getElementById('command-input');
  const micBtn = document.getElementById('mic-btn');
  const hudCore = document.getElementById('hud-core');
  const hudStatus = document.getElementById('hud-status');

  let history = [];

  function addMessage(who, text){
    if (chatEmpty) chatEmpty.style.display = 'none';
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    const label = who === 'user' ? 'YOU' : who === 'jarvis' ? 'JARVIS' : 'SYSTEM';
    div.innerHTML = `<div class="who">${label}</div><div class="bubble"></div>`;
    div.querySelector('.bubble').textContent = text;
    if (chatLog) {
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }

  function setHudState(state){
    if (hudCore) hudCore.classList.remove('listening', 'thinking', 'speaking');
    if (hudCore && state) hudCore.classList.add(state);
    if (hudStatus) {
      hudStatus.textContent = state === 'listening' ? 'LISTENING'
        : state === 'thinking' ? 'THINKING'
        : state === 'speaking' ? 'RESPONDING'
        : 'READY';
    }
  }

  async function sendToGemini(userText){
    if (!apiKey){
      addMessage('system', 'No API key set. Open Settings (gear icon) and add your Google AI Studio API key to enable live responses.');
      return;
    }
    history.push({ role: 'user', parts: [{ text: userText }] });
    setHudState('thinking');
    try{
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          systemInstruction: {
            parts: [{ text: 'You are JARVIS, a courteous and efficient personal AI assistant. Keep replies concise and address the user as "sir" occasionally, in the style of a helpful sci-fi assistant, without being overly theatrical.' }]
          },
          generationConfig: { maxOutputTokens: 1024 }
        })
      });
      if (!res.ok){
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const reply = (data.candidates?.[0]?.content?.parts || [])
        .map(part => part.text || '')
        .join('')
        .trim() || '(Empty response)';
      history.push({ role: 'model', parts: [{ text: reply }] });
      addMessage('jarvis', reply);
      Sound.receive();
      if (voiceReplyEnabled){
        speak(reply);
      } else {
        setHudState('speaking');
        setTimeout(() => setHudState(null), 1000);
      }
    }catch(err){
      addMessage('system', `Error: ${err.message}`);
      Sound.error();
      setHudState(null);
    }
  }

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage('user', text);
      Sound.send();
      input.value = '';

      if (typeof window.processLocalCommand === 'function') {
        const localResult = await window.processLocalCommand(text);
        if (localResult) {
          addMessage('jarvis', localResult);
          if (voiceReplyEnabled) speak(localResult);
          return;
        }
      }

      sendToGemini(text);
    });
  }

  /* ---- Speech Recognition ---- */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let recognizer = null;
  let userStoppedMic = false;

  if (SpeechRecognition && micBtn){
    recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';

    recognizer.addEventListener('start', () => {
      recognizing = true;
      micBtn.classList.add('recording');
      setHudState('listening');
    });
    recognizer.addEventListener('end', () => {
      recognizing = false;
      micBtn.classList.remove('recording');
      setHudState(null);
    });
    recognizer.addEventListener('result', e => {
      const transcript = e.results[0][0].transcript;
      input.value = transcript;
      form.requestSubmit();
    });
    recognizer.addEventListener('error', () => {
      recognizing = false;
      micBtn.classList.remove('recording');
      setHudState(null);
    });

    micBtn.addEventListener('click', () => {
      if (recognizing){
        userStoppedMic = true;
        recognizer.stop();
        return;
      }
      Sound.click();
      userStoppedMic = false;
      recognizer.start();
    });
  } else if (micBtn) {
    micBtn.disabled = true;
    micBtn.title = 'Voice input not supported in this browser';
  }

  /* ---- Voice Synthesis (Masculine Voice Engine Filter) ---- */
  let selectedVoice = null;

  function loadMaleVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    selectedVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /\b(david|daniel|george|alex|james|mark|guy|richard|stefan|google uk english male|google us english male|male|natural)\b/i.test(v.name)
    ) 
    || voices.find(v => v.lang.startsWith('en') && !/\b(female|zira|hazel|susan|victoria|catherine|samantha|karen)\b/i.test(v.name)) 
    || voices[0];
  }

  if ('speechSynthesis' in window) {
    loadMaleVoice();
    window.speechSynthesis.onvoiceschanged = loadMaleVoice;
  }

  function speak(text){
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    if (!selectedVoice) loadMaleVoice();
    if (selectedVoice) utter.voice = selectedVoice;

    utter.rate = 1.0;
    utter.pitch = 0.8;
    
    utter.onstart = () => setHudState('speaking');
    utter.onend = () => {
      setHudState(null);
      if (handsFreeEnabled && recognizer && !recognizing && !userStoppedMic){
        recognizer.start();
      }
    };

    window.speechSynthesis.speak(utter);
  }
})();

/* =========================================================
   13. BROWSER VIRTUAL FS + NATURAL PARSER (WITH FILLER STRIPPING)
   ========================================================= */
(function virtualFS() {
  const DB_NAME = 'JarvisVirtualFS';
  const DB_VERSION = 1;
  const STORE_NAME = 'files';
  let db = null;

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'path' });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        window.renderFileTree();
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function saveItem(path, type, content = '') {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('DB not initialized'));
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { path, type, content, createdAt: new Date().toISOString() };
      const req = store.put(record);
      req.onsuccess = () => {
        window.renderFileTree();
        resolve(record);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function getAllItems() {
    return new Promise((resolve, reject) => {
      if (!db) return resolve([]);
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function openEditorModal(item) {
    let modal = document.getElementById('file-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'file-editor-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width:700px; width:90%;">
          <div class="modal-title" id="editor-filename">Edit File</div>
          <textarea id="editor-textarea" style="width:100%; height:300px; background:var(--bg-card); color:var(--fg-main); border:1px solid var(--accent-dim); font-family:monospace; padding:10px; margin:15px 0; border-radius:4px; box-sizing:border-box; resize:vertical;"></textarea>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="editor-cancel-btn" class="hud-btn secondary">Cancel</button>
            <button id="editor-save-btn" class="hud-btn primary">Save Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('editor-cancel-btn').addEventListener('click', () => modal.classList.remove('open'));
    }

    document.getElementById('editor-filename').textContent = `Editing: ${item.path}`;
    const textarea = document.getElementById('editor-textarea');
    textarea.value = item.content || '';
    modal.classList.add('open');

    const saveBtn = document.getElementById('editor-save-btn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', async () => {
      await saveItem(item.path, item.type, textarea.value);
      if (typeof Sound !== 'undefined') Sound.taskDone();
      modal.classList.remove('open');
    });
  }

  window.renderFileTree = async function() {
    const container = document.getElementById('file-tree');
    if (!container) return;

    const items = await getAllItems();
    if (items.length === 0) {
      container.innerHTML = '<p class="empty-msg">No folders or projects created yet. Ask JARVIS in COMMS to create one, sir.</p>';
      return;
    }

    container.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'fs-list';

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = `fs-item ${item.type}`;
      li.style.cursor = item.type === 'file' ? 'pointer' : 'default';
      const icon = item.type === 'folder' ? '📁' : '📄';
      li.innerHTML = `<span>${icon} ${item.path}</span>`;

      if (item.type === 'file') {
        li.title = 'Click to open/edit file';
        li.addEventListener('click', () => openEditorModal(item));
      }

      list.appendChild(li);
    });

    container.appendChild(list);
  };

  async function createVirtualItem(name, isProject = false) {
    const folderPath = isProject ? `Projects/${name}` : `Folders/${name}`;
    
    try {
      await saveItem(folderPath, 'folder');

      if (isProject) {
        await saveItem(`${folderPath}/index.html`, 'file', '<!DOCTYPE html>\n<html>\n<head><title>' + name + '</title></head>\n<body></body>\n</html>');
        await saveItem(`${folderPath}/style.css`, 'file', '/* Styles for ' + name + ' */');
        await saveItem(`${folderPath}/app.js`, 'file', '// Scripts for ' + name);
      }

      if (typeof Sound !== 'undefined') Sound.taskDone();
      return isProject 
        ? `Project '${name}' created and saved in browser storage with standard web files, sir.`
        : `Folder '${name}' created and saved in browser storage, sir.`;
    } catch (err) {
      if (typeof Sound !== 'undefined') Sound.error();
      return `Failed to save to browser storage: ${err.message}`;
    }
  }

  /* Flexible Local Command Parser with Filler Word Removal */
  window.processLocalCommand = async function (userText) {
    let cleanText = userText.trim().toLowerCase();

    // Strip filler words and speech headers
    cleanText = cleanText
      .replace(/\b(uh|um|like|ah|so|hey|jarvis|please|can you|could you|i want to|i need to|would you|kindly)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Flexible Task Intent Detection
    const isEditKeywords = /\b(edit|update|change|set|modify|make|put)\b/i;
    const isCreateKeywords = /\b(add|create|creat|new|make|put)\b/i;
    const hasTaskKeywords = /\b(task|todo|item)\b/i;
    const hasPrioOrDue = /\b(priority|prio|due|date|deadline)\b/i;

    const isTaskIntent = hasTaskKeywords.test(cleanText) || isCreateKeywords.test(cleanText) || (isEditKeywords.test(cleanText) && hasPrioOrDue.test(cleanText));

    if (isTaskIntent) {
      let textToParse = cleanText;

      // Extract Priority
      let priority = null;
      const prioMatch = textToParse.match(/(?:priority|prio|level)?\s*[:=\s]?\s*\b(low|medium|med|high)\b(?:\s*priority)?/i);
      if (prioMatch) {
        priority = prioMatch[1].toLowerCase();
        if (priority === 'med') priority = 'medium';
        textToParse = textToParse.replace(prioMatch[0], '');
      }

      // Extract Due Date (Supports 09/09/2026, 2026-09-09, or Sept 1 2026)
      let due = null;
      const dueMatch = textToParse.match(/(?:due\s*date|deu\s*date|due|deadline|by)?\s*[:=\s]?\s*([0-9]{1,4}[\/\-][0-9]{1,2}[\/\-][0-9]{1,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s+\d{4})?|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:\s+\d{4})?)/i);

      if (dueMatch && dueMatch[1]) {
        due = dueMatch[1].trim();
        textToParse = textToParse.replace(dueMatch[0], '');
      }

      // Clean leftover system words to build the task title
      let taskTitle = textToParse
        .replace(/\b(add|create|creat|new|edit|update|change|set|modify|make|a|the|task|todo|item|priority|prio|due|date|deadline|to|for|as|on|by)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      const isUpdateAction = isEditKeywords.test(cleanText) && !isCreateKeywords.test(cleanText);

      // --- EDIT TASK ---
      if (isUpdateAction) {
        let targetTask = null;
        if (taskTitle) {
          targetTask = window.tasksArr.find(t => t.text.toLowerCase().includes(taskTitle));
        }
        if (!targetTask && window.tasksArr.length > 0) {
          targetTask = window.tasksArr[window.tasksArr.length - 1]; // Fallback to last created task
        }

        if (targetTask) {
          if (priority) targetTask.priority = priority;
          if (due) targetTask.due = due;
          window.saveTasks();
          window.renderTasks();
          if (typeof Sound !== 'undefined') Sound.taskDone();
          return `Updated '${targetTask.text}' (Priority: ${targetTask.priority}${targetTask.due ? ', Due: ' + targetTask.due : ''}), sir.`;
        }
        return `Could not find a matching task to update, sir.`;
      }

      // --- CREATE TASK ---
      if (taskTitle && typeof window.addNewTask === 'function') {
        window.addNewTask(taskTitle, priority || 'medium', due);
        return `Task '${taskTitle}' added to your board (Priority: ${priority || 'medium'}${due ? ', Due: ' + due : ''}), sir.`;
      }
    }

    // 2. Folder & Project Creation Parser
    const fileMatch = cleanText.match(/(?:create|make|build|add)\s+(?:a\s+)?(?:new\s+)?(folder|project)\s+(?:called|named\s+)?([a-z0-9_\-\s]+)/i);
    if (fileMatch) {
      const type = fileMatch[1];
      const name = fileMatch[2].trim().replace(/\s+/g, '-');
      const isProject = type === 'project';
      const res = await createVirtualItem(name, isProject);
      if (typeof window.renderFileTree === 'function') window.renderFileTree();
      return res;
    }

    return null; // Fallback to Gemini API
  };

  initDB();
})();
/* =========================================================
   DRAGGABLE DASHBOARD WIDGETS ENGINE
   ========================================================= */
(function initDraggableWidgets() {
  const container = document.getElementById('dashboard-widgets-area');
  if (!container) return;

  const widgets = Array.from(container.querySelectorAll('.hud-widget'));
  let draggedItem = null;

  // Restore saved widget order from localStorage
  const savedOrder = JSON.parse(localStorage.getItem('jarvis-widget-order') || '[]');
  if (savedOrder.length) {
    savedOrder.forEach(id => {
      const el = document.getElementById(id);
      if (el) container.appendChild(el);
    });
  }

  widgets.forEach(widget => {
    widget.addEventListener('dragstart', (e) => {
      draggedItem = widget;
      setTimeout(() => widget.classList.add('is-dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });

    widget.addEventListener('dragend', () => {
      widget.classList.remove('is-dragging');
      widgets.forEach(w => w.classList.remove('drag-over'));
      draggedItem = null;

      // Save order to LocalStorage
      const currentOrder = Array.from(container.querySelectorAll('.hud-widget')).map(w => w.id);
      localStorage.setItem('jarvis-widget-order', JSON.stringify(currentOrder));
    });

    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (widget !== draggedItem) {
        widget.classList.add('drag-over');
      }
    });

    widget.addEventListener('dragleave', () => {
      widget.classList.remove('drag-over');
    });

    widget.addEventListener('drop', (e) => {
      e.preventDefault();
      widget.classList.remove('drag-over');
      if (draggedItem && draggedItem !== widget) {
        const allWidgets = Array.from(container.querySelectorAll('.hud-widget'));
        const draggedIdx = allWidgets.indexOf(draggedItem);
        const targetIdx = allWidgets.indexOf(widget);

        if (draggedIdx < targetIdx) {
          container.insertBefore(draggedItem, widget.nextSibling);
        } else {
          container.insertBefore(draggedItem, widget);
        }
      }
    });
  });
})();
