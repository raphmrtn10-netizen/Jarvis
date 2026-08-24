// =========================================================
// J.A.R.V.I.S. SYSTEM ENGINE — APPLICATION SCRIPT
// =========================================================

let selectedVoice = null;

document.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  initTabNavigation();
  initClock();
  initInteractiveBlob();
  initDashboardDragAndDrop();
  initPomodoroTimer();
  initTaskBoard();
  initCommsFormAndSpeech();
  initWorkplaceTerminal();
  initThemeAndModal();
  initSpeechSynthesis();
});

// 1. Boot sequence
function initBootSequence() {
  const overlay = document.getElementById('boot-overlay');
  const bar = document.getElementById('boot-bar-fill');
  const log = document.getElementById('boot-log');
  const shell = document.getElementById('app-shell');
  const skipBtn = document.getElementById('boot-skip-btn');

  const logs = [
    'INITIALIZING CORE MEMORY...',
    'LOADING NEURAL NETWORKS...',
    'ESTABLISHING ENCRYPTED TELEMETRY...',
    'ALL SYSTEMS OPERATIONAL.'
  ];

  let currentLog = 0;
  const logInterval = setInterval(() => {
    if (currentLog < logs.length) {
      const line = document.createElement('div');
      line.textContent = `> ${logs[currentLog]}`;
      log.appendChild(line);
      currentLog++;
    } else {
      clearInterval(logInterval);
    }
  }, 400);

  setTimeout(() => { if (bar) bar.style.width = '100%'; }, 100);

  const completeBoot = () => {
    if (overlay) overlay.classList.add('hidden');
    if (shell) shell.classList.add('revealed');
    speakResponse("Jarvis online. Systems operational.");
  };

  setTimeout(completeBoot, 2400);
  if (skipBtn) skipBtn.addEventListener('click', completeBoot);
}

// 2. Tab Navigation
function initTabNavigation() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-panel');

      btns.forEach(b => b.setAttribute('aria-selected', 'false'));
      panels.forEach(p => p.classList.remove('active'));

      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// 3. Digital Clock
function initClock() {
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  function update() {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toTimeString().split(' ')[0];
    if (dateEl) {
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('fr-FR', options).toUpperCase();
    }
  }
  update();
  setInterval(update, 1000);
}

// 4. Interactive 3D Canvas Blob
function initInteractiveBlob() {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let time = 0;
  let mouseX = 110;
  let mouseY = 110;

  const hudCore = document.getElementById('hud-core');
  if (hudCore) {
    hudCore.addEventListener('mousemove', (e) => {
      const rect = hudCore.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
  }

  function drawBlob() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 0.04;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 55;
    const points = 12;

    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pull = Math.max(0, (80 - dist) / 80) * 12;

      const offset = Math.sin(time + i * 1.5) * 6 + Math.cos(time * 0.8 + i) * 4 + pull;
      const r = baseRadius + offset;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 70);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#4fd8e6');
    gradient.addColorStop(1, 'rgba(28, 94, 104, 0.2)');

    ctx.fillStyle = gradient;
    ctx.shadowColor = '#4fd8e6';
    ctx.shadowBlur = 20;
    ctx.fill();

    requestAnimationFrame(drawBlob);
  }

  drawBlob();
}

// 5. Improved Dashboard Grid Drag & Drop
function initDashboardDragAndDrop() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  let draggedItem = null;

  grid.querySelectorAll('.widget').forEach(widget => {
    widget.addEventListener('dragstart', (e) => {
      draggedItem = widget;
      widget.classList.add('dragging-widget');
      e.dataTransfer.effectAllowed = 'move';
    });

    widget.addEventListener('dragend', () => {
      widget.classList.remove('dragging-widget');
      draggedItem = null;
    });

    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    widget.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== widget) {
        const children = Array.from(grid.children);
        const draggedIndex = children.indexOf(draggedItem);
        const targetIndex = children.indexOf(widget);

        if (draggedIndex < targetIndex) {
          grid.insertBefore(draggedItem, widget.nextSibling);
        } else {
          grid.insertBefore(draggedItem, widget);
        }
      }
    });
  });
}

// 6. Focus Cycle Pomodoro Timer
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
            speakResponse("Focus cycle complete.");
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

// 7. Task Management Engine
function initTaskBoard() {
  const form = document.getElementById('task-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('task-input-text');
      const priority = document.getElementById('task-input-priority').value;
      if (input && input.value.trim()) {
        addNewTask(input.value.trim(), priority);
        input.value = '';
      }
    });
  }
}

function addNewTask(title, priority = 'medium') {
  const list = document.getElementById('list-todo');
  if (!list) return;

  const item = document.createElement('li');
  item.className = 'kanban-item';
  item.innerHTML = `
    <span>${title}</span>
    <span class="badge ${priority}">${priority.toUpperCase()}</span>
  `;
  list.appendChild(item);

  const countEl = document.getElementById('count-todo');
  if (countEl) countEl.textContent = list.children.length;
}

// 8. Comms Form, Natural Command Parser & Speech Recognition
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

      appendChatMessage('user', msg);
      input.value = '';

      processCommsCommand(msg);
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
        micBtn.classList.add('recording');
        if (micText) micText.textContent = 'LISTENING...';
      } catch (err) {
        recognition.stop();
      }
    });

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (input) input.value = transcript;
    };

    recognition.onend = () => {
      micBtn.classList.remove('recording');
      if (micText) micText.textContent = 'MIC';
    };
  }
}

