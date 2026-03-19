import * as State from '/js/state.js';
import { setSites, setCurrentSiteId } from '/js/state.js';
import { toast, apiFetch, gradeColor, relativeTime, fmtDate, openModal, closeModal } from '/js/utils.js';
import { switchTab } from '/js/app.js';

export async function loadSites() {
  const res = await apiFetch('/admin/sites');
  if (!res) return;
  const data = await res.json();
  setSites(data.State.sites || []);
  populateSiteDropdowns();
}

export function populateSiteDropdowns() {
  ['kw-site-filter','content-site-filter','report-site-filter','editor-site'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const saved = el.value;
    el.innerHTML = '<option value="">All Sites</option>';
    State.sites.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      el.appendChild(o);
    });
    el.value = saved;
  });
}

export function renderOverview() {
  const openTasks = State.sites.reduce((n, s) => n + (s.open_tasks || 0), 0);
  const avgScore  = State.sites.length
    ? Math.round(State.sites.reduce((n, s) => n + (s.last_score || 0), 0) / State.sites.length) : 0;
  document.getElementById('stat-State.sites').textContent  = State.sites.length;
  document.getElementById('stat-score').textContent  = avgScore || '—';
  document.getElementById('stat-tasks').textContent  = openTasks;
  document.getElementById('stat-kw').textContent     = State.sites.reduce((n, s) => n + (s.keyword_count || 0), 0);
  document.getElementById('stat-drafts').textContent = State.sites.reduce((n, s) => n + (s.draft_count || 0), 0);
  renderSitesTable('overview-State.sites-tbody', true);
}

export function renderSitesList() {
  document.getElementById('State.sites-list-view').style.display  = '';
  document.getElementById('site-detail-view').style.display = 'none';
  renderSitesTable('State.sites-tbody', false);
}

