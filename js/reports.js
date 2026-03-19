import { sites, currentSiteId } from '/js/state.js';
import { toast, apiFetch, gradeColor, fmtDate } from '/js/utils.js';

export async function loadReports() {
  const siteFilter = document.getElementById('report-site-filter')?.value || '';
  const url = siteFilter ? '/admin/sites/' + siteFilter + '/reports' : '/admin/reports';
  const res = await apiFetch(url);
  if (!res) return;
  const reports   = (await res.json()).reports || [];
  const container = document.getElementById('reports-container');

  if (!reports.length) {
    container.innerHTML = `<div class="empty"><div class="empty-icon">◈</div><div class="empty-title">No reports yet</div><div class="empty-sub">Run an audit on a site, then generate a client report from the site detail page.</div></div>`;
    return;
  }

  container.innerHTML = reports.map(r => {
    const gc   = gradeColor(r.grade);
    const site = sites.find(s => s.id === r.site_id);
    return `<div class="report-card">
      <div style="display:flex;align-items:center;gap:1rem">
        <div class="rc-grade" style="color:${gc}">${r.grade}</div>
        <div class="rc-left">
          <h4>${site?.name || r.site_name || '—'}</h4>
          <p>Generated ${fmtDate(r.created_at)} · ${r.score}/100 · ${r.pages_crawled||0} pages</p>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <a class="btn-secondary" href="${r.public_url}" target="_blank"
           style="text-decoration:none;display:inline-flex;align-items:center;padding:.5rem 1rem;font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g4);border:1px solid var(--b4);border-radius:3px">View Report ↗</a>
        <button class="btn-secondary" onclick="copyReportLink('${r.public_url}')">Copy Link</button>
        <button class="action-btn danger" onclick="deleteReport('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

export async function generateClientReport() {
  if (!currentSiteId) return;
  const res = await apiFetch('/admin/sites/' + currentSiteId + '/reports', { method: 'POST' });
  if (!res || !res.ok) { toast('Failed to generate report'); return; }
  const data = await res.json();
  toast('Report generated!');
  window.open(data.public_url, '_blank');
}

export function copyReportLink(url) {
  navigator.clipboard.writeText(url).then(() => toast('Link copied to clipboard'));
}

export async function deleteReport(reportId) {
  if (!confirm('Delete this report? The public link will stop working.')) return;
  const res = await apiFetch('/admin/reports/' + reportId, { method: 'DELETE' });
  if (!res || !res.ok) { toast('Failed to delete report'); return; }
  toast('Report deleted');
  loadReports();
}

// Expose globals
window.loadReports          = loadReports;
window.generateClientReport = generateClientReport;
window.copyReportLink       = copyReportLink;
window.deleteReport         = deleteReport;
