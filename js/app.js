import { authUser, sites, currentSiteId } from '/js/state.js';
import { showScreen } from '/js/utils.js';

const PANEL_TITLES = {
  overview: 'Overview', sites: 'Sites', keywords: 'Keyword Tracking',
  content: 'Content', reports: 'Client Reports', team: 'Team',
};

export async function initApp() {
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

  if (panel === 'overview') { const { renderOverview } = await import('/js/sites.js'); renderOverview(); }
  if (panel === 'sites')    { const { renderSitesList } = await import('/js/sites.js'); renderSitesList(); }
  if (panel === 'keywords') { const { loadKeywordsPanel } = await import('/js/keywords.js'); loadKeywordsPanel(); }
  if (panel === 'content')  { const { loadContentPanel } = await import('/js/content.js'); loadContentPanel(); }
  if (panel === 'reports')  { const { loadReports } = await import('/js/reports.js'); loadReports(); }
  if (panel === 'team')     { const { loadTeam } = await import('/js/team.js'); loadTeam(); }
}

export function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const tabMap = {
    'pages':         'tab-pages',
    'checklist':     'tab-checklist',
    'keywords-site': 'tab-keywords-site',
    'content-site':  'tab-content-site',
  };
  document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(tabMap[tab])?.classList.add('active');
}

// Expose globals needed by inline HTML onclick handlers
window.navTo     = navTo;
window.switchTab = switchTab;
