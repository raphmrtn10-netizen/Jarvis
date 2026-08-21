/* =========================================================
   JARVIS HUD - CORE CONTROLLER
   ========================================================= */

// 1. Navigation par Onglets
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      panels.forEach(panel => {
        if (panel.id === `panel-${targetTab}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
});

// 2. Horloge Électrique
(function initElectricClock() {
  function update() {
    const timeEl = document.getElementById('electric-time');
    const ampmEl = document.getElementById('electric-ampm');
    const dateEl = document.getElementById('electric-date');
    const zoneEl = document.getElementById('electric-zone');

    if (!timeEl) return;

    const now = new Date();
    let hrs = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';

    hrs = hrs % 12 || 12;
    timeEl.textContent = `${String(hrs).padStart(2, '0')}:${mins}:${secs}`;
    if (ampmEl) ampmEl.textContent = ampm;
    
    if (dateEl) {
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      dateEl.textContent = `SYS.DATE ${day}/${month}/${now.getFullYear()}`;
    }
    
    if (zoneEl) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      zoneEl.textContent = tz.split('/')[1] || tz;
    }
  }

  setInterval(update, 1000);
  update();
})();

// 3. Glisser-déposer (Drag & Drop) des Widgets
(function initDraggableWidgets() {
  const container = document.getElementById('dashboard-widgets-area');
  if (!container) return;

  let draggedItem = null;

  container.addEventListener('dragstart', (e) => {
    const widget = e.target.closest('.hud-widget');
    if (widget) {
      draggedItem = widget;
      setTimeout(() => widget.classList.add('is-dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  container.addEventListener('dragend', (e) => {
    const widget = e.target.closest('.hud-widget');
    if (widget) {
      widget.classList.remove('is-dragging');
      container.querySelectorAll('.hud-widget').forEach(w => w.classList.remove('drag-over'));
      draggedItem = null;
    }
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const widget = e.target.closest('.hud-widget');
    if (widget && widget !== draggedItem) {
      widget.classList.add('drag-over');
    }
  });

  container.addEventListener('dragleave', (e) => {
    const widget = e.target.closest('.hud-widget');
    if (widget) {
      widget.classList.remove('drag-over');
    }
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    const widget = e.target.closest('.hud-widget');
    if (widget) {
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
    }
  });
})();

// 4. Scratchpad Storage
(function initNotepad() {
  const notepad = document.getElementById('daily-notepad');
  const status = document.getElementById('notepad-status');

  if (!notepad) return;

  notepad.value = localStorage.getItem('jarvis_notepad_content') || '';

  notepad.addEventListener('input', () => {
    localStorage.setItem('jarvis_notepad_content', notepad.value);
    if (status) {
      status.textContent = 'SAVING...';
      setTimeout(() => { status.textContent = 'SAVED'; }, 500);
    }
  });
})();
