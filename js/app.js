'use strict';

const APP_VERSION = '4.0.0';
const APP_NAME = 'CruiseSip';
const DB_NAME = 'cruisesip_v4';
const LEGACY_DB_NAME = 'gt_db_v3';
const DB_VERSION = 1;
const CACHE_HINT = 'GitHub Pages / PWA / Offline';

const STORE_NAMES = ['settings', 'trips', 'persons', 'drinks', 'logs', 'imports', 'barkarten'];
const PERSON_COLORS = ['#e0f2fe', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe', '#ffedd5', '#ccfbf1', '#f1f5f9'];
const QUICK_TERMS = ['kaffee', 'cappuccino', 'latte', 'espresso', 'kakao', 'tee', 'cola', 'fanta', 'sprite', 'wasser', 'apfelsaft', 'orangensaft', 'aida iced tea', 'aida lemonade', 'dodo', 'milchshake', 'radeberger', 'aperol', 'hugo', 'sprizz'];

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
  query: '',
  category: 'Empfohlen',
  historyFilter: 'today',
  statsFilter: 'trip',
  undoLog: null,
  pendingFileMode: null,
  lastBarkarteComparison: null,
  online: navigator.onLine
};

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
function bindTap(selector, handler) {
  const element = $(selector);
  if (!element) return;
  let lastTouch = 0;
  element.addEventListener('touchend', event => {
    event.preventDefault();
    event.stopPropagation();
    lastTouch = Date.now();
    handler(event);
  }, { passive: false });
  element.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() - lastTouch < 600) return;
    handler(event);
  });
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
  if (!state.selectedPersonId || !currentPersons().some(p => p.id === state.selectedPersonId)) state.selectedPersonId = currentPersons()[0]?.id || null;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function setOnlineState() {
  state.online = navigator.onLine;
  document.documentElement.dataset.online = state.online ? 'online' : 'offline';
  const dot = $('#onlineDot');
  if (dot) dot.textContent = state.online ? 'Online' : 'Offline';
}

function bindShell() {
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  $('#fileInput').addEventListener('change', handleFileInput);
}

