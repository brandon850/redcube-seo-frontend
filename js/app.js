import { showScreen } from '/js/utils.js';

const PANEL_TITLES = { overview:'Overview', sites:'Sites', keywords:'Keyword Tracking', content:'Content', reports:'Client Reports', leads:'Leads', team:'Team' };

export async function initApp() {
  const { authUser } = await import('/js/state.js');
  showScreen('screen-app');
  document.getElementById('sb-user-label').textContent = authUser?.email || '—';
  const { loadSites } = await import('/js/sites.js');
  await loadSites();
  navTo('overview');
}

export async function navTo(panel) {
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.sb-item[data-panel="${panel}"]`)?.classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + panel)?.classList.add('active');
  document.getElementById('topbar-title').textContent = PANEL_TITLES[panel] || panel;
  document.getElementById('topbar-actions').innerHTML = '';

  if (panel === 'overview') { const m = await import('/js/sites.js');    m.renderOverview(); }
  if (panel === 'sites')    { const m = await import('/js/sites.js');    m.renderSitesList(); }
  if (panel === 'keywords') { const m = await import('/js/keywords.js'); m.loadKeywordsPanel(); }
  if (panel === 'content')  { const m = await import('/js/content.js');  m.loadContentPanel(); }
  if (panel === 'reports')  { const m = await import('/js/reports.js');  m.loadReports(); }
  if (panel === 'team')     { const m = await import('/js/team.js');     m.loadTeam(); }
  if (panel === 'leads')    { const m = await import('/js/leads.js');    m.loadLeads(); }
  if (panel === 'leads')    { const m = await import('/js/leads.js');    m.loadLeads(); }
}

export function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const tabMap = { pages:'tab-pages', checklist:'tab-checklist', 'keywords-site':'tab-keywords-site', 'content-site':'tab-content-site' };
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(tabMap[tab])?.classList.add('active');
}

window.navTo     = navTo;
window.switchTab = switchTab;