export function renderSitesTable(tbodyId, isOverview) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!State.sites.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--g2);font-size:.75rem;letter-spacing:.06em;text-transform:uppercase">No State.sites yet — add your first client site</td></tr>`;
    return;
  }
  tbody.innerHTML = State.sites.map(s => {
    const gc = gradeColor(s.last_grade || '—');
    return `<tr>
      <td>
        <div class="site-row-name">${s.name}</div>
        <div class="site-row-url">${s.url}</div>
      </td>
      <td><span class="platform-badge">${s.platform || '—'}</span></td>
      <td><div style="font-size:1.1rem;font-weight:900;color:${gc}">${s.last_grade || '—'}</div></td>
      <td style="color:var(--g4)">${s.pages_crawled || 0}</td>
      ${isOverview ? `<td style="color:${s.open_tasks > 0 ? 'var(--amber)' : 'var(--g4)'}">${s.open_tasks || 0}</td>` : ''}
      <td style="color:var(--g4)">${relativeTime(s.last_audit)}</td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="action-btn" onclick="openSiteDetail('${s.id}')">Manage</button>
          <button class="action-btn danger" onclick="deleteSite('${s.id}','${s.name.replace(/'/g,"\\'")}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

export async function openSiteDetail(siteId) {
  setCurrentSiteId(siteId);
  const { navTo } = await import('/js/app.js');
  navTo('sites');
  const site = State.sites.find(s => s.id === siteId);
  if (!site) return;

  document.getElementById('State.sites-list-view').style.display  = 'none';
  document.getElementById('site-detail-view').style.display = '';
  document.getElementById('sdh-name').textContent         = site.name;
  document.getElementById('sdh-url').textContent          = site.url;
  document.getElementById('sdh-platform').textContent     = site.platform || '—';
  document.getElementById('sdh-pages').textContent        = site.pages_crawled || 0;
  document.getElementById('sdh-last-audit').textContent   = fmtDate(site.last_audit);
  document.getElementById('sdh-status').textContent       = site.last_audit ? 'Active' : 'Not yet audited';
  document.getElementById('sdh-max-pages').value          = site.max_pages || 100;
  document.getElementById('topbar-title').textContent     = site.name;

  const gc = gradeColor(site.last_grade);
  document.getElementById('sdh-grade').textContent        = site.last_grade || '—';
  document.getElementById('sdh-grade').style.color        = gc;
  document.getElementById('sdh-grade-score').textContent  = (site.last_score || '—') + ' / 100';

  const gscStatus  = document.getElementById('sdh-gsc-status');
  const gscConnect = document.getElementById('btn-gsc-connect');
  const gscSync    = document.getElementById('btn-gsc-sync');
  if (site.gsc_connected) {
    gscStatus.textContent = 'Connected'; gscStatus.style.color = 'var(--green)';
    gscConnect.style.display = 'none';   gscSync.style.display = '';
  } else {
    gscStatus.textContent = 'Not connected'; gscStatus.style.color = 'var(--g2)';
    gscConnect.style.display = ''; gscSync.style.display = 'none';
  }

  switchTab('pages');
  const { loadSitePages }     = await import('/js/pages.js');
  const { loadSiteChecklist } = await import('/js/checklist.js');
  const { loadSiteKeywords }  = await import('/js/keywords.js');
  const { loadSiteContent }   = await import('/js/content.js');
  await Promise.all([
    loadSitePages(siteId),
    loadSiteChecklist(siteId),
    loadSiteKeywords(siteId),
    loadSiteContent(siteId),
  ]);
}

export function showSitesList() {
  document.getElementById('State.sites-list-view').style.display  = '';
  document.getElementById('site-detail-view').style.display = 'none';
  setCurrentSiteId(null);
}

export async function runFullAudit() {
  if (!State.currentSiteId) return;
  const site = State.sites.find(s => s.id === State.currentSiteId);
  if (!site) return;

  const btn  = document.getElementById('btn-run-audit');
  const wrap = document.getElementById('audit-progress-wrap');
  const fill = document.getElementById('crawl-fill');
  const msg  = document.getElementById('crawl-msg');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Auditing...';
  wrap.style.display = '';

  const steps = [
    {p:5,  m:'Connecting to site...'},
    {p:15, m:'Crawling pages and internal links...'},
    {p:30, m:'Analyzing page titles and meta descriptions...'},
    {p:45, m:'Checking content quality and headings...'},
    {p:58, m:'Verifying mobile and security settings...'},
    {p:70, m:'Evaluating page speed signals...'},
    {p:82, m:'Checking structured data and schema...'},
    {p:91, m:'Generating checklist items...'},
    {p:97, m:'Saving results...'},
  ];
  let si = 0;
  const tick = setInterval(() => {
    if (si < steps.length) { fill.style.width = steps[si].p + '%'; msg.textContent = steps[si].m; si++; }
  }, 3000);

  try {
    const res = await apiFetch('/admin/sites/' + State.currentSiteId + '/audit', { method: 'POST' });
    clearInterval(tick);
    fill.style.width = '100%'; msg.textContent = 'Audit complete!';
    if (!res || !res.ok) { const e = await res?.json().catch(()=>({})); throw new Error(e.error || 'Audit failed'); }
    const data = await res.json();
    await loadSites();
    const updated = State.sites.find(s => s.id === State.currentSiteId);
    if (updated) {
      document.getElementById('sdh-grade').textContent       = updated.last_grade || '—';
      document.getElementById('sdh-grade').style.color       = gradeColor(updated.last_grade);
      document.getElementById('sdh-grade-score').textContent = (updated.last_score || '—') + ' / 100';
      document.getElementById('sdh-pages').textContent       = updated.pages_crawled || 0;
      document.getElementById('sdh-last-audit').textContent  = fmtDate(updated.last_audit);
    }
    const { loadSitePages }     = await import('/js/pages.js');
    const { loadSiteChecklist } = await import('/js/checklist.js');
    await loadSitePages(State.currentSiteId);
    await loadSiteChecklist(State.currentSiteId);
    toast('Audit complete — ' + (data.pages_crawled || 0) + ' pages crawled');
    setTimeout(() => { wrap.style.display = 'none'; fill.style.width = '0%'; }, 2000);
  } catch (err) {
    clearInterval(tick);
    toast('Audit failed: ' + err.message);
    wrap.style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '▶ Run Audit';
  }
}

export async function saveMaxPages(val) {
  if (!State.currentSiteId) return;
  await apiFetch('/admin/sites/' + State.currentSiteId + '/settings', {
    method: 'PATCH',
    body: JSON.stringify({ max_pages: parseInt(val) }),
  });
  const site = State.sites.find(s => s.id === State.currentSiteId);
  if (site) site.max_pages = parseInt(val);
  toast('Crawl limit updated to ' + val + ' pages');
}

export function openAddSite() { openModal('modal-add-site'); }

export async function addSite() {
  const name     = document.getElementById('ms-name').value.trim();
  const url      = document.getElementById('ms-url').value.trim();
  const platform = document.getElementById('ms-platform').value;
  const email    = document.getElementById('ms-email').value.trim();
  const notes    = document.getElementById('ms-notes').value.trim();
  if (!name || !url) { toast('Name and URL are required'); return; }

  const res = await apiFetch('/admin/sites', {
    method: 'POST',
    body: JSON.stringify({ name, url, platform, client_email: email, notes }),
  });
  if (!res || !res.ok) { toast('Failed to add site'); return; }
  closeModal('modal-add-site');
  await loadSites();
  renderSitesList();
  renderOverview();
  toast(name + ' added — run an audit to get started');
  ['ms-name','ms-url','ms-email','ms-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ms-platform').value = '';
}

export async function deleteSite(siteId, name) {
  if (!confirm(`Remove "${name}" and all its data? This cannot be undone.`)) return;
  await apiFetch('/admin/sites/' + siteId, { method: 'DELETE' });
  setSites(State.sites.filter(s => s.id !== siteId));
  renderSitesList();
  renderOverview();
  toast(name + ' removed');
}

// Expose globals for inline HTML onclick handlers
window.openSiteDetail = openSiteDetail;
window.showSitesList  = showSitesList;
window.runFullAudit   = runFullAudit;
window.saveMaxPages   = saveMaxPages;
window.openAddSite    = openAddSite;
window.addSite        = addSite;
window.deleteSite     = deleteSite;