async function handleClick(event) {
  const target = event.target.closest('[data-action], [data-route]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.route) {
    state.route = target.dataset.route;
    state.query = '';
    render();
    haptic();
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action) return;

  if (action === 'finishOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; await loadState(); render(); return; }
  if (action === 'skipOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; render(); return; }
  if (action === 'setTrip') { await putSetting('currentTripId', id); state.currentTripId = id; state.selectedPersonId = currentPersons()[0]?.id || null; render(); return; }
  if (action === 'editTrip') { fillTripForm(id); return; }
  if (action === 'archiveTrip') { await toggleArchiveTrip(id); return; }
  if (action === 'deleteTrip') { await deleteTrip(id); return; }
  if (action === 'resetTripForm') { fillTripForm(null); return; }
  if (action === 'saveTrip') { await saveTripForm(); return; }
  if (action === 'selectPerson') { state.selectedPersonId = id; render(); return; }
  if (action === 'editPerson') { fillPersonForm(id); return; }
  if (action === 'deletePerson') { await deletePerson(id); return; }
  if (action === 'resetPersonForm') { fillPersonForm(null); return; }
  if (action === 'savePerson') { await savePersonForm(); return; }
  if (action === 'saveDevice') { await saveDeviceForm($('#deviceForm')); return; }
  if (action === 'setCategory') { state.category = id; renderTrackList(); renderCategoryChips(); return; }
  if (action === 'setHistoryFilter') { state.historyFilter = id; render(); return; }
  if (action === 'trackDrink') { await trackDrink(id); return; }
  if (action === 'toggleFavorite') { await toggleFavorite(id); renderTrackList(); renderDashboardQuick(); return; }
  if (action === 'undo') { await undoLast(); return; }
  if (action === 'editLog') { await editLog(id); return; }
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
  if (formId === 'tripForm') await saveTripForm(form);
  if (formId === 'personForm') await savePersonForm(form);
  if (formId === 'deviceForm') await saveDeviceForm(form);
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
  updateUndoDock();
  setOnlineState();
}

function updateShell() {
  const trip = currentTrip();
  $('#appVersion').textContent = `v${APP_VERSION}`;
  $('#tripTitle').textContent = trip ? short(trip.name, 24) : 'Keine Reise';
  $('#onlineDot').textContent = state.online ? 'Online' : 'Offline';
  $$('.navButton').forEach(b => b.classList.toggle('active', b.dataset.route === state.route || (state.route === 'onboarding' && b.dataset.route === 'settings')));
  document.documentElement.dataset.theme = state.settings.theme || 'system';
}

function bindRenderedControls() {
  bindTap('#tripSaveButton', () => saveTripForm());
  bindTap('#personSaveButton', () => savePersonForm());
  bindTap('#deviceSaveButton', () => saveDeviceForm($('#deviceForm')));
}

function bindInputs() {
  const search = $('#drinkSearch');
  if (search) {
    search.value = state.query;
    search.addEventListener('input', event => {
      state.query = event.target.value;
      renderTrackList();
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
        <label>Reisename<input name="name" required placeholder="z. B. AIDA Sommer 2026" value="${esc(currentTrip()?.name || '')}"></label>
        <label>Schiff<input name="ship" placeholder="z. B. AIDAcosma" value="${esc(currentTrip()?.ship || '')}"></label>
        <div class="twoCols"><label>Start<input name="startDate" type="date" value="${esc(currentTrip()?.startDate || '')}"></label><label>Ende<input name="endDate" type="date" value="${esc(currentTrip()?.endDate || '')}"></label></div>
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
      <div id="dashboardQuick">${dashboardQuickHtml(favorites, recent)}</div>
      ${setupWarningsHtml()}
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
      <div class="stickyHeader">
        <div class="sectionHead"><h1>Tracken</h1><button class="mini" data-route="devices">Personen</button></div>
        ${persons.length ? personChips(persons) : '<div class="card warningCard"><p>Lege zuerst Personen an.</p><button class="secondary" data-route="devices">Person anlegen</button></div>'}
        <div class="searchBox"><span>⌕</span><input id="drinkSearch" inputmode="search" autocomplete="off" placeholder="Getränk suchen …" value="${esc(state.query)}"></div>
        <div id="categoryChips">${categoryChipsHtml()}</div>
      </div>
      <div id="drinkList">${drinkListHtml()}</div>
    </section>`;
}
function personChips(persons) { return `<div class="chipScroller personScroller">${persons.map((p, i) => `<button class="personChip ${p.id === state.selectedPersonId ? 'active' : ''}" style="--person:${esc(p.color || PERSON_COLORS[i % PERSON_COLORS.length])}" data-action="selectPerson" data-id="${esc(p.id)}"><span>${esc(p.name)}</span><small>${esc(packageName(p.packageId))}</small></button>`).join('')}</div>`; }
function categoryChipsHtml() { return `<div class="chipScroller">${categories().map(cat => `<button class="filterChip ${cat === state.category ? 'active' : ''}" data-action="setCategory" data-id="${esc(cat)}">${esc(cat)}</button>`).join('')}</div>`; }
function renderCategoryChips() { const el = $('#categoryChips'); if (el) el.innerHTML = categoryChipsHtml(); }
function renderTrackList() { const el = $('#drinkList'); if (el) el.innerHTML = drinkListHtml(); }
function categories() {
  const cats = [...new Set(state.drinks.map(d => d.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  return ['Empfohlen', 'Favoriten', 'Zuletzt', ...cats, 'Alle'];
}
function filteredDrinks() {
  const q = normalize(state.query);
  const fav = new Set(favoriteIds());
  const recent = new Set(recentDrinkIds());
  let list = state.drinks;
  if (state.category === 'Favoriten') list = list.filter(d => fav.has(d.id));
  else if (state.category === 'Zuletzt') list = list.filter(d => recent.has(d.id));
  else if (state.category === 'Empfohlen') list = list.filter(d => fav.has(d.id) || recent.has(d.id) || QUICK_TERMS.some(t => normalize(d.name).includes(t)));
  else if (state.category !== 'Alle') list = list.filter(d => d.category === state.category);
  if (q) list = list.filter(d => normalize(`${d.name} ${d.category} ${d.notes || ''} ${d.volume || ''}`).includes(q));
  return list.sort((a, b) => {
    const favDiff = Number(fav.has(b.id)) - Number(fav.has(a.id));
    if (favDiff) return favDiff;
    const recDiff = Number(recent.has(b.id)) - Number(recent.has(a.id));
    if (recDiff) return recDiff;
    return String(a.name).localeCompare(String(b.name), 'de');
  }).slice(0, 80);
}
function drinkListHtml() {
  const person = personById(state.selectedPersonId);
  const fav = new Set(favoriteIds());
  const drinks = filteredDrinks();
  if (!currentPersons().length) return '';
  if (!drinks.length) return '<div class="card emptyText">Keine passenden Getränke gefunden.</div>';
  return `<div class="drinkGrid">${drinks.map(d => {
    const status = person ? statusForDrink(d, person.packageId) : 'unclear';
    return `<article class="drinkCard">
      <button class="favButton ${fav.has(d.id) ? 'active' : ''}" data-action="toggleFavorite" data-id="${esc(d.id)}" aria-label="Favorit">★</button>
      <button class="drinkMain" data-action="trackDrink" data-id="${esc(d.id)}">
        <span class="drinkTitle">${esc(d.name)}</span>
        <span class="drinkMeta">${esc(d.category || '')}${d.volume ? ` · ${esc(d.volume)}` : ''}</span>
        <span class="statusBadge ${statusClass(status)}">${esc(statusLabel(status))}</span>
      </button>
      <button class="priceButton" data-action="trackDrink" data-id="${esc(d.id)}">${eur(d.price)}</button>
    </article>`;
  }).join('')}</div>`;
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
  return `<article class="timelineItem" style="--person:${esc(person.color || '#f1f5f9')}">
    <div class="timelineMarker"></div>
    <div class="timelineCard">
      <div class="logTop"><b>${statusDot(log.packageStatus)}${esc(log.drinkName)}</b><span>${eur(log.price)}</span></div>
      <div class="logMeta"><span class="personPill">${esc(person.name)}</span><span>${esc(formatDateTime(log.ts))}</span><span>${esc(statusLabel(log.packageStatus))}</span></div>
      <div class="logActions"><button class="mini" data-action="editLog" data-id="${esc(log.id)}">Bearbeiten</button><button class="mini dangerText" data-action="deleteLog" data-id="${esc(log.id)}">Löschen</button></div>
    </div>
  </article>`;
}

function viewStats() {
  const logs = currentLogs();
  const total = calc(logs);
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Auswertungen</h1><span class="subtle">${esc(currentTrip()?.name || '')}</span></div>
      <div class="kpiGrid">
        ${kpi('Konsumwert', eur(total.value), `${total.count} Getränke`)}
        ${kpi('Ersparnis', eur(total.saved), 'nur eindeutig enthalten')}
        ${kpi('Zu zahlen', eur(total.paid), 'nicht enthalten/unklar')}
        ${kpi('Unklar', eur(total.unclear), 'an Bord prüfen')}
      </div>
      ${statsSection('Pro Person', groupStats(logs, l => personById(l.personId)?.name || l.personName || 'Unbekannt'))}
      ${statsSection('Pro Getränk', groupStats(logs, l => l.drinkName || 'Unbekannt'))}
      ${statsSection('Pro Kategorie', groupStats(logs, l => l.category || 'Ohne Kategorie'))}
      ${statsSection('Pro Tag', groupStats(logs, l => formatDateKey(l.ts)))}
      ${statsSection('Lieblingsgetränke', groupStats(logs, l => l.drinkName || 'Unbekannt').sort((a, b) => b.count - a.count).slice(0, 8))}
    </section>`;
}
function groupStats(logs, keyFn) {
  const map = new Map();
  logs.forEach(log => {
    const key = keyFn(log);
    if (!map.has(key)) map.set(key, { key, count: 0, value: 0, saved: 0, paid: 0 });
    const row = map.get(key);
    const price = Number(log.price) || 0;
    row.count += 1; row.value += price;
    if (log.packageStatus === 'included') row.saved += price; else row.paid += price;
  });
  return [...map.values()].sort((a, b) => b.value - a.value || b.count - a.count);
}
function statsSection(title, rows) {
  if (!rows.length) return `<div class="card"><h2>${esc(title)}</h2><p class="emptyText">Keine Daten vorhanden.</p></div>`;
  return `<div class="card"><h2>${esc(title)}</h2><div class="statList">${rows.slice(0, 12).map(r => `<div class="statRow"><div><b>${esc(r.key)}</b><small>${r.count} Getränke · gespart ${eur(r.saved)}</small></div><strong>${eur(r.value)}</strong></div>`).join('')}</div></div>`;
}

function viewTrips() {
  const edit = state.editingTripId ? state.trips.find(t => t.id === state.editingTripId) : null;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Reisen</h1><span class="subtle">${state.trips.length}</span></div>
      <div id="tripForm" class="card formCard" role="group" aria-label="Reiseformular">
        <input id="tripIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
        <h2>${edit ? 'Reise bearbeiten' : 'Reise anlegen'}</h2>
        <label>Name<input id="tripNameInput" name="name" placeholder="z. B. AIDA Metropolen 2026" value="${esc(edit?.name || '')}"></label>
        <label>Schiff<input id="tripShipInput" name="ship" placeholder="z. B. AIDAprima" value="${esc(edit?.ship || '')}"></label>
        <div class="twoCols"><label>Start<input id="tripStartInput" name="startDate" type="date" value="${esc(edit?.startDate || '')}"></label><label>Ende<input id="tripEndInput" name="endDate" type="date" value="${esc(edit?.endDate || '')}"></label></div>
        <button id="tripSaveButton" class="primary" type="button" data-action="saveTrip">${edit ? 'Änderungen speichern' : 'Speichern'}</button>
        <button class="secondary" type="button" data-action="resetTripForm">Formular leeren</button>
      </div>
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
        <label>Gerätename<input name="deviceName" value="${esc(state.settings.deviceName || '')}"></label>
        <div class="infoBox"><span>Geräte-ID</span><code>${esc(state.settings.deviceId || '')}</code></div>
        <button id="deviceSaveButton" class="primary" type="button" data-action="saveDevice">Gerätename speichern</button>
      </form>
      <div id="personForm" class="card formCard" role="group" aria-label="Personenformular">
        <input id="personIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
        <h2>${edit ? 'Person bearbeiten' : 'Person anlegen'}</h2>
        <label>Name<input id="personNameInput" name="name" placeholder="Name" value="${esc(edit?.name || '')}"></label>
        <label>Getränkepaket<select id="personPackageInput" name="packageId">${state.packages.map(p => `<option value="${esc(p.id)}" ${p.id === (edit?.packageId || 'none') ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <label>Paketpreis gesamt<input id="personPackagePriceInput" name="packagePrice" type="text" inputmode="decimal" autocomplete="off" placeholder="optional, z. B. 329,00" value="${esc(edit?.packagePrice ?? '')}"></label>
        <button id="personSaveButton" class="primary" type="button" data-action="savePerson">${edit ? 'Änderungen speichern' : 'Person speichern'}</button>
        <button class="secondary" type="button" data-action="resetPersonForm">Formular leeren</button>
      </div>
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
      ${cmp ? comparisonHtml(cmp) : ''}
      <div class="card"><h2>Kategorien</h2>${categorySummaryHtml()}</div>
    </section>`;
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
        ${infoRow('Speicher', 'IndexedDB lokal auf diesem Gerät')}
      </div>
      <div class="card"><h2>Verwaltung</h2><div class="buttonStack"><button class="secondary" data-route="trips">Reisen verwalten</button><button class="secondary" data-route="devices">Geräte & Personen</button><button class="secondary" data-route="barkarte">Barkarte verwalten</button></div></div>
      <div class="card"><h2>Aktionen</h2><div class="buttonStack"><button class="secondary" data-route="changelog">Changelog öffnen</button><button class="secondary" data-action="reRunOnboarding">Onboarding erneut anzeigen</button><button class="secondary" data-action="backupTest">Backup-Test starten</button></div></div>
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
  toast(`${drink.name} gespeichert`);
  haptic();
  if (state.route === 'track') renderTrackList();
  else render();
}
async function undoLast() {
  if (!state.undoLog) return;
  await del('logs', state.undoLog.id);
  state.undoLog = null;
  await loadState();
  render();
  toast('Letzter Eintrag wurde entfernt');
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

async function editLog(id) {
  const log = state.logs.find(l => l.id === id);
  if (!log) return;
  const price = prompt('Preis anpassen:', String(log.price).replace('.', ','));
  if (price === null) return;
  const status = prompt('Paketstatus: included / not_included / unclear', log.packageStatus || 'unclear');
  if (status === null) return;
  const cleanStatus = ['included', 'not_included', 'unclear'].includes(status) ? status : 'unclear';
  log.price = num(price);
  log.packageStatus = cleanStatus;
  log.updatedAt = nowIso();
  await put('logs', log);
  await loadState();
  render();
}
async function deleteLog(id) {
  const log = state.logs.find(l => l.id === id);
  if (!log) return;
  if (!confirm(`Eintrag wirklich löschen?\n\n${log.drinkName} · ${log.personName}`)) return;
  await del('logs', id);
  if (state.undoLog?.id === id) state.undoLog = null;
  await loadState();
  render();
}

function fillTripForm(id) {
  const trip = id ? state.trips.find(t => t.id === id) : null;
  state.editingTripId = trip?.id || null;
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
  try {
    await put('trips', trip);
    const savedTrip = await get('trips', id);
    if (!savedTrip || savedTrip.id !== id) throw new Error('IndexedDB hat den Reisedatensatz nicht bestätigt.');
    await putSetting('currentTripId', id);
    state.currentTripId = id;
    state.editingTripId = null;
    await loadState();
    state.currentTripId = id;
    render();
    toast(existing.id ? 'Reiseänderungen gespeichert' : 'Reise angelegt');
  } catch (error) {
    alert(`Reise konnte nicht gespeichert werden: ${error.message || error}`);
  }
}
async function saveOnboardingTrip(form) {
  const current = currentTrip();
  const id = current?.id || `trip_${uid()}`;
  const trip = { ...(current || {}), id, name: formValue(form, 'name').trim() || 'Aktuelle Reise', ship: formValue(form, 'ship').trim(), startDate: formValue(form, 'startDate'), endDate: formValue(form, 'endDate'), archived: false, createdAt: current?.createdAt || nowIso(), updatedAt: nowIso() };
  await put('trips', trip);
  await putSetting('currentTripId', id);
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

  try {
    await put('persons', person);
    const savedPerson = await get('persons', id);
    if (!savedPerson || savedPerson.id !== id) throw new Error('IndexedDB hat den Personendatensatz nicht bestätigt.');
    if (savedPerson.tripId !== tripId) throw new Error('Die gespeicherte Person ist nicht der aktiven Reise zugeordnet.');
    await putSetting('currentTripId', tripId);
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
  }
}
async function saveDeviceForm(form) {
  if (!form) { alert('Geräteformular nicht gefunden. Bitte Seite neu laden.'); return; }
  await putSetting('deviceName', formValue(form, 'deviceName').trim() || 'Mein iPhone');
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
  ['all_in', 'fun', 'kids_teens_all_in', 'kids_teens_fun'].forEach(key => {
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
    for (const key of ['all_in', 'fun', 'kids_teens_all_in', 'kids_teens_fun']) {
      if ((old.packages?.[key] || 'unclear') !== (drink.packages?.[key] || 'unclear')) { packageChanges += 1; details.push({ name: drink.name, text: `${packageName(key)}: ${statusLabel(old.packages?.[key] || 'unclear')} → ${statusLabel(drink.packages?.[key] || 'unclear')}` }); }
    }
  }
  return { newDrinks: newCount, priceChanges, packageChanges, details: details.slice(0, 50), checkedAt: nowIso() };
}

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
  <h2>Version 4.0.0</h2>
  <ul>
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
