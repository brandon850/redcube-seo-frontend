import { toast, apiFetch, gradeColor, fmtDate } from '/js/utils.js';

const STATUS_LABELS = {
  'needs-follow-up': { label: 'Needs Follow Up', color: '#f59e0b' },
  'followed-up':     { label: 'Followed Up',     color: '#3b82f6' },
  'closed':          { label: 'Closed',           color: '#22c55e' },
};

export async function loadLeads() {
  const res = await apiFetch('/admin/leads');
  if (!res) return;
  const { leads } = await res.json();
  renderLeads(leads || []);
}

function renderLeads(leads) {
  const container = document.getElementById('leads-container');
  if (!leads.length) {
    container.innerHTML = `
      <div class="empty">
        <div class="empty-icon">◎</div>
        <div class="empty-title">No leads yet</div>
        <div class="empty-sub">When someone requests a free audit, they'll appear here.</div>
      </div>`;
    return;
  }

  // Summary counts
  const counts = { 'needs-follow-up': 0, 'followed-up': 0, 'closed': 0 };
  leads.forEach(l => { if (counts[l.lead_status] !== undefined) counts[l.lead_status]++; });

  container.innerHTML = `
    <!-- Summary bar -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
      ${Object.entries(STATUS_LABELS).map(([key, { label, color }]) => `
        <div style="background:var(--b1);border:1px solid var(--b3);border-top:3px solid ${color};border-radius:3px;padding:1rem;text-align:center">
          <div style="font-size:1.8rem;font-weight:900;color:${color}">${counts[key]}</div>
          <div style="font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--g3);margin-top:2px">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Leads table -->
    <div style="background:var(--b1);border:1px solid var(--b3);border-radius:3px;overflow:hidden">
      <table class="data-table" style="width:100%">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Site</th>
            <th>Grade</th>
            <th>Date</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(lead => {
            const gc     = gradeColor(lead.grade);
            const status = STATUS_LABELS[lead.lead_status] || STATUS_LABELS['needs-follow-up'];
            return `
              <tr id="lead-row-${lead.id}">
                <td>
                  <div style="font-weight:600;color:var(--white)">${lead.name || '—'}</div>
                  <div style="font-size:.68rem;color:var(--g3);margin-top:2px">
                    <a href="mailto:${lead.email}" style="color:var(--g3);text-decoration:none">${lead.email}</a>
                  </div>
                </td>
                <td>
                  <div style="font-size:.72rem;color:var(--g4)">${lead.domain || lead.url}</div>
                </td>
                <td>
                  <span style="font-size:1.1rem;font-weight:900;color:${gc}">${lead.grade || '—'}</span>
                  <span style="font-size:.65rem;color:var(--g3);margin-left:4px">${lead.overall_score || 0}/100</span>
                </td>
                <td style="color:var(--g4);font-size:.72rem">${fmtDate(lead.created_at)}</td>
                <td>
                  <select class="filter-select" style="font-size:.65rem;padding:.3rem .5rem"
                    onchange="updateLeadStatus('${lead.id}', this.value)">
                    ${Object.entries(STATUS_LABELS).map(([key, { label }]) =>
                      `<option value="${key}" ${lead.lead_status === key ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                  </select>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:.4rem">
                    <input type="text" class="kw-input"
                      id="lead-notes-${lead.id}"
                      placeholder="Add notes..."
                      value="${(lead.lead_notes || '').replace(/"/g, '&quot;')}"
                      style="font-size:.68rem;padding:.3rem .6rem;min-width:160px"
                      onblur="saveLeadNotes('${lead.id}', this.value)"
                      onkeydown="if(event.key==='Enter')saveLeadNotes('${lead.id}',this.value)">
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

export async function updateLeadStatus(leadId, status) {
  const res = await apiFetch('/admin/leads/' + leadId, {
    method: 'PATCH',
    body: JSON.stringify({ lead_status: status }),
  });
  if (!res || !res.ok) { toast('Failed to update status'); return; }
  const label = STATUS_LABELS[status]?.label || status;
  toast('Status updated to ' + label);
}

export async function saveLeadNotes(leadId, notes) {
  const res = await apiFetch('/admin/leads/' + leadId, {
    method: 'PATCH',
    body: JSON.stringify({ lead_notes: notes }),
  });
  if (!res || !res.ok) { toast('Failed to save notes'); return; }
  toast('Notes saved');
}

window.loadLeads        = loadLeads;
window.updateLeadStatus = updateLeadStatus;
window.saveLeadNotes    = saveLeadNotes;
