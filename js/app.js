'use strict';

const APP_VERSION = '4.3.7';
const APP_NAME = 'CruiseSip';
const DB_NAME = 'cruisesip_v4';
const LEGACY_DB_NAME = 'gt_db_v3';
const DB_VERSION = 1;
const CACHE_HINT = 'GitHub Pages / PWA / Offline';

const STORE_NAMES = ['settings', 'trips', 'persons', 'drinks', 'logs', 'imports', 'barkarten'];
const PERSON_COLORS = ['#e0f2fe', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe', '#ffedd5', '#ccfbf1', '#f1f5f9'];
const QUICK_TERMS = ['kaffee', 'cappuccino', 'latte', 'espresso', 'kakao', 'tee', 'cola', 'fanta', 'sprite', 'wasser', 'apfelsaft', 'orangensaft', 'aida iced tea', 'aida lemonade', 'dodo', 'milchshake', 'radeberger', 'aperol', 'hugo', 'sprizz'];
const DRINK_SORT_OPTIONS = [
  { id: 'frequent', label: 'Häufig genutzt' },
  { id: 'recent', label: 'Zuletzt genutzt' },
  { id: 'priceAsc', label: 'Preis aufsteigend' },
  { id: 'priceDesc', label: 'Preis absteigend' },
  { id: 'alphabetical', label: 'Alphabetisch' }
];

let db;
let state = {
  route: 'dashboard',
  settings: {},
  trips: [],
  persons: [],
  drinks: [],
  logs: [],
  packages: [],
  imports: [],
  barkarten: [],
  currentTripId: null,
  selectedPersonId: null,
  editingTripId: null,
  editingPersonId: null,
  editingLogId: null,
  query: '',
  category: 'Empfohlen',
  historyFilter: 'today',
  statsFilter: 'trip',
  statsPersonId: null,
  articleQuery: '',
  editingDrinkId: null,
  undoLog: null,
  formDraft: { trip: {}, person: {}, device: {}, onboardingTrip: {}, log: {} },
  pendingFileMode: null,
  lastBarkarteComparison: null,
  online: navigator.onLine
};

const actionLocks = Object.create(null);
let undoAutoHideTimer = null;
let swRegistration = null;
let swUpdateCheckRunning = false;
let swControllerChangeHandled = false;
let swReloadFallbackTimer = null;
let swUpdateState = 'unknown';

async function runActionOnce(key, handler) {
  if (actionLocks[key]) return actionLocks[key];
  actionLocks[key] = Promise.resolve()
    .then(handler)
    .catch(error => {
      console.error(error);
      alert(`Aktion konnte nicht ausgeführt werden: ${error.message || error}`);
    })
    .finally(() => { actionLocks[key] = null; });
  return actionLocks[key];
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const nowIso = () => new Date().toISOString();
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const yStart = () => todayStart() - 86400000;
const eur = (value) => (Number(value) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const num = (value) => Number(String(value ?? '').replace(',', '.')) || 0;
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const short = (value, max = 32) => { const s = String(value || ''); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (value) => normalize(value).replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || `drink_${uid()}`;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const deviceUid = () => `dev_${uid()}_${Math.random().toString(36).slice(2, 6)}`;
const haptic = () => { try { if ('vibrate' in navigator) navigator.vibrate(8); } catch (_) {} };

function openDb(name = DB_NAME, version = DB_VERSION, stores = STORE_NAMES) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      stores.forEach(store => {
        if (!database.objectStoreNames.contains(store)) database.createObjectStore(store, { keyPath: 'id' });
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(store, mode = 'readonly') { return db.transaction(store, mode).objectStore(store); }
function reqToPromise(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
function all(store) { return reqToPromise(tx(store).getAll()); }
function get(store, id) { return reqToPromise(tx(store).get(id)); }
function writeStore(store, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    let request;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error || transaction.error || request?.error || new Error('IndexedDB-Schreibvorgang fehlgeschlagen.'));
    };
    try {
      request = operation(objectStore);
    } catch (error) {
      try { transaction.abort(); } catch (_) {}
      fail(error);
      return;
    }
    request.onerror = () => {
      try { transaction.abort(); } catch (_) {}
      fail(request.error);
    };
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(request?.result);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error || request?.error);
  });
}
function put(store, obj) { return writeStore(store, objectStore => objectStore.put(obj)); }
function del(store, id) { return writeStore(store, objectStore => objectStore.delete(id)); }
function clearStore(store) { return writeStore(store, objectStore => objectStore.clear()); }
async function putSetting(id, value) { await put('settings', { id, value, updatedAt: nowIso() }); state.settings[id] = value; }
async function getSetting(id) { const row = await get('settings', id); return row ? row.value : undefined; }
function formValue(form, name) { return form?.elements?.namedItem(name)?.value ?? ''; }
function setFormValue(form, name, value) {
  const element = form?.elements?.namedItem(name);
  if (element) element.value = value ?? '';
}
function fieldValue(selector, fallbackForm = null, fallbackName = '') {
  const element = $(selector);
  if (element) return element.value ?? '';
  return fallbackName ? formValue(fallbackForm, fallbackName) : '';
}
function setFieldValue(selector, value) {
  const element = $(selector);
  if (element) element.value = value ?? '';
}
function bindDirectAction(selector, key, handler) {
  const element = $(selector);
  if (!element || element.dataset.directBound === '1') return;
  element.dataset.directBound = '1';
  const run = event => {
    event.preventDefault();
    event.stopPropagation();
    runActionOnce(key, handler);
  };
  element.addEventListener('click', run);
}

function setButtonBusy(selector, busy) {
  const element = $(selector);
  if (!element) return;
  element.disabled = !!busy;
  element.classList.toggle('isBusy', !!busy);
}


async function tryLegacyMigration() {
  const done = await getSetting('legacyMigrationV3Done');
  if (done) return;
  try {
    const legacy = await openDb(LEGACY_DB_NAME, 7, ['settings', 'persons', 'drinks', 'logs', 'trips']);
    const legacyAll = (store) => new Promise((resolve, reject) => {
      if (!legacy.objectStoreNames.contains(store)) return resolve([]);
      const r = legacy.transaction(store).objectStore(store).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
    const existingLogs = await all('logs');
    if (!existingLogs.length) {
      for (const store of ['settings', 'trips', 'persons', 'drinks', 'logs']) {
        const rows = await legacyAll(store);
        for (const row of rows) await put(store, row);
      }
    }
    legacy.close();
    await putSetting('legacyMigrationV3Done', true);
  } catch (_) {
    await putSetting('legacyMigrationV3Done', true);
  }
}

async function bootstrap() {
  db = await openDb();
  await tryLegacyMigration();
  await loadStaticData();
  await ensureDefaults();
  await loadState();
  bindShell();
  setOnlineState();
  window.addEventListener('online', setOnlineState);
  window.addEventListener('offline', setOnlineState);
  if (!state.settings.onboardingComplete) state.route = 'onboarding';
  render();
  registerServiceWorker();
}

async function loadStaticData() {
  state.packages = await fetch('data/pakete.json').then(r => r.json()).catch(() => []);
  const data = await fetch('data/barkarte.json').then(r => r.json()).catch(() => ({ version: 'unknown', source: 'lokal', drinks: [] }));
  const existingDrinks = await all('drinks');
  const current = await getSetting('barkarteVersion');
  if (!existingDrinks.length) {
    for (const drink of normalizeDrinks(data.drinks || [])) await put('drinks', drink);
  }
  if (!(await get('barkarten', data.version))) {
    await put('barkarten', { id: data.version || `barkarte_${uid()}`, version: data.version || 'unknown', source: data.source || 'Stammdaten', importedAt: nowIso(), count: (data.drinks || []).length, isDefault: true });
  }
  if (!current) await putSetting('barkarteVersion', { version: data.version || 'unknown', source: data.source || 'Stammdaten', count: (data.drinks || []).length, updatedAt: nowIso() });
  await putSetting('appVersion', APP_VERSION);
}

async function ensureDefaults() {
  if (!(await getSetting('deviceId'))) await putSetting('deviceId', deviceUid());
  if (!(await getSetting('deviceName'))) await putSetting('deviceName', 'Mein iPhone');
  if (!(await getSetting('favorites'))) await putSetting('favorites', []);
  if (!(await getSetting('theme'))) await putSetting('theme', 'system');
  if (!(await getSetting('drinkSort'))) await putSetting('drinkSort', 'frequent');
  const trips = await all('trips');
  if (!trips.length) {
    const trip = { id: `trip_${uid()}`, name: 'Aktuelle Reise', ship: '', startDate: '', endDate: '', archived: false, createdAt: nowIso(), updatedAt: nowIso() };
    await put('trips', trip);
    await putSetting('currentTripId', trip.id);
  }
  await migrateRowsToV4();
}

async function migrateRowsToV4() {
  const deviceId = await getSetting('deviceId');
  const deviceName = await getSetting('deviceName');
  const currentTripId = await getSetting('currentTripId');
  const trips = await all('trips');
  const fallbackTrip = currentTripId || trips[0]?.id;
  for (const person of await all('persons')) {
    let changed = false;
    if (!person.tripId && fallbackTrip) { person.tripId = fallbackTrip; changed = true; }
    if (!person.color) { person.color = PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)]; changed = true; }
    if (changed) await put('persons', person);
  }
  for (const log of await all('logs')) {
    let changed = false;
    if (!log.tripId && fallbackTrip) { log.tripId = fallbackTrip; changed = true; }
    if (!log.trackedByDeviceId) { log.trackedByDeviceId = deviceId; changed = true; }
    if (!log.trackedByDeviceName) { log.trackedByDeviceName = deviceName; changed = true; }
    if (!log.mergeKey) { log.mergeKey = `${log.trackedByDeviceId || deviceId}:${log.originId || log.id}`; changed = true; }
    if (typeof log.packageStatus !== 'string') { log.packageStatus = log.status || 'unclear'; changed = true; }
    if (changed) await put('logs', log);
  }
}

async function loadState() {
  const settingsRows = await all('settings');
  state.settings = Object.fromEntries(settingsRows.map(r => [r.id, r.value]));
  state.trips = (await all('trips')).sort((a, b) => Number(a.archived || false) - Number(b.archived || false) || String(b.startDate || '').localeCompare(String(a.startDate || '')));
  state.persons = await all('persons');
  state.drinks = (await all('drinks')).sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  state.logs = (await all('logs')).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  state.imports = (await all('imports')).sort((a, b) => String(b.importedAt || '').localeCompare(String(a.importedAt || '')));
  state.barkarten = await all('barkarten');
  state.currentTripId = state.settings.currentTripId || state.trips.find(t => !t.archived)?.id || state.trips[0]?.id || null;
  if (!state.trips.find(t => t.id === state.currentTripId) && state.trips[0]) state.currentTripId = state.trips[0].id;
  if (state.currentTripId && state.settings.currentTripId !== state.currentTripId) {
    await put('settings', { id: 'currentTripId', value: state.currentTripId, updatedAt: nowIso() });
    state.settings.currentTripId = state.currentTripId;
  }
  const personsForTrip = currentPersons();
  const storedPersonId = state.settings[selectedPersonSettingKey()] || null;
  const currentIsValid = personsForTrip.some(person => person.id === state.selectedPersonId);
  const storedIsValid = personsForTrip.some(person => person.id === storedPersonId);
  if (!currentIsValid) state.selectedPersonId = storedIsValid ? storedPersonId : (personsForTrip[0]?.id || null);
  if (state.selectedPersonId && storedPersonId !== state.selectedPersonId) {
    await putSetting(selectedPersonSettingKey(), state.selectedPersonId);
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swUpdateState = 'unsupported';
    updateSettingsUpdateStatus();
    return;
  }
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    swUpdateState = swRegistration.waiting ? 'ready' : 'current';

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (swControllerChangeHandled) return;
      swControllerChangeHandled = true;
      clearTimeout(swReloadFallbackTimer);
      window.location.reload();
    });

    const watchInstallingWorker = worker => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          swUpdateState = 'ready';
          showUpdateDock();
          updateSettingsUpdateStatus();
        }
      });
    };

    watchInstallingWorker(swRegistration.installing);
    swRegistration.addEventListener('updatefound', () => {
      swUpdateState = 'checking';
      updateSettingsUpdateStatus();
      watchInstallingWorker(swRegistration.installing);
    });

    if (swRegistration.waiting && navigator.serviceWorker.controller) showUpdateDock();
    await checkForAppUpdate({ silent: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) checkForAppUpdate({ silent: true });
    });
    window.addEventListener('online', () => checkForAppUpdate({ silent: true }));
  } catch (error) {
    console.warn('Service Worker konnte nicht registriert werden.', error);
    swUpdateState = 'error';
    updateSettingsUpdateStatus();
  }
}

function updateStateLabel() {
  if (swUpdateState === 'ready') return 'Neue Version bereit';
  if (swUpdateState === 'checking') return 'Prüfung läuft';
  if (swUpdateState === 'current') return `Version ${APP_VERSION} aktiv`;
  if (swUpdateState === 'offline') return 'Offline - Prüfung nicht möglich';
  if (swUpdateState === 'unsupported') return 'Nicht unterstützt';
  if (swUpdateState === 'error') return 'Prüfung fehlgeschlagen';
  return 'Noch nicht geprüft';
}

function updateSettingsUpdateStatus() {
  const element = $('#updateStatusValue');
  if (element) element.textContent = updateStateLabel();
}

function showUpdateDock() {
  const dock = $('#updateDock');
  if (!dock) return;
  dock.innerHTML = `<div><b>Neue CruiseSip-Version bereit</b><span>Lokale Reisen, Personen und Getränke bleiben erhalten.</span></div><button class="primary mini" data-action="applyAppUpdate">Jetzt aktualisieren</button>`;
  dock.hidden = false;
}

function hideUpdateDock() {
  const dock = $('#updateDock');
  if (dock) dock.hidden = true;
}

async function checkForAppUpdate({ silent = false } = {}) {
  if (!swRegistration || swUpdateCheckRunning) return;
  if (!navigator.onLine) {
    swUpdateState = 'offline';
    updateSettingsUpdateStatus();
    if (!silent) toast('Update-Prüfung benötigt eine Internetverbindung.');
    return;
  }
  swUpdateCheckRunning = true;
  swUpdateState = 'checking';
  updateSettingsUpdateStatus();
  if (!silent) toast('CruiseSip prüft auf Updates …');
  try {
    await swRegistration.update();
    if (swRegistration.waiting) {
      swUpdateState = 'ready';
      showUpdateDock();
      if (!silent) toast('Neue Version ist bereit.');
    } else if (swRegistration.installing) {
      swUpdateState = 'checking';
      if (!silent) toast('Neue Version wird vorbereitet …');
    } else {
      swUpdateState = 'current';
      if (!silent) toast(`Version ${APP_VERSION} ist aktuell.`);
    }
  } catch (error) {
    console.warn('Update-Prüfung fehlgeschlagen.', error);
    swUpdateState = 'error';
    if (!silent) toast('Update-Prüfung konnte nicht abgeschlossen werden.');
  } finally {
    swUpdateCheckRunning = false;
    updateSettingsUpdateStatus();
  }
}

async function applyAppUpdate() {
  const waiting = swRegistration?.waiting;
  if (!waiting) {
    await checkForAppUpdate({ silent: false });
    return;
  }
  hideUpdateDock();
  toast('Update wird übernommen …');
  waiting.postMessage({ type: 'SKIP_WAITING' });
  clearTimeout(swReloadFallbackTimer);
  swReloadFallbackTimer = setTimeout(() => window.location.reload(), 3500);
}

