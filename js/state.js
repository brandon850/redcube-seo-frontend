// ════════════════════════════════════════
//  Shared application state
//  All modules import what they need from here
// ════════════════════════════════════════

export const API = window.API_BASE;

// Auth
export let authToken = localStorage.getItem('rc_token') || null;
export let authUser  = JSON.parse(localStorage.getItem('rc_user') || 'null');

// Data
export let sites           = [];
export let currentSiteId   = null;
export let allPages        = [];
export let allChecklist    = [];
export let allKeywords     = [];
export let allContent      = [];
export let allKeywordGroups = [];
export let editingDraftId  = null;

// Pagination
export let checklistPage        = 1;
export const CHECKLIST_PER_PAGE = 25;

// ── Setters ──────────────────────────────────────
// ES modules export bindings, not values — modules
// must call these setters to update shared state.

export function setAuthToken(v)        { authToken = v; if (v) localStorage.setItem('rc_token', v); }
export function setAuthUser(v)         { authUser  = v; if (v) localStorage.setItem('rc_user', JSON.stringify(v)); }
export function clearAuth()            { authToken = null; authUser = null; localStorage.removeItem('rc_token'); localStorage.removeItem('rc_user'); }

export function setSites(v)            { sites           = v; }
export function setCurrentSiteId(v)    { currentSiteId   = v; }
export function setAllPages(v)         { allPages        = v; }
export function setAllChecklist(v)     { allChecklist    = v; }
export function setAllKeywords(v)      { allKeywords     = v; }
export function setAllContent(v)       { allContent      = v; }
export function setAllKeywordGroups(v) { allKeywordGroups = v; }
export function setChecklistPage(v)    { checklistPage   = v; }
