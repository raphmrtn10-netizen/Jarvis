// =========================================================
// J.A.R.V.I.S. SYSTEM ENGINE — APPLICATION SCRIPT
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  initBootSequence();
  initTabNavigation();
  initClock();
  initInteractiveBlob();
  initDashboardDragAndDrop();
  initPomodoroTimer();
  initCommsFormAndSpeech();
  initWorkplaceTerminal();
  initThemeAndModal();
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

// 3. Digital Clock Telemetry
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

// 4. Interactive 3D Canvas Blob Rendering
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
      
      // Calculate mouse displacement distortion
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pull = Math.max(0, (80 - dist) / 80) * 12;

      const offset = Math.sin(time + i * 1.5) * 6 + Math.cos(time * 0.8 + i) * 4 + pull;
      const r = baseRadius + offset;
      
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    // Futuristic Cyan Gradient & Glow
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

// 5. Safe Dashboard Widget Drag-and-Drop
function initDashboardDragAndDrop() {
  const container = document.getElementById('dashboard-grid');
  if (!container) return;

  let draggedWidget = null;

  container.addEventListener('dragstart', (e) => {
    const widget = e.target.closest('.widget');
    if (!widget) return;
    draggedWidget = widget;
    widget.classList.add('dragging-widget');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', (e) => {
    const widget = e.target.closest('.widget');
    if (widget) widget.classList.remove('dragging-widget');
    draggedWidget = null;
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedWidget) return;

    const targetWidget = e.target.closest('.widget');
    if (targetWidget && targetWidget !== draggedWidget) {
      const rect = targetWidget.getBoundingClientRect();
      const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      container.insertBefore(draggedWidget, next ? targetWidget.nextSibling : targetWidget);
    }
  });
}

// 6. Pomodoro Focus Timer
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

// 7. Comms Form (Prevent Page Refresh) & Speech Mic Handler
function initCommsFormAndSpeech() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const log = document.getElementById('chat-log');
  const micBtn = document.getElementById('btn-mic');
  const micText = document.getElementById('mic-text');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault(); // Prevents page reload
      const msg = input.value.trim();
      if (!msg) return;

      appendChatMessage('user', msg);
      input.value = '';

      // Simulated Response
      setTimeout(() => {
        appendChatMessage('jarvis', `Acknowledged operative. Executing processing routine for: "${msg}"`);
      }, 600);
    });
  }

  // Web Speech API Voice Recognition
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
  } else if (micBtn) {
    micBtn.addEventListener('click', () => {
      alert('Speech Recognition is not supported on this browser context.');
    });
  }
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

// 8. Workplace Terminal Execution Logic
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
      if (!args) {
        appendTerminalLog('Error: Specify directory name.', 'sys-msg');
      } else {
        if (treeList) {
          const li = document.createElement('li');
          li.className = 'fs-item folder';
          li.textContent = `📁 /${args}`;
          treeList.appendChild(li);
        }
        appendTerminalLog(`Created directory: /${args}`, 'success');
      }
      break;

    case 'touch':
    case 'create':
      if (!args) {
        appendTerminalLog('Error: Specify file name.', 'sys-msg');
      } else {
        if (treeList) {
          const li = document.createElement('li');
          li.className = 'fs-item file';
          li.textContent = `📄 ${args}`;
          treeList.appendChild(li);
        }
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
      appendTerminalLog(`Command not recognized: '${command}'. Type 'help' for options.`, 'sys-msg');
      break;
  }
}

// 9. Theme & Modal Controls with Local Storage Persistence
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

  // Load existing key
  const savedKey = localStorage.getItem('jarvis_api_key');
  if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('open');
      if (apiKeyInput) apiKeyInput.focus();
    });
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
