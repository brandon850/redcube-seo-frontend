import { setAllPages } from '/js/state.js';
import { toast, apiFetch, scoreColor, fmtDate } from '/js/utils.js';

export async function loadSitePages(siteId) {
  const res = await apiFetch('/admin/sites/'+siteId+'/pages');
  if (!res) return;
  setAllPages((await res.json()).pages || []);
  const { allPages } = await import('/js/state.js');
  renderPages(allPages);
}

export async function renderPages(pages) {
  const container = document.getElementById('pages-list');
  if (!pages.length) { container.innerHTML = `<div class="empty"><div class="empty-icon">◻</div><div class="empty-title">No pages yet</div><div class="empty-sub">Run an audit to crawl and score all pages.</div></div>`; return; }
  container.innerHTML = pages.map(p => {
    const sc = scoreColor(p.score||0);
    const typeClass = p.type==='post'?'type-post':p.type==='landing'?'type-landing':'type-page';
    const typeLabel = p.type==='post'?'Blog Post':p.type==='landing'?'Landing Page':'Page';
    return `<div class="page-row" onclick="openPageDetail('${p.id}')">
      <div class="page-row-top"><div class="page-row-url">${p.url}</div><span class="page-row-type ${typeClass}">${typeLabel}</span><div class="page-row-score" style="color:${sc}">${p.score||'—'}</div></div>
      ${p.title?`<div style="font-size:.68rem;color:var(--g3);margin-top:.3rem;font-weight:500">${p.title}</div>`:''}
      <div class="page-row-bar"><div class="page-row-fill" style="width:${p.score||0}%;background:${sc}"></div></div>
    </div>`;
  }).join('');
}

export async function filterPages() {
  const { allPages } = await import('/js/state.js');
  const type = document.getElementById('page-type-filter').value;
  const score = document.getElementById('page-score-filter').value;
  let filtered = [...allPages];
  if (type)           filtered = filtered.filter(p=>p.type===type);
  if (score==='poor') filtered = filtered.filter(p=>(p.score||0)<60);
  if (score==='ok')   filtered = filtered.filter(p=>(p.score||0)>=60&&(p.score||0)<80);
  if (score==='good') filtered = filtered.filter(p=>(p.score||0)>=80);
  renderPages(filtered);
}

export async function openPageDetail(pageId) {
  const { allPages, allChecklist } = await import('/js/state.js');
  const page = allPages.find(p=>p.id===pageId);
  if (!page) return;
  const { switchTab } = await import('/js/app.js');
  switchTab('pages');
  document.getElementById('pages-list-view').style.display  = 'none';
  document.getElementById('page-detail-view').style.display = '';
  const sc = scoreColor(page.score||0);
  document.getElementById('pd-url').textContent   = page.url;
  document.getElementById('pd-title').textContent = page.title||'(No title tag)';
  const scoreEl = document.getElementById('pd-score'); scoreEl.textContent = page.score||'—'; scoreEl.style.color = sc;
  const typeClass = page.type==='post'?'type-post':page.type==='landing'?'type-landing':'type-page';
  const typeLabel = page.type==='post'?'Blog Post':page.type==='landing'?'Landing Page':'Page';
  document.getElementById('pd-badges').innerHTML = `
    <span class="page-row-type ${typeClass}">${typeLabel}</span>
    ${page.is_https ?'<span class="cat-badge badge-great">HTTPS</span>'       :'<span class="cat-badge badge-poor">No HTTPS</span>'}
    ${page.is_mobile?'<span class="cat-badge badge-great">Mobile OK</span>'   :'<span class="cat-badge badge-poor">Not Mobile</span>'}
    ${page.has_h1   ?'<span class="cat-badge badge-great">Has H1</span>'      :'<span class="cat-badge badge-poor">No H1</span>'}
    ${page.has_meta ?'<span class="cat-badge badge-great">Has Meta Desc</span>':'<span class="cat-badge badge-poor">No Meta Desc</span>'}`;
  const typeOverride = document.getElementById('pd-type-override');
  if (typeOverride) { typeOverride.value = page.type||'page'; typeOverride.dataset.pageId = page.id; }
  const manualBadge = document.getElementById('pd-type-manual-badge');
  if (manualBadge) manualBadge.style.display = page.manually_typed ? '' : 'none';
  document.getElementById('pd-metrics-grid').innerHTML = [
    {label:'Word Count', val:page.word_count||0, status:(page.word_count||0)>=300?'pass':'warn'},
    {label:'HTTPS',      val:page.is_https?'Yes':'No', status:page.is_https?'pass':'fail'},
    {label:'Mobile',     val:page.is_mobile?'Yes':'No', status:page.is_mobile?'pass':'fail'},
    {label:'H1 Tag',     val:page.has_h1?'Yes':'No', status:page.has_h1?'pass':'fail'},
    {label:'Meta Desc',  val:page.has_meta?'Yes':'No', status:page.has_meta?'pass':'fail'},
    {label:'H1 Text',    val:page.h1_text?(page.h1_text.slice(0,40)+(page.h1_text.length>40?'…':'')):'—', status:page.h1_text?'pass':'warn'},
  ].map(m=>`<div class="pd-metric"><div class="pd-metric-label">${m.label}</div><div class="pd-metric-val ${m.status}">${m.val}</div></div>`).join('');
  const issues = page.issues||[];
  document.getElementById('pd-issues-title').style.display = issues.length?'':'none';
  document.getElementById('pd-issues-list').innerHTML = issues.length
    ? issues.map(i=>`<div class="pd-issue"><span style="color:var(--crimson);flex-shrink:0">❌</span><span>${i}</span></div>`).join('')
    : `<div class="pd-issue"><span style="color:var(--green)">✅</span><span>No issues found</span></div>`;
  const pageChecklist = allChecklist.filter(c=>c.page_url===page.url);
  const clTitle = document.getElementById('pd-checklist-title');
  const clList  = document.getElementById('pd-checklist-list');
  if (clTitle) clTitle.style.display = pageChecklist.length?'':'none';
  if (clList)  clList.innerHTML = pageChecklist.map(item=>`
    <div class="checklist-item ${item.done?'done':''}" id="ci-${item.id}">
      <div class="ci-check" onclick="toggleChecklistItem('${item.id}')">✓</div>
      <div class="ci-body"><div class="ci-text">${item.text}<span class="ci-priority priority-${item.priority||'med'}">${item.priority||'med'}</span></div></div>
    </div>`).join('');
  // Render stored PSI data if available
  if (page.psi_mobile || page.psi_desktop) {
    renderPSI({ mobile: page.psi_mobile, desktop: page.psi_desktop, fetched_at: page.psi_fetched_at });
  } else {
    const psiContainer = document.getElementById('pd-psi');
    if (psiContainer) psiContainer.innerHTML = '<div style="font-size:.68rem;color:var(--g2);padding:.75rem 0">No PageSpeed data yet — click Refresh PageSpeed to fetch.</div>';
  }

  // Store current page id for refresh button
  document.getElementById('btn-refresh-psi')?.setAttribute('data-page-id', page.id);

  window.scrollTo({top:0,behavior:'smooth'});
}