function setOnlineState() {
  state.online = navigator.onLine;
  document.documentElement.dataset.online = state.online ? 'online' : 'offline';
  const dot = $('#onlineDot');
  if (dot) dot.textContent = state.online ? 'Online' : 'Offline';
}

function scheduleViewportLayout() {
  requestAnimationFrame(syncViewportLayout);
}

function syncViewportLayout() {
  const nav = $('.bottomNav');
  if (nav) {
    const navHeight = Math.ceil(nav.getBoundingClientRect().height || nav.offsetHeight || 78);
    document.documentElement.style.setProperty('--bottomNavHeight', `${navHeight}px`);
  }
  if (state.route !== 'track') return;
  const drinkList = $('#drinkList');
  const navRect = nav ? nav.getBoundingClientRect() : null;
  if (!drinkList || !navRect) return;
  const listTop = drinkList.getBoundingClientRect().top;
  const available = Math.floor(navRect.top - listTop - 10);
  const height = Math.max(180, available);
  document.documentElement.style.setProperty('--trackListHeight', `${height}px`);
}

function bindShell() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleLogEditDerivedChange, true);
  document.addEventListener('input', preserveFormDraft, true);
  document.addEventListener('change', preserveFormDraft, true);
  document.addEventListener('submit', handleSubmit);
  $('#fileInput').addEventListener('change', handleFileInput);
  window.addEventListener('resize', scheduleViewportLayout);
  window.addEventListener('orientationchange', () => setTimeout(scheduleViewportLayout, 250));
  const themeMedia = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (themeMedia?.addEventListener) themeMedia.addEventListener('change', () => {
    if (!['light', 'dark'].includes(state.settings.theme)) applyTheme();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleViewportLayout);
    window.visualViewport.addEventListener('scroll', scheduleViewportLayout);
  }
}

function draftSectionForForm(formId) {
  if (formId === 'tripForm') return 'trip';
  if (formId === 'personForm') return 'person';
  if (formId === 'deviceForm') return 'device';
  if (formId === 'onboardingTripForm') return 'onboardingTrip';
  if (formId === 'logEditForm') return 'log';
  return null;
}
function preserveFormDraft(event) {
  const field = event.target;
  if (!field || !field.matches || !field.matches('input, textarea, select')) return;
  const form = field.closest('form');
  const section = draftSectionForForm(form?.id || '');
  if (!section || !field.name) return;
  state.formDraft[section] = state.formDraft[section] || {};
  state.formDraft[section][field.name] = field.value;
  if (form?.id === 'logEditForm' && field.name === 'price' && event.isTrusted !== false) {
    state.formDraft.log.priceManuallyChanged = true;
  }
}
function handleLogEditDerivedChange(event) {
  const field = event.target;
  if (!field?.matches?.('#logEditForm select[name="personId"], #logEditForm select[name="drinkId"]')) return;
  const form = field.closest('#logEditForm');
  if (!form) return;
  state.formDraft.log = state.formDraft.log || {};
  state.formDraft.log[field.name] = field.value;
  syncLogEditDerivedFields(form, field.name);
}
function draftValue(section, name, fallback = '') {
  const draft = state.formDraft?.[section];
  return draft && Object.prototype.hasOwnProperty.call(draft, name) ? draft[name] : fallback;
}
function clearDraft(section) {
  if (!state.formDraft) state.formDraft = { trip: {}, person: {}, device: {}, onboardingTrip: {}, log: {} };
  state.formDraft[section] = {};
}

async function handleClick(event) {
  if (event.target.closest('input, textarea, select, option')) return;
  const target = event.target.closest('[data-action], [data-route]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.route) {
    state.route = target.dataset.route;
    state.query = '';
    if (state.route !== 'history') { state.editingLogId = null; clearDraft('log'); }
    render();
    haptic();
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action) return;

  if (action === 'finishOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; await loadState(); render(); return; }
  if (action === 'setTheme') { await setTheme(id); return; }
  if (action === 'checkAppUpdate') { await checkForAppUpdate({ silent: false }); return; }
  if (action === 'applyAppUpdate') { await applyAppUpdate(); return; }
  if (action === 'skipOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; render(); return; }
  if (action === 'setTrip') { await putSetting('currentTripId', id); state.currentTripId = id; state.selectedPersonId = preferredPersonIdForTrip(id); render(); return; }
  if (action === 'editTrip') { fillTripForm(id); return; }
  if (action === 'archiveTrip') { await toggleArchiveTrip(id); return; }
  if (action === 'deleteTrip') { await deleteTrip(id); return; }
  if (action === 'resetTripForm') { fillTripForm(null); return; }
  if (action === 'saveTrip') { await runActionOnce('saveTrip', () => saveTripForm($('#tripForm'))); return; }
  if (action === 'selectPerson') {
    const person = currentPersons().find(row => row.id === id);
    if (!person || person.id === state.selectedPersonId) return;
    state.selectedPersonId = person.id;
    await putSetting(selectedPersonSettingKey(), person.id);
    renderTrackPersonContext();
    toast(`Getränke für ${person.name}`);
    haptic();
    return;
  }
  if (action === 'editPerson') { fillPersonForm(id); return; }
  if (action === 'deletePerson') { await deletePerson(id); return; }
  if (action === 'resetPersonForm') { fillPersonForm(null); return; }
  if (action === 'savePerson') { await runActionOnce('savePerson', () => savePersonForm($('#personForm'))); return; }
  if (action === 'saveDevice') { await runActionOnce('saveDevice', () => saveDeviceForm($('#deviceForm'))); return; }
  if (action === 'setCategory') { state.category = id; renderTrackList(); renderCategoryChips(); return; }
  if (action === 'setHistoryFilter') { state.historyFilter = id; state.editingLogId = null; clearDraft('log'); render(); return; }
  if (action === 'setStatsFilter') { state.statsFilter = id; render(); return; }
  if (action === 'showStatsPerson') { state.statsPersonId = id; render(); return; }
  if (action === 'backStatsDashboard') { state.statsPersonId = null; render(); return; }
  if (action === 'editArticle') { editArticle(id); return; }
  if (action === 'resetArticleForm') { editArticle(null); return; }
  if (action === 'saveArticle') { await runActionOnce('saveArticle', () => saveDrinkArticleForm($('#articleForm'))); return; }
  if (action === 'trackDrink') { await trackDrink(id); return; }
  if (action === 'toggleFavorite') { await toggleFavorite(id); renderTrackList(); renderDashboardQuick(); return; }
  if (action === 'undo') { await undoLast(); return; }
  if (action === 'editLog') { editLog(id); return; }
  if (action === 'cancelEditLog') { cancelEditLog(); return; }
  if (action === 'saveLog') { await runActionOnce('saveLog', () => saveLogForm($('#logEditForm'))); return; }
  if (action === 'deleteLog') { await deleteLog(id); return; }
  if (action === 'exportTrip') { exportTrip(); return; }
  if (action === 'backupTest') { backupTest(); return; }
  if (action === 'importTrip') { openFile('trip'); return; }
  if (action === 'importBarkarte') { openFile('barkarte'); return; }
  if (action === 'clearImportLog') { await clearStore('imports'); await loadState(); render(); return; }
  if (action === 'showChangelog') { state.route = 'changelog'; render(); return; }
  if (action === 'reRunOnboarding') { state.route = 'onboarding'; render(); return; }
}

async function handleSubmit(event) {
  if (!event.target.matches('form')) return;
  event.preventDefault();
  const form = event.target;
  const formId = form.getAttribute('id') || '';
  if (formId === 'tripForm') await runActionOnce('saveTrip', () => saveTripForm(form));
  if (formId === 'personForm') await runActionOnce('savePerson', () => savePersonForm(form));
  if (formId === 'deviceForm') await runActionOnce('saveDevice', () => saveDeviceForm(form));
  if (formId === 'articleForm') await runActionOnce('saveArticle', () => saveDrinkArticleForm(form));
  if (formId === 'logEditForm') await runActionOnce('saveLog', () => saveLogForm(form));
  if (formId === 'onboardingTripForm') await saveOnboardingTrip(form);
}

function openFile(mode) {
  state.pendingFileMode = mode;
  const input = $('#fileInput');
  input.value = '';
  input.accept = mode === 'barkarte' ? '.json,.csv,application/json,text/csv' : '.json,application/json';
  input.click();
}

async function handleFileInput(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    if (state.pendingFileMode === 'trip') await importTrip(text, file.name);
    if (state.pendingFileMode === 'barkarte') await importBarkarte(text, file.name);
  } catch (error) {
    alert(`Import nicht möglich: ${error.message || error}`);
  } finally {
    state.pendingFileMode = null;
    event.target.value = '';
  }
}

function activeTripId() {
  const preferred = state.currentTripId || state.settings.currentTripId || '';
  if (preferred && state.trips.some(t => t.id === preferred)) return preferred;
  return state.trips.find(t => !t.archived)?.id || state.trips[0]?.id || null;
}
function currentTrip() {
  const id = activeTripId();
  return state.trips.find(t => t.id === id) || state.trips[0] || null;
}
function currentPersons() {
  const id = activeTripId();
  if (!id) return [];
  return state.persons.filter(p => (p.tripId || id) === id);
}
function selectedPersonSettingKey(tripId = activeTripId()) { return tripId ? `selectedPersonId:${tripId}` : 'selectedPersonId'; }
function preferredPersonIdForTrip(tripId = activeTripId()) {
  if (!tripId) return null;
  const persons = state.persons.filter(person => (person.tripId || tripId) === tripId);
  const storedId = state.settings[selectedPersonSettingKey(tripId)] || null;
  return persons.some(person => person.id === storedId) ? storedId : (persons[0]?.id || null);
}
function currentLogs() {
  const id = activeTripId();
  if (!id) return [];
  return state.logs.filter(l => (l.tripId || id) === id);
}
function favoriteIds() { return Array.isArray(state.settings.favorites) ? state.settings.favorites : []; }
function activeBarkarteVersion() { return state.settings.barkarteVersion || { version: 'unbekannt', source: 'nicht gesetzt', count: state.drinks.length }; }

function packageName(id) { return state.packages.find(p => p.id === id)?.name || id || 'Kein Paket'; }
function statusForDrink(drink, packageId) {
  if (!packageId || packageId === 'none') return 'not_included';
  if (packageId === 'unclear') return 'unclear';
  return drink.packages?.[packageId] || 'unclear';
}
function statusLabel(status) { return status === 'included' ? 'enthalten' : status === 'not_included' ? 'nicht enthalten' : 'unklar'; }
function statusClass(status) { return status === 'included' ? 'ok' : status === 'not_included' ? 'bad' : 'warn'; }
function statusDot(status) { return `<i class="statusDot ${statusClass(status)}"></i>`; }

function logsByFilter(filter = state.historyFilter, logs = currentLogs()) {
  if (filter === 'today') return logs.filter(l => Number(l.ts) >= todayStart());
  if (filter === 'yesterday') return logs.filter(l => Number(l.ts) >= yStart() && Number(l.ts) < todayStart());
  return logs;
}
function calc(logs = currentLogs()) {
  return logs.reduce((acc, log) => {
    const price = Number(log.price) || 0;
    acc.count += 1;
    acc.value += price;
    if (log.packageStatus === 'included') acc.saved += price;
    else acc.paid += price;
    if (log.packageStatus === 'unclear') acc.unclear += price;
    return acc;
  }, { count: 0, value: 0, saved: 0, paid: 0, unclear: 0 });
}
function personById(id) { return state.persons.find(p => p.id === id); }
function drinkById(id) { return state.drinks.find(d => d.id === id); }

function render() {
  const view = $('#view');
  updateShell();
  if (state.route === 'onboarding') view.innerHTML = viewOnboarding();
  else if (state.route === 'dashboard') view.innerHTML = viewDashboard();
  else if (state.route === 'track') view.innerHTML = viewTrack();
  else if (state.route === 'history') view.innerHTML = viewHistory();
  else if (state.route === 'stats') view.innerHTML = viewStats();
  else if (state.route === 'trips') view.innerHTML = viewTrips();
  else if (state.route === 'devices') view.innerHTML = viewDevices();
  else if (state.route === 'barkarte') view.innerHTML = viewBarkarte();
  else if (state.route === 'settings') view.innerHTML = viewSettings();
  else if (state.route === 'changelog') view.innerHTML = viewChangelog();
  else view.innerHTML = viewDashboard();
  bindInputs();
  bindRenderedControls();
  bindTrackSortControl();
  updateUndoDock();
  setOnlineState();
  scheduleViewportLayout();
  if (state.route === 'track') requestAnimationFrame(() => centerActivePersonQuickSwitch(view));
}

function effectiveTheme() {
  if (state.settings.theme === 'light' || state.settings.theme === 'dark') return state.settings.theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const theme = effectiveTheme();
  document.documentElement.dataset.theme = theme;
  const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
  const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
  const selectedColor = theme === 'dark' ? '#05070b' : '#f5f5f7';
  if (state.settings.theme === 'light' || state.settings.theme === 'dark') {
    if (lightMeta) lightMeta.content = selectedColor;
    if (darkMeta) darkMeta.content = selectedColor;
  } else {
    if (lightMeta) lightMeta.content = '#f5f5f7';
    if (darkMeta) darkMeta.content = '#05070b';
  }
}

async function setTheme(theme) {
  if (!['light', 'dark'].includes(theme)) return;
  await putSetting('theme', theme);
  applyTheme();
  render();
  toast(theme === 'dark' ? 'Dunkle Ansicht aktiviert' : 'Helle Ansicht aktiviert');
  haptic();
}

function updateShell() {
  const trip = currentTrip();
  $('#appVersion').textContent = `v${APP_VERSION}`;
  $('#tripTitle').textContent = state.route === 'track' ? `Tracken${trip ? ' · ' + short(trip.name, 18) : ''}` : (trip ? short(trip.name, 24) : 'Keine Reise');
  $('#onlineDot').textContent = state.online ? 'Online' : 'Offline';
  $$('.navButton').forEach(b => b.classList.toggle('active', b.dataset.route === state.route || (state.route === 'onboarding' && b.dataset.route === 'settings')));
  applyTheme();
  document.documentElement.dataset.route = state.route || 'dashboard';
}

function bindRenderedControls() {
  bindDirectAction('#tripSaveButton', 'saveTrip', () => saveTripForm($('#tripForm')));
  bindDirectAction('#personSaveButton', 'savePerson', () => savePersonForm($('#personForm')));
  bindDirectAction('#deviceSaveButton', 'saveDevice', () => saveDeviceForm($('#deviceForm')));
  bindDirectAction('#logSaveButton', 'saveLog', () => saveLogForm($('#logEditForm')));
}

function bindInputs() {
  const search = $('#drinkSearch');
  if (search) {
    search.value = state.query;
    search.addEventListener('input', event => {
      state.query = event.target.value;
      renderTrackList();
    });
    search.addEventListener('search', event => {
      state.query = event.target.value;
      renderTrackList();
    });
  }
  const articleSearch = $('#articleSearch');
  if (articleSearch) {
    articleSearch.value = state.articleQuery || '';
    articleSearch.addEventListener('input', event => {
      state.articleQuery = event.target.value;
      renderArticleList();
    });
    articleSearch.addEventListener('search', event => {
      state.articleQuery = event.target.value;
      renderArticleList();
    });
  }
  const dateInputs = $$('.dateDefaultToday');
  dateInputs.forEach(input => { if (!input.value) input.value = new Date().toISOString().slice(0, 10); });
}

function viewOnboarding() {
  const barkarte = activeBarkarteVersion();
  const sw = 'serviceWorker' in navigator;
  const hasPersons = currentPersons().length > 0;
  return `
    <section class="screen onboardingScreen">
      <div class="heroCard appHero">
        <div class="appIconLarge"></div>
        <div><p class="eyebrow">CruiseSip ${esc(APP_VERSION)}</p><h1>Offline bereit für die Kreuzfahrt.</h1><p>Einmal über GitHub Pages öffnen, zum Home-Bildschirm hinzufügen und danach lokal weiter tracken.</p></div>
      </div>
      <div class="stepGrid">
        ${onboardingStep('1', 'Offline-Einrichtung', 'Die App speichert Reise, Personen, Getränke und Verlauf lokal in IndexedDB. Keine Cloud, kein Backend, keine externen Skripte.', 'ok')}
        ${onboardingStep('2', 'Zum Home-Bildschirm', 'iPhone: Teilen-Symbol in Safari öffnen → „Zum Home-Bildschirm“ → „Hinzufügen“. Danach CruiseSip wie eine App starten.', 'neutral')}
        ${onboardingStep('3', 'Geräteprüfung', `Geräte-ID: <span class="mono">${esc(state.settings.deviceId)}</span><br>Gerätename kann später in „Geräte“ angepasst werden.`, state.settings.deviceId ? 'ok' : 'warn')}
        ${onboardingStep('4', 'Offline-Status', `${sw ? 'Service Worker verfügbar.' : 'Service Worker nicht verfügbar.'} Aktueller Status: ${state.online ? 'online' : 'offline'}.`, sw ? 'ok' : 'warn')}
        ${onboardingStep('5', 'Barkarte geladen', `${esc(barkarte.version)} · ${state.drinks.length} Getränke`, state.drinks.length ? 'ok' : 'warn')}
        ${onboardingStep('6', 'Backup-Test', 'Teste einmal den Export. Safari lädt eine JSON-Datei herunter, die später wieder importiert werden kann.', 'neutral', '<button class="secondary" data-action="backupTest">Backup-Test starten</button>')}
      </div>
      <form id="onboardingTripForm" class="card formCard">
        <h2>Reise anlegen</h2>
        <div class="formField"><label for="onboardingTripName">Reisename</label><input id="onboardingTripName" name="name" required placeholder="z. B. AIDA Sommer 2026" value="${esc(draftValue('onboardingTrip', 'name', currentTrip()?.name || ''))}"></div>
        <div class="formField"><label for="onboardingTripShip">Schiff</label><input id="onboardingTripShip" name="ship" placeholder="z. B. AIDAcosma" value="${esc(draftValue('onboardingTrip', 'ship', currentTrip()?.ship || ''))}"></div>
        <div class="twoCols"><div class="formField"><label for="onboardingTripStart">Start</label><input id="onboardingTripStart" name="startDate" type="date" value="${esc(draftValue('onboardingTrip', 'startDate', currentTrip()?.startDate || ''))}"></div><div class="formField"><label for="onboardingTripEnd">Ende</label><input id="onboardingTripEnd" name="endDate" type="date" value="${esc(draftValue('onboardingTrip', 'endDate', currentTrip()?.endDate || ''))}"></div></div>
        <button class="primary" type="submit">Reise speichern</button>
      </form>
      <div class="buttonStack">
        <button class="primary" data-action="finishOnboarding" ${hasPersons ? '' : 'aria-label="Onboarding abschließen"'}>Onboarding abschließen</button>
        ${hasPersons ? '' : '<p class="hint">Personen kannst du direkt im nächsten Schritt unter „Geräte & Personen“ anlegen.</p>'}
      </div>
    </section>`;
}

function onboardingStep(no, title, text, stateName, extra = '') {
  return `<article class="stepCard ${stateName}"><span>${no}</span><div><h3>${esc(title)}</h3><p>${text}</p>${extra}</div></article>`;
}

function viewDashboard() {
  const trip = currentTrip();
  const today = calc(logsByFilter('today'));
  const total = calc(currentLogs());
  const favorites = favoriteIds().map(id => drinkById(id)).filter(Boolean).slice(0, 6);
  const recent = recentDrinkIds().map(id => drinkById(id)).filter(Boolean).slice(0, 6);
  return `
    <section class="screen">
      <div class="heroCard dashboardHero">
        <p class="eyebrow">${esc(trip?.ship || 'Aktive Reise')}</p>
        <h1>${esc(trip?.name || 'CruiseSip')}</h1>
        <p>${trip?.startDate || trip?.endDate ? `${esc(formatDate(trip.startDate))} – ${esc(formatDate(trip.endDate))}` : 'Schnelles Getränketracking für iPhone und Offline-Nutzung.'}</p>
      </div>
      <div class="kpiGrid">
        ${kpi('Heute', eur(today.value), `${today.count} Getränke`)}
        ${kpi('Gesamtreise', eur(total.value), `${total.count} Getränke`)}
        ${kpi('Ersparnis', eur(total.saved), total.unclear ? `${eur(total.unclear)} unklar` : 'konservativ')}
        ${kpi('Zu zahlen', eur(total.paid), 'nicht enthalten/unklar')}
      </div>
      ${dailyOverviewHtml()}
      <div id="dashboardQuick">${dashboardQuickHtml(favorites, recent)}</div>
      ${setupWarningsHtml()}
    </section>`;
}

function dailyOverviewHtml() {
  const logs = logsByFilter('today').slice().sort((a, b) => Number(b.ts) - Number(a.ts));
  const summary = calc(logs);
  const includedValue = logs.reduce((sum, log) => sum + (log.packageStatus === 'included' ? Number(log.price) || 0 : 0), 0);
  const outsideValue = logs.reduce((sum, log) => sum + (log.packageStatus === 'not_included' ? Number(log.price) || 0 : 0), 0);
  const unclearValue = logs.reduce((sum, log) => sum + (log.packageStatus === 'unclear' ? Number(log.price) || 0 : 0), 0);
  const persons = currentPersons().map(person => {
    const personLogs = logs.filter(log => log.personId === person.id);
    return { person, result: calc(personLogs) };
  }).filter(row => row.result.count > 0);
  const latest = logs[0];

  return `<section class="card dailyOverview">
    <div class="sectionHead"><div><h2>Tagesübersicht</h2><p class="dailyDate">${esc(new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' }))}</p></div><span class="subtle">${summary.count} Getränke</span></div>
    ${logs.length ? `
      <div class="dailyStatusGrid">
        <div class="dailyStatus included"><span>Im Paket</span><strong>${eur(includedValue)}</strong></div>
        <div class="dailyStatus outside"><span>Außerhalb</span><strong>${eur(outsideValue)}</strong></div>
        <div class="dailyStatus unclear"><span>Unklar</span><strong>${eur(unclearValue)}</strong></div>
      </div>
      <div class="dailyPersonList">${persons.map(({ person, result }) => `<div class="dailyPersonRow" style="--person:${esc(person.color || '#e0f2fe')}"><div><b>${esc(person.name)}</b><small>${result.count} ${result.count === 1 ? 'Getränk' : 'Getränke'}</small></div><strong>${eur(result.value)}</strong></div>`).join('')}</div>
      <div class="dailyLatest"><span>Letzte Erfassung</span><b>${esc(latest.drinkName || drinkById(latest.drinkId)?.name || 'Getränk')} · ${esc(latest.personName || personById(latest.personId)?.name || 'Person')}</b><small>${esc(formatDateTime(latest.ts))}</small></div>
    ` : '<p class="emptyText dailyEmpty">Heute wurde noch kein Getränk erfasst.</p>'}
  </section>`;
}

function setupWarningsHtml() {
  const missing = [];
  if (!currentTrip()) missing.push('Reise anlegen');
  if (!currentPersons().length) missing.push('Personen anlegen');
  if (!state.drinks.length) missing.push('Barkarte laden');
  if (!state.settings.onboardingComplete) missing.push('Onboarding abschließen');
  if (!missing.length) return '';
  return `<div class="card warningCard"><h2>Noch offen</h2><p>${missing.map(esc).join(' · ')}</p><button class="secondary" data-route="settings">Einrichtung öffnen</button></div>`;
}

function dashboardQuickHtml(favorites, recent) {
  return `
    <div class="card quickCard">
      <div class="sectionHead"><h2>Schnellzugriff</h2><button class="mini" data-route="track">Tracken</button></div>
      <div class="quickActions">
        <button class="quickAction primaryAction" data-route="track"><b>＋</b><span>Getränk erfassen</span></button>
        <button class="quickAction" data-route="history"><b>↺</b><span>Verlauf</span></button>
        <button class="quickAction" data-route="stats"><b>∑</b><span>Auswertung</span></button>
      </div>
    </div>
    <div class="card">
      <div class="sectionHead"><h2>Favoriten</h2><span class="subtle">${favorites.length || 0}</span></div>
      ${favorites.length ? quickDrinkList(favorites) : '<p class="emptyText">Noch keine Favoriten. Im Tracking Stern antippen.</p>'}
    </div>
    <div class="card">
      <div class="sectionHead"><h2>Zuletzt getrunken</h2><span class="subtle">${recent.length || 0}</span></div>
      ${recent.length ? quickDrinkList(recent) : '<p class="emptyText">Noch kein Verlauf vorhanden.</p>'}
    </div>`;
}
function renderDashboardQuick() { const holder = $('#dashboardQuick'); if (holder) holder.innerHTML = dashboardQuickHtml(favoriteIds().map(id => drinkById(id)).filter(Boolean).slice(0, 6), recentDrinkIds().map(id => drinkById(id)).filter(Boolean).slice(0, 6)); }
function quickDrinkList(drinks) { return `<div class="compactList">${drinks.map(d => `<button class="compactDrink" data-action="trackDrink" data-id="${esc(d.id)}"><span>${esc(d.name)}</span><b>${eur(d.price)}</b></button>`).join('')}</div>`; }
function kpi(label, value, sub) { return `<article class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`; }

function viewTrack() {
  const persons = currentPersons();
  return `
    <section class="screen trackScreen">
      <div class="stickyHeader trackStickyHeader">
        <div class="trackActionRow"><button class="mini" data-route="devices">Personen verwalten</button></div>
        ${persons.length ? '' : '<div class="card warningCard"><p>Lege zuerst Personen an.</p><button class="secondary" data-route="devices">Person anlegen</button></div>'}
        <label class="searchBox searchBoxLarge searchBoxNative" for="drinkSearch"><span aria-hidden="true">⌕</span><input id="drinkSearch" class="searchInputNative" type="search" inputmode="search" enterkeyhint="search" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="Getränk suchen …" value="${esc(state.query)}"></label>
        <div id="categoryChips">${categoryChipsHtml()}</div>
        <div id="personQuickSwitch">${persons.length ? personQuickSwitchHtml(persons) : ''}</div>
      </div>
      <div id="drinkList">${drinkListHtml()}</div>
    </section>`;
}
function personInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] || '?').slice(0, 2)).toUpperCase();
}
function personQuickSwitchHtml(persons = currentPersons()) {
  if (!persons.length) return '';
  const selectedPerson = personById(state.selectedPersonId) || persons[0];
  const logCounts = new Map();
  currentLogs().forEach(log => logCounts.set(log.personId, (logCounts.get(log.personId) || 0) + 1));
  return `<div class="personQuickDock"><div class="personQuickHeading"><span>Getränk erfassen für <b>${esc(selectedPerson.name)}</b></span><small>${esc(packageName(selectedPerson.packageId))}</small></div><div class="personQuickScroller" role="group" aria-label="Person für die Erfassung auswählen">${persons.map((person, index) => {
    const active = person.id === selectedPerson.id;
    const color = person.color || PERSON_COLORS[index % PERSON_COLORS.length];
    const count = logCounts.get(person.id) || 0;
    return `<button class="personQuickButton ${active ? 'active' : ''}" style="--person:${esc(color)}" data-action="selectPerson" data-id="${esc(person.id)}" aria-pressed="${active ? 'true' : 'false'}" aria-label="${esc(person.name)} auswählen, ${count} erfasste Getränke"><span class="personQuickAvatar" aria-hidden="true">${esc(personInitials(person.name))}</span><span class="personQuickName">${esc(person.name)}</span><small>${count}×</small></button>`;
  }).join('')}</div></div>`;
}
function categoryChipsHtml() {
  const favoriteCount = favoriteIds().length;
  const recentCount = recentDrinkIds().length;
  const recommendedCount = recommendedDrinks(24).length;
  const counts = { Alle: state.drinks.length, Empfohlen: recommendedCount, Favoriten: favoriteCount, Zuletzt: recentCount };
  return `<div class="categoryBand"><div class="chipScroller categoryScroller">${categories().map(cat => {
    const count = counts[cat];
    const label = Number.isFinite(count) ? `${esc(cat)} <span>${count}</span>` : esc(cat);
    return `<button class="filterChip ${cat === state.category ? 'active' : ''}" data-action="setCategory" data-id="${esc(cat)}" aria-pressed="${cat === state.category ? 'true' : 'false'}">${label}</button>`;
  }).join('')}</div></div>`;
}
function renderCategoryChips() { const el = $('#categoryChips'); if (el) el.innerHTML = categoryChipsHtml(); }
function drinkSortMode() {
  const selected = state.settings.drinkSort;
  return DRINK_SORT_OPTIONS.some(option => option.id === selected) ? selected : 'frequent';
}
function drinkSortLabel() { return DRINK_SORT_OPTIONS.find(option => option.id === drinkSortMode())?.label || 'Häufig genutzt'; }
function drinkSortOptionsHtml() {
  const selected = drinkSortMode();
  return DRINK_SORT_OPTIONS.map(option => `<option value="${esc(option.id)}" ${option.id === selected ? 'selected' : ''}>${esc(option.label)}</option>`).join('');
}
function bindTrackSortControl() {
  const select = $('#drinkSort');
  if (!select || select.dataset.bound === '1') return;
  select.dataset.bound = '1';
  select.addEventListener('change', async event => {
    const mode = event.target.value;
    if (!DRINK_SORT_OPTIONS.some(option => option.id === mode)) return;
    await putSetting('drinkSort', mode);
    renderTrackList();
    toast(`Sortierung: ${drinkSortLabel()}`);
  });
}
function centerActivePersonQuickSwitch(root = document) {
  const scroller = $('.personQuickScroller', root);
  const active = $('.personQuickButton.active', root);
  if (!scroller || !active) return;
  const targetLeft = active.offsetLeft - Math.max(0, (scroller.clientWidth - active.offsetWidth) / 2);
  const left = Math.max(0, targetLeft);
  if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ left, behavior: 'smooth' });
  else scroller.scrollLeft = left;
}
function renderTrackList({ preserveScroll = false } = {}) {
  const el = $('#drinkList');
  if (!el) return;
  const previousScrollTop = preserveScroll ? el.scrollTop : 0;
  el.innerHTML = drinkListHtml();
  bindTrackSortControl();
  requestAnimationFrame(() => {
    if (preserveScroll) el.scrollTop = Math.min(previousScrollTop, Math.max(0, el.scrollHeight - el.clientHeight));
  });
  scheduleViewportLayout();
}
function renderTrackPersonContext() {
  const quickSwitch = $('#personQuickSwitch');
  if (quickSwitch) quickSwitch.innerHTML = personQuickSwitchHtml();
  renderTrackList({ preserveScroll: true });
  renderCategoryChips();
  requestAnimationFrame(() => centerActivePersonQuickSwitch(quickSwitch || document));
}
function categories() {
  const cats = [...new Set(state.drinks.map(d => d.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  return ['Alle', 'Empfohlen', 'Favoriten', 'Zuletzt', ...cats.filter(cat => cat !== 'Alle')];
}
function categoryIcon(category = '', name = '') {
  const n = normalize(`${category} ${name}`);
  if (/(kaffee|espresso|cappuccino|latte|macchiato|tee|kakao)/.test(n)) return '☕';
  if (/(cocktail|sprizz|spritz|hugo|aperol|longdrink)/.test(n)) return '🍹';
  if (/(wein|prosecco|sekt|champagner|prickelnd)/.test(n)) return '🍷';
  if (/(bier|pils|radler|weizen)/.test(n)) return '🍺';
  if (/(wasser)/.test(n)) return '💧';
  if (/(saft|nektar|schorle|smoothie)/.test(n)) return '🧃';
  if (/(cola|fanta|sprite|limonade|softdrink|iced tea|lemonade)/.test(n)) return '🥤';
  if (/(milchshake|shake)/.test(n)) return '🥛';
  if (/(spirituose|gin|rum|vodka|whisky|schnaps)/.test(n)) return '🥃';
  return '🍸';
}
function drinkUsageMap(personId = null) {
  const map = new Map();
  currentLogs().forEach(log => {
    if (personId && log.personId !== personId) return;
    const key = log.drinkId;
    const row = map.get(key) || { count: 0, lastTs: 0 };
    row.count += 1;
    row.lastTs = Math.max(row.lastTs, Number(log.ts) || 0);
    map.set(key, row);
  });
  return map;
}
function favoriteDrinks(limit = 8) { return favoriteIds().map(id => drinkById(id)).filter(Boolean).slice(0, limit); }
function recentDrinks(limit = 8) { return recentDrinkIds().map(id => drinkById(id)).filter(Boolean).slice(0, limit); }
function recommendedDrinks(limit = 8) {
  const q = normalize(state.query);
  const fav = new Set(favoriteIds());
  const recent = new Set(recentDrinkIds());
  const usage = drinkUsageMap(state.selectedPersonId || null);
  const now = Date.now();
  return state.drinks
    .map(drink => {
      const stat = usage.get(drink.id);
      let score = 0;
      if (fav.has(drink.id)) score += 1200;
      if (recent.has(drink.id)) score += 900;
      if (stat) {
        score += 300 + stat.count * 45;
        const hoursSince = Math.max(0, (now - stat.lastTs) / 3600000);
        score += Math.max(0, 220 - hoursSince * 3);
      }
      if (QUICK_TERMS.some(term => normalize(drink.name).includes(term))) score += 120;
      if (q && !normalize(`${drink.name} ${drink.category} ${drink.notes || ''} ${drink.volume || ''}`).includes(q)) score -= 5000;
      return { drink, score };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.drink.name).localeCompare(String(b.drink.name), 'de'))
    .map(row => row.drink)
    .slice(0, limit);
}
function filteredDrinks() {
  const q = normalize(state.query);
  const fav = new Set(favoriteIds());
  const recent = new Set(recentDrinkIds());
  const recommendedIds = new Set(recommendedDrinks(24).map(d => d.id));
  const usage = drinkUsageMap(state.selectedPersonId || null);
  let list = [...state.drinks];
  if (state.category === 'Favoriten') list = list.filter(d => fav.has(d.id));
  else if (state.category === 'Zuletzt') list = list.filter(d => recent.has(d.id));
  else if (state.category === 'Empfohlen') list = list.filter(d => recommendedIds.has(d.id));
  else if (state.category !== 'Alle') list = list.filter(d => d.category === state.category);
  if (q) list = list.filter(d => normalize(`${d.name} ${d.category} ${d.notes || ''} ${d.volume || ''}`).includes(q));

  const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'de');
  const mode = drinkSortMode();
  return list.sort((a, b) => {
    const aStat = usage.get(a.id) || { count: 0, lastTs: 0 };
    const bStat = usage.get(b.id) || { count: 0, lastTs: 0 };
    if (mode === 'recent') return bStat.lastTs - aStat.lastTs || bStat.count - aStat.count || byName(a, b);
    if (mode === 'priceAsc') return (Number(a.price) || 0) - (Number(b.price) || 0) || byName(a, b);
    if (mode === 'priceDesc') return (Number(b.price) || 0) - (Number(a.price) || 0) || byName(a, b);
    if (mode === 'alphabetical') return byName(a, b);
    return bStat.count - aStat.count || bStat.lastTs - aStat.lastTs || byName(a, b);
  });
}
function quickTrackSection(title, subtitle, drinks, badge = '') {
  if (!drinks.length) return '';
  return `<section class="card trackQuickSection"><div class="sectionHead"><div><h2>${esc(title)}</h2><p class="trackSectionNote">${esc(subtitle)}</p></div><span class="subtle">${drinks.length}</span></div><div class="quickDrinkGrid">${drinks.map(drink => `<button class="quickDrinkTile" data-action="trackDrink" data-id="${esc(drink.id)}"><span class="quickDrinkTop"><span class="quickDrinkIcon">${categoryIcon(drink.category, drink.name)}</span>${badge ? `<span class="quickDrinkBadge">${esc(badge)}</span>` : ''}</span><b>${esc(drink.name)}</b><small>${esc(drink.category || 'Getränk')}${drink.volume ? ` · ${esc(drink.volume)}` : ''}</small><strong>${eur(drink.price)}</strong></button>`).join('')}</div></section>`;
}
function trackQuickSectionsHtml() {
  if (state.query) return '';
  const recommended = recommendedDrinks(6);
  const favorites = favoriteDrinks(6);
  const recent = recentDrinks(6);
  return `<div class="trackQuickStack">${quickTrackSection('Empfehlungen', 'Aus Favoriten und bisher erfassten Getränken.', recommended, 'Schnellwahl')}${quickTrackSection('Favoriten', 'Deine gemerkten Getränke für schnelles Erfassen.', favorites, 'Favorit')}${quickTrackSection('Zuletzt erfasst', 'Ideal für die nächste Runde an Bord.', recent, 'Zuletzt')}</div>`;
}
function drinkListHtml() {
  const persons = currentPersons();
  const person = personById(state.selectedPersonId);
  const fav = new Set(favoriteIds());
  const usage = drinkUsageMap(state.selectedPersonId || null);
  const drinks = filteredDrinks();
  if (!persons.length) return '';
  if (!drinks.length) return '<div class="card emptyText">Keine passenden Getränke gefunden.</div>';
  const listTitle = state.query ? 'Suchergebnisse' : state.category === 'Alle' ? 'Alle Getränke' : state.category;
  return `<div class="trackContent"><section class="trackListSection"><div class="sectionHead trackListHead"><div><h2>${esc(listTitle)}</h2><p class="trackSectionNote">Getränk antippen und direkt für ${esc(person?.name || 'die aktive Person')} speichern.</p></div><span class="subtle">${drinks.length}</span></div><label class="drinkSortControl" for="drinkSort"><span>Sortieren</span><select id="drinkSort" aria-label="Getränkekacheln sortieren">${drinkSortOptionsHtml()}</select></label><div class="drinkGrid">${drinks.map(d => {
    const status = person ? statusForDrink(d, person.packageId) : 'unclear';
    const count = usage.get(d.id)?.count || 0;
    const isFavorite = fav.has(d.id);
    const recommendationBadge = state.category === 'Empfohlen' ? '<span class="drinkTileBadge">Empfohlen</span>' : (isFavorite ? '<span class="drinkTileBadge favoriteBadge">Favorit</span>' : '');
    return `<article class="drinkCard ${isFavorite ? 'isFavorite' : ''}"><button class="favButton ${isFavorite ? 'active' : ''}" data-action="toggleFavorite" data-id="${esc(d.id)}" aria-label="${isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}" aria-pressed="${isFavorite ? 'true' : 'false'}">★</button><button class="drinkMain" data-action="trackDrink" data-id="${esc(d.id)}" aria-label="${esc(d.name)} für ${esc(person?.name || 'aktive Person')} erfassen"><span class="drinkTileTop"><span class="drinkIcon" aria-hidden="true">${categoryIcon(d.category, d.name)}</span>${recommendationBadge}</span><span class="drinkBody"><span class="drinkTitle">${esc(d.name)}</span><span class="drinkMeta">${esc(d.category || 'Getränk')}${d.volume ? ` · ${esc(d.volume)}` : ''}</span></span><span class="drinkTileBottom"><span class="statusBadge ${statusClass(status)}">${esc(statusLabel(status))}</span><span class="priceButton pricePill">${eur(d.price)}</span></span>${count ? `<span class="drinkUsage">Schon ${count}× gewählt</span>` : ''}</button></article>`;
  }).join('')}</div></section></div>`;
}

function viewHistory() {
  const logs = logsByFilter();
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Verlauf</h1><span class="subtle">${logs.length} Einträge</span></div>
      ${historyFilterHtml()}
      ${logs.length ? `<div class="timeline">${logs.map(logItemHtml).join('')}</div>` : '<div class="card emptyText">Keine Einträge im gewählten Zeitraum.</div>'}
    </section>`;
}
function historyFilterHtml() { return `<div class="segmented"><button class="${state.historyFilter === 'today' ? 'active' : ''}" data-action="setHistoryFilter" data-id="today">Heute</button><button class="${state.historyFilter === 'yesterday' ? 'active' : ''}" data-action="setHistoryFilter" data-id="yesterday">Gestern</button><button class="${state.historyFilter === 'trip' ? 'active' : ''}" data-action="setHistoryFilter" data-id="trip">Reise</button></div>`; }
function logItemHtml(log) {
  const person = personById(log.personId) || { name: log.personName || 'Unbekannt', color: '#f1f5f9' };
  if (state.editingLogId === log.id) return logEditItemHtml(log, person);
  return `<article class="timelineItem" style="--person:${esc(person.color || '#f1f5f9')}">
    <div class="timelineMarker"></div>
    <div class="timelineCard">
      <div class="logTop"><b>${statusDot(log.packageStatus)}${esc(log.drinkName)}</b><span>${eur(log.price)}</span></div>
      <div class="logMeta"><span class="personPill">${esc(person.name)}</span><span>${esc(formatDateTime(log.ts))}</span><span>${esc(statusLabel(log.packageStatus))}</span></div>
      <div class="logActions"><button class="mini" data-action="editLog" data-id="${esc(log.id)}">Bearbeiten</button><button class="mini dangerText" data-action="deleteLog" data-id="${esc(log.id)}">Löschen</button></div>
    </div>
  </article>`;
}
function logEditItemHtml(log, person) {
  const draft = state.formDraft.log || {};
  const personId = draft.personId || log.personId || currentPersons()[0]?.id || '';
  const drinkId = draft.drinkId || log.drinkId || state.drinks[0]?.id || '';
  const date = draft.date || localDateInputValue(log.ts);
  const time = draft.time || localTimeInputValue(log.ts);
  const price = Object.prototype.hasOwnProperty.call(draft, 'price') ? draft.price : String(Number(log.price) || 0).replace('.', ',');
  const packageStatus = draft.packageStatus || log.packageStatus || 'unclear';
  const persons = currentPersons();
  const drinks = [...state.drinks].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de', { sensitivity: 'base' }));
  const personOptions = persons.map(row => `<option value="${esc(row.id)}" ${row.id === personId ? 'selected' : ''}>${esc(row.name)}</option>`).join('');
  const missingPerson = personId && !persons.some(row => row.id === personId) ? `<option value="${esc(personId)}" selected>${esc(log.personName || 'Nicht mehr vorhandene Person')}</option>` : '';
  const drinkOptions = drinks.map(row => `<option value="${esc(row.id)}" ${row.id === drinkId ? 'selected' : ''}>${esc(row.name)} · ${eur(row.price)}</option>`).join('');
  const missingDrink = drinkId && !drinks.some(row => row.id === drinkId) ? `<option value="${esc(drinkId)}" selected>${esc(log.drinkName || 'Nicht mehr vorhandenes Getränk')}</option>` : '';
  return `<article class="timelineItem editing" style="--person:${esc(person.color || '#f1f5f9')}">
    <div class="timelineMarker"></div>
    <div class="timelineCard logEditCard">
      <form id="logEditForm" class="logEditForm">
        <input type="hidden" name="id" value="${esc(log.id)}">
        <div class="logEditHead"><div><b>Fehlbuchung korrigieren</b><small>Änderungen wirken sofort auf Verlauf, Tagesübersicht und Analyse.</small></div><button type="button" class="mini" data-action="cancelEditLog">Abbrechen</button></div>
        <div class="formField"><label for="logPersonInput">Person</label><select id="logPersonInput" name="personId">${missingPerson}${personOptions}</select></div>
        <div class="formField"><label for="logDrinkInput">Getränk</label><select id="logDrinkInput" name="drinkId">${missingDrink}${drinkOptions}</select></div>
        <div class="logEditGrid">
          <div class="formField"><label for="logDateInput">Datum</label><input id="logDateInput" name="date" type="date" value="${esc(date)}"></div>
          <div class="formField"><label for="logTimeInput">Uhrzeit</label><input id="logTimeInput" name="time" type="time" step="60" value="${esc(time)}"></div>
        </div>
        <div class="logEditGrid">
          <div class="formField"><label for="logPriceInput">Preis</label><input id="logPriceInput" name="price" type="text" inputmode="decimal" autocomplete="off" value="${esc(price)}"></div>
          <div class="formField"><label for="logStatusInput">Paketstatus</label><select id="logStatusInput" name="packageStatus"><option value="included" ${packageStatus === 'included' ? 'selected' : ''}>enthalten</option><option value="not_included" ${packageStatus === 'not_included' ? 'selected' : ''}>nicht enthalten</option><option value="unclear" ${packageStatus === 'unclear' ? 'selected' : ''}>unklar</option></select></div>
        </div>
        <p class="logEditHint">Beim Wechsel des Getränks werden Barkartenpreis und Paketstatus automatisch angepasst. Der Preis kann danach nur bei einem bewusst abweichenden Sonderfall manuell geändert werden.</p>
        <div class="logEditActions"><button id="logSaveButton" class="primary" type="submit">Änderungen speichern</button><button type="button" class="secondary dangerText" data-action="deleteLog" data-id="${esc(log.id)}">Eintrag löschen</button></div>
      </form>
    </div>
  </article>`;
}

function viewStats() {
  const filter = state.statsFilter || 'trip';
  const logs = logsByFilter(filter, currentLogs());
  const persons = currentPersons();
  const selectedPerson = state.statsPersonId ? persons.find(person => person.id === state.statsPersonId) : null;
  if (state.statsPersonId && !selectedPerson) state.statsPersonId = null;
  if (selectedPerson) return viewStatsPersonDetail(selectedPerson, logs);

  const total = calcDetailed(logs);
  const packagePriceTotal = persons.reduce((sum, person) => sum + (Number(person.packagePrice) || 0), 0);
  const packageBalance = packagePriceTotal ? total.included - packagePriceTotal : 0;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Auswertungen</h1><span class="subtle">${esc(currentTrip()?.name || '')}</span></div>
      ${statsFilterHtml()}
      <div class="kpiGrid">
        ${kpi('Konsumwert', eur(total.value), `${total.count} Getränke`)}
        ${kpi('Im Paket', eur(total.included), 'eindeutig enthalten')}
        ${kpi('Außerhalb Paket', eur(total.notIncluded), 'eindeutig nicht enthalten')}
        ${kpi('Unklar', eur(total.unclear), 'an Bord prüfen')}
      </div>
      ${packagePriceTotal ? `<div class="kpiGrid compact">${kpi('Paketpreise', eur(packagePriceTotal), 'Summe erfasster Personen')}${kpi('Paketbilanz', eur(packageBalance), packageBalance >= 0 ? 'Paket aktuell im Plus' : 'noch nicht amortisiert')}</div>` : ''}
      ${personPackageDashboardHtml(logs)}
      ${statusBreakdownHtml(logs)}
      ${outsidePackageHtml(logs)}
      ${statsSection('Pro Person', groupStats(logs, l => personById(l.personId)?.name || l.personName || 'Unbekannt'))}
      ${statsSection('Pro Getränk', groupStats(logs, l => l.drinkName || 'Unbekannt'), 20)}
      ${statsSection('Pro Kategorie', groupStats(logs, l => l.category || 'Ohne Kategorie'))}
      ${statsSection('Pro Tag', groupStats(logs, l => formatDateKey(l.ts)))}
      ${statsSection('Lieblingsgetränke', groupStats(logs, l => l.drinkName || 'Unbekannt').sort((a, b) => b.count - a.count).slice(0, 10), 10)}
    </section>`;
}
function statsFilterHtml() {
  const filter = state.statsFilter || 'trip';
  return `<div class="segmented"><button class="${filter === 'today' ? 'active' : ''}" data-action="setStatsFilter" data-id="today">Heute</button><button class="${filter === 'yesterday' ? 'active' : ''}" data-action="setStatsFilter" data-id="yesterday">Gestern</button><button class="${filter === 'trip' ? 'active' : ''}" data-action="setStatsFilter" data-id="trip">Reise</button></div>`;
}
function calcDetailed(logs = currentLogs()) {
  return logs.reduce((acc, log) => {
    const price = Number(log.price) || 0;
    acc.count += 1;
    acc.value += price;
    if (log.packageStatus === 'included') { acc.included += price; acc.includedCount += 1; }
    else if (log.packageStatus === 'not_included') { acc.notIncluded += price; acc.notIncludedCount += 1; }
    else { acc.unclear += price; acc.unclearCount += 1; }
    return acc;
  }, { count: 0, value: 0, included: 0, notIncluded: 0, unclear: 0, includedCount: 0, notIncludedCount: 0, unclearCount: 0 });
}
function groupStats(logs, keyFn) {
  const map = new Map();
  logs.forEach(log => {
    const key = keyFn(log);
    if (!map.has(key)) map.set(key, { key, count: 0, value: 0, saved: 0, paid: 0, unclear: 0 });
    const row = map.get(key);
    const price = Number(log.price) || 0;
    row.count += 1; row.value += price;
    if (log.packageStatus === 'included') row.saved += price;
    else if (log.packageStatus === 'unclear') { row.unclear += price; row.paid += price; }
    else row.paid += price;
  });
  return [...map.values()].sort((a, b) => b.value - a.value || b.count - a.count);
}
function statsSection(title, rows, limit = 12) {
  if (!rows.length) return `<div class="card"><h2>${esc(title)}</h2><p class="emptyText">Keine Daten vorhanden.</p></div>`;
  return `<div class="card"><div class="sectionHead"><h2>${esc(title)}</h2><span class="subtle">Top ${Math.min(limit, rows.length)} von ${rows.length}</span></div><div class="statList">${rows.slice(0, limit).map(r => `<div class="statRow"><div><b>${esc(r.key)}</b><small>${r.count} Getränke · im Paket ${eur(r.saved)}${r.unclear ? ` · unklar ${eur(r.unclear)}` : ''}</small></div><strong>${eur(r.value)}</strong></div>`).join('')}</div></div>`;
}
function packageBreakEvenHtml(logs) {
  return personPackageDashboardHtml(logs);
}
function personPackageStats(person, logs) {
  const personLogs = logs.filter(log => log.personId === person.id);
  const stats = calcDetailed(personLogs);
  const packagePrice = Number(person.packagePrice) || 0;
  const remaining = packagePrice ? Math.max(0, packagePrice - stats.included) : 0;
  const savings = packagePrice ? Math.max(0, stats.included - packagePrice) : 0;
  const balance = packagePrice ? stats.included - packagePrice : 0;
  const progress = packagePrice ? Math.min(100, Math.round((stats.included / packagePrice) * 100)) : 0;
  const avgIncluded = stats.includedCount ? stats.included / stats.includedCount : 0;
  const remainingDrinkHint = !packagePrice
    ? 'Paketpreis bei der Person hinterlegen.'
    : remaining <= 0
      ? `Break-even erreicht: rechnerische Ersparnis ${eur(savings)}.`
      : avgIncluded
        ? `ca. ${Math.ceil(remaining / avgIncluded)} weitere enthaltene Getränke bei Ø ${eur(avgIncluded)}`
        : 'Noch kein enthaltenes Getränk als Durchschnitt vorhanden.';
  return { personLogs, stats, packagePrice, remaining, savings, balance, progress, avgIncluded, remainingDrinkHint };
}
function personPackageDashboardHtml(logs) {
  const persons = currentPersons();
  if (!persons.length) return '';
  const cards = persons.map(person => {
    const data = personPackageStats(person, logs);
    const reached = data.packagePrice && data.remaining <= 0;
    const headline = !data.packagePrice ? 'Paketpreis fehlt' : reached ? 'Ersparnis erreicht' : 'Restbetrag zum Paketpreis';
    const mainValue = !data.packagePrice ? 'fehlt' : reached ? eur(data.savings) : eur(data.remaining);
    const subline = !data.packagePrice
      ? 'Paketpreis in der Person hinterlegen.'
      : reached
        ? `Paketwert ${eur(data.stats.included)} bei ${eur(data.packagePrice)} Paketpreis.`
        : `${eur(data.stats.included)} von ${eur(data.packagePrice)} erreicht.`;
    return `<button class="personBreakEvenCard" data-action="showStatsPerson" data-id="${esc(person.id)}" style="--person:${esc(person.color || '#e0f2fe')}">
      <span class="personBreakEvenTop"><span><b>${esc(person.name)}</b><small>${esc(packageName(person.packageId))} · ${data.personLogs.length} Getränke</small></span><strong>${esc(mainValue)}</strong></span>
      ${data.packagePrice ? `<span class="meter"><i style="width:${data.progress}%"></i></span>` : ''}
      <span class="personBreakEvenMeta"><span>${esc(headline)}</span><span>Bordrechnung ${esc(eur(data.stats.notIncluded))}</span></span>
      <small>${esc(subline)}</small>
    </button>`;
  }).join('');
  return `<div class="card"><div class="sectionHead"><h2>Restbetrag / Paketprüfung pro Person</h2><span class="subtle">antippen für Verlauf</span></div><p class="hint">Die Kachel zeigt je Person den verbleibenden Betrag bis zum rechnerischen Paketpreis. Sobald der Break-even erreicht ist, wird die rechnerische Ersparnis ausgewiesen. Bordrechnung zählt nur eindeutig nicht enthaltene Getränke.</p><div class="personBreakEvenGrid">${cards}</div></div>`;
}
function viewStatsPersonDetail(person, logs) {
  const data = personPackageStats(person, logs);
  const reached = data.packagePrice && data.remaining <= 0;
  const mainLabel = !data.packagePrice ? 'Paketpreis fehlt' : reached ? 'Rechnerische Ersparnis' : 'Restbetrag zum Paketpreis';
  const mainValue = !data.packagePrice ? 'fehlt' : reached ? eur(data.savings) : eur(data.remaining);
  const drinkRows = data.personLogs
    .slice()
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .map(log => `<div class="personDrinkRow"><div><b>${statusDot(log.packageStatus)}${esc(log.drinkName || 'Unbekannt')}</b><small>${esc(formatDateTime(log.ts))}${log.category ? ` · ${esc(log.category)}` : ''} · ${esc(statusLabel(log.packageStatus))}</small></div><strong>${esc(eur(log.price))}</strong></div>`)
    .join('');
  return `
    <section class="screen">
      <div class="sectionHead"><div><h1>${esc(person.name)}</h1><span class="subtle">Paketprüfung & Verlauf</span></div><button class="mini" data-action="backStatsDashboard">Zurück</button></div>
      ${statsFilterHtml()}
      <article class="card personDetailCard" style="--person:${esc(person.color || '#e0f2fe')}">
        <div class="personAnalysisHead"><div><b>${esc(mainLabel)}</b><small>${esc(packageName(person.packageId))} · ${data.personLogs.length} Getränke im Zeitraum</small></div><strong>${esc(mainValue)}</strong></div>
        ${data.packagePrice ? `<span class="meter"><i style="width:${data.progress}%"></i></span>` : ''}
        <div class="personAnalysisGrid">
          ${miniMetric('Paketpreis', data.packagePrice ? eur(data.packagePrice) : 'fehlt', 'bei Person hinterlegt')}
          ${miniMetric('Im Paket gerechnet', eur(data.stats.included), `${data.stats.includedCount} enthalten`)}
          ${miniMetric(reached ? 'Ersparnis' : 'Noch offen', data.packagePrice ? (reached ? eur(data.savings) : eur(data.remaining)) : '-', data.remainingDrinkHint)}
          ${miniMetric('Bordrechnung', eur(data.stats.notIncluded), `${data.stats.notIncludedCount} nicht enthalten`)}
          ${miniMetric('Unklar', eur(data.stats.unclear), `${data.stats.unclearCount} an Bord prüfen`)}
          ${miniMetric('Gesamt getrunken', eur(data.stats.value), `${data.stats.count} Getränke`)}
        </div>
      </article>
      <div class="card"><div class="sectionHead"><h2>Getränkeverlauf</h2><span class="subtle">${data.personLogs.length} Einträge</span></div>${drinkRows ? `<div class="personDrinkList">${drinkRows}</div>` : '<p class="emptyText">Keine Getränke im gewählten Zeitraum.</p>'}</div>
    </section>`;
}
function miniMetric(label, value, sub) {
  return `<div class="miniMetric"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(sub)}</small></div>`;
}
function statusBreakdownHtml(logs) {
  const rows = [
    { key: 'Im Paket enthalten', logs: logs.filter(log => log.packageStatus === 'included') },
    { key: 'Nicht enthalten', logs: logs.filter(log => log.packageStatus === 'not_included') },
    { key: 'Unklar', logs: logs.filter(log => log.packageStatus === 'unclear') }
  ].map(row => ({ key: row.key, ...calcDetailed(row.logs) }));
  return `<div class="card"><h2>Statusübersicht</h2><div class="statList">${rows.map(row => `<div class="statRow"><div><b>${esc(row.key)}</b><small>${row.count} Getränke</small></div><strong>${eur(row.value)}</strong></div>`).join('')}</div></div>`;
}
function outsidePackageHtml(logs) {
  const outside = logs.filter(log => log.packageStatus !== 'included');
  if (!outside.length) return `<div class="card"><h2>Außerhalb Paket / unklar</h2><p class="emptyText">Keine Getränke außerhalb des Pakets oder mit unklarem Status im gewählten Zeitraum.</p></div>`;
  const rows = groupStats(outside, log => `${log.drinkName || 'Unbekannt'} · ${statusLabel(log.packageStatus)}`).slice(0, 12);
  return `<div class="card"><div class="sectionHead"><h2>Außerhalb Paket / unklar</h2><span class="subtle">Top ${rows.length}</span></div><div class="statList">${rows.map(r => `<div class="statRow"><div><b>${esc(r.key)}</b><small>${r.count} Getränke</small></div><strong>${eur(r.value)}</strong></div>`).join('')}</div></div>`;
}

function viewTrips() {
  const edit = state.editingTripId ? state.trips.find(t => t.id === state.editingTripId) : null;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Reisen</h1><span class="subtle">${state.trips.length}</span></div>
      <form id="tripForm" class="card formCard" autocomplete="off">
        <input id="tripIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
        <h2>${edit ? 'Reise bearbeiten' : 'Reise anlegen'}</h2>
        <div class="formField"><label for="tripNameInput">Name</label><input id="tripNameInput" name="name" placeholder="z. B. AIDA Metropolen 2026" value="${esc(draftValue('trip', 'name', edit?.name || ''))}"></div>
        <div class="formField"><label for="tripShipInput">Schiff</label><input id="tripShipInput" name="ship" placeholder="z. B. AIDAprima" value="${esc(draftValue('trip', 'ship', edit?.ship || ''))}"></div>
        <div class="twoCols"><div class="formField"><label for="tripStartInput">Start</label><input id="tripStartInput" name="startDate" type="date" value="${esc(draftValue('trip', 'startDate', edit?.startDate || ''))}"></div><div class="formField"><label for="tripEndInput">Ende</label><input id="tripEndInput" name="endDate" type="date" value="${esc(draftValue('trip', 'endDate', edit?.endDate || ''))}"></div></div>
        <button id="tripSaveButton" class="primary" type="submit" data-action="saveTrip">${edit ? 'Änderungen speichern' : 'Speichern'}</button>
        <button class="secondary" type="button" data-action="resetTripForm">Formular leeren</button>
      </form>
      <div class="card"><h2>Vorhandene Reisen</h2><div class="itemList">${state.trips.map(tripCardHtml).join('')}</div></div>
    </section>`;
}
function tripCardHtml(trip) {
  const active = trip.id === state.currentTripId;
  const logs = state.logs.filter(l => l.tripId === trip.id);
  return `<article class="itemCard ${active ? 'selected' : ''} ${trip.archived ? 'mutedCard' : ''}">
    <div><b>${esc(trip.name)}</b><small>${esc(trip.ship || 'Ohne Schiff')} · ${esc(formatDate(trip.startDate))} – ${esc(formatDate(trip.endDate))} · ${logs.length} Einträge${trip.archived ? ' · archiviert' : ''}</small></div>
    <div class="rowActions"><button class="mini" data-action="setTrip" data-id="${esc(trip.id)}">Aktiv</button><button class="mini" data-action="editTrip" data-id="${esc(trip.id)}">Bearbeiten</button><button class="mini" data-action="archiveTrip" data-id="${esc(trip.id)}">${trip.archived ? 'Reaktivieren' : 'Archivieren'}</button><button class="mini dangerText" data-action="deleteTrip" data-id="${esc(trip.id)}">Löschen</button></div>
  </article>`;
}

function viewDevices() {
  const edit = state.editingPersonId ? state.persons.find(p => p.id === state.editingPersonId) : null;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Geräte & Personen</h1><span class="subtle">${currentPersons().length} Personen</span></div>
      <form id="deviceForm" class="card formCard">
        <h2>Gerät</h2>
        <div class="formField"><label for="deviceNameInput">Gerätename</label><input id="deviceNameInput" name="deviceName" value="${esc(draftValue('device', 'deviceName', state.settings.deviceName || ''))}"></div>
        <div class="infoBox"><span>Geräte-ID</span><code>${esc(state.settings.deviceId || '')}</code></div>
        <button id="deviceSaveButton" class="primary" type="submit" data-action="saveDevice">Gerätename speichern</button>
      </form>
      <form id="personForm" class="card formCard" autocomplete="off">
        <input id="personIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
        <h2>${edit ? 'Person bearbeiten' : 'Person anlegen'}</h2>
        <div class="formField"><label for="personNameInput">Name</label><input id="personNameInput" name="name" placeholder="Name" value="${esc(draftValue('person', 'name', edit?.name || ''))}"></div>
        <div class="formField"><label for="personPackageInput">Getränkepaket</label><select id="personPackageInput" name="packageId">${state.packages.map(p => `<option value="${esc(p.id)}" ${p.id === draftValue('person', 'packageId', edit?.packageId || 'none') ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="formField"><label for="personPackagePriceInput">Paketpreis gesamt</label><input id="personPackagePriceInput" name="packagePrice" type="text" inputmode="decimal" autocomplete="off" placeholder="optional, z. B. 329,00" value="${esc(draftValue('person', 'packagePrice', edit?.packagePrice ?? ''))}"></div>
        <button id="personSaveButton" class="primary" type="submit" data-action="savePerson">${edit ? 'Änderungen speichern' : 'Person speichern'}</button>
        <button class="secondary" type="button" data-action="resetPersonForm">Formular leeren</button>
      </form>
      <div class="card"><h2>Personen dieser Reise</h2><div class="itemList">${currentPersons().map(personCardHtml).join('') || '<p class="emptyText">Noch keine Personen angelegt.</p>'}</div></div>
      <div class="card"><h2>Export / Zusammenführen</h2><div class="buttonStack"><button class="primary" data-action="exportTrip">Aktuelle Reise exportieren</button><button class="secondary" data-action="importTrip">Export importieren und zusammenführen</button><button class="secondary" data-action="backupTest">Backup-Test</button></div><p class="hint">Dublettenerkennung erfolgt über Geräte-ID und ursprüngliche Eintrags-ID. Mehrfachimporte desselben Geräteexports werden übersprungen.</p></div>
      <div class="card"><div class="sectionHead"><h2>Importprotokoll</h2><button class="mini" data-action="clearImportLog">Leeren</button></div>${importLogHtml()}</div>
    </section>`;
}
function personCardHtml(person) {
  const count = currentLogs().filter(l => l.personId === person.id).length;
  return `<article class="itemCard" style="--person:${esc(person.color || '#e0f2fe')}"><div><b><span class="personDot"></span>${esc(person.name)}</b><small>${esc(packageName(person.packageId))}${person.packagePrice ? ` · Paketpreis ${eur(person.packagePrice)}` : ''} · ${count} Einträge</small></div><div class="rowActions"><button class="mini" data-action="editPerson" data-id="${esc(person.id)}">Bearbeiten</button><button class="mini dangerText" data-action="deletePerson" data-id="${esc(person.id)}">Löschen</button></div></article>`;
}
function importLogHtml() {
  if (!state.imports.length) return '<p class="emptyText">Noch keine Importe.</p>';
  return `<div class="statList">${state.imports.slice(0, 10).map(i => `<div class="statRow"><div><b>${esc(i.fileName || 'Import')}</b><small>${esc(formatDateTime(Date.parse(i.importedAt)))} · neu ${i.added || 0} · doppelt ${i.duplicates || 0}</small></div><strong>${esc(i.kind || '')}</strong></div>`).join('')}</div>`;
}

function viewBarkarte() {
  const v = activeBarkarteVersion();
  const cmp = state.settings.lastBarkarteComparison;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Barkarte</h1><span class="subtle">${state.drinks.length} Getränke</span></div>
      <div class="card">
        <h2>Aktuelle Barkarte</h2>
        <div class="infoBox"><span>Version</span><b>${esc(v.version || 'unbekannt')}</b></div>
        <div class="infoBox"><span>Quelle</span><small>${esc(v.source || 'nicht gesetzt')}</small></div>
        <div class="infoBox"><span>Getränke</span><b>${state.drinks.length}</b></div>
        <button class="primary" data-action="importBarkarte">Neue Barkarte importieren</button>
        <p class="hint">Unterstützt werden strukturierte CruiseSip-JSON-Dateien und einfache CSV-Dateien. PDF-Erkennung ist bewusst nicht integriert, da die App offline und ohne externe Bibliotheken arbeitet.</p>
      </div>
      ${articleManagementHtml()}
      ${cmp ? comparisonHtml(cmp) : ''}
      <div class="card"><h2>Kategorien</h2>${categorySummaryHtml()}</div>
    </section>`;
}

function articleManagementHtml() {
  const edit = state.editingDrinkId ? drinkById(state.editingDrinkId) : null;
  return `<div class="card articleManager" id="articleManager">
    <div class="sectionHead"><div><h2>Artikelverwaltung</h2><p class="hint">Preis und Paketstatus können lokal angepasst werden. Mehrere Pakete können gleichzeitig als enthalten markiert werden.</p></div><span class="subtle">${state.drinks.length} Artikel</span></div>
    <input id="articleSearch" class="plainSearch" type="search" inputmode="search" autocomplete="off" placeholder="Artikel suchen …" value="${esc(state.articleQuery || '')}">
    <div id="articleEdit">${articleEditFormHtml(edit)}</div>
    <div id="articleList">${articleListHtml()}</div>
  </div>`;
}
function renderArticleManagement() { const el = $('#articleManager'); if (el) el.outerHTML = articleManagementHtml(); bindInputs(); bindRenderedControls(); }
function renderArticleList() { const el = $('#articleList'); if (el) el.innerHTML = articleListHtml(); }
function renderArticleEdit() { const el = $('#articleEdit'); if (el) el.innerHTML = articleEditFormHtml(state.editingDrinkId ? drinkById(state.editingDrinkId) : null); }
function articleEditFormHtml(drink) {
  if (!drink) return `<div class="articleEditEmpty"><b>Kein Artikel ausgewählt.</b><small>Artikel suchen und „Bearbeiten“ antippen.</small></div>`;
  return `<form id="articleForm" class="articleForm" autocomplete="off">
    <input id="articleIdInput" type="hidden" name="id" value="${esc(drink.id)}">
    <div class="articleEditHead"><div><b>${esc(drink.name)}</b><small>${esc(drink.category || 'Ohne Kategorie')}${drink.volume ? ` · ${esc(drink.volume)}` : ''}</small></div><button class="mini" type="button" data-action="resetArticleForm">Schließen</button></div>
    <div class="twoCols"><div class="formField"><label for="articlePriceInput">Preis</label><input id="articlePriceInput" name="price" type="text" inputmode="decimal" value="${esc(String(Number(drink.price) || 0).replace('.', ','))}"></div><div class="formField"><label for="articleCategoryInput">Kategorie</label><input id="articleCategoryInput" name="category" value="${esc(drink.category || '')}"></div></div>
    <div class="packageStatusEditor"><b>Enthalten je Getränkepaket</b>${packageStatusFieldsHtml(drink)}</div>
    <label class="checkLine"><input id="articleApplyLogsInput" name="applyLogs" type="checkbox" checked> Bestehende Einträge dieser Reise für diesen Artikel aktualisieren</label>
    <button class="primary" type="submit" data-action="saveArticle">Artikel speichern</button>
  </form>`;
}
function packageStatusFieldsHtml(drink) {
  return managedPackages().map(pkg => {
    const value = drink.packages?.[pkg.id] || 'unclear';
    return `<div class="packageStatusRow"><span>${esc(pkg.name)}</span><select name="pkg_${esc(pkg.id)}"><option value="included" ${value === 'included' ? 'selected' : ''}>enthalten</option><option value="not_included" ${value === 'not_included' ? 'selected' : ''}>nicht enthalten</option><option value="unclear" ${value === 'unclear' ? 'selected' : ''}>unklar</option></select></div>`;
  }).join('');
}
function managedPackages() { return state.packages.filter(p => !['none', 'unclear'].includes(p.id)); }
function filteredArticleDrinks() {
  const q = normalize(state.articleQuery || '');
  let list = [...state.drinks].sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  if (q) list = list.filter(d => normalize(`${d.name} ${d.category || ''} ${d.notes || ''} ${d.volume || ''}`).includes(q));
  return list;
}
function articleListHtml() {
  const drinks = filteredArticleDrinks();
  if (!drinks.length) return '<p class="emptyText">Keine passenden Artikel gefunden.</p>';
  return `<div class="articleListHead"><span>${drinks.length} Treffer</span><small>Antippen zum Bearbeiten</small></div><div class="articleList">${drinks.map(d => articleRowHtml(d)).join('')}</div>`;
}
function articleRowHtml(drink) {
  const included = managedPackages().filter(pkg => drink.packages?.[pkg.id] === 'included').map(pkg => pkg.name);
  return `<button class="articleRow ${drink.id === state.editingDrinkId ? 'selected' : ''}" data-action="editArticle" data-id="${esc(drink.id)}"><span><b>${esc(drink.name)}</b><small>${esc(drink.category || '')}${drink.volume ? ` · ${esc(drink.volume)}` : ''}</small><small>${included.length ? `Enthalten: ${esc(included.join(', '))}` : 'Nicht eindeutig enthalten'}</small></span><strong>${eur(drink.price)}</strong></button>`;
}
function editArticle(id) {
  state.editingDrinkId = id || null;
  renderArticleManagement();
  $('#articleForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
async function saveDrinkArticleForm(form) {
  if (!form) { alert('Artikelformular nicht gefunden.'); return; }
  const id = formValue(form, 'id');
  const drink = drinkById(id);
  if (!drink) { alert('Artikel nicht gefunden.'); return; }
  const packages = { ...(drink.packages || {}) };
  for (const pkg of managedPackages()) {
    const raw = formValue(form, `pkg_${pkg.id}`) || 'unclear';
    packages[pkg.id] = ['included', 'not_included', 'unclear'].includes(raw) ? raw : 'unclear';
  }
  const updated = {
    ...drink,
    price,
    category: formValue(form, 'category').trim() || drink.category || 'Ohne Kategorie',
    packages,
    manualOverride: true,
    updatedAt: nowIso()
  };
  await put('drinks', updated);

  let updatedLogs = 0;
  const applyLogs = !!form.elements.namedItem('applyLogs')?.checked;
  if (applyLogs) {
    const activeId = activeTripId();
    const relevantLogs = state.logs.filter(log => log.drinkId === id && (!activeId || (log.tripId || activeId) === activeId));
    for (const log of relevantLogs) {
      const person = personById(log.personId);
      const packageId = person?.packageId || log.packageId || 'none';
      await put('logs', {
        ...log,
        drinkName: updated.name,
        category: updated.category || '',
        price: Number(updated.price) || 0,
        packageId,
        packageStatus: statusForDrink(updated, packageId),
        updatedAt: nowIso()
      });
      updatedLogs += 1;
    }
  }
  await putSetting('barkarteVersion', { ...activeBarkarteVersion(), count: state.drinks.length, updatedAt: nowIso(), manualOverrides: true });
  await loadState();
  state.editingDrinkId = id;
  render();
  toast(`Artikel gespeichert${updatedLogs ? ` · ${updatedLogs} Einträge aktualisiert` : ''}`);
}

function categorySummaryHtml() {
  const rows = groupStats(state.drinks.map(d => ({ category: d.category || 'Ohne Kategorie', price: d.price, packageStatus: 'not_included' })), l => l.category || 'Ohne Kategorie');
  if (!rows.length) return '<p class="emptyText">Keine Barkartendaten vorhanden.</p>';
  return `<div class="statList">${rows.slice(0, 16).map(r => `<div class="statRow"><div><b>${esc(r.key)}</b><small>${r.count} Getränke</small></div><strong>${eur(r.value)}</strong></div>`).join('')}</div>`;
}

function comparisonHtml(cmp) {
  return `<div class="card"><h2>Letzter Preis-/Paketvergleich</h2><div class="kpiGrid compact">${kpi('Neu', String(cmp.newDrinks || 0), 'Getränke')}${kpi('Preisänderungen', String(cmp.priceChanges || 0), 'Positionen')}${kpi('Paketänderungen', String(cmp.packageChanges || 0), 'Status')}${kpi('Importiert', cmp.applied ? 'Ja' : 'Nein', cmp.version || '')}</div>${cmp.details?.length ? `<div class="miniList">${cmp.details.slice(0, 12).map(d => `<div><b>${esc(d.name)}</b><small>${esc(d.text)}</small></div>`).join('')}</div>` : ''}</div>`;
}

function viewSettings() {
  const b = activeBarkarteVersion();
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Einstellungen</h1><span class="subtle">${esc(APP_VERSION)}</span></div>
      <div class="card"><h2>Status</h2>
        ${infoRow('App-Version', APP_VERSION)}
        ${infoRow('Barkarten-Version', b.version || 'unbekannt')}
        ${infoRow('Geräte-ID', state.settings.deviceId || '')}
        ${infoRow('Offline-Status', state.online ? 'Online - Cache wird aktualisiert' : 'Offline - lokale Nutzung')}
        <div class="infoRow"><span>Update-Status</span><code id="updateStatusValue">${esc(updateStateLabel())}</code></div>
        ${infoRow('Speicher', 'IndexedDB lokal auf diesem Gerät')}
      </div>
      <div class="card themeCard"><div class="sectionHead"><h2>Darstellung</h2><span class="subtle">${effectiveTheme() === 'dark' ? 'Dunkel' : 'Hell'}</span></div>
        <div class="themeSwitch" role="group" aria-label="Farbdarstellung wählen">
          <button class="themeOption ${effectiveTheme() === 'light' ? 'active' : ''}" data-action="setTheme" data-id="light" aria-pressed="${effectiveTheme() === 'light'}"><span aria-hidden="true">☀</span><b>Hell</b></button>
          <button class="themeOption ${effectiveTheme() === 'dark' ? 'active' : ''}" data-action="setTheme" data-id="dark" aria-pressed="${effectiveTheme() === 'dark'}"><span aria-hidden="true">☾</span><b>Dunkel</b></button>
        </div>
        <p class="hint">Die Auswahl wird ausschließlich lokal auf diesem Gerät gespeichert.</p>
      </div>
      <div class="card"><h2>Verwaltung</h2><div class="buttonStack"><button class="secondary" data-route="trips">Reisen verwalten</button><button class="secondary" data-route="devices">Geräte & Personen</button><button class="secondary" data-route="barkarte">Barkarte verwalten</button></div></div>
      <div class="card"><h2>Aktionen</h2><div class="buttonStack"><button class="secondary" data-action="checkAppUpdate">Jetzt auf Update prüfen</button><button class="secondary" data-route="changelog">Changelog öffnen</button><button class="secondary" data-action="reRunOnboarding">Onboarding erneut anzeigen</button><button class="secondary" data-action="backupTest">Backup-Test starten</button></div></div>
      <div class="card"><h2>Offline-Hinweis</h2><p>Für die Kreuzfahrt: App vor Abfahrt einmal online öffnen, über Safari zum Home-Bildschirm hinzufügen, danach kurz im Flugmodus starten und einen Backup-Test durchführen.</p></div>
    </section>`;
}
function infoRow(label, value) { return `<div class="infoRow"><span>${esc(label)}</span><code>${esc(value)}</code></div>`; }

function viewChangelog() {
  return `<section class="screen"><div class="sectionHead"><h1>Changelog</h1><button class="mini" data-route="settings">Zurück</button></div><div class="card changelog">${CHANGELOG_HTML}</div></section>`;
}

async function trackDrink(drinkId) {
  const person = personById(state.selectedPersonId);
  const drink = drinkById(drinkId);
  if (!person) { alert('Bitte zuerst eine Person auswählen oder anlegen.'); state.route = 'devices'; render(); return; }
  if (!drink) return;
  const status = statusForDrink(drink, person.packageId);
  const id = `log_${uid()}`;
  const log = { id, mergeKey: `${state.settings.deviceId}:${id}`, tripId: state.currentTripId, personId: person.id, personName: person.name, drinkId: drink.id, drinkName: drink.name, category: drink.category || '', price: Number(drink.price) || 0, packageId: person.packageId || 'none', packageStatus: status, ts: Date.now(), trackedByDeviceId: state.settings.deviceId, trackedByDeviceName: state.settings.deviceName, createdAt: nowIso(), updatedAt: nowIso() };
  await put('logs', log);
  state.undoLog = log;
  await loadState();
  state.selectedPersonId = person.id;
  updateUndoDock();
  scheduleUndoAutoHide();
  toast(`${drink.name} gespeichert`);
  haptic();
  if (state.route === 'track') { renderTrackPersonContext(); }
  else render();
}
async function undoLast() {
  if (!state.undoLog) return;
  clearUndoAutoHide();
  await del('logs', state.undoLog.id);
  state.undoLog = null;
  await loadState();
  render();
  toast('Letzter Eintrag wurde entfernt');
}
function clearUndoAutoHide() {
  if (undoAutoHideTimer) {
    clearTimeout(undoAutoHideTimer);
    undoAutoHideTimer = null;
  }
}
function scheduleUndoAutoHide() {
  clearUndoAutoHide();
  undoAutoHideTimer = setTimeout(() => {
    state.undoLog = null;
    updateUndoDock();
    undoAutoHideTimer = null;
  }, 3000);
}
function updateUndoDock() {
  const dock = $('#undoDock');
  if (!dock) return;
  if (!state.undoLog) { dock.hidden = true; dock.innerHTML = ''; return; }
  dock.hidden = false;
  dock.innerHTML = `<div><b>${esc(state.undoLog.drinkName)}</b><span>${esc(state.undoLog.personName)} · gerade erfasst</span></div><button class="mini" data-action="undo">Rückgängig</button>`;
}

async function toggleFavorite(drinkId) {
  const favs = new Set(favoriteIds());
  favs.has(drinkId) ? favs.delete(drinkId) : favs.add(drinkId);
  await putSetting('favorites', [...favs]);
  haptic();
  if (state.route === 'track') { renderTrackList(); renderCategoryChips(); }
  else if (state.route === 'dashboard') renderDashboardQuick();
}
function recentDrinkIds() {
  const seen = new Set();
  const ids = [];
  for (const log of currentLogs()) {
    if (!seen.has(log.drinkId)) { seen.add(log.drinkId); ids.push(log.drinkId); }
    if (ids.length >= 12) break;
  }
  return ids;
}

function editLog(id) {
  const log = state.logs.find(row => row.id === id);
  if (!log) return;
  state.editingLogId = id;
  state.formDraft.log = {
    id: log.id,
    personId: log.personId || '',
    drinkId: log.drinkId || '',
    date: localDateInputValue(log.ts),
    time: localTimeInputValue(log.ts),
    price: String(Number(log.price) || 0).replace('.', ','),
    packageStatus: log.packageStatus || 'unclear',
    priceManuallyChanged: false
  };
  render();
  requestAnimationFrame(() => $('#logEditForm')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}
function cancelEditLog() {
  state.editingLogId = null;
  clearDraft('log');
  render();
}
function syncLogEditDerivedFields(form, changedName) {
  const person = personById(formValue(form, 'personId'));
  const drink = drinkById(formValue(form, 'drinkId'));
  if (!person || !drink) return;
  if (changedName === 'drinkId') {
    const barkartenPreis = String(Number(drink.price) || 0).replace('.', ',');
    setFormValue(form, 'price', barkartenPreis);
    state.formDraft.log.price = barkartenPreis;
    state.formDraft.log.priceManuallyChanged = false;
  }
  const status = statusForDrink(drink, person.packageId);
  setFormValue(form, 'packageStatus', status);
  state.formDraft.log.packageStatus = status;
}
async function saveLogForm(form) {
  if (!form) return;
  const id = formValue(form, 'id') || state.editingLogId;
  const original = state.logs.find(row => row.id === id);
  if (!original) throw new Error('Der Verlaufseintrag wurde nicht gefunden.');
  const person = personById(formValue(form, 'personId'));
  const drink = drinkById(formValue(form, 'drinkId'));
  if (!person) throw new Error('Bitte eine gültige Person auswählen.');
  if (!drink) throw new Error('Bitte ein gültiges Getränk auswählen.');
  const date = formValue(form, 'date');
  const time = formValue(form, 'time');
  if (!date || !time) throw new Error('Bitte Datum und Uhrzeit vollständig angeben.');
  const ts = localDateTimeToTimestamp(date, time);
  if (!Number.isFinite(ts)) throw new Error('Datum oder Uhrzeit ist ungültig.');
  const priceText = String(formValue(form, 'price') ?? '').trim().replace(',', '.');
  const enteredPrice = Number(priceText);
  if (!priceText || !Number.isFinite(enteredPrice) || enteredPrice < 0) throw new Error('Bitte einen gültigen, nicht negativen Preis angeben.');
  const drinkChanged = drink.id !== original.drinkId;
  const priceWasManuallyChanged = state.formDraft.log?.priceManuallyChanged === true;
  const price = drinkChanged && !priceWasManuallyChanged ? Number(drink.price) || 0 : enteredPrice;
  const selectedStatus = formValue(form, 'packageStatus');
  const packageStatus = ['included', 'not_included', 'unclear'].includes(selectedStatus) ? selectedStatus : statusForDrink(drink, person.packageId);
  const updated = {
    ...original,
    personId: person.id,
    personName: person.name,
    drinkId: drink.id,
    drinkName: drink.name,
    category: drink.category || '',
    price,
    packageId: person.packageId || 'none',
    packageStatus,
    ts,
    updatedAt: nowIso()
  };
  await put('logs', updated);
  if (state.undoLog?.id === id) state.undoLog = updated;
  state.editingLogId = null;
  clearDraft('log');
  await loadState();
  render();
  toast('Verlaufseintrag aktualisiert');
  haptic();
}
async function deleteLog(id) {
  const log = state.logs.find(l => l.id === id);
  if (!log) return;
  if (!confirm(`Eintrag wirklich löschen?\n\n${log.drinkName} · ${log.personName}`)) return;
  await del('logs', id);
  if (state.editingLogId === id) { state.editingLogId = null; clearDraft('log'); }
  if (state.undoLog?.id === id) {
    clearUndoAutoHide();
    state.undoLog = null;
  }
  await loadState();
  render();
}

function fillTripForm(id) {
  const trip = id ? state.trips.find(t => t.id === id) : null;
  state.editingTripId = trip?.id || null;
  state.formDraft.trip = trip ? { id: trip.id || '', name: trip.name || '', ship: trip.ship || '', startDate: trip.startDate || '', endDate: trip.endDate || '' } : {};
  setFieldValue('#tripIdInput', trip?.id || '');
  setFieldValue('#tripNameInput', trip?.name || '');
  setFieldValue('#tripShipInput', trip?.ship || '');
  setFieldValue('#tripStartInput', trip?.startDate || '');
  setFieldValue('#tripEndInput', trip?.endDate || '');
  const box = $('#tripForm');
  const heading = $('#tripForm h2');
  const button = $('#tripSaveButton');
  if (heading) heading.textContent = trip ? 'Reise bearbeiten' : 'Reise anlegen';
  if (button) button.textContent = trip ? 'Änderungen speichern' : 'Speichern';
  box?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function saveTripForm(form = null) {
  setButtonBusy('#tripSaveButton', true);
  try {
    const id = fieldValue('#tripIdInput', form, 'id') || state.editingTripId || `trip_${uid()}`;
    const name = fieldValue('#tripNameInput', form, 'name').trim();
    if (!name) {
      alert('Bitte gib einen Reisenamen ein.');
      $('#tripNameInput')?.focus();
      return;
    }
    const existing = state.trips.find(t => t.id === id) || {};
    const trip = {
      ...existing,
      id,
      name,
      ship: fieldValue('#tripShipInput', form, 'ship').trim(),
      startDate: fieldValue('#tripStartInput', form, 'startDate'),
      endDate: fieldValue('#tripEndInput', form, 'endDate'),
      archived: !!existing.archived,
      createdAt: existing.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    await put('trips', trip);
    const savedTrip = await get('trips', id);
    if (!savedTrip || savedTrip.id !== id) throw new Error('IndexedDB hat den Reisedatensatz nicht bestätigt.');
    await putSetting('currentTripId', id);
    clearDraft('trip');
    state.currentTripId = id;
    state.editingTripId = null;
    await loadState();
    state.currentTripId = id;
    render();
    toast(existing.id ? 'Reiseänderungen gespeichert' : 'Reise angelegt');
  } catch (error) {
    alert(`Reise konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setButtonBusy('#tripSaveButton', false);
  }
}
async function saveOnboardingTrip(form) {
  const current = currentTrip();
  const id = current?.id || `trip_${uid()}`;
  const trip = { ...(current || {}), id, name: formValue(form, 'name').trim() || 'Aktuelle Reise', ship: formValue(form, 'ship').trim(), startDate: formValue(form, 'startDate'), endDate: formValue(form, 'endDate'), archived: false, createdAt: current?.createdAt || nowIso(), updatedAt: nowIso() };
  await put('trips', trip);
  await putSetting('currentTripId', id);
  clearDraft('onboardingTrip');
  await loadState();
  toast('Reise gespeichert');
  render();
}
async function toggleArchiveTrip(id) {
  const trip = state.trips.find(t => t.id === id); if (!trip) return;
  trip.archived = !trip.archived; trip.updatedAt = nowIso();
  await put('trips', trip); await loadState(); render();
}
async function deleteTrip(id) {
  const trip = state.trips.find(t => t.id === id); if (!trip) return;
  const answer = prompt(`Reise „${trip.name}“ mit allen Einträgen löschen?\nZum Bestätigen bitte LÖSCHEN eingeben.`);
  if (answer !== 'LÖSCHEN') return;
  for (const p of state.persons.filter(p => p.tripId === id)) await del('persons', p.id);
  for (const l of state.logs.filter(l => l.tripId === id)) await del('logs', l.id);
  await del('trips', id);
  const remaining = (await all('trips')).filter(t => !t.archived);
  await putSetting('currentTripId', remaining[0]?.id || (await all('trips'))[0]?.id || null);
  await loadState(); render();
}

function fillPersonForm(id) {
  const person = id ? state.persons.find(p => p.id === id) : null;
  state.editingPersonId = person?.id || null;
  state.formDraft.person = person ? { id: person.id || '', name: person.name || '', packageId: person.packageId || 'none', packagePrice: person.packagePrice ?? '' } : {};
  setFieldValue('#personIdInput', person?.id || '');
  setFieldValue('#personNameInput', person?.name || '');
  setFieldValue('#personPackageInput', person?.packageId || 'none');
  setFieldValue('#personPackagePriceInput', person?.packagePrice ?? '');
  const box = $('#personForm');
  const heading = $('#personForm h2');
  const button = $('#personSaveButton');
  if (heading) heading.textContent = person ? 'Person bearbeiten' : 'Person anlegen';
  if (button) button.textContent = person ? 'Änderungen speichern' : 'Person speichern';
  box?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function savePersonForm(form = null) {
  setButtonBusy('#personSaveButton', true);
  try {
    const trip = currentTrip();
    const tripId = activeTripId() || trip?.id;
    if (!trip || !tripId) { alert('Bitte zuerst eine Reise anlegen.'); return; }

    const name = fieldValue('#personNameInput', form, 'name').trim();
    if (!name) {
      alert('Bitte gib einen Namen ein.');
      $('#personNameInput')?.focus();
      return;
    }

    const id = fieldValue('#personIdInput', form, 'id') || state.editingPersonId || `person_${uid()}`;
    const existing = state.persons.find(p => p.id === id) || {};
    const rawPackagePrice = fieldValue('#personPackagePriceInput', form, 'packagePrice').trim();
    const packagePrice = rawPackagePrice ? num(rawPackagePrice) : '';
    const colorIndex = currentPersons().filter(p => p.id !== id).length % PERSON_COLORS.length;
    const person = {
      ...existing,
      id,
      tripId,
      name,
      packageId: fieldValue('#personPackageInput', form, 'packageId') || 'none',
      packagePrice,
      color: existing.color || PERSON_COLORS[colorIndex],
      createdAt: existing.createdAt || nowIso(),
      updatedAt: nowIso()
    };

    await put('persons', person);
    const savedPerson = await get('persons', id);
    if (!savedPerson || savedPerson.id !== id) throw new Error('IndexedDB hat den Personendatensatz nicht bestätigt.');
    if (savedPerson.tripId !== tripId) throw new Error('Die gespeicherte Person ist nicht der aktiven Reise zugeordnet.');
    await putSetting('currentTripId', tripId);
    await putSetting(selectedPersonSettingKey(tripId), id);
    clearDraft('person');
    state.currentTripId = tripId;
    state.selectedPersonId = id;
    state.editingPersonId = null;
    await loadState();
    state.currentTripId = tripId;
    state.selectedPersonId = id;
    render();
    toast(existing.id ? 'Personenänderungen gespeichert' : 'Person angelegt');
  } catch (error) {
    alert(`Person konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setButtonBusy('#personSaveButton', false);
  }
}
async function saveDeviceForm(form) {
  if (!form) { alert('Geräteformular nicht gefunden. Bitte Seite neu laden.'); return; }
  await putSetting('deviceName', formValue(form, 'deviceName').trim() || 'Mein iPhone');
  clearDraft('device');
  await loadState(); render(); toast('Gerätename gespeichert');
}
async function deletePerson(id) {
  const person = state.persons.find(p => p.id === id); if (!person) return;
  const count = state.logs.filter(l => l.personId === id).length;
  if (count) { alert('Diese Person hat Verlaufseinträge. Lösche oder bearbeite zuerst die Einträge im Verlauf.'); return; }
  if (!confirm(`Person „${person.name}“ löschen?`)) return;
  await del('persons', id); await loadState(); render();
}

function exportTrip() {
  const trip = currentTrip();
  if (!trip) return;
  const payload = {
    type: 'CruiseSipExport',
    version: APP_VERSION,
    exportedAt: nowIso(),
    device: { id: state.settings.deviceId, name: state.settings.deviceName },
    barkarteVersion: activeBarkarteVersion(),
    trip,
    persons: currentPersons(),
    logs: currentLogs(),
    favorites: favoriteIds()
  };
  downloadJson(`CruiseSip_${safeFile(trip.name)}_${new Date().toISOString().slice(0, 10)}.json`, payload);
}
function backupTest() {
  const payload = { type: 'CruiseSipBackupTest', version: APP_VERSION, createdAt: nowIso(), deviceId: state.settings.deviceId, tripId: state.currentTripId, message: 'Backup-Test erfolgreich erstellt.' };
  downloadJson(`CruiseSip_Backup_Test_${new Date().toISOString().slice(0, 10)}.json`, payload);
  putSetting('lastBackupTestAt', nowIso());
}
function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function safeFile(value) { return String(value || 'Reise').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'Reise'; }

async function importTrip(text, fileName) {
  const payload = JSON.parse(text);
  if (!payload || payload.type !== 'CruiseSipExport') throw new Error('Keine gültige CruiseSip-Exportdatei.');
  if (!currentTrip()) throw new Error('Bitte zuerst eine Zielreise anlegen.');
  const existingPersons = currentPersons();
  const personMap = new Map();
  for (const imported of payload.persons || []) {
    const match = existingPersons.find(p => normalize(p.name) === normalize(imported.name));
    if (match) { personMap.set(imported.id, match.id); continue; }
    const id = `person_${uid()}`;
    personMap.set(imported.id, id);
    await put('persons', { ...imported, id, tripId: state.currentTripId, color: PERSON_COLORS[(existingPersons.length + personMap.size) % PERSON_COLORS.length], createdAt: nowIso(), updatedAt: nowIso() });
  }
  const existingKeys = new Set((await all('logs')).map(l => l.mergeKey || `${l.trackedByDeviceId || ''}:${l.originId || l.id}`));
  let added = 0, duplicates = 0;
  for (const imported of payload.logs || []) {
    const mergeKey = imported.mergeKey || `${imported.trackedByDeviceId || payload.device?.id || 'unknown'}:${imported.originId || imported.id}`;
    if (existingKeys.has(mergeKey)) { duplicates += 1; continue; }
    const id = `log_${uid()}`;
    await put('logs', { ...imported, id, originId: imported.originId || imported.id, mergeKey, tripId: state.currentTripId, personId: personMap.get(imported.personId) || imported.personId, trackedByDeviceId: imported.trackedByDeviceId || payload.device?.id || 'unknown', trackedByDeviceName: imported.trackedByDeviceName || payload.device?.name || 'Import', importedAt: nowIso(), updatedAt: nowIso() });
    existingKeys.add(mergeKey);
    added += 1;
  }
  await put('imports', { id: `import_${uid()}`, kind: 'Reise', fileName, importedAt: nowIso(), sourceDeviceId: payload.device?.id || '', sourceDeviceName: payload.device?.name || '', added, duplicates });
  await loadState(); render();
  toast(`Import abgeschlossen: ${added} neu, ${duplicates} doppelt`);
}

function normalizeDrinks(drinks) {
  return drinks.map(raw => {
    const name = String(raw.name || raw.Name || raw.getraenk || raw.Getränk || '').trim();
    const id = String(raw.id || raw.ID || slug(name)).trim();
    const packages = raw.packages || {
      all_in: raw.all_in || raw.package_all_in || raw['packages.all_in'] || 'unclear',
      fun: raw.fun || raw.package_fun || raw['packages.fun'] || 'unclear',
      kids_teens_all_in: raw.kids_teens_all_in || raw.package_kids_teens_all_in || raw['packages.kids_teens_all_in'] || 'unclear',
      kids_teens_fun: raw.kids_teens_fun || raw.package_kids_teens_fun || raw['packages.kids_teens_fun'] || 'unclear'
    };
    return { id, name, category: raw.category || raw.Kategorie || 'Ohne Kategorie', price: num(raw.price ?? raw.Preis), volume: raw.volume || raw.Menge || '', notes: raw.notes || raw.Hinweis || '', packages: cleanPackages(packages) };
  }).filter(d => d.name && Number.isFinite(d.price));
}
function cleanPackages(packages) {
  const allowed = new Set(['included', 'not_included', 'unclear']);
  const clean = {};
  const keys = ['all_in', 'fun', 'kids_teens_all_in', 'kids_teens_fun'];
  keys.forEach(key => {
    let v = String(packages?.[key] || 'unclear').trim().toLowerCase();
    if (['ja', 'yes', 'enthalten', 'included', 'in'].includes(v)) v = 'included';
    if (['nein', 'no', 'nicht enthalten', 'not included', 'not_included', 'out'].includes(v)) v = 'not_included';
    clean[key] = allowed.has(v) ? v : 'unclear';
  });
  return clean;
}
async function importBarkarte(text, fileName) {
  let data;
  if (fileName.toLowerCase().endsWith('.csv')) data = { version: `csv_${new Date().toISOString().slice(0, 10)}_${uid()}`, source: fileName, drinks: parseCsv(text) };
  else data = JSON.parse(text);
  if (!data || !Array.isArray(data.drinks)) throw new Error('Barkarte muss ein JSON mit drinks[] sein oder eine CSV mit Kopfzeile.');
  const incoming = normalizeDrinks(data.drinks);
  if (!incoming.length) throw new Error('Keine gültigen Getränke gefunden.');
  const comparison = compareDrinks(state.drinks, incoming);
  const textSummary = `Neue Getränke: ${comparison.newDrinks}\nPreisänderungen: ${comparison.priceChanges}\nPaketänderungen: ${comparison.packageChanges}\n\nNeue Barkarte übernehmen?`;
  const applied = confirm(textSummary);
  comparison.applied = applied;
  comparison.version = data.version || fileName;
  comparison.fileName = fileName;
  await putSetting('lastBarkarteComparison', comparison);
  if (applied) {
    await clearStore('drinks');
    for (const drink of incoming) await put('drinks', drink);
    await put('barkarten', { id: data.version || `barkarte_${uid()}`, version: data.version || fileName, source: data.source || fileName, importedAt: nowIso(), count: incoming.length, isDefault: false });
    await putSetting('barkarteVersion', { version: data.version || fileName, source: data.source || fileName, count: incoming.length, updatedAt: nowIso() });
  }
  await put('imports', { id: `import_${uid()}`, kind: 'Barkarte', fileName, importedAt: nowIso(), added: comparison.newDrinks, duplicates: 0 });
  await loadState(); render();
}
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if ((c === ';' || c === ',') && !quoted) { row.push(cell); cell = ''; continue; }
    if ((c === '\n' || c === '\r') && !quoted) { if (cell || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; } if (c === '\r' && n === '\n') i++; continue; }
    cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}
function compareDrinks(oldDrinks, newDrinks) {
  const byKey = new Map(oldDrinks.map(d => [d.id || slug(d.name), d]));
  const byName = new Map(oldDrinks.map(d => [normalize(d.name), d]));
  const details = [];
  let newCount = 0, priceChanges = 0, packageChanges = 0;
  for (const drink of newDrinks) {
    const old = byKey.get(drink.id) || byName.get(normalize(drink.name));
    if (!old) { newCount += 1; details.push({ name: drink.name, text: `neu · ${eur(drink.price)}` }); continue; }
    if (Math.abs((Number(old.price) || 0) - (Number(drink.price) || 0)) >= 0.01) { priceChanges += 1; details.push({ name: drink.name, text: `Preis ${eur(old.price)} → ${eur(drink.price)}` }); }
    for (const key of managedPackages().map(pkg => pkg.id)) {
      if ((old.packages?.[key] || 'unclear') !== (drink.packages?.[key] || 'unclear')) { packageChanges += 1; details.push({ name: drink.name, text: `${packageName(key)}: ${statusLabel(old.packages?.[key] || 'unclear')} → ${statusLabel(drink.packages?.[key] || 'unclear')}` }); }
    }
  }
  return { newDrinks: newCount, priceChanges, packageChanges, details: details.slice(0, 50), checkedAt: nowIso() };
}

function pad2(value) { return String(value).padStart(2, '0'); }
function localDateInputValue(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function localTimeInputValue(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? '' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function localDateTimeToTimestamp(date, time) { const match = String(time || '').match(/^(\d{2}):(\d{2})$/); if (!date || !match) return NaN; const [year, month, day] = String(date).split('-').map(Number); const hour = Number(match[1]), minute = Number(match[2]); if (![year, month, day, hour, minute].every(Number.isFinite) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return NaN; const d = new Date(year, month - 1, day, hour, minute, 0, 0); return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && d.getHours() === hour && d.getMinutes() === minute ? d.getTime() : NaN; }
function formatDate(value) { if (!value) return 'offen'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
function formatDateTime(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function formatDateKey(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? 'Unbekannt' : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }); }
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2200);
}

const CHANGELOG_HTML = `
  <h2>Version 4.3.7</h2>
  <ul>
    <li>Beim Wechsel des Getränks in einer Verlaufskorrektur wird der aktuelle Barkartenpreis sofort automatisch eingetragen.</li>
    <li>Der Paketstatus wird weiterhin passend zur ausgewählten Person und deren Getränkepaket aktualisiert.</li>
    <li>Eine manuelle Preisabweichung bleibt nach der automatischen Aktualisierung für Sonderfälle möglich.</li>
  </ul>
  <h2>Version 4.3.6</h2>
  <ul>
    <li>Fehlbuchungen können direkt im Verlauf über ein natives, iPhone-taugliches Formular korrigiert werden.</li>
    <li>Person, Getränk, Datum, Uhrzeit, Preis und Paketstatus sind bearbeitbar.</li>
    <li>Nach dem Speichern werden Verlauf, Tagesübersicht, Analyse, Häufigkeiten und Zuletzt-Sortierung sofort aus den korrigierten Daten berechnet.</li>
    <li>Löschen bleibt mit Sicherheitsabfrage direkt am Eintrag möglich.</li>
  </ul>
  <h2>Version 4.3.5</h2>
  <ul>
    <li>Separate Karte „Aktive Person“ aus der Tracken-Ansicht entfernt.</li>
    <li>Der Personen-Schnellwechsel ist jetzt die einzige sichtbare Personensteuerung.</li>
    <li>Kompakte Kopfzeile „Getränk erfassen für …“ zeigt zusätzlich das zugeordnete Getränkepaket.</li>
  </ul>
  <h2>Version 4.3.4</h2>
  <ul>
    <li>Update-Prüfung für installierte iPhone-PWAs stabilisiert und HTTP-Zwischenspeicherung des Service Workers umgangen.</li>
    <li>Neue Versionen werden sichtbar angekündigt und nach Bestätigung kontrolliert aktiviert.</li>
    <li>Die lokalen IndexedDB-Daten bleiben beim App-Update vollständig erhalten.</li>
  </ul>
  <h2>Version 4.3.3</h2>
  <ul>
    <li>Personen-Schnellwechsel direkt oberhalb der Getränkekacheln ergänzt.</li>
    <li>Aktive Person, individuelle Paketkennzeichnung und nutzungsabhängige Sortierung werden sofort synchron aktualisiert.</li>
    <li>Die zuletzt gewählte Person wird je Reise lokal gespeichert.</li>
  </ul>
  <h2>Version 4.3.2</h2>
  <ul>
    <li>Individuelle Sortierung der Getränkekacheln ergänzt.</li>
    <li>Verfügbar sind häufig genutzt, zuletzt genutzt, Preis aufsteigend, Preis absteigend und alphabetisch.</li>
    <li>Die Auswahl wird lokal gespeichert; nutzungsabhängige Sortierungen beziehen sich auf die aktive Person.</li>
  </ul>
  <h2>Version 4.3.1</h2>
  <ul>
    <li>Persistenter Wechsler zwischen heller und dunkler Ansicht im Setup ergänzt.</li>
    <li>Abstände zwischen Schnellzugriff, Favoriten und zuletzt getrunkenen Getränken auf der Home-Seite vereinheitlicht.</li>
  </ul>
  <h2>Version 4.3.0</h2>
  <ul>
    <li>Tagesübersicht auf der Home-Seite mit Paketstatus, Personenaufteilung und letzter Erfassung ergänzt.</li>
    <li>Unklare Paketfälle bleiben getrennt sichtbar und werden nicht als sichere Ersparnis behandelt.</li>
  </ul>
  <h2>Version 4.2.0</h2>
  <ul>
    <li>Tracken-Ansicht mit großen, zweispaltigen Getränkekacheln für die iPhone-Bedienung optimiert.</li>
    <li>Getränkesymbol, Name, Kategorie, Paketstatus und Preis sind direkt in jeder Kachel sichtbar.</li>
    <li>Favoritenstern sowie die Filter für Alle, Empfohlen, Favoriten und Zuletzt bleiben dauerhaft erreichbar.</li>
  </ul>
  <h2>Version 4.1.0</h2>
  <ul>
    <li>Auswertungen erweitert: Zeitraumfilter, Paket-Break-even pro Person, Statusübersicht sowie getrennte Analyse für außerhalb Paket und unklare Getränke.</li>
    <li>Konservative Berechnung: Nur eindeutig im Paket enthaltene Getränke werden gegen den Paketpreis gerechnet; unklare Getränke bleiben gesondert sichtbar.</li>
  </ul>
  <h2>Version 4.0.0</h2>
  <ul>
    <li>Fix: Reise- und Personenformulare sind jetzt echte Formular-Submit-Elemente mit zusätzlichem Touch-/Click-Fallback, damit Speichern auf iPhone/Safari zuverlässiger ausgelöst wird.</li>
    <li>Fix: Bearbeitete Reisen werden jetzt zuverlässig in IndexedDB gespeichert; Schreibvorgänge warten auf den vollständigen Transaktionsabschluss und zeigen eine Speicherbestätigung.</li>
    <li>Fix: Personen speichern jetzt auch dann zuverlässig, wenn iPhone/Safari den nativen Formular-Submit nicht auslöst. Der Button nutzt zusätzlich eine direkte Speicheraktion und prüft die gespeicherte Reisezuordnung.</li>
    <li>Fix: Personen lassen sich jetzt zuverlässig anlegen und bearbeiten; der Paketpreis akzeptiert deutsche Kommaschreibweise und blockiert den Speichervorgang auf iPhone/Safari nicht mehr.</li>
    <li>Fix: Aktionsbuttons verhindern jetzt konsequent unbeabsichtigte Standardaktionen im Formularumfeld.</li>
    <li>Projektstruktur vollständig neu aufgebaut: css, js, data, icons, assets und docs.</li>
    <li>Redesign im iPhone-App-Stil mit Bottom Navigation, Cards, Dark Mode, flüssigen Übergängen und einhändiger Bedienung.</li>
    <li>Onboarding für Offline-Einrichtung, Home-Bildschirm-Installation, Geräteprüfung, Barkarte, Backup-Test und Reiseanlage.</li>
    <li>Tracking neu strukturiert: stabile Suche ohne Fokusverlust, dauerhafter Rückgängig-Dock, Favoriten, Kategorien und zuletzt verwendete Getränke.</li>
    <li>Verlauf als Timeline mit Personenfarben, Filtern, Bearbeiten und Löschen.</li>
    <li>Reiseverwaltung mit Anlegen, Bearbeiten, Archivieren und Löschen mit Sicherheitsabfrage.</li>
    <li>Geräteverwaltung mit Export je Reise, Zusammenführen, Dublettenerkennung und Importprotokoll.</li>
    <li>Auswertungen pro Person, Getränk, Kategorie, Tag und Reise inklusive konservativer Ersparnisberechnung.</li>
    <li>Barkartenverwaltung mit strukturiertem Import, Preisvergleich, neuen Getränken und Paketänderungen.</li>
    <li>Migration aus der bisherigen v3 IndexedDB wird beim ersten Start versucht.</li>
  </ul>
  <h2>Version 3.1.0</h2>
  <ul><li>Icon-Design, Reise-Dashboard, dauerhafter Rückgängig-Button und stabilisierte Suche.</li></ul>`;

bootstrap().catch(error => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>CruiseSip konnte nicht starten</h1><p>${esc(error.message || error)}</p></main>`;
});
