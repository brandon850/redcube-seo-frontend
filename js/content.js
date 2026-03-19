import { allContent, currentSiteId, sites } from './state.js';
import { setAllContent } from './state.js';
import { toast, apiFetch, fmtDate } from './utils.js';

export async function loadSiteContent(siteId) {
  const res = await apiFetch('/admin/sites/' + siteId + '/content');
  if (!res) return;
  setAllContent((await res.json()).drafts || []);
  renderSiteContentGrid();
}

export function renderSiteContentGrid() {
  const grid = document.getElementById('site-content-grid');
  if (!grid) return;
  if (!allContent.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">◻</div><div class="empty-title">No content yet</div><div class="empty-sub">Create a blog post or landing page for this site.</div></div>`;
    return;
  }
  grid.innerHTML = allContent.map(d => contentCardHTML(d)).join('');
}

export async function loadContentPanel() {
  const siteFilter = document.getElementById('content-site-filter')?.value || '';
  const url = siteFilter ? '/admin/sites/' + siteFilter + '/content' : '/admin/content';
  const res = await apiFetch(url);
  if (!res) return;
  const drafts = (await res.json()).drafts || [];
  const grid   = document.getElementById('all-content-grid');
  if (!drafts.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">◻</div><div class="empty-title">No content yet</div><div class="empty-sub">Create your first blog post or landing page.</div></div>`;
    return;
  }
  grid.innerHTML = drafts.map(d => contentCardHTML(d)).join('');
}

export function contentCardHTML(d) {
  const site        = sites.find(s => s.id === d.site_id);
  const typeColor   = d.type === 'post' ? '#60a5fa' : '#fbbf24';
  const statusClass = d.status === 'published' ? 'status-published' : d.status === 'review' ? 'status-review' : 'status-draft';
  return `<div class="content-card" onclick="openEditor('${d.id}')">
    <div class="cc-type" style="color:${typeColor}">${d.type === 'post' ? 'Blog Post' : 'Landing Page'}</div>
    <div class="cc-title">${d.title || 'Untitled'}</div>
    <div class="cc-meta">${site?.name||'—'} · ${fmtDate(d.updated_at)}</div>
    ${d.target_keyword ? `<div class="cc-meta" style="margin-top:3px">🎯 ${d.target_keyword}</div>` : ''}
    <span class="cc-status ${statusClass}">${d.status || 'draft'}</span>
  </div>`;
}

export function newContent(type) {
  document.getElementById('editor-title').value    = '';
  document.getElementById('editor-keyword').value  = '';
  document.getElementById('editor-meta').value     = '';
  document.getElementById('editor-body').value     = '';
  document.getElementById('editor-type').value     = type;
  document.getElementById('editor-status').value   = 'draft';
  document.getElementById('editor-draft-id').value = '';
  if (currentSiteId) document.getElementById('editor-site').value = currentSiteId;
  document.getElementById('content-list-view').style.display   = 'none';
  document.getElementById('content-editor-view').style.display = '';
  scoreContent();
}

export function openEditor(draftId) {
  const draft = allContent.find(d => d.id === draftId) || {};
  document.getElementById('editor-title').value    = draft.title            || '';
  document.getElementById('editor-keyword').value  = draft.target_keyword   || '';
  document.getElementById('editor-meta').value     = draft.meta_description || '';
  document.getElementById('editor-body').value     = draft.body             || '';
  document.getElementById('editor-type').value     = draft.type             || 'post';
  document.getElementById('editor-status').value   = draft.status           || 'draft';
  document.getElementById('editor-draft-id').value = draftId;
  if (draft.site_id) document.getElementById('editor-site').value = draft.site_id;
  document.getElementById('content-list-view').style.display   = 'none';
  document.getElementById('content-editor-view').style.display = '';
  const { navTo } = import('./app.js').then(m => m.navTo('content'));
  scoreContent();
}

export function closeEditor() {
  document.getElementById('content-list-view').style.display   = '';
  document.getElementById('content-editor-view').style.display = 'none';
  loadContentPanel();
}

export async function saveContent(status) {
  const id      = document.getElementById('editor-draft-id').value;
  const siteId  = document.getElementById('editor-site').value;
  const payload = {
    site_id:          siteId,
    type:             document.getElementById('editor-type').value,
    title:            document.getElementById('editor-title').value,
    target_keyword:   document.getElementById('editor-keyword').value,
    meta_description: document.getElementById('editor-meta').value,
    body:             document.getElementById('editor-body').value,
    status:           status || document.getElementById('editor-status').value,
  };
  const method = id ? 'PATCH' : 'POST';
  const url    = id ? '/admin/content/' + id : '/admin/content';
  const res    = await apiFetch(url, { method, body: JSON.stringify(payload) });
  if (!res || !res.ok) { toast('Failed to save'); return; }
  const data = await res.json();
  document.getElementById('editor-draft-id').value = data.draft?.id || id;
  toast(status === 'draft' ? 'Draft saved' : 'Marked for review');
}

export function scoreContent() {
  const title   = document.getElementById('editor-title').value;
  const keyword = document.getElementById('editor-keyword').value.toLowerCase().trim();
  const meta    = document.getElementById('editor-meta').value;
  const body    = document.getElementById('editor-body').value;
  const bodyLow = body.toLowerCase();

  const seoChecks = [
    { label:'Title contains keyword',      pass: keyword && title.toLowerCase().includes(keyword) },
    { label:'Title length (30–60 chars)',   pass: title.length >= 30 && title.length <= 60 },
    { label:'Meta description present',    pass: meta.length > 20 },
    { label:'Meta length (150–160 chars)', pass: meta.length >= 150 && meta.length <= 160 },
    { label:'Keyword in first 100 words',  pass: keyword && bodyLow.slice(0,600).includes(keyword) },
    { label:'H2 headings used (##)',        pass: body.includes('##') },
    { label:'Word count 600+',             pass: body.split(/\s+/).filter(w=>w.length>2).length >= 600 },
    { label:'Keyword in body',             pass: keyword && bodyLow.includes(keyword) },
  ];
  const readChecks = [
    { label:'Short paragraphs',            pass: !body.split('\n\n').some(p=>p.split(' ').length>120) },
    { label:'Uses subheadings',            pass: (body.match(/^#{2,3} /mg)||[]).length >= 2 },
    { label:'Conversational tone',         pass: /\b(you|your|we|our)\b/i.test(body) },
    { label:'No walls of text',            pass: body.split('\n').every(l=>l.split(' ').length<60) },
  ];

  function renderChecks(checks, containerId) {
    const passing = checks.filter(c=>c.pass).length;
    const pct     = Math.round((passing/checks.length)*100);
    const color   = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    document.getElementById(containerId).innerHTML = `
      <div style="font-size:1.5rem;font-weight:900;color:${color};margin-bottom:.5rem">${pct}<span style="font-size:.75rem;color:var(--g3);font-weight:700">%</span></div>
      ${checks.map(c=>`
        <div style="display:flex;align-items:center;gap:.5rem;padding:.25rem 0;font-size:.68rem;font-weight:600;color:${c.pass?'var(--g4)':'var(--g2)'}">
          <span style="color:${c.pass?'var(--green)':'var(--b5)'}">${c.pass?'✓':'○'}</span>${c.label}
        </div>`).join('')}`;
  }
  renderChecks(seoChecks, 'seo-checks');
  renderChecks(readChecks, 'readability-checks');
}

// Expose globals
window.newContent   = newContent;
window.openEditor   = openEditor;
window.closeEditor  = closeEditor;
window.saveContent  = saveContent;
window.scoreContent = scoreContent;