// Process Comms Commands dynamically
function processCommsCommand(rawInput) {
  const text = rawInput.toLowerCase();

  // Task Creation Command Pattern
  if (text.includes('task') && (text.includes('creat') || text.includes('create') || text.includes('add'))) {
    let taskTitle = rawInput.replace(/(creat|create|add)\s+task\s+/i, '');
    let priority = 'medium';

    if (text.includes('priority:high') || text.includes('high priority')) priority = 'high';
    if (text.includes('priority:low') || text.includes('low priority')) priority = 'low';

    // Strip parameters for title
    taskTitle = taskTitle.replace(/priority:\w+/gi, '').replace(/deadline:[\d\/]+/gi, '').trim();
    if (!taskTitle) taskTitle = 'New Directive Task';

    addNewTask(taskTitle, priority);
    const reply = `Task "${taskTitle}" successfully created and added to the Task Board.`;
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // Folder Creation Command Pattern
  if (text.includes('folder') && (text.includes('creat') || text.includes('create') || text.includes('mkdir'))) {
    const folderName = rawInput.replace(/(creat|create|mkdir)\s+folder\s+/i, '').trim() || 'New_Folder';
    executeWorkspaceCommand(`mkdir ${folderName}`);
    const reply = `Directory /${folderName} created in Workplace files.`;
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // File Creation Command Pattern
  if (text.includes('file') && (text.includes('creat') || text.includes('create') || text.includes('touch'))) {
    const fileName = rawInput.replace(/(creat|create|touch)\s+file\s+/i, '').trim() || 'script.js';
    executeWorkspaceCommand(`touch ${fileName}`);
    const reply = `File ${fileName} created in Workplace files.`;
    appendChatMessage('jarvis', reply);
    speakResponse(reply);
    return;
  }

  // Default Fallback Command Processing
  const reply = `Acknowledged operative. Processing routine executed for: "${rawInput}"`;
  appendChatMessage('jarvis', reply);
  speakResponse(reply);
}

function appendChatMessage(sender, text) {
  const log = document.getElementById('chat-log');
  if (!log) return;

  const emptyMsg = log.querySelector('.chat-empty');
  if (emptyMsg) emptyMsg.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${sender}`;
  msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
  log.appendChild(msgDiv);
  log.scrollTop = log.scrollHeight;
}

// 9. Workplace Terminal Execution
function initWorkplaceTerminal() {
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
  const parts = cmdStr.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  const treeList = document.getElementById('fs-root-list');

  switch (command) {
    case 'mkdir':
      if (treeList && args) {
        const li = document.createElement('li');
        li.className = 'fs-item folder';
        li.textContent = `📁 /${args}`;
        treeList.appendChild(li);
        appendTerminalLog(`Created directory: /${args}`, 'success');
      }
      break;

    case 'touch':
    case 'create':
      if (treeList && args) {
        const li = document.createElement('li');
        li.className = 'fs-item file';
        li.textContent = `📄 ${args}`;
        treeList.appendChild(li);
        appendTerminalLog(`Created file: ${args}`, 'success');
      }
      break;

    case 'clear':
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
      break;

    case 'help':
      appendTerminalLog('Available commands: mkdir <dir>, touch <file>, clear, help', 'sys-msg');
      break;

    default:
      appendTerminalLog(`Command not recognized: '${command}'.`, 'sys-msg');
      break;
  }
}

// 10. Masculine Voice Synthesis
function initSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;

  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    // Search for masculine voice candidates
    selectedVoice = voices.find(v => 
      v.name.includes('David') || 
      v.name.includes('Mark') || 
      v.name.includes('George') || 
      v.name.includes('Google US English') ||
      v.name.toLowerCase().includes('male')
    ) || voices[0];

    const label = document.getElementById('voice-name-label');
    if (label && selectedVoice) label.textContent = selectedVoice.name;
  }

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;

  const testBtn = document.getElementById('btn-test-voice');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      speakResponse("Voice synthesis check online. Masculine profile active.");
    });
  }
}

function speakResponse(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // Stop prior audio playback
  const utterance = new SpeechSynthesisUtterance(text);

  const pitchInput = document.getElementById('sys-voice-pitch');
  const speedInput = document.getElementById('sys-voice-speed');

  utterance.pitch = pitchInput ? parseFloat(pitchInput.value) : 0.8;
  utterance.rate = speedInput ? parseFloat(speedInput.value) : 1.0;

  if (selectedVoice) utterance.voice = selectedVoice;

  window.speechSynthesis.speak(utterance);
}

// 11. Settings & Modal Handler
function initThemeAndModal() {
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const theme = swatch.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', theme);
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-settings-toggle');
  const closeBtn = document.getElementById('btn-modal-close');
  const saveBtn = document.getElementById('btn-modal-save');
  const apiKeyInput = document.getElementById('api-key-input');

  const savedKey = localStorage.getItem('jarvis_api_key');
  if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.add('open'));
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (saveBtn && apiKeyInput && modal) {
    saveBtn.addEventListener('click', () => {
      localStorage.setItem('jarvis_api_key', apiKeyInput.value.trim());
      modal.classList.remove('open');
    });
  }
}
