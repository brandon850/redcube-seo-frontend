import { allChecklist, currentSiteId, checklistPage, CHECKLIST_PER_PAGE } from './state.js';
import { setAllChecklist, setChecklistPage } from './state.js';
import { toast, apiFetch, fmtDate } from './utils.js';

export async function loadSiteChecklist(siteId) {
  const res = await apiFetch('/admin/sites/' + siteId + '/checklist');
  if (!res) return;
  setAllChecklist((await res.json()).items || []);
  renderChecklist(allChecklist);
  updateChecklistProgress();
}

export function renderChecklist(items) {
  const container = document.getElementById('checklist-container');
  if (!items.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">✓</div><div class="empty-title">No checklist items</div><div class="empty-sub">Run an audit to generate a prioritized list of improvements.</div></div>`;
    updateChecklistProgress();
    return;
  }

  const totalPages = Math.ceil(items.length / CHECKLIST_PER_PAGE);
  const curPage    = Math.min(checklistPage, totalPages);
  setChecklistPage(curPage);
  const start     = (curPage - 1) * CHECKLIST_PER_PAGE;
  const pageItems = items.slice(start, start + CHECKLIST_PER_PAGE);

  const groups = {};
  pageItems.forEach(item => {
    const g = item.category || 'General';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  container.innerHTML = Object.entries(groups).map(([group, groupItems]) => `
    <div class="checklist-group">
      <div class="checklist-group-title">${group}</div>
      ${groupItems.map(item => `
        <div class="checklist-item ${item.done?'done':''} ${item.ignored?'ignored':''}"
             id="ci-${item.id}" style="${item.ignored?'opacity:.35':''}">
          <div class="ci-check" onclick="toggleChecklistItem('${item.id}')">✓</div>
          <div class="ci-body">
            <div class="ci-text">
              ${item.text}
              <span class="ci-priority priority-${item.priority||'med'}">${item.priority||'med'}</span>
            </div>
            ${item.page_url ? `<div class="ci-meta">Page: ${item.page_url}</div>` : ''}
            ${item.done && item.completed_at ? `<div class="ci-meta">Completed ${fmtDate(item.completed_at)}</div>` : ''}
            ${item.ignored ? `<div class="ci-meta" style="color:var(--g2)">Ignored — won't reappear after next audit</div>` : ''}
          </div>
          <button class="action-btn ${item.ignored?'':'danger'}"
            onclick="toggleIgnoreItem('${item.id}',${!item.ignored})"
            style="flex-shrink:0;font-size:.6rem;padding:.25rem .55rem">
            ${item.ignored ? 'Unignore' : 'Ignore'}
          </button>
        </div>`).join('')}
    </div>`).join('');

  if (totalPages > 1) {
    container.insertAdjacentHTML('beforeend', `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--b3)">
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--g3)">
          Showing ${start+1}–${Math.min(start+CHECKLIST_PER_PAGE,items.length)} of ${items.length} items
        </div>
        <div style="display:flex;align-items:center;gap:.4rem">
          <button class="action-btn" onclick="goChecklistPage(1)" ${curPage===1?'disabled':''}>«</button>
          <button class="action-btn" onclick="goChecklistPage(${curPage-1})" ${curPage===1?'disabled':''}>‹</button>
          ${Array.from({length:totalPages},(_,i)=>i+1)
            .filter(p=>p===1||p===totalPages||Math.abs(p-curPage)<=2)
            .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push('…');acc.push(p);return acc;},[])
            .map(p=>p==='…'
              ?`<span style="font-size:.65rem;color:var(--g2);padding:0 .25rem">…</span>`
              :`<button class="action-btn" onclick="goChecklistPage(${p})"
                  style="${p===curPage?'border-color:var(--red);color:var(--red)':''}">${p}</button>`
            ).join('')}
          <button class="action-btn" onclick="goChecklistPage(${curPage+1})" ${curPage===totalPages?'disabled':''}>›</button>
          <button class="action-btn" onclick="goChecklistPage(${totalPages})" ${curPage===totalPages?'disabled':''}>»</button>
        </div>
      </div>`);
  }

  updateChecklistProgress();
}

export function updateChecklistProgress() {
  const total   = allChecklist.length;
  const done    = allChecklist.filter(c => c.done).length;
  const pending = total - done;
  document.getElementById('checklist-progress-label').textContent =
    total ? `${done} of ${total} complete — ${pending} remaining` : 'No items';
}

export function goChecklistPage(page) {
  setChecklistPage(page);
  const f = document.getElementById('checklist-filter')?.value || '';
  let filtered = [...allChecklist];
  if (f === 'pending') filtered = filtered.filter(c => !c.done);
  if (f === 'done')    filtered = filtered.filter(c =>  c.done);
  if (f === 'high')    filtered = filtered.filter(c => c.priority === 'high');
  if (f === 'ignored') filtered = filtered.filter(c => c.ignored);
  renderChecklist(filtered);
  document.getElementById('tab-checklist')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

export function filterChecklist() {
  setChecklistPage(1);
  const f = document.getElementById('checklist-filter').value;
  let filtered = [...allChecklist];
  if (f === 'pending') filtered = filtered.filter(c => !c.done);
  if (f === 'done')    filtered = filtered.filter(c =>  c.done);
  if (f === 'high')    filtered = filtered.filter(c => c.priority === 'high');
  if (f === 'ignored') filtered = filtered.filter(c => c.ignored);
  renderChecklist(filtered);
}

export async function toggleChecklistItem(itemId) {
  const item = allChecklist.find(c => c.id === itemId);
  if (!item) return;
  item.done         = !item.done;
  item.completed_at = item.done ? new Date().toISOString() : null;
  const el = document.getElementById('ci-' + itemId);
  if (el) el.classList.toggle('done', item.done);
  updateChecklistProgress();
  await apiFetch('/admin/checklist/' + itemId, {
    method: 'PATCH',
    body: JSON.stringify({ done: item.done }),
  });
}

export async function toggleIgnoreItem(itemId, ignored) {
  const item = allChecklist.find(c => c.id === itemId);
  if (!item) return;
  item.ignored = ignored;
  const el = document.getElementById('ci-' + itemId);
  if (el) el.style.opacity = ignored ? '.35' : '1';
  await apiFetch('/admin/checklist/' + itemId + '/ignore', {
    method: 'PATCH',
    body: JSON.stringify({ ignored }),
  });
  toast(ignored ? "Item ignored — won't reappear after next audit" : 'Item unignored');
}

export async function clearCompletedTasks() {
  const doneCount = allChecklist.filter(c => c.done).length;
  if (!doneCount) { toast('No completed tasks to clear'); return; }
  if (!confirm(`Remove ${doneCount} completed task${doneCount!==1?'s':''}? This cannot be undone.`)) return;
  const res = await apiFetch('/admin/checklist/completed/' + currentSiteId, { method: 'DELETE' });
  if (!res || !res.ok) { toast('Failed to clear tasks'); return; }
  setAllChecklist(allChecklist.filter(c => !c.done));
  renderChecklist(allChecklist);
  toast(doneCount + ' completed task' + (doneCount!==1?'s':'') + ' cleared');
}

// Expose globals
window.toggleChecklistItem = toggleChecklistItem;
window.toggleIgnoreItem    = toggleIgnoreItem;
window.clearCompletedTasks = clearCompletedTasks;
window.filterChecklist     = filterChecklist;
window.goChecklistPage     = goChecklistPage;
