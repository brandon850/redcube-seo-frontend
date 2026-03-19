import * as State from '/js/state.js';
import { toast, apiFetch } from '/js/utils.js';
import { loadSiteKeywords } from '/js/keywords.js';
import { loadSites, openSiteDetail } from '/js/sites.js';

export async function connectGSC() {
  if (!State.currentSiteId) return;
  const btn = document.getElementById('btn-gsc-connect');
  btn.textContent = 'Opening Google...';
  btn.disabled = true;

  const res = await apiFetch('/admin/gsc/auth-url?site_id=' + State.currentSiteId);
  if (!res || !res.ok) { toast('Failed to get auth URL'); btn.textContent = '⚡ Connect GSC'; btn.disabled = false; return; }
  const { url } = await res.json();

  const popup = window.open(url, 'gsc_auth', 'width=600,height=700,scrollbars=yes');
  const poll  = setInterval(async () => {
    if (!popup || popup.closed) {
      clearInterval(poll);
      btn.textContent = '⚡ Connect GSC';
      btn.disabled    = false;
      await loadSites();
      openSiteDetail(State.currentSiteId);
      toast('GSC connected — click Sync GSC to import keyword data');
    }
  }, 800);
}

export async function syncGSC() {
  if (!State.currentSiteId) return;

  const propRes = await apiFetch('/admin/gsc/properties/' + State.currentSiteId);
  if (!propRes || !propRes.ok) { toast('Could not fetch GSC properties'); return; }
  const { properties } = await propRes.json();
  if (!properties?.length) { toast('No GSC properties found on this account'); return; }

  const site        = State.sites.find(s => s.id === State.currentSiteId);
  const current     = site?.gsc_property_url || '';
  const optionsHtml = properties.map(p =>
    `<option value="${p}" ${p===current?'selected':''}>${p}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'gsc-modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-title">Select GSC Property</div>
      <div class="modal-sub">Choose the property that matches this site.</div>
      <div class="modal-field">
        <label>GSC Property</label>
        <select id="gsc-property-select">${optionsHtml}</select>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeGSCModal()">Cancel</button>
        <button class="btn-primary" onclick="confirmGSCSync()">Sync This Property →</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

export function closeGSCModal() {
  const el = document.getElementById('gsc-modal-overlay');
  if (el) el.remove();
}

export async function confirmGSCSync() {
  const propertyUrl = document.getElementById('gsc-property-select').value;
  closeGSCModal();

  await apiFetch('/admin/gsc/property/' + State.currentSiteId, {
    method: 'PATCH',
    body: JSON.stringify({ property_url: propertyUrl }),
  });

  const btn = document.getElementById('btn-gsc-sync');
  btn.textContent = '↻ Syncing...';
  btn.disabled    = true;

  const res = await apiFetch('/admin/gsc/sync/' + State.currentSiteId, { method: 'POST' });
  btn.textContent = '↻ Sync GSC';
  btn.disabled    = false;

  if (!res || !res.ok) { toast('GSC sync failed — check Railway logs'); return; }
  const data = await res.json();
  await loadSiteKeywords(State.currentSiteId);
  toast(`Sync complete — ${data.updated} keywords updated, ${data.imported} imported`);
}

export async function disconnectGSC() {
  if (!State.currentSiteId) return;
  if (!confirm('Disconnect Google Search Console from this site? Keyword positions will stop updating.')) return;
  await apiFetch('/admin/gsc/' + State.currentSiteId, { method: 'DELETE' });
  await loadSites();
  openSiteDetail(State.currentSiteId);
  toast('GSC disconnected');
}

// Expose globals
window.connectGSC    = connectGSC;
window.syncGSC       = syncGSC;
window.closeGSCModal = closeGSCModal;
window.confirmGSCSync = confirmGSCSync;
window.disconnectGSC = disconnectGSC;
