/**
 * Paste-Your-Own HTML/CSS Sandboxed Inspector Modal
 * Allows developers to test real-world markup by extracting live bounding boxes
 * via sandboxed srcdoc iframe and reassigning semantic roles before running the simulation.
 */

import { STARTER_SNIPPETS, extractLayoutFromHTML, ExtractedLayout } from '../import/htmlExtractor.ts';
import { ElementRole } from '../engine/biomechanics.ts';

export interface HTMLImportModalCallbacks {
  onLoadLayout: (layout: ExtractedLayout) => void;
  onClose: () => void;
}

export function openHTMLImportModal(callbacks: HTMLImportModalCallbacks): void {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'html-import-modal-overlay';
  modalContainer.className = 'modal-backdrop';

  let currentLayout: ExtractedLayout | null = null;

  modalContainer.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-import-heading">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">📋</span>
          <h2 id="modal-import-heading">Paste Your Own HTML/CSS Inspector</h2>
        </div>
        <button id="btn-modal-close" class="btn-close" aria-label="Close modal">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-intro">
          Zero-crash sandboxed DOM extraction. Paste custom HTML/CSS or choose a starter template.
          Elements are isolated inside <code>&lt;iframe sandbox="allow-same-origin" srcdoc&gt;</code> without script execution.
        </p>

        <!-- Starter selector -->
        <div class="starter-select-row">
          <label for="sel-starter">Load Starter Snippet:</label>
          <select id="sel-starter" class="select-dropdown" aria-label="Load Starter Snippet">
            <option value="">-- Choose a starter --</option>
            ${STARTER_SNIPPETS.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>

        <!-- HTML Textarea -->
        <div class="editor-row">
          <label for="inp-custom-html">HTML / CSS Markup:</label>
          <textarea id="inp-custom-html" class="code-textarea" rows="8" placeholder="Paste your HTML markup here..."></textarea>
        </div>

        <button id="btn-extract-dom" class="btn-secondary">
          🔍 Inspect & Extract Bounding Boxes
        </button>

        <!-- Extracted Elements & Role Override Table -->
        <div id="extraction-results" class="extraction-results-section" style="display:none;">
          <h3>Extracted Interactive Elements (<span id="extracted-count">0</span>)</h3>
          <div class="table-scroll-wrapper">
            <table class="role-override-table">
              <thead>
                <tr>
                  <th>Element Label</th>
                  <th>Dimensions (WxH)</th>
                  <th>Position (X, Y)</th>
                  <th>Inferred Semantic Role</th>
                </tr>
              </thead>
              <tbody id="extracted-table-body">
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="btn-cancel" class="btn-ghost">Cancel</button>
        <button id="btn-load-into-studio" class="btn-primary-action" disabled>
          Load Layout Into Studio & Run Swarm
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const selStarter = modalContainer.querySelector('#sel-starter') as HTMLSelectElement;
  const txtHtml = modalContainer.querySelector('#inp-custom-html') as HTMLTextAreaElement;
  const btnExtract = modalContainer.querySelector('#btn-extract-dom') as HTMLButtonElement;
  const btnLoad = modalContainer.querySelector('#btn-load-into-studio') as HTMLButtonElement;
  const btnClose = modalContainer.querySelector('#btn-modal-close') as HTMLButtonElement;
  const btnCancel = modalContainer.querySelector('#btn-cancel') as HTMLButtonElement;
  const resultsSection = modalContainer.querySelector('#extraction-results') as HTMLElement;
  const countSpan = modalContainer.querySelector('#extracted-count') as HTMLElement;
  const tableBody = modalContainer.querySelector('#extracted-table-body') as HTMLElement;

  // Auto-populate starter 1
  txtHtml.value = STARTER_SNIPPETS[0].html;

  selStarter.addEventListener('change', () => {
    const s = STARTER_SNIPPETS.find(item => item.id === selStarter.value);
    if (s) txtHtml.value = s.html;
  });

  const closeModal = () => {
    if (modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
    }
    callbacks.onClose();
  };

  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  btnExtract.addEventListener('click', async () => {
    btnExtract.disabled = true;
    btnExtract.innerText = 'Extracting...';

    try {
      const layout = await extractLayoutFromHTML(txtHtml.value, document.body);
      currentLayout = layout;

      tableBody.innerHTML = '';
      countSpan.innerText = `${layout.elements.length}`;

      layout.elements.forEach((el, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${el.label}</strong> <span class="tag-id">#${el.id}</span></td>
          <td class="font-mono">${el.rect.width} × ${el.rect.height}px</td>
          <td class="font-mono">(${el.rect.x}, ${el.rect.y})</td>
          <td>
            <select class="role-override-select" data-idx="${idx}">
              <option value="anchor" ${el.role === 'anchor' ? 'selected' : ''}>Anchor (Source)</option>
              <option value="primary" ${el.role === 'primary' ? 'selected' : ''}>Primary (Target)</option>
              <option value="destructive" ${el.role === 'destructive' ? 'selected' : ''}>Destructive (Hazard)</option>
              <option value="neutral" ${el.role === 'neutral' ? 'selected' : ''}>Neutral</option>
            </select>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // Role change listeners
      tableBody.querySelectorAll('.role-override-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          const idx = parseInt(target.dataset.idx || '0', 10);
          if (currentLayout) {
            currentLayout.elements[idx].role = target.value as ElementRole;
          }
        });
      });

      resultsSection.style.display = 'block';
      btnLoad.disabled = layout.elements.length === 0;
    } catch (err: any) {
      alert(`DOM extraction error: ${err.message}`);
    } finally {
      btnExtract.disabled = false;
      btnExtract.innerText = '🔍 Inspect & Extract Bounding Boxes';
    }
  });

  btnLoad.addEventListener('click', () => {
    if (currentLayout && currentLayout.elements.length > 0) {
      callbacks.onLoadLayout(currentLayout);
      closeModal();
    }
  });
}
