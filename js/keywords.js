import * as State from '/js/state.js';
import { setAllKeywords, setAllKeywordGroups, setAllPages } from '/js/state.js';
import { toast, apiFetch, fmtDate } from '/js/utils.js';

export async function loadSiteKeywords(siteId) {
  const [kwRes, grpRes, pageRes] = await Promise.all([
    apiFetch('/admin/sites/' + siteId + '/keywords'),
    apiFetch('/admin/sites/' + siteId + '/keyword-groups'),
    apiFetch('/admin/sites/' + siteId + '/pages'),
  ]);
  if (!kwRes || !grpRes || !pageRes) return;
  setAllKeywords((await kwRes.json()).keywords   || []);
  setAllKeywordGroups((await grpRes.json()).groups || []);
  setAllPages((await pageRes.json()).pages         || []);
  renderSiteKeywords();
  populateGroupDropdown();
  populateKeywordPageDropdown();
}

export function renderSiteKeywords() {
  renderGroupPills();
  const tbody = document.getElementById('keywords-tbody');
  if (!State.allKeywords.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--g2);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em">No keywords tracked yet</td></tr>`;
    return;
  }
  const grouped = {}, ungrouped = [];
  State.allKeywords.forEach(kw => {
    if (kw.group_id) { if (!grouped[kw.group_id]) grouped[kw.group_id]=[]; grouped[kw.group_id].push(kw); }
    else ungrouped.push(kw);
  });
  let html = '';
  State.allKeywordGroups.forEach(g => {
    const kws = grouped[g.id] || [];
    if (!kws.length) return;
    html += `<tr><td colspan="7" style="padding:.5rem .85rem;background:var(--b2);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--red);border-bottom:1px solid var(--b3)">${g.name} (${kws.length})</td></tr>`;
    html += kws.map(kw => keywordRow(kw)).join('');
  });
  if (ungrouped.length) {
    if (State.allKeywordGroups.length) html += `<tr><td colspan="7" style="padding:.5rem .85rem;background:var(--b2);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--g2);border-bottom:1px solid var(--b3)">Ungrouped (${ungrouped.length})</td></tr>`;
    html += ungrouped.map(kw => keywordRow(kw)).join('');
  }
  tbody.innerHTML = html;
}

function keywordRow(kw) {
  const changeVal   = kw.position_change || 0;
  const changeClass = changeVal > 0 ? 'rank-up' : changeVal < 0 ? 'rank-down' : 'rank-same';
  const changeStr   = changeVal > 0 ? `↑${changeVal}` : changeVal < 0 ? `↓${Math.abs(changeVal)}` : '—';
  return `<tr>
    <td style="font-weight:600;color:var(--white)">${kw.keyword}</td>
    <td style="color:var(--g4);font-size:.68rem">${kw.page_url||'—'}</td>
    <td style="font-weight:700;color:var(--white)">${kw.current_position||'—'}</td>
    <td class="rank-change ${changeClass}">${changeStr}</td>
    <td style="color:var(--g4)">${kw.search_volume?kw.search_volume.toLocaleString():'—'}</td>
    <td style="color:var(--g4)">${kw.difficulty||'—'}</td>
    <td><button class="action-btn danger" onclick="deleteKeyword('${kw.id}')">✕</button></td>
  </tr>`;
}

export async function addKeyword() {
  const raw     = document.getElementById('kw-input-new').value.trim();
  const page    = document.getElementById('kw-page-assign')?.value   || '';
  const groupId = document.getElementById('kw-group-assign')?.value  || '';
  if (!raw || !State.currentSiteId) return;
  const res = await apiFetch('/admin/sites/' + State.currentSiteId + '/keywords', {
    method: 'POST',
    body: JSON.stringify({ keyword: raw, page_url: page||null, group_id: groupId||null }),
  });
  if (!res || !res.ok) { toast('Failed to add keywords'); return; }
  const data  = await res.json();
  const added = data.keywords?.length || 0;
  setAllKeywords([...(data.keywords||[]), ...State.allKeywords]);
  renderSiteKeywords();
  document.getElementById('kw-input-new').value = '';
  toast(added + ' keyword' + (added!==1?'s':'') + ' added');
}

export async function deleteKeyword(kwId) {
  await apiFetch('/admin/keywords/' + kwId, { method: 'DELETE' });
  setAllKeywords(State.allKeywords.filter(k => k.id !== kwId));
  renderSiteKeywords();
}

