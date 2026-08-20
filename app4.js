/* =========================================================
   J.A.R.V.I.S. INTERFACE — APPLICATION LOGIC
   Organized by feature. Each section is self-contained so
   you can delete a whole block if you don't want that feature.
   ========================================================= */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   1. SOUND ENGINE
   Synthesized tones via Web Audio API — no external audio
   files needed. All other features call playTone()/playChime().
   ========================================================= */
const Sound = (() => {
  let ctx = null;
  let enabled = false; // starts off; user opts in (also avoids autoplay restrictions)

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
      const div = document.createElement('div');
      div.textContent = `> ${text}`;
      log.appendChild(div);
    }, i * 420);
  });

  requestAnimationFrame(() => { barFill.style.width = '100%'; });

  const bootTimer = setTimeout(finishBoot, 2300);
  skipBtn.addEventListener('click', () => { clearTimeout(bootTimer); finishBoot(); });
})();

/* =========================================================
   3. PARTICLE FIELD
   Faint drifting dots on a full-screen canvas behind the UI.
   ========================================================= */
(function particles(){
  const canvas = document.getElementById('particle-field');
  if (reducedMotion){ canvas.remove(); return; }
  const ctx = canvas.getContext('2d');
  let w, h, particlesArr;

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  function makeParticles(){
    const count = Math.floor((w * h) / 22000);
    particlesArr = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.4 + 0.1
    }));
  }
  function tick(){
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(79, 216, 230, 1)';
    particlesArr.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', () => { resize(); makeParticles(); });
  resize(); makeParticles(); tick();
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
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
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
    timeEl.textContent = now.toLocaleTimeString([], { hour12: false });
    dateEl.textContent = now.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
    zoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  tick();
  setInterval(tick, 1000);
})();

/* =========================================================
   6. WEATHER WIDGET (Open-Meteo — free, no API key required)
   ========================================================= */
(function weather(){
  const locEl = document.getElementById('weather-loc');
  const tempEl = document.getElementById('weather-temp');
  const condEl = document.getElementById('weather-cond');

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
      () => fetchWeather(51.5074, -0.1278, 'London (default)'), // fallback if permission denied
      { timeout: 6000 }
    );
  } else {
    fetchWeather(51.5074, -0.1278, 'London (default)');
  }
})();

