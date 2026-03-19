import * as State from './state.js';
import { setAuthToken, setAuthUser, clearAuth } from './state.js';
import { toast, showScreen } from './utils.js';

export async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.querySelector('.btn-login');

  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Please enter email and password.'; return; }

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const res  = await fetch(State.API + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { errEl.textContent = data.error || 'Invalid credentials.'; return; }

    setAuthToken(data.token);
    setAuthUser(data.user);

    const { initApp } = await import('./app.js');
    initApp();
  } catch (err) {
    console.error('[login]', err);
    errEl.textContent = 'Could not reach the server. Check your connection.';
  } finally {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
  }
}

export function doLogout() {
  clearAuth();
  showScreen('screen-login');
}

export async function boot() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('gsc_connected')) {
    const siteId = params.get('site_id');
    history.replaceState({}, '', '/dashboard');
    if (State.authToken && State.authUser) {
      const { initApp } = await import('./app.js');
      await initApp();
      if (siteId) {
        const { openSiteDetail } = await import('./sites.js');
        openSiteDetail(siteId);
      }
    } else {
      showScreen('screen-login');
    }
    return;
  }

  if (params.get('gsc_error')) {
    history.replaceState({}, '', '/dashboard');
    toast('GSC connection error: ' + params.get('gsc_error'));
  }

  if (State.authToken && State.authUser) {
    const { initApp } = await import('./app.js');
    initApp();
  } else {
    showScreen('screen-login');
  }
}