export async function addKeywordGroup() {
  const name = document.getElementById('kw-new-group-name').value.trim();
  if (!name || !State.currentSiteId) return;
  const res = await apiFetch('/admin/sites/' + State.currentSiteId + '/keyword-groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res || !res.ok) { toast('Failed to create group'); return; }
  const data = await res.json();
  setAllKeywordGroups([...State.allKeywordGroups, data.group]);
  populateGroupDropdown();
  renderGroupPills();
  document.getElementById('kw-new-group-name').value = '';
  toast('Group "' + name + '" created');
}

export async function deleteKeywordGroup(groupId, name) {
  if (!confirm('Delete group "' + name + '"? Keywords will become ungrouped.')) return;
  await apiFetch('/admin/sites/' + State.currentSiteId + '/keyword-groups/' + groupId, { method: 'DELETE' });
  setAllKeywordGroups(State.allKeywordGroups.filter(g => g.id !== groupId));
  State.allKeywords.forEach(k => { if (k.group_id === groupId) k.group_id = null; });
  populateGroupDropdown();
  renderGroupPills();
  renderSiteKeywords();
  toast('Group deleted');
}

export function populateGroupDropdown() {
  const sel = document.getElementById('kw-group-assign');
  if (!sel) return;
  sel.innerHTML = '<option value="">No group</option>';
  State.allKeywordGroups.forEach(g => {
    const o = document.createElement('option');
    o.value = g.id; o.textContent = g.name;
    sel.appendChild(o);
  });
}

export function renderGroupPills() {
  const container = document.getElementById('kw-groups-list');
  if (!container) return;
  container.innerHTML = State.allKeywordGroups.map(g => `
    <span style="display:inline-flex;align-items:center;gap:.4rem;background:var(--b3);border:1px solid var(--b5);border-radius:3px;padding:.25rem .65rem;font-size:.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--g4)">
      ${g.name}
      <span onclick="deleteKeywordGroup('${g.id}','${g.name.replace(/'/g,"\\\'")}')" style="cursor:pointer;color:var(--g2);font-size:.7rem;margin-left:2px" title="Delete group">✕</span>
    </span>`).join('');
}

export function populateKeywordPageDropdown() {
  const sel = document.getElementById('kw-page-assign');
  if (!sel) return;
  sel.innerHTML = '<option value="">Assign to page (optional)</option>';
  State.allPages.forEach(p => {
    const o   = document.createElement('option');
    o.value   = p.url;
    const path = (() => { try { return new URL(p.url).pathname; } catch { return p.url; } })();
    o.textContent = (p.title ? p.title + '  —  ' : '') + path;
    sel.appendChild(o);
  });
}

export async function loadKeywordsPanel() {
  const siteFilter = document.getElementById('kw-site-filter')?.value || '';
  const url = siteFilter ? '/admin/sites/' + siteFilter + '/keywords' : '/admin/keywords';
  const res = await apiFetch(url);
  if (!res) return;
  const kws   = (await res.json()).keywords || [];
  const tbody = document.getElementById('all-keywords-tbody');
  if (!kws.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--g2);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em">No keywords tracked yet</td></tr>`;
    return;
  }
  tbody.innerHTML = kws.map(kw => {
    const site      = State.sites.find(s => s.id === kw.site_id);
    const changeVal   = kw.position_change || 0;
    const changeClass = changeVal > 0 ? 'rank-up' : changeVal < 0 ? 'rank-down' : 'rank-same';
    const changeStr   = changeVal > 0 ? `↑${changeVal}` : changeVal < 0 ? `↓${Math.abs(changeVal)}` : '—';
    return `<tr>
      <td style="font-weight:600;color:var(--white)">${kw.keyword}</td>
      <td style="color:var(--g4);font-size:.68rem">${site?.name||'—'}</td>
      <td style="color:var(--g4);font-size:.68rem">${kw.page_url||'—'}</td>
      <td style="font-weight:700;color:var(--white)">${kw.current_position||'—'}</td>
      <td class="rank-change ${changeClass}">${changeStr}</td>
      <td style="color:var(--g4)">${fmtDate(kw.updated_at)}</td>
    </tr>`;
  }).join('');
}

// Expose globals
window.addKeyword         = addKeyword;
window.deleteKeyword      = deleteKeyword;
window.addKeywordGroup    = addKeywordGroup;
window.deleteKeywordGroup = deleteKeywordGroup;
window.loadKeywordsPanel  = loadKeywordsPanel;