export function closePageDetail() {
  document.getElementById('pages-list-view').style.display  = '';
  document.getElementById('page-detail-view').style.display = 'none';
}

export async function overridePageType(selectEl) {
  const { currentSiteId, allPages } = await import('/js/state.js');
  const pageId  = selectEl.dataset.pageId;
  const newType = selectEl.value;
  if (!pageId||!currentSiteId) return;
  const res = await apiFetch(`/admin/sites/${currentSiteId}/pages/${pageId}`, { method:'PATCH', body: JSON.stringify({ type: newType }) });
  if (!res||!res.ok) { toast('Failed to update page type'); return; }
  const page = allPages.find(p=>p.id===pageId);
  if (page) { page.type = newType; page.manually_typed = true; }
  const badge = document.getElementById('pd-type-manual-badge');
  if (badge) badge.style.display = '';
  toast('Page type set to '+newType+' — will persist through future audits');
}

window.openPageDetail   = openPageDetail;
window.closePageDetail  = closePageDetail;
window.filterPages      = filterPages;
window.overridePageType = overridePageType;

// ── PageSpeed / Core Web Vitals ───────────────────

export async function loadPageSpeed(siteId, pageId) {
  const btn = document.getElementById('btn-refresh-psi');
  if (btn) { btn.textContent = '↻ Fetching...'; btn.disabled = true; }
  try {
    const res = await apiFetch(`/admin/pagespeed/${siteId}/${pageId}`, { method: 'POST' });
    if (!res || !res.ok) { toast('PageSpeed fetch failed'); return; }
    const data = await res.json();
    renderPSI(data.data);
    toast('PageSpeed data updated');
  } catch (e) {
    toast('PageSpeed fetch failed');
  } finally {
    if (btn) { btn.textContent = '↻ Refresh PageSpeed'; btn.disabled = false; }
  }
}

export function renderPSI(psi) {
  const container = document.getElementById('pd-psi');
  if (!container || !psi) return;

  const { mobile, desktop } = psi;
  if (!mobile && !desktop) { container.innerHTML = ''; return; }

  function scoreColor(s) {
    return s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
  }

  function ratingColor(r) {
    return r === 'good' ? '#22c55e' : r === 'needs-improvement' ? '#f59e0b' : r === 'poor' ? '#ef4444' : '#666';
  }

  function fmt(val, unit) {
    if (val === null || val === undefined) return '—';
    if (unit === 'ms') return val >= 1000 ? (val/1000).toFixed(1)+'s' : val+'ms';
    if (unit === 'cls') return val.toFixed(3);
    return val;
  }

  function metricRow(label, mVal, dVal, unit, mRating, dRating) {
    return `
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;gap:.5rem;align-items:center;padding:.4rem 0;border-bottom:1px solid var(--b3);font-size:.72rem">
        <div style="color:var(--g3);font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:.62rem">${label}</div>
        <div style="font-weight:700;color:${ratingColor(mRating)}">${fmt(mVal, unit)} <span style="font-size:.58rem;opacity:.7">${mRating||''}</span></div>
        <div style="font-weight:700;color:${ratingColor(dRating)}">${fmt(dVal, unit)} <span style="font-size:.58rem;opacity:.7">${dRating||''}</span></div>
      </div>`;
  }

  function scoreCircle(score, label) {
    const c = scoreColor(score);
    return `<div style="text-align:center">
      <div style="font-size:2rem;font-weight:900;color:${c};line-height:1">${score ?? '—'}</div>
      <div style="font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--g3);margin-top:2px">${label}</div>
    </div>`;
  }

  const diagnostics = (mobile?.diagnostics || desktop?.diagnostics || []).slice(0, 5);

  container.innerHTML = `
    <div class="pd-section-title" style="margin-top:1.5rem">Core Web Vitals</div>

    <!-- Score circles -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
      <div style="background:var(--b2);border:1px solid var(--b3);border-radius:3px;padding:1rem;text-align:center">
        <div style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g2);margin-bottom:.75rem">📱 Mobile</div>
        ${scoreCircle(mobile?.performance_score, 'Performance')}
      </div>
      <div style="background:var(--b2);border:1px solid var(--b3);border-radius:3px;padding:1rem;text-align:center">
        <div style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g2);margin-bottom:.75rem">🖥 Desktop</div>
        ${scoreCircle(desktop?.performance_score, 'Performance')}
      </div>
    </div>

    <!-- Metrics table -->
    <div style="background:var(--b2);border:1px solid var(--b3);border-radius:3px;padding:.75rem 1rem;margin-bottom:1.25rem">
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;gap:.5rem;margin-bottom:.5rem">
        <div></div>
        <div style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g2)">📱 Mobile</div>
        <div style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g2)">🖥 Desktop</div>
      </div>
      ${metricRow('LCP',  mobile?.lcp,  desktop?.lcp,  'ms',  mobile?.ratings?.lcp,  desktop?.ratings?.lcp)}
      ${metricRow('INP',  mobile?.inp,  desktop?.inp,  'ms',  mobile?.ratings?.inp,  desktop?.ratings?.inp)}
      ${metricRow('CLS',  mobile?.cls,  desktop?.cls,  'cls', mobile?.ratings?.cls,  desktop?.ratings?.cls)}
      ${metricRow('FCP',  mobile?.fcp,  desktop?.fcp,  'ms',  mobile?.ratings?.fcp,  desktop?.ratings?.fcp)}
      ${metricRow('TTFB', mobile?.ttfb, desktop?.ttfb, 'ms',  mobile?.ratings?.ttfb, desktop?.ratings?.ttfb)}
      ${metricRow('TBT',  mobile?.tbt,  desktop?.tbt,  'ms',  null, null)}
    </div>

    <!-- Diagnostics -->
    ${diagnostics.length ? `
      <div style="font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g2);margin-bottom:.5rem">Top Issues</div>
      <div style="display:flex;flex-direction:column;gap:.4rem">
        ${diagnostics.map(d => `
          <div style="background:var(--b2);border:1px solid var(--b3);border-radius:3px;padding:.6rem .85rem;display:flex;align-items:flex-start;gap:.65rem">
            <span style="color:var(--amber);flex-shrink:0;font-size:.8rem">⚠</span>
            <div>
              <div style="font-size:.72rem;font-weight:600;color:var(--white)">${d.title}</div>
              ${d.savings ? `<div style="font-size:.65rem;color:var(--g3);margin-top:2px">Potential saving: ${d.savings}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>` : ''}

    ${psi.fetched_at ? `<div style="font-size:.6rem;color:var(--g2);margin-top:.75rem;text-align:right">Last fetched: ${new Date(psi.fetched_at).toLocaleString()}</div>` : ''}
  `;
}

window.loadPageSpeed = loadPageSpeed;

export async function refreshPageSpeed() {
  const { currentSiteId } = await import('/js/state.js');
  const pageId = document.getElementById('btn-refresh-psi')?.getAttribute('data-page-id');
  if (!currentSiteId || !pageId) { toast('No page selected'); return; }
  await loadPageSpeed(currentSiteId, pageId);
}

window.refreshPageSpeed = refreshPageSpeed;