/* =========================================================
   7. TASKS PANEL (in-memory — resets on page reload)
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
      // migrate older saved records (pre-priority/due-date, or pre-kanban) safely
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
    catch(err){ /* storage unavailable — tasks won't persist this session */ }
  }

  let tasksArr = load();
  let nextId = tasksArr.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  let draggedId = null;

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

  function formatDue(dateStr){
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  function isOverdue(dateStr){
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(dateStr + 'T00:00:00') < today;
  }

  function render(){
    STATUSES.forEach(status => {
      const items = tasksArr.filter(t => t.status === status);
      lists[status].innerHTML = '';
      emptyMsgs[status].style.display = items.length ? 'none' : 'block';
      counts[status].textContent = items.length;

      items.forEach(task => {
        const idx = STATUSES.indexOf(status);
        const li = document.createElement('li');
        li.className = 'kanban-card';
        li.draggable = true;

        const metaBits = [`<span class="priority-badge ${task.priority}">${task.priority}</span>`];
        if (task.due){
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
            <button class="card-del" aria-label="Delete task">✕</button>
          </div>
        `;
        li.querySelector('.card-text').textContent = task.text;

        const backBtn = li.querySelector('.move-back');
        const fwdBtn = li.querySelector('.move-fwd');
        backBtn.disabled = idx === 0;
        fwdBtn.disabled = idx === STATUSES.length - 1;
        backBtn.addEventListener('click', () => moveTaskByStep(task, -1));
        fwdBtn.addEventListener('click', () => moveTaskByStep(task, 1));

        li.querySelector('.card-del').addEventListener('click', () => {
          tasksArr = tasksArr.filter(t => t.id !== task.id);
          save();
          render();
        });

        // ---- Drag and drop (desktop) ----
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

    const total = tasksArr.length;
    const done = tasksArr.filter(t => t.status === 'done').length;
    summary.textContent = total ? `${total} total · ${done} completed` : '';
  }

  // Column drop zones — set up once, columns themselves are static
  columnEls.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault(); // required to allow dropping
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = Number(e.dataTransfer.getData('text/plain')) || draggedId;
      const task = tasksArr.find(t => t.id === id);
      if (task) moveTask(task, col.dataset.status);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    tasksArr.push({
      id: nextId++,
      text,
      status: 'todo',
      priority: priorityInput.value,
      due: dueInput.value || null
    });
    input.value = '';
    dueInput.value = '';
    priorityInput.value = 'medium';
    Sound.click();
    save();
    render();
  });

  // Category tabs — switch the single visible column on small screens
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      tabButtons.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      kanban.dataset.active = btn.dataset.status;
    });
  });

  render();
})();

/* =========================================================
   8. SYSTEMS PANEL — live device diagnostics
   ========================================================= */
(function systems(){
  const battery = document.getElementById('sys-battery');
  const charging = document.getElementById('sys-charging');
  const online = document.getElementById('sys-online');
  const connType = document.getElementById('sys-conn-type');
  const resolution = document.getElementById('sys-resolution');
  const platform = document.getElementById('sys-platform');

  // Battery (Chrome/Edge only — feature detect gracefully)
  if ('getBattery' in navigator){
    navigator.getBattery().then(b => {
      function update(){
        battery.textContent = `${Math.round(b.level * 100)}%`;
        charging.textContent = b.charging ? 'Yes' : 'No';
      }
      update();
      b.addEventListener('levelchange', update);
      b.addEventListener('chargingchange', update);
    });
  } else {
    battery.textContent = 'Not supported';
    charging.textContent = '—';
  }

  // Online/offline
  function updateOnline(){ online.textContent = navigator.onLine ? 'Online' : 'Offline'; }
  updateOnline();
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);

  // Connection type (Chrome/Edge only)
  connType.textContent = navigator.connection?.effectiveType || 'Unavailable';

  // Display + platform
  resolution.textContent = `${window.screen.width}×${window.screen.height}`;
  platform.textContent = navigator.platform || navigator.userAgentData?.platform || 'Unknown';
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
    soundToggle.classList.toggle('on', on);
    soundToggle.setAttribute('aria-pressed', on);
    muteHeaderBtn.classList.toggle('active', on);
    if (on) Sound.click();
  }
  function setVoice(on){
    voiceReplyEnabled = on;
    voiceToggle.classList.toggle('on', on);
    voiceToggle.setAttribute('aria-pressed', on);
    // hands-free needs spoken replies to know when to listen again
    if (!on && handsFreeEnabled) setHandsFree(false);
  }
  function setHandsFree(on){
    handsFreeEnabled = on;
    handsFreeToggle.classList.toggle('on', on);
    handsFreeToggle.setAttribute('aria-pressed', on);
    handsFreeHint.style.display = on ? 'block' : 'none';
    if (on && !voiceReplyEnabled) setVoice(true); // loop requires voice replies on
  }

  soundToggle.addEventListener('click', () => setSound(!Sound.isEnabled()));
  muteHeaderBtn.addEventListener('click', () => setSound(!Sound.isEnabled()));
  voiceToggle.addEventListener('click', () => setVoice(!voiceReplyEnabled));
  handsFreeToggle.addEventListener('click', () => setHandsFree(!handsFreeEnabled));
})();

/* =========================================================
   11. SETTINGS MODAL (Google Gemini API key entry)
   The key is saved to this browser's localStorage so you don't
   have to re-enter it every visit. It is never sent anywhere
   except directly to Google's Generative Language API.
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
      chatHint.style.display = 'none';
      sysApiStatus.textContent = 'Key saved in this browser';
    } else {
      chatHint.style.display = 'block';
      sysApiStatus.textContent = 'Not set';
    }
  }

  function open(){ modal.classList.add('open'); input.value = apiKey; input.focus(); }
  function close(){ modal.classList.remove('open'); }

  openBtns.forEach(btn => btn && btn.addEventListener('click', open));
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  saveBtn.addEventListener('click', () => {
    apiKey = input.value.trim();
    Sound.click();
    if (apiKey){
      localStorage.setItem(GEMINI_KEY_STORAGE, apiKey);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    refreshStatusUI();
    close();
  });

  refreshStatusUI(); // reflect any key already saved from a previous visit
})();

/* =========================================================
   12. COMMS PANEL — chat with Claude + voice in/out
   ========================================================= */
(function comms(){
  const chatLog = document.getElementById('chat-log');
  const chatEmpty = document.getElementById('chat-empty');
  const form = document.getElementById('command-form');
  const input = document.getElementById('command-input');
  const micBtn = document.getElementById('mic-btn');
  const hudCore = document.getElementById('hud-core');
  const hudStatus = document.getElementById('hud-status');

  let history = []; // Gemini format: { role: 'user'|'model', parts: [{ text: string }] }

  function addMessage(who, text){
    chatEmpty.style.display = 'none';
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    const label = who === 'user' ? 'YOU' : who === 'jarvis' ? 'JARVIS' : 'SYSTEM';
    div.innerHTML = `<div class="who">${label}</div><div class="bubble"></div>`;
    div.querySelector('.bubble').textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function setHudState(state){
    hudCore.classList.remove('listening', 'thinking');
    if (state) hudCore.classList.add(state);
    hudStatus.textContent = state === 'listening' ? 'LISTENING'
      : state === 'thinking' ? 'THINKING'
      : 'READY';
  }

  async function sendToGemini(userText){
    if (!apiKey){
      addMessage('system', 'No API key set. Open Settings (gear icon) and add your Google AI Studio API key to enable live responses.');
      return;
    }
    history.push({ role: 'user', parts: [{ text: userText }] });
    setHudState('thinking');
    try{
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      if (voiceReplyEnabled) speak(reply);
    }catch(err){
      addMessage('system', `Error: ${err.message}`);
      Sound.error();
    }finally{
      setHudState(null);
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    Sound.send();
    input.value = '';
    sendToGemini(text);
  });

  /* ---- Voice input (Web Speech API) ---- */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizing = false;
  let recognizer = null;

  if (SpeechRecognition){
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
        userStoppedMic = true; // manual stop always breaks the hands-free loop
        recognizer.stop();
        return;
      }
      Sound.click();
      userStoppedMic = false;
      recognizer.start();
    });
  } else {
    micBtn.disabled = true;
    micBtn.title = 'Voice input not supported in this browser';
  }

  let userStoppedMic = false;

  /* ---- Voice output (Speech Synthesis) ---- */
  function speak(text){
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 0.9;
    // Hands-free loop: once JARVIS finishes talking, start listening again
    // automatically — unless the user manually stopped the mic.
    utter.onend = () => {
      if (handsFreeEnabled && recognizer && !recognizing && !userStoppedMic){
        recognizer.start();
      }
    };
    window.speechSynthesis.speak(utter);
  }
})();
