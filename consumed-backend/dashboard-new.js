// Bulk dashboard implementation for consumed-backend

const bulkDashboardCSS = `
/* BULK CONTROLS */
.bulk-controls{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:24px}
.bulk-controls h3{margin:0 0 12px 0;font-size:16px}
.bulk-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.bulk-btn{padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;color:#333;cursor:pointer;font-size:14px}
.bulk-btn.primary{background:#007bff;color:#fff;border-color:#007bff}
.bulk-btn.danger{background:#dc3545;color:#fff;border-color:#dc3545}
.bulk-btn:hover{background:#f8f9fa}
.bulk-btn.primary:hover{background:#0056b3}
.bulk-btn.danger:hover{background:#c82333}
.status-summary{font-size:14px;color:#666;margin-left:auto}

/* Save status indicator */
.save-status{position:fixed;top:20px;right:20px;padding:8px 12px;border-radius:4px;font-size:12px;opacity:0;transition:opacity 0.3s}
.save-status.show{opacity:1}
.save-status.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb}
.save-status.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb}
`;

const bulkControlsHTML = `
  <div class="bulk-controls">
    <h3>Bulk Actions</h3>
    <div class="bulk-actions">
      <button class="bulk-btn primary" onclick="bulkSetPublic()">Mark All Public</button>
      <button class="bulk-btn" onclick="bulkSetPrivate()">Mark All Private</button>
      <button class="bulk-btn" onclick="bulkSaveNotes()">Save All Notes</button>
      <span class="status-summary">
        <span id="public-count">0</span> public,
        <span id="private-count">0</span> private,
        <span id="total-count">0</span> total
      </span>
    </div>
  </div>

  <div class="save-status" id="save-status"></div>
`;

const bulkControlsJS = `
    // Bulk action functions
    function bulkSetPublic() {
      const toggles = document.querySelectorAll('.public-toggle');
      toggles.forEach(toggle => {
        if (!toggle.checked) {
          toggle.checked = true;
          updateEntry(toggle.dataset.id, true, null);
        }
      });
      updateStatusSummary();
      showStatus('All entries marked as public', 'success');
    }

    function bulkSetPrivate() {
      const toggles = document.querySelectorAll('.public-toggle');
      toggles.forEach(toggle => {
        if (toggle.checked) {
          toggle.checked = false;
          updateEntry(toggle.dataset.id, false, null);
        }
      });
      updateStatusSummary();
      showStatus('All entries marked as private', 'success');
    }

    function bulkSaveNotes() {
      const textareas = document.querySelectorAll('.entry-notes textarea');
      let saved = 0;
      textareas.forEach(textarea => {
        if (textarea.value.trim()) {
          updateEntry(textarea.dataset.id, null, textarea.value);
          saved++;
        }
      });
      showStatus(\`Saved notes for \${saved} entries\`, 'success');
    }

    // Individual entry updates
    function updateEntry(id, isPublic, notes) {
      const payload = {};
      if (isPublic !== null) payload.is_public = isPublic;
      if (notes !== null) payload.notes = notes;

      fetch(\`/api/entries/\${id}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.error('Failed to update entry:', err);
        showStatus('Failed to save changes', 'error');
      });
    }

    // Auto-save notes on blur (enhanced version)
    function setupNotesAutoSave() {
      document.addEventListener('blur', async (e) => {
        if (e.target.matches('.entry-notes textarea')) {
          const id = e.target.dataset.id;
          const notes = e.target.value;
          try {
            updateEntry(id, null, notes);
            if (notes.trim()) {
              showStatus('Notes auto-saved', 'success');
            }
          } catch (err) {
            console.error('Failed to save notes:', err);
            showStatus('Failed to save notes', 'error');
          }
        }
      }, true);
    }

    // Toggle change handlers
    function setupToggleHandlers() {
      document.addEventListener('change', (e) => {
        if (e.target.matches('.public-toggle')) {
          updateEntry(e.target.dataset.id, e.target.checked, null);
          updateStatusSummary();
        }
      });
    }

    // Status summary
    function updateStatusSummary() {
      const toggles = document.querySelectorAll('.public-toggle');
      const publicCount = Array.from(toggles).filter(t => t.checked).length;
      const totalCount = toggles.length;
      const privateCount = totalCount - publicCount;

      document.getElementById('public-count').textContent = publicCount;
      document.getElementById('private-count').textContent = privateCount;
      document.getElementById('total-count').textContent = totalCount;
    }

    // Save status feedback
    function showStatus(message, type) {
      const status = document.getElementById('save-status');
      status.textContent = message;
      status.className = \`save-status show \${type}\`;
      setTimeout(() => {
        status.className = 'save-status';
      }, 3000);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
      setupToggleHandlers();
      setupNotesAutoSave();
      updateStatusSummary();
    });
`;

module.exports = {
  bulkDashboardCSS,
  bulkControlsHTML,
  bulkControlsJS
};