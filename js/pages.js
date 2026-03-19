import { allPages, allChecklist, currentSiteId } from '/js/state.js';
import { setAllPages } from '/js/state.js';
import { toast, apiFetch, scoreColor, fmtDate } from '/js/utils.js';
import { switchTab } from '/js/app.js';

export async function loadSitePages(siteId) {
  const res = await apiFetch('/admin/sites/' + siteId + '/pages');
  if (!res) return;
  setAllPages((await res.json()).pages || []);
  renderPages(allPages);
}

export function renderPages(pages) {
  const container = document.getElementById('pages-list');
  if (!pages.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">◻</div><div class="empty-title">No pages yet</div><div class="empty-sub">Run an audit to crawl and score all pages on this site.</div></div>`;
    return;
  }
  container.innerHTML = pages.map(p => {
    const sc        = scoreColor(p.score || 0);
    const typeClass = p.type === 'post' ? 'type-post' : p.type === 'landing' ? 'type-landing' : 'type-page';
    const typeLabel = p.type === 'post' ? 'Blog Post' : p.type === 'landing' ? 'Landing Page' : 'Page';
    return `<div class="page-row" onclick="openPageDetail('${p.id}')">
      <div class="page-row-top">
        <div class="page-row-url">${p.url}</div>
        <span class="page-row-type ${typeClass}">${typeLabel}</span>
        <div class="page-row-score" style="color:${sc}">${p.score || '—'}</div>
      </div>
      ${p.title ? `<div style="font-size:.68rem;color:var(--g3);margin-top:.3rem;font-weight:500">${p.title}</div>` : ''}
      <div class="page-row-bar"><div class="page-row-fill" style="width:${p.score||0}%;background:${sc}"></div></div>
    </div>`;
  }).join('');
}

export function filterPages() {
  const type  = document.getElementById('page-type-filter').value;
  const score = document.getElementById('page-score-filter').value;
  let filtered = [...allPages];
  if (type)          filtered = filtered.filter(p => p.type === type);
  if (score==='poor') filtered = filtered.filter(p => (p.score||0) < 60);
  if (score==='ok')   filtered = filtered.filter(p => (p.score||0) >= 60 && (p.score||0) < 80);
  if (score==='good') filtered = filtered.filter(p => (p.score||0) >= 80);
  renderPages(filtered);
}

export function openPageDetail(pageId) {
  const page = allPages.find(p => p.id === pageId);
  if (!page) return;

  switchTab('pages');
  document.getElementById('pages-list-view').style.display  = 'none';
  document.getElementById('page-detail-view').style.display = '';

  const sc = scoreColor(page.score || 0);
  document.getElementById('pd-url').textContent   = page.url;
  document.getElementById('pd-title').textContent = page.title || '(No title tag)';

  const scoreEl = document.getElementById('pd-score');
  scoreEl.textContent = page.score || '—';
  scoreEl.style.color = sc;

  const typeClass = page.type==='post' ? 'type-post' : page.type==='landing' ? 'type-landing' : 'type-page';
  const typeLabel = page.type==='post' ? 'Blog Post' : page.type==='landing' ? 'Landing Page' : 'Page';
  document.getElementById('pd-badges').innerHTML = `
    <span class="page-row-type ${typeClass}">${typeLabel}</span>
    ${page.is_https  ? '<span class="cat-badge badge-great">HTTPS</span>'        : '<span class="cat-badge badge-poor">No HTTPS</span>'}
    ${page.is_mobile ? '<span class="cat-badge badge-great">Mobile OK</span>'    : '<span class="cat-badge badge-poor">Not Mobile</span>'}
    ${page.has_h1    ? '<span class="cat-badge badge-great">Has H1</span>'       : '<span class="cat-badge badge-poor">No H1</span>'}
    ${page.has_meta  ? '<span class="cat-badge badge-great">Has Meta Desc</span>': '<span class="cat-badge badge-poor">No Meta Desc</span>'}
  `;

  // Type override dropdown
  const typeOverride = document.getElementById('pd-type-override');
  typeOverride.value            = page.type || 'page';
  typeOverride.dataset.pageId   = page.id;
  document.getElementById('pd-type-manual-badge').style.display = page.manually_typed ? '' : 'none';

  // Metrics grid
  document.getElementById('pd-metrics-grid').innerHTML = [
    { label:'Word Count',   val: page.word_count || 0, status: (page.word_count||0) >= 300 ? 'pass' : 'warn' },
    { label:'HTTPS',        val: page.is_https  ? 'Yes':'No', status: page.is_https  ? 'pass':'fail' },
    { label:'Mobile Ready', val: page.is_mobile ? 'Yes':'No', status: page.is_mobile ? 'pass':'fail' },
    { label:'H1 Tag',       val: page.has_h1    ? 'Yes':'No', status: page.has_h1    ? 'pass':'fail' },
    { label:'Meta Desc',    val: page.has_meta  ? 'Yes':'No', status: page.has_meta  ? 'pass':'fail' },
    { label:'H1 Text',      val: page.h1_text ? page.h1_text.slice(0,40) + (page.h1_text.length>40?'…':'') : '—', status: page.h1_text ? 'pass':'warn' },
  ].map(m => `<div class="pd-metric"><div class="pd-metric-label">${m.label}</div><div class="pd-metric-val ${m.status}">${m.val}</div></div>`).join('');

  // Issues
  const issues      = page.issues || [];
  const issuesTitle = document.getElementById('pd-issues-title');
  const issuesList  = document.getElementById('pd-issues-list');
  issuesTitle.style.display = issues.length ? '' : 'none';
  issuesList.innerHTML = issues.length
    ? issues.map(i => `<div class="pd-issue"><span style="color:var(--crimson);flex-shrink:0">❌</span><span>${i}</span></div>`).join('')
    : `<div class="pd-issue"><span style="color:var(--green)">✅</span><span>No issues found on this page</span></div>`;

  // Page-scoped checklist
  const pageChecklist = allChecklist.filter(c => c.page_url === page.url);
  const clTitle = document.getElementById('pd-checklist-title');
  const clList  = document.getElementById('pd-checklist-list');
  clTitle.style.display = pageChecklist.length ? '' : 'none';
  clList.innerHTML = pageChecklist.length
    ? pageChecklist.map(item => `
      <div class="checklist-item ${item.done?'done':''}" id="ci-${item.id}">
        <div class="ci-check" onclick="toggleChecklistItem('${item.id}')">✓</div>
        <div class="ci-body">
          <div class="ci-text">${item.text}<span class="ci-priority priority-${item.priority||'med'}">${item.priority||'med'}</span></div>
          ${item.done && item.completed_at ? `<div class="ci-meta">Completed ${fmtDate(item.completed_at)}</div>` : ''}
        </div>
      </div>`).join('')
    : '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function closePageDetail() {
  document.getElementById('pages-list-view').style.display  = '';
  document.getElementById('page-detail-view').style.display = 'none';
}

export async function overridePageType(selectEl) {
  const pageId  = selectEl.dataset.pageId;
  const newType = selectEl.value;
  if (!pageId || !currentSiteId) return;
  const res = await apiFetch(`/admin/sites/${currentSiteId}/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ type: newType }),
  });
  if (!res || !res.ok) { toast('Failed to update page type'); return; }
  const page = allPages.find(p => p.id === pageId);
  if (page) { page.type = newType; page.manually_typed = true; }
  document.getElementById('pd-type-manual-badge').style.display = '';
  toast('Page type set to ' + newType + ' — will persist through future audits');
}

// Expose globals
window.openPageDetail   = openPageDetail;
window.closePageDetail  = closePageDetail;
window.filterPages      = filterPages;
window.overridePageType = overridePageType;
