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

      // Maj boutons
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Maj panneaux
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

  const widgets = Array.from(container.querySelectorAll('.hud-widget'));
  let draggedItem = null;

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
    });

    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
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
