import * as State from '/js/state.js';

export function toast(msg, dur = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

export function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
export function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

export function gradeColor(g) {
  return { 'A+':'#22c55e','A':'#22c55e','B+':'#84cc16','B':'#84cc16',
           'C+':'#f59e0b','C':'#f97316','D':'#ef4444','F':'#dc2626' }[g] || '#888';
}

export function scoreColor(s) {
  return s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';
}

export function relativeTime(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

export async function apiFetch(path, opts = {}) {
  // Read current token from state module at call time (not cached at import time)
  const token = State.authToken;
  const res   = await fetch(State.API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    const { doLogout } = await import('/js/auth.js');
    doLogout();
    return null;
  }
  return res;
}
