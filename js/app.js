'use strict';

const APP_VERSION = '5.4.1';
const APP_CACHE_NAME = 'cruisesip-v5-4-1-20260714c';
const APP_BUILD = '5.4.1c';
const SERVICE_WORKER_URL = './sw.js?v=5.4.1c';
const APP_NAME = 'CruiseSip';
const DB_NAME = 'cruisesip_v4';
const LEGACY_DB_NAME = 'gt_db_v3';
const DB_VERSION = 2;
const CACHE_HINT = 'GitHub Pages / PWA / Offline';
const FULL_BACKUP_TYPE = 'CruiseSipFullBackup';
const FULL_BACKUP_FORMAT_VERSION = 1;
const FULL_BACKUP_MAX_BYTES = 25 * 1024 * 1024;
const TRIP_EXPORT_TYPE = 'CruiseSipTripExport';
const LEGACY_TRIP_EXPORT_TYPE = 'CruiseSipExport';
const TRIP_EXPORT_FORMAT_VERSION = 2;
const TRIP_EXPORT_MAX_BYTES = 25 * 1024 * 1024;
const TRIP_EXPORT_MAX_FILES = 20;
const ITINERARY_IMPORT_TYPE = 'CruiseSipItinerary';
const ITINERARY_IMPORT_FORMAT_VERSION = 1;
const ITINERARY_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

const STORE_NAMES = ['settings', 'trips', 'persons', 'drinks', 'logs', 'imports', 'barkarten'];
const SNAPSHOT_STORE = 'snapshots';
const ALL_DB_STORES = [...STORE_NAMES, SNAPSHOT_STORE];
const V5_MIGRATION_SNAPSHOT_ID = 'migration-v5.0.0';
const INTERNAL_SNAPSHOT_TYPE = 'CruiseSipInternalRestorePoint';
const INTERNAL_SNAPSHOT_PREFIX = 'restore_';
const INTERNAL_SNAPSHOT_LIMIT = 5;
const PERSON_COLORS = ['#e0f2fe', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe', '#ffedd5', '#ccfbf1', '#f1f5f9'];
const QUICK_TERMS = ['kaffee', 'cappuccino', 'latte', 'espresso', 'kakao', 'tee', 'cola', 'fanta', 'sprite', 'wasser', 'apfelsaft', 'orangensaft', 'aida iced tea', 'aida lemonade', 'dodo', 'milchshake', 'radeberger', 'aperol', 'hugo', 'sprizz'];
const DRINK_SORT_OPTIONS = [
  { id: 'frequent', label: 'Häufig genutzt' },
  { id: 'recent', label: 'Zuletzt genutzt' },
  { id: 'priceAsc', label: 'Preis aufsteigend' },
  { id: 'priceDesc', label: 'Preis absteigend' },
  { id: 'alphabetical', label: 'Alphabetisch' }
];

const THEME_OPTIONS = [
  { id: 'system', label: 'Automatisch', description: 'Folgt der iPhone-Einstellung', preview: 'system' },
  { id: 'light', label: 'Hell', description: 'Klar und neutral', preview: 'light' },
  { id: 'dark', label: 'Dunkel', description: 'Für Bars und Kabine', preview: 'dark' },
  { id: 'ocean', label: 'Ocean', description: 'Maritim und frisch', preview: 'ocean', recommended: true },
  { id: 'sunset', label: 'Sunset', description: 'Warm und urlaubstypisch', preview: 'sunset' },
  { id: 'nordic', label: 'Nordic', description: 'Kühl und reduziert', preview: 'nordic' },
  { id: 'contrast', label: 'Hoher Kontrast', description: 'Maximale Erkennbarkeit', preview: 'contrast' }
];

const THEME_COLORS = {
  light: '#f5f5f7',
  dark: '#05070b',
  ocean: '#e8f5f7',
  sunset: '#fff4eb',
  nordic: '#edf3f5',
  contrast: '#000000'
};

let db;
let state = {
  route: 'dashboard',
  settings: {},
  trips: [],
  persons: [],
  drinks: [],
  logs: [],
  packages: [],
  staticPackages: [],
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
  online: navigator.onLine,
  offlineDiagnostics: null,
  pendingBackup: null,
  pendingTripImport: null,
  pendingTripClosure: null,
  pendingTripVersionChange: null,
  pendingItineraryImport: null,
  editingItineraryDayDate: null,
  expandedItineraryTripId: null,
  pendingBarkarteImport: null,
  tripSetupWizard: { step: null, tripId: null, exported: false },
  multiPersonMode: false,
  selectedPersonIds: [],
  undoLogs: [],
  migrationSnapshot: null,
  restorePoints: [],
  archiveIntegrity: {}
};

const actionLocks = Object.create(null);
let undoAutoHideTimer = null;
let swRegistration = null;
let swUpdateCheckRunning = false;
let swControllerChangeHandled = false;
let swReloadFallbackTimer = null;
let swUpdateState = 'unknown';
let offlineDiagnosticsRunning = false;

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
const percent = (value, digits = 0) => Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' %';
const num = (value) => Number(String(value ?? '').replace(',', '.')) || 0;
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const short = (value, max = 32) => { const s = String(value || ''); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (value) => normalize(value).replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || `drink_${uid()}`;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const deviceUid = () => `dev_${uid()}_${Math.random().toString(36).slice(2, 6)}`;
const haptic = () => { try { if ('vibrate' in navigator) navigator.vibrate(8); } catch (_) {} };

function stableArchiveValue(value) {
  if (Array.isArray(value)) return value.map(stableArchiveValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableArchiveValue(value[key])]));
  return value;
}
function archiveIntegrityPayload(tripId) {
  const trip = state.trips.find(row => row.id === tripId);
  if (!trip) return null;
  const tripData = {
    id: trip.id,
    name: trip.name || '',
    ship: trip.ship || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    barkarteVersionId: trip.barkarteVersionId || '',
    packageVersionId: trip.packageVersionId || '',
    itinerary: tripItinerary(trip)
  };
  const persons = state.persons
    .filter(person => person.tripId === tripId)
    .map(person => ({ id: person.id, tripId: person.tripId, name: person.name || '', packageId: person.packageId || '', packagePrice: Number(person.packagePrice) || 0, color: person.color || '' }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const logs = state.logs
    .filter(log => log.tripId === tripId)
    .map(log => ({
      id: log.id || '', originId: log.originId || '', mergeKey: logMergeKey(log, log.trackedByDeviceId || ''), tripId: log.tripId || '', personId: log.personId || '',
      personName: log.personName || '', drinkId: log.drinkId || '', drinkName: log.drinkName || '', category: log.category || '', price: Number(log.price) || 0,
      packageStatus: log.packageStatus || 'unclear', ts: Number(log.ts) || 0, trackedByDeviceId: log.trackedByDeviceId || '', trackedByDeviceName: log.trackedByDeviceName || '',
      barkarteVersionId: log.barkarteVersionId || '', packageVersionId: log.packageVersionId || ''
    }))
    .sort((a, b) => String(a.mergeKey || a.id).localeCompare(String(b.mergeKey || b.id)));
  return stableArchiveValue({ schema: 1, trip: tripData, persons, logs });
}
async function calculateTripArchiveDigest(tripId) {
  const payload = archiveIntegrityPayload(tripId);
  return payload ? sha256Hex(JSON.stringify(payload)) : '';
}
async function refreshArchiveIntegrity() {
  const result = {};
  for (const trip of state.trips.filter(row => row.archived)) {
    if (!trip.closureDigest) { result[trip.id] = { status: 'legacy', label: 'Keine Prüfsumme', detail: 'Die Reise wurde vor v5.4.0 abgeschlossen.' }; continue; }
    try {
      const current = await calculateTripArchiveDigest(trip.id);
      result[trip.id] = current === trip.closureDigest
        ? { status: 'ok', label: 'Daten unverändert', detail: `Prüfsumme ${trip.closureDigest.slice(0, 12)}…` }
        : { status: 'bad', label: 'Datenbestand verändert', detail: 'Die aktuellen Reise-, Personen- oder Buchungsdaten weichen vom Abschlussstand ab.' };
    } catch (error) {
      console.warn('Archivprüfung fehlgeschlagen.', error);
      result[trip.id] = { status: 'warn', label: 'Prüfung nicht möglich', detail: 'Die lokale Integritätsprüfung konnte nicht abgeschlossen werden.' };
    }
  }
  state.archiveIntegrity = result;
}

function openDb(name = DB_NAME, version = DB_VERSION, stores = ALL_DB_STORES) {
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
function deleteIdsAtomic(store, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const objectStore = transaction.objectStore(store);
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error || transaction.error || new Error('Datensätze konnten nicht vollständig entfernt werden.'));
    };
    try {
      for (const id of uniqueIds) {
        const request = objectStore.delete(id);
        request.onerror = () => {
          try { transaction.abort(); } catch (_) {}
          fail(request.error);
        };
      }
    } catch (error) {
      try { transaction.abort(); } catch (_) {}
      fail(error);
      return;
    }
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}
function readAllStoresSnapshot() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES, 'readonly');
    const snapshot = {};
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error || transaction.error || new Error('Lokale Daten konnten nicht vollständig gelesen werden.'));
    };
    for (const store of STORE_NAMES) {
      const request = transaction.objectStore(store).getAll();
      request.onsuccess = () => { snapshot[store] = request.result || []; };
      request.onerror = () => fail(request.error);
    }
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve(snapshot);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}
function putRowsAtomic(rowsByStore) {
  const stores = STORE_NAMES.filter(store => Array.isArray(rowsByStore?.[store]) && rowsByStore[store].length);
  if (!stores.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error || transaction.error || new Error('Daten konnten nicht vollständig ergänzt werden.'));
    };
    try {
      for (const store of stores) {
        const objectStore = transaction.objectStore(store);
        for (const row of rowsByStore[store]) {
          const request = objectStore.put(row);
          request.onerror = () => {
            try { transaction.abort(); } catch (_) {}
            fail(request.error);
          };
        }
      }
    } catch (error) {
      try { transaction.abort(); } catch (_) {}
      fail(error);
      return;
    }
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}
function replaceAllStoresAtomic(rowsByStore) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAMES, 'readwrite');
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error || transaction.error || new Error('Wiederherstellung wurde abgebrochen. Der bisherige Datenbestand bleibt erhalten.'));
    };
    try {
      for (const store of STORE_NAMES) {
        const objectStore = transaction.objectStore(store);
        const clearRequest = objectStore.clear();
        clearRequest.onerror = () => {
          try { transaction.abort(); } catch (_) {}
          fail(clearRequest.error);
        };
        for (const row of rowsByStore?.[store] || []) {
          const request = objectStore.put(row);
          request.onerror = () => {
            try { transaction.abort(); } catch (_) {}
            fail(request.error);
          };
        }
      }
    } catch (error) {
      try { transaction.abort(); } catch (_) {}
      fail(error);
      return;
    }
    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}
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

async function ensureV5MigrationSnapshot() {
  if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) return;
  const existing = await get(SNAPSHOT_STORE, V5_MIGRATION_SNAPSHOT_ID);
  if (existing) return;
  const meaningfulCounts = await Promise.all(['trips', 'persons', 'drinks', 'logs'].map(store => all(store).then(rows => rows.length)));
  if (!meaningfulCounts.some(Boolean)) return;
  const snapshot = await readAllStoresSnapshot();
  const previousVersion = settingValueFromRows(snapshot.settings || [], 'appVersion') || '4.x';
  await put(SNAPSHOT_STORE, {
    id: V5_MIGRATION_SNAPSHOT_ID,
    type: 'CruiseSipInternalMigrationSnapshot',
    fromVersion: previousVersion,
    toVersion: APP_VERSION,
    createdAt: nowIso(),
    counts: Object.fromEntries(STORE_NAMES.map(store => [store, (snapshot[store] || []).length])),
    data: snapshot
  });
}

function internalRestorePointRows(rows = []) {
  return (rows || [])
    .filter(row => row?.type === INTERNAL_SNAPSHOT_TYPE && String(row.id || '').startsWith(INTERNAL_SNAPSHOT_PREFIX))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
async function pruneInternalRestorePoints() {
  if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) return;
  const rows = internalRestorePointRows(await all(SNAPSHOT_STORE));
  for (const row of rows.slice(INTERNAL_SNAPSHOT_LIMIT)) await del(SNAPSHOT_STORE, row.id);
}
async function createInternalRestorePoint(reason, details = {}) {
  if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) return null;
  const snapshot = await readAllStoresSnapshot();
  const createdAt = nowIso();
  const restorePoint = {
    id: `${INTERNAL_SNAPSHOT_PREFIX}${Date.now()}_${uid()}`,
    type: INTERNAL_SNAPSHOT_TYPE,
    appVersion: APP_VERSION,
    build: APP_BUILD,
    reason: String(reason || 'Manueller Sicherungspunkt'),
    details: isPlainRecord(details) ? details : {},
    createdAt,
    counts: Object.fromEntries(STORE_NAMES.map(store => [store, (snapshot[store] || []).length])),
    data: snapshot
  };
  await put(SNAPSHOT_STORE, restorePoint);
  await pruneInternalRestorePoints();
  return restorePoint;
}
async function createManualRestorePoint() {
  await createInternalRestorePoint('Manuell erstellt');
  await loadState();
  render();
  toast('Interner Wiederherstellungspunkt erstellt');
}
async function restoreInternalRestorePoint(id) {
  const restorePoint = state.restorePoints.find(row => row.id === id) || await get(SNAPSHOT_STORE, id);
  if (!restorePoint?.data) {
    alert('Der gewählte Wiederherstellungspunkt ist nicht mehr vorhanden.');
    return;
  }
  const confirmation = prompt(`Lokale CruiseSip-Daten auf den Stand vom ${formatDateTime(restorePoint.createdAt)} zurücksetzen?\n\nZur Bestätigung WIEDERHERSTELLEN eingeben.`);
  if (confirmation !== 'WIEDERHERSTELLEN') return;
  await createInternalRestorePoint('Vor Wiederherstellung eines Sicherungspunkts', { restoredPointId: restorePoint.id });
  await replaceAllStoresAtomic(restorePoint.data);
  await putSetting('appVersion', APP_VERSION);
  await putSetting('lastInternalRestoreAt', nowIso());
  await loadState();
  state.route = 'settings';
  render();
  alert('Der lokale Datenbestand wurde wiederhergestellt. Die aktuelle App-Version bleibt installiert.');
}
async function deleteInternalRestorePoint(id) {
  const restorePoint = state.restorePoints.find(row => row.id === id);
  if (!restorePoint) return;
  if (!confirm(`Wiederherstellungspunkt vom ${formatDateTime(restorePoint.createdAt)} dauerhaft löschen?`)) return;
  await del(SNAPSHOT_STORE, id);
  await loadState();
  render();
  toast('Wiederherstellungspunkt gelöscht');
}

async function restoreV5MigrationSnapshot() {
  const snapshot = await get(SNAPSHOT_STORE, V5_MIGRATION_SNAPSHOT_ID);
  if (!snapshot?.data) {
    alert('Es ist keine interne Sicherung vor dem v5-Update vorhanden.');
    return;
  }
  const confirmation = prompt('Die lokalen Kerndaten werden auf den Stand vor dem v5-Update zurückgesetzt. Gib zur Bestätigung WIEDERHERSTELLEN ein.');
  if (confirmation !== 'WIEDERHERSTELLEN') return;
  await createInternalRestorePoint('Vor Wiederherstellung des v5-Migrationsstands');
  await replaceAllStoresAtomic(snapshot.data);
  await putSetting('appVersion', APP_VERSION);
  await putSetting('v5MigrationRestoredAt', nowIso());
  await loadState();
  state.route = 'dashboard';
  render();
  alert(`Die interne Sicherung wurde wiederhergestellt. CruiseSip läuft weiterhin mit der App-Version ${APP_VERSION}.`);
}

async function bootstrap() {
  db = await openDb();
  await tryLegacyMigration();
  try { await ensureV5MigrationSnapshot(); }
  catch (error) { console.warn('Interne v5-Migrationssicherung konnte nicht erstellt werden.', error); }
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
  const rawPackages = await fetch('data/pakete.json').then(r => r.json()).catch(() => []);
  state.staticPackages = normalizePackageDefinitions(rawPackages, 'CruiseSip Stammdaten');
  state.packages = cloneRow(state.staticPackages);
  const data = await fetch('data/barkarte.json').then(r => r.json()).catch(() => ({ version: 'unknown', source: 'lokal', drinks: [] }));
  const staticDrinks = normalizeDrinks(data.drinks || []);
  const existingDrinks = await all('drinks');
  const legacyCurrent = await getSetting('barkarteVersion');
  if (!existingDrinks.length) {
    for (const drink of staticDrinks) await put('drinks', drink);
  }

  const existingVersions = await all('barkarten');
  const legacyVersionName = legacyCurrent?.version || data.version || 'unknown';
  let currentRecord = existingVersions.find(row => row.id === legacyVersionName || row.version === legacyVersionName) || null;
  if (currentRecord && (!Array.isArray(currentRecord.drinks) || !currentRecord.drinks.length)) {
    currentRecord = {
      ...currentRecord,
      drinks: normalizeDrinks(existingDrinks.length ? existingDrinks : staticDrinks),
      packages: cloneRow(state.staticPackages),
      count: existingDrinks.length || staticDrinks.length,
      packageCount: state.staticPackages.length,
      dataAvailable: true,
      migratedAt: nowIso(),
      updatedAt: nowIso()
    };
    await put('barkarten', currentRecord);
  }

  let staticRecord = currentRecord && (currentRecord.id === data.version || currentRecord.version === data.version)
    ? currentRecord
    : existingVersions.find(row => row.id === data.version || row.version === data.version) || null;
  if (!staticRecord) {
    staticRecord = buildReferenceVersionRecord({
      id: data.version || `barkarte_${uid()}`,
      version: data.version || 'unknown',
      source: data.source || 'Stammdaten',
      drinks: staticDrinks,
      packages: state.staticPackages,
      isBundled: true
    });
    await put('barkarten', staticRecord);
  } else if (!Array.isArray(staticRecord.drinks) || !staticRecord.drinks.length) {
    staticRecord = { ...staticRecord, drinks: staticDrinks, packages: cloneRow(state.staticPackages), count: staticDrinks.length, packageCount: state.staticPackages.length, dataAvailable: true, isBundled: true, updatedAt: nowIso() };
    await put('barkarten', staticRecord);
  } else if (!staticRecord.isBundled) {
    staticRecord = { ...staticRecord, isBundled: true, updatedAt: staticRecord.updatedAt || nowIso() };
    await put('barkarten', staticRecord);
  }

  const preferred = currentRecord?.id || staticRecord.id;
  if (!(await getSetting('defaultBarkarteVersionId'))) await putSetting('defaultBarkarteVersionId', preferred);
  if (!(await getSetting('defaultPackageVersionId'))) await putSetting('defaultPackageVersionId', preferred);
  if (!(await getSetting('barkarteVersionId'))) await putSetting('barkarteVersionId', preferred);
  if (!legacyCurrent) await putSetting('barkarteVersion', referenceVersionMeta(currentRecord || staticRecord));
  await putSetting('appVersion', APP_VERSION);
}

async function ensureDefaults() {
  if (!(await getSetting('deviceId'))) await putSetting('deviceId', deviceUid());
  if (!(await getSetting('deviceName'))) await putSetting('deviceName', 'Mein iPhone');
  if (!(await getSetting('favorites'))) await putSetting('favorites', []);
  if (!(await getSetting('theme'))) await putSetting('theme', 'system');
  if ((await getSetting('reducedEffects')) === undefined) await putSetting('reducedEffects', false);
  if (!(await getSetting('drinkSort'))) await putSetting('drinkSort', 'frequent');
  const trips = await all('trips');
  if (!trips.length) {
    const referenceId = await getSetting('defaultBarkarteVersionId') || await getSetting('barkarteVersionId') || '';
    const packageVersionId = await getSetting('defaultPackageVersionId') || referenceId;
    const trip = { id: `trip_${uid()}`, name: 'Aktuelle Reise', ship: '', startDate: '', endDate: '', barkarteVersionId: referenceId, packageVersionId, archived: false, createdAt: nowIso(), updatedAt: nowIso() };
    await put('trips', trip);
    await putSetting('currentTripId', trip.id);
  }
  await migrateRowsToV4();
}

async function migrateRowsToV4() {
  const deviceId = await getSetting('deviceId');
  const deviceName = await getSetting('deviceName');
  const currentTripId = await getSetting('currentTripId');
  const defaultBarkarteVersionId = await getSetting('defaultBarkarteVersionId') || await getSetting('barkarteVersionId') || '';
  const defaultPackageVersionId = await getSetting('defaultPackageVersionId') || defaultBarkarteVersionId;
  const trips = await all('trips');
  const fallbackTrip = currentTripId || trips[0]?.id;
  for (const trip of trips) {
    let changed = false;
    if (!trip.barkarteVersionId && defaultBarkarteVersionId) { trip.barkarteVersionId = defaultBarkarteVersionId; changed = true; }
    if (!trip.packageVersionId && defaultPackageVersionId) { trip.packageVersionId = defaultPackageVersionId; changed = true; }
    if (changed) { trip.updatedAt = trip.updatedAt || nowIso(); await put('trips', trip); }
  }
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
  const legacyDrinks = (await all('drinks')).sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  state.drinks = legacyDrinks;
  state.logs = (await all('logs')).sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  state.imports = (await all('imports')).sort((a, b) => String(b.importedAt || '').localeCompare(String(a.importedAt || '')));
  state.barkarten = await all('barkarten');
  const snapshotRows = db.objectStoreNames.contains(SNAPSHOT_STORE) ? await all(SNAPSHOT_STORE) : [];
  state.migrationSnapshot = snapshotRows.find(row => row.id === V5_MIGRATION_SNAPSHOT_ID) || null;
  state.restorePoints = internalRestorePointRows(snapshotRows);
  state.currentTripId = state.settings.currentTripId || state.trips.find(t => !t.archived)?.id || state.trips[0]?.id || null;
  if (!state.trips.find(t => t.id === state.currentTripId) && state.trips[0]) state.currentTripId = state.trips[0].id;
  if (state.currentTripId && state.settings.currentTripId !== state.currentTripId) {
    await put('settings', { id: 'currentTripId', value: state.currentTripId, updatedAt: nowIso() });
    state.settings.currentTripId = state.currentTripId;
  }
  applyReferenceDataForCurrentTrip(legacyDrinks);
  const personsForTrip = currentPersons();
  const storedPersonId = state.settings[selectedPersonSettingKey()] || null;
  const currentIsValid = personsForTrip.some(person => person.id === state.selectedPersonId);
  const storedIsValid = personsForTrip.some(person => person.id === storedPersonId);
  if (!currentIsValid) state.selectedPersonId = storedIsValid ? storedPersonId : (personsForTrip[0]?.id || null);
  if (state.selectedPersonId && storedPersonId !== state.selectedPersonId) {
    await putSetting(selectedPersonSettingKey(), state.selectedPersonId);
  }
  const validSelectionIds = state.selectedPersonIds.filter(id => personsForTrip.some(person => person.id === id));
  state.selectedPersonIds = validSelectionIds.length ? validSelectionIds : (state.selectedPersonId ? [state.selectedPersonId] : []);
  await refreshArchiveIntegrity();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swUpdateState = 'unsupported';
    updateSettingsUpdateStatus();
    return;
  }
  try {
    swRegistration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { updateViaCache: 'none' });
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

function isStandaloneMode() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

function formatStorageBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return 'nicht verfügbar';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

function diagnosticLevelLabel(level) {
  if (level === 'ok') return 'OK';
  if (level === 'bad') return 'Fehler';
  if (level === 'warn') return 'Prüfen';
  return 'Info';
}

function offlineDiagnosticsContentHtml() {
  const diagnostics = state.offlineDiagnostics;
  if (!diagnostics) {
    return '<p class="diagnosticEmpty">Status wird beim Öffnen des Setups automatisch geprüft.</p>';
  }
  if (diagnostics.running) {
    return '<div class="diagnosticRunning"><span class="diagnosticSpinner" aria-hidden="true"></span><span>Offline-Bereitschaft wird geprüft …</span></div>';
  }
  const rows = (diagnostics.items || []).map(item => `
    <div class="diagnosticRow ${esc(item.level || 'info')}">
      <span class="diagnosticMark" aria-hidden="true">${item.level === 'ok' ? '✓' : item.level === 'bad' ? '!' : item.level === 'warn' ? '!' : 'i'}</span>
      <span class="diagnosticText"><b>${esc(item.label)}</b><small>${esc(item.detail || '')}</small></span>
      <span class="diagnosticValue"><strong>${esc(item.value)}</strong><small>${esc(diagnosticLevelLabel(item.level))}</small></span>
    </div>`).join('');
  const checked = diagnostics.checkedAt ? new Date(diagnostics.checkedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return `${rows}<div class="diagnosticChecked">Zuletzt geprüft: ${esc(checked || 'unbekannt')}</div>`;
}

function offlineDiagnosticsSummary() {
  const diagnostics = state.offlineDiagnostics;
  if (!diagnostics) return { label: 'Noch nicht geprüft', level: 'info' };
  if (diagnostics.running) return { label: 'Prüfung läuft', level: 'info' };
  return { label: diagnostics.summary || 'Prüfung abgeschlossen', level: diagnostics.overall || 'info' };
}

function updateOfflineDiagnosticsView() {
  const container = $('#offlineDiagnosticsResults');
  if (container) container.innerHTML = offlineDiagnosticsContentHtml();
  const summary = offlineDiagnosticsSummary();
  const summaryElement = $('#offlineDiagnosticsSummary');
  if (summaryElement) {
    summaryElement.textContent = summary.label;
    summaryElement.className = `diagnosticSummary ${summary.level}`;
  }
  const button = $('#offlineDiagnosticsButton');
  if (button) {
    button.disabled = offlineDiagnosticsRunning;
    button.textContent = offlineDiagnosticsRunning ? 'Prüfung läuft …' : 'Offline-Status prüfen';
  }
}

async function runOfflineDiagnostics({ silent = false } = {}) {
  if (offlineDiagnosticsRunning) return;
  offlineDiagnosticsRunning = true;
  state.offlineDiagnostics = { running: true };
  updateOfflineDiagnosticsView();
  if (!silent) toast('Offline-Bereitschaft wird geprüft …');

  const items = [];
  const standalone = isStandaloneMode();
  items.push({
    label: 'Home-Bildschirm-App',
    value: standalone ? 'Installiert' : 'Safari-Browser',
    level: standalone ? 'ok' : 'warn',
    detail: standalone ? 'CruiseSip läuft im eigenständigen PWA-Modus.' : 'Für den schnellen Offline-Start über Safari zum Home-Bildschirm hinzufügen.'
  });

  let serviceWorkerActive = false;
  let serviceWorkerControlled = false;
  if (!('serviceWorker' in navigator)) {
    items.push({ label: 'Service Worker', value: 'Nicht unterstützt', level: 'bad', detail: 'Dieser Browser kann die App-Dateien nicht zuverlässig offline verwalten.' });
  } else {
    try {
      const registration = swRegistration || await navigator.serviceWorker.getRegistration('./');
      serviceWorkerActive = Boolean(registration?.active);
      serviceWorkerControlled = Boolean(navigator.serviceWorker.controller);
      const level = serviceWorkerActive && serviceWorkerControlled ? 'ok' : serviceWorkerActive ? 'warn' : 'bad';
      const value = serviceWorkerActive && serviceWorkerControlled ? 'Aktiv' : serviceWorkerActive ? 'Aktiv, noch nicht steuernd' : 'Nicht aktiv';
      const detail = serviceWorkerActive && serviceWorkerControlled
        ? 'Die aktuell geöffnete App wird vom Offline-Service-Worker gesteuert.'
        : serviceWorkerActive
          ? 'App einmal vollständig schließen und neu öffnen, damit der Service Worker übernimmt.'
          : 'App bei bestehender Internetverbindung einmal vollständig laden.';
      items.push({ label: 'Service Worker', value, level, detail });
    } catch (error) {
      items.push({ label: 'Service Worker', value: 'Prüfung fehlgeschlagen', level: 'bad', detail: error?.message || 'Registrierung konnte nicht gelesen werden.' });
    }
  }

  const coreAssets = [
    './index.html',
    `./css/styles.css?v=${APP_BUILD}`,
    `./js/app.js?v=${APP_BUILD}`,
    './data/barkarte.json',
    './data/pakete.json'
  ];
  let currentCachePresent = false;
  let cachedCoreCount = 0;
  let cachedAssetCount = 0;
  if (!('caches' in window)) {
    items.push({ label: 'Offline-App-Cache', value: 'Nicht unterstützt', level: 'bad', detail: 'Die Cache-API ist in diesem Browser nicht verfügbar.' });
  } else {
    try {
      const names = await caches.keys();
      currentCachePresent = names.includes(APP_CACHE_NAME);
      if (currentCachePresent) {
        const cache = await caches.open(APP_CACHE_NAME);
        cachedAssetCount = (await cache.keys()).length;
        for (const asset of coreAssets) {
          const response = await cache.match(new URL(asset, window.location.href).href);
          if (response) cachedCoreCount += 1;
        }
      }
      const allCoreCached = currentCachePresent && cachedCoreCount === coreAssets.length;
      items.push({
        label: 'Offline-App-Cache',
        value: allCoreCached ? `${cachedAssetCount} Dateien` : `${cachedCoreCount}/${coreAssets.length} Kerndateien`,
        level: allCoreCached ? 'ok' : currentCachePresent ? 'warn' : 'bad',
        detail: allCoreCached
          ? `Aktueller Cache ${APP_CACHE_NAME} ist vollständig einsatzbereit.`
          : currentCachePresent
            ? 'Der aktuelle Cache ist vorhanden, aber noch nicht vollständig. App online neu öffnen und erneut prüfen.'
            : 'Der Cache der aktuellen Version fehlt. App bei Internetverbindung vollständig laden.'
      });
    } catch (error) {
      items.push({ label: 'Offline-App-Cache', value: 'Prüfung fehlgeschlagen', level: 'bad', detail: error?.message || 'Cache konnte nicht gelesen werden.' });
    }
  }

  let indexedDbWritable = false;
  try {
    const testId = `offlineDiagnostic:${uid()}`;
    const testValue = { id: testId, value: 'ok', updatedAt: nowIso() };
    await put('settings', testValue);
    const readBack = await get('settings', testId);
    indexedDbWritable = readBack?.value === 'ok';
    await del('settings', testId);
    items.push({
      label: 'Lokaler Datenspeicher',
      value: indexedDbWritable ? 'Lesen & Schreiben möglich' : 'Schreibtest fehlgeschlagen',
      level: indexedDbWritable ? 'ok' : 'bad',
      detail: indexedDbWritable ? 'IndexedDB speichert Reisen, Personen und Buchungen ausschließlich auf diesem Gerät.' : 'Lokale Daten konnten nicht zuverlässig geschrieben und gelesen werden.'
    });
  } catch (error) {
    items.push({ label: 'Lokaler Datenspeicher', value: 'Prüfung fehlgeschlagen', level: 'bad', detail: error?.message || 'IndexedDB konnte nicht getestet werden.' });
  }

  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = formatStorageBytes(estimate.usage || 0);
      const quota = formatStorageBytes(estimate.quota || 0);
      let persisted = null;
      if (navigator.storage.persisted) persisted = await navigator.storage.persisted().catch(() => null);
      items.push({
        label: 'Speicherverwaltung',
        value: `${usage} belegt`,
        level: persisted === true ? 'ok' : 'info',
        detail: persisted === true ? `Dauerhafter Browserspeicher bestätigt · verfügbar: ${quota}.` : `Speicher wird von iOS verwaltet · verfügbar: ${quota}. Regelmäßig vollständige Backups erstellen.`
      });
    } catch (_) {
      items.push({ label: 'Speicherverwaltung', value: 'iOS-verwaltet', level: 'info', detail: 'Regelmäßige vollständige Backups bleiben die wichtigste Datensicherung.' });
    }
  } else {
    items.push({ label: 'Speicherverwaltung', value: 'iOS-verwaltet', level: 'info', detail: 'Eine Speicherquote wird nicht bereitgestellt. Regelmäßig vollständige Backups erstellen.' });
  }

  items.push({
    label: 'Aktueller Verbindungstest',
    value: navigator.onLine ? 'Online' : 'Offline aktiv',
    level: navigator.onLine ? 'info' : 'ok',
    detail: navigator.onLine ? 'Für den vollständigen Praxistest kurz den Flugmodus aktivieren und CruiseSip neu öffnen.' : 'CruiseSip läuft während dieser Prüfung ohne gemeldete Internetverbindung.'
  });

  const criticalReady = serviceWorkerActive && serviceWorkerControlled && currentCachePresent && cachedCoreCount === coreAssets.length && indexedDbWritable;
  const overall = criticalReady ? (standalone ? 'ok' : 'warn') : 'bad';
  const summary = criticalReady
    ? (standalone ? 'Offline bereit' : 'Technisch bereit – Installation empfohlen')
    : 'Offline-Vorbereitung prüfen';

  state.offlineDiagnostics = {
    running: false,
    checkedAt: Date.now(),
    overall,
    summary,
    items
  };
  offlineDiagnosticsRunning = false;
  updateOfflineDiagnosticsView();
  if (!silent) toast(summary);
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
  const desktopLayout = window.matchMedia?.('(min-width: 1024px)').matches === true;
  if (nav) {
    const measuredHeight = Math.ceil(nav.getBoundingClientRect().height || nav.offsetHeight || 78);
    document.documentElement.style.setProperty('--bottomNavHeight', `${desktopLayout ? 0 : measuredHeight}px`);
  }
  if (state.route !== 'track') return;
  const drinkList = $('#drinkList');
  const navRect = nav ? nav.getBoundingClientRect() : null;
  if (!drinkList || !navRect) return;
  const listTop = drinkList.getBoundingClientRect().top;
  const viewport = window.visualViewport;
  const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const lowerBoundary = desktopLayout ? viewportBottom : navRect.top;
  const available = Math.floor(lowerBoundary - listTop - (desktopLayout ? 18 : 10));
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
    if ((state.settings.theme || 'system') === 'system') applyTheme();
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
function resetTripSetupWizard() {
  state.tripSetupWizard = { step: null, tripId: null, exported: false };
  state.pendingItineraryImport = null;
  state.editingItineraryDayDate = null;
}
function startTripSetupWizard(step = 'choice') {
  state.editingTripId = null;
  clearDraft('trip');
  state.pendingItineraryImport = null;
  state.tripSetupWizard = { step, tripId: null, exported: false };
  state.route = 'trips';
  render();
  requestAnimationFrame(() => ($('#tripSetupWizard') || $('#tripForm'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

async function handleClick(event) {
  if (event.target.closest('input, textarea, select, option')) return;
  const target = event.target.closest('[data-action], [data-route]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.route) {
    state.route = target.dataset.route;
    state.query = '';
    if (state.route !== 'track') {
      state.multiPersonMode = false;
      state.selectedPersonIds = state.selectedPersonId ? [state.selectedPersonId] : [];
    }
    if (state.route !== 'history') { state.editingLogId = null; clearDraft('log'); }
    if (state.route !== 'trips') state.editingItineraryDayDate = null;
    render();
    requestAnimationFrame(() => requestAnimationFrame(scrollCurrentRouteToTop));
    haptic();
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action) return;

  if (action === 'finishOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; await loadState(); render(); return; }
  if (action === 'setTheme') { await setTheme(id); return; }
  if (action === 'setReducedEffects') { await setReducedEffects(id === 'true'); return; }
  if (action === 'checkAppUpdate') { await checkForAppUpdate({ silent: false }); return; }
  if (action === 'runOfflineDiagnostics') { await runOfflineDiagnostics({ silent: false }); return; }
  if (action === 'applyAppUpdate') { await applyAppUpdate(); return; }
  if (action === 'skipOnboarding') { await putSetting('onboardingComplete', true); state.route = 'dashboard'; render(); return; }
  if (action === 'setTrip') {
    const trip = tripById(id);
    if (!trip) { alert('Die Reise wurde nicht gefunden.'); return; }
    if (state.tripSetupWizard?.tripId && state.tripSetupWizard.tripId !== id) resetTripSetupWizard();
    await putSetting('currentTripId', id);
    state.currentTripId = id;
    await loadState();
    state.currentTripId = id;
    state.selectedPersonId = preferredPersonIdForTrip(id);
    state.selectedPersonIds = state.selectedPersonId ? [state.selectedPersonId] : [];
    state.multiPersonMode = false;
    state.editingLogId = null;
    state.editingItineraryDayDate = null;
    state.expandedItineraryTripId = null;
    clearDraft('log');
    if (trip.archived) {
      state.statsFilter = 'trip';
      state.statsPersonId = null;
      state.route = 'stats';
      toast(`Abschlussbericht von ${trip.name || 'Reise'} geöffnet`);
    } else {
      state.route = 'dashboard';
      toast(`${trip.name || 'Reise'} geöffnet`);
    }
    render();
    haptic();
    return;
  }
  if (action === 'startTripWizard') { startTripSetupWizard('choice'); return; }
  if (action === 'chooseTripImport') { state.tripSetupWizard = { step: 'import', tripId: null, exported: false }; openFile('itinerary'); return; }
  if (action === 'chooseTripManual') { startTripSetupWizard('manual'); return; }
  if (action === 'cancelTripWizard') { resetTripSetupWizard(); state.editingTripId = null; clearDraft('trip'); render(); return; }
  if (action === 'tripWizardExport') {
    if (!currentPersons().length) { alert('Bitte lege mindestens eine Person an, bevor du die Reise bereitstellst.'); return; }
    state.tripSetupWizard = { ...state.tripSetupWizard, step: 'export' };
    render();
    requestAnimationFrame(() => $('#tripSetupAssistant')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return;
  }
  if (action === 'tripWizardBackToPersons') { state.tripSetupWizard = { ...state.tripSetupWizard, step: 'persons' }; render(); return; }
  if (action === 'finishTripWizard') {
    if (state.tripSetupWizard?.step === 'persons' && !currentPersons().length) { alert('Bitte lege mindestens eine Person an, bevor du die Reiseeinrichtung abschließt.'); return; }
    resetTripSetupWizard(); state.route = 'dashboard'; render(); toast('Reiseeinrichtung abgeschlossen'); return;
  }
  if (action === 'focusPersonForm') { $('#personForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#personNameInput')?.focus(); return; }
  if (action === 'editTrip') { resetTripSetupWizard(); state.editingItineraryDayDate = null; fillTripForm(id); return; }
  if (action === 'archiveTrip') { const trip = tripById(id); if (trip?.archived) await reactivateTrip(id); else prepareTripClosure(id); return; }
  if (action === 'cancelTripClosure') { state.pendingTripClosure = null; render(); return; }
  if (action === 'cancelTripVersionChange') { state.pendingTripVersionChange = null; render(); return; }
  if (action === 'applyTripVersionFuture') { await runActionOnce('applyTripVersionFuture', () => applyPendingTripVersionChange(false)); return; }
  if (action === 'applyTripVersionUpdate') { await runActionOnce('applyTripVersionUpdate', () => applyPendingTripVersionChange(true)); return; }
  if (action === 'confirmTripClosure') { await runActionOnce('confirmTripClosure', () => confirmTripClosure(id)); return; }
  if (action === 'deleteTrip') { await deleteTrip(id); return; }
  if (action === 'importItinerary') { startTripSetupWizard('import'); openFile('itinerary'); return; }
  if (action === 'cancelItineraryImport') { state.pendingItineraryImport = null; state.tripSetupWizard = { step: 'choice', tripId: null, exported: false }; render(); return; }
  if (action === 'applyItineraryImport') { await runActionOnce('applyItineraryImport', applyPreparedItineraryImport); return; }
  if (action === 'toggleItineraryDetails') {
    const disclosure = $('#itinerarySavedDisclosure');
    if (disclosure) {
      disclosure.checked = !disclosure.checked;
      disclosure.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }
  if (action === 'addItineraryDay') { openItineraryDayEditor(null); return; }
  if (action === 'editItineraryDay') { openItineraryDayEditor(id); return; }
  if (action === 'cancelItineraryDayEdit') { state.editingItineraryDayDate = null; render(); return; }
  if (action === 'deleteItineraryDay') { await runActionOnce(`deleteItineraryDay:${id}`, () => deleteItineraryDay(id)); return; }
  if (action === 'clearItinerary') { await clearCurrentItinerary(); return; }
  if (action === 'resetTripForm') {
    state.pendingTripVersionChange = null;
    if (state.editingTripId) { state.editingTripId = null; clearDraft('trip'); render(); }
    else { clearDraft('trip'); render(); requestAnimationFrame(() => $('#tripNameInput')?.focus()); }
    return;
  }
  if (action === 'saveTrip') { await runActionOnce('saveTrip', () => saveTripForm($('#tripForm'))); return; }
  if (action === 'repeatPersonLast') {
    const last = lastLogForPerson(id);
    if (!last) { toast('Für diese Person gibt es noch keine Erfassung'); return; }
    await trackDrink(last.drinkId, [id]);
    return;
  }
  if (action === 'selectPerson') {
    const person = currentPersons().find(row => row.id === id);
    if (!person || person.id === state.selectedPersonId) return;
    state.selectedPersonId = person.id;
    state.selectedPersonIds = [person.id];
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
  if (action === 'exportTrip') { await runActionOnce('exportTrip', exportTrip); return; }
  if (action === 'exportReportCsv') { await runActionOnce('exportReportCsv', exportTripReportCsv); return; }
  if (action === 'exportReportHtml') { await runActionOnce('exportReportHtml', exportTripReportHtml); return; }
  if (action === 'printTripReport') { printTripReport(); return; }
  if (action === 'exportFullBackup') { await runActionOnce('exportFullBackup', exportFullBackup); return; }
  if (action === 'importFullBackup') { openFile('fullBackup'); return; }
  if (action === 'cancelFullBackupImport') { state.pendingBackup = null; render(); return; }
  if (action === 'mergeFullBackup') { await runActionOnce('mergeFullBackup', mergeFullBackup); return; }
  if (action === 'replaceFullBackup') { await runActionOnce('replaceFullBackup', replaceFullBackup); return; }
  if (action === 'backupTest') { await runActionOnce('backupTest', backupTest); return; }
  if (action === 'restoreV5MigrationSnapshot') { await runActionOnce('restoreV5MigrationSnapshot', restoreV5MigrationSnapshot); return; }
  if (action === 'createInternalRestorePoint') { await runActionOnce('createInternalRestorePoint', createManualRestorePoint); return; }
  if (action === 'restoreInternalRestorePoint') { await runActionOnce(`restoreInternalRestorePoint:${id}`, () => restoreInternalRestorePoint(id)); return; }
  if (action === 'deleteInternalRestorePoint') { await deleteInternalRestorePoint(id); return; }
  if (action === 'importTrip') { openFile('trip'); return; }
  if (action === 'cancelTripImport') { state.pendingTripImport = null; render(); return; }
  if (action === 'setTripConflictResolution') { setTripConflictResolution(id, target.dataset.value); return; }
  if (action === 'applyTripImport') { await runActionOnce('applyTripImport', applyPreparedTripImport); return; }
  if (action === 'importBarkarte') { openFile('barkarte'); return; }
  if (action === 'cancelBarkarteImport') { state.pendingBarkarteImport = null; render(); return; }
  if (action === 'saveBarkarteVersion') { await runActionOnce(`saveBarkarteVersion:${id || 'store'}`, () => savePendingBarkarteVersion(id || 'store')); return; }
  if (action === 'activateReferenceVersion') { await runActionOnce(`activateReferenceVersion:${id}`, () => activateReferenceVersionForCurrentTrip(id)); return; }
  if (action === 'setDefaultReferenceVersion') { await runActionOnce(`setDefaultReferenceVersion:${id}`, () => setDefaultReferenceVersion(id)); return; }
  if (action === 'deleteReferenceVersion') { await runActionOnce(`deleteReferenceVersion:${id}`, () => deleteReferenceVersion(id)); return; }
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
  if (formId === 'itineraryDayForm') await runActionOnce('saveItineraryDay', () => saveItineraryDayForm(form));
  if (formId === 'onboardingTripForm') await saveOnboardingTrip(form);
}

function openFile(mode) {
  state.pendingFileMode = mode;
  const input = $('#fileInput');
  input.value = '';
  input.multiple = mode === 'trip';
  input.accept = mode === 'barkarte' ? '.json,.csv,application/json,text/csv' : '.json,application/json';
  input.click();
}

async function handleFileInput(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  try {
    if (state.pendingFileMode === 'trip') {
      if (files.length > TRIP_EXPORT_MAX_FILES) throw new Error(`Bitte höchstens ${TRIP_EXPORT_MAX_FILES} Geräteexporte gleichzeitig auswählen.`);
      const oversized = files.find(file => file.size > TRIP_EXPORT_MAX_BYTES);
      if (oversized) throw new Error(`Die Datei „${oversized.name}“ ist größer als 25 MB.`);
      await prepareTripImportFiles(files);
      return;
    }
    const file = files[0];
    if (state.pendingFileMode === 'fullBackup' && file.size > FULL_BACKUP_MAX_BYTES) {
      throw new Error('Die Backupdatei ist größer als 25 MB und wird aus Sicherheitsgründen nicht eingelesen.');
    }
    if (state.pendingFileMode === 'itinerary' && file.size > ITINERARY_IMPORT_MAX_BYTES) {
      throw new Error('Die Reiseverlaufsdatei ist größer als 2 MB und wird aus Sicherheitsgründen nicht eingelesen.');
    }
    const text = await file.text();
    if (state.pendingFileMode === 'barkarte') await importBarkarte(text, file.name);
    if (state.pendingFileMode === 'fullBackup') await prepareFullBackupImport(text, file.name);
    if (state.pendingFileMode === 'itinerary') await prepareItineraryImport(text, file.name);
  } catch (error) {
    alert(`Import nicht möglich: ${error.message || error}`);
  } finally {
    state.pendingFileMode = null;
    event.target.multiple = false;
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
function tripById(id) { return state.trips.find(trip => trip.id === id) || null; }
function tripItinerary(trip = currentTrip()) { return Array.isArray(trip?.itinerary) ? trip.itinerary : []; }
function itineraryDayForDate(dateKey, trip = currentTrip()) { return tripItinerary(trip).find(day => day.date === dateKey) || null; }
function itineraryTypeLabel(type) {
  return ({ embarkation: 'Einschiffung', port: 'Hafentag', sea: 'Seetag', overnight: 'Übernacht im Hafen', disembarkation: 'Ausschiffung', unknown: 'Reisetag' })[type] || 'Reisetag';
}
function itineraryLocationLabel(day) {
  if (!day) return '';
  if (day.type === 'sea') return 'Seetag';
  const location = String(day.port || day.location || '').trim();
  const country = String(day.country || '').trim();
  if (location && country) return `${location}, ${country}`;
  return location || country || itineraryTypeLabel(day.type);
}
function itineraryTimeLabel(day) {
  if (!day) return '';
  const arrival = String(day.arrival || '').trim();
  const departure = String(day.departure || '').trim();
  if (arrival && departure) return `${arrival}–${departure}`;
  if (arrival) return `Ankunft ${arrival}`;
  if (departure) return `Abfahrt ${departure}`;
  return '';
}
function itineraryContextForTimestamp(timestamp = Date.now(), trip = currentTrip()) {
  const dateKey = localLogDayKey(timestamp);
  const day = itineraryDayForDate(dateKey, trip);
  if (!day) return { itineraryDate: dateKey };
  return {
    itineraryDate: dateKey,
    itineraryType: day.type || 'unknown',
    itineraryLocation: itineraryLocationLabel(day),
    itineraryPort: day.port || day.location || '',
    itineraryCountry: day.country || '',
    itineraryArrival: day.arrival || '',
    itineraryDeparture: day.departure || ''
  };
}
function selectedTrackingPersons() {
  const persons = currentPersons();
  const person = persons.find(row => row.id === state.selectedPersonId) || persons[0];
  return person ? [person] : [];
}
function lastLogForPerson(personId) {
  return currentLogs().find(log => log.personId === personId) || null;
}
function selectedPersonLabel() {
  const persons = selectedTrackingPersons();
  if (!persons.length) return 'keine Person';
  if (persons.length === 1) return persons[0].name;
  return `${persons.length} Personen`;
}
function selectedDrinkStatus(drink) {
  const persons = selectedTrackingPersons();
  if (!persons.length) return { status: 'unclear', label: 'Person wählen' };
  const statuses = [...new Set(persons.map(person => statusForDrink(drink, person.packageId)))];
  if (statuses.length === 1) return { status: statuses[0], label: statusLabel(statuses[0]) };
  return { status: 'mixed', label: 'je Person unterschiedlich' };
}
function isTripCompleted(trip = currentTrip()) { return !!trip?.archived; }
function activeTripContextHtml() {
  const trip = currentTrip();
  if (!trip) return `<div class="activeTripContext missing" role="status"><span class="activeTripMarker" aria-hidden="true">!</span><div class="activeTripCopy"><small>Keine aktive Reise</small><b>Bitte zuerst eine Reise auswählen</b><span>Die Auswertungen und Einstellungen beziehen sich auf die geöffnete Reise.</span></div></div>`;
  const completed = isTripCompleted(trip);
  const dates = trip.startDate || trip.endDate ? `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}` : 'Zeitraum offen';
  const referenceLabel = referenceVersionById(trip.barkarteVersionId || '')?.version || '';
  const details = [trip.ship || 'Ohne Schiff', dates, tripItinerary(trip).length ? `${tripItinerary(trip).length} Reisetage` : '', referenceLabel ? `Barkarte ${referenceLabel}` : ''].filter(Boolean).join(' · ');
  return `<div class="activeTripContext ${completed ? 'completed' : 'active'}" role="status" aria-label="${completed ? 'Geöffnete abgeschlossene Reise' : 'Aktive Reise'}: ${esc(trip.name || 'Ohne Namen')}"><span class="activeTripMarker" aria-hidden="true">${completed ? '✓' : '●'}</span><div class="activeTripCopy"><small>${completed ? 'Geöffnete Reise · abgeschlossen' : 'Aktive Reise'}</small><b title="${esc(trip.name || 'Ohne Namen')}">${esc(trip.name || 'Ohne Namen')}</b><span>${esc(details)}</span></div></div>`;
}
function tripAllowsChanges(tripId = activeTripId()) {
  const trip = tripById(tripId);
  return !!trip && !trip.archived;
}
function ensureTripWritable(tripId = activeTripId(), actionLabel = 'Diese Änderung') {
  const trip = tripById(tripId);
  if (!trip) {
    alert('Die zugehörige Reise wurde nicht gefunden.');
    return false;
  }
  if (trip.archived) {
    alert(`${actionLabel} ist bei der abgeschlossenen Reise „${trip.name || 'Unbenannte Reise'}“ gesperrt. Reaktiviere die Reise zuerst unter „Reisen“.`);
    return false;
  }
  return true;
}
function tripStatusNoticeHtml(context = 'general', trip = currentTrip()) {
  if (!trip?.archived) return '';
  const messages = {
    dashboard: 'Die Reise ist abgeschlossen. Neue Getränke können nicht mehr erfasst werden; Verlauf und Auswertungen bleiben verfügbar.',
    track: 'Für diese abgeschlossene Reise ist die Erfassung gesperrt. Reaktiviere sie bewusst, wenn noch Buchungen ergänzt oder korrigiert werden müssen.',
    history: 'Der Verlauf ist schreibgeschützt. Buchungen können erst nach einer bewussten Reaktivierung wieder geändert oder gelöscht werden.',
    stats: 'Die Abschlussdaten sind schreibgeschützt. Die vorhandenen Auswertungen bleiben vollständig verfügbar.',
    persons: 'Personen, Getränkepakete und Paketpreise sind für diese Reise schreibgeschützt.',
    barkarte: 'Barkarten-Stammdaten können weiter gepflegt werden. Bestehende Buchungen dieser abgeschlossenen Reise werden dabei nicht aktualisiert.'
  };
  return `<div class="card completedTripNotice"><div class="completedTripIcon" aria-hidden="true">✓</div><div><span>Reise abgeschlossen</span><b>${esc(trip.name || 'Unbenannte Reise')}</b><p>${esc(messages[context] || messages.dashboard)}</p></div><button class="mini" data-route="trips">Reisen</button></div>`;
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
function normalizePackageDefinitions(packages, fallbackSource = '') {
  const rows = Array.isArray(packages) ? packages : [];
  const normalized = rows.map(raw => ({
    ...cloneRow(raw),
    id: String(raw?.id || slug(raw?.name || '')).trim(),
    name: String(raw?.name || raw?.Name || raw?.id || 'Unbenanntes Paket').trim(),
    source: String(raw?.source || fallbackSource || '').trim()
  })).filter(row => row.id && row.name);
  const required = [
    { id: 'none', name: 'Kein Getränkepaket', source: 'system' },
    { id: 'unclear', name: 'Unklar / an Bord prüfen', source: 'manual' }
  ];
  for (const row of required) if (!normalized.some(item => item.id === row.id)) normalized.push(row);
  return normalized;
}
function buildReferenceVersionRecord(input = {}) {
  const id = String(input.id || input.version || `barkarte_${uid()}`).trim();
  const drinks = normalizeDrinks(input.drinks || []);
  const packages = normalizePackageDefinitions(input.packages || state.staticPackages || [], input.source || '');
  const timestamp = input.importedAt || nowIso();
  return {
    id,
    version: String(input.version || id || 'unbekannt'),
    source: String(input.source || 'Lokaler Import'),
    importedAt: timestamp,
    updatedAt: input.updatedAt || timestamp,
    count: drinks.length,
    packageCount: packages.length,
    drinks,
    packages,
    dataAvailable: true,
    isBundled: !!input.isBundled,
    isWorkingCopy: !!input.isWorkingCopy,
    derivedFrom: input.derivedFrom || '',
    notes: input.notes || ''
  };
}
function referenceVersionMeta(record) {
  if (!record) return { id: '', version: 'unbekannt', source: 'nicht gesetzt', count: state.drinks.length, packageCount: state.packages.length };
  return { id: record.id, version: record.version || record.id, source: record.source || 'nicht gesetzt', count: Number(record.count ?? record.drinks?.length ?? 0), packageCount: Number(record.packageCount ?? record.packages?.length ?? 0), updatedAt: record.updatedAt || record.importedAt || '' };
}
function referenceVersionById(id) { return state.barkarten.find(row => row.id === id) || null; }
function referenceVersionAvailable(row) { return !!row && row.dataAvailable !== false && Array.isArray(row.drinks) && row.drinks.length > 0; }
function defaultBarkarteVersionId() {
  const configured = state.settings.defaultBarkarteVersionId || state.settings.barkarteVersionId || '';
  if (configured && referenceVersionAvailable(referenceVersionById(configured))) return configured;
  return state.barkarten.find(referenceVersionAvailable)?.id || configured;
}
function defaultPackageVersionId() { return state.settings.defaultPackageVersionId || defaultBarkarteVersionId(); }
function tripReferenceVersionId(trip = currentTrip()) { return trip?.barkarteVersionId || defaultBarkarteVersionId(); }
function tripPackageVersionId(trip = currentTrip()) { return trip?.packageVersionId || tripReferenceVersionId(trip) || defaultPackageVersionId(); }
function activeReferenceVersion(trip = currentTrip()) {
  const barkarte = referenceVersionById(tripReferenceVersionId(trip));
  if (referenceVersionAvailable(barkarte)) return barkarte;
  const fallback = referenceVersionById(defaultBarkarteVersionId());
  if (referenceVersionAvailable(fallback)) return fallback;
  return state.barkarten.find(referenceVersionAvailable) || null;
}
function activePackageVersion(trip = currentTrip()) {
  const packages = referenceVersionById(tripPackageVersionId(trip));
  if (packages?.dataAvailable !== false && Array.isArray(packages.packages) && packages.packages.length) return packages;
  return activeReferenceVersion(trip) || referenceVersionById(defaultPackageVersionId()) || null;
}
function applyReferenceDataForCurrentTrip(legacyDrinks = []) {
  const barkarte = activeReferenceVersion();
  const packageVersion = activePackageVersion();
  const drinks = Array.isArray(barkarte?.drinks) && barkarte.drinks.length ? normalizeDrinks(barkarte.drinks) : normalizeDrinks(legacyDrinks || []);
  const packages = Array.isArray(packageVersion?.packages) && packageVersion.packages.length ? normalizePackageDefinitions(packageVersion.packages, packageVersion.source || '') : normalizePackageDefinitions(state.staticPackages || [], 'CruiseSip Stammdaten');
  state.drinks = drinks.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  state.packages = packages;
}
function activeBarkarteVersion() { return referenceVersionMeta(activeReferenceVersion()); }
function versionUsageCount(id) { return state.trips.filter(trip => trip.barkarteVersionId === id || trip.packageVersionId === id).length; }
function versionTripNames(id) { return state.trips.filter(trip => trip.barkarteVersionId === id || trip.packageVersionId === id).map(trip => trip.name || 'Unbenannte Reise'); }
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
function resolvedLogCategory(log) {
  return String(log?.category || drinkById(log?.drinkId)?.category || '').trim();
}

function scrollCurrentRouteToTop() {
  const view = $('#view');
  const drinkList = $('#drinkList');
  const scrollingElement = document.scrollingElement || document.documentElement;
  if (view) view.scrollTop = 0;
  if (drinkList) drinkList.scrollTop = 0;
  if (scrollingElement) scrollingElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }
  catch { window.scrollTo(0, 0); }
}

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
  if (state.route === 'settings' && !state.offlineDiagnostics && !offlineDiagnosticsRunning) {
    setTimeout(() => runOfflineDiagnostics({ silent: true }), 0);
  }
}

function selectedTheme() {
  const selected = state.settings.theme || 'system';
  return THEME_OPTIONS.some(option => option.id === selected) ? selected : 'system';
}

function effectiveTheme() {
  const selected = selectedTheme();
  if (selected !== 'system') return selected;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function themeLabel(theme = selectedTheme()) {
  const option = THEME_OPTIONS.find(row => row.id === theme);
  if (!option) return 'Automatisch';
  if (theme === 'system') return `Automatisch · ${effectiveTheme() === 'dark' ? 'Dunkel' : 'Hell'}`;
  return option.label;
}

function applyTheme() {
  const preference = selectedTheme();
  const theme = effectiveTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.reducedEffects = state.settings.reducedEffects ? 'true' : 'false';
  const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
  const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
  if (preference === 'system') {
    if (lightMeta) lightMeta.content = THEME_COLORS.light;
    if (darkMeta) darkMeta.content = THEME_COLORS.dark;
  } else {
    const selectedColor = THEME_COLORS[theme] || THEME_COLORS.light;
    if (lightMeta) lightMeta.content = selectedColor;
    if (darkMeta) darkMeta.content = selectedColor;
  }
}

async function setTheme(theme) {
  if (!THEME_OPTIONS.some(option => option.id === theme)) return;
  await putSetting('theme', theme);
  applyTheme();
  render();
  toast(`${themeLabel(theme)} aktiviert`);
  haptic();
}

async function setReducedEffects(enabled) {
  await putSetting('reducedEffects', Boolean(enabled));
  applyTheme();
  render();
  toast(enabled ? 'Reduzierte Effekte aktiviert' : 'Standardeffekte aktiviert');
  haptic();
}

function updateShell() {
  const trip = currentTrip();
  $('#appVersion').textContent = `v${APP_VERSION}`;
  $('#tripTitle').textContent = state.route === 'track' ? `Erfassen${trip ? ' · ' + short(trip.name, 18) : ''}${trip?.archived ? ' · abgeschlossen' : ''}` : (trip ? `${short(trip.name, 24)}${trip.archived ? ' · abgeschlossen' : ''}` : 'Keine Reise');
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
  const itineraryDisclosure = $('#itinerarySavedDisclosure');
  if (itineraryDisclosure && itineraryDisclosure.dataset.directBound !== '1') {
    itineraryDisclosure.dataset.directBound = '1';
    itineraryDisclosure.addEventListener('change', () => {
      const trip = currentTrip();
      const open = itineraryDisclosure.checked;
      state.expandedItineraryTripId = open && trip ? trip.id : null;
      const label = $('#itinerarySavedToggle');
      const content = $('#itinerarySavedContent');
      label?.setAttribute('aria-expanded', open ? 'true' : 'false');
      content?.setAttribute('aria-hidden', open ? 'false' : 'true');
      haptic();
    });
  }
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
  $$('#tripVersionInput, #onboardingTripVersion, #importTripVersionInput').forEach(select => {
    select.addEventListener('change', () => {
      const record = referenceVersionById(select.value);
      const hint = select.closest('.tripReferenceField')?.querySelector('small');
      if (hint) hint.textContent = record ? `${record.source || 'Ohne Quellenangabe'} · ${Number(record.packages?.length || record.packageCount || 0)} Paketdefinitionen` : 'Diese Version ist nicht verfügbar.';
    });
  });
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
        <div><p class="eyebrow">CruiseSip ${esc(APP_VERSION)}</p><h1>Offline bereit für die Kreuzfahrt.</h1><p>Einmal über GitHub Pages öffnen, zum Home-Bildschirm hinzufügen und danach lokal weiter erfassen.</p></div>
      </div>
      <div class="stepGrid">
        ${onboardingStep('1', 'Offline-Einrichtung', 'Die App speichert Reise, Personen, Getränke und Verlauf lokal in IndexedDB. Keine Cloud, kein Backend, keine externen Skripte.', 'ok')}
        ${onboardingStep('2', 'Zum Home-Bildschirm', 'iPhone: Teilen-Symbol in Safari öffnen → „Zum Home-Bildschirm“ → „Hinzufügen“. Danach CruiseSip wie eine App starten.', 'neutral')}
        ${onboardingStep('3', 'Geräteprüfung', `Geräte-ID: <span class="mono">${esc(state.settings.deviceId)}</span><br>Gerätename kann später in „Geräte“ angepasst werden.`, state.settings.deviceId ? 'ok' : 'warn')}
        ${onboardingStep('4', 'Offline-Status', `${sw ? 'Service Worker verfügbar.' : 'Service Worker nicht verfügbar.'} Aktueller Status: ${state.online ? 'online' : 'offline'}.`, sw ? 'ok' : 'warn')}
        ${onboardingStep('5', 'Barkarte geladen', `${esc(barkarte.version)} · ${state.drinks.length} Getränke`, state.drinks.length ? 'ok' : 'warn')}
        ${onboardingStep('6', 'Vollbackup', 'Erstelle einmal eine vollständige Sicherung. CruiseSip öffnet das iOS-Teilen-Menü; wähle dort „In Dateien sichern“ und anschließend den gewünschten Ordner.', 'neutral', '<button class="secondary" data-action="exportFullBackup">Vollbackup erstellen</button>')}
      </div>
      <form id="onboardingTripForm" class="card formCard">
        <h2>Reise anlegen</h2>
        <div class="formField"><label for="onboardingTripName">Reisename</label><input id="onboardingTripName" name="name" required placeholder="z. B. AIDA Sommer 2026" value="${esc(draftValue('onboardingTrip', 'name', currentTrip()?.name || ''))}"></div>
        <div class="formField"><label for="onboardingTripShip">Schiff</label><input id="onboardingTripShip" name="ship" placeholder="z. B. AIDAcosma" value="${esc(draftValue('onboardingTrip', 'ship', currentTrip()?.ship || ''))}"></div>
        <div class="twoCols"><div class="formField"><label for="onboardingTripStart">Start</label><input id="onboardingTripStart" name="startDate" type="date" value="${esc(draftValue('onboardingTrip', 'startDate', currentTrip()?.startDate || ''))}"></div><div class="formField"><label for="onboardingTripEnd">Ende</label><input id="onboardingTripEnd" name="endDate" type="date" value="${esc(draftValue('onboardingTrip', 'endDate', currentTrip()?.endDate || ''))}"></div></div>
        ${tripVersionFieldHtml(currentTrip(), 'onboardingTrip')}
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
  return `
    <section class="screen">
      <div class="heroCard dashboardHero dashboardTripCard ${trip?.archived ? 'completed' : ''}">
        <div class="dashboardTripTop">
          <p class="eyebrow">${esc(trip?.ship || (trip?.archived ? 'Abgeschlossene Reise' : 'Aktive Reise'))}</p>
          <span class="dashboardTripState">${trip?.archived ? 'Abgeschlossen' : 'Aktuelle Reise'}</span>
        </div>
        <h1 title="${esc(trip?.name || 'CruiseSip')}">${esc(trip?.name || 'CruiseSip')}</h1>
        <div class="dashboardTripMeta">
          <span>${trip?.startDate || trip?.endDate ? `${esc(formatDate(trip.startDate))} – ${esc(formatDate(trip.endDate))}` : 'Zeitraum noch nicht festgelegt'}</span>
          ${tripItinerary(trip).length ? `<span>${tripItinerary(trip).length} Reisetage</span>` : ''}
        </div>
      </div>
      ${tripStatusNoticeHtml('dashboard', trip)}
      <div id="dashboardQuick">${dashboardQuickHtml()}</div>
      ${personalRepeatCardHtml()}
      <div class="kpiGrid">
        ${kpi('Heute', eur(today.value), `${today.count} Getränke`)}
        ${kpi('Gesamtreise', eur(total.value), `${total.count} Getränke`)}
        ${kpi('Ersparnis', eur(total.saved), total.unclear ? `${eur(total.unclear)} unklar` : 'konservativ')}
        ${kpi('Zu zahlen', eur(total.paid), 'nicht enthalten/unklar')}
      </div>
      ${todayItineraryCardHtml()}
      ${dailyOverviewHtml()}
      ${setupWarningsHtml()}
    </section>`;
}

function todayItineraryCardHtml() {
  const trip = currentTrip();
  const days = tripItinerary(trip).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!days.length) return '';
  const todayKey = localLogDayKey(Date.now());
  const today = days.find(day => day.date === todayKey);
  const next = days.find(day => String(day.date) > todayKey);
  const day = today || next;
  if (!day) return '';
  const index = days.findIndex(row => row.date === day.date);
  const isToday = day.date === todayKey;
  const label = isToday ? 'Heute an Bord' : 'Nächster Reisetag';
  const time = itineraryTimeLabel(day);
  return `<article class="card todayRouteCard ${isToday ? 'isToday' : 'isUpcoming'}">
    <div class="todayRouteIcon" aria-hidden="true">${day.type === 'sea' ? '≈' : '⚓'}</div>
    <div class="todayRouteContent">
      <div class="todayRouteTop"><span>${esc(label)}</span><small>Tag ${index + 1} von ${days.length} · ${esc(formatDate(day.date))}</small></div>
      <h2>${esc(itineraryLocationLabel(day))}</h2>
      <p>${esc([itineraryTypeLabel(day.type), time, day.notes].filter(Boolean).join(' · '))}</p>
    </div>
    <button class="mini" data-route="stats">Auswerten</button>
  </article>`;
}

function personalRepeatCardHtml() {
  const trip = currentTrip();
  const rows = currentPersons().map(person => ({ person, log: lastLogForPerson(person.id) })).filter(row => row.log);
  if (!rows.length) return '';
  return `<article class="card personalRepeatCard">
    <div class="sectionHead"><div><h2>Noch einmal erfassen</h2><p class="hint">Das zuletzt erfasste Getränk je Person mit einem Tipp wiederholen.</p></div><span class="subtle">${rows.length} Personen</span></div>
    <div class="personalRepeatList">${rows.map(({ person, log }) => `<button class="personalRepeatRow" data-action="repeatPersonLast" data-id="${esc(person.id)}" style="--person:${esc(person.color || '#e0f2fe')}" ${trip?.archived ? 'disabled' : ''}><span class="personQuickAvatar" aria-hidden="true">${esc(personInitials(person.name))}</span><span><b>${esc(person.name)}</b><small>${esc(log.drinkName || 'Getränk')} · ${esc(formatDateTime(log.ts))}</small></span><strong>${esc(eur(log.price))}</strong></button>`).join('')}</div>
  </article>`;
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

function dashboardQuickHtml() {
  const locked = isTripCompleted();
  return `
    <div class="card quickCard">
      <div class="sectionHead"><h2>Schnellzugriff</h2>${locked ? '<span class="diagnosticSummary ok">Abgeschlossen</span>' : '<button class="mini" data-route="track">Erfassen</button>'}</div>
      <div class="quickActions ${locked ? 'readOnlyQuickActions' : ''}">
        ${locked ? '' : '<button class="quickAction primaryAction" data-route="track"><b>＋</b><span>Getränk erfassen</span></button>'}
        <button class="quickAction" data-route="history"><b>↺</b><span>Verlauf</span></button>
        <button class="quickAction" data-route="stats"><b>∑</b><span>Auswertung</span></button>
        ${locked ? '<button class="quickAction" data-route="trips"><b>✓</b><span>Reise verwalten</span></button>' : ''}
      </div>
    </div>`;
}
function renderDashboardQuick() { const holder = $('#dashboardQuick'); if (holder) holder.innerHTML = dashboardQuickHtml(); }
function quickDrinkList(drinks, readOnly = false) { return `<div class="compactList">${drinks.map(d => readOnly ? `<div class="compactDrink readOnly"><span>${esc(d.name)}</span><b>${eur(d.price)}</b></div>` : `<button class="compactDrink" data-action="trackDrink" data-id="${esc(d.id)}"><span>${esc(d.name)}</span><b>${eur(d.price)}</b></button>`).join('')}</div>`; }
function kpi(label, value, sub) { return `<article class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></article>`; }

function viewTrack() {
  const trip = currentTrip();
  const persons = currentPersons();
  if (trip?.archived) return `
    <section class="screen trackLockedScreen">
      ${tripStatusNoticeHtml('track', trip)}
      <div class="card trackLockedCard">
        <div class="trackLockedSymbol" aria-hidden="true">✓</div>
        <h1>Erfassung gesperrt</h1>
        <p>Die Reise wurde kontrolliert abgeschlossen. Vorhandene Buchungen bleiben unverändert erhalten.</p>
        <div class="buttonStack"><button class="primary" data-route="stats">Auswertung öffnen</button><button class="secondary" data-route="history">Verlauf ansehen</button><button class="secondary" data-route="trips">Reise verwalten</button></div>
      </div>
    </section>`;
  return `
    <section class="screen trackScreen">
      <div class="stickyHeader trackStickyHeader">
        <div id="categoryChips">${categoryChipsHtml()}</div>
        <div id="personQuickSwitch">${persons.length ? personQuickSwitchHtml(persons) : ''}</div>
        ${persons.length ? '' : '<div class="card warningCard"><p>Lege zuerst Personen an.</p><button class="secondary" data-route="devices">Person anlegen</button></div>'}
        <label class="searchBox searchBoxLarge searchBoxNative" for="drinkSearch"><span aria-hidden="true">⌕</span><input id="drinkSearch" class="searchInputNative" type="search" inputmode="search" enterkeyhint="search" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="Getränk suchen …" value="${esc(state.query)}"></label>
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
  return `<div class="personQuickDock"><div class="personQuickHeading"><span>Erfassen für <b>${esc(selectedPerson.name)}</b></span><small>${esc(packageName(selectedPerson.packageId))}</small></div><div class="personQuickScroller" role="group" aria-label="Person für die Erfassung auswählen">${persons.map((person, index) => {
    const active = person.id === selectedPerson.id;
    const color = person.color || PERSON_COLORS[index % PERSON_COLORS.length];
    return `<button class="personQuickButton ${active ? 'active' : ''}" style="--person:${esc(color)}" data-action="selectPerson" data-id="${esc(person.id)}" aria-pressed="${active ? 'true' : 'false'}" aria-label="${esc(person.name)} auswählen"><span class="personQuickAvatar" aria-hidden="true">${esc(personInitials(person.name))}</span><span class="personQuickName">${esc(person.name)}</span></button>`;
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
  return `<div class="trackContent"><section class="trackListSection"><div class="trackListToolbar"><div><h2>${esc(listTitle)}</h2><span>${drinks.length} · ${esc(selectedPersonLabel())}</span></div><label class="drinkSortControl compact" for="drinkSort"><span class="srOnly">Sortieren</span><select id="drinkSort" aria-label="Getränkekacheln sortieren">${drinkSortOptionsHtml()}</select></label></div><div class="drinkGrid">${drinks.map(d => {
    const statusInfo = selectedDrinkStatus(d);
    const status = statusInfo.status;
    const count = usage.get(d.id)?.count || 0;
    const isFavorite = fav.has(d.id);
    const recommendationBadge = state.category === 'Empfohlen' ? '<span class="drinkTileBadge">Empfohlen</span>' : (isFavorite ? '<span class="drinkTileBadge favoriteBadge">Favorit</span>' : '');
    return `<article class="drinkCard ${isFavorite ? 'isFavorite' : ''}"><button class="favButton ${isFavorite ? 'active' : ''}" data-action="toggleFavorite" data-id="${esc(d.id)}" aria-label="${isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}" aria-pressed="${isFavorite ? 'true' : 'false'}">★</button><button class="drinkMain" data-action="trackDrink" data-id="${esc(d.id)}" aria-label="${esc(d.name)} für ${esc(selectedPersonLabel())} erfassen"><span class="drinkTileTop"><span class="drinkIcon" aria-hidden="true">${categoryIcon(d.category, d.name)}</span>${recommendationBadge}</span><span class="drinkBody"><span class="drinkTitle">${esc(d.name)}</span><span class="drinkMeta">${esc(d.category || 'Getränk')}${d.volume ? ` · ${esc(d.volume)}` : ''}</span></span><span class="drinkTileBottom"><span class="statusBadge ${status === 'mixed' ? 'mixed' : statusClass(status)}">${esc(statusInfo.label)}</span><span class="priceButton pricePill">${eur(d.price)}</span></span>${count ? `<span class="drinkUsage">Schon ${count}× gewählt</span>` : ''}</button></article>`;
  }).join('')}</div></section></div>`;
}

function viewHistory() {
  const logs = logsByFilter();
  const locked = isTripCompleted();
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Verlauf</h1><span class="subtle">${logs.length} Einträge</span></div>
      ${tripStatusNoticeHtml('history')}
      ${historyFilterHtml()}
      ${logs.length ? `<div class="timeline ${locked ? 'readOnlyTimeline' : ''}">${logs.map(logItemHtml).join('')}</div>` : '<div class="card emptyText">Keine Einträge im gewählten Zeitraum.</div>'}
    </section>`;
}
function historyFilterHtml() { return `<div class="segmented"><button class="${state.historyFilter === 'today' ? 'active' : ''}" data-action="setHistoryFilter" data-id="today">Heute</button><button class="${state.historyFilter === 'yesterday' ? 'active' : ''}" data-action="setHistoryFilter" data-id="yesterday">Gestern</button><button class="${state.historyFilter === 'trip' ? 'active' : ''}" data-action="setHistoryFilter" data-id="trip">Reise</button></div>`; }
function logOriginInfo(log) {
  const deviceId = String(log?.trackedByDeviceId || '').trim();
  const deviceName = String(log?.trackedByDeviceName || '').trim() || 'Unbekanntes Gerät';
  const isCurrentDevice = !!deviceId && deviceId === String(state.settings.deviceId || '');
  return {
    deviceId,
    deviceName,
    isCurrentDevice,
    label: isCurrentDevice ? `${deviceName} · dieses Gerät` : deviceName
  };
}
function logOriginHtml(log, compact = false) {
  const origin = logOriginInfo(log);
  const imported = !!log?.importedAt && !origin.isCurrentDevice;
  const label = compact ? origin.label : `Erfasst auf ${origin.label}${imported ? ' · importiert' : ''}`;
  return `<span class="logOrigin ${origin.isCurrentDevice ? 'current' : 'remote'}" title="${esc(origin.deviceId || 'Keine Geräte-ID verfügbar')}">${esc(label)}</span>`;
}
function logItemHtml(log) {
  const person = personById(log.personId) || { name: log.personName || 'Unbekannt', color: '#f1f5f9' };
  const writable = tripAllowsChanges(log.tripId || activeTripId());
  if (state.editingLogId === log.id && writable) return logEditItemHtml(log, person);
  return `<article class="timelineItem" style="--person:${esc(person.color || '#f1f5f9')}">
    <div class="timelineMarker"></div>
    <div class="timelineCard">
      <div class="logTop"><b>${statusDot(log.packageStatus)}${esc(log.drinkName)}</b><span>${eur(log.price)}</span></div>
      <div class="logMeta"><span class="personPill">${esc(person.name)}</span><span>${esc(formatDateTime(log.ts))}</span><span>${esc(statusLabel(log.packageStatus))}</span></div>
      <div class="logOriginRow">${logOriginHtml(log)}</div>
      ${writable ? `<div class="logActions"><button class="mini" data-action="editLog" data-id="${esc(log.id)}">Bearbeiten</button><button class="mini dangerText" data-action="deleteLog" data-id="${esc(log.id)}">Löschen</button></div>` : '<div class="logReadOnlyLabel">Abgeschlossen · schreibgeschützt</div>'}
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
        <div class="logEditOrigin"><span>Herkunft</span>${logOriginHtml(log)}</div>
        <p class="logEditHint">Beim Wechsel des Getränks werden Barkartenpreis und Paketstatus automatisch angepasst. Der Preis kann danach nur bei einem bewusst abweichenden Sonderfall manuell geändert werden. Die ursprüngliche Geräteherkunft bleibt bei Korrekturen erhalten.</p>
        <div class="logEditActions"><button id="logSaveButton" class="primary" type="submit">Änderungen speichern</button><button type="button" class="secondary dangerText" data-action="deleteLog" data-id="${esc(log.id)}">Eintrag löschen</button></div>
      </form>
    </div>
  </article>`;
}

function viewStats() {
  const filter = state.statsFilter || 'trip';
  const allTripLogs = currentLogs();
  const logs = logsByFilter(filter, allTripLogs);
  const persons = currentPersons();
  const selectedPerson = state.statsPersonId ? persons.find(person => person.id === state.statsPersonId) : null;
  if (state.statsPersonId && !selectedPerson) state.statsPersonId = null;
  if (selectedPerson) return viewStatsPersonDetail(selectedPerson, logs, filter);

  const total = calcDetailed(logs);
  const isTripView = filter === 'trip';
  return `
    <section class="screen statsScreen">
      <div class="sectionHead statsTitleRow"><h1>Auswertungen</h1></div>
      ${activeTripContextHtml()}
      ${archiveIntegrityCardHtml()}
      ${tripStatusNoticeHtml('stats')}
      ${statsFilterHtml()}
      <div class="kpiGrid">
        ${kpi('Konsumwert', eur(total.value), `${total.count} Getränke`)}
        ${kpi('Im Paket', eur(total.included), `${total.includedCount} eindeutig enthalten`)}
        ${kpi('Außerhalb Paket', eur(total.notIncluded), `${total.notIncludedCount} eindeutig nicht enthalten`)}
        ${kpi('Unklar', eur(total.unclear), `${total.unclearCount} an Bord prüfen`)}
      </div>
      ${statusDonutChartHtml(logs)}
      ${categoryDistributionChartHtml(logs)}
      ${dailyValueChartHtml(logs)}
      ${isTripView ? overallCompletionSummaryHtml(persons, allTripLogs) : ''}
      ${isTripView ? packageForecastOverviewHtml(persons, allTripLogs) : ''}
      ${isTripView ? tripTravelReportHtml(persons, allTripLogs) : ''}
      ${isTripView ? personCompletionDashboardHtml(persons, allTripLogs) : ''}
      ${statusBreakdownHtml(logs)}
      ${outsidePackageHtml(logs)}
      ${statsSection('Pro Person', groupStats(logs, l => personById(l.personId)?.name || l.personName || 'Unbekannt'))}
      ${statsSection('Pro Getränk', groupStats(logs, l => l.drinkName || 'Unbekannt'), 20)}
      ${statsSection('Pro Kategorie', groupStats(logs, l => resolvedLogCategory(l) || 'Ohne Kategorie'))}
      ${statsSection('Pro Tag', groupStats(logs, l => formatDateKey(l.ts)))}
      ${statsSection('Lieblingsgetränke', groupStats(logs, l => l.drinkName || 'Unbekannt').sort((a, b) => b.count - a.count).slice(0, 10), 10)}
      ${isTripView ? reportExportActionsHtml() : ''}
    </section>`;
}
function archiveIntegrityCardHtml(trip = currentTrip()) {
  if (!trip?.archived) return '';
  const integrity = state.archiveIntegrity?.[trip.id] || { status: 'warn', label: 'Prüfung läuft', detail: 'Der Abschlussstand wird lokal geprüft.' };
  const snapshot = trip.closureSnapshot || {};
  const closedAt = trip.archivedAt ? formatDateTime(Date.parse(trip.archivedAt)) : 'Zeitpunkt nicht gespeichert';
  const device = trip.archivedByDeviceName || 'Gerät nicht gespeichert';
  const sequence = Number(trip.closureSequence || 1);
  return `<article class="card archiveIntegrityCard ${esc(integrity.status)}">
    <div class="archiveIntegrityIcon" aria-hidden="true">${integrity.status === 'ok' ? '✓' : integrity.status === 'bad' ? '!' : 'i'}</div>
    <div class="archiveIntegrityContent"><div class="sectionHead"><div><h2>Archivierter Abschlussstand</h2><p class="hint">Abschluss ${sequence} · ${esc(closedAt)} · ${esc(device)}</p></div><span class="archiveIntegrityBadge ${esc(integrity.status)}">${esc(integrity.label)}</span></div>
    <p>${esc(integrity.detail)}</p>
    ${snapshot.logCount !== undefined ? `<div class="archiveSnapshotFacts"><span><b>${Number(snapshot.logCount || 0)}</b> Buchungen</span><span><b>${eur(snapshot.totalValue || 0)}</b> Barkartenwert</span><span><b>${Number(snapshot.personCount || 0)}</b> Personen</span>${snapshot.favoriteDrink ? `<span><b>${esc(snapshot.favoriteDrink.count)}×</b> ${esc(snapshot.favoriteDrink.name)}</span>` : ''}</div>` : ''}
    <p class="archiveIntegrityNote">Zum Ändern oder zum Nachimport fehlender Gerätedaten muss die Reise zuerst reaktiviert werden.</p></div>
  </article>`;
}
function statsFilterHtml() {
  const filter = state.statsFilter || 'trip';
  return `<div class="segmented"><button class="${filter === 'today' ? 'active' : ''}" data-action="setStatsFilter" data-id="today">Heute</button><button class="${filter === 'yesterday' ? 'active' : ''}" data-action="setStatsFilter" data-id="yesterday">Gestern</button><button class="${filter === 'trip' ? 'active' : ''}" data-action="setStatsFilter" data-id="trip">Reise</button></div>`;
}
function reportExportActionsHtml() {
  const trip = currentTrip();
  if (!trip) return '';
  const finalReport = !!trip.archived;
  return `<article class="card reportExportCard ${finalReport ? 'finalReportExport' : ''}">
    <div class="sectionHead"><div><h2>${finalReport ? 'Abschlussbericht sichern' : 'Bericht exportieren'}</h2><p class="hint">${finalReport ? 'Sichert den schreibgeschützten Endstand der Reise. HTML und Druckansicht enthalten Abschlusskennzeichnung, Abschlusszeitpunkt und lokale Integritätsprüfung.' : 'Erstellt den vollständigen Reisebericht aus den lokal gespeicherten Daten.'} Die CSV enthält eine Zeile je Buchung; HTML und Druckansicht enthalten zusätzlich Zusammenfassungen, Tageswerte und Personenvergleiche.</p></div><span class="backupFormatBadge">offline</span></div>
    <div class="reportExportButtons">
      <button class="secondary" data-action="exportReportCsv"><span>${finalReport ? 'Abschlussdaten als CSV' : 'CSV für Excel'}</span><small>Buchungsdaten strukturiert exportieren</small></button>
      <button class="secondary" data-action="exportReportHtml"><span>${finalReport ? 'Abschlussbericht als HTML' : 'HTML-Bericht'}</span><small>Speichern oder über iOS teilen</small></button>
      <button class="primary" data-action="printTripReport"><span>${finalReport ? 'Abschlussbericht / PDF' : 'Drucken / PDF'}</span><small>iOS-Druckansicht öffnen</small></button>
    </div>
    <p class="reportExportHint">PDF auf dem iPhone: „${finalReport ? 'Abschlussbericht / PDF' : 'Drucken / PDF'}“ öffnen, die Vorschau vergrößern und anschließend über Teilen in der Dateien-App sichern.</p>
  </article>`;
}
function csvSafeCell(value) {
  let text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  if (/^[=+@]/.test(text) || /^-[^0-9]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function csvNumber(value) {
  return (Number(value) || 0).toLocaleString('de-DE', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function reportDayNumber(dateKey, trip = currentTrip(), itineraryDay = itineraryDayForDate(dateKey, trip)) {
  if (Number.isFinite(Number(itineraryDay?.dayNumber)) && Number(itineraryDay.dayNumber) > 0) return Number(itineraryDay.dayNumber);
  const start = isoDateDayNumber(trip?.startDate);
  const current = isoDateDayNumber(dateKey);
  return start !== null && current !== null && current >= start ? current - start + 1 : '';
}
function tripReportExportModel() {
  const trip = currentTrip();
  if (!trip) return null;
  const persons = currentPersons().slice();
  const logs = currentLogs().slice().sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  const total = calcDetailed(logs);
  const completion = completionTotals(persons, logs);
  const overallResult = overallResultPresentation(completion);
  const daily = tripDailyReport(logs, trip);
  const drinks = drinkReportRows(logs);
  const frequent = drinks.slice().sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key, 'de')).slice(0, 10);
  const expensive = drinks.slice().sort((a, b) => b.maxPrice - a.maxPrice || b.count - a.count || a.key.localeCompare(b.key, 'de')).slice(0, 10);
  const categories = categoryDetailedStats(logs).sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key, 'de'));
  const packageProgress = packageForecastSummary(persons, logs, trip);
  const personRows = persons.map(person => {
    const data = personCompletionStats(person, logs, 'trip');
    return { person, data, result: resultPresentation(data), progress: personPackageForecast(person, logs, trip) };
  });
  return {
    trip,
    persons,
    logs,
    total,
    completion,
    overallResult,
    daily,
    frequent,
    expensive,
    categories,
    personRows,
    packageProgress,
    itinerary: tripItinerary(trip),
    generatedAt: new Date(),
    archiveIntegrity: state.archiveIntegrity?.[trip.id] || null
  };
}
function tripReportCsvText(model = tripReportExportModel()) {
  if (!model) return '';
  const headers = [
    'Reise', 'Schiff', 'Reisestatus', 'Reisebeginn', 'Reiseende', 'Reisetag', 'Datum', 'Uhrzeit',
    'Station', 'Land', 'Tagesart', 'Ankunft', 'Abfahrt', 'Person', 'Getränkepaket', 'Paketpreis EUR',
    'Getränk', 'Kategorie', 'Paketstatus', 'Preis EUR', 'Erfasst auf', 'Buchungs-ID', 'Abgeschlossen am', 'Abschluss-Prüfsumme'
  ];
  const rows = model.logs.map(log => {
    const person = model.persons.find(row => row.id === log.personId);
    const dateKey = localLogDayKey(log.ts);
    const itineraryDay = itineraryDayForDate(dateKey, model.trip);
    return [
      model.trip.name || '',
      model.trip.ship || '',
      model.trip.archived ? 'Abgeschlossen' : 'Laufend',
      model.trip.startDate || '',
      model.trip.endDate || '',
      reportDayNumber(dateKey, model.trip, itineraryDay),
      dateKey,
      localTimeInputValue(log.ts),
      itineraryDay ? itineraryLocationLabel(itineraryDay) : '',
      itineraryDay?.country || '',
      itineraryDay ? itineraryTypeLabel(itineraryDay.type) : '',
      itineraryDay?.arrival || '',
      itineraryDay?.departure || '',
      person?.name || log.personName || 'Unbekannt',
      packageName(person?.packageId || ''),
      csvNumber(person?.packagePrice),
      log.drinkName || drinkById(log.drinkId)?.name || 'Unbekannt',
      resolvedLogCategory(log) || 'Ohne Kategorie',
      statusLabel(log.packageStatus),
      csvNumber(log.price),
      logOriginInfo(log).deviceName,
      log.id || '',
      model.trip.archivedAt || '',
      model.trip.closureDigest || ''
    ];
  });
  return `\uFEFFsep=;\r\n${[headers, ...rows].map(row => row.map(csvSafeCell).join(';')).join('\r\n')}\r\n`;
}
function reportMetricHtml(label, value, sub = '') {
  return `<div class="exportMetric"><span>${esc(label)}</span><b>${esc(value)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
}
function reportTableHtml(headers, rows, emptyText = 'Keine Daten vorhanden.') {
  if (!rows.length) return `<p class="exportEmpty">${esc(emptyText)}</p>`;
  return `<div class="exportTableWrap"><table><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function reportStatusDonutHtml(total) {
  const rows = [
    { key: 'included', label: 'Im Paket enthalten', count: total.includedCount, value: total.included },
    { key: 'outside', label: 'Nicht enthalten', count: total.notIncludedCount, value: total.notIncluded },
    { key: 'unclear', label: 'Unklar', count: total.unclearCount, value: total.unclear }
  ];
  let offset = 0;
  const circles = rows.filter(row => row.count > 0).map(row => {
    const percentage = total.count ? row.count / total.count * 100 : 0;
    const html = `<circle class="${row.key}" cx="50" cy="50" r="38" pathLength="100" stroke-dasharray="${percentage.toFixed(3)} ${(100 - percentage).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;
    offset += percentage;
    return html;
  }).join('');
  return `<div class="exportChart"><svg viewBox="0 0 100 100" role="img" aria-label="${esc(total.count)} Getränke nach Paketstatus"><g transform="rotate(-90 50 50)"><circle class="track" cx="50" cy="50" r="38"></circle>${circles}</g><text class="value" x="50" y="48" text-anchor="middle">${total.count}</text><text class="label" x="50" y="59" text-anchor="middle">Getränke</text></svg><div class="exportLegend">${rows.map(row => `<div><span class="dot ${row.key}"></span><p><b>${esc(row.label)}</b><small>${row.count} · ${total.count ? Math.round(row.count / total.count * 100) : 0} % · ${esc(eur(row.value))}</small></p></div>`).join('')}</div></div>`;
}
function tripReportDocumentBodyHtml(model = tripReportExportModel(), options = {}) {
  if (!model) return '';
  const status = model.trip.archived ? 'Abschlussbericht' : 'Zwischenbericht';
  const dayInfo = tripDayInfo(model.logs, model.trip);
  const period = `${formatDate(model.trip.startDate)} – ${formatDate(model.trip.endDate)}`;
  const closureMeta = model.trip.archived ? [model.trip.archivedAt ? `Abgeschlossen am ${formatDateTime(Date.parse(model.trip.archivedAt))}` : 'Abschlusszeitpunkt nicht gespeichert', model.trip.archivedByDeviceName ? `Gerät: ${model.trip.archivedByDeviceName}` : '', model.trip.closureDigest ? `Prüfsumme: ${model.trip.closureDigest}` : ''].filter(Boolean) : [];
  const personRows = model.personRows.map(({ person, data, result }) => [
    `<b>${esc(person.name)}</b>`,
    esc(packageName(person.packageId)),
    String(data.stats.count),
    esc(eur(data.stats.value)),
    `${data.stats.includedCount} · ${esc(eur(data.stats.included))}`,
    `${data.stats.notIncludedCount} · ${esc(eur(data.stats.notIncluded))}`,
    `${data.stats.unclearCount} · ${esc(eur(data.stats.unclear))}`,
    data.packageSelected ? (data.packagePrice ? esc(eur(data.packagePrice)) : 'fehlt') : 'Kein Paket',
    `<b>${esc(result.label)}</b><br><small>${esc(result.value)} · ${esc(result.sub)}</small>`
  ]);
  const progressRows = model.personRows
    .filter(({ progress }) => progress.packageSelected)
    .map(({ person, progress }) => [
      `<b>${esc(person.name)}</b><br><small>${esc(packageName(person.packageId))}</small>`,
      esc(eur(progress.stats.included)),
      progress.packagePrice ? esc(eur(progress.packagePrice)) : 'fehlt',
      progress.progressPercent === null ? '—' : esc(percent(progress.progressPercent)),
      progress.remainingValue === null ? '—' : esc(eur(progress.remainingValue)),
      progress.timeframe.elapsedDays ? esc(eur(progress.averageIncludedPerElapsedDay)) : '—',
      progress.projectedIncluded === null ? '—' : esc(eur(progress.projectedIncluded)),
      `<b>${esc(progress.forecastStatus.label)}</b><br><small>${esc(progress.forecastStatus.detail)}</small>`,
      progress.breakEven ? esc(progress.breakEven.label) : (progress.predictedBreakEvenDay && progress.predictedBreakEvenDay <= progress.timeframe.totalDays ? `voraussichtlich Tag ${progress.predictedBreakEvenDay}` : '—')
    ]);
  const dailyRows = model.daily.rows.map(row => {
    const itineraryDay = itineraryDayForDate(row.key, model.trip);
    return [
      esc(String(reportDayNumber(row.key, model.trip, itineraryDay) || '—')),
      esc(row.key),
      esc(itineraryDay ? itineraryLocationLabel(itineraryDay) : '—'),
      esc(itineraryDay ? itineraryTimeLabel(itineraryDay) || '—' : '—'),
      String(row.count),
      esc(eur(row.value)),
      String(row.includedCount),
      String(row.notIncludedCount),
      String(row.unclearCount)
    ];
  });
  const categoryRows = model.categories.map(row => [esc(row.key), String(row.count), esc(eur(row.value)), String(row.includedCount), String(row.notIncludedCount), String(row.unclearCount)]);
  const frequentRows = model.frequent.map(row => [esc(row.key), String(row.count), esc(eur(row.value)), esc(eur(row.maxPrice))]);
  const expensiveRows = model.expensive.map(row => [esc(row.key), esc(eur(row.maxPrice)), String(row.count), esc(eur(row.value))]);
  const bookingRows = model.logs.map(log => {
    const person = model.persons.find(row => row.id === log.personId);
    const dateKey = localLogDayKey(log.ts);
    const itineraryDay = itineraryDayForDate(dateKey, model.trip);
    return [
      esc(dateKey || '—'),
      esc(localTimeInputValue(log.ts) || '—'),
      esc(itineraryDay ? itineraryLocationLabel(itineraryDay) : '—'),
      esc(person?.name || log.personName || 'Unbekannt'),
      esc(log.drinkName || drinkById(log.drinkId)?.name || 'Unbekannt'),
      esc(resolvedLogCategory(log) || 'Ohne Kategorie'),
      esc(statusLabel(log.packageStatus)),
      esc(eur(log.price)),
      esc(logOriginInfo(log).deviceName)
    ];
  });
  const itineraryRows = model.itinerary.map(day => [
    esc(String(day.dayNumber || reportDayNumber(day.date, model.trip, day) || '—')),
    esc(day.date || '—'),
    esc(itineraryTypeLabel(day.type)),
    esc(itineraryLocationLabel(day)),
    esc(itineraryTimeLabel(day) || '—'),
    esc(day.notes || '')
  ]);
  const returnButton = options.returnUrl
    ? `<button id="returnToCruiseSip" class="secondary" type="button" onclick="returnToCruiseSip()">Zurück zu CruiseSip</button>`
    : '';
  const toolbar = options.toolbar === false ? '' : `<div class="exportToolbar"><div class="exportToolbarActions">${returnButton}<button type="button" onclick="window.print()">Drucken / als PDF sichern</button></div><span>Der Bericht enthält ausschließlich lokal exportierte CruiseSip-Daten.</span></div>`;
  return `${toolbar}<main class="exportReport">
    <header class="exportHeader"><div><p>CruiseSip · ${esc(status)}</p><h1>${esc(model.trip.name || 'Kreuzfahrt')}</h1><h2>${esc(model.trip.ship || 'Schiff nicht hinterlegt')}</h2></div><div class="exportHeaderMeta"><b>${esc(period)}</b><span>${esc(dayInfo.label)}</span><span>Erstellt am ${esc(model.generatedAt.toLocaleString('de-DE'))}</span>${closureMeta.map(row => `<span>${esc(row)}</span>`).join('')}</div></header>
    ${model.trip.archived ? `<section class="exportArchiveNotice ${esc(model.archiveIntegrity?.status || 'legacy')}"><b>Archivierter Abschlussstand · ${esc(model.archiveIntegrity?.label || 'lokaler Endstand')}</b><p>${esc(model.archiveIntegrity?.detail || 'Dieser Bericht wurde aus dem lokal gespeicherten Abschlussstand erstellt.')}</p></section>` : ''}
    <section class="exportNotice"><b>Berechnungsgrundlage</b><p>Die Paketbilanz ist konservativ. Nur eindeutig enthaltene Getränke werden dem Paketpreis gegenübergestellt. Nicht enthaltene Getränke und unklare Paketstatus bleiben getrennt ausgewiesen.</p></section>
    <section><h2>Gesamtübersicht</h2><div class="exportMetricGrid">
      ${reportMetricHtml('Getränke gesamt', String(model.total.count), eur(model.total.value))}
      ${reportMetricHtml('Barkartenwert', eur(model.total.value), dayInfo.label)}
      ${reportMetricHtml('Gesamtpaketkosten', eur(model.completion.packagePriceTotal), `${model.completion.packagePersons} Personen mit Paket`)}
      ${reportMetricHtml('Kosten außerhalb Paket', eur(model.total.notIncluded), `${model.total.notIncludedCount} Getränke`)}
      ${reportMetricHtml('Unklare Paketstatus', String(model.total.unclearCount), eur(model.total.unclear))}
      ${reportMetricHtml(model.overallResult.label, model.overallResult.value, model.overallResult.sub)}
    </div>${reportStatusDonutHtml(model.total)}</section>
    <section><h2>Auswertung je Person</h2>${reportTableHtml(['Person', 'Paket', 'Getränke', 'Barkartenwert', 'Enthalten', 'Nicht enthalten', 'Unklar', 'Paketpreis', 'Ergebnis'], personRows, 'Keine Personen vorhanden.')}</section>
    <section><h2>Paket-Amortisation und Prognose</h2><p class="exportSectionHint">Nur eindeutig enthaltene Getränke zählen als Paketwert. Die Prognose basiert auf allen verstrichenen Reisetagen; unklare Paketstatus bleiben unberücksichtigt.</p>${reportTableHtml(['Person', 'Paketwert', 'Paketpreis', 'Fortschritt', 'Rest', 'Ø je Reisetag', 'Hochrechnung', 'Status', 'Break-even'], progressRows, 'Keine Getränkepakete für eine Prognose hinterlegt.')}</section>
    ${model.itinerary.length ? `<section><h2>Reiseverlauf</h2>${reportTableHtml(['Tag', 'Datum', 'Tagesart', 'Station', 'Liegezeit', 'Hinweise'], itineraryRows)}</section>` : ''}
    <section><h2>Auswertung je Reisetag</h2>${reportTableHtml(['Tag', 'Datum', 'Station', 'Liegezeit', 'Getränke', 'Barkartenwert', 'Enthalten', 'Nicht enthalten', 'Unklar'], dailyRows, 'Keine Reisetage ermittelbar.')}</section>
    <section class="exportTwoColumns"><div><h2>Häufigste Getränke</h2>${reportTableHtml(['Getränk', 'Anzahl', 'Gesamtwert', 'Höchster Einzelpreis'], frequentRows)}</div><div><h2>Teuerste Getränke</h2>${reportTableHtml(['Getränk', 'Einzelpreis', 'Anzahl', 'Gesamtwert'], expensiveRows)}</div></section>
    <section><h2>Kategorienvergleich</h2>${reportTableHtml(['Kategorie', 'Getränke', 'Barkartenwert', 'Enthalten', 'Nicht enthalten', 'Unklar'], categoryRows)}</section>
    <section class="exportBookings"><h2>Einzelbuchungen</h2>${reportTableHtml(['Datum', 'Uhrzeit', 'Station', 'Person', 'Getränk', 'Kategorie', 'Paketstatus', 'Preis', 'Gerät'], bookingRows, 'Keine Getränkebuchungen vorhanden.')}</section>
    <footer>Erstellt mit CruiseSip ${esc(APP_VERSION)} · Build ${esc(APP_BUILD)} · vollständig offline</footer>
  </main>`;
}
function reportDocumentCss() {
  return `:root{color-scheme:only light}html{background:#fff!important;color-scheme:only light}*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#18202a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;line-height:1.35}.exportToolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 18px;background:#172033;color:#fff}.exportToolbarActions{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.exportToolbar button{border:0;border-radius:12px;padding:11px 16px;background:#fff;color:#172033;font-weight:800;cursor:pointer}.exportToolbar button.secondary{background:#dfeaf5;color:#172033}.exportToolbar span{font-size:13px}.exportReport{width:min(1120px,calc(100% - 28px));margin:20px auto;padding:28px;background:#fff;border-radius:20px;box-shadow:0 16px 50px rgba(15,23,42,.12)}.exportHeader{display:flex;justify-content:space-between;gap:24px;padding-bottom:20px;border-bottom:3px solid #1f73b7}.exportHeader p{margin:0 0 6px;color:#1f73b7;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px}.exportHeader h1{margin:0;font-size:30px;line-height:1.12}.exportHeader h2{margin:6px 0 0;font-size:18px;color:#526071}.exportHeaderMeta{display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;font-size:13px}.exportReport section{margin-top:26px;break-inside:auto}.exportReport section>h2,.exportTwoColumns>div>h2{margin:0 0 12px;font-size:19px;color:#172033}.exportNotice,.exportArchiveNotice{padding:14px 16px;border:1px solid #b9d6ed;border-radius:14px;background:#f2f8fd}.exportArchiveNotice{border-color:#9fd5b5;background:#edf9f2}.exportArchiveNotice.bad{border-color:#efaaa4;background:#fff1f0}.exportArchiveNotice.warn,.exportArchiveNotice.legacy{border-color:#e4c879;background:#fff9e8}.exportNotice p{margin:4px 0 0;font-size:13px}.exportSectionHint{margin:-4px 0 12px;color:#64748b;font-size:12px}.exportMetricGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.exportMetric{display:flex;flex-direction:column;gap:4px;padding:13px;border:1px solid #dbe3ec;border-radius:12px;background:#f8fafc}.exportMetric span{font-size:12px;color:#5e6b7a}.exportMetric b{font-size:18px}.exportMetric small{font-size:11px;color:#64748b}.exportChart{display:grid;grid-template-columns:180px 1fr;align-items:center;gap:24px;margin-top:16px;padding:14px;border:1px solid #dbe3ec;border-radius:14px}.exportChart svg{width:165px;height:165px}.exportChart circle{fill:none;stroke-width:15}.exportChart .track{stroke:#e8edf3}.exportChart .included{stroke:#2f9e62}.exportChart .outside{stroke:#df5b50}.exportChart .unclear{stroke:#d9a21b}.exportChart .value{font-size:18px;font-weight:800;fill:#172033}.exportChart .label{font-size:7px;fill:#64748b}.exportLegend{display:grid;gap:10px}.exportLegend>div{display:flex;align-items:center;gap:9px}.exportLegend p{display:flex;flex-direction:column;margin:0}.exportLegend small{color:#64748b}.dot{width:11px;height:11px;border-radius:50%}.dot.included{background:#2f9e62}.dot.outside{background:#df5b50}.dot.unclear{background:#d9a21b}.exportTableWrap{width:100%;overflow-x:auto;border:1px solid #dbe3ec;border-radius:12px}.exportTableWrap table{width:100%;border-collapse:collapse;font-size:11px}.exportTableWrap th{background:#edf3f8;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.03em}.exportTableWrap th,.exportTableWrap td{padding:8px 7px;border-bottom:1px solid #e5eaf0;vertical-align:top}.exportTableWrap tr:last-child td{border-bottom:0}.exportTableWrap tbody tr:nth-child(even){background:#fafbfd}.exportTableWrap small{color:#64748b}.exportTwoColumns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.exportEmpty{margin:0;padding:15px;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b}.exportReport footer{margin-top:28px;padding-top:14px;border-top:1px solid #dbe3ec;color:#64748b;font-size:11px;text-align:center}@media(max-width:760px){.exportReport{width:100%;margin:0;padding:18px;border-radius:0}.exportHeader{flex-direction:column}.exportHeaderMeta{align-items:flex-start;text-align:left}.exportMetricGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.exportChart{grid-template-columns:1fr}.exportChart svg{justify-self:center}.exportTwoColumns{grid-template-columns:1fr}.exportToolbar{align-items:flex-start;flex-direction:column}.exportToolbarActions{width:100%;justify-content:flex-start}}@media (prefers-color-scheme:dark){html,body,.exportReport{background:#fff!important;color:#18202a!important}}@media print{@page{size:A4 portrait;margin:10mm}html,body{background:#fff!important;color:#18202a!important;color-scheme:only light}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.exportToolbar{display:none!important}.exportReport{width:auto;margin:0;padding:0;border-radius:0;box-shadow:none}.exportHeader{break-inside:avoid}.exportMetricGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.exportMetric,.exportChart,.exportTableWrap{break-inside:avoid}.exportTableWrap{overflow:visible}.exportTableWrap table{font-size:8.5px}.exportTableWrap th{font-size:8px}.exportTableWrap th,.exportTableWrap td{padding:5px 4px}.exportTwoColumns{grid-template-columns:1fr 1fr}.exportBookings{break-before:page}.exportReport section>h2,.exportTwoColumns>div>h2{font-size:15px}.exportHeader h1{font-size:24px}}`;
}
function standaloneTripReportHtml(model = tripReportExportModel(), options = {}) {
  if (!model) return '';
  const title = `${model.trip.archived ? 'Abschlussbericht' : 'Reisebericht'} – ${model.trip.name || 'CruiseSip'}`;
  const returnUrl = String(options.returnUrl || '');
  const safeReturnUrl = JSON.stringify(returnUrl).replace(/</g, '\\u003c');
  const navigationScript = returnUrl
    ? `<script>const CRUISESIP_RETURN_URL=${safeReturnUrl};function returnToCruiseSip(){let closeRequested=false;try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close();closeRequested=true;}}catch(_){ }if(!closeRequested||!window.closed){if(CRUISESIP_RETURN_URL){window.location.replace(CRUISESIP_RETURN_URL);}else if(window.history.length>1){window.history.back();}}}window.addEventListener('afterprint',()=>setTimeout(()=>document.getElementById('returnToCruiseSip')?.focus(),150));<\/script>`
    : '';
  const autoPrint = options.autoPrint === true
    ? `<script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print();},500),{once:true});<\/script>`
    : '';
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="only light"><meta name="theme-color" content="#ffffff"><title>${esc(title)}</title><style>${reportDocumentCss()}</style></head><body>${tripReportDocumentBodyHtml(model, { returnUrl })}${navigationScript}${autoPrint}</body></html>`;
}
async function exportTripReportCsv() {
  const model = tripReportExportModel();
  if (!model) { alert('Keine Reise ausgewählt.'); return; }
  const filename = `${model.trip.archived ? 'CruiseSip_Abschlussdaten' : 'CruiseSip_Buchungen'}_${safeFile(model.trip.name)}_${safeFile(model.trip.startDate || localBackupFileStamp())}.csv`;
  const result = await saveTextFile(filename, tripReportCsvText(model), ['text/csv;charset=utf-8', 'text/plain;charset=utf-8'], { title: `CruiseSip CSV – ${model.trip.name}` });
  if (result.cancelled) toast('CSV-Export abgebrochen');
  else toast(result.method === 'share' ? 'CSV zum Speichern bereitgestellt' : 'CSV wurde heruntergeladen');
  return result;
}
async function exportTripReportHtml() {
  const model = tripReportExportModel();
  if (!model) { alert('Keine Reise ausgewählt.'); return; }
  const filename = `${model.trip.archived ? 'CruiseSip_Abschlussbericht' : 'CruiseSip_Bericht'}_${safeFile(model.trip.name)}_${safeFile(model.trip.startDate || localBackupFileStamp())}.html`;
  const result = await saveTextFile(filename, standaloneTripReportHtml(model), ['text/html;charset=utf-8', 'text/plain;charset=utf-8'], { title: `CruiseSip Bericht – ${model.trip.name}` });
  if (result.cancelled) toast('HTML-Export abgebrochen');
  else toast(result.method === 'share' ? 'HTML-Bericht zum Speichern bereitgestellt' : 'HTML-Bericht wurde heruntergeladen');
  return result;
}
function cleanupPrintReport() {
  $('#printReportRoot')?.remove();
}
function printTripReport() {
  const model = tripReportExportModel();
  if (!model) { alert('Keine Reise ausgewählt.'); return; }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Die Druckansicht konnte nicht geöffnet werden. Bitte Pop-ups für CruiseSip erlauben oder den HTML-Bericht öffnen und dort „Drucken / als PDF sichern“ wählen.');
    return;
  }
  try {
    printWindow.document.open();
    printWindow.document.write(standaloneTripReportHtml(model, { autoPrint: true, returnUrl: window.location.href }));
    printWindow.document.close();
  } catch (error) {
    try { printWindow.close(); } catch (_) {}
    console.error(error);
    alert('Die Druckansicht konnte nicht erstellt werden. Bitte den HTML-Bericht verwenden und dort „Drucken / als PDF sichern“ wählen.');
  }
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
function statusDonutChartHtml(logs) {
  const total = calcDetailed(logs);
  const rows = [
    { key: 'included', label: 'Im Paket enthalten', count: total.includedCount, value: total.included },
    { key: 'outside', label: 'Nicht enthalten', count: total.notIncludedCount, value: total.notIncluded },
    { key: 'unclear', label: 'Unklar', count: total.unclearCount, value: total.unclear }
  ];
  let offset = 0;
  const circles = rows.filter(row => row.count > 0).map(row => {
    const percentage = total.count ? row.count / total.count * 100 : 0;
    const circle = `<circle class="donutSegment ${row.key}" cx="50" cy="50" r="38" pathLength="100" stroke-dasharray="${percentage.toFixed(3)} ${(100 - percentage).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;
    offset += percentage;
    return circle;
  }).join('');
  const legend = rows.map(row => {
    const percentage = total.count ? row.count / total.count * 100 : 0;
    const percentageLabel = percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 });
    const countLabel = `${row.count} Getränk${row.count === 1 ? '' : 'e'}`;
    return `<div class="chartLegendRow"><span class="chartLegendDot ${row.key}"></span><div><b>${esc(row.label)}</b><small>${countLabel} · ${percentageLabel} % · ${eur(row.value)}</small></div></div>`;
  }).join('');
  const chartLabel = total.count ? `${total.count} Getränke nach Paketstatus` : 'Noch keine Getränke im gewählten Zeitraum';
  return `<article class="card analysisChartCard">
    <div class="sectionHead"><div><h2>Grafische Verteilung</h2><p class="hint">Anteil der Getränke nach Paketstatus im gewählten Zeitraum.</p></div><span class="subtle">nach Anzahl</span></div>
    <div class="analysisChartLayout">
      <div class="donutChartWrap">
        <svg class="donutChart" viewBox="0 0 100 100" role="img" aria-label="${esc(chartLabel)}">
          <g transform="rotate(-90 50 50)">
            <circle class="donutTrack" cx="50" cy="50" r="38"></circle>
            ${circles}
          </g>
          <text class="donutValue" x="50" y="48" text-anchor="middle">${total.count}</text>
          <text class="donutLabel" x="50" y="59" text-anchor="middle">Getränke</text>
        </svg>
      </div>
      <div class="chartLegend">${legend}</div>
    </div>
  </article>`;
}
function categoryDistributionChartHtml(logs) {
  const rawRows = categoryDetailedStats(logs).sort((a, b) => b.count - a.count || b.value - a.value);
  if (!rawRows.length) return `<article class="card analysisChartCard"><h2>Getränkekategorien</h2><p class="emptyText">Keine Kategorien im gewählten Zeitraum vorhanden.</p></article>`;
  const primary = rawRows.slice(0, 5).map(row => ({ ...row }));
  if (rawRows.length > 5) {
    const other = rawRows.slice(5).reduce((acc, row) => ({ key: 'Weitere Kategorien', count: acc.count + row.count, value: acc.value + row.value }), { count: 0, value: 0 });
    primary.push(other);
  }
  const totalCount = primary.reduce((sum, row) => sum + row.count, 0);
  let offset = 0;
  const circles = primary.map((row, index) => {
    const share = totalCount ? row.count / totalCount * 100 : 0;
    const circle = `<circle class="donutSegment categorySegment category-${index}" cx="50" cy="50" r="38" pathLength="100" stroke-dasharray="${share.toFixed(3)} ${(100 - share).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`;
    offset += share;
    return circle;
  }).join('');
  return `<article class="card analysisChartCard">
    <div class="sectionHead"><div><h2>Getränkekategorien</h2><p class="hint">Verteilung nach Anzahl der erfassten Getränke.</p></div><span class="subtle">Top ${Math.min(5, rawRows.length)}</span></div>
    <div class="analysisChartLayout">
      <div class="donutChartWrap"><svg class="donutChart" viewBox="0 0 100 100" role="img" aria-label="${esc(totalCount)} Getränke nach Kategorie"><g transform="rotate(-90 50 50)"><circle class="donutTrack" cx="50" cy="50" r="38"></circle>${circles}</g><text class="donutValue" x="50" y="48" text-anchor="middle">${totalCount}</text><text class="donutLabel" x="50" y="59" text-anchor="middle">Getränke</text></svg></div>
      <div class="chartLegend">${primary.map((row, index) => `<div class="chartLegendRow"><span class="chartLegendDot category-${index}"></span><div><b>${esc(row.key)}</b><small>${row.count}× · ${totalCount ? Math.round(row.count / totalCount * 100) : 0} % · ${eur(row.value)}</small></div></div>`).join('')}</div>
    </div>
  </article>`;
}
function dailyValueChartHtml(logs) {
  const report = tripDailyReport(logs, currentTrip());
  const rows = report.rows.filter(row => row.count > 0 || row.value > 0);
  if (!rows.length) return `<article class="card dailyChartCard"><h2>Tagesentwicklung</h2><p class="emptyText">Keine Tageswerte im gewählten Zeitraum vorhanden.</p></article>`;
  const maxValue = Math.max(...rows.map(row => row.value), 1);
  return `<article class="card dailyChartCard">
    <div class="sectionHead"><div><h2>Tagesentwicklung</h2><p class="hint">Barkartenwert pro Konsumtag; die Zahlen bleiben unabhängig vom Paketstatus.</p></div><span class="subtle">${rows.length} Tage</span></div>
    <div class="dailyBarChart">${rows.map(row => {
      const day = itineraryDayForDate(row.key);
      const width = Math.max(row.value > 0 ? 4 : 0, row.value / maxValue * 100);
      const label = day ? `${formatDate(row.key)} · ${itineraryLocationLabel(day)}` : formatDate(row.key);
      return `<div class="dailyBarRow"><div class="dailyBarLabel"><span>${esc(label)}</span><small>${row.count} Getränk${row.count === 1 ? '' : 'e'}</small></div><div class="dailyBarTrack"><i style="width:${width.toFixed(1)}%"></i></div><strong>${eur(row.value)}</strong></div>`;
    }).join('')}</div>
  </article>`;
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
function isoDateDayNumber(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const date = new Date(stamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(stamp / 86400000);
}
function localLogDayKey(ts) {
  const date = new Date(Number(ts));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function tripDayInfo(logs = currentLogs(), trip = currentTrip()) {
  const start = isoDateDayNumber(trip?.startDate);
  const end = isoDateDayNumber(trip?.endDate);
  if (start !== null && end !== null && end >= start) {
    const days = end - start + 1;
    return { days, label: `${days} Reisetag${days === 1 ? '' : 'e'}`, source: 'Reisezeitraum' };
  }
  const consumedDays = new Set(logs.map(log => localLogDayKey(log.ts)).filter(Boolean)).size;
  if (consumedDays) return { days: consumedDays, label: `${consumedDays} Tag${consumedDays === 1 ? '' : 'e'} mit Buchungen`, source: 'Buchungstage' };
  return { days: 0, label: 'keine Reisetage ermittelbar', source: 'Keine Datumsbasis' };
}
function statsPeriodDayInfo(filter, logs) {
  if (filter === 'today' || filter === 'yesterday') return { days: 1, label: '1 Kalendertag', source: 'Tagesfilter' };
  return tripDayInfo(logs, currentTrip());
}
function hasPackage(person) {
  return !!person?.packageId && person.packageId !== 'none';
}
function hasComparablePackage(person) {
  return hasPackage(person) && person.packageId !== 'unclear' && Number(person.packagePrice) > 0;
}
function personCompletionStats(person, logs, filter = 'trip') {
  const personLogs = logs.filter(log => log.personId === person.id);
  const stats = calcDetailed(personLogs);
  const packagePrice = Math.max(0, Number(person.packagePrice) || 0);
  const packageSelected = hasPackage(person);
  const comparable = hasComparablePackage(person);
  const packageResult = comparable ? stats.included - packagePrice : null;
  const dayInfo = statsPeriodDayInfo(filter, filter === 'trip' ? logs : personLogs);
  const averagePerTripDay = dayInfo.days ? stats.value / dayInfo.days : 0;
  return { personLogs, stats, packagePrice, packageSelected, comparable, packageResult, dayInfo, averagePerTripDay };
}
function packageForecastTimeframe(logs, trip = currentTrip(), referenceDateKey = localLogDayKey(Date.now())) {
  const start = isoDateDayNumber(trip?.startDate);
  const end = isoDateDayNumber(trip?.endDate);
  if (start === null || end === null || end < start) {
    return { valid: false, totalDays: 0, elapsedDays: 0, remainingDays: 0, started: false, completed: !!trip?.archived, startDay: start, endDay: end };
  }
  const totalDays = end - start + 1;
  const referenceDay = isoDateDayNumber(referenceDateKey);
  const bookedDays = logs
    .map(log => isoDateDayNumber(localLogDayKey(log.ts)))
    .filter(day => day !== null && day >= start && day <= end);
  const latestBookedDay = bookedDays.length ? Math.max(...bookedDays) : null;
  let effectiveDay = referenceDay;
  if (latestBookedDay !== null && (effectiveDay === null || latestBookedDay > effectiveDay)) effectiveDay = latestBookedDay;
  let elapsedDays = 0;
  if (trip?.archived) elapsedDays = totalDays;
  else if (effectiveDay !== null && effectiveDay >= start) elapsedDays = Math.min(totalDays, effectiveDay - start + 1);
  return {
    valid: true,
    totalDays,
    elapsedDays,
    remainingDays: Math.max(0, totalDays - elapsedDays),
    started: elapsedDays > 0,
    completed: !!trip?.archived || elapsedDays >= totalDays,
    startDay: start,
    endDay: end
  };
}
function packageBreakEvenInfo(personLogs, packagePrice, trip = currentTrip()) {
  if (!(Number(packagePrice) > 0)) return null;
  let cumulative = 0;
  const includedLogs = personLogs
    .filter(log => log.packageStatus === 'included')
    .slice()
    .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  for (const log of includedLogs) {
    cumulative += Math.max(0, Number(log.price) || 0);
    if (cumulative + 0.0001 >= Number(packagePrice)) {
      const dateKey = localLogDayKey(log.ts);
      const start = isoDateDayNumber(trip?.startDate);
      const day = isoDateDayNumber(dateKey);
      const dayNumber = start !== null && day !== null && day >= start ? day - start + 1 : null;
      return { dateKey, dayNumber, cumulative, label: dateKey ? reportDateLabel(dateKey, trip) : 'Datum unbekannt' };
    }
  }
  return null;
}
function packageForecastStatus(data, trip = currentTrip()) {
  if (!data.packageSelected) return { key: 'none', label: 'Kein Paket', tone: 'neutral', detail: 'Für diese Person ist kein Getränkepaket hinterlegt.' };
  if (data.person?.packageId === 'unclear') return { key: 'unclear', label: 'Paket unklar', tone: 'warning', detail: 'Die Paketzuordnung ist nicht eindeutig und wird nicht prognostiziert.' };
  if (!(data.packagePrice > 0)) return { key: 'missing', label: 'Paketpreis fehlt', tone: 'warning', detail: 'Für eine Amortisationsberechnung muss der bezahlte Paketpreis hinterlegt sein.' };
  if (data.amortized) return { key: 'amortized', label: 'Paket amortisiert', tone: 'positive', detail: data.breakEven ? `Break-even erreicht: ${data.breakEven.label}.` : 'Der eindeutig enthaltene Paketwert liegt mindestens auf Höhe des Paketpreises.' };
  if (trip?.archived || data.timeframe.completed) return { key: 'not_amortized', label: 'Nicht amortisiert', tone: 'negative', detail: `Am Reiseende fehlen ${eur(data.remainingValue)} bis zum Paketpreis.` };
  if (!data.timeframe.valid || !data.timeframe.started || data.projectedIncluded === null) return { key: 'no_forecast', label: 'Keine belastbare Prognose', tone: 'warning', detail: 'Die Reise hat noch nicht begonnen oder der Reisezeitraum ist nicht vollständig hinterlegt.' };
  if (data.projectedIncluded + 0.0001 >= data.packagePrice) {
    const predicted = data.predictedBreakEvenDay && data.predictedBreakEvenDay <= data.timeframe.totalDays
      ? ` Voraussichtlicher Break-even: Tag ${data.predictedBreakEvenDay}${data.predictedBreakEvenDate ? ` · ${formatDate(data.predictedBreakEvenDate)}` : ''}.`
      : '';
    return { key: 'likely', label: 'Voraussichtlich amortisiert', tone: 'positive', detail: `Hochrechnung bis Reiseende: ${eur(data.projectedIncluded)}.${predicted}` };
  }
  return { key: 'unlikely', label: 'Voraussichtlich nicht amortisiert', tone: 'negative', detail: `Hochrechnung bis Reiseende: ${eur(data.projectedIncluded)}; voraussichtlich fehlen ${eur(Math.max(0, data.packagePrice - data.projectedIncluded))}.` };
}
function personPackageForecast(person, logs, trip = currentTrip(), referenceDateKey = localLogDayKey(Date.now())) {
  const completion = personCompletionStats(person, logs, 'trip');
  const timeframe = packageForecastTimeframe(logs, trip, referenceDateKey);
  const progressPercent = completion.comparable && completion.packagePrice > 0 ? completion.stats.included / completion.packagePrice * 100 : null;
  const amortized = completion.comparable && completion.stats.included + 0.0001 >= completion.packagePrice;
  const remainingValue = completion.comparable ? Math.max(0, completion.packagePrice - completion.stats.included) : null;
  const averageIncludedPerElapsedDay = timeframe.elapsedDays ? completion.stats.included / timeframe.elapsedDays : 0;
  const projectedIncluded = completion.comparable && timeframe.valid && timeframe.elapsedDays
    ? (timeframe.completed ? completion.stats.included : averageIncludedPerElapsedDay * timeframe.totalDays)
    : null;
  const predictedBreakEvenDay = completion.comparable && !amortized && averageIncludedPerElapsedDay > 0
    ? Math.ceil(completion.packagePrice / averageIncludedPerElapsedDay)
    : null;
  const predictedBreakEvenDate = predictedBreakEvenDay && timeframe.startDay !== null && predictedBreakEvenDay <= timeframe.totalDays
    ? isoDayKeyFromNumber(timeframe.startDay + predictedBreakEvenDay - 1)
    : '';
  const data = {
    person,
    ...completion,
    timeframe,
    progressPercent,
    amortized,
    remainingValue,
    averageIncludedPerElapsedDay,
    projectedIncluded,
    predictedBreakEvenDay,
    predictedBreakEvenDate,
    breakEven: amortized ? packageBreakEvenInfo(completion.personLogs, completion.packagePrice, trip) : null
  };
  data.forecastStatus = packageForecastStatus(data, trip);
  return data;
}
function packageForecastSummary(persons, logs, trip = currentTrip(), referenceDateKey = localLogDayKey(Date.now())) {
  const rows = persons.map(person => personPackageForecast(person, logs, trip, referenceDateKey));
  const comparableRows = rows.filter(row => row.comparable);
  const packageRows = rows.filter(row => row.packageSelected);
  const includedTotal = comparableRows.reduce((sum, row) => sum + row.stats.included, 0);
  const packagePriceTotal = comparableRows.reduce((sum, row) => sum + row.packagePrice, 0);
  const projectedRows = comparableRows.filter(row => row.projectedIncluded !== null);
  const projectedTotal = projectedRows.length ? projectedRows.reduce((sum, row) => sum + row.projectedIncluded, 0) : null;
  return {
    rows,
    packageRows,
    comparableRows,
    includedTotal,
    packagePriceTotal,
    progressPercent: packagePriceTotal > 0 ? includedTotal / packagePriceTotal * 100 : null,
    remainingValue: Math.max(0, packagePriceTotal - includedTotal),
    projectedTotal,
    projectedComplete: projectedRows.length === comparableRows.length && comparableRows.length > 0,
    amortizedCount: comparableRows.filter(row => row.amortized).length,
    likelyCount: comparableRows.filter(row => row.forecastStatus.key === 'likely').length,
    positiveCount: comparableRows.filter(row => ['amortized', 'likely'].includes(row.forecastStatus.key)).length,
    unlikelyCount: comparableRows.filter(row => ['unlikely', 'not_amortized'].includes(row.forecastStatus.key)).length,
    openCount: packageRows.filter(row => !row.comparable || row.forecastStatus.key === 'no_forecast').length
  };
}
function packageProgressBarHtml(data, label = 'Amortisationsgrad') {
  if (data.progressPercent === null) return `<div class="packageProgressUnavailable">${esc(data.forecastStatus.detail)}</div>`;
  const fill = Math.max(0, Math.min(100, data.progressPercent));
  return `<div class="packageProgressBlock"><div class="packageProgressLabels"><span>${esc(label)}</span><b>${esc(percent(data.progressPercent))}</b></div><div class="packageProgressTrack" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill.toFixed(1)}"><i class="${esc(data.forecastStatus.tone)}" style="width:${fill.toFixed(1)}%"></i></div><div class="packageProgressValues"><span>${esc(eur(data.stats.included))} Paketwert</span><span>${esc(eur(data.packagePrice))} Paketpreis</span></div></div>`;
}
function packageForecastOverviewHtml(persons, logs) {
  const trip = currentTrip();
  const summary = packageForecastSummary(persons, logs, trip);
  if (!persons.length) return '';
  const packageRows = summary.packageRows;
  if (!packageRows.length) return `<article class="card packageForecastCard"><div class="sectionHead"><div><h2>Paket-Amortisation & Prognose</h2><p class="hint">Für keine Person ist ein Getränkepaket hinterlegt.</p></div></div></article>`;
  const totalProgress = summary.progressPercent === null ? '—' : percent(summary.progressPercent);
  const forecastText = summary.projectedComplete && summary.projectedTotal !== null ? eur(summary.projectedTotal) : 'nicht vollständig';
  const rows = packageRows.map(data => {
    const detailParts = [
      data.remainingValue !== null ? (data.amortized ? `${eur(data.stats.included - data.packagePrice)} über Paketpreis` : `noch ${eur(data.remainingValue)} bis Break-even`) : '',
      data.timeframe.elapsedDays ? `Ø ${eur(data.averageIncludedPerElapsedDay)} Paketwert je Reisetag` : '',
      data.stats.unclearCount ? `${data.stats.unclearCount} unklare Buchung${data.stats.unclearCount === 1 ? '' : 'en'} nicht berücksichtigt` : ''
    ].filter(Boolean);
    return `<button class="packageForecastPerson" data-action="showStatsPerson" data-id="${esc(data.person.id)}" style="--person:${esc(data.person.color || '#e0f2fe')}">
      <span class="packageForecastHead"><span><b>${esc(data.person.name)}</b><small>${esc(packageName(data.person.packageId))}</small></span><span class="packageForecastState ${esc(data.forecastStatus.tone)}">${esc(data.forecastStatus.label)}</span></span>
      ${packageProgressBarHtml(data)}
      <span class="packageForecastMeta">${esc(detailParts.join(' · ') || data.forecastStatus.detail)}</span>
      <span class="packageForecastDetail">${esc(data.forecastStatus.detail)}</span>
    </button>`;
  }).join('');
  return `<article class="card packageForecastCard">
    <div class="sectionHead"><div><h2>Paket-Amortisation & Prognose</h2><p class="hint">Konservativ berechnet: Nur eindeutig im Paket enthaltene Getränke zählen als Paketwert. Die Hochrechnung basiert auf allen bisher verstrichenen Reisetagen – auch Tagen ohne Buchung.</p></div><span class="subtle">${trip?.archived ? 'Endstand' : 'laufende Prognose'}</span></div>
    <div class="packageForecastSummaryGrid">
      ${completionMetric('Gesamtfortschritt', totalProgress, `${eur(summary.includedTotal)} von ${eur(summary.packagePriceTotal)}`)}
      ${completionMetric('Noch bis Break-even', summary.packagePriceTotal ? eur(summary.remainingValue) : '—', `${summary.amortizedCount} von ${summary.comparableRows.length} Paket${summary.comparableRows.length === 1 ? '' : 'en'} amortisiert`, summary.remainingValue <= 0 && summary.packagePriceTotal ? 'positive' : 'neutral')}
      ${completionMetric('Hochrechnung Reiseende', forecastText, summary.projectedComplete ? 'Summe der belastbaren Einzelprognosen' : 'Für mindestens eine Person fehlen belastbare Prognosedaten')}
      ${completionMetric('Paketstatus', `${summary.positiveCount} positiv · ${summary.unlikelyCount} negativ`, summary.openCount ? `${summary.openCount} offen oder unvollständig` : 'alle Paketdaten auswertbar')}
    </div>
    <div class="packageForecastList">${rows}</div>
  </article>`;
}
function personPackageForecastDetailHtml(person, logs) {
  const data = personPackageForecast(person, logs, currentTrip());
  const projection = data.projectedIncluded === null ? '—' : eur(data.projectedIncluded);
  const breakEven = data.breakEven
    ? data.breakEven.label
    : (data.predictedBreakEvenDay && data.predictedBreakEvenDay <= data.timeframe.totalDays ? `voraussichtlich Tag ${data.predictedBreakEvenDay}${data.predictedBreakEvenDate ? ` · ${formatDate(data.predictedBreakEvenDate)}` : ''}` : 'noch nicht absehbar');
  return `<article class="card packageForecastDetailCard">
    <div class="sectionHead"><div><h2>Paket-Amortisation</h2><p class="hint">${esc(packageName(person.packageId))}</p></div><span class="packageForecastState ${esc(data.forecastStatus.tone)}">${esc(data.forecastStatus.label)}</span></div>
    ${packageProgressBarHtml(data)}
    <div class="personAnalysisGrid packageForecastDetailGrid">
      ${miniMetric('Eindeutiger Paketwert', eur(data.stats.included), `${data.stats.includedCount} enthaltene Getränke`)}
      ${miniMetric('Noch bis Break-even', data.remainingValue === null ? '—' : eur(data.remainingValue), data.amortized ? 'Paketpreis bereits erreicht' : 'ohne unklare Buchungen')}
      ${miniMetric('Ø Paketwert pro Reisetag', data.timeframe.elapsedDays ? eur(data.averageIncludedPerElapsedDay) : '—', data.timeframe.elapsedDays ? `${data.timeframe.elapsedDays} von ${data.timeframe.totalDays} Reisetagen verstrichen` : 'Reise noch nicht begonnen')}
      ${miniMetric('Hochrechnung Reiseende', projection, data.projectedIncluded === null ? 'keine belastbare Prognose' : `${data.timeframe.totalDays} Reisetage insgesamt`)}
      ${miniMetric('Break-even', breakEven, data.breakEven ? 'tatsächlich erreicht' : 'auf Basis des bisherigen Tagesdurchschnitts')}
      ${miniMetric('Unklare Paketstatus', `${data.stats.unclearCount} · ${eur(data.stats.unclear)}`, 'nicht in Fortschritt oder Prognose enthalten')}
    </div>
    <p class="personResultExplanation">${esc(data.forecastStatus.detail)}</p>
  </article>`;
}
function resultPresentation(data) {
  if (!data.packageSelected) return { label: 'Kein Paketvergleich', value: '—', tone: 'neutral', sub: 'Kein Getränkepaket hinterlegt.' };
  if (!data.comparable) {
    const missingPrice = !data.packagePrice;
    return {
      label: missingPrice ? 'Paketpreis fehlt' : 'Paketvergleich unklar',
      value: '—',
      tone: 'warning',
      sub: missingPrice ? 'Paketpreis bei der Person ergänzen.' : 'Das ausgewählte Paket ist als unklar markiert.'
    };
  }
  if (data.packageResult > 0) return { label: 'Ersparnis', value: eur(data.packageResult), tone: 'positive', sub: `${eur(data.stats.included)} Paketwert abzüglich ${eur(data.packagePrice)} Paketpreis.` };
  if (data.packageResult < 0) return { label: 'Mehrkosten', value: eur(Math.abs(data.packageResult)), tone: 'negative', sub: `${eur(data.packagePrice)} Paketpreis abzüglich ${eur(data.stats.included)} Paketwert.` };
  return { label: 'Ausgeglichen', value: eur(0), tone: 'neutral', sub: 'Paketwert und Paketpreis sind rechnerisch gleich hoch.' };
}
function completionTotals(persons, logs) {
  const total = calcDetailed(logs);
  let packagePriceTotal = 0;
  let packageResult = 0;
  let comparablePersons = 0;
  let incompletePersons = 0;
  let packagePersons = 0;
  let missingPricePersons = 0;
  let unclearPackagePersons = 0;
  persons.forEach(person => {
    const data = personCompletionStats(person, logs, 'trip');
    if (data.packageSelected) {
      packagePersons += 1;
      packagePriceTotal += data.packagePrice;
      if (!data.packagePrice) missingPricePersons += 1;
      if (person.packageId === 'unclear') unclearPackagePersons += 1;
      if (data.comparable) {
        comparablePersons += 1;
        packageResult += data.packageResult;
      } else {
        incompletePersons += 1;
      }
    }
  });
  return { total, packagePriceTotal, packageResult, comparablePersons, incompletePersons, packagePersons, missingPricePersons, unclearPackagePersons };
}
function overallResultPresentation(summary) {
  if (!summary.packagePersons) return { label: 'Kein Paketvergleich', value: '—', tone: 'neutral', sub: 'Für keine Person ist ein Getränkepaket hinterlegt.' };
  if (!summary.comparablePersons) return { label: 'Gesamtergebnis offen', value: '—', tone: 'warning', sub: 'Für den Paketvergleich fehlen belastbare Paketdaten.' };
  const partial = summary.incompletePersons ? ` · Teilberechnung, ${summary.incompletePersons} Person${summary.incompletePersons === 1 ? '' : 'en'} nicht einbezogen` : '';
  if (summary.packageResult > 0) return { label: 'Gesamtersparnis', value: eur(summary.packageResult), tone: 'positive', sub: `${summary.comparablePersons} Paketvergleich${summary.comparablePersons === 1 ? '' : 'e'}${partial}` };
  if (summary.packageResult < 0) return { label: 'Gesamtmehrkosten', value: eur(Math.abs(summary.packageResult)), tone: 'negative', sub: `${summary.comparablePersons} Paketvergleich${summary.comparablePersons === 1 ? '' : 'e'}${partial}` };
  return { label: 'Gesamtergebnis ausgeglichen', value: eur(0), tone: 'neutral', sub: `${summary.comparablePersons} Paketvergleich${summary.comparablePersons === 1 ? '' : 'e'}${partial}` };
}
function overallCompletionSummaryHtml(persons, logs) {
  const trip = currentTrip();
  const summary = completionTotals(persons, logs);
  const result = overallResultPresentation(summary);
  const title = trip?.archived ? 'Abschlussauswertung' : 'Reiseauswertung – Zwischenstand';
  const dayInfo = tripDayInfo(logs, trip);
  return `<article class="card completionOverviewCard">
    <div class="sectionHead"><div><h2>${esc(title)}</h2><p class="hint">Finanzielle Paketbilanz konservativ: Nur eindeutig enthaltene Getränke werden dem Paketpreis gegenübergestellt. Nicht enthaltene Getränke werden als Kosten außerhalb des Pakets ausgewiesen; unklare Status bleiben separat.</p></div><span class="completionState ${trip?.archived ? 'completed' : 'ongoing'}">${trip?.archived ? 'Abgeschlossen' : 'Laufend'}</span></div>
    <div class="completionOverviewGrid">
      ${completionMetric('Getränke gesamt', String(summary.total.count), eur(summary.total.value))}
      ${completionMetric('Gesamt-Barkartenwert', eur(summary.total.value), dayInfo.label)}
      ${completionMetric('Gesamtpaketkosten', eur(summary.packagePriceTotal), `${summary.packagePersons} Person${summary.packagePersons === 1 ? '' : 'en'} mit Paket${summary.missingPricePersons ? ` · ${summary.missingPricePersons} Preis${summary.missingPricePersons === 1 ? '' : 'e'} fehlt${summary.missingPricePersons === 1 ? '' : 'en'}` : ''}${summary.unclearPackagePersons ? ` · ${summary.unclearPackagePersons} Paket${summary.unclearPackagePersons === 1 ? '' : 'e'} unklar` : ''}`)}
      ${completionMetric('Kosten außerhalb Paket', eur(summary.total.notIncluded), `${summary.total.notIncludedCount} eindeutig nicht enthalten`)}
      ${completionMetric('Unklare Paketstatus', String(summary.total.unclearCount), eur(summary.total.unclear))}
      ${completionMetric(result.label, result.value, result.sub, result.tone)}
    </div>
  </article>`;
}
function completionMetric(label, value, sub, tone = 'neutral') {
  return `<div class="completionMetric ${esc(tone)}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(sub)}</small></div>`;
}
function personSummaryMetric(label, value, sub = '') {
  return `<span class="personSummaryMetric"><span>${esc(label)}</span><b>${esc(value)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
}
function personCompletionDashboardHtml(persons, logs) {
  if (!persons.length) return `<div class="card"><h2>Abschlussauswertung je Person</h2><p class="emptyText">Keine Personen vorhanden.</p></div>`;
  const dayInfo = tripDayInfo(logs, currentTrip());
  const cards = persons.map(person => {
    const data = personCompletionStats(person, logs, 'trip');
    const result = resultPresentation(data);
    return `<button class="personCompletionCard" data-action="showStatsPerson" data-id="${esc(person.id)}" style="--person:${esc(person.color || '#e0f2fe')}">
      <span class="personCompletionHead"><span><b>${esc(person.name)}</b><small>${esc(packageName(person.packageId))}</small></span><span class="personResult ${esc(result.tone)}"><small>${esc(result.label)}</small><strong>${esc(result.value)}</strong></span></span>
      <span class="personCompletionGrid">
        ${personSummaryMetric('Getränke', String(data.stats.count), eur(data.stats.value))}
        ${personSummaryMetric('Barkartenwert', eur(data.stats.value), `Ø ${eur(data.averagePerTripDay)} je Reisetag`)}
        ${personSummaryMetric('Im Paket', `${data.stats.includedCount} · ${eur(data.stats.included)}`)}
        ${personSummaryMetric('Nicht enthalten', `${data.stats.notIncludedCount} · ${eur(data.stats.notIncluded)}`)}
        ${personSummaryMetric('Unklar', `${data.stats.unclearCount} · ${eur(data.stats.unclear)}`)}
        ${personSummaryMetric('Außerhalb-Kosten', eur(data.stats.notIncluded), 'eindeutig nicht enthalten')}
        ${personSummaryMetric('Paketpreis', data.packageSelected ? (data.packagePrice ? eur(data.packagePrice) : 'fehlt') : eur(0), data.packageSelected && !data.packagePrice ? 'nicht in Bilanz einbezogen' : '')}
        ${personSummaryMetric('Ø pro Reisetag', dayInfo.days ? eur(data.averagePerTripDay) : '—', dayInfo.label)}
      </span>
      <span class="personCompletionHint">${esc(result.sub)} · Kategorien und Buchungen ansehen</span>
    </button>`;
  }).join('');
  return `<div class="card"><div class="sectionHead"><h2>Abschlussauswertung je Person</h2><span class="subtle">antippen für Details</span></div><div class="personCompletionList">${cards}</div></div>`;
}

function isoDayKeyFromNumber(dayNumber) {
  const date = new Date(Number(dayNumber) * 86400000);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}
function reportDateLabel(key, trip = currentTrip()) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'Datum unbekannt';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const formatted = date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const start = isoDateDayNumber(trip?.startDate);
  const current = isoDateDayNumber(key);
  if (start !== null && current !== null && current >= start) return `Tag ${current - start + 1} · ${formatted}`;
  return formatted;
}
function tripReportDateKeys(logs, trip = currentTrip()) {
  const start = isoDateDayNumber(trip?.startDate);
  const end = isoDateDayNumber(trip?.endDate);
  if (start !== null && end !== null && end >= start && end - start <= 366) {
    return Array.from({ length: end - start + 1 }, (_, index) => isoDayKeyFromNumber(start + index));
  }
  const itineraryDates = tripItinerary(trip).map(day => day.date).filter(validItineraryDate);
  if (itineraryDates.length) return [...new Set(itineraryDates)].sort();
  return [...new Set(logs.map(log => localLogDayKey(log.ts)).filter(Boolean))].sort();
}
function tripDailyReport(logs, trip = currentTrip()) {
  const dateKeys = tripReportDateKeys(logs, trip);
  const map = new Map(dateKeys.map(key => [key, { key, count: 0, value: 0, includedCount: 0, included: 0, notIncludedCount: 0, notIncluded: 0, unclearCount: 0, unclear: 0 }]));
  let invalidCount = 0;
  logs.forEach(log => {
    const key = localLogDayKey(log.ts);
    if (!key) { invalidCount += 1; return; }
    if (!map.has(key)) map.set(key, { key, count: 0, value: 0, includedCount: 0, included: 0, notIncludedCount: 0, notIncluded: 0, unclearCount: 0, unclear: 0 });
    const row = map.get(key);
    const price = Number(log.price) || 0;
    row.count += 1;
    row.value += price;
    if (log.packageStatus === 'included') { row.includedCount += 1; row.included += price; }
    else if (log.packageStatus === 'not_included') { row.notIncludedCount += 1; row.notIncluded += price; }
    else { row.unclearCount += 1; row.unclear += price; }
  });
  const rows = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  const strongest = rows.filter(row => row.count > 0).sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key))[0] || null;
  const days = tripDayInfo(logs, trip).days || rows.length;
  const consumptionDays = rows.filter(row => row.count > 0).length;
  return {
    rows,
    strongest,
    days,
    consumptionDays,
    invalidCount,
    averageCount: days ? logs.length / days : 0,
    averageValue: days ? calcDetailed(logs).value / days : 0
  };
}
function drinkReportRows(logs) {
  const map = new Map();
  logs.forEach(log => {
    const key = String(log.drinkName || drinkById(log.drinkId)?.name || 'Unbekannt').trim() || 'Unbekannt';
    if (!map.has(key)) map.set(key, { key, count: 0, value: 0, maxPrice: 0, minPrice: null });
    const row = map.get(key);
    const price = Number(log.price) || 0;
    row.count += 1;
    row.value += price;
    row.maxPrice = Math.max(row.maxPrice, price);
    row.minPrice = row.minPrice === null ? price : Math.min(row.minPrice, price);
  });
  return [...map.values()];
}
function personReportRows(persons, logs) {
  const rows = persons.map(person => {
    const personLogs = logs.filter(log => log.personId === person.id);
    const stats = calcDetailed(personLogs);
    return { key: person.name || 'Unbenannt', count: stats.count, value: stats.value, includedCount: stats.includedCount, notIncludedCount: stats.notIncludedCount, unclearCount: stats.unclearCount };
  });
  const knownIds = new Set(persons.map(person => person.id));
  const unknownLogs = logs.filter(log => !knownIds.has(log.personId));
  if (unknownLogs.length) {
    const stats = calcDetailed(unknownLogs);
    rows.push({ key: 'Unbekannte Person', count: stats.count, value: stats.value, includedCount: stats.includedCount, notIncludedCount: stats.notIncludedCount, unclearCount: stats.unclearCount });
  }
  return rows.sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key, 'de'));
}
function tripReportListHtml(title, subtitle, rows, rowHtml, emptyText = 'Keine Daten vorhanden.') {
  return `<section class="tripReportPanel"><div class="tripReportPanelHead"><div><h3>${esc(title)}</h3><small>${esc(subtitle)}</small></div></div>${rows.length ? `<div class="tripReportList">${rows.map(rowHtml).join('')}</div>` : `<p class="emptyText">${esc(emptyText)}</p>`}</section>`;
}

function tripItineraryReportHtml(trip = currentTrip()) {
  const days = tripItinerary(trip);
  if (!days.length) return '<section class="tripReportSection"><div class="sectionHead"><div><h3>Reiseverlauf</h3><p class="hint">Noch keine Häfen oder Seetage importiert.</p></div></div><button class="secondary" data-route="trips">Reiseverlauf importieren</button></section>';
  const ports = days.filter(day => ['port', 'embarkation', 'disembarkation', 'overnight'].includes(day.type) && day.port).length;
  const seaDays = days.filter(day => day.type === 'sea').length;
  return `<section class="tripReportSection"><div class="sectionHead"><div><h3>Reiseverlauf</h3><p class="hint">Importierte Route als Kontext für die Tagesauswertung.</p></div><span class="subtle">${ports} Hafentage · ${seaDays} Seetage</span></div><div class="itineraryReportList">${days.map(day => `<div class="itineraryReportRow"><div><b>${esc(reportDateLabel(day.date, trip))}</b><small>${esc([itineraryTypeLabel(day.type), itineraryTimeLabel(day), day.notes].filter(Boolean).join(' · '))}</small></div><strong>${esc(itineraryLocationLabel(day))}</strong></div>`).join('')}</div></section>`;
}

function tripTravelReportHtml(persons, logs) {
  const trip = currentTrip();
  const daily = tripDailyReport(logs, trip);
  const drinks = drinkReportRows(logs);
  const frequent = drinks.slice().sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key, 'de')).slice(0, 8);
  const expensive = drinks.slice().sort((a, b) => b.maxPrice - a.maxPrice || b.count - a.count || a.key.localeCompare(b.key, 'de')).slice(0, 8);
  const personRows = personReportRows(persons, logs);
  const categories = categoryDetailedStats(logs).sort((a, b) => b.count - a.count || b.value - a.value || a.key.localeCompare(b.key, 'de'));
  const total = calcDetailed(logs);
  const strongestDay = daily.strongest ? itineraryDayForDate(daily.strongest.key, trip) : null;
  const strongestText = daily.strongest ? `${reportDateLabel(daily.strongest.key, trip)}${strongestDay ? ` · ${itineraryLocationLabel(strongestDay)}` : ''}` : 'Noch kein Konsumtag';
  const reportState = trip?.archived ? 'Abschlussbericht' : 'Zwischenbericht';
  const dayRows = daily.rows.map(row => {
    const itineraryDay = itineraryDayForDate(row.key, trip);
    const routeLabel = itineraryDay ? itineraryLocationLabel(itineraryDay) : '';
    const routeMeta = itineraryDay ? [itineraryTypeLabel(itineraryDay.type), itineraryTimeLabel(itineraryDay)].filter(Boolean).join(' · ') : '';
    return `<div class="tripDayRow ${daily.strongest?.key === row.key ? 'strongest' : ''}"><div><b>${esc(reportDateLabel(row.key, trip))}${routeLabel ? ` · ${esc(routeLabel)}` : ''}${daily.strongest?.key === row.key ? ' · stärkster Tag' : ''}</b><small>${routeMeta ? `${esc(routeMeta)} · ` : ''}${row.count} ${row.count === 1 ? 'Getränk' : 'Getränke'} · ${row.includedCount} enthalten · ${row.notIncludedCount} nicht enthalten${row.unclearCount ? ` · ${row.unclearCount} unklar` : ''}</small></div><strong>${eur(row.value)}</strong></div>`;
  }).join('');
  return `<article class="card tripReportCard">
    <div class="sectionHead"><div><h2>Tages- und Reisebericht</h2><p class="hint">Chronologische Reiseauswertung mit Tageswerten, Spitzenwerten und Vergleichen. Tage ohne Buchungen werden bei vollständig hinterlegtem Reisezeitraum mit 0 berücksichtigt.</p></div><span class="completionState ${trip?.archived ? 'completed' : 'ongoing'}">${esc(reportState)}</span></div>
    <div class="tripReportSummaryGrid">
      ${completionMetric('Reisetage', String(daily.days), `${daily.consumptionDays} Tag${daily.consumptionDays === 1 ? '' : 'e'} mit Konsum`)}
      ${completionMetric('Tagesdurchschnitt', `${daily.averageCount.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Getränke`, eur(daily.averageValue))}
      ${completionMetric('Stärkster Konsumtag', daily.strongest ? `${daily.strongest.count} Getränke` : '—', daily.strongest ? `${strongestText} · ${eur(daily.strongest.value)}` : strongestText)}
      ${completionMetric('Reisewert', eur(total.value), `${total.count} Getränke gesamt`)}
    </div>
    ${tripItineraryReportHtml(trip)}
    <section class="tripReportSection"><div class="sectionHead"><div><h3>Auswertung je Reisetag</h3><p class="hint">Sortiert nach dem lokalen Buchungsdatum.</p></div><span class="subtle">${daily.rows.length} Tage</span></div>${dayRows ? `<div class="tripDayList">${dayRows}</div>` : '<p class="emptyText">Keine Reisetage ermittelbar.</p>'}${daily.invalidCount ? `<p class="tripReportWarning">${daily.invalidCount} Buchung${daily.invalidCount === 1 ? '' : 'en'} ohne gültiges Datum konnte${daily.invalidCount === 1 ? '' : 'n'} keinem Tag zugeordnet werden.</p>` : ''}</section>
    <div class="tripReportColumns">
      ${tripReportListHtml('Häufigste Getränke', 'Nach Anzahl der Buchungen', frequent, row => `<div class="tripReportRow"><div><b>${esc(row.key)}</b><small>${row.count}× · Gesamtwert ${eur(row.value)}</small></div><strong>${row.count}×</strong></div>`)}
      ${tripReportListHtml('Teuerste Getränke', 'Höchster gespeicherter Einzelpreis', expensive, row => `<div class="tripReportRow"><div><b>${esc(row.key)}</b><small>${row.count}× konsumiert · Gesamtwert ${eur(row.value)}</small></div><strong>${eur(row.maxPrice)}</strong></div>`)}
    </div>
    <div class="tripReportColumns">
      ${tripReportListHtml('Vergleich der Personen', 'Nach Getränkeanzahl', personRows, row => `<div class="tripReportRow"><div><b>${esc(row.key)}</b><small>${row.count} Getränke · ${row.includedCount} enthalten · ${row.notIncludedCount} nicht enthalten${row.unclearCount ? ` · ${row.unclearCount} unklar` : ''}</small></div><strong>${eur(row.value)}</strong></div>`)}
      ${tripReportListHtml('Kategorienvergleich', 'Nach Getränkeanzahl', categories, row => `<div class="tripReportRow"><div><b>${esc(row.key)}</b><small>${row.count} Getränke · ${total.count ? Math.round(row.count / total.count * 100) : 0} % der Buchungen</small></div><strong>${eur(row.value)}</strong></div>`)}
    </div>
  </article>`;
}

function categoryDetailedStats(logs) {
  const map = new Map();
  logs.forEach(log => {
    const key = resolvedLogCategory(log) || 'Ohne Kategorie';
    if (!map.has(key)) map.set(key, { key, count: 0, value: 0, includedCount: 0, included: 0, notIncludedCount: 0, notIncluded: 0, unclearCount: 0, unclear: 0 });
    const row = map.get(key);
    const price = Number(log.price) || 0;
    row.count += 1;
    row.value += price;
    if (log.packageStatus === 'included') { row.includedCount += 1; row.included += price; }
    else if (log.packageStatus === 'not_included') { row.notIncludedCount += 1; row.notIncluded += price; }
    else { row.unclearCount += 1; row.unclear += price; }
  });
  return [...map.values()].sort((a, b) => b.value - a.value || b.count - a.count || a.key.localeCompare(b.key, 'de'));
}
function personCategoryBreakdownHtml(logs) {
  const rows = categoryDetailedStats(logs);
  if (!rows.length) return `<div class="card"><h2>Getränkekategorien</h2><p class="emptyText">Keine Kategorien im gewählten Zeitraum vorhanden.</p></div>`;
  return `<div class="card"><div class="sectionHead"><h2>Getränkekategorien</h2><span class="subtle">${rows.length} Kategorien</span></div><div class="categoryAnalysisList">${rows.map(row => `<div class="categoryAnalysisRow"><div><b>${esc(row.key)}</b><small>${row.count} Getränke · ${row.includedCount} enthalten · ${row.notIncludedCount} nicht enthalten${row.unclearCount ? ` · ${row.unclearCount} unklar` : ''}</small></div><strong>${eur(row.value)}</strong></div>`).join('')}</div></div>`;
}
function packageBreakEvenHtml(logs) {
  return personCompletionDashboardHtml(currentPersons(), logs);
}
function personPackageStats(person, logs) {
  return personCompletionStats(person, logs, state.statsFilter || 'trip');
}
function personPackageDashboardHtml(logs) {
  return personCompletionDashboardHtml(currentPersons(), logs);
}
function viewStatsPersonDetail(person, logs, filter = state.statsFilter || 'trip') {
  const data = personCompletionStats(person, logs, filter);
  const fullTripData = personCompletionStats(person, currentLogs(), 'trip');
  const result = resultPresentation(fullTripData);
  const drinkRows = data.personLogs
    .slice()
    .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
    .map(log => `<div class="personDrinkRow"><div><b>${statusDot(log.packageStatus)}${esc(log.drinkName || 'Unbekannt')}</b><small>${esc(formatDateTime(log.ts))}${resolvedLogCategory(log) ? ` · ${esc(resolvedLogCategory(log))}` : ''} · ${esc(statusLabel(log.packageStatus))}</small><span class="personDrinkOrigin">${logOriginHtml(log, true)}</span></div><strong>${esc(eur(log.price))}</strong></div>`)
    .join('');
  return `
    <section class="screen statsScreen">
      <div class="sectionHead"><div><h1>${esc(person.name)}</h1><span class="subtle">Abschlussauswertung & Verlauf</span></div><button class="mini" data-action="backStatsDashboard">Zurück</button></div>
      ${activeTripContextHtml()}
      ${tripStatusNoticeHtml('stats')}
      ${statsFilterHtml()}
      <article class="card personDetailCard" style="--person:${esc(person.color || '#e0f2fe')}">
        <div class="personAnalysisHead"><div><b>${esc(result.label)} · gesamte Reise</b><small>${esc(packageName(person.packageId))} · ${data.stats.count} Getränke im gewählten Zeitraum</small></div><strong class="personDetailResult ${esc(result.tone)}">${esc(result.value)}</strong></div>
        <p class="personResultExplanation">${esc(result.sub)}</p>
        <div class="personAnalysisGrid">
          ${miniMetric('Anzahl Getränke', String(data.stats.count), `Barkartenwert ${eur(data.stats.value)}`)}
          ${miniMetric('Barkartenwert gesamt', eur(data.stats.value), `Ø ${eur(data.averagePerTripDay)} je Reisetag`)}
          ${miniMetric('Im Paket enthalten', `${data.stats.includedCount} · ${eur(data.stats.included)}`, 'eindeutig enthalten')}
          ${miniMetric('Nicht enthalten', `${data.stats.notIncludedCount} · ${eur(data.stats.notIncluded)}`, 'Kosten außerhalb des Pakets')}
          ${miniMetric('Unklare Paketstatus', `${data.stats.unclearCount} · ${eur(data.stats.unclear)}`, 'nicht in die Paketbilanz einbezogen')}
          ${miniMetric('Kosten außerhalb Paket', eur(data.stats.notIncluded), `${data.stats.notIncludedCount} Getränke`)}
          ${miniMetric('Bezahlter Paketpreis', data.packageSelected ? (data.packagePrice ? eur(data.packagePrice) : 'fehlt') : eur(0), data.packageSelected ? (data.packagePrice ? 'bei Person hinterlegt' : 'Paketpreis fehlt') : 'kein Paket')}
          ${miniMetric(`${result.label} · Reise`, result.value, result.sub)}
          ${miniMetric('Ø Getränkewert pro Reisetag', data.dayInfo.days ? eur(data.averagePerTripDay) : '—', data.dayInfo.label)}
        </div>
      </article>
      ${personPackageForecastDetailHtml(person, currentLogs())}
      ${personCategoryBreakdownHtml(data.personLogs)}
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


function normalizeItineraryType(value, row = {}) {
  const key = normalize(value || row.dayType || row.type || row.kind || row.tag || '');
  if (['embarkation', 'einschiffung', 'abfahrt', 'start'].includes(key)) return 'embarkation';
  if (['disembarkation', 'ausschiffung', 'ankunft', 'ende', 'end'].includes(key)) return 'disembarkation';
  if (['sea', 'sea day', 'seetag', 'auf see'].includes(key)) return 'sea';
  if (['overnight', 'overnight port', 'uber nacht', 'ueber nacht', 'ubernacht', 'uebernacht'].includes(key) || row.overnight === true) return 'overnight';
  if (['port', 'hafen', 'hafentag', 'landgang'].includes(key)) return 'port';
  return 'unknown';
}
function validItineraryDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}
function normalizeItineraryDay(raw, index) {
  const row = isPlainRecord(raw) ? raw : {};
  const date = String(row.date || row.datum || row.Date || '').trim();
  const type = normalizeItineraryType(row.type || row.dayType || row.typ, row);
  const port = String(row.port || row.portName || row.location || row.ort || row.hafen || '').trim();
  const country = String(row.country || row.land || '').trim();
  const arrival = String(row.arrival || row.ankunft || '').trim();
  const departure = String(row.departure || row.abfahrt || '').trim();
  const notes = String(row.notes || row.note || row.hinweis || row.bemerkung || '').trim();
  return {
    date,
    dayNumber: Number.isFinite(Number(row.dayNumber || row.day || row.tag)) ? Number(row.dayNumber || row.day || row.tag) : index + 1,
    type,
    port,
    country,
    arrival,
    departure,
    overnight: type === 'overnight' || row.overnight === true,
    notes
  };
}
function itineraryImportValidation(payload, trip = null, fileName = 'Reiseverlauf') {
  const errors = [];
  const warnings = [];
  if (!isPlainRecord(payload)) errors.push('Die Datei enthält kein gültiges JSON-Objekt.');
  if (payload?.type !== ITINERARY_IMPORT_TYPE) errors.push(`Die Datei ist nicht als ${ITINERARY_IMPORT_TYPE} gekennzeichnet.`);
  if (Number(payload?.formatVersion) !== ITINERARY_IMPORT_FORMAT_VERSION) errors.push(`Formatversion ${payload?.formatVersion ?? 'unbekannt'} wird nicht unterstützt.`);
  if (!Array.isArray(payload?.days) || !payload.days.length) errors.push('Die Datei enthält keine Reisetage.');
  const days = (payload?.days || []).map(normalizeItineraryDay);
  const seen = new Set();
  days.forEach((day, index) => {
    if (!validItineraryDate(day.date)) errors.push(`Reisetag ${index + 1} besitzt kein gültiges Datum im Format JJJJ-MM-TT.`);
    else if (seen.has(day.date)) errors.push(`Das Datum ${day.date} ist mehrfach enthalten.`);
    else seen.add(day.date);
    if (day.type !== 'sea' && !day.port && !day.notes) warnings.push(`${day.date || `Reisetag ${index + 1}`}: Kein Hafen oder Hinweis hinterlegt.`);
    if (day.arrival && !/^\d{2}:\d{2}$/.test(day.arrival)) warnings.push(`${day.date}: Ankunftszeit „${day.arrival}“ entspricht nicht HH:MM.`);
    if (day.departure && !/^\d{2}:\d{2}$/.test(day.departure)) warnings.push(`${day.date}: Abfahrtszeit „${day.departure}“ entspricht nicht HH:MM.`);
  });
  days.sort((a, b) => a.date.localeCompare(b.date));
  days.forEach((day, index) => { day.dayNumber = index + 1; });

  const tripMeta = isPlainRecord(payload?.trip) ? payload.trip : {};
  const importedName = String(tripMeta.name || '').trim();
  const importedShip = String(tripMeta.ship || '').trim();
  const metaStart = String(tripMeta.startDate || '').trim();
  const metaEnd = String(tripMeta.endDate || '').trim();
  const routeStart = days[0]?.date || '';
  const routeEnd = days[days.length - 1]?.date || '';
  if (!importedName) errors.push('Im Bereich „trip“ fehlt der Reisename.');
  if (metaStart && !validItineraryDate(metaStart)) errors.push('Das Startdatum der Reise ist ungültig.');
  if (metaEnd && !validItineraryDate(metaEnd)) errors.push('Das Enddatum der Reise ist ungültig.');
  if (metaStart && metaEnd && metaStart > metaEnd) errors.push('Das Startdatum liegt nach dem Enddatum.');
  if (metaStart && routeStart && metaStart !== routeStart) warnings.push(`Das Dateifeld startDate nennt ${formatDate(metaStart)}. CruiseSip verwendet den ersten Routentag ${formatDate(routeStart)}.`);
  if (metaEnd && routeEnd && metaEnd !== routeEnd) warnings.push(`Das Dateifeld endDate nennt ${formatDate(metaEnd)}. CruiseSip verwendet den letzten Routentag ${formatDate(routeEnd)}.`);

  if (trip?.startDate && routeStart && routeStart !== trip.startDate) warnings.push(`Der Verlauf beginnt am ${formatDate(routeStart)}, die Reise ist ab ${formatDate(trip.startDate)} hinterlegt.`);
  if (trip?.endDate && routeEnd && routeEnd !== trip.endDate) warnings.push(`Der Verlauf endet am ${formatDate(routeEnd)}, die Reise ist bis ${formatDate(trip.endDate)} hinterlegt.`);
  if (tripMeta.name && trip?.name && normalize(tripMeta.name) !== normalize(trip.name)) warnings.push(`Datei-Reise „${tripMeta.name}“ weicht von „${trip.name}“ ab.`);
  if (tripMeta.ship && trip?.ship && normalize(tripMeta.ship) !== normalize(trip.ship)) warnings.push(`Datei-Schiff „${tripMeta.ship}“ weicht von „${trip.ship}“ ab.`);

  const summary = {
    days: days.length,
    ports: days.filter(day => ['port', 'embarkation', 'disembarkation', 'overnight'].includes(day.type) && day.port).length,
    seaDays: days.filter(day => day.type === 'sea').length,
    startDate: routeStart,
    endDate: routeEnd
  };
  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
    days,
    summary,
    fileName,
    source: String(payload?.source || payload?.meta?.source || '').trim(),
    trip: { name: importedName, ship: importedShip, startDate: routeStart || metaStart, endDate: routeEnd || metaEnd }
  };
}
async function prepareItineraryImport(text, fileName) {
  let payload;
  try { payload = JSON.parse(text); }
  catch (_) { throw new Error('Die Datei enthält kein gültiges JSON.'); }
  const validation = itineraryImportValidation(payload, null, fileName);
  if (validation.errors.length) throw new Error(validation.errors[0]);
  state.editingTripId = null;
  clearDraft('trip');
  state.pendingItineraryImport = { payload, validation, preparedAt: nowIso() };
  state.tripSetupWizard = { step: 'importPreview', tripId: null, exported: false };
  state.route = 'trips';
  render();
  requestAnimationFrame(() => $('#itineraryImportPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  toast('Reisedatei geprüft – neue Reise noch nicht angelegt');
}
function itineraryDayRowHtml(day, options = {}) {
  const location = itineraryLocationLabel(day);
  const time = itineraryTimeLabel(day);
  const details = [itineraryTypeLabel(day.type), time, day.notes].filter(Boolean).join(' · ');
  const actions = options.editable
    ? `<div class="itineraryRowActions"><button type="button" class="mini" data-action="editItineraryDay" data-id="${esc(day.date)}">Bearbeiten</button><button type="button" class="mini dangerText" data-action="deleteItineraryDay" data-id="${esc(day.date)}">Löschen</button></div>`
    : '';
  return `<div class="itineraryDayRow ${options.editable ? 'editable' : ''}"><div class="itineraryDate"><b>${esc(formatDate(day.date))}</b><small>Tag ${esc(day.dayNumber || '')}</small></div><div class="itineraryLocation"><b>${esc(location || itineraryTypeLabel(day.type))}</b><small>${esc(details)}</small></div>${actions}</div>`;
}
function itineraryTypeOptionsHtml(selected = 'port') {
  const options = [
    ['embarkation', 'Einschiffung'],
    ['port', 'Hafentag'],
    ['sea', 'Seetag'],
    ['overnight', 'Übernacht im Hafen'],
    ['disembarkation', 'Ausschiffung'],
    ['unknown', 'Reisetag / unklar']
  ];
  return options.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}
function renumberItineraryDays(days = []) {
  return days
    .map((day, index) => normalizeItineraryDay(day, index))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((day, index) => ({ ...day, dayNumber: index + 1, overnight: day.type === 'overnight' }));
}
function itineraryDayEditorHtml(trip, days) {
  const editKey = state.editingItineraryDayDate;
  if (editKey === null || editKey === undefined || trip?.archived) return '';
  const existing = editKey === '__new__' ? null : days.find(day => day.date === editKey) || null;
  const fallbackDate = (() => {
    if (existing?.date) return existing.date;
    const lastDate = days[days.length - 1]?.date || trip?.startDate || '';
    if (!validItineraryDate(lastDate)) return '';
    const [year, month, day] = lastDate.split('-').map(Number);
    const next = new Date(year, month - 1, day + (days.length ? 1 : 0));
    return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
  })();
  const selectedType = existing?.type || (days.length ? 'port' : 'embarkation');
  return `<form id="itineraryDayForm" class="itineraryDayEditor" autocomplete="off">
    <input type="hidden" name="originalDate" value="${esc(existing?.date || '')}">
    <div class="sectionHead"><div><p class="eyebrow">Reiseverlauf</p><h3>${existing ? 'Reisetag bearbeiten' : 'Reisetag hinzufügen'}</h3><p class="hint">Die Reihenfolge und Tagesnummer werden nach dem Datum automatisch aktualisiert.</p></div><button type="button" class="mini" data-action="cancelItineraryDayEdit">Schließen</button></div>
    <div class="twoCols"><div class="formField"><label for="itineraryDateInput">Datum</label><input id="itineraryDateInput" name="date" type="date" required value="${esc(fallbackDate)}"></div><div class="formField"><label for="itineraryTypeInput">Tagesart</label><select id="itineraryTypeInput" name="type">${itineraryTypeOptionsHtml(selectedType)}</select></div></div>
    <div class="twoCols"><div class="formField"><label for="itineraryPortInput">Hafen / Station</label><input id="itineraryPortInput" name="port" placeholder="z. B. Bergen" value="${esc(existing?.port || '')}"></div><div class="formField"><label for="itineraryCountryInput">Land</label><input id="itineraryCountryInput" name="country" placeholder="z. B. Norwegen" value="${esc(existing?.country || '')}"></div></div>
    <div class="twoCols"><div class="formField"><label for="itineraryArrivalInput">Ankunft</label><input id="itineraryArrivalInput" name="arrival" inputmode="numeric" placeholder="08:00" value="${esc(existing?.arrival || '')}"></div><div class="formField"><label for="itineraryDepartureInput">Abfahrt</label><input id="itineraryDepartureInput" name="departure" inputmode="numeric" placeholder="17:00" value="${esc(existing?.departure || '')}"></div></div>
    <div class="formField"><label for="itineraryNotesInput">Hinweise</label><textarea id="itineraryNotesInput" name="notes" rows="2" placeholder="z. B. Tenderhafen oder Übernacht-Aufenthalt">${esc(existing?.notes || '')}</textarea></div>
    <p class="itineraryEditHint">Buchungszeitpunkte, Getränkepreise und Paketstatus bleiben unverändert. Auswertungen verwenden anschließend den korrigierten Reiseverlauf.</p>
    <div class="itineraryEditorActions"><button class="primary" type="submit">${existing ? 'Änderungen speichern' : 'Reisetag speichern'}</button><button class="secondary" type="button" data-action="cancelItineraryDayEdit">Abbrechen</button></div>
  </form>`;
}
function openItineraryDayEditor(date = null) {
  const trip = currentTrip();
  if (!trip) return;
  if (trip.archived) { alert('Abgeschlossene Reisen sind schreibgeschützt. Bitte die Reise zuerst reaktivieren.'); return; }
  if (date && !tripItinerary(trip).some(day => day.date === date)) { alert('Der Reisetag wurde nicht gefunden.'); return; }
  state.editingItineraryDayDate = date || '__new__';
  state.expandedItineraryTripId = trip.id;
  render();
  requestAnimationFrame(() => $('#itineraryDayForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
function normalizedItineraryTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const compact = text.replace(/[.]/g, ':').replace(/\s*(uhr)?\s*$/i, '');
  const match = /^(\d{1,2}):(\d{2})$/.exec(compact);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}
async function saveItineraryDayForm(form) {
  const trip = currentTrip();
  if (!trip) throw new Error('Keine Reise ausgewählt.');
  if (trip.archived) throw new Error('Die abgeschlossene Reise muss vor Änderungen reaktiviert werden.');
  const data = Object.fromEntries(new FormData(form).entries());
  const originalDate = String(data.originalDate || '').trim();
  const date = String(data.date || '').trim();
  if (!validItineraryDate(date)) { alert('Bitte ein gültiges Datum auswählen.'); $('#itineraryDateInput')?.focus(); return; }
  if (trip.startDate && date < trip.startDate) { alert(`Der Reisetag liegt vor dem Reisebeginn am ${formatDate(trip.startDate)}.`); $('#itineraryDateInput')?.focus(); return; }
  if (trip.endDate && date > trip.endDate) { alert(`Der Reisetag liegt nach dem Reiseende am ${formatDate(trip.endDate)}.`); $('#itineraryDateInput')?.focus(); return; }
  const days = tripItinerary(trip).map(day => ({ ...day }));
  if (days.some(day => day.date === date && day.date !== originalDate)) { alert(`Für den ${formatDate(date)} ist bereits ein Reisetag vorhanden.`); $('#itineraryDateInput')?.focus(); return; }
  const arrival = normalizedItineraryTime(data.arrival);
  const departure = normalizedItineraryTime(data.departure);
  if (arrival === null) { alert('Die Ankunftszeit muss im Format HH:MM eingegeben werden.'); $('#itineraryArrivalInput')?.focus(); return; }
  if (departure === null) { alert('Die Abfahrtszeit muss im Format HH:MM eingegeben werden.'); $('#itineraryDepartureInput')?.focus(); return; }
  const type = normalizeItineraryType(data.type || 'unknown');
  const nextDay = normalizeItineraryDay({
    date,
    type,
    port: type === 'sea' ? '' : String(data.port || '').trim(),
    country: type === 'sea' ? '' : String(data.country || '').trim(),
    arrival,
    departure,
    overnight: type === 'overnight',
    notes: String(data.notes || '').trim()
  }, 0);
  const index = originalDate ? days.findIndex(day => day.date === originalDate) : -1;
  if (originalDate && index < 0) throw new Error('Der zu bearbeitende Reisetag ist nicht mehr vorhanden.');
  if (index >= 0) days[index] = nextDay;
  else days.push(nextDay);
  const normalizedDays = renumberItineraryDays(days);
  const restorePoint = await createInternalRestorePoint(originalDate ? 'Vor dem Bearbeiten eines Reisetags' : 'Vor dem Ergänzen eines Reisetags', {
    tripId: trip.id,
    tripName: trip.name || '',
    originalDate,
    date,
    itineraryDays: normalizedDays.length
  });
  const timestamp = nowIso();
  await put('trips', {
    ...trip,
    itinerary: normalizedDays,
    itineraryEditedAt: timestamp,
    itineraryEditCount: Number(trip.itineraryEditCount || 0) + 1,
    itineraryLastRestorePointId: restorePoint?.id || '',
    updatedAt: timestamp
  });
  await put('imports', { id: `import_${uid()}`, kind: originalDate ? 'Reiseverlauf / Reisetag bearbeitet' : 'Reiseverlauf / Reisetag ergänzt', fileName: trip.itinerarySource || 'Lokale Bearbeitung', importedAt: timestamp, added: originalDate ? 0 : 1, duplicates: 0 });
  state.editingItineraryDayDate = null;
  await loadState();
  render();
  toast(originalDate ? 'Reisetag aktualisiert' : 'Reisetag ergänzt');
  haptic();
}
async function deleteItineraryDay(date) {
  const trip = currentTrip();
  if (!trip) return;
  if (trip.archived) { alert('Abgeschlossene Reisen sind schreibgeschützt. Bitte die Reise zuerst reaktivieren.'); return; }
  const days = tripItinerary(trip);
  const day = days.find(row => row.date === date);
  if (!day) { alert('Der Reisetag wurde nicht gefunden.'); return; }
  const label = `${formatDate(day.date)} · ${itineraryLocationLabel(day)}`;
  if (!confirm(`Den Reisetag „${label}“ löschen? Getränkebuchungen bleiben unverändert.`)) return;
  const restorePoint = await createInternalRestorePoint('Vor dem Löschen eines Reisetags', { tripId: trip.id, tripName: trip.name || '', date: day.date, location: itineraryLocationLabel(day), itineraryDays: days.length });
  const timestamp = nowIso();
  const normalizedDays = renumberItineraryDays(days.filter(row => row.date !== date));
  await put('trips', {
    ...trip,
    itinerary: normalizedDays,
    itineraryEditedAt: timestamp,
    itineraryEditCount: Number(trip.itineraryEditCount || 0) + 1,
    itineraryLastRestorePointId: restorePoint?.id || '',
    updatedAt: timestamp
  });
  await put('imports', { id: `import_${uid()}`, kind: 'Reiseverlauf / Reisetag gelöscht', fileName: trip.itinerarySource || 'Lokale Bearbeitung', importedAt: timestamp, added: 0, duplicates: 0 });
  state.editingItineraryDayDate = null;
  await loadState();
  render();
  toast('Reisetag gelöscht');
}
function tripWizardProgressHtml(activeStep = 1) {
  return `<div class="tripWizardProgress" aria-label="Einrichtungsfortschritt"><span class="${activeStep >= 1 ? 'active' : ''}"><b>1</b> Reise</span><span class="${activeStep >= 2 ? 'active' : ''}"><b>2</b> Personen</span><span class="${activeStep >= 3 ? 'active' : ''}"><b>3</b> Export</span></div>`;
}
function itineraryImportPreviewHtml() {
  const pending = state.pendingItineraryImport;
  if (!pending) return '';
  const { validation } = pending;
  return `<div class="itineraryImportPreview" id="itineraryImportPreview">
    ${tripWizardProgressHtml(1)}
    <div class="backupPreviewHead"><div><b>Importvorschau – neue Reise</b><small>${esc(validation.fileName)} · Noch keine Daten verändert</small></div><span class="diagnosticSummary ${validation.warnings.length ? 'warn' : 'ok'}">${validation.warnings.length ? 'Hinweise prüfen' : 'Bereit'}</span></div>
    <div class="formField"><label for="importTripNameInput">Reisename</label><input id="importTripNameInput" value="${esc(validation.trip.name)}" placeholder="Reisename"></div>
    <div class="formField"><label for="importTripShipInput">Schiff</label><input id="importTripShipInput" value="${esc(validation.trip.ship)}" placeholder="Schiffsname"></div>
    <div class="formField tripReferenceField"><label for="importTripVersionInput">Barkarten- und Paketversion</label><select id="importTripVersionInput" required>${referenceVersionOptionsHtml(defaultBarkarteVersionId())}</select><small>Die ausgewählte Version wird ausschließlich dieser neuen Reise zugeordnet.</small></div>
    <div class="tripImportSummary"><span><b>${validation.summary.days}</b> Reisetage</span><span><b>${validation.summary.ports}</b> Hafentage</span><span><b>${validation.summary.seaDays}</b> Seetage</span><span><b>${esc(formatDate(validation.summary.startDate))}</b> bis ${esc(formatDate(validation.summary.endDate))}</span></div>
    ${validation.warnings.length ? `<div class="backupMessages warn">${validation.warnings.map(message => `<p>${esc(message)}</p>`).join('')}</div>` : ''}
    <details class="itineraryDetails" open><summary>Geprüften Verlauf anzeigen</summary><div class="itineraryPreviewList">${validation.days.map(itineraryDayRowHtml).join('')}</div></details>
    <div class="backupModeCard"><b>Neue Reise aus dieser Datei anlegen</b><p>CruiseSip erzeugt eine neue Reise mit eigener stabiler ID. Bereits vorhandene Reisen, Personen und Buchungen bleiben unverändert.</p><button class="primary" data-action="applyItineraryImport">Neue Reise anlegen</button></div>
    <button class="secondary" data-action="cancelItineraryImport">Zurück zur Auswahl</button>
  </div>`;
}
function itineraryManagementHtml(trip = currentTrip()) {
  if (!trip) return '';
  const days = renumberItineraryDays(tripItinerary(trip));
  const ports = days.filter(day => ['port', 'embarkation', 'disembarkation', 'overnight'].includes(day.type) && day.port).length;
  const seaDays = days.filter(day => day.type === 'sea').length;
  const locked = !!trip.archived;
  const sourceMeta = [trip.itinerarySource, trip.itineraryEditedAt ? `zuletzt bearbeitet ${formatDateTime(trip.itineraryEditedAt)}` : ''].filter(Boolean).join(' · ');
  return `<div class="card itineraryCard"><div class="sectionHead"><div><h2>Reiseverlauf</h2><p class="hint">Häfen, Seetage, Länder und Liegezeiten können für diese Reise lokal angepasst werden. Tagesnummern folgen automatisch dem Datum.</p>${sourceMeta ? `<p class="itinerarySourceMeta">${esc(sourceMeta)}</p>` : ''}</div><span class="backupFormatBadge">${locked ? 'Archiviert' : 'Bearbeitbar'}</span></div>
    ${locked ? '<div class="backupMessages warn"><p>Die abgeschlossene Reise ist schreibgeschützt. Zum Ändern des Reiseverlaufs muss sie zuerst reaktiviert werden.</p></div>' : ''}
    <div class="itinerarySummary"><span><b>${days.length}</b> Reisetage</span><span><b>${ports}</b> Hafentage</span><span><b>${seaDays}</b> Seetage</span></div>
    ${itineraryDayEditorHtml(trip, days)}
    ${days.length ? (() => {
      const expanded = state.expandedItineraryTripId === trip.id || state.editingItineraryDayDate !== null;
      return `<div class="itineraryDetails itineraryDisclosure">
        <input type="checkbox" id="itinerarySavedDisclosure" class="itineraryDisclosureInput" ${expanded ? 'checked' : ''}>
        <label id="itinerarySavedToggle" class="itineraryToggle" for="itinerarySavedDisclosure" role="button" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="itinerarySavedContent">
          <span><b class="itineraryToggleLabel itineraryToggleLabelOpen">Gespeicherten Verlauf anzeigen</b><b class="itineraryToggleLabel itineraryToggleLabelClose">Gespeicherten Verlauf ausblenden</b><small>${days.length} Reisetage · mit Bearbeiten- und Löschen-Funktion</small></span>
          <svg class="itineraryToggleChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
        </label>
        <div id="itinerarySavedContent" class="itineraryExpandable" aria-hidden="${expanded ? 'false' : 'true'}"><div class="itineraryPreviewList">${days.map(day => itineraryDayRowHtml(day, { editable: !locked })).join('')}</div></div>
      </div>`;
    })() : '<p class="emptyText">Für diese Reise ist noch kein Reiseverlauf hinterlegt. Du kannst den ersten Reisetag manuell ergänzen.</p>'}
    ${locked ? '' : `<div class="buttonStack itineraryManagementActions"><button type="button" class="primary" data-action="addItineraryDay">Reisetag hinzufügen</button>${days.length ? '<button type="button" class="secondary dangerText" data-action="clearItinerary">Gesamten Verlauf entfernen</button>' : ''}</div>`}
  </div>`;
}
async function applyPreparedItineraryImport() {
  const pending = state.pendingItineraryImport;
  if (!pending) throw new Error('Keine geprüfte Reiseverlaufsdatei vorhanden.');
  const validation = itineraryImportValidation(pending.payload, null, pending.validation.fileName);
  if (validation.errors.length) throw new Error(validation.errors[0]);
  const name = String($('#importTripNameInput')?.value || validation.trip.name || '').trim();
  const ship = String($('#importTripShipInput')?.value || validation.trip.ship || '').trim();
  if (!name) { alert('Bitte gib einen Reisenamen ein.'); $('#importTripNameInput')?.focus(); return; }
  const selectedVersionId = String($('#importTripVersionInput')?.value || defaultBarkarteVersionId());
  if (!referenceVersionAvailable(referenceVersionById(selectedVersionId))) throw new Error('Bitte eine verfügbare Barkarten- und Paketversion auswählen.');
  const id = `trip_${uid()}`;
  const timestamp = nowIso();
  const trip = {
    id,
    name,
    ship,
    startDate: validation.summary.startDate,
    endDate: validation.summary.endDate,
    barkarteVersionId: selectedVersionId,
    packageVersionId: selectedVersionId,
    archived: false,
    itinerary: validation.days,
    itineraryImportedAt: timestamp,
    itinerarySource: validation.source || pending.validation.fileName,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await put('trips', trip);
  await put('imports', { id: `import_${uid()}`, kind: 'Neue Reise / Reiseverlauf', fileName: pending.validation.fileName, importedAt: timestamp, added: validation.days.length, duplicates: 0 });
  await putSetting('currentTripId', id);
  state.pendingItineraryImport = null;
  state.tripSetupWizard = { step: 'persons', tripId: id, exported: false };
  state.currentTripId = id;
  state.selectedPersonId = null;
  state.route = 'devices';
  await loadState();
  state.currentTripId = id;
  render();
  toast(`Neue Reise „${name}“ angelegt – jetzt Personen einrichten`);
  haptic();
}
async function clearCurrentItinerary() {
  const trip = currentTrip();
  const count = tripItinerary(trip).length;
  if (!trip || !count) return;
  if (trip.archived) { alert('Abgeschlossene Reisen sind schreibgeschützt. Bitte die Reise zuerst reaktivieren.'); return; }
  if (!confirm(`Den gespeicherten Reiseverlauf mit ${count} Reisetagen entfernen? Getränkebuchungen bleiben unverändert.`)) return;
  await createInternalRestorePoint('Vor dem Entfernen eines Reiseverlaufs', { tripId: trip.id, tripName: trip.name || '', itineraryDays: count });
  const timestamp = nowIso();
  const next = { ...trip, itinerary: [], itineraryImportedAt: '', itinerarySource: '', itineraryEditedAt: timestamp, itineraryEditCount: Number(trip.itineraryEditCount || 0) + 1, updatedAt: timestamp };
  await put('trips', next);
  state.pendingItineraryImport = null;
  state.editingItineraryDayDate = null;
  state.expandedItineraryTripId = null;
  await loadState();
  render();
  toast('Reiseverlauf entfernt');
}
function tripSetupWizardHtml() {
  const wizard = state.tripSetupWizard || {};
  if (!wizard.step) {
    return `<div class="card tripSetupLaunch"><div><p class="eyebrow">Vor der Reise</p><h2>Neue Reise einrichten</h2><p class="hint">Der Assistent legt zuerst die Reise an, führt anschließend zu den Personen und bietet zum Abschluss den Reiseexport für ein zweites Gerät an.</p></div><button class="primary" data-action="startTripWizard">Neue Reise anlegen</button></div>`;
  }
  if (wizard.step === 'choice' || wizard.step === 'import') {
    return `<div class="card tripSetupWizard" id="tripSetupWizard">${tripWizardProgressHtml(1)}<div><p class="eyebrow">Schritt 1 von 3</p><h2>Wie möchtest du die Reise anlegen?</h2><p class="hint">Eine Reiseverlaufsdatei enthält bereits Reisename, Zeitraum, Häfen und Seetage. Alternativ kannst du die Reise ohne Route manuell erfassen.</p></div><div class="tripSetupChoices"><button class="primary" data-action="chooseTripImport"><span>📄</span><b>Reiseverlauf importieren</b><small>Neue Reise aus JSON-Datei anlegen</small></button><button class="secondary" data-action="chooseTripManual"><span>✍️</span><b>Manuell anlegen</b><small>Name, Schiff und Zeitraum eingeben</small></button></div><button class="secondary" data-action="cancelTripWizard">Assistent abbrechen</button></div>`;
  }
  if (wizard.step === 'importPreview') return `<div class="card tripSetupWizard" id="tripSetupWizard">${itineraryImportPreviewHtml()}</div>`;
  return '';
}
function referenceVersionOptionsHtml(selectedId = '') {
  const rows = state.barkarten.filter(referenceVersionAvailable);
  const options = rows.map(record => `<option value="${esc(record.id)}" ${record.id === selectedId ? 'selected' : ''}>${esc(record.version || record.id)} · ${Number(record.drinks?.length || record.count || 0)} Getränke</option>`);
  if (selectedId && !rows.some(record => record.id === selectedId)) options.unshift(`<option value="${esc(selectedId)}" selected>Nicht verfügbare bisherige Version</option>`);
  return options.join('');
}
function tripVersionFieldHtml(edit = null, draftSection = 'trip') {
  const selectedId = draftValue(draftSection, 'barkarteVersionId', edit?.barkarteVersionId || defaultBarkarteVersionId());
  const selected = referenceVersionById(selectedId);
  return `<div class="formField tripReferenceField"><label for="${draftSection === 'onboardingTrip' ? 'onboardingTripVersion' : 'tripVersionInput'}">Barkarten- und Paketversion</label><select id="${draftSection === 'onboardingTrip' ? 'onboardingTripVersion' : 'tripVersionInput'}" name="barkarteVersionId" required>${referenceVersionOptionsHtml(selectedId)}</select><small>${selected ? `${esc(selected.source || 'Ohne Quellenangabe')} · ${Number(selected.packages?.length || selected.packageCount || 0)} Paketdefinitionen` : 'Bitte zuerst unter Setup → Barkarte eine Version importieren.'}</small></div>`;
}
function tripVersionModeHtml(edit = null) {
  if (!edit) return '';
  const logCount = state.logs.filter(log => (log.tripId || activeTripId()) === edit.id).length;
  if (!logCount) return `<div class="tripVersionNoLogs"><b>Noch keine Erfassungen</b><span>Die Barkartenversion kann ohne weitere Prüfung gewechselt werden.</span></div>`;
  const selectedMode = draftValue('trip', 'versionChangeMode', 'future');
  return `<fieldset class="tripVersionMode"><legend>Falls die Barkartenversion geändert wird</legend><label class="tripVersionModeOption"><input type="radio" name="versionChangeMode" value="future" ${selectedMode !== 'review' ? 'checked' : ''}><span><b>Nur für neue Erfassungen verwenden</b><small>${logCount} bestehende Buchung${logCount === 1 ? '' : 'en'} behalten Preis und Paketstatus.</small></span></label><label class="tripVersionModeOption"><input type="radio" name="versionChangeMode" value="review" ${selectedMode === 'review' ? 'checked' : ''}><span><b>Bestehende Buchungen prüfen</b><small>Vor dem Wechsel erscheint eine Vorschau. Unklare Zuordnungen werden nicht verändert.</small></span></label></fieldset>`;
}
function tripFormHtml(edit = null) {
  const manualWizard = !edit && state.tripSetupWizard?.step === 'manual';
  if (!edit && !manualWizard) return '';
  return `<form id="tripForm" class="card formCard tripSetupWizard" autocomplete="off">
    ${manualWizard ? tripWizardProgressHtml(1) : ''}
    <input id="tripIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
    <p class="eyebrow">${edit ? 'Reiseverwaltung' : 'Schritt 1 von 3'}</p>
    <h2>${edit ? 'Reise bearbeiten' : 'Reise manuell anlegen'}</h2>
    <div class="formField"><label for="tripNameInput">Name</label><input id="tripNameInput" name="name" placeholder="z. B. AIDA Metropolen 2026" value="${esc(draftValue('trip', 'name', edit?.name || ''))}"></div>
    <div class="formField"><label for="tripShipInput">Schiff</label><input id="tripShipInput" name="ship" placeholder="z. B. AIDAprima" value="${esc(draftValue('trip', 'ship', edit?.ship || ''))}"></div>
    <div class="twoCols"><div class="formField"><label for="tripStartInput">Start</label><input id="tripStartInput" name="startDate" type="date" value="${esc(draftValue('trip', 'startDate', edit?.startDate || ''))}"></div><div class="formField"><label for="tripEndInput">Ende</label><input id="tripEndInput" name="endDate" type="date" value="${esc(draftValue('trip', 'endDate', edit?.endDate || ''))}"></div></div>
    ${tripVersionFieldHtml(edit)}
    ${tripVersionModeHtml(edit)}
    <button id="tripSaveButton" class="primary" type="submit" data-action="saveTrip">${edit ? 'Änderungen speichern' : 'Reise anlegen und weiter'}</button>
    <button class="secondary" type="button" data-action="resetTripForm">${edit ? 'Bearbeitung abbrechen' : 'Eingaben leeren'}</button>
    ${manualWizard ? '<button class="secondary" type="button" data-action="cancelTripWizard">Zurück zur Auswahl</button>' : ''}
  </form>`;
}
function viewTrips() {
  const edit = state.editingTripId ? state.trips.find(t => t.id === state.editingTripId) : null;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Reisen</h1><span class="subtle">${state.trips.length}</span></div>
      ${activeTripContextHtml()}
      ${tripClosurePreviewHtml()}
      ${edit || state.pendingTripClosure ? '' : tripSetupWizardHtml()}
      ${state.pendingTripVersionChange ? tripVersionChangePreviewHtml() : tripFormHtml(edit)}
      ${state.tripSetupWizard?.step || state.pendingTripVersionChange ? '' : itineraryManagementHtml(currentTrip())}
      <div class="card"><h2>Vorhandene Reisen</h2><div class="itemList">${state.trips.map(tripCardHtml).join('') || '<p class="emptyText">Noch keine Reise angelegt.</p>'}</div></div>
    </section>`;
}
function tripCardHtml(trip) {
  const active = trip.id === activeTripId();
  const logs = state.logs.filter(l => l.tripId === trip.id);
  const badge = trip.archived
    ? '<span class="tripStateBadge completed">Abgeschlossen</span>'
    : active
      ? '<span class="tripStateBadge active">Aktive Reise</span>'
      : '<span class="tripStateBadge available">Weitere Reise</span>';
  const version = referenceVersionById(trip.barkarteVersionId || '')?.version || activeBarkarteVersion().version || 'unbekannt';
  const archiveMeta = trip.archived ? ` · abgeschlossen ${trip.archivedAt ? formatDateTime(Date.parse(trip.archivedAt)) : ''}${state.archiveIntegrity?.[trip.id]?.status === 'bad' ? ' · Datenabweichung' : ''}` : '';
  return `<article class="itemCard tripListCard ${active ? 'activeTripSelection' : ''} ${trip.archived ? 'completedTripCard' : ''}">
    <div><b>${esc(trip.name)}${badge}</b><small>${esc(trip.ship || 'Ohne Schiff')} · ${esc(formatDate(trip.startDate))} – ${esc(formatDate(trip.endDate))} · ${logs.length} Einträge${tripItinerary(trip).length ? ` · ${tripItinerary(trip).length} Routentage` : ''} · Barkarte ${esc(version)}${archiveMeta}${active ? ' · geöffnet' : ''}</small></div>
    <div class="rowActions"><button class="mini" data-action="setTrip" data-id="${esc(trip.id)}">${trip.archived ? 'Abschlussbericht' : 'Öffnen'}</button>${trip.archived ? '' : `<button class="mini" data-action="editTrip" data-id="${esc(trip.id)}">Bearbeiten</button>`}<button class="mini ${trip.archived ? '' : 'completeTripButton'}" data-action="archiveTrip" data-id="${esc(trip.id)}">${trip.archived ? 'Reaktivieren' : 'Reise abschließen'}</button><button class="mini dangerText" data-action="deleteTrip" data-id="${esc(trip.id)}">Löschen</button></div>
  </article>`;
}
function addTripClosureIssue(bucket, code, title, message, detail = '') {
  let issue = bucket.get(code);
  if (!issue) {
    issue = { code, title, message, count: 0, details: [] };
    bucket.set(code, issue);
  }
  issue.count += 1;
  if (detail && issue.details.length < 8 && !issue.details.includes(detail)) issue.details.push(detail);
}
function validateTripForClosure(tripId) {
  const trip = tripById(tripId);
  const critical = new Map();
  const warnings = new Map();
  if (!trip) {
    addTripClosureIssue(critical, 'trip_missing', 'Reise nicht gefunden', 'Der Reisedatensatz ist nicht mehr verfügbar.');
    return { tripId, tripName: 'Unbekannte Reise', critical: [...critical.values()], warnings: [], summary: { persons: 0, logs: 0, value: 0 }, checkedAt: nowIso() };
  }

  const validDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDateValue = value => {
    if (!validDatePattern.test(String(value || ''))) return false;
    const [year, month, day] = String(value).split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  };
  if ((trip.startDate && !isValidDateValue(trip.startDate)) || (trip.endDate && !isValidDateValue(trip.endDate))) {
    addTripClosureIssue(critical, 'trip_dates_unreadable', 'Reisedatum ungültig', 'Start- oder Enddatum besitzt kein auswertbares Datumsformat.', `${trip.startDate || 'Start fehlt'} bis ${trip.endDate || 'Ende fehlt'}`);
  } else if (trip.startDate && trip.endDate && trip.startDate > trip.endDate) {
    addTripClosureIssue(critical, 'trip_dates_invalid', 'Ungültiger Reisezeitraum', 'Das Startdatum liegt nach dem Enddatum.', `${formatDate(trip.startDate)} bis ${formatDate(trip.endDate)}`);
  }
  if (!trip.startDate || !trip.endDate) {
    addTripClosureIssue(warnings, 'trip_dates_missing', 'Reisezeitraum unvollständig', 'Die spätere Tagesauswertung kann eingeschränkt sein.', `${trip.startDate ? 'Enddatum' : trip.endDate ? 'Startdatum' : 'Start- und Enddatum'} fehlt`);
  }

  const includeLegacyRows = tripId === activeTripId();
  const persons = state.persons.filter(person => person.tripId === tripId || (includeLegacyRows && !person.tripId));
  const logs = state.logs.filter(log => log.tripId === tripId || (includeLegacyRows && !log.tripId));
  const personsById = new Map(state.persons.map(person => [person.id, person]));
  const drinksById = new Map(state.drinks.map(drink => [drink.id, drink]));
  const allowedStatuses = new Set(['included', 'not_included', 'unclear']);
  const mergeKeys = new Map();
  let value = 0;

  if (!persons.length) addTripClosureIssue(warnings, 'no_persons', 'Keine Personen angelegt', 'Die Reise kann abgeschlossen werden, enthält aber keine Personendaten.');
  if (!logs.length) addTripClosureIssue(warnings, 'no_logs', 'Keine Buchungen vorhanden', 'Die Reise kann ohne Getränkebuchungen abgeschlossen werden.');

  for (const person of persons) {
    if (!person.id) addTripClosureIssue(critical, 'person_id_missing', 'Person ohne stabile ID', 'Mindestens eine Person besitzt keine stabile ID.', person.name || 'Unbenannte Person');
    if (!person.tripId) addTripClosureIssue(warnings, 'person_trip_missing', 'Person ohne feste Reisezuordnung', 'Eine Person besitzt keine gespeicherte Reise-ID.', person.name || person.id || 'Unbenannte Person');
    if (person.tripId && person.tripId !== tripId) addTripClosureIssue(critical, 'person_wrong_trip', 'Person falsch zugeordnet', 'Eine Person ist einer anderen Reise zugeordnet.', person.name || person.id || 'Unbenannte Person');
    const packagePriceValue = Number(person.packagePrice);
    if (person.packageId && person.packageId !== 'none' && (person.packagePrice === '' || person.packagePrice === null || person.packagePrice === undefined || !Number.isFinite(packagePriceValue) || packagePriceValue <= 0)) {
      addTripClosureIssue(warnings, 'package_price_missing', 'Paketpreis fehlt oder ist ungültig', 'Für die Abschlussauswertung kann kein belastbarer Paketvergleich berechnet werden.', `${person.name || 'Unbenannt'} · ${packageName(person.packageId)}`);
    }
  }

  for (const log of logs) {
    const label = `${log.drinkName || log.drinkId || 'Unbekanntes Getränk'} · ${log.personName || log.personId || 'Unbekannte Person'}`;
    if (!log.id) addTripClosureIssue(critical, 'log_id_missing', 'Buchung ohne stabile ID', 'Mindestens eine Buchung besitzt keine stabile Buchungs-ID.', label);
    if (!log.tripId) addTripClosureIssue(critical, 'log_trip_missing', 'Buchung ohne Reise-ID', 'Eine Buchung kann keiner Reise eindeutig zugeordnet werden.', label);
    else if (log.tripId !== tripId) addTripClosureIssue(critical, 'log_wrong_trip', 'Buchung falsch zugeordnet', 'Eine geprüfte Buchung verweist auf eine andere Reise.', label);

    const person = personsById.get(log.personId);
    if (!log.personId || !person) addTripClosureIssue(critical, 'log_person_missing', 'Buchung ohne gültige Person', 'Eine Buchung verweist auf keine vorhandene Person.', label);
    else if (!person.tripId || person.tripId !== tripId) addTripClosureIssue(critical, 'log_person_wrong_trip', 'Person gehört nicht zur Reise', 'Die Person einer Buchung ist nicht eindeutig dieser Reise zugeordnet.', label);

    const rawPrice = log.price;
    if (rawPrice === '' || rawPrice === null || rawPrice === undefined) {
      addTripClosureIssue(warnings, 'price_missing', 'Buchung ohne Preis', 'Der Barkartenwert dieser Buchung ist nicht belastbar.', label);
    } else {
      const price = Number(rawPrice);
      if (!Number.isFinite(price) || price < 0) addTripClosureIssue(critical, 'price_invalid', 'Ungültiger Buchungspreis', 'Eine Buchung enthält einen nicht numerischen oder negativen Preis.', `${label} · ${String(rawPrice)}`);
      else {
        value += price;
        if (price === 0) addTripClosureIssue(warnings, 'price_zero', 'Buchung mit 0,00 EUR', 'Bitte prüfen, ob der Preis bewusst 0,00 EUR beträgt.', label);
      }
    }

    const ts = Number(log.ts);
    if (!Number.isFinite(ts) || ts <= 0) addTripClosureIssue(critical, 'timestamp_invalid', 'Ungültiger Buchungszeitpunkt', 'Eine Buchung besitzt kein auswertbares Datum und keine auswertbare Uhrzeit.', label);
    else if ((trip.startDate && localDateInputValue(ts) < trip.startDate) || (trip.endDate && localDateInputValue(ts) > trip.endDate)) {
      addTripClosureIssue(warnings, 'outside_trip_dates', 'Buchung außerhalb des Reisezeitraums', 'Mindestens eine Buchung liegt vor dem Start- oder nach dem Enddatum.', `${label} · ${formatDateTime(ts)}`);
    }

    if (log.packageStatus === 'unclear') addTripClosureIssue(warnings, 'package_unclear', 'Unklarer Paketstatus', 'Diese Buchungen werden konservativ nicht als Ersparnis gewertet.', label);
    else if (!allowedStatuses.has(log.packageStatus)) addTripClosureIssue(warnings, 'package_invalid', 'Unbekannter Paketstatus', 'Der Status wird für die Prüfung als unklar behandelt.', `${label} · ${String(log.packageStatus || 'leer')}`);

    const key = logMergeKey(log, log.trackedByDeviceId || state.settings.deviceId || '');
    if (!key) addTripClosureIssue(critical, 'merge_key_missing', 'Buchung ohne Merge-Key', 'Die Buchung kann beim Geräteabgleich nicht sicher identifiziert werden.', label);
    else if (mergeKeys.has(key)) addTripClosureIssue(critical, 'merge_key_duplicate', 'Doppelter Merge-Key', 'Mehrere Buchungen besitzen dieselbe geräteübergreifende Identität.', `${label} · auch ${mergeKeys.get(key)}`);
    else mergeKeys.set(key, label);

    if (!log.drinkId || !drinksById.has(log.drinkId)) addTripClosureIssue(warnings, 'drink_reference_missing', 'Getränk nicht in aktueller Barkarte', 'Die gespeicherten Buchungswerte bleiben erhalten, der Stammdatensatz fehlt jedoch.', label);
    if (!String(log.drinkName || '').trim()) addTripClosureIssue(warnings, 'drink_name_missing', 'Getränkename fehlt', 'Eine Buchung besitzt keinen gespeicherten Getränkenamen.', log.id || 'Buchung ohne ID');
    if (!resolvedLogCategory(log)) addTripClosureIssue(warnings, 'category_missing', 'Kategorie fehlt', 'Weder die Buchung noch der zugehörige Barkartenartikel enthält eine Kategorie.', label);
    if (!String(log.trackedByDeviceId || '').trim()) addTripClosureIssue(warnings, 'origin_missing', 'Geräteherkunft fehlt', 'Die Herkunft dieser Buchung ist beim Mehrgeräteabgleich nicht vollständig nachvollziehbar.', label);
  }

  const criticalRows = [...critical.values()];
  const warningRows = [...warnings.values()];
  return {
    tripId,
    tripName: trip.name || 'Unbenannte Reise',
    critical: criticalRows,
    warnings: warningRows,
    criticalCount: criticalRows.reduce((sum, row) => sum + row.count, 0),
    warningCount: warningRows.reduce((sum, row) => sum + row.count, 0),
    summary: { persons: persons.length, logs: logs.length, value },
    checkedAt: nowIso()
  };
}
function tripClosureIssueHtml(issue, severity) {
  return `<details class="closureIssue ${severity}"><summary><span><b>${esc(issue.title)}</b><small>${esc(issue.message)}</small></span><strong>${issue.count}</strong></summary>${issue.details.length ? `<div class="closureIssueDetails">${issue.details.map(detail => `<span>${esc(detail)}</span>`).join('')}</div>` : ''}</details>`;
}
function tripClosurePreviewHtml() {
  const pending = state.pendingTripClosure;
  if (!pending) return '';
  const trip = tripById(pending.tripId);
  if (!trip || trip.archived) return '';
  const result = pending.validation || validateTripForClosure(pending.tripId);
  const blocked = result.criticalCount > 0;
  return `<div class="card tripClosurePreview" id="tripClosurePreview">
    <div class="backupPreviewHead"><div><b>Reiseabschluss prüfen</b><small>${esc(trip.name)} · Noch keine Daten verändert</small></div><span class="diagnosticSummary ${blocked ? 'bad' : result.warningCount ? 'warn' : 'ok'}">${blocked ? 'Abschluss blockiert' : result.warningCount ? 'Hinweise prüfen' : 'Bereit zum Abschluss'}</span></div>
    <div class="closureSummaryGrid"><span><b>${result.summary.persons}</b> Personen</span><span><b>${result.summary.logs}</b> Buchungen</span><span><b>${eur(result.summary.value)}</b> Barkartenwert</span><span class="${blocked ? 'badText' : ''}"><b>${result.criticalCount}</b> kritische Fehler</span><span class="${result.warningCount ? 'warnText' : ''}"><b>${result.warningCount}</b> Hinweise</span></div>
    ${result.critical.length ? `<div class="closureIssueGroup critical"><h3>Kritische Fehler</h3><p>Diese Punkte müssen vor dem Abschluss korrigiert werden.</p>${result.critical.map(issue => tripClosureIssueHtml(issue, 'critical')).join('')}</div>` : ''}
    ${result.warnings.length ? `<div class="closureIssueGroup warning"><h3>Hinweise</h3><p>Der Abschluss bleibt möglich. Prüfe die Punkte bewusst.</p>${result.warnings.map(issue => tripClosureIssueHtml(issue, 'warning')).join('')}</div>` : '<div class="closureReadyMessage"><b>Keine Auffälligkeiten erkannt.</b><p>Die Reise kann kontrolliert abgeschlossen werden.</p></div>'}
    <div class="buttonStack"><button class="primary" data-action="confirmTripClosure" data-id="${esc(trip.id)}" ${blocked ? 'disabled' : ''}>${result.warningCount ? 'Trotz Hinweisen abschließen' : 'Reise jetzt abschließen'}</button><button class="secondary" data-action="cancelTripClosure">Prüfung schließen</button></div>
  </div>`;
}
function buildTripClosureSnapshot(tripId) {
  const trip = tripById(tripId);
  const persons = state.persons.filter(person => person.tripId === tripId);
  const logs = state.logs.filter(log => log.tripId === tripId);
  const total = calcDetailed(logs);
  const completion = completionTotals(persons, logs);
  const daily = tripDailyReport(logs, trip);
  const favorite = drinkReportRows(logs).sort((a, b) => b.count - a.count || b.value - a.value)[0] || null;
  return {
    schema: 1,
    createdAt: nowIso(),
    personCount: persons.length,
    logCount: logs.length,
    totalValue: total.value,
    includedValue: total.included,
    outsideValue: total.notIncluded,
    unclearValue: total.unclear,
    packagePriceTotal: completion.packagePriceTotal,
    packageResult: completion.packageResult,
    strongestDay: daily.strongest ? { date: daily.strongest.key, count: daily.strongest.count, value: daily.strongest.value } : null,
    favoriteDrink: favorite ? { name: favorite.key, count: favorite.count, value: favorite.value } : null
  };
}
function prepareTripClosure(id) {
  const trip = tripById(id);
  if (!trip || trip.archived) return;
  state.pendingTripClosure = { tripId: id, validation: validateTripForClosure(id), preparedAt: nowIso() };
  state.editingTripId = null;
  clearDraft('trip');
  render();
  requestAnimationFrame(() => $('#tripClosurePreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
async function confirmTripClosure(id) {
  await loadState();
  const trip = tripById(id);
  if (!trip) throw new Error('Die Reise wurde nicht gefunden.');
  if (trip.archived) { state.pendingTripClosure = null; render(); return; }
  const result = validateTripForClosure(id);
  state.pendingTripClosure = { tripId: id, validation: result, preparedAt: nowIso() };
  if (result.criticalCount) {
    render();
    alert('Der Abschluss ist wegen kritischer Datenfehler derzeit nicht möglich. Die Prüfung wurde aktualisiert.');
    return;
  }
  const warningText = result.warningCount ? `\n\nEs bestehen ${result.warningCount} Hinweis${result.warningCount === 1 ? '' : 'e'}, die den Abschluss nicht verhindern.` : '';
  if (!confirm(`Reise „${trip.name}“ wirklich abschließen?\n\nDanach sind die Getränkeerfassung sowie Änderungen an Buchungen, Personen und Paketpreisen gesperrt. Alle vorhandenen Daten bleiben erhalten. Die Reise kann später wieder reaktiviert werden.${warningText}`)) {
    render();
    return;
  }
  const closureSnapshot = buildTripClosureSnapshot(id);
  const closureDigest = await calculateTripArchiveDigest(id);
  await createInternalRestorePoint('Vor dem Abschluss einer Reise', { tripId: id, tripName: trip.name || '', logs: closureSnapshot.logCount });
  const archivedAt = nowIso();
  await put('trips', {
    ...trip,
    archived: true,
    archivedAt,
    archivedByDeviceId: state.settings.deviceId || '',
    archivedByDeviceName: state.settings.deviceName || '',
    closureAppVersion: APP_VERSION,
    closureBuild: APP_BUILD,
    closureSequence: Number(trip.closureSequence || 0) + 1,
    closureSnapshot,
    closureValidation: { criticalCount: result.criticalCount, warningCount: result.warningCount, checkedAt: result.checkedAt },
    closureDigest,
    updatedAt: archivedAt
  });
  if (state.undoLog?.tripId === id) {
    clearUndoAutoHide();
    state.undoLog = null;
  }
  const editedLog = state.logs.find(log => log.id === state.editingLogId);
  if (editedLog?.tripId === id) { state.editingLogId = null; clearDraft('log'); }
  const editedPerson = state.persons.find(person => person.id === state.editingPersonId);
  if (editedPerson?.tripId === id) { state.editingPersonId = null; clearDraft('person'); }
  if (state.editingTripId === id) { state.editingTripId = null; clearDraft('trip'); }
  state.pendingTripClosure = null;
  state.statsFilter = 'trip';
  state.statsPersonId = null;
  state.route = 'stats';
  await loadState();
  render();
  toast('Reise abgeschlossen · Abschlussbericht geöffnet');
  haptic();
}
async function reactivateTrip(id) {
  const trip = tripById(id);
  if (!trip || !trip.archived) return;
  if (!confirm(`Reise „${trip.name}“ wieder reaktivieren?\n\nDanach können erneut Getränke erfasst sowie Personen und Buchungen geändert werden.`)) return;
  const restorePoint = await createInternalRestorePoint('Vor der Reaktivierung einer Reise', { tripId: id, tripName: trip.name || '', closureSequence: Number(trip.closureSequence || 1) });
  await put('trips', { ...trip, archived: false, reactivatedAt: nowIso(), reactivatedByDeviceId: state.settings.deviceId || '', reactivatedByDeviceName: state.settings.deviceName || '', reactivationRestorePointId: restorePoint?.id || '', updatedAt: nowIso() });
  await putSetting('currentTripId', id);
  state.pendingTripClosure = null;
  state.currentTripId = id;
  await loadState();
  state.currentTripId = id;
  state.selectedPersonId = preferredPersonIdForTrip(id);
  render();
  toast('Reise reaktiviert');
  haptic();
}

function tripSetupAssistantHtml(trip = currentTrip()) {
  const wizard = state.tripSetupWizard || {};
  if (!trip || wizard.tripId !== trip.id || !['persons', 'export'].includes(wizard.step)) return '';
  const persons = currentPersons();
  if (wizard.step === 'persons') {
    return `<div class="card tripSetupWizard" id="tripSetupAssistant">${tripWizardProgressHtml(2)}<p class="eyebrow">Schritt 2 von 3</p><h2>Personen und Getränkepakete</h2><p class="hint">Lege jetzt alle Personen dieser Reise an. Die stabilen Personen-IDs werden anschließend im Reiseexport für das zweite Gerät mitgegeben.</p><div class="tripSetupSummary"><span><b>${esc(trip.name)}</b><small>${esc(trip.ship || 'Ohne Schiff')} · ${esc(formatDate(trip.startDate))} – ${esc(formatDate(trip.endDate))}</small></span><strong>${persons.length} Personen</strong></div><div class="buttonStack"><button class="secondary" data-action="focusPersonForm">${persons.length ? 'Weitere Person anlegen' : 'Erste Person anlegen'}</button><button class="primary" data-action="tripWizardExport" ${persons.length ? '' : 'disabled'}>Weiter zum Export</button><button class="secondary" data-action="finishTripWizard" ${persons.length ? '' : 'disabled'}>Assistent ohne Export beenden</button></div>${persons.length ? '' : '<p class="tripWizardHint">Für die Erfassung muss mindestens eine Person vorhanden sein.</p>'}</div>`;
  }
  return `<div class="card tripSetupWizard" id="tripSetupAssistant">${tripWizardProgressHtml(3)}<p class="eyebrow">Schritt 3 von 3</p><h2>Reise für ein zweites Gerät bereitstellen</h2><p class="hint">Der Reiseexport enthält die neue Reise, den importierten Verlauf und alle angelegten Personen mit identischen IDs. Auf dem zweiten Gerät wird die Datei unter Geräteabgleich importiert.</p><div class="tripSetupSummary"><span><b>${esc(trip.name)}</b><small>${currentPersons().length} Personen · ${tripItinerary(trip).length} Routentage</small></span><strong>${wizard.exported ? 'Export erstellt' : 'Bereit'}</strong></div>${wizard.exported ? '<div class="backupMessages ok"><p>Der Reiseexport wurde bereitgestellt. Speichere ihn in der Dateien-App oder übertrage ihn per AirDrop.</p></div>' : ''}<div class="buttonStack"><button class="primary" data-action="exportTrip">Aktuelle Reise exportieren</button><button class="secondary" data-action="tripWizardBackToPersons">Zurück zu Personen</button><button class="secondary" data-action="finishTripWizard">Einrichtung abschließen</button></div></div>`;
}

function viewDevices() {
  const trip = currentTrip();
  const locked = isTripCompleted(trip);
  const edit = !locked && state.editingPersonId ? state.persons.find(p => p.id === state.editingPersonId) : null;
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Geräte & Personen</h1><span class="subtle">${currentPersons().length} Personen</span></div>
      ${activeTripContextHtml()}
      ${tripStatusNoticeHtml('persons', trip)}
      ${tripSetupAssistantHtml(trip)}
      <form id="deviceForm" class="card formCard">
        <h2>Gerät</h2>
        <div class="formField"><label for="deviceNameInput">Gerätename</label><input id="deviceNameInput" name="deviceName" value="${esc(draftValue('device', 'deviceName', state.settings.deviceName || ''))}"></div>
        <div class="infoBox"><span>Geräte-ID</span><code>${esc(state.settings.deviceId || '')}</code></div>
        <button id="deviceSaveButton" class="primary" type="submit" data-action="saveDevice">Gerätename speichern</button>
      </form>
      ${locked ? `<div class="card readOnlyManagement"><h2>Personen dieser Reise</h2><p>Personen, Getränkepakete und Paketpreise können erst nach der Reaktivierung geändert werden.</p><button class="secondary" data-route="trips">Reise verwalten</button></div>` : `<form id="personForm" class="card formCard" autocomplete="off">
        <input id="personIdInput" type="hidden" name="id" value="${esc(edit?.id || '')}">
        <h2>${edit ? 'Person bearbeiten' : 'Person anlegen'}</h2>
        <div class="formField"><label for="personNameInput">Name</label><input id="personNameInput" name="name" placeholder="Name" value="${esc(draftValue('person', 'name', edit?.name || ''))}"></div>
        <div class="formField"><label for="personPackageInput">Getränkepaket</label><select id="personPackageInput" name="packageId">${state.packages.map(p => `<option value="${esc(p.id)}" ${p.id === draftValue('person', 'packageId', edit?.packageId || 'none') ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="formField"><label for="personPackagePriceInput">Paketpreis gesamt</label><input id="personPackagePriceInput" name="packagePrice" type="text" inputmode="decimal" autocomplete="off" placeholder="optional, z. B. 329,00" value="${esc(draftValue('person', 'packagePrice', edit?.packagePrice ?? ''))}"></div>
        <button id="personSaveButton" class="primary" type="submit" data-action="savePerson">${edit ? 'Änderungen speichern' : 'Person speichern'}</button>
        <button class="secondary" type="button" data-action="resetPersonForm">Formular leeren</button>
      </form>`}
      <div class="card"><h2>Personen dieser Reise</h2><div class="itemList">${currentPersons().map(personCardHtml).join('') || '<p class="emptyText">Noch keine Personen angelegt.</p>'}</div></div>
      <div class="card"><div class="sectionHead"><h2>Importprotokoll</h2><button class="mini" data-action="clearImportLog">Leeren</button></div>${importLogHtml()}</div>
    </section>`;
}
function personCardHtml(person) {
  const count = currentLogs().filter(l => l.personId === person.id).length;
  const locked = isTripCompleted();
  return `<article class="itemCard" style="--person:${esc(person.color || '#e0f2fe')}"><div><b><span class="personDot"></span>${esc(person.name)}</b><small>${esc(packageName(person.packageId))}${person.packagePrice ? ` · Paketpreis ${eur(person.packagePrice)}` : ''} · ${count} Einträge</small></div>${locked ? '<span class="readOnlyBadge">Schreibgeschützt</span>' : `<div class="rowActions"><button class="mini" data-action="editPerson" data-id="${esc(person.id)}">Bearbeiten</button><button class="mini dangerText" data-action="deletePerson" data-id="${esc(person.id)}">Löschen</button></div>`}</article>`;
}
function importProtocolDetailsHtml(entry) {
  const details = Array.isArray(entry.resolutionDetails) ? entry.resolutionDetails : [];
  if (!details.length) return '';
  return `<div class="importProtocolDecisions">${details.slice(0, 20).map(row => `<div><span>${esc(row.type === 'log' ? 'Buchung' : row.type === 'person' ? 'Person' : row.type === 'trip' ? 'Reise' : 'Zuordnung')}</span><b>${esc(row.title || 'Datensatz')}</b><small>${row.resolution === 'incoming' ? 'Importierte Version übernommen' : row.resolution === 'blocked' ? 'Nicht sicher übernehmbar' : 'Lokale Version beibehalten'}</small></div>`).join('')}${details.length > 20 ? `<p class="hint">Weitere ${details.length - 20} Entscheidungen sind im lokalen Protokolldatensatz enthalten.</p>` : ''}</div>`;
}
function importLogHtml() {
  if (!state.imports.length) return '<p class="emptyText">Noch keine Importe.</p>';
  return `<div class="importProtocolList">${state.imports.slice(0, 20).map(i => {
    const addedLogs = Number(i.addedLogs ?? i.added ?? 0);
    const addedReferenceVersions = Number(i.addedReferenceVersions || 0);
    const changedLogs = Number(i.changedLogs || 0);
    const duplicates = Number(i.duplicates || 0);
    const conflicts = Number(i.conflicts || 0);
    const resolutionLine = conflicts ? `${Number(i.resolvedLocal || 0)} lokal · ${Number(i.resolvedImported || 0)} importiert · ${Number(i.blockedConflicts || 0)} gesperrt` : 'keine Konflikte';
    return `<details class="importProtocolRow"><summary><div><b>${esc(i.fileName || 'Import')}</b><small>${esc(formatDateTime(Date.parse(i.importedAt)))}${i.sourceDeviceName ? ` · von ${esc(i.sourceDeviceName)}` : ''}</small></div><span>${esc(i.kind || 'Import')}</span></summary><div class="importProtocolStats"><span><b>+${addedLogs}</b> neu</span><span><b>${changedLogs}</b> geändert</span><span><b>${duplicates}</b> doppelt</span><span><b>${conflicts}</b> Konflikte</span></div><p class="importProtocolResolution">${esc(resolutionLine)}${addedReferenceVersions ? ` · ${addedReferenceVersions} Barkarten-Version${addedReferenceVersions === 1 ? '' : 'en'} ergänzt` : ''}${i.restorePointId ? ' · Wiederherstellungspunkt erstellt' : ''}</p>${importProtocolDetailsHtml(i)}</details>`;
  }).join('')}</div>`;
}

function referenceVersionBadgeHtml(record, trip = currentTrip()) {
  const badges = [];
  if (trip && tripReferenceVersionId(trip) === record.id && tripPackageVersionId(trip) === record.id) badges.push('<span class="referenceBadge active">Aktuelle Reise</span>');
  else {
    if (trip && tripReferenceVersionId(trip) === record.id) badges.push('<span class="referenceBadge active">Barkarte der Reise</span>');
    if (trip && tripPackageVersionId(trip) === record.id) badges.push('<span class="referenceBadge active">Pakete der Reise</span>');
  }
  if (defaultBarkarteVersionId() === record.id && defaultPackageVersionId() === record.id) badges.push('<span class="referenceBadge default">Standard für neue Reisen</span>');
  else {
    if (defaultBarkarteVersionId() === record.id) badges.push('<span class="referenceBadge default">Barkarten-Standard</span>');
    if (defaultPackageVersionId() === record.id) badges.push('<span class="referenceBadge default">Paket-Standard</span>');
  }
  if (record.isWorkingCopy) badges.push('<span class="referenceBadge local">Lokale Anpassung</span>');
  if (record.isBundled) badges.push('<span class="referenceBadge bundled">Mit App geliefert</span>');
  if (record.dataAvailable === false || !Array.isArray(record.drinks) || !record.drinks.length) badges.push('<span class="referenceBadge unavailable">Daten nicht verfügbar</span>');
  return badges.join('');
}
function referenceVersionListHtml() {
  const trip = currentTrip();
  const rows = [...state.barkarten].sort((a, b) => String(b.updatedAt || b.importedAt || '').localeCompare(String(a.updatedAt || a.importedAt || '')) || String(a.version || '').localeCompare(String(b.version || ''), 'de'));
  if (!rows.length) return '<p class="emptyText">Noch keine versionierten Barkarten vorhanden.</p>';
  return `<div class="referenceVersionList">${rows.map(record => {
    const usage = versionUsageCount(record.id);
    const names = versionTripNames(record.id);
    const available = record.dataAvailable !== false && Array.isArray(record.drinks) && record.drinks.length;
    const current = trip && tripReferenceVersionId(trip) === record.id && tripPackageVersionId(trip) === record.id;
    const isDefault = defaultBarkarteVersionId() === record.id && defaultPackageVersionId() === record.id;
    const canDelete = !record.isBundled && !usage && defaultBarkarteVersionId() !== record.id && defaultPackageVersionId() !== record.id;
    return `<article class="referenceVersionCard ${current ? 'current' : ''}">
      <div class="referenceVersionHead"><div><b>${esc(record.version || record.id)}</b><small>${esc(record.source || 'Ohne Quellenangabe')}</small></div><strong>${Number(record.count ?? record.drinks?.length ?? 0)} Getränke</strong></div>
      <div class="referenceBadges">${referenceVersionBadgeHtml(record, trip)}</div>
      <div class="referenceVersionMeta"><span>${Number(record.packageCount ?? record.packages?.length ?? 0)} Paketdefinitionen</span><span>${usage ? `${usage} Reise${usage === 1 ? '' : 'n'}` : 'Noch keiner Reise zugeordnet'}</span><span>${formatDateTime(record.updatedAt || record.importedAt) || 'Zeitpunkt unbekannt'}</span></div>
      ${names.length ? `<p class="referenceUsage">Verwendet von: ${esc(names.join(', '))}</p>` : ''}
      <div class="rowActions referenceVersionActions">
        ${available && trip && !trip.archived && !current ? `<button class="mini" data-action="activateReferenceVersion" data-id="${esc(record.id)}">Für aktuelle Reise verwenden</button>` : ''}
        ${available && !isDefault ? `<button class="mini" data-action="setDefaultReferenceVersion" data-id="${esc(record.id)}">Als Standard setzen</button>` : ''}
        ${canDelete ? `<button class="mini dangerText" data-action="deleteReferenceVersion" data-id="${esc(record.id)}">Version löschen</button>` : ''}
      </div>
    </article>`;
  }).join('')}</div>`;
}
function barkarteImportPreviewHtml() {
  const pending = state.pendingBarkarteImport;
  if (!pending) return '';
  const cmp = pending.comparison;
  const trip = currentTrip();
  return `<div class="barkarteImportPreview" id="barkarteImportPreview">
    <div class="backupPreviewHead"><div><b>Importvorschau</b><small>${esc(pending.fileName)} · Noch keine Barkarte wurde aktiviert</small></div><span class="diagnosticSummary ${cmp.totalChanges ? 'warn' : 'ok'}">${cmp.totalChanges ? 'Änderungen prüfen' : 'Keine Abweichung'}</span></div>
    <div class="barkarteComparisonGrid">
      <span><b>+${cmp.newDrinks}</b> neue Getränke</span>
      <span><b>−${cmp.removedDrinks}</b> entfernte Getränke</span>
      <span><b>${cmp.priceChanges}</b> Preisänderungen</span>
      <span><b>${cmp.categoryChanges}</b> Kategorieänderungen</span>
      <span><b>${cmp.packageChanges}</b> Paketstatusänderungen</span>
      <span><b>${cmp.packageDefinitionChanges}</b> Paketdefinitionen</span>
    </div>
    <div class="infoBox"><span>Neue Version</span><b>${esc(pending.record.version)}</b></div>
    <div class="infoBox"><span>Quelle</span><small>${esc(pending.record.source)}</small></div>
    <div class="infoBox"><span>Umfang</span><b>${pending.record.drinks.length} Getränke · ${pending.record.packages.length} Pakete</b></div>
    ${cmp.details.length ? `<details class="barkarteComparisonDetails"><summary>Änderungsdetails anzeigen</summary><div class="comparisonList">${cmp.details.map(row => `<div><b>${esc(row.name)}</b><small>${esc(row.text)}</small></div>`).join('')}</div></details>` : '<p class="hint">Die importierten Daten entsprechen inhaltlich der aktuell verwendeten Version.</p>'}
    <div class="backupModeCard"><b>Version nur speichern</b><p>Die neue Barkarte wird lokal archiviert. Bestehende und neue Reisen wechseln noch nicht automatisch auf diese Version.</p><button class="secondary" data-action="saveBarkarteVersion" data-id="store">Als neue Version speichern</button></div>
    ${trip && !trip.archived ? `<div class="backupModeCard"><b>Speichern und für aktuelle Reise verwenden</b><p>Nur künftige Erfassungen dieser Reise verwenden die neue Barkarte und Paketmatrix. Bereits gespeicherte Buchungswerte bleiben unverändert.</p><button class="primary" data-action="saveBarkarteVersion" data-id="current">Für „${esc(trip.name)}“ aktivieren</button></div>` : ''}
    <div class="backupModeCard"><b>Speichern und als Standard setzen</b><p>Die Version wird für neu angelegte Reisen vorausgewählt. Bereits vorhandene Reisen bleiben fest mit ihrer bisherigen Version verbunden.</p><button class="secondary" data-action="saveBarkarteVersion" data-id="default">Als Standard für neue Reisen</button></div>
    <button class="secondary" data-action="cancelBarkarteImport">Importvorschau schließen</button>
  </div>`;
}
function viewBarkarte() {
  const v = activeBarkarteVersion();
  const cmp = state.settings.lastBarkarteComparison;
  const trip = currentTrip();
  const packageVersion = activePackageVersion(trip);
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Barkarte</h1><span class="subtle">${state.drinks.length} Getränke</span></div>
      ${activeTripContextHtml()}
      ${tripStatusNoticeHtml('barkarte')}
      <div class="card">
        <div class="sectionHead"><div><h2>Version der aktuellen Reise</h2><p class="hint">Barkarte und Getränkepakete werden je Reise fest zugeordnet. Ein späterer Import verändert bestehende Reisen nicht automatisch.</p></div><span class="backupFormatBadge">Versioniert</span></div>
        <div class="infoBox"><span>Barkarte</span><b>${esc(v.version || 'unbekannt')}</b></div>
        <div class="infoBox"><span>Paketdefinitionen</span><b>${esc(packageVersion?.version || v.version || 'unbekannt')}</b></div>
        <div class="infoBox"><span>Quelle</span><small>${esc(v.source || 'nicht gesetzt')}</small></div>
        <div class="infoBox"><span>Umfang</span><b>${state.drinks.length} Getränke · ${state.packages.length} Pakete</b></div>
        <button class="primary" data-action="importBarkarte">Neue Barkarte / Paketversion importieren</button>
        <p class="hint">Unterstützt werden CruiseSip-JSON-Dateien mit <code>drinks[]</code>, <code>packages[]</code> oder beiden Bereichen sowie einfache CSV-Dateien. Ein Import wird zunächst nur verglichen und muss anschließend ausdrücklich gespeichert oder aktiviert werden.</p>
      </div>
      ${barkarteImportPreviewHtml()}
      <div class="card"><div class="sectionHead"><div><h2>Gespeicherte Versionen</h2><p class="hint">Alte Versionen bleiben für zugeordnete Reisen erhalten. Nicht verwendete Importversionen können wieder gelöscht werden.</p></div><span class="subtle">${state.barkarten.length}</span></div>${referenceVersionListHtml()}</div>
      ${articleManagementHtml()}
      ${cmp && !state.pendingBarkarteImport ? comparisonHtml(cmp) : ''}
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
  const locked = isTripCompleted();
  return `<form id="articleForm" class="articleForm" autocomplete="off">
    <input id="articleIdInput" type="hidden" name="id" value="${esc(drink.id)}">
    <div class="articleEditHead"><div><b>${esc(drink.name)}</b><small>${esc(drink.category || 'Ohne Kategorie')}${drink.volume ? ` · ${esc(drink.volume)}` : ''}</small></div><button class="mini" type="button" data-action="resetArticleForm">Schließen</button></div>
    <div class="twoCols"><div class="formField"><label for="articlePriceInput">Preis</label><input id="articlePriceInput" name="price" type="text" inputmode="decimal" value="${esc(String(Number(drink.price) || 0).replace('.', ','))}"></div><div class="formField"><label for="articleCategoryInput">Kategorie</label><input id="articleCategoryInput" name="category" value="${esc(drink.category || '')}"></div></div>
    <div class="packageStatusEditor"><b>Enthalten je Getränkepaket</b>${packageStatusFieldsHtml(drink)}</div>
    <label class="checkLine ${locked ? 'disabledCheckLine' : ''}"><input id="articleApplyLogsInput" name="applyLogs" type="checkbox" ${locked ? 'disabled' : 'checked'}> Bestehende Einträge dieser Reise für diesen Artikel aktualisieren</label>
    ${locked ? '<p class="hint">Die aktuelle Reise ist abgeschlossen. CruiseSip legt bei einer Änderung eine neue lokale Version als Standard für künftige Reisen an; die abgeschlossene Reise bleibt unverändert.</p>' : ''}
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
async function ensureEditableReferenceVersion(updatedDrink, options = {}) {
  const trip = currentTrip();
  const active = activeReferenceVersion(trip);
  if (!trip || !active) throw new Error('Keine Barkarten-Version für die aktuelle Reise verfügbar.');
  const detached = !!options.detached;
  const otherTrips = state.trips.filter(row => row.id !== trip.id && (row.barkarteVersionId === active.id || row.packageVersionId === active.id));
  const sharedOrProtected = detached || active.isBundled || !active.isWorkingCopy || otherTrips.length > 0 || defaultBarkarteVersionId() === active.id || defaultPackageVersionId() === active.id;
  const drinks = normalizeDrinks(active.drinks || state.drinks).map(row => row.id === updatedDrink.id ? cloneRow(updatedDrink) : cloneRow(row));
  if (!drinks.some(row => row.id === updatedDrink.id)) drinks.push(cloneRow(updatedDrink));
  if (!sharedOrProtected) {
    const next = buildReferenceVersionRecord({ ...active, id: active.id, drinks, packages: active.packages || state.packages, isWorkingCopy: true, updatedAt: nowIso() });
    await put('barkarten', next);
    return next;
  }
  const stamp = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const next = buildReferenceVersionRecord({
    id: `local_${uid()}`,
    version: `${active.version || 'Barkarte'} · lokale Anpassung ${stamp}`,
    source: `Lokale Anpassung auf ${state.settings.deviceName || 'diesem Gerät'}`,
    drinks,
    packages: active.packages || state.packages,
    isWorkingCopy: true,
    derivedFrom: active.id,
    notes: `Abgeleitet von ${active.version || active.id}`
  });
  await put('barkarten', next);
  if (!detached) await put('trips', { ...trip, barkarteVersionId: next.id, packageVersionId: next.id, updatedAt: nowIso() });
  return next;
}
async function saveDrinkArticleForm(form) {
  if (!form) { alert('Artikelformular nicht gefunden.'); return; }
  const id = formValue(form, 'id');
  const drink = drinkById(id);
  if (!drink) { alert('Artikel nicht gefunden.'); return; }
  const rawPrice = formValue(form, 'price').trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)) { alert('Bitte einen gültigen Preis mit höchstens zwei Nachkommastellen eingeben.'); return; }
  const price = Number(rawPrice.replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) { alert('Bitte einen gültigen Preis eingeben.'); return; }
  const packages = { ...(drink.packages || {}) };
  for (const pkg of managedPackages()) {
    const raw = formValue(form, `pkg_${pkg.id}`) || 'unclear';
    packages[pkg.id] = ['included', 'not_included', 'unclear'].includes(raw) ? raw : 'unclear';
  }
  const applyLogs = !!form.elements.namedItem('applyLogs')?.checked;
  const activeId = activeTripId();
  const tripLocked = isTripCompleted();
  if (!tripLocked && activeId && !ensureTripWritable(activeId, 'Die lokale Anpassung der Barkarten-Version')) return;
  if (applyLogs) await createInternalRestorePoint('Vor einer Barkartenänderung mit Aktualisierung bestehender Buchungen', { drinkId: id, drinkName: drink.name || '' });
  else await createInternalRestorePoint(tripLocked ? 'Vor einer neuen Standardversion aus einer abgeschlossenen Reise' : 'Vor einer lokalen Barkartenänderung', { drinkId: id, drinkName: drink.name || '', tripId: activeId || '' });
  const updated = {
    ...drink,
    price,
    category: formValue(form, 'category').trim() || drink.category || 'Ohne Kategorie',
    packages,
    manualOverride: true,
    updatedAt: nowIso()
  };
  const version = await ensureEditableReferenceVersion(updated, { detached: tripLocked });

  let updatedLogs = 0;
  if (applyLogs) {
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
  if (tripLocked) {
    await putSetting('defaultBarkarteVersionId', version.id);
    await putSetting('defaultPackageVersionId', version.id);
    await mirrorDefaultDrinksStore(version);
  }
  await putSetting('barkarteVersionId', version.id);
  await putSetting('barkarteVersion', { ...referenceVersionMeta(version), manualOverrides: true });
  await loadState();
  state.editingDrinkId = id;
  render();
  toast(`${tripLocked ? 'Neue Standardversion' : 'Lokale Barkarten-Version'} gespeichert${updatedLogs ? ` · ${updatedLogs} Einträge aktualisiert` : ''}`);
}

function categorySummaryHtml() {
  const rows = groupStats(state.drinks.map(d => ({ category: d.category || 'Ohne Kategorie', price: d.price, packageStatus: 'not_included' })), l => l.category || 'Ohne Kategorie');
  if (!rows.length) return '<p class="emptyText">Keine Barkartendaten vorhanden.</p>';
  return `<div class="statList">${rows.slice(0, 16).map(r => `<div class="statRow"><div><b>${esc(r.key)}</b><small>${r.count} Getränke</small></div><strong>${eur(r.value)}</strong></div>`).join('')}</div>`;
}

function comparisonHtml(cmp) {
  return `<div class="card"><h2>Letzter Barkarten-/Paketvergleich</h2><div class="kpiGrid compact">${kpi('Neu / entfernt', `${cmp.newDrinks || 0} / ${cmp.removedDrinks || 0}`, 'Getränke')}${kpi('Preis / Kategorie', `${cmp.priceChanges || 0} / ${cmp.categoryChanges || 0}`, 'Änderungen')}${kpi('Paketstatus', String(cmp.packageChanges || 0), 'Zuordnungen')}${kpi('Gespeichert', cmp.saved ? 'Ja' : 'Nein', cmp.version || '')}</div>${cmp.details?.length ? `<div class="miniList">${cmp.details.slice(0, 16).map(d => `<div><b>${esc(d.name)}</b><small>${esc(d.text)}</small></div>`).join('')}</div>` : ''}</div>`;
}

function migrationSnapshotCardHtml() {
  const snapshot = state.migrationSnapshot;
  if (!snapshot) return '';
  const counts = snapshot.counts || {};
  return `<div class="card migrationSnapshotCard"><div class="sectionHead"><div><h2>v5-Sicherheitskopie</h2><p class="hint">Vor der ersten v5-Datenmigration automatisch lokal erstellt. Sie wird nicht mit der normalen App-Nutzung verändert.</p></div><span class="diagnosticSummary ok">vorhanden</span></div><div class="migrationSnapshotMeta"><span>${esc(snapshot.fromVersion || 'v4')} → ${esc(snapshot.toVersion || APP_VERSION)}</span><span>${esc(formatDateTime(snapshot.createdAt))}</span><span>${Number(counts.logs || 0)} Buchungen · ${Number(counts.persons || 0)} Personen</span></div><button class="secondary dangerText" data-action="restoreV5MigrationSnapshot">Stand vor v5 wiederherstellen</button></div>`;
}

function internalRestorePointsCardHtml() {
  const rows = state.restorePoints || [];
  const list = rows.length ? `<div class="restorePointList">${rows.map(row => {
    const counts = row.counts || {};
    const detail = row.details?.tripName || row.details?.fileName || '';
    return `<article class="restorePointRow"><div class="restorePointCopy"><b>${esc(row.reason || 'Sicherungspunkt')}</b><small>${esc(formatDateTime(row.createdAt))}${detail ? ` · ${esc(detail)}` : ''}</small><span>${Number(counts.trips || 0)} Reisen · ${Number(counts.persons || 0)} Personen · ${Number(counts.logs || 0)} Buchungen</span></div><div class="restorePointActions"><button class="mini" data-action="restoreInternalRestorePoint" data-id="${esc(row.id)}">Wiederherstellen</button><button class="mini dangerText" data-action="deleteInternalRestorePoint" data-id="${esc(row.id)}">Löschen</button></div></article>`;
  }).join('')}</div>` : '<p class="emptyText">Noch keine internen Wiederherstellungspunkte vorhanden.</p>';
  return `<div class="card internalRestoreCard"><div class="sectionHead"><div><h2>Interne Wiederherstellungspunkte</h2><p class="hint">CruiseSip erstellt vor kritischen Änderungen automatisch eine lokale Sicherung. Zusätzlich kann jederzeit manuell gesichert werden.</p></div><span class="diagnosticSummary ${rows.length ? 'ok' : 'neutral'}">${rows.length} / ${INTERNAL_SNAPSHOT_LIMIT}</span></div>${list}<button class="secondary" data-action="createInternalRestorePoint">Jetzt Sicherungspunkt erstellen</button><p class="hint">Gespeichert werden höchstens ${INTERNAL_SNAPSHOT_LIMIT} Stände auf diesem Gerät. Sie werden nicht exportiert und ersetzen kein externes Vollbackup.</p></div>`;
}

function viewSettings() {
  const b = activeBarkarteVersion();
  return `
    <section class="screen">
      <div class="sectionHead"><h1>Einstellungen</h1><span class="subtle">${esc(APP_VERSION)}</span></div>
      ${activeTripContextHtml()}
      <div class="card"><h2>Verwaltung</h2><div class="buttonStack"><button class="secondary" data-route="trips">Reisen verwalten</button><button class="secondary" data-route="devices">Geräte & Personen</button><button class="secondary" data-route="barkarte">Barkarte verwalten</button></div></div>
      <div class="card"><h2>Status</h2>
        ${infoRow('App-Version', APP_VERSION)}
        ${infoRow('Build', APP_BUILD)}
        ${infoRow('Barkarten-Version', b.version || 'unbekannt')}
        ${infoRow('Geräte-ID', state.settings.deviceId || '')}
        ${infoRow('Verbindung', state.online ? 'Online' : 'Offline')}
        <div class="infoRow"><span>Update-Status</span><code id="updateStatusValue">${esc(updateStateLabel())}</code></div>
        ${infoRow('Speicher', 'IndexedDB lokal auf diesem Gerät')}
      </div>
      <div class="card offlineSafetyCard">
        <div class="sectionHead"><div><h2>Offline-Sicherheitsstatus</h2><p class="hint">Prüft Installation, Service Worker, App-Cache und lokalen Datenspeicher.</p></div><span id="offlineDiagnosticsSummary" class="diagnosticSummary ${esc(offlineDiagnosticsSummary().level)}">${esc(offlineDiagnosticsSummary().label)}</span></div>
        <div id="offlineDiagnosticsResults" class="diagnosticList">${offlineDiagnosticsContentHtml()}</div>
        <button id="offlineDiagnosticsButton" class="secondary" data-action="runOfflineDiagnostics" ${offlineDiagnosticsRunning ? 'disabled' : ''}>${offlineDiagnosticsRunning ? 'Prüfung läuft …' : 'Offline-Status prüfen'}</button>
        <p class="hint">Die Diagnose löscht oder verändert keine Reisen und Buchungen. Für den endgültigen Praxistest CruiseSip einmal im Flugmodus vollständig neu öffnen.</p>
      </div>
      ${migrationSnapshotCardHtml()}
      ${internalRestorePointsCardHtml()}
      ${fullBackupCardHtml()}
      ${deviceSyncCardHtml()}
      <div class="card themeCard"><div class="sectionHead"><div><h2>Darstellung</h2><p class="hint">Theme sofort als Live-Vorschau auf diesem Gerät anwenden.</p></div><span class="subtle">${esc(themeLabel())}</span></div>
        <div class="themeGallery" role="group" aria-label="Farbdarstellung wählen">
          ${THEME_OPTIONS.map(option => `<button class="themeOption ${selectedTheme() === option.id ? 'active' : ''}" data-action="setTheme" data-id="${esc(option.id)}" aria-pressed="${selectedTheme() === option.id}"><span class="themePreview themePreview-${esc(option.preview)}" aria-hidden="true"><i></i><i></i><i></i></span><span class="themeOptionText"><b>${esc(option.label)}${option.recommended ? '<em>Empfohlen</em>' : ''}</b><small>${esc(option.description)}</small></span></button>`).join('')}
        </div>
        <div class="effectsSetting"><div><b>Reduzierte Effekte</b><small>Deaktiviert Animationen, stärkere Schatten, Transparenzen und dekorative Verläufe.</small></div><div class="effectsSwitch" role="group" aria-label="Visuelle Effekte wählen"><button class="${state.settings.reducedEffects ? '' : 'active'}" data-action="setReducedEffects" data-id="false" aria-pressed="${state.settings.reducedEffects ? 'false' : 'true'}">Standard</button><button class="${state.settings.reducedEffects ? 'active' : ''}" data-action="setReducedEffects" data-id="true" aria-pressed="${state.settings.reducedEffects ? 'true' : 'false'}">Reduziert</button></div></div>
        <p class="hint">Darstellung und Effekte sind gerätebezogen. Reiseexporte und Zusammenführungsdateien verändern diese Auswahl nicht.</p>
      </div>
      <div class="card"><h2>Aktionen</h2><div class="buttonStack"><button class="secondary" data-action="checkAppUpdate">Jetzt auf Update prüfen</button><button class="secondary" data-route="changelog">Changelog öffnen</button><button class="secondary" data-action="reRunOnboarding">Onboarding erneut anzeigen</button><button class="secondary" data-action="exportFullBackup">Vollständiges Backup exportieren</button></div></div>
      <div class="card"><h2>Offline-Hinweis</h2><p>Für die Kreuzfahrt: App vor Abfahrt einmal online öffnen, über Safari zum Home-Bildschirm hinzufügen, danach kurz im Flugmodus starten und ein vollständiges Backup erstellen.</p></div>
    </section>`;
}
function infoRow(label, value) { return `<div class="infoRow"><span>${esc(label)}</span><code>${esc(value)}</code></div>`; }

function viewChangelog() {
  return `<section class="screen"><div class="sectionHead"><h1>Changelog</h1><button class="mini" data-route="settings">Zurück</button></div><div class="card changelog">${CHANGELOG_HTML}</div></section>`;
}

async function trackDrink(drinkId, personIdsOverride = null) {
  const trip = currentTrip();
  if (!trip || !ensureTripWritable(trip.id, 'Das Erfassen eines Getränks')) return;
  const drink = drinkById(drinkId);
  if (!drink) return;
  const overrideIds = Array.isArray(personIdsOverride) ? new Set(personIdsOverride) : null;
  const persons = overrideIds
    ? currentPersons().filter(person => overrideIds.has(person.id))
    : selectedTrackingPersons();
  if (!persons.length) { alert('Bitte mindestens eine Person auswählen oder anlegen.'); state.route = 'devices'; render(); return; }
  if (persons.some(person => person.tripId !== trip.id)) { alert('Mindestens eine ausgewählte Person gehört nicht zur geöffneten Reise.'); return; }
  const timestamp = Date.now();
  const itineraryContext = itineraryContextForTimestamp(timestamp, trip);
  const logs = persons.map(person => {
    const status = statusForDrink(drink, person.packageId);
    const id = `log_${uid()}`;
    return {
      id,
      mergeKey: `${state.settings.deviceId}:${id}`,
      tripId: trip.id,
      personId: person.id,
      personName: person.name,
      drinkId: drink.id,
      drinkName: drink.name,
      category: drink.category || '',
      price: Number(drink.price) || 0,
      packageId: person.packageId || 'none',
      packageStatus: status,
      barkarteVersionId: tripReferenceVersionId(trip),
      packageVersionId: tripPackageVersionId(trip),
      ts: timestamp,
      ...itineraryContext,
      trackedByDeviceId: state.settings.deviceId,
      trackedByDeviceName: state.settings.deviceName,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  });
  await putRowsAtomic({ logs });
  state.undoLogs = logs;
  state.undoLog = logs[0] || null;
  await loadState();
  if (persons.length === 1) {
    state.selectedPersonId = persons[0].id;
    state.selectedPersonIds = [persons[0].id];
  }
  updateUndoDock();
  scheduleUndoAutoHide();
  toast(persons.length === 1 ? `${drink.name} gespeichert` : `${drink.name} für ${persons.length} Personen gespeichert`);
  haptic();
  if (state.route === 'track') renderTrackPersonContext();
  else render();
}
async function undoLast() {
  const logs = state.undoLogs?.length ? state.undoLogs : (state.undoLog ? [state.undoLog] : []);
  if (!logs.length) return;
  if (!ensureTripWritable(logs[0].tripId || activeTripId(), 'Das Rückgängigmachen einer Buchung')) { clearUndoAutoHide(); state.undoLog = null; state.undoLogs = []; updateUndoDock(); return; }
  clearUndoAutoHide();
  await deleteIdsAtomic('logs', logs.map(log => log.id));
  state.undoLog = null;
  state.undoLogs = [];
  await loadState();
  render();
  toast(logs.length === 1 ? 'Letzter Eintrag wurde entfernt' : `${logs.length} Einträge wurden entfernt`);
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
    state.undoLogs = [];
    updateUndoDock();
    undoAutoHideTimer = null;
  }, 3000);
}
function updateUndoDock() {
  const dock = $('#undoDock');
  if (!dock) return;
  const logs = state.undoLogs?.length ? state.undoLogs : (state.undoLog ? [state.undoLog] : []);
  if (!logs.length) { dock.hidden = true; dock.innerHTML = ''; return; }
  const first = logs[0];
  dock.hidden = false;
  dock.innerHTML = `<div><b>${esc(first.drinkName)}</b><span>${logs.length === 1 ? `${esc(first.personName)} · gerade erfasst` : `${logs.length} Personen · gerade erfasst`}</span></div><button class="mini" data-action="undo">Rückgängig</button>`;
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
  if (!ensureTripWritable(log.tripId || activeTripId(), 'Die Korrektur einer Buchung')) return;
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
  if (!ensureTripWritable(original.tripId || activeTripId(), 'Die Korrektur einer Buchung')) return;
  const person = personById(formValue(form, 'personId'));
  const drink = drinkById(formValue(form, 'drinkId'));
  if (!person) throw new Error('Bitte eine gültige Person auswählen.');
  const originalTripId = original.tripId || activeTripId();
  if (!originalTripId || person.tripId !== originalTripId) throw new Error('Die ausgewählte Person gehört nicht zur Reise dieser Buchung.');
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
  if (!ensureTripWritable(log.tripId || activeTripId(), 'Das Löschen einer Buchung')) return;
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
  if (trip?.archived) { alert('Eine abgeschlossene Reise ist schreibgeschützt. Reaktiviere sie vor einer Bearbeitung.'); return; }
  state.pendingTripVersionChange = null;
  state.editingTripId = trip?.id || null;
  state.formDraft.trip = trip ? { id: trip.id || '', name: trip.name || '', ship: trip.ship || '', startDate: trip.startDate || '', endDate: trip.endDate || '', barkarteVersionId: trip.barkarteVersionId || defaultBarkarteVersionId(), versionChangeMode: 'future' } : {};
  render();
  requestAnimationFrame(() => $('#tripForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
function tripLogsById(tripId) {
  return state.logs.filter(log => (log.tripId || activeTripId()) === tripId);
}
function resolveVersionDrinkForLog(log, version) {
  const drinks = Array.isArray(version?.drinks) ? version.drinks : [];
  const byId = drinks.find(drink => drink.id === log.drinkId);
  if (byId) return { drink: byId, match: 'id' };
  const key = normalize(log.drinkName || '');
  if (!key) return { drink: null, match: 'missing' };
  const matches = drinks.filter(drink => normalize(drink.name) === key);
  if (matches.length === 1) return { drink: matches[0], match: 'name' };
  return { drink: null, match: matches.length > 1 ? 'ambiguous' : 'missing' };
}
function buildTripVersionChangePreview(trip, targetVersionId) {
  const version = referenceVersionById(targetVersionId);
  const persons = new Map(state.persons.map(person => [person.id, person]));
  const items = tripLogsById(trip.id).map(log => {
    const resolved = resolveVersionDrinkForLog(log, version);
    if (!resolved.drink) return { log, status: 'unclear', reason: resolved.match === 'ambiguous' ? 'Name ist in der neuen Barkarte nicht eindeutig.' : 'Getränk ist in der neuen Barkarte nicht vorhanden.' };
    const drink = resolved.drink;
    const person = persons.get(log.personId);
    const packageId = person?.packageId || log.packageId || 'none';
    const nextPrice = Number(drink.price) || 0;
    const nextStatus = statusForDrink(drink, packageId);
    const changes = [];
    if (Math.abs((Number(log.price) || 0) - nextPrice) > 0.0001) changes.push(`Preis ${eur(log.price)} → ${eur(nextPrice)}`);
    if ((log.packageStatus || 'unclear') !== nextStatus) changes.push(`Paketstatus ${statusLabel(log.packageStatus)} → ${statusLabel(nextStatus)}`);
    if (log.drinkId !== drink.id) changes.push('Zuordnung auf die Artikel-ID der neuen Version');
    if ((log.drinkName || '') !== (drink.name || '')) changes.push(`Getränk ${log.drinkName || 'unbekannt'} → ${drink.name || 'unbekannt'}`);
    if ((log.category || '') !== (drink.category || '')) changes.push(`Kategorie ${log.category || 'ohne'} → ${drink.category || 'ohne'}`);
    return { log, drink, packageId, nextPrice, nextStatus, status: changes.length ? 'changed' : 'unchanged', changes, match: resolved.match };
  });
  return {
    tripId: trip.id,
    targetVersionId,
    version: version?.version || targetVersionId,
    total: items.length,
    matched: items.filter(item => item.status !== 'unclear').length,
    changed: items.filter(item => item.status === 'changed').length,
    unchanged: items.filter(item => item.status === 'unchanged').length,
    unclear: items.filter(item => item.status === 'unclear').length,
    items
  };
}
function tripVersionChangePreviewHtml() {
  const pending = state.pendingTripVersionChange;
  if (!pending?.preview) return '';
  const preview = pending.preview;
  const changed = preview.items.filter(item => item.status === 'changed').slice(0, 10);
  const unclear = preview.items.filter(item => item.status === 'unclear').slice(0, 10);
  const details = [
    ...changed.map(item => `<div class="tripVersionReviewItem changed"><b>${esc(item.log.drinkName || 'Unbekanntes Getränk')} · ${esc(item.log.personName || 'Unbekannte Person')}</b><small>${esc(item.changes.join(' · '))}</small></div>`),
    ...unclear.map(item => `<div class="tripVersionReviewItem unclear"><b>${esc(item.log.drinkName || 'Unbekanntes Getränk')} · ${esc(item.log.personName || 'Unbekannte Person')}</b><small>${esc(item.reason)}</small></div>`)
  ].join('');
  return `<div class="card tripVersionReviewCard"><div class="sectionHead"><div><p class="eyebrow">Barkartenwechsel prüfen</p><h2>${esc(pending.trip.name)}</h2><p class="hint">Neue Version: ${esc(preview.version)}. Unklare Buchungen werden niemals automatisch verändert.</p></div><span class="diagnosticSummary ${preview.unclear ? 'warn' : 'ok'}">${preview.unclear ? `${preview.unclear} unklar` : 'eindeutig'}</span></div><div class="closureSummaryGrid"><span><b>${preview.total}</b>Buchungen</span><span><b>${preview.matched}</b>eindeutig zuordenbar</span><span><b>${preview.changed}</b>mit Änderungen</span><span class="${preview.unclear ? 'warnText' : ''}"><b>${preview.unclear}</b>unklar</span></div>${details ? `<div class="tripVersionReviewList">${details}</div>` : '<div class="closureReadyMessage"><b>Keine inhaltlichen Änderungen</b><p>Alle Buchungen stimmen bereits mit der ausgewählten Version überein.</p></div>'}<div class="buttonStack"><button class="primary" data-action="applyTripVersionFuture">Version wechseln · Buchungen unverändert lassen</button><button class="secondary" data-action="applyTripVersionUpdate" ${preview.changed ? '' : 'disabled'}>Eindeutig zuordenbare Buchungen aktualisieren</button><button class="secondary" data-action="cancelTripVersionChange">Zurück zur Reisebearbeitung</button></div></div>`;
}
async function persistTripRecord(trip, message) {
  await put('trips', trip);
  const savedTrip = await get('trips', trip.id);
  if (!savedTrip || savedTrip.id !== trip.id) throw new Error('IndexedDB hat den Reisedatensatz nicht bestätigt.');
  await putSetting('currentTripId', trip.id);
  await putSetting('barkarteVersionId', trip.barkarteVersionId || '');
  state.currentTripId = trip.id;
  state.editingTripId = null;
  state.pendingTripVersionChange = null;
  clearDraft('trip');
  await loadState();
  state.currentTripId = trip.id;
  render();
  toast(message);
}
async function applyPendingTripVersionChange(updateExisting = false) {
  const pending = state.pendingTripVersionChange;
  if (!pending?.trip || !pending.preview) throw new Error('Keine vorbereitete Versionsänderung vorhanden.');
  const current = state.trips.find(row => row.id === pending.trip.id);
  if (!current || current.archived) throw new Error('Die Reise ist nicht mehr bearbeitbar.');
  if (!referenceVersionAvailable(referenceVersionById(pending.trip.barkarteVersionId))) throw new Error('Die ausgewählte Barkartenversion ist nicht mehr verfügbar.');
  await createInternalRestorePoint('Vor dem Wechsel der Barkarten- und Paketversion', { tripId: pending.trip.id, fromVersionId: current.barkarteVersionId || '', toVersionId: pending.trip.barkarteVersionId || '', updateExisting });
  const rows = { trips: [pending.trip] };
  let updatedCount = 0;
  if (updateExisting) {
    rows.logs = pending.preview.items.filter(item => item.status === 'changed' && item.drink).map(item => {
      updatedCount += 1;
      return { ...item.log, drinkId: item.drink.id, drinkName: item.drink.name, category: item.drink.category || '', price: item.nextPrice, packageId: item.packageId, packageStatus: item.nextStatus, barkarteVersionId: pending.trip.barkarteVersionId, packageVersionId: pending.trip.packageVersionId, updatedAt: nowIso() };
    });
  }
  await putRowsAtomic(rows);
  await putSetting('currentTripId', pending.trip.id);
  await putSetting('barkarteVersionId', pending.trip.barkarteVersionId || '');
  state.currentTripId = pending.trip.id;
  state.editingTripId = null;
  state.pendingTripVersionChange = null;
  clearDraft('trip');
  await loadState();
  state.currentTripId = pending.trip.id;
  render();
  toast(updateExisting ? `Barkartenversion gewechselt · ${updatedCount} Buchung${updatedCount === 1 ? '' : 'en'} aktualisiert` : 'Barkartenversion nur für neue Erfassungen gewechselt');
  haptic();
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
    if (existing.id && existing.archived) { alert('Eine abgeschlossene Reise ist schreibgeschützt. Reaktiviere sie vor einer Bearbeitung.'); return; }
    const selectedVersionId = fieldValue('#tripVersionInput', form, 'barkarteVersionId') || defaultBarkarteVersionId();
    const selectedVersion = referenceVersionById(selectedVersionId);
    if (!referenceVersionAvailable(selectedVersion)) throw new Error('Bitte eine verfügbare Barkarten- und Paketversion auswählen.');
    const trip = {
      ...existing,
      id,
      name,
      ship: fieldValue('#tripShipInput', form, 'ship').trim(),
      startDate: fieldValue('#tripStartInput', form, 'startDate'),
      endDate: fieldValue('#tripEndInput', form, 'endDate'),
      barkarteVersionId: selectedVersionId,
      packageVersionId: selectedVersionId,
      archived: !!existing.archived,
      createdAt: existing.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    const versionChanged = !!existing.id && (tripReferenceVersionId(existing) !== selectedVersionId || tripPackageVersionId(existing) !== selectedVersionId);
    const existingLogs = existing.id ? tripLogsById(existing.id) : [];
    const changeMode = formValue(form, 'versionChangeMode') || 'future';
    if (versionChanged && existingLogs.length && changeMode === 'review') {
      state.pendingTripVersionChange = { trip, preview: buildTripVersionChangePreview(trip, selectedVersionId), preparedAt: nowIso() };
      render();
      requestAnimationFrame(() => $('#view')?.scrollTo?.({ top: 0, behavior: 'smooth' }));
      return;
    }
    if (versionChanged && existingLogs.length) {
      await createInternalRestorePoint('Vor dem Wechsel der Barkarten- und Paketversion', { tripId: trip.id, fromVersionId: existing.barkarteVersionId || '', toVersionId: selectedVersionId, updateExisting: false });
    }
    const createdViaWizard = !existing.id && state.tripSetupWizard?.step === 'manual';
    await persistTripRecord(trip, createdViaWizard ? 'Reise angelegt – jetzt Personen einrichten' : (existing.id ? (versionChanged ? 'Reise und Barkartenversion gespeichert' : 'Reiseänderungen gespeichert') : 'Reise angelegt'));
    if (createdViaWizard) {
      state.tripSetupWizard = { step: 'persons', tripId: id, exported: false };
      state.selectedPersonId = null;
      state.route = 'devices';
      render();
    }
  } catch (error) {
    alert(`Reise konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setButtonBusy('#tripSaveButton', false);
  }
}
async function saveOnboardingTrip(form) {
  const current = currentTrip();
  const editableCurrent = current?.archived ? null : current;
  const id = editableCurrent?.id || `trip_${uid()}`;
  const selectedVersionId = formValue(form, 'barkarteVersionId') || editableCurrent?.barkarteVersionId || defaultBarkarteVersionId();
  if (!referenceVersionAvailable(referenceVersionById(selectedVersionId))) throw new Error('Bitte eine verfügbare Barkarten- und Paketversion auswählen.');
  const versionChanged = !!editableCurrent && (tripReferenceVersionId(editableCurrent) !== selectedVersionId || tripPackageVersionId(editableCurrent) !== selectedVersionId);
  if (versionChanged && tripLogsById(editableCurrent.id).length) throw new Error('Für diese Reise bestehen bereits Buchungen. Ändere die Barkartenversion bitte unter „Reisen → Bearbeiten“, damit die Buchungen sicher geprüft werden können.');
  const trip = { ...(editableCurrent || {}), id, name: formValue(form, 'name').trim() || 'Aktuelle Reise', ship: formValue(form, 'ship').trim(), startDate: formValue(form, 'startDate'), endDate: formValue(form, 'endDate'), barkarteVersionId: selectedVersionId, packageVersionId: selectedVersionId, archived: false, createdAt: editableCurrent?.createdAt || nowIso(), updatedAt: nowIso() };
  await put('trips', trip);
  await putSetting('currentTripId', id);
  clearDraft('onboardingTrip');
  await loadState();
  toast('Reise gespeichert');
  render();
}
async function deleteTrip(id) {
  const trip = state.trips.find(t => t.id === id); if (!trip) return;
  const answer = prompt(`Reise „${trip.name}“ mit allen Einträgen löschen?\nZum Bestätigen bitte LÖSCHEN eingeben.`);
  if (answer !== 'LÖSCHEN') return;
  await createInternalRestorePoint('Vor dem Löschen einer Reise', { tripId: id, tripName: trip.name || '' });
  for (const p of state.persons.filter(p => p.tripId === id)) await del('persons', p.id);
  for (const l of state.logs.filter(l => l.tripId === id)) await del('logs', l.id);
  await del('trips', id);
  if (state.tripSetupWizard?.tripId === id) resetTripSetupWizard();
  const remaining = (await all('trips')).filter(t => !t.archived);
  await putSetting('currentTripId', remaining[0]?.id || (await all('trips'))[0]?.id || null);
  await loadState(); render();
}

function fillPersonForm(id) {
  const person = id ? state.persons.find(p => p.id === id) : null;
  if (!ensureTripWritable(person?.tripId || activeTripId(), 'Die Bearbeitung einer Person')) return;
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
    if (!ensureTripWritable(tripId, 'Die Bearbeitung von Personen und Paketdaten')) return;

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
  if (!ensureTripWritable(person.tripId || activeTripId(), 'Das Löschen einer Person')) return;
  const count = state.logs.filter(l => l.personId === id).length;
  if (count) { alert('Diese Person hat Verlaufseinträge. Lösche oder bearbeite zuerst die Einträge im Verlauf.'); return; }
  if (!confirm(`Person „${person.name}“ löschen?`)) return;
  await del('persons', id); await loadState(); render();
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => item === undefined ? 'null' : stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).filter(key => value[key] !== undefined).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
async function sha256Hex(value) {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 wird von diesem Browser nicht unterstützt.');
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function backupPayloadWithoutIntegrity(payload) {
  const copy = { ...payload };
  delete copy.integrity;
  return copy;
}
function settingValueFromRows(rows, id) {
  return (rows || []).find(row => row.id === id)?.value;
}
function fullBackupSummary(snapshot) {
  const favoriteCount = Array.isArray(settingValueFromRows(snapshot.settings, 'favorites')) ? settingValueFromRows(snapshot.settings, 'favorites').length : 0;
  return {
    settings: snapshot.settings.length,
    trips: snapshot.trips.length,
    persons: snapshot.persons.length,
    drinks: snapshot.drinks.length,
    logs: snapshot.logs.length,
    imports: snapshot.imports.length,
    barkarten: snapshot.barkarten.length,
    favorites: favoriteCount,
    manualDrinkOverrides: snapshot.drinks.filter(drink => drink.manualOverride || drink.manualOverrides).length
  };
}
function localBackupFileStamp(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}
async function exportFullBackup() {
  const snapshot = await readAllStoresSnapshot();
  const exportedAt = nowIso();
  const deviceId = settingValueFromRows(snapshot.settings, 'deviceId') || state.settings.deviceId || '';
  const deviceName = settingValueFromRows(snapshot.settings, 'deviceName') || state.settings.deviceName || 'Gerät';
  const payload = {
    type: FULL_BACKUP_TYPE,
    backupFormatVersion: FULL_BACKUP_FORMAT_VERSION,
    app: { name: APP_NAME, version: APP_VERSION, databaseName: DB_NAME, databaseVersion: DB_VERSION },
    exportedAt,
    device: { id: deviceId, name: deviceName },
    summary: fullBackupSummary(snapshot),
    referenceData: { packages: state.packages, activeBarkarteVersion: activeBarkarteVersion() },
    data: Object.fromEntries(STORE_NAMES.map(store => [store, snapshot[store] || []]))
  };
  payload.integrity = { algorithm: 'SHA-256', digest: await sha256Hex(stableStringify(payload)) };
  const result = await saveJsonFile(`CruiseSip_Vollbackup_${safeFile(deviceName)}_${localBackupFileStamp()}.json`, payload, {
    title: 'CruiseSip Vollbackup'
  });
  if (result.cancelled) { toast('Speichern des Vollbackups abgebrochen'); return; }
  await putSetting('lastFullBackupAt', exportedAt);
  toast(result.method === 'share' ? 'Vollbackup zum Speichern bereitgestellt' : 'Vollbackup wurde heruntergeladen');
}
function isPlainRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function meaningfulRow(store, row) {
  const copy = JSON.parse(JSON.stringify(row || {}));
  delete copy.updatedAt;
  if (store === 'logs') delete copy.importedAt;
  return copy;
}
function rowsMeaningfullyEqual(store, left, right) {
  return stableStringify(meaningfulRow(store, left)) === stableStringify(meaningfulRow(store, right));
}
function tripRowForDeviceSync(row) {
  const copy = meaningfulRow('trips', row);
  for (const key of [
    'archived', 'itineraryImportedAt', 'itinerarySource', 'itineraryEditedAt', 'itineraryEditCount', 'itineraryLastRestorePointId',
    'archivedAt', 'archivedByDeviceId', 'archivedByDeviceName', 'closureAppVersion', 'closureBuild',
    'closureSequence', 'closureSnapshot', 'closureValidation', 'closureDigest',
    'reactivatedAt', 'reactivatedByDeviceId', 'reactivatedByDeviceName', 'reactivationRestorePointId'
  ]) delete copy[key];
  return copy;
}
function tripRowsEqualForDeviceSync(left, right) {
  return stableStringify(tripRowForDeviceSync(left)) === stableStringify(tripRowForDeviceSync(right));
}
function logMergeKey(log, fallbackDeviceId = '') {
  if (log?.mergeKey) return String(log.mergeKey);
  const deviceId = log?.trackedByDeviceId || fallbackDeviceId;
  const originId = log?.originId || log?.id;
  return deviceId && originId ? `${deviceId}:${originId}` : '';
}
async function validateFullBackupPayload(payload) {
  const errors = [];
  const warnings = [];
  if (!isPlainRecord(payload)) errors.push('Die Datei enthält kein gültiges Backupobjekt.');
  if (payload?.type !== FULL_BACKUP_TYPE) errors.push('Die Datei ist nicht als vollständiges CruiseSip-Backup gekennzeichnet.');
  if (payload?.backupFormatVersion !== FULL_BACKUP_FORMAT_VERSION) errors.push(`Backupformat ${payload?.backupFormatVersion ?? 'unbekannt'} wird nicht unterstützt.`);
  if (!isPlainRecord(payload?.data)) errors.push('Der Datenbereich des Backups fehlt.');
  for (const store of STORE_NAMES) {
    const rows = payload?.data?.[store];
    if (!Array.isArray(rows)) { errors.push(`Datenbereich „${store}“ fehlt oder ist ungültig.`); continue; }
    const ids = new Set();
    for (const [index, row] of rows.entries()) {
      if (!isPlainRecord(row) || typeof row.id !== 'string' || !row.id.trim()) {
        errors.push(`„${store}“ enthält in Zeile ${index + 1} keinen gültigen Datensatz mit ID.`);
        continue;
      }
      if (ids.has(row.id)) errors.push(`„${store}“ enthält die ID „${row.id}“ mehrfach.`);
      ids.add(row.id);
    }
  }
  if (Array.isArray(payload?.data?.trips) && payload.data.trips.length < 1) errors.push('Das Backup enthält keine Reise.');
  if (Array.isArray(payload?.data?.drinks) && payload.data.drinks.length < 1) errors.push('Das Backup enthält keine Getränkestammdaten.');
  if (Array.isArray(payload?.data?.drinks) && payload.data.drinks.length !== 233) warnings.push(`Das Backup enthält ${payload.data.drinks.length} statt 233 Getränken. Dies kann bei einer später importierten Barkarte beabsichtigt sein.`);

  const tripIds = new Set((payload?.data?.trips || []).map(row => row.id));
  const personIds = new Set((payload?.data?.persons || []).map(row => row.id));
  const drinkIds = new Set((payload?.data?.drinks || []).map(row => row.id));
  for (const version of payload?.data?.barkarten || []) {
    for (const drink of Array.isArray(version.drinks) ? version.drinks : []) if (drink?.id) drinkIds.add(drink.id);
  }
  const barkarteIds = new Set((payload?.data?.barkarten || []).map(row => row.id));
  for (const trip of payload?.data?.trips || []) {
    if (trip.barkarteVersionId && !barkarteIds.has(trip.barkarteVersionId)) errors.push(`Reise „${trip.name || trip.id}“ verweist auf eine nicht vorhandene Barkarten-Version.`);
    if (trip.packageVersionId && !barkarteIds.has(trip.packageVersionId)) errors.push(`Reise „${trip.name || trip.id}“ verweist auf eine nicht vorhandene Paketversion.`);
  }
  for (const person of payload?.data?.persons || []) {
    if (!tripIds.has(person.tripId)) errors.push(`Person „${person.name || person.id}“ verweist auf eine nicht vorhandene Reise.`);
  }
  const allowedStatuses = new Set(['included', 'not_included', 'unclear']);
  const mergeKeys = new Set();
  for (const log of payload?.data?.logs || []) {
    if (!tripIds.has(log.tripId)) errors.push(`Buchung „${log.id}“ verweist auf eine nicht vorhandene Reise.`);
    if (!personIds.has(log.personId)) errors.push(`Buchung „${log.id}“ verweist auf eine nicht vorhandene Person.`);
    if (log.drinkId && !drinkIds.has(log.drinkId)) warnings.push(`Buchung „${log.id}“ verweist auf ein nicht vorhandenes Getränk.`);
    if (!allowedStatuses.has(log.packageStatus)) errors.push(`Buchung „${log.id}“ enthält einen ungültigen Paketstatus.`);
    const key = logMergeKey(log, payload?.device?.id || '');
    if (!key) errors.push(`Buchung „${log.id}“ besitzt keine rekonstruierbare Buchungsidentität.`);
    else if (mergeKeys.has(key)) errors.push(`Das Backup enthält die Buchungs-ID „${key}“ mehrfach.`);
    else mergeKeys.add(key);
  }
  for (const drink of payload?.data?.drinks || []) {
    for (const value of Object.values(drink.packages || {})) {
      if (!allowedStatuses.has(value)) errors.push(`Getränk „${drink.name || drink.id}“ enthält einen ungültigen Paketstatus.`);
    }
  }
  for (const version of payload?.data?.barkarten || []) {
    if (version.dataAvailable === false) continue;
    if (version.drinks !== undefined && !Array.isArray(version.drinks)) errors.push(`Barkarten-Version „${version.version || version.id}“ enthält ungültige Getränkedaten.`);
    if (version.packages !== undefined && !Array.isArray(version.packages)) errors.push(`Barkarten-Version „${version.version || version.id}“ enthält ungültige Paketdefinitionen.`);
  }
  const summary = payload?.summary;
  if (isPlainRecord(summary)) {
    for (const store of STORE_NAMES) {
      if (Number(summary[store]) !== (payload?.data?.[store] || []).length) warnings.push(`Die angegebene Anzahl für „${store}“ stimmt nicht mit dem Dateiinhalt überein.`);
    }
  } else warnings.push('Die Zusammenfassung des Backups fehlt.');
  if (!payload?.integrity || payload.integrity.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/i.test(payload.integrity.digest || '')) {
    errors.push('Die SHA-256-Integritätsprüfung fehlt oder ist ungültig.');
  } else {
    const actualDigest = await sha256Hex(stableStringify(backupPayloadWithoutIntegrity(payload)));
    if (actualDigest.toLowerCase() !== String(payload.integrity.digest).toLowerCase()) errors.push('Die Integritätsprüfung ist fehlgeschlagen. Die Datei wurde verändert oder beschädigt.');
  }
  const exportedTime = Date.parse(payload?.exportedAt || '');
  if (!Number.isFinite(exportedTime)) warnings.push('Der Exportzeitpunkt ist nicht lesbar.');
  return { errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)) };
}
function buildFullBackupPreview(payload, localSnapshot) {
  const preview = { local: {}, backup: {}, additions: {}, duplicates: {}, conflicts: {}, warnings: [] };
  for (const store of STORE_NAMES) {
    preview.local[store] = (localSnapshot[store] || []).length;
    preview.backup[store] = (payload.data[store] || []).length;
    preview.additions[store] = 0;
    preview.duplicates[store] = 0;
    preview.conflicts[store] = 0;
  }
  for (const store of STORE_NAMES.filter(name => name !== 'logs')) {
    const localById = new Map((localSnapshot[store] || []).map(row => [row.id, row]));
    for (const incoming of payload.data[store] || []) {
      const existing = localById.get(incoming.id);
      if (!existing) preview.additions[store] += 1;
      else if (store === 'settings' || rowsMeaningfullyEqual(store, existing, incoming)) preview.duplicates[store] += 1;
      else if (store === 'barkarten') {
        preview.additions[store] += 1;
        preview.warnings.push(`Barkarten-Version „${incoming.version || incoming.id}“ besitzt dieselbe ID wie ein lokaler, inhaltlich abweichender Stand. Beim Ergänzen wird sie mit einer getrennten lokalen ID gespeichert.`);
      } else preview.conflicts[store] += 1;
    }
  }
  const localLogsByKey = new Map((localSnapshot.logs || []).map(log => [logMergeKey(log, state.settings.deviceId || ''), log]));
  for (const incoming of payload.data.logs || []) {
    const key = logMergeKey(incoming, payload.device?.id || '');
    const existing = localLogsByKey.get(key);
    if (!existing) preview.additions.logs += 1;
    else if (rowsMeaningfullyEqual('logs', existing, incoming)) preview.duplicates.logs += 1;
    else preview.conflicts.logs += 1;
  }
  const localPersonKeys = new Map((localSnapshot.persons || []).map(person => [`${person.tripId}|${normalize(person.name)}`, person.id]));
  const personNameCollisions = (payload.data.persons || []).filter(person => {
    const localId = localPersonKeys.get(`${person.tripId}|${normalize(person.name)}`);
    return localId && localId !== person.id;
  }).length;
  if (personNameCollisions) preview.warnings.push(`${personNameCollisions} Person(en) haben denselben Namen in derselben Reise, aber unterschiedliche IDs. Sie werden beim Ergänzen nicht automatisch zusammengeführt.`);
  const localTripKeys = new Map((localSnapshot.trips || []).map(trip => [`${normalize(trip.name)}|${trip.startDate || ''}|${trip.endDate || ''}`, trip.id]));
  const tripNameCollisions = (payload.data.trips || []).filter(trip => {
    const localId = localTripKeys.get(`${normalize(trip.name)}|${trip.startDate || ''}|${trip.endDate || ''}`);
    return localId && localId !== trip.id;
  }).length;
  if (tripNameCollisions) preview.warnings.push(`${tripNameCollisions} Reise(n) wirken inhaltlich gleich, besitzen aber unterschiedliche IDs.`);
  preview.totalAdditions = STORE_NAMES.reduce((sum, store) => sum + preview.additions[store], 0);
  preview.totalDuplicates = STORE_NAMES.reduce((sum, store) => sum + preview.duplicates[store], 0);
  preview.totalConflicts = STORE_NAMES.reduce((sum, store) => sum + preview.conflicts[store], 0);
  return preview;
}
async function prepareFullBackupImport(text, fileName) {
  const payload = JSON.parse(text);
  const validation = await validateFullBackupPayload(payload);
  const localSnapshot = await readAllStoresSnapshot();
  const canPreview = isPlainRecord(payload?.data) && STORE_NAMES.every(store => Array.isArray(payload.data[store]));
  const preview = canPreview ? buildFullBackupPreview(payload, localSnapshot) : null;
  state.pendingBackup = { payload, fileName, validation, preview, preparedAt: nowIso() };
  state.route = 'settings';
  render();
  requestAnimationFrame(() => $('#fullBackupPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  toast(validation.errors.length ? 'Backup enthält Fehler' : 'Backup geprüft – Importvorschau bereit');
}
function cloneRow(row) { return JSON.parse(JSON.stringify(row)); }
function normalizeIncomingLog(log, fallbackDeviceId, usedIds = null) {
  const copy = cloneRow(log);
  const originalId = copy.originId || copy.id;
  copy.trackedByDeviceId = copy.trackedByDeviceId || fallbackDeviceId || 'unknown';
  copy.trackedByDeviceName = copy.trackedByDeviceName || 'Import';
  copy.originId = originalId;
  copy.mergeKey = logMergeKey(copy, fallbackDeviceId);
  if (usedIds && usedIds.has(copy.id)) copy.id = `log_${uid()}`;
  copy.importedAt = nowIso();
  copy.updatedAt = nowIso();
  return copy;
}
async function mergeFullBackup() {
  const pending = state.pendingBackup;
  if (!pending) throw new Error('Keine geprüfte Backupdatei ausgewählt.');
  const validation = await validateFullBackupPayload(pending.payload);
  if (validation.errors.length) throw new Error(validation.errors[0]);
  const incoming = Object.fromEntries(STORE_NAMES.map(store => [store, (pending.payload.data[store] || []).map(cloneRow)]));
  const local = await readAllStoresSnapshot();
  const localReferenceById = new Map((local.barkarten || []).map(row => [row.id, row]));
  const usedReferenceIds = new Set([...(local.barkarten || []).map(row => row.id), ...(incoming.barkarten || []).map(row => row.id)]);
  const referenceIdRemap = new Map();
  for (const version of incoming.barkarten || []) {
    const existing = localReferenceById.get(version.id);
    if (!existing || rowsMeaningfullyEqual('barkarten', existing, version)) continue;
    const originalId = version.id;
    const fingerprint = stableTextHash(stableStringify(meaningfulRow('barkarten', version))).slice(0, 7);
    let replacementId = `${originalId}_backup_${fingerprint}`;
    let sequence = 2;
    while (usedReferenceIds.has(replacementId)) replacementId = `${originalId}_backup_${fingerprint}_${sequence++}`;
    usedReferenceIds.add(replacementId);
    version.id = replacementId;
    version.version = `${version.version || originalId} · Backup-Variante`;
    version.derivedFrom = originalId;
    version.notes = [version.notes, `ID-Kollision beim Vollbackup-Ergänzen; lokaler Stand unter ${originalId} blieb unverändert.`].filter(Boolean).join(' ');
    referenceIdRemap.set(originalId, replacementId);
  }
  if (referenceIdRemap.size) {
    for (const trip of incoming.trips || []) {
      if (referenceIdRemap.has(trip.barkarteVersionId)) trip.barkarteVersionId = referenceIdRemap.get(trip.barkarteVersionId);
      if (referenceIdRemap.has(trip.packageVersionId)) trip.packageVersionId = referenceIdRemap.get(trip.packageVersionId);
    }
    for (const setting of incoming.settings || []) {
      if (['defaultBarkarteVersionId', 'defaultPackageVersionId', 'barkarteVersionId'].includes(setting.id) && referenceIdRemap.has(setting.value)) setting.value = referenceIdRemap.get(setting.value);
      if (setting.id === 'barkarteVersion' && setting.value?.id && referenceIdRemap.has(setting.value.id)) setting.value.id = referenceIdRemap.get(setting.value.id);
    }
  }
  const rows = Object.fromEntries(STORE_NAMES.map(store => [store, []]));
  const finalIds = {};
  for (const store of STORE_NAMES) finalIds[store] = new Set((local[store] || []).map(row => row.id));

  for (const store of ['trips', 'persons', 'drinks', 'imports', 'barkarten']) {
    for (const row of incoming[store] || []) {
      if (!finalIds[store].has(row.id)) {
        rows[store].push(cloneRow(row));
        finalIds[store].add(row.id);
      }
    }
  }
  const finalTripIds = finalIds.trips;
  rows.persons = rows.persons.filter(person => finalTripIds.has(person.tripId));
  const finalPersonIds = new Set([...(local.persons || []).map(row => row.id), ...rows.persons.map(row => row.id)]);
  const finalDrinkIds = new Set([...(local.drinks || []).map(row => row.id), ...rows.drinks.map(row => row.id)]);

  const localSettings = new Map((local.settings || []).map(row => [row.id, row]));
  const protectedSettings = new Set(['deviceId', 'deviceName', 'appVersion', 'currentTripId']);
  for (const setting of incoming.settings || []) {
    if (setting.id === 'favorites') continue;
    if (localSettings.has(setting.id) || protectedSettings.has(setting.id)) continue;
    if (setting.id.startsWith('selectedPersonId:') && setting.value && !finalPersonIds.has(setting.value)) continue;
    rows.settings.push(cloneRow(setting));
    localSettings.set(setting.id, setting);
  }
  const localFavorites = Array.isArray(localSettings.get('favorites')?.value) ? localSettings.get('favorites').value : [];
  const incomingFavorites = Array.isArray(settingValueFromRows(incoming.settings, 'favorites')) ? settingValueFromRows(incoming.settings, 'favorites') : [];
  const mergedFavorites = Array.from(new Set([...localFavorites, ...incomingFavorites])).filter(id => finalDrinkIds.has(id));
  if (stableStringify(mergedFavorites) !== stableStringify(localFavorites)) rows.settings.push({ id: 'favorites', value: mergedFavorites, updatedAt: nowIso() });
  rows.settings.push({ id: 'lastFullBackupImportAt', value: nowIso(), updatedAt: nowIso() });

  const existingMergeKeys = new Set((local.logs || []).map(log => logMergeKey(log, state.settings.deviceId || '')));
  const usedLogIds = new Set((local.logs || []).map(log => log.id));
  let duplicateLogs = 0;
  for (const log of incoming.logs || []) {
    const key = logMergeKey(log, pending.payload.device?.id || '');
    if (existingMergeKeys.has(key)) { duplicateLogs += 1; continue; }
    const normalized = normalizeIncomingLog(log, pending.payload.device?.id || '', usedLogIds);
    if (!finalTripIds.has(normalized.tripId) || !finalPersonIds.has(normalized.personId)) continue;
    rows.logs.push(normalized);
    existingMergeKeys.add(normalized.mergeKey);
    usedLogIds.add(normalized.id);
  }
  const addedCounts = Object.fromEntries(STORE_NAMES.map(store => [store, rows[store].length]));
  const totalAdded = STORE_NAMES.reduce((sum, store) => sum + rows[store].length, 0);
  rows.imports.push({
    id: `import_${uid()}`,
    kind: 'Vollbackup ergänzen',
    fileName: pending.fileName,
    importedAt: nowIso(),
    sourceDeviceId: pending.payload.device?.id || '',
    sourceDeviceName: pending.payload.device?.name || '',
    added: totalAdded,
    duplicates: duplicateLogs,
    conflicts: pending.preview?.totalConflicts || 0,
    details: addedCounts
  });
  if (totalAdded > 0) await createInternalRestorePoint('Vor dem Ergänzen eines Vollbackups', { fileName: pending.fileName, additions: totalAdded });
  await putRowsAtomic(rows);
  state.pendingBackup = null;
  await loadState();
  render();
  toast(`Backup ergänzt: ${rows.logs.length} neue Buchungen, ${duplicateLogs} doppelt`);
}
function prepareReplacementRows(payload, restoreDeviceIdentity) {
  const rows = Object.fromEntries(STORE_NAMES.map(store => [store, (payload.data[store] || []).map(cloneRow)]));
  const settingMap = new Map(rows.settings.map(row => [row.id, row]));
  const backupDeviceId = payload.device?.id || settingMap.get('deviceId')?.value || deviceUid();
  const backupDeviceName = payload.device?.name || settingMap.get('deviceName')?.value || 'Mein iPhone';
  const currentDeviceId = state.settings.deviceId || backupDeviceId;
  const currentDeviceName = state.settings.deviceName || backupDeviceName;
  settingMap.set('deviceId', { id: 'deviceId', value: restoreDeviceIdentity ? backupDeviceId : currentDeviceId, updatedAt: nowIso() });
  settingMap.set('deviceName', { id: 'deviceName', value: restoreDeviceIdentity ? backupDeviceName : currentDeviceName, updatedAt: nowIso() });
  settingMap.set('appVersion', { id: 'appVersion', value: APP_VERSION, updatedAt: nowIso() });
  settingMap.set('lastFullBackupImportAt', { id: 'lastFullBackupImportAt', value: nowIso(), updatedAt: nowIso() });
  const tripIds = new Set(rows.trips.map(row => row.id));
  const personIds = new Set(rows.persons.map(row => row.id));
  const drinkIds = new Set(rows.drinks.map(row => row.id));
  let currentTripId = settingMap.get('currentTripId')?.value;
  if (!tripIds.has(currentTripId)) currentTripId = rows.trips.find(trip => !trip.archived)?.id || rows.trips[0]?.id;
  settingMap.set('currentTripId', { id: 'currentTripId', value: currentTripId, updatedAt: nowIso() });
  const favoriteIds = Array.isArray(settingMap.get('favorites')?.value) ? settingMap.get('favorites').value : [];
  settingMap.set('favorites', { id: 'favorites', value: favoriteIds.filter(id => drinkIds.has(id)), updatedAt: nowIso() });
  for (const [id, setting] of Array.from(settingMap.entries())) {
    if (id.startsWith('selectedPersonId:') && setting.value && !personIds.has(setting.value)) settingMap.delete(id);
  }
  rows.settings = Array.from(settingMap.values());
  const usedIds = new Set();
  rows.logs = rows.logs.map(log => {
    const copy = cloneRow(log);
    copy.mergeKey = logMergeKey(copy, payload.device?.id || '');
    copy.trackedByDeviceId = copy.trackedByDeviceId || payload.device?.id || 'unknown';
    copy.trackedByDeviceName = copy.trackedByDeviceName || payload.device?.name || 'Import';
    if (usedIds.has(copy.id)) copy.id = `log_${uid()}`;
    usedIds.add(copy.id);
    return copy;
  });
  rows.imports.push({
    id: `import_${uid()}`,
    kind: 'Vollbackup wiederhergestellt',
    fileName: state.pendingBackup?.fileName || 'Vollbackup',
    importedAt: nowIso(),
    sourceDeviceId: payload.device?.id || '',
    sourceDeviceName: payload.device?.name || '',
    added: rows.logs.length,
    duplicates: 0
  });
  return rows;
}
async function replaceFullBackup() {
  const pending = state.pendingBackup;
  if (!pending) throw new Error('Keine geprüfte Backupdatei ausgewählt.');
  const confirmation = String($('#fullBackupReplaceConfirmation')?.value || '').trim();
  if (confirmation !== 'DATEN ERSETZEN') {
    alert('Bitte zur Bestätigung exakt „DATEN ERSETZEN“ eingeben.');
    return;
  }
  const validation = await validateFullBackupPayload(pending.payload);
  if (validation.errors.length) throw new Error(validation.errors[0]);
  if (!confirm('Alle derzeit lokalen CruiseSip-Daten werden durch dieses Backup ersetzt. Fortfahren?')) return;
  const restoreDeviceIdentity = !!$('#restoreBackupDeviceIdentity')?.checked;
  const rows = prepareReplacementRows(pending.payload, restoreDeviceIdentity);
  await createInternalRestorePoint('Vor dem vollständigen Ersetzen durch ein Backup', { fileName: pending.fileName });
  await replaceAllStoresAtomic(rows);
  state.pendingBackup = null;
  await loadState();
  alert('Wiederherstellung abgeschlossen. CruiseSip wird jetzt neu geladen.');
  window.location.reload();
}
function backupCountRow(label, localCount, backupCount, additionCount = null) {
  const addition = additionCount === null ? '' : `<small>+${additionCount} beim Ergänzen</small>`;
  return `<div class="backupCountRow"><span>${esc(label)}</span><b>${Number(localCount) || 0}</b><span>→</span><b>${Number(backupCount) || 0}</b>${addition}</div>`;
}
function fullBackupCardHtml() {
  const lastBackup = state.settings.lastFullBackupAt ? formatDateTime(Date.parse(state.settings.lastFullBackupAt)) : 'noch nicht erstellt';
  return `<div class="card fullBackupCard" id="fullBackupCard">
    <div class="sectionHead"><div><h2>Vollständige Datensicherung</h2><p class="hint">Sichert Reisen, Personen, Buchungen, Favoriten, Einstellungen, Geräteinformationen sowie lokale Preis- und Paketänderungen.</p></div><span class="backupFormatBadge">JSON · offline</span></div>
    <div class="infoBox"><span>Letztes Vollbackup</span><b>${esc(lastBackup)}</b></div>
    <div class="buttonStack"><button class="primary" data-action="exportFullBackup">Vollständiges Backup exportieren</button><button class="secondary" data-action="importFullBackup">Vollbackup auswählen und prüfen</button></div>
    <p class="hint">CruiseSip öffnet nach der Erstellung das iOS-Teilen-Menü. Wähle „In Dateien sichern“, um den Zielordner unter „Auf meinem iPhone“, iCloud Drive oder einem eingebundenen Dateidienst festzulegen. Es erfolgt kein automatischer Cloud-Abgleich.</p>
    <div class="backupDeviceHint"><b>Mehrere Geräte vorbereiten</b><p>Das Vollbackup auf dem zweiten Gerät vollständig wiederherstellen und dort die eigene Geräte-ID beibehalten. Dadurch bleiben Reise- und Personen-IDs identisch; anschließend kann jedes Gerät für jede Person Getränke erfassen.</p></div>
    ${fullBackupPreviewHtml()}
  </div>`;
}
function fullBackupPreviewHtml() {
  const pending = state.pendingBackup;
  if (!pending) return '';
  const { payload, validation, preview } = pending;
  const blocked = validation.errors.length > 0;
  const exportedAt = Number.isFinite(Date.parse(payload?.exportedAt || '')) ? new Date(payload.exportedAt).toLocaleString('de-DE') : 'unbekannt';
  const warnings = [...validation.warnings, ...(preview?.warnings || [])];
  return `<div class="fullBackupPreview ${blocked ? 'blocked' : ''}" id="fullBackupPreview">
    <div class="backupPreviewHead"><div><b>${esc(pending.fileName)}</b><small>${esc(payload?.device?.name || 'Unbekanntes Gerät')} · ${esc(exportedAt)} · App ${esc(payload?.app?.version || 'unbekannt')}</small></div><span class="diagnosticSummary ${blocked ? 'bad' : warnings.length ? 'warn' : 'ok'}">${blocked ? 'Import gesperrt' : warnings.length ? 'Geprüft mit Hinweisen' : 'Integrität bestätigt'}</span></div>
    <div class="backupCountLegend"><span></span><b>Lokal</b><span></span><b>Backup</b><small>Ergänzen</small></div>
    <div class="backupCountList">
      ${backupCountRow('Reisen', preview?.local?.trips, preview?.backup?.trips, preview?.additions?.trips)}
      ${backupCountRow('Personen', preview?.local?.persons, preview?.backup?.persons, preview?.additions?.persons)}
      ${backupCountRow('Buchungen', preview?.local?.logs, preview?.backup?.logs, preview?.additions?.logs)}
      ${backupCountRow('Getränke', preview?.local?.drinks, preview?.backup?.drinks, preview?.additions?.drinks)}
      ${backupCountRow('Einstellungen', preview?.local?.settings, preview?.backup?.settings, preview?.additions?.settings)}
    </div>
    <div class="backupPreviewStats"><span><b>${preview?.totalDuplicates || 0}</b> bereits vorhanden</span><span class="${preview?.totalConflicts ? 'warnText' : ''}"><b>${preview?.totalConflicts || 0}</b> Konflikte · lokal bleibt</span></div>
    ${validation.errors.length ? `<div class="backupMessages bad">${validation.errors.map(message => `<p>${esc(message)}</p>`).join('')}</div>` : ''}
    ${warnings.length ? `<div class="backupMessages warn">${warnings.map(message => `<p>${esc(message)}</p>`).join('')}</div>` : ''}
    <div class="backupModeCard"><b>Daten ergänzen</b><p>Fehlende Reisen, Personen und Buchungen werden ergänzt. Vorhandene IDs und lokale Daten bleiben erhalten; doppelte Buchungen werden übersprungen.</p><button class="primary" data-action="mergeFullBackup" ${blocked ? 'disabled' : ''}>Geprüfte Daten ergänzen</button></div>
    <div class="backupModeCard dangerZone"><b>Vorhandene Daten vollständig ersetzen</b><p>Alle lokalen CruiseSip-Daten werden in einer einzigen, atomaren Transaktion durch das Backup ersetzt. Die aktuelle Geräte-ID und der aktuelle Gerätename bleiben standardmäßig erhalten.</p>
      <button class="secondary" data-action="exportFullBackup">Aktuellen Stand vorher sichern</button>
      <label class="checkLine expertCheck"><input id="restoreBackupDeviceIdentity" type="checkbox"> Geräte-ID und Gerätename des Backups ebenfalls wiederherstellen <small>Nur verwenden, wenn das ursprüngliche Gerät nicht mehr parallel genutzt wird.</small></label>
      <div class="formField"><label for="fullBackupReplaceConfirmation">Zur Bestätigung DATEN ERSETZEN eingeben</label><input id="fullBackupReplaceConfirmation" autocomplete="off" autocapitalize="characters" placeholder="DATEN ERSETZEN"></div>
      <button class="dangerButton" data-action="replaceFullBackup" ${blocked ? 'disabled' : ''}>Lokale Daten vollständig ersetzen</button>
    </div>
    <button class="secondary" data-action="cancelFullBackupImport">Importvorschau schließen</button>
  </div>`;
}

async function exportTrip() {
  const trip = currentTrip();
  if (!trip) return;
  const persons = currentPersons().map(cloneRow);
  const logs = currentLogs().map(log => {
    const copy = cloneRow(log);
    copy.mergeKey = logMergeKey(copy, state.settings.deviceId || '');
    return copy;
  });
  const payload = {
    type: TRIP_EXPORT_TYPE,
    exportFormatVersion: TRIP_EXPORT_FORMAT_VERSION,
    app: { name: APP_NAME, version: APP_VERSION },
    exportId: `trip_export_${uid()}`,
    exportedAt: nowIso(),
    device: { id: state.settings.deviceId, name: state.settings.deviceName },
    barkarteVersion: activeBarkarteVersion(),
    referenceDataVersion: cloneRow(activeReferenceVersion()),
    trip: cloneRow(trip),
    persons,
    logs,
    favorites: favoriteIds(),
    summary: { persons: persons.length, logs: logs.length }
  };
  payload.integrity = { algorithm: 'SHA-256', digest: await sha256Hex(stableStringify(tripExportPayloadWithoutIntegrity(payload))) };
  const result = await saveJsonFile(`CruiseSip_${safeFile(trip.name)}_${safeFile(state.settings.deviceName || 'Geraet')}_${localBackupFileStamp()}.json`, payload, {
    title: `CruiseSip Reiseexport – ${trip.name}`
  });
  if (result.cancelled) toast('Speichern des Reiseexports abgebrochen');
  else {
    toast(result.method === 'share' ? 'Reiseexport zum Speichern bereitgestellt' : 'Reiseexport wurde heruntergeladen');
    if (state.tripSetupWizard?.step === 'export' && state.tripSetupWizard?.tripId === trip.id) {
      state.tripSetupWizard = { ...state.tripSetupWizard, exported: true };
      render();
    }
  }
  return result;
}
async function backupTest() {
  const createdAt = nowIso();
  const payload = { type: 'CruiseSipBackupTest', version: APP_VERSION, createdAt, deviceId: state.settings.deviceId, tripId: state.currentTripId, message: 'Backup-Test erfolgreich erstellt.' };
  const result = await saveJsonFile(`CruiseSip_Backup_Test_${new Date().toISOString().slice(0, 10)}.json`, payload, {
    title: 'CruiseSip Backup-Test'
  });
  if (result.cancelled) { toast('Backup-Test abgebrochen'); return; }
  await putSetting('lastBackupTestAt', createdAt);
  toast(result.method === 'share' ? 'Backup-Test zum Speichern bereitgestellt' : 'Backup-Test wurde heruntergeladen');
}
function jsonFileCandidates(filename, jsonText) {
  if (typeof File !== 'function') return [];
  const options = { lastModified: Date.now() };
  return [
    new File([jsonText], filename, { ...options, type: 'application/json' }),
    new File([jsonText], filename, { ...options, type: 'text/plain' })
  ];
}
function downloadableJsonBlob(jsonText) {
  return new Blob([jsonText], { type: 'application/json' });
}
function downloadJsonText(filename, jsonText) {
  const blob = downloadableJsonBlob(jsonText);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function saveJsonFile(filename, payload, options = {}) {
  const jsonText = JSON.stringify(payload, null, 2);
  const files = jsonFileCandidates(filename, jsonText);
  if (typeof navigator.share === 'function' && files.length) {
    let shareFile = null;
    for (const file of files) {
      try {
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
          shareFile = file;
          break;
        }
      } catch (_) {}
    }
    if (shareFile) {
      try {
        const shareData = { files: [shareFile] };
        if (options.title) shareData.title = options.title;
        await navigator.share(shareData);
        return { method: 'share', cancelled: false };
      } catch (error) {
        if (error?.name === 'AbortError') return { method: 'share', cancelled: true };
        console.warn('Dateifreigabe nicht verfügbar, verwende Download-Fallback.', error);
      }
    }
  }
  downloadJsonText(filename, jsonText);
  return { method: 'download', cancelled: false };
}
function textFileCandidates(filename, text, mimeTypes = ['text/plain;charset=utf-8']) {
  if (typeof File !== 'function') return [];
  const options = { lastModified: Date.now() };
  return mimeTypes.map(type => new File([text], filename, { ...options, type }));
}
function downloadTextFile(filename, text, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function saveTextFile(filename, text, mimeTypes = ['text/plain;charset=utf-8'], options = {}) {
  const files = textFileCandidates(filename, text, mimeTypes);
  if (typeof navigator.share === 'function' && files.length) {
    let shareFile = null;
    for (const file of files) {
      try {
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) { shareFile = file; break; }
      } catch (_) {}
    }
    if (shareFile) {
      try {
        const shareData = { files: [shareFile] };
        if (options.title) shareData.title = options.title;
        await navigator.share(shareData);
        return { method: 'share', cancelled: false };
      } catch (error) {
        if (error?.name === 'AbortError') return { method: 'share', cancelled: true };
        console.warn('Dateifreigabe nicht verfügbar, verwende Download-Fallback.', error);
      }
    }
  }
  downloadTextFile(filename, text, mimeTypes[0]);
  return { method: 'download', cancelled: false };
}
function safeFile(value) { return String(value || 'Reise').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'Reise'; }
function tripExportPayloadWithoutIntegrity(payload) {
  const copy = { ...payload };
  delete copy.integrity;
  return copy;
}
function isSupportedTripExport(payload) {
  return payload?.type === TRIP_EXPORT_TYPE || payload?.type === LEGACY_TRIP_EXPORT_TYPE;
}
async function validateTripExportPayload(payload, fileName = 'Geräteexport') {
  const errors = [];
  const warnings = [];
  if (!isPlainRecord(payload) || !isSupportedTripExport(payload)) errors.push(`${fileName}: Keine gültige CruiseSip-Reiseexportdatei.`);
  const isV2 = payload?.type === TRIP_EXPORT_TYPE;
  if (isV2 && payload.exportFormatVersion !== TRIP_EXPORT_FORMAT_VERSION) errors.push(`${fileName}: Exportformat ${payload.exportFormatVersion ?? 'unbekannt'} wird nicht unterstützt.`);
  if (!isPlainRecord(payload?.trip) || typeof payload.trip.id !== 'string' || !payload.trip.id.trim()) errors.push(`${fileName}: Die Reise besitzt keine stabile ID.`);
  if (!Array.isArray(payload?.persons)) errors.push(`${fileName}: Personenliste fehlt.`);
  if (!Array.isArray(payload?.logs)) errors.push(`${fileName}: Buchungsliste fehlt.`);
  if (!payload?.device?.id) errors.push(`${fileName}: Geräte-ID fehlt; eine sichere Dublettenprüfung ist nicht möglich.`);
  const personIds = new Set();
  for (const person of payload?.persons || []) {
    if (!isPlainRecord(person) || typeof person.id !== 'string' || !person.id.trim()) { errors.push(`${fileName}: Eine Person besitzt keine stabile ID.`); continue; }
    if (personIds.has(person.id)) errors.push(`${fileName}: Personen-ID „${person.id}“ ist mehrfach enthalten.`);
    personIds.add(person.id);
    if (person.tripId && person.tripId !== payload.trip?.id) errors.push(`${fileName}: Person „${person.name || person.id}“ ist einer anderen Reise zugeordnet.`);
  }
  const mergeKeys = new Set();
  for (const log of payload?.logs || []) {
    if (!isPlainRecord(log) || typeof log.id !== 'string' || !log.id.trim()) { errors.push(`${fileName}: Eine Buchung besitzt keine ID.`); continue; }
    if (log.tripId && log.tripId !== payload.trip?.id) errors.push(`${fileName}: Eine Buchung ist einer anderen Reise zugeordnet.`);
    if (!personIds.has(log.personId)) errors.push(`${fileName}: Buchung „${log.id}“ verweist auf eine nicht enthaltene Person.`);
    const key = logMergeKey(log, payload.device?.id || '');
    if (!key) errors.push(`${fileName}: Buchung „${log.id}“ besitzt keinen stabilen Merge-Key.`);
    else if (mergeKeys.has(key)) errors.push(`${fileName}: Merge-Key „${key}“ ist mehrfach enthalten.`);
    else mergeKeys.add(key);
  }
  if (payload?.referenceDataVersion !== undefined) {
    const reference = payload.referenceDataVersion;
    if (!isPlainRecord(reference) || typeof reference.id !== 'string' || !reference.id.trim()) errors.push(`${fileName}: Die mitgelieferte Barkarten-Version besitzt keine stabile ID.`);
    if (!Array.isArray(reference?.drinks) || !reference.drinks.length) errors.push(`${fileName}: Die mitgelieferte Barkarten-Version enthält keine Getränke.`);
    if (!Array.isArray(reference?.packages) || !reference.packages.length) warnings.push(`${fileName}: Die mitgelieferte Version enthält keine eigenen Paketdefinitionen; vorhandene Paketnamen werden verwendet.`);
    if (payload.trip?.barkarteVersionId && reference?.id && payload.trip.barkarteVersionId !== reference.id) warnings.push(`${fileName}: Reise und mitgelieferte Barkarten-Version verwenden unterschiedliche IDs.`);
  }
  if (isV2) {
    if (payload?.integrity?.algorithm !== 'SHA-256' || !payload?.integrity?.digest) errors.push(`${fileName}: Integritätsprüfung fehlt.`);
    else {
      const actual = await sha256Hex(stableStringify(tripExportPayloadWithoutIntegrity(payload)));
      if (actual !== payload.integrity.digest) errors.push(`${fileName}: Integritätsprüfung fehlgeschlagen.`);
    }
  } else {
    warnings.push(`${fileName}: Älterer Reiseexport ohne Prüfsumme; Import wird kompatibel durchgeführt.`);
  }
  return { errors, warnings, isV2 };
}
function canonicalTripLog(log) {
  const copy = cloneRow(log);
  delete copy.id;
  delete copy.originId;
  delete copy.mergeKey;
  delete copy.importedAt;
  delete copy.updatedAt;
  delete copy.personName;
  delete copy.trackedByDeviceName;
  return copy;
}
function tripLogsEqual(left, right) {
  return stableStringify(canonicalTripLog(left)) === stableStringify(canonicalTripLog(right));
}
function stableTextHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function tripConflictDetail(type, fileName, payload, localRow, incomingRow, message) {
  const deviceName = payload?.device?.name || 'Unbekanntes Gerät';
  const rowIdentity = type === 'log' || type === 'reference'
    ? logMergeKey(incomingRow, payload?.device?.id || '') || incomingRow?.id || 'unknown'
    : incomingRow?.id || localRow?.id || 'unknown';
  const detail = {
    id: `conflict_${stableTextHash(`${type}|${fileName}|${payload?.exportId || ''}|${rowIdentity}`)}`,
    type,
    fileName,
    deviceName,
    deviceId: payload?.device?.id || '',
    message,
    targetKey: `${type === 'reference' ? 'reference' : type}:${rowIdentity}`,
    resolvable: type !== 'reference',
    localRow: localRow ? cloneRow(localRow) : null,
    incomingRow: incomingRow ? cloneRow(incomingRow) : null
  };
  if (type === 'person' && localRow?.tripId !== incomingRow?.tripId) detail.resolvable = false;
  if (type === 'trip') {
    detail.title = incomingRow?.name || incomingRow?.id || 'Reise';
    detail.local = `${localRow?.name || 'Unbenannt'} · ${formatDate(localRow?.startDate)} bis ${formatDate(localRow?.endDate)} · ${tripItinerary(localRow).length} Routentage`;
    detail.incoming = `${incomingRow?.name || 'Unbenannt'} · ${formatDate(incomingRow?.startDate)} bis ${formatDate(incomingRow?.endDate)} · ${tripItinerary(incomingRow).length} Routentage`;
  } else if (type === 'person') {
    detail.title = incomingRow?.name || incomingRow?.id || 'Person';
    detail.local = `${localRow?.name || 'Unbenannt'} · ${packageName(localRow?.packageId || 'none')} · ${eur(localRow?.packagePrice)}`;
    detail.incoming = `${incomingRow?.name || 'Unbenannt'} · ${packageName(incomingRow?.packageId || 'none')} · ${eur(incomingRow?.packagePrice)}`;
  } else if (type === 'log') {
    detail.title = incomingRow?.drinkName || incomingRow?.id || 'Buchung';
    detail.local = `${localRow?.personName || 'Unbekannt'} · ${formatDateTime(localRow?.ts)} · ${eur(localRow?.price)} · ${statusLabel(localRow?.packageStatus)}`;
    detail.incoming = `${incomingRow?.personName || 'Unbekannt'} · ${formatDateTime(incomingRow?.ts)} · ${eur(incomingRow?.price)} · ${statusLabel(incomingRow?.packageStatus)}`;
  } else {
    detail.title = incomingRow?.drinkName || incomingRow?.name || incomingRow?.id || 'Datensatz';
    detail.local = localRow ? 'lokaler Datensatz vorhanden' : 'nicht vorhanden';
    detail.incoming = message || 'Import kann nicht sicher zugeordnet werden';
  }
  return detail;
}
function tripImportPlanSignature(plan) {
  return stableStringify({
    localFingerprint: plan.localFingerprint,
    summary: plan.summary,
    files: plan.fileSummaries.map(row => ({ fileName: row.fileName, added: row.added, duplicates: row.duplicates, conflicts: row.conflicts })),
    additions: {
      trips: (plan.rows.trips || []).map(row => row.id).sort(),
      persons: (plan.rows.persons || []).map(row => row.id).sort(),
      logs: (plan.rows.logs || []).map(row => logMergeKey(row, row.trackedByDeviceId || '')).sort(),
      barkarten: (plan.rows.barkarten || []).map(row => row.id).sort()
    },
    conflicts: plan.conflicts.map(row => ({ type: row.type, fileName: row.fileName, title: row.title, local: row.local, incoming: row.incoming }))
  });
}
function tripImportLocalFingerprint(local) {
  return stableStringify({
    trips: (local.trips || []).map(row => meaningfulRow('trips', row)).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    persons: (local.persons || []).map(row => meaningfulRow('persons', row)).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    logs: (local.logs || []).map(row => ({ key: logMergeKey(row, row.trackedByDeviceId || ''), data: canonicalTripLog(row) })).sort((a, b) => String(a.key).localeCompare(String(b.key))),
    barkarten: (local.barkarten || []).map(row => ({ id: row.id, version: row.version, count: row.count, packageCount: row.packageCount, updatedAt: row.updatedAt || row.importedAt || '' })).sort((a, b) => String(a.id).localeCompare(String(b.id)))
  });
}
async function buildTripImportPlan(parsed, local) {
  const rows = Object.fromEntries(STORE_NAMES.map(store => [store, []]));
  const tripById = new Map((local.trips || []).map(row => [row.id, row]));
  const personById = new Map((local.persons || []).map(row => [row.id, row]));
  const referenceById = new Map((local.barkarten || []).map(row => [row.id, row]));
  const logByKey = new Map((local.logs || []).map(row => [logMergeKey(row, state.settings.deviceId || ''), row]));
  const usedLogIds = new Set((local.logs || []).map(row => row.id));
  const summary = { files: parsed.length, trips: 0, persons: 0, logs: 0, referenceVersions: 0, duplicates: 0, changedLogs: 0, conflicts: 0, blockedConflicts: 0, nameWarnings: 0, legacyFiles: 0, archivedTripLogs: 0 };
  const fileSummaries = [];
  const conflicts = [];
  const warnings = [];
  const importedTripIds = [];

  for (const { fileName, payload, validation } of parsed) {
    if (!validation.isV2) summary.legacyFiles += 1;
    warnings.push(...validation.warnings);
    const trip = cloneRow(payload.trip);
    const incomingReferenceRaw = payload.referenceDataVersion;
    let incomingReference = null;
    let referenceAdded = false;
    if (isPlainRecord(incomingReferenceRaw) && incomingReferenceRaw.id && Array.isArray(incomingReferenceRaw.drinks) && incomingReferenceRaw.drinks.length) {
      incomingReference = buildReferenceVersionRecord({
        ...incomingReferenceRaw,
        id: incomingReferenceRaw.id,
        version: incomingReferenceRaw.version || incomingReferenceRaw.id,
        source: incomingReferenceRaw.source || `${fileName} · Geräteexport`,
        drinks: incomingReferenceRaw.drinks,
        packages: incomingReferenceRaw.packages || state.staticPackages
      });
      const originalReferenceId = incomingReference.id;
      const existingReference = referenceById.get(originalReferenceId);
      if (!existingReference) {
        rows.barkarten.push(incomingReference);
        referenceById.set(incomingReference.id, incomingReference);
        summary.referenceVersions += 1;
        referenceAdded = true;
      } else if (!rowsMeaningfullyEqual('barkarten', existingReference, incomingReference)) {
        const fingerprint = stableTextHash(stableStringify(meaningfulRow('barkarten', incomingReference))).slice(0, 7);
        let collisionId = `${originalReferenceId}_import_${fingerprint}`;
        let sequence = 2;
        while (referenceById.has(collisionId)) collisionId = `${originalReferenceId}_import_${fingerprint}_${sequence++}`;
        incomingReference = {
          ...incomingReference,
          id: collisionId,
          version: `${incomingReference.version} · importierte Variante`,
          derivedFrom: originalReferenceId,
          notes: [incomingReference.notes, `ID-Kollision beim Import aus ${fileName}; lokaler Stand unter ${originalReferenceId} blieb unverändert.`].filter(Boolean).join(' ')
        };
        rows.barkarten.push(incomingReference);
        referenceById.set(incomingReference.id, incomingReference);
        summary.referenceVersions += 1;
        referenceAdded = true;
        if (!trip.barkarteVersionId || trip.barkarteVersionId === originalReferenceId) trip.barkarteVersionId = incomingReference.id;
        if (!trip.packageVersionId || trip.packageVersionId === originalReferenceId) trip.packageVersionId = incomingReference.id;
        warnings.push(`${fileName}: Die Versions-ID „${originalReferenceId}“ war lokal bereits mit abweichendem Inhalt vorhanden. CruiseSip hat die importierte Variante getrennt als „${incomingReference.id}“ gespeichert.`);
      }
      trip.barkarteVersionId = trip.barkarteVersionId || incomingReference.id;
      trip.packageVersionId = trip.packageVersionId || incomingReference.id;
    }
    trip.barkarteVersionId = trip.barkarteVersionId || defaultBarkarteVersionId();
    trip.packageVersionId = trip.packageVersionId || trip.barkarteVersionId || defaultPackageVersionId();
    const tripId = trip.id;
    importedTripIds.push(tripId);
    const existingTrip = tripById.get(tripId);
    const locallyArchived = !!existingTrip?.archived;
    const fileSummary = {
      fileName,
      deviceId: payload.device?.id || '',
      deviceName: payload.device?.name || 'Unbekanntes Gerät',
      tripId,
      exportId: payload.exportId || '',
      tripName: trip.name || 'Unbenannte Reise',
      exportedAt: payload.exportedAt || '',
      persons: (payload.persons || []).length,
      logs: (payload.logs || []).length,
      addedTrips: 0,
      addedPersons: 0,
      addedLogs: 0,
      addedReferenceVersions: referenceAdded ? 1 : 0,
      duplicates: 0,
      changedLogs: 0,
      conflicts: 0,
      blockedConflicts: 0,
      archivedTripLogs: 0,
      legacy: !validation.isV2
    };
    const blockedPersonIds = new Set();
    if (!existingTrip) {
      trip.createdAt = trip.createdAt || nowIso();
      trip.updatedAt = trip.updatedAt || nowIso();
      rows.trips.push(trip);
      tripById.set(tripId, trip);
      summary.trips += 1;
      fileSummary.addedTrips += 1;
    } else if (!tripRowsEqualForDeviceSync(existingTrip, trip)) {
      summary.conflicts += 1;
      fileSummary.conflicts += 1;
      const conflict = tripConflictDetail('trip', fileName, payload, existingTrip, trip, 'Reise mit gleicher ID besitzt abweichende Stammdaten oder einen abweichenden Reiseverlauf.');
      if (locallyArchived) {
        conflict.resolvable = false;
        conflict.message += ' Die lokal abgeschlossene Reise ist schreibgeschützt und muss vor Änderungen reaktiviert werden.';
        summary.blockedConflicts += 1;
        fileSummary.blockedConflicts += 1;
      }
      conflicts.push(conflict);
    }

    for (const incomingPerson of payload.persons || []) {
      const person = cloneRow(incomingPerson);
      person.tripId = tripId;
      const existingPerson = personById.get(person.id);
      if (!existingPerson) {
        if (locallyArchived) {
          blockedPersonIds.add(person.id);
          summary.conflicts += 1; summary.blockedConflicts += 1; fileSummary.conflicts += 1; fileSummary.blockedConflicts += 1;
          conflicts.push(tripConflictDetail('reference', fileName, payload, null, person, 'Die lokal abgeschlossene Reise ist schreibgeschützt. Die neue Person wird erst nach einer Reaktivierung übernommen.'));
          continue;
        }
        const sameName = Array.from(personById.values()).find(row => row.tripId === tripId && normalize(row.name) === normalize(person.name) && row.id !== person.id);
        if (sameName) {
          summary.nameWarnings += 1;
          warnings.push(`${fileName}: „${person.name || 'Unbenannt'}“ hat denselben Namen wie eine vorhandene Person, aber eine andere ID. Beide Personen bleiben getrennt.`);
        }
        person.createdAt = person.createdAt || nowIso();
        person.updatedAt = person.updatedAt || nowIso();
        rows.persons.push(person);
        personById.set(person.id, person);
        summary.persons += 1;
        fileSummary.addedPersons += 1;
      } else if (existingPerson.tripId !== tripId || !rowsMeaningfullyEqual('persons', existingPerson, person)) {
        summary.conflicts += 1;
        fileSummary.conflicts += 1;
        const conflict = tripConflictDetail('person', fileName, payload, existingPerson, person, existingPerson.tripId !== tripId
          ? 'Die Personen-ID ist lokal einer anderen Reise zugeordnet. Buchungen für diese Person werden aus dieser Datei nicht übernommen.'
          : 'Person mit gleicher ID besitzt abweichende Stammdaten. Der lokale Personenstand bleibt erhalten; neue Buchungen können weiterhin dieser Person zugeordnet werden.');
        if (locallyArchived || existingPerson.tripId !== tripId) {
          blockedPersonIds.add(person.id);
          conflict.resolvable = false;
          conflict.message += locallyArchived ? ' Die lokal abgeschlossene Reise ist schreibgeschützt und muss vor Personenänderungen reaktiviert werden.' : '';
          summary.blockedConflicts += 1;
          fileSummary.blockedConflicts += 1;
        }
        conflicts.push(conflict);
      }
    }

    for (const incomingLog of payload.logs || []) {
      const key = logMergeKey(incomingLog, payload.device?.id || '');
      const existingLog = logByKey.get(key);
      if (existingLog) {
        if (tripLogsEqual(existingLog, incomingLog)) {
          summary.duplicates += 1;
          fileSummary.duplicates += 1;
        } else {
          summary.conflicts += 1;
          summary.changedLogs += 1;
          fileSummary.conflicts += 1;
          fileSummary.changedLogs += 1;
          const conflict = tripConflictDetail('log', fileName, payload, existingLog, incomingLog, 'Buchung mit gleichem Merge-Key wurde auf mindestens einem Gerät verändert.');
          const incomingPerson = personById.get(incomingLog.personId);
          if (locallyArchived || blockedPersonIds.has(incomingLog.personId) || !incomingPerson || incomingPerson.tripId !== tripId || (incomingLog.tripId && incomingLog.tripId !== tripId)) {
            conflict.resolvable = false;
            conflict.message += locallyArchived ? ' Die lokal abgeschlossene Reise ist schreibgeschützt; die importierte Änderung wird erst nach einer Reaktivierung übernehmbar.' : ' Die importierte Version besitzt keine sicher verwendbare Reise- oder Personenzuordnung und bleibt deshalb gesperrt.';
            summary.blockedConflicts += 1;
            fileSummary.blockedConflicts += 1;
          }
          conflicts.push(conflict);
        }
        continue;
      }
      if (blockedPersonIds.has(incomingLog.personId)) {
        summary.conflicts += 1;
        summary.blockedConflicts += 1;
        fileSummary.conflicts += 1;
        fileSummary.blockedConflicts += 1;
        conflicts.push(tripConflictDetail('reference', fileName, payload, personById.get(incomingLog.personId), incomingLog, 'Die Personen-ID ist lokal einer anderen Reise zugeordnet. Diese Buchung wird nicht übernommen.'));
        continue;
      }
      if (!tripById.has(tripId)) {
        summary.conflicts += 1;
        summary.blockedConflicts += 1;
        fileSummary.conflicts += 1;
        fileSummary.blockedConflicts += 1;
        conflicts.push(tripConflictDetail('reference', fileName, payload, null, incomingLog, 'Die zugehörige Reise ist nicht verfügbar.'));
        continue;
      }
      if (!personById.has(incomingLog.personId)) {
        summary.conflicts += 1;
        summary.blockedConflicts += 1;
        fileSummary.conflicts += 1;
        fileSummary.blockedConflicts += 1;
        conflicts.push(tripConflictDetail('reference', fileName, payload, null, incomingLog, 'Die zugehörige Person ist nicht verfügbar.'));
        continue;
      }
      if (locallyArchived) {
        summary.archivedTripLogs += 1; fileSummary.archivedTripLogs += 1;
        summary.conflicts += 1; summary.blockedConflicts += 1; fileSummary.conflicts += 1; fileSummary.blockedConflicts += 1;
        conflicts.push(tripConflictDetail('reference', fileName, payload, null, incomingLog, 'Die lokal abgeschlossene Reise ist schreibgeschützt. Diese neue Buchung wird nicht übernommen; reaktiviere die Reise und starte den Import erneut.'));
        continue;
      }
      const log = normalizeIncomingLog(incomingLog, payload.device?.id || '', usedLogIds);
      log.tripId = tripId;
      log.personId = incomingLog.personId;
      log.personName = personById.get(log.personId)?.name || log.personName;
      log.trackedByDeviceId = incomingLog.trackedByDeviceId || payload.device?.id || 'unknown';
      log.trackedByDeviceName = incomingLog.trackedByDeviceName || payload.device?.name || 'Import';
      rows.logs.push(log);
      logByKey.set(key, log);
      usedLogIds.add(log.id);
      summary.logs += 1;
      fileSummary.addedLogs += 1;
    }
    fileSummary.added = fileSummary.addedTrips + fileSummary.addedPersons + fileSummary.addedLogs + fileSummary.addedReferenceVersions;
    if (fileSummary.archivedTripLogs) warnings.push(`${fileName}: ${fileSummary.archivedTripLogs} neue Buchung${fileSummary.archivedTripLogs === 1 ? '' : 'en'} für eine lokal abgeschlossene Reise wurde blockiert. Reaktiviere die Reise und importiere erneut.`);
    fileSummaries.push(fileSummary);
  }

  const currentId = activeTripId();
  if (!currentId && importedTripIds[0]) rows.settings.push({ id: 'currentTripId', value: importedTripIds[0], updatedAt: nowIso() });
  return { rows, summary, fileSummaries, conflicts, warnings: Array.from(new Set(warnings)), parsed, localFingerprint: tripImportLocalFingerprint(local) };
}
async function parseTripImportFiles(files) {
  const parsed = [];
  for (const file of files) {
    let payload;
    try { payload = JSON.parse(await file.text()); }
    catch (_) { throw new Error(`Die Datei „${file.name}“ enthält kein gültiges JSON.`); }
    const validation = await validateTripExportPayload(payload, file.name);
    if (validation.errors.length) throw new Error(validation.errors[0]);
    parsed.push({ fileName: file.name, payload, validation });
  }
  return parsed;
}
function defaultTripConflictResolutions(plan, previous = {}) {
  const result = {};
  for (const conflict of plan.conflicts || []) result[conflict.id] = conflict.resolvable && previous[conflict.id] === 'incoming' ? 'incoming' : 'local';
  return result;
}
async function prepareTripImportFiles(files) {
  const parsed = await parseTripImportFiles(files);
  const plan = await buildTripImportPlan(parsed, await readAllStoresSnapshot());
  state.pendingTripImport = { parsed, plan, signature: tripImportPlanSignature(plan), resolutions: defaultTripConflictResolutions(plan), preparedAt: nowIso() };
  render();
  requestAnimationFrame(() => $('#tripImportPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  toast('Geräteexporte geprüft – noch keine Daten importiert');
}
function tripImportFileHtml(row) {
  const exportedAt = Number.isFinite(Date.parse(row.exportedAt || '')) ? new Date(row.exportedAt).toLocaleString('de-DE') : 'Zeitpunkt unbekannt';
  return `<div class="tripImportFile">
    <div class="tripImportFileHead"><div><b>${esc(row.deviceName)}</b><small>${esc(row.tripName)} · ${esc(exportedAt)}</small></div><span class="diagnosticSummary ${row.conflicts ? 'warn' : 'ok'}">${row.conflicts ? `${row.conflicts} Konflikt${row.conflicts === 1 ? '' : 'e'}` : 'Geprüft'}</span></div>
    <div class="tripImportFileCounts"><span><b>+${row.addedLogs}</b> neu</span><span><b>${row.changedLogs || 0}</b> geändert</span><span><b>${row.duplicates}</b> doppelt</span></div>
    ${row.addedPersons || row.addedTrips || row.addedReferenceVersions ? `<small class="tripImportReferenceCounts">Zusätzlich: ${row.addedTrips || 0} Reise(n) · ${row.addedPersons || 0} Person(en) · ${row.addedReferenceVersions || 0} Barkarten-Version(en)</small>` : ''}
    ${row.archivedTripLogs ? `<div class="archivedImportWarning">${row.archivedTripLogs} Buchung${row.archivedTripLogs === 1 ? '' : 'en'} durch Archivschutz blockiert</div>` : ''}
    <small class="tripImportFileName">${esc(row.fileName)}${row.legacy ? ' · älteres Exportformat' : ''}</small>
  </div>`;
}
function conflictResolutionFor(conflict) {
  if (!conflict.resolvable) return 'blocked';
  return state.pendingTripImport?.resolutions?.[conflict.id] === 'incoming' ? 'incoming' : 'local';
}
function tripConflictHtml(row) {
  const typeLabel = row.type === 'trip' ? 'Reise' : row.type === 'person' ? 'Person' : row.type === 'log' ? 'Geänderte Buchung' : 'Nicht sichere Zuordnung';
  const resolution = conflictResolutionFor(row);
  const resolutionLabel = resolution === 'incoming' ? 'Importiert gewählt' : resolution === 'blocked' ? 'Nicht übernehmbar' : 'Lokal gewählt';
  const choices = row.resolvable
    ? `<div class="tripConflictChoices" role="group" aria-label="Version auswählen"><button class="${resolution === 'local' ? 'selected' : ''}" data-action="setTripConflictResolution" data-id="${esc(row.id)}" data-value="local">Lokale Version</button><button class="${resolution === 'incoming' ? 'selected' : ''}" data-action="setTripConflictResolution" data-id="${esc(row.id)}" data-value="incoming">Importierte Version</button></div>`
    : `<div class="tripConflictBlocked">Dieser Datensatz kann wegen einer unsicheren Reise- oder Personenzuordnung nicht automatisch übernommen werden.</div>`;
  return `<details class="tripConflictItem ${resolution}"><summary><span><b>${esc(typeLabel)}: ${esc(row.title)}</b><small>${esc(row.deviceName)} · ${esc(row.fileName)}</small></span><strong>${esc(resolutionLabel)}</strong></summary><div class="tripConflictCompare"><div class="${resolution === 'local' ? 'chosen' : ''}"><span>Lokal</span><p>${esc(row.local)}</p></div><div class="${resolution === 'incoming' ? 'chosen' : ''}"><span>Export</span><p>${esc(row.incoming)}</p></div></div>${choices}<p class="tripConflictMessage">${esc(row.message)}</p></details>`;
}
function tripResolutionSummary(plan, resolutions = {}) {
  const result = { local: 0, incoming: 0, blocked: 0 };
  for (const conflict of plan.conflicts || []) {
    if (!conflict.resolvable) result.blocked += 1;
    else if (resolutions[conflict.id] === 'incoming') result.incoming += 1;
    else result.local += 1;
  }
  return result;
}
function tripImportPreviewHtml() {
  const pending = state.pendingTripImport;
  if (!pending) return '';
  const { plan } = pending;
  const { summary } = plan;
  const resolutions = tripResolutionSummary(plan, pending.resolutions || {});
  return `<div class="tripImportPreview" id="tripImportPreview">
    <div class="backupPreviewHead"><div><b>Importvorschau</b><small>${summary.files} Datei${summary.files === 1 ? '' : 'en'} geprüft · Noch keine lokalen Daten verändert</small></div><span class="diagnosticSummary ${summary.conflicts ? 'warn' : 'ok'}">${summary.conflicts ? 'Auswahl erforderlich' : 'Bereit zum Zusammenführen'}</span></div>
    <div class="tripImportSummary">
      <span><b>+${summary.logs}</b> neue Buchungen</span><span><b>${summary.changedLogs || 0}</b> geänderte Buchungen</span><span><b>${summary.duplicates}</b> doppelte Buchungen</span><span><b>+${summary.persons}</b> Personen</span><span><b>+${summary.referenceVersions || 0}</b> Barkarten-Versionen</span><span class="${summary.conflicts ? 'warnText' : ''}"><b>${summary.conflicts}</b> Konflikte gesamt</span>${summary.archivedTripLogs ? `<span class="warnText"><b>${summary.archivedTripLogs}</b> durch Archivschutz blockiert</span>` : ''}
    </div>
    <div class="tripImportFiles">${plan.fileSummaries.map(tripImportFileHtml).join('')}</div>
    ${plan.warnings.length ? `<div class="backupMessages warn">${plan.warnings.map(message => `<p>${esc(message)}</p>`).join('')}</div>` : ''}
    ${plan.conflicts.length ? `<div class="tripConflictSection"><div class="sectionHead"><div><h3>Konflikte entscheiden</h3><p class="hint">CruiseSip verwendet zunächst die lokale Version. Für jeden sicher auflösbaren Konflikt kann stattdessen die importierte Version gewählt werden.</p></div><span class="subtle">${plan.conflicts.length}</span></div><div class="tripResolutionCounters"><span><b>${resolutions.local}</b> lokal</span><span><b>${resolutions.incoming}</b> importiert</span><span><b>${resolutions.blocked}</b> gesperrt</span></div>${plan.conflicts.slice(0, 100).map(tripConflictHtml).join('')}${plan.conflicts.length > 100 ? `<p class="hint">Weitere ${plan.conflicts.length - 100} Konflikte werden aus Platzgründen nicht einzeln angezeigt und bleiben lokal.</p>` : ''}</div>` : ''}
    <div class="backupModeCard"><b>Geprüfte Daten zusammenführen</b><p>Neue Datensätze werden ergänzt. Dubletten werden übersprungen. Bei Konflikten gilt die oben gewählte Version. Vor der Änderung erstellt CruiseSip automatisch einen lokalen Wiederherstellungspunkt und schreibt ein Importprotokoll.</p><button class="primary" data-action="applyTripImport">Auswahl übernehmen und zusammenführen</button></div>
    <button class="secondary" data-action="cancelTripImport">Importvorschau schließen</button>
  </div>`;
}
function renderTripImportPreview() {
  const element = $('#tripImportPreview');
  if (element) element.outerHTML = tripImportPreviewHtml();
}
function setTripConflictResolution(id, value) {
  const pending = state.pendingTripImport;
  const conflict = pending?.plan?.conflicts?.find(row => row.id === id);
  if (!pending || !conflict) return;
  if (!conflict.resolvable) { toast('Dieser Konflikt kann nicht sicher automatisch aufgelöst werden'); return; }
  const resolution = value === 'incoming' ? 'incoming' : 'local';
  if (!pending.resolutions) pending.resolutions = defaultTripConflictResolutions(pending.plan);
  if (resolution === 'incoming') {
    for (const other of pending.plan.conflicts) {
      if (other.id !== conflict.id && other.targetKey === conflict.targetKey) pending.resolutions[other.id] = 'local';
    }
  }
  pending.resolutions[conflict.id] = resolution;
  renderTripImportPreview();
  haptic();
}
function deviceSyncCardHtml() {
  return `<div class="card deviceSyncCard"><div class="sectionHead"><div><h2>Geräteabgleich</h2><p class="hint">Reisedaten mehrerer Geräte manuell über JSON-Dateien zusammenführen.</p></div><span class="backupFormatBadge">JSON · offline</span></div><div class="buttonStack"><button class="primary" data-action="exportTrip">Aktuelle Reise exportieren</button><button class="secondary" data-action="importTrip">Geräteexporte auswählen und prüfen</button></div><p class="hint">Bis zu 20 Reiseexporte können gemeinsam geprüft werden. CruiseSip zeigt neue, geänderte und doppelte Buchungen getrennt an. Abweichende Reisedaten oder Reiseverläufe erscheinen als Reisekonflikt; du entscheidest zwischen lokaler und importierter Version.</p>${tripImportPreviewHtml()}</div>`;
}
function incomingTripConflictRow(conflict) {
  const local = cloneRow(conflict.localRow || {});
  const incoming = cloneRow(conflict.incomingRow || {});
  const row = { ...local, ...incoming, id: local.id || incoming.id, updatedAt: nowIso() };
  for (const key of [
    'archived', 'archivedAt', 'archivedByDeviceId', 'archivedByDeviceName', 'closureAppVersion', 'closureBuild',
    'closureSequence', 'closureSnapshot', 'closureValidation', 'closureDigest',
    'reactivatedAt', 'reactivatedByDeviceId', 'reactivatedByDeviceName', 'reactivationRestorePointId'
  ]) {
    if (Object.prototype.hasOwnProperty.call(local, key)) row[key] = local[key];
    else delete row[key];
  }
  row.createdAt = local.createdAt || incoming.createdAt || nowIso();
  return row;
}
function incomingPersonConflictRow(conflict) {
  const local = cloneRow(conflict.localRow || {});
  const incoming = cloneRow(conflict.incomingRow || {});
  return { ...incoming, id: local.id || incoming.id, tripId: local.tripId || incoming.tripId, createdAt: local.createdAt || incoming.createdAt || nowIso(), updatedAt: nowIso() };
}
function incomingLogConflictRow(conflict) {
  const local = cloneRow(conflict.localRow || {});
  const incoming = cloneRow(conflict.incomingRow || {});
  const row = { ...incoming };
  row.id = local.id || incoming.id || `log_${uid()}`;
  row.originId = local.originId || incoming.originId || incoming.id || row.id;
  row.mergeKey = logMergeKey(incoming, conflict.deviceId || incoming.trackedByDeviceId || '');
  row.trackedByDeviceId = incoming.trackedByDeviceId || conflict.deviceId || local.trackedByDeviceId || 'unknown';
  row.trackedByDeviceName = incoming.trackedByDeviceName || conflict.deviceName || local.trackedByDeviceName || 'Import';
  row.importedAt = nowIso();
  row.updatedAt = nowIso();
  return row;
}
function applyTripConflictResolutions(plan, resolutions = {}) {
  const stats = { local: 0, incoming: 0, blocked: 0, byFile: {} };
  const selectedTargets = new Set();
  for (const conflict of plan.conflicts || []) {
    const fileStats = stats.byFile[conflict.fileName] ||= { local: 0, incoming: 0, blocked: 0, details: [] };
    let resolution = conflict.resolvable && resolutions[conflict.id] === 'incoming' ? 'incoming' : conflict.resolvable ? 'local' : 'blocked';
    if (resolution === 'incoming' && selectedTargets.has(conflict.targetKey)) resolution = 'local';
    if (resolution === 'incoming') selectedTargets.add(conflict.targetKey);
    stats[resolution] += 1;
    fileStats[resolution] += 1;
    fileStats.details.push({ id: conflict.id, type: conflict.type, title: conflict.title, resolution, message: conflict.message });
    if (resolution !== 'incoming') continue;
    if (conflict.type === 'trip') plan.rows.trips.push(incomingTripConflictRow(conflict));
    if (conflict.type === 'person') plan.rows.persons.push(incomingPersonConflictRow(conflict));
    if (conflict.type === 'log') plan.rows.logs.push(incomingLogConflictRow(conflict));
  }
  return stats;
}
async function applyPreparedTripImport() {
  const pending = state.pendingTripImport;
  if (!pending) throw new Error('Keine geprüften Geräteexporte ausgewählt.');
  for (const row of pending.parsed) {
    const validation = await validateTripExportPayload(row.payload, row.fileName);
    if (validation.errors.length) throw new Error(validation.errors[0]);
    row.validation = validation;
  }
  const plan = await buildTripImportPlan(pending.parsed, await readAllStoresSnapshot());
  const currentSignature = tripImportPlanSignature(plan);
  const resolutions = defaultTripConflictResolutions(plan, pending.resolutions || {});
  if (currentSignature !== pending.signature) {
    state.pendingTripImport = { ...pending, plan, signature: currentSignature, resolutions, preparedAt: nowIso() };
    render();
    alert('Der lokale Datenbestand hat sich seit der Vorschau geändert. Die Importvorschau wurde aktualisiert. Bitte prüfe die Konfliktauswahl erneut.');
    return;
  }
  state.pendingTripImport = { ...pending, plan, resolutions };
  const resolutionStats = applyTripConflictResolutions(plan, resolutions);
  if (plan.summary.conflicts && !confirm(`${plan.summary.conflicts} Konflikt${plan.summary.conflicts === 1 ? '' : 'e'}: ${resolutionStats.local} lokal, ${resolutionStats.incoming} importiert, ${resolutionStats.blocked} nicht übernehmbar. Auswahl jetzt anwenden?`)) return;

  const importedAt = nowIso();
  const batchId = `sync_${uid()}`;
  const restorePoint = await createInternalRestorePoint('Vor dem Zusammenführen von Geräteexporten', {
    files: plan.summary.files,
    newLogs: plan.summary.logs,
    changedLogs: plan.summary.changedLogs,
    importedConflicts: resolutionStats.incoming
  });
  for (const fileSummary of plan.fileSummaries) {
    const fileResolution = resolutionStats.byFile[fileSummary.fileName] || { local: 0, incoming: 0, blocked: 0, details: [] };
    plan.rows.imports.push({
      id: `import_${uid()}`,
      batchId,
      kind: 'Geräteabgleich v5.4',
      status: 'abgeschlossen',
      fileName: fileSummary.fileName,
      importedAt,
      sourceDeviceId: fileSummary.deviceId,
      sourceDeviceName: fileSummary.deviceName,
      tripId: fileSummary.tripId,
      exportId: fileSummary.exportId || '',
      restorePointId: restorePoint?.id || '',
      added: fileSummary.addedLogs,
      addedTrips: fileSummary.addedTrips,
      addedPersons: fileSummary.addedPersons,
      addedReferenceVersions: fileSummary.addedReferenceVersions || 0,
      addedLogs: fileSummary.addedLogs,
      changedLogs: fileSummary.changedLogs || 0,
      duplicates: fileSummary.duplicates,
      conflicts: fileSummary.conflicts,
      resolvedLocal: fileResolution.local,
      resolvedImported: fileResolution.incoming,
      blockedConflicts: fileResolution.blocked,
      archivedTripLogs: fileSummary.archivedTripLogs || 0,
      resolutionDetails: fileResolution.details.slice(0, 100)
    });
  }
  await putRowsAtomic(plan.rows);
  state.pendingTripImport = null;
  await loadState();
  render();
  const notices = [];
  if (plan.summary.nameWarnings) notices.push(`${plan.summary.nameWarnings} gleichnamige Person(en) mit unterschiedlicher ID wurden getrennt beibehalten.`);
  if (plan.summary.legacyFiles) notices.push(`${plan.summary.legacyFiles} ältere Exportdatei(en) wurden kompatibel importiert.`);
  if (plan.summary.archivedTripLogs) notices.push(`${plan.summary.archivedTripLogs} Buchung(en) für lokal abgeschlossene Reisen wurden durch den Archivschutz blockiert. Reaktiviere die Reise und importiere erneut.`);
  alert(`Geräteabgleich abgeschlossen.\n\nDateien: ${plan.summary.files}\nNeue Reisen: ${plan.summary.trips}\nNeue Personen: ${plan.summary.persons}\nNeue Barkarten-Versionen: ${plan.summary.referenceVersions || 0}\nNeue Buchungen: ${plan.summary.logs}\nGeänderte Buchungen: ${plan.summary.changedLogs || 0}\nBereits vorhanden: ${plan.summary.duplicates}\nKonflikte lokal behalten: ${resolutionStats.local}\nImportierte Version übernommen: ${resolutionStats.incoming}\nNicht sicher übernehmbar: ${resolutionStats.blocked}\nWiederherstellungspunkt: erstellt${notices.length ? `\n\nHinweise:\n${notices.join('\n')}` : ''}`);
  toast(`${plan.summary.logs} neu · ${resolutionStats.incoming} importiert · ${plan.summary.duplicates} doppelt`);
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
  const keys = Array.from(new Set(['all_in', 'fun', 'kids_teens_all_in', 'kids_teens_fun', ...Object.keys(packages || {})]));
  keys.forEach(key => {
    let v = String(packages?.[key] || 'unclear').trim().toLowerCase();
    if (['ja', 'yes', 'enthalten', 'included', 'in'].includes(v)) v = 'included';
    if (['nein', 'no', 'nicht enthalten', 'not included', 'not_included', 'out'].includes(v)) v = 'not_included';
    clean[key] = allowed.has(v) ? v : 'unclear';
  });
  return clean;
}
function uniqueReferenceVersionId(preferred) {
  const base = String(preferred || `barkarte_${uid()}`).trim() || `barkarte_${uid()}`;
  if (!state.barkarten.some(row => row.id === base)) return base;
  return `${base}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${uid().slice(0, 4)}`;
}
async function importBarkarte(text, fileName) {
  let data;
  if (fileName.toLowerCase().endsWith('.csv')) {
    data = {
      version: `csv_${new Date().toISOString().slice(0, 10)}_${uid().slice(0, 5)}`,
      source: fileName,
      drinks: parseCsv(text),
      packages: cloneRow(state.packages)
    };
  } else data = JSON.parse(text);
  const hasDrinks = Array.isArray(data?.drinks) && data.drinks.length > 0;
  const hasPackages = Array.isArray(data?.packages) && data.packages.length > 0;
  if (!data || (!hasDrinks && !hasPackages)) throw new Error('JSON muss mindestens drinks[] oder packages[] enthalten. CSV-Dateien benötigen eine Kopfzeile mit Getränken.');
  const incoming = hasDrinks ? normalizeDrinks(data.drinks) : normalizeDrinks(state.drinks);
  if (!incoming.length) throw new Error('Keine gültigen Getränke verfügbar.');
  const incomingPackages = hasPackages
    ? normalizePackageDefinitions(data.packages, data.source || fileName)
    : normalizePackageDefinitions(state.packages, activePackageVersion()?.source || 'Bisherige Paketdefinitionen');
  const preferredId = String(data.id || data.version || `barkarte_${uid()}`).trim();
  const record = buildReferenceVersionRecord({
    id: uniqueReferenceVersionId(preferredId),
    version: data.version || fileName,
    source: data.source || fileName,
    drinks: incoming,
    packages: incomingPackages,
    notes: data.notes || ''
  });
  const comparison = compareDrinks(state.drinks, incoming, state.packages, incomingPackages);
  comparison.version = record.version;
  comparison.fileName = fileName;
  comparison.totalChanges = comparison.newDrinks + comparison.removedDrinks + comparison.priceChanges + comparison.categoryChanges + comparison.packageChanges + comparison.packageDefinitionChanges;
  state.pendingBarkarteImport = { fileName, record, comparison, preparedAt: nowIso() };
  state.route = 'barkarte';
  render();
  requestAnimationFrame(() => $('#barkarteImportPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  toast('Barkarte geprüft – noch nicht aktiviert');
}
async function savePendingBarkarteVersion(mode = 'store') {
  const pending = state.pendingBarkarteImport;
  if (!pending?.record) throw new Error('Keine geprüfte Barkarten-Version vorhanden.');
  const record = buildReferenceVersionRecord({ ...pending.record, id: uniqueReferenceVersionId(pending.record.id) });
  await put('barkarten', record);
  const comparison = { ...pending.comparison, applied: mode !== 'store', saved: true, versionId: record.id, savedAt: nowIso() };
  await putSetting('lastBarkarteComparison', comparison);
  await put('imports', {
    id: `import_${uid()}`,
    kind: 'Barkarte / Paketversion v5.3',
    fileName: pending.fileName,
    importedAt: nowIso(),
    versionId: record.id,
    version: record.version,
    added: comparison.newDrinks,
    removed: comparison.removedDrinks,
    changed: comparison.priceChanges + comparison.categoryChanges + comparison.packageChanges + comparison.packageDefinitionChanges,
    duplicates: comparison.totalChanges ? 0 : record.drinks.length,
    activation: mode
  });
  state.pendingBarkarteImport = null;
  await loadState();
  if (mode === 'current') {
    await activateReferenceVersionForCurrentTrip(record.id, { skipConfirm: true, reason: 'Import einer neuen Barkarten-Version' });
    return;
  }
  if (mode === 'default') {
    await setDefaultReferenceVersion(record.id, { skipConfirm: true });
    return;
  }
  render();
  toast('Neue Barkarten-Version gespeichert');
}
async function activateReferenceVersionForCurrentTrip(id, options = {}) {
  const record = referenceVersionById(id) || await get('barkarten', id);
  const trip = currentTrip();
  if (!record || record.dataAvailable === false || !Array.isArray(record.drinks) || !record.drinks.length) throw new Error('Diese Version enthält keine verwendbaren Barkartendaten.');
  if (!trip) throw new Error('Es ist keine Reise ausgewählt.');
  if (!ensureTripWritable(trip.id, 'Der Wechsel der Barkarten-Version')) return;
  if (trip.barkarteVersionId === id && trip.packageVersionId === id) { toast('Diese Version ist bereits der aktuellen Reise zugeordnet'); return; }
  const logCount = tripLogsById(trip.id).length;
  if (logCount) {
    resetTripSetupWizard();
    state.route = 'trips';
    state.editingTripId = trip.id;
    state.pendingTripVersionChange = null;
    state.formDraft.trip = { id: trip.id || '', name: trip.name || '', ship: trip.ship || '', startDate: trip.startDate || '', endDate: trip.endDate || '', barkarteVersionId: id, versionChangeMode: 'future' };
    render();
    requestAnimationFrame(() => $('#tripForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    toast(`${logCount} bestehende Buchung${logCount === 1 ? '' : 'en'} – Wechsel bitte in der Reise prüfen`);
    return;
  }
  await put('trips', { ...trip, barkarteVersionId: id, packageVersionId: id, updatedAt: nowIso() });
  await putSetting('barkarteVersionId', id);
  await putSetting('barkarteVersion', referenceVersionMeta(record));
  await loadState();
  state.editingDrinkId = null;
  render();
  toast(`Version „${record.version}“ für diese Reise aktiviert`);
  haptic();
}
async function mirrorDefaultDrinksStore(record) {
  if (!record || !Array.isArray(record.drinks)) return;
  await clearStore('drinks');
  for (const drink of normalizeDrinks(record.drinks)) await put('drinks', drink);
}
async function setDefaultReferenceVersion(id, options = {}) {
  const record = referenceVersionById(id) || await get('barkarten', id);
  if (!record || record.dataAvailable === false || !Array.isArray(record.drinks) || !record.drinks.length) throw new Error('Diese Version kann nicht als Standard verwendet werden.');
  if (!options.skipConfirm && !confirm(`„${record.version}“ als Standard für neu angelegte Reisen festlegen?\n\nBestehende Reisen behalten ihre bisherige Barkarten- und Paketversion.`)) return;
  await putSetting('defaultBarkarteVersionId', id);
  await putSetting('defaultPackageVersionId', id);
  await putSetting('barkarteVersionId', id);
  await putSetting('barkarteVersion', referenceVersionMeta(record));
  await mirrorDefaultDrinksStore(record);
  await loadState();
  render();
  toast(`„${record.version}“ ist jetzt Standard für neue Reisen`);
  haptic();
}
async function deleteReferenceVersion(id) {
  const record = referenceVersionById(id);
  if (!record) return;
  if (record.isBundled) { alert('Die mit CruiseSip gelieferte Stammversion kann nicht gelöscht werden.'); return; }
  if (versionUsageCount(id)) { alert('Diese Version ist mindestens einer Reise zugeordnet und kann deshalb nicht gelöscht werden.'); return; }
  if (defaultBarkarteVersionId() === id || defaultPackageVersionId() === id) { alert('Die Standardversion kann nicht gelöscht werden. Lege zuerst eine andere Standardversion fest.'); return; }
  if (!confirm(`Die ungenutzte Version „${record.version}“ dauerhaft löschen?`)) return;
  await del('barkarten', id);
  await loadState();
  render();
  toast('Ungenutzte Version gelöscht');
}

function parseCsv(text) {
  const firstLine = String(text || '').split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && quoted && n === '"') { cell += '"'; i++; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if (c === delimiter && !quoted) { row.push(cell); cell = ''; continue; }
    if ((c === '\n' || c === '\r') && !quoted) {
      if (cell || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; }
      if (c === '\r' && n === '\n') i++;
      continue;
    }
    cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map(h => h.trim().replace(/^\uFEFF/, ''));
  return rows.filter(values => values.some(value => String(value).trim())).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}

function comparePackageDefinitions(oldPackages, newPackages) {
  const oldById = new Map(normalizePackageDefinitions(oldPackages || []).map(row => [row.id, row]));
  const newById = new Map(normalizePackageDefinitions(newPackages || []).map(row => [row.id, row]));
  const details = [];
  let changes = 0;
  for (const [id, row] of newById) {
    const old = oldById.get(id);
    if (!old) { changes += 1; details.push({ name: row.name, text: 'neue Paketdefinition' }); continue; }
    const oldComparable = { name: old.name || '', minAge: old.minAge ?? null, age: old.age || '' };
    const newComparable = { name: row.name || '', minAge: row.minAge ?? null, age: row.age || '' };
    if (stableStringify(oldComparable) !== stableStringify(newComparable)) {
      changes += 1;
      details.push({ name: row.name, text: `Paketdefinition geändert${old.name !== row.name ? ` · Name: ${old.name} → ${row.name}` : ''}` });
    }
  }
  for (const [id, row] of oldById) {
    if (!newById.has(id)) { changes += 1; details.push({ name: row.name, text: 'Paketdefinition entfällt' }); }
  }
  return { changes, details };
}
function compareDrinks(oldDrinks, newDrinks, oldPackages = state.packages, newPackages = state.packages) {
  const byKey = new Map(oldDrinks.map(d => [d.id || slug(d.name), d]));
  const byName = new Map(oldDrinks.map(d => [normalize(d.name), d]));
  const matchedOldIds = new Set();
  const details = [];
  let newCount = 0, removedDrinks = 0, priceChanges = 0, categoryChanges = 0, packageChanges = 0;
  const managedIds = Array.from(new Set([
    ...normalizePackageDefinitions(oldPackages || []).map(pkg => pkg.id),
    ...normalizePackageDefinitions(newPackages || []).map(pkg => pkg.id)
  ])).filter(id => !['none', 'unclear'].includes(id));
  for (const drink of newDrinks) {
    const old = byKey.get(drink.id) || byName.get(normalize(drink.name));
    if (!old) { newCount += 1; details.push({ name: drink.name, text: `neu · ${eur(drink.price)}` }); continue; }
    matchedOldIds.add(old.id || slug(old.name));
    if (Math.abs((Number(old.price) || 0) - (Number(drink.price) || 0)) >= 0.01) { priceChanges += 1; details.push({ name: drink.name, text: `Preis ${eur(old.price)} → ${eur(drink.price)}` }); }
    if (normalize(old.category) !== normalize(drink.category)) { categoryChanges += 1; details.push({ name: drink.name, text: `Kategorie ${old.category || 'ohne'} → ${drink.category || 'ohne'}` }); }
    for (const key of managedIds) {
      if ((old.packages?.[key] || 'unclear') !== (drink.packages?.[key] || 'unclear')) { packageChanges += 1; details.push({ name: drink.name, text: `${newPackages.find(pkg => pkg.id === key)?.name || oldPackages.find(pkg => pkg.id === key)?.name || key}: ${statusLabel(old.packages?.[key] || 'unclear')} → ${statusLabel(drink.packages?.[key] || 'unclear')}` }); }
    }
  }
  for (const old of oldDrinks) {
    const oldId = old.id || slug(old.name);
    if (!matchedOldIds.has(oldId) && !newDrinks.some(row => normalize(row.name) === normalize(old.name))) {
      removedDrinks += 1;
      details.push({ name: old.name, text: `entfällt · bisher ${eur(old.price)}` });
    }
  }
  const packageDefinition = comparePackageDefinitions(oldPackages, newPackages);
  details.push(...packageDefinition.details);
  return { newDrinks: newCount, removedDrinks, priceChanges, categoryChanges, packageChanges, packageDefinitionChanges: packageDefinition.changes, details: details.slice(0, 120), checkedAt: nowIso() };
}

function pad2(value) { return String(value).padStart(2, '0'); }
function localDateInputValue(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function localTimeInputValue(ts) { const d = new Date(Number(ts)); return Number.isNaN(d.getTime()) ? '' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function localDateTimeToTimestamp(date, time) { const match = String(time || '').match(/^(\d{2}):(\d{2})$/); if (!date || !match) return NaN; const [year, month, day] = String(date).split('-').map(Number); const hour = Number(match[1]), minute = Number(match[2]); if (![year, month, day, hour, minute].every(Number.isFinite) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return NaN; const d = new Date(year, month - 1, day, hour, minute, 0, 0); return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day && d.getHours() === hour && d.getMinutes() === minute ? d.getTime() : NaN; }
function formatDate(value) { if (!value) return 'offen'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
function formatDateTime(ts) { const numeric = Number(ts); const value = String(ts ?? '').trim() && Number.isFinite(numeric) ? numeric : ts; const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
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
  <h2>Version 5.4.1</h2>
  <ul>
    <li>Reisetage können unter Reisen einzeln ergänzt, bearbeitet und gelöscht werden.</li>
    <li>Datum, Tagesart, Hafen, Land, Ankunft, Abfahrt und Hinweise sind direkt änderbar.</li>
    <li>Nach jeder Änderung wird der Verlauf automatisch nach Datum sortiert und neu nummeriert.</li>
    <li>Vor dem Speichern oder Löschen wird automatisch ein interner Wiederherstellungspunkt erstellt.</li>
    <li>Abgeschlossene Reisen bleiben schreibgeschützt; geänderte Reiseverläufe können über den sicheren Geräteabgleich übertragen werden.</li>
  </ul>
  <h2>Version 5.4.0</h2>
  <ul>
    <li>Reiseabschluss speichert Abschlusszeitpunkt, abschließendes Gerät, App-Build und kompakte Abschlusskennzahlen.</li>
    <li>Vor Abschluss und Reaktivierung wird automatisch ein interner Wiederherstellungspunkt erstellt.</li>
    <li>Lokale SHA-256-Prüfsumme zeigt, ob Reise-, Personen- und Buchungsdaten seit dem Abschluss unverändert sind.</li>
    <li>Abgeschlossene Reisen öffnen direkt im Abschlussbericht und bleiben auch beim Geräteimport schreibgeschützt.</li>
    <li>CSV-, HTML- und PDF-Berichte werden eindeutig als Abschlussstand gekennzeichnet.</li>
  </ul>
  <h2>Version 5.3.1</h2>
  <ul>
    <li>Beim Anlegen und Bearbeiten einer Reise kann die Barkarten- und Paketversion direkt ausgewählt werden.</li>
    <li>Vor der ersten Buchung erfolgt ein Wechsel ohne zusätzliche Rückfrage.</li>
    <li>Bei vorhandenen Buchungen kann nur für neue Erfassungen umgestellt oder zunächst eine Prüfvorschau geöffnet werden.</li>
    <li>Die Vorschau trennt eindeutige, geänderte und unklare Zuordnungen; unklare Buchungen bleiben unangetastet.</li>
    <li>Vor einem Wechsel mit vorhandenen Buchungen wird automatisch ein interner Wiederherstellungspunkt erstellt.</li>
  </ul>
  <h2>Version 5.3.0</h2>
  <ul>
    <li>Barkarten und Getränkepakete werden als vollständige, unveränderliche Referenzversionen gespeichert.</li>
    <li>Jede Reise ist fest mit ihrer Barkarten- und Paketversion verknüpft; alte Reisen bleiben auch nach späteren Preisänderungen nachvollziehbar.</li>
    <li>Neue JSON- oder CSV-Daten werden vor dem Speichern mit der aktiven Version verglichen. JSON kann Getränke, Paketdefinitionen oder beides enthalten.</li>
    <li>Importversionen können nur gespeichert, für die aktuelle Reise aktiviert oder als Standard für neue Reisen festgelegt werden.</li>
    <li>Lokale Artikeländerungen erzeugen bei Bedarf automatisch eine abgeleitete Arbeitsversion, statt gemeinsam genutzte Stammdaten zu überschreiben.</li>
    <li>Reiseexporte führen die zugehörige Referenzversion mit; der Geräteabgleich ergänzt fehlende Versionen.</li>
  </ul>
  <h2>Version 5.2.0</h2>
  <ul>
    <li>Geräteexporte zeigen neue, geänderte und doppelte Buchungen vor der Zusammenführung getrennt an.</li>
    <li>Bei sicher auflösbaren Konflikten kann je Reise, Person oder Buchung zwischen lokaler und importierter Version gewählt werden.</li>
    <li>Nicht sicher zuordenbare Datensätze bleiben gesperrt und werden nicht automatisch übernommen.</li>
    <li>Vor jeder bestätigten Zusammenführung wird automatisch ein lokaler Wiederherstellungspunkt erstellt.</li>
    <li>Das erweiterte Importprotokoll dokumentiert Quellgerät, Zählwerte und jede Konfliktentscheidung.</li>
  </ul>
  <h2>Version 5.1.0</h2>
  <ul>
    <li>Bis zu fünf vollständige lokale Wiederherstellungspunkte im getrennten Snapshot-Speicher.</li>
    <li>Automatische Sicherung vor kritischen Änderungen wie Reise-Löschung, Barkartenwechsel, Vollbackup-Wiederherstellung und Geräteimport.</li>
    <li>Manuelle Sicherung, übersichtliche Verwaltung und kontrollierte Wiederherstellung direkt im Setup.</li>
    <li>Vor jeder Wiederherstellung wird der aktuelle Stand nochmals gesichert; die installierte App-Version bleibt erhalten.</li>
    <li>Interne Sicherungspunkte bleiben auf dem Gerät und verändern Reiseexporte sowie Vollbackupformate nicht.</li>
  </ul>
  <h2>Version 5.0.2</h2>
  <ul>
    <li>Erfassungsansicht deutlich kompakter aufgebaut; die Getränkesuche steht direkt über der Getränkeliste nach Kategorien und Personenauswahl.</li>
    <li>„Noch einmal erfassen“ bleibt auf Home, wurde aber aus der Erfassungsansicht entfernt.</li>
    <li>Die Mehrfachauswahl wurde aus der regulären Erfassungsansicht zurückgenommen; jede Getränkekachel erfasst wieder eindeutig für eine Person.</li>
    <li>Personenwechsel, Kategorien und Ergebnisleiste benötigen weniger Höhe, sodass mehr Getränkekacheln gleichzeitig sichtbar sind.</li>
  </ul>
  <h2>Version 5.0.1</h2>
  <ul>
    <li>Neues Theme-System mit Automatisch, Hell, Dunkel, Ocean, Sunset, Nordic und Hoher Kontrast.</li>
    <li>Theme-Auswahl als Live-Vorschau mit gerätebezogener Speicherung; Ocean ist als empfohlenes CruiseSip-Theme gekennzeichnet.</li>
    <li>Option „Reduzierte Effekte“ deaktiviert Animationen, stärkere Schatten, Transparenzen und dekorative Verläufe.</li>
    <li>Home neu priorisiert: Schnellzugriff direkt oben, „Noch einmal erfassen“ unmittelbar darunter und Tagesübersicht weiter unten.</li>
    <li>Navigation, Dialoge, Diagramme und Statusdarstellungen an alle Themes angepasst; fachliche Statusfarben bleiben erhalten.</li>
  </ul>
  <h2>Version 5.0.0</h2>
  <ul>
    <li>Reiseverlauf ist nun direkt auf Home präsent: CruiseSip zeigt den heutigen beziehungsweise nächsten Reisetag mit Hafen, Land, Tagesart und Liegezeiten.</li>
    <li>Neue Mehrfacherfassung: Ein Getränk kann in einem Schritt für mehrere ausgewählte Personen gespeichert werden; Paketstatus und Buchung bleiben je Person getrennt.</li>
    <li>„Noch einmal erfassen“ wiederholt das zuletzt gebuchte Getränk je Person auf Home und in der Erfassungsansicht.</li>
    <li>Neue grafische Auswertungen für Getränkekategorien und Barkartenwert je Konsumtag ergänzen die bestehende Paketstatus-Verteilung.</li>
    <li>Neue Buchungen speichern automatisch den passenden Reiseverlaufs-Kontext des Buchungstags, soweit ein importierter Reiseverlauf vorhanden ist.</li>
    <li>Vor der ersten v5-Migration wird eine interne lokale Sicherheitskopie der v4-Kerndaten angelegt und im Setup kontrolliert wiederherstellbar gemacht.</li>
    <li>IndexedDB-Datenmodell auf Version 2 erweitert; bestehende Reisen, Personen, Barkarten und Buchungen bleiben erhalten.</li>
  </ul>
  <h2>Build 4.5.4d</h2>
  <ul>
    <li>Die aktuell geöffnete Reise wird in Analyse und Einstellungen durch eine grüne Reiseleiste eindeutig hervorgehoben.</li>
    <li>In der Reiseverwaltung ist die ausgewählte Reise ebenfalls grün hinterlegt; weitere und abgeschlossene Reisen bleiben klar unterscheidbar.</li>
    <li>Reiseauswahl, Datenmodell, Buchungen und Auswertungslogik bleiben unverändert.</li>
  </ul>
  <h2>Build 4.5.4c</h2>
  <ul>
    <li>Die sichtbare Hauptnavigation und sämtliche aktuellen Bedienhinweise verwenden jetzt einheitlich „Erfassen“ statt „Tracken“.</li>
    <li>Interne Routen, Funktionen, Buchungsdaten und die bestehende Erfassungslogik bleiben technisch unverändert.</li>
  </ul>
  <h2>Build 4.5.4b</h2>
  <ul>
    <li>Die Exportfunktionen stehen jetzt am Ende der Reiseanalyse, nachdem alle Kennzahlen und Detailauswertungen angezeigt wurden.</li>
    <li>CSV-, HTML- und PDF-Export sowie sämtliche Berichtsinhalte bleiben unverändert.</li>
  </ul>
  <h2>Version 4.5.4</h2>
  <ul>
    <li>Paket-Amortisation je Person mit grafischem Fortschrittsbalken, Restwert bis zum Break-even und tatsächlichem Break-even-Tag ergänzt.</li>
    <li>Verbrauchsprognose bis zum Reiseende auf Basis des eindeutig enthaltenen Paketwerts und aller verstrichenen Reisetage.</li>
    <li>Klare Statuskennzeichnung: amortisiert, voraussichtlich amortisiert, voraussichtlich nicht amortisiert oder keine belastbare Prognose.</li>
    <li>Unklare Paketstatus bleiben vollständig getrennt und fließen weder in Fortschritt noch Hochrechnung ein.</li>
    <li>HTML- und PDF-Bericht enthalten die neue Amortisations- und Prognoseübersicht.</li>
    <li>Beim Wechsel über Home, Erfassen, Verlauf, Analyse oder Setup beginnt die Zielseite immer oben.</li>
  </ul>
  <h2>Version 4.5.3</h2>
  <ul>
    <li>Vollständiger CSV-Export mit einer Excel-tauglichen Zeile je Getränkebuchung ergänzt.</li>
    <li>Eigenständiger, druckfreundlicher HTML-Bericht mit Gesamt-, Personen-, Tages-, Kategorien- und Buchungsauswertung.</li>
    <li>Native iOS-Dateifreigabe sowie lokale Download-Fallbacks für CSV und HTML.</li>
    <li>Druckansicht für die PDF-Erstellung über die iOS-Druckfunktion, vollständig offline und ohne externe Bibliotheken.</li>
  </ul>
  <h2>Version 4.5.2h</h2>
  <ul>
    <li>Responsives Layout für iPhone, schmale Android-Geräte, iPad sowie Desktop- und Notebook-Browser ergänzt.</li>
    <li>Größere Displays nutzen zusätzliche Spalten für Kennzahlen, Getränkekacheln und Personenauswertungen.</li>
    <li>Ab Desktopbreite wechselt die Hauptnavigation platzsparend an den linken Rand; die iPhone-Navigation bleibt unverändert unten fixiert.</li>
  </ul>
  <h2>Version 4.5.2g</h2>
  <ul>
    <li>Die Analyseansicht nutzt jetzt über alle Kacheln dieselbe verfügbare Breite wie Verlauf und die übrigen Bereiche.</li>
    <li>Lange Reisenamen werden in der Analyse-Kopfzeile gekürzt, ohne die Kartenbreite zu vergrößern.</li>
    <li>Neue offlinefähige Kreisgrafik zeigt die Verteilung der Getränke auf enthalten, nicht enthalten und unklar.</li>
  </ul>
  <h2>Version 4.5.2f</h2>
  <ul>
    <li>Favoriten und zuletzt getrunkene Getränke wurden von der Home-Seite entfernt.</li>
    <li>Direkte Getränkebuchungen erfolgen damit nur noch auf der Seite „Erfassen“ mit sichtbarer Personenauswahl.</li>
    <li>Favoriten, Zuletzt-Filter und individuelle Sortierung bleiben in der Erfassungsansicht vollständig erhalten.</li>
  </ul>
  <h2>Version 4.5.2e</h2>
  <ul>
    <li>Die Karte der aktuellen Reise auf Home wurde kompakter gestaltet.</li>
    <li>Schiff, Reisestatus, Reisename, Zeitraum und Reisetage bleiben klar erkennbar.</li>
  </ul>
  <h2>Version 4.5.2d</h2>
  <ul>
    <li>Neuer Assistent für die Reiseeinrichtung: Reise importieren oder manuell anlegen, Personen erfassen und optional für ein zweites Gerät exportieren.</li>
    <li>Ein Reiseverlauf-Import erzeugt immer eine neue Reise mit eigener stabiler ID und verändert keine vorhandene Reise.</li>
    <li>Importierter Reiseverlauf, Personen und Reise-ID werden im bestehenden Reiseexport gemeinsam bereitgestellt.</li>
  </ul>
  <h2>Version 4.5.2c</h2>
  <ul>
    <li>Offline-App-Cache-Prüfung verwendet nun automatisch die aktuelle Build-Kennung.</li>
    <li>Fehlanzeige „3/5 Kerndateien“ nach Build-Updates behoben.</li>
  </ul>
  <h2>Version 4.5.2b</h2>
  <ul>
    <li>Tatsächlicher Reiseverlauf mit Häfen, Seetagen und optionalen Liegezeiten kann als lokale JSON-Datei importiert werden.</li>
    <li>Eine Importvorschau prüft Format, Datumswerte, doppelte Tage sowie Abweichungen bei Reisezeitraum, Reisename und Schiff.</li>
    <li>Importierte Routendaten ergänzen den Tages- und Reisebericht; Erfassung, Buchungen und Paketberechnungen bleiben unverändert.</li>
    <li>Bestehende Reiseverläufe werden nur nach ausdrücklicher Bestätigung ersetzt und können unabhängig von Getränkebuchungen wieder entfernt werden.</li>
  </ul>
  <h2>Version 4.5.2</h2>
  <ul>
    <li>Neuer Tages- und Reisebericht mit chronologischer Auswertung aller Reisetage einschließlich Tagen ohne Buchungen.</li>
    <li>Anzeige von Getränkeanzahl und Barkartenwert je Tag, stärkstem Konsumtag sowie durchschnittlicher Getränkeanzahl und durchschnittlichem Barkartenwert pro Reisetag.</li>
    <li>Ranglisten für häufigste und teuerste Getränke sowie direkte Vergleiche der Personen und Getränkekategorien.</li>
    <li>Der Bericht wird bei abgeschlossenen Reisen als Abschlussbericht und bei laufenden Reisen als Zwischenbericht dargestellt.</li>
    <li>Alle Kennzahlen werden ausschließlich aus den vorhandenen lokalen Buchungen berechnet; Datenmodell, Backup und Geräteabgleich bleiben unverändert.</li>
  </ul>
  <h2>Version 4.5.1</h2>
  <ul>
    <li>Neue Abschlussauswertung mit Gesamt-Barkartenwert, Gesamtpaketkosten, Kosten außerhalb des Pakets, unklaren Paketstatus und Gesamtbilanz.</li>
    <li>Je Person werden Getränkeanzahl, Barkartenwert, enthaltene, nicht enthaltene und unklare Getränke, Paketpreis, Ersparnis oder Mehrkosten sowie der durchschnittliche Getränkewert pro Reisetag ausgewiesen.</li>
    <li>Personendetails enthalten zusätzlich eine Kategorienauswertung mit Anzahl, Wert und Paketstatus-Verteilung.</li>
    <li>Die Paketbilanz bleibt konservativ: Nur eindeutig enthaltene Getränke werden mit dem Paketpreis verglichen; unklare Getränke werden nicht als Ersparnis berücksichtigt.</li>
    <li>Bei fehlendem oder unklarem Paketpreis wird kein scheinbar genauer Vergleich berechnet, sondern die Auswertung sichtbar als unvollständig gekennzeichnet.</li>
  </ul>
  <h2>Version 4.5.0</h2>
  <ul>
    <li>Reisen können nach einer strukturierten Datenprüfung kontrolliert abgeschlossen und bei Bedarf bewusst reaktiviert werden.</li>
    <li>Abgeschlossene Reisen sind auf Home, Erfassen, Verlauf, Auswertung sowie in der Personenverwaltung deutlich gekennzeichnet.</li>
    <li>Erfassung, Rückgängig, Verlaufskorrekturen, Personen- und Paketänderungen sowie die Aktualisierung bestehender Buchungen sind zentral gesperrt.</li>
    <li>Kritische Identitäts- und Zuordnungsfehler blockieren den Abschluss; unklare Paketstatus, fehlende Paketpreise und weitere Auffälligkeiten bleiben als Hinweise sichtbar.</li>
    <li>Der lokale Abschlussstatus wird beim Geräteabgleich nicht überschrieben. Neue Buchungen für abgeschlossene Reisen werden vor dem Import gesondert bestätigt.</li>
  </ul>
  <h2>Version 4.4.3</h2>
  <ul>
    <li>Geräteexporte werden vor dem Schreiben vollständig geprüft und als Importvorschau mit neuen Reisen, Personen, Buchungen, Dubletten und Konflikten angezeigt.</li>
    <li>Konflikte können mit lokalem und importiertem Inhalt aufgeklappt verglichen werden; lokale Datensätze bleiben unverändert.</li>
    <li>Jede Buchung zeigt im Verlauf und in der personenbezogenen Analyse das erfassende Gerät an.</li>
    <li>Die Vorschau wird vor dem tatsächlichen Import erneut gegen den aktuellen lokalen Datenbestand geprüft.</li>
  </ul>
  <h2>Version 4.4.2</h2>
  <ul>
    <li>Bis zu 20 Reiseexporte können in einem Schritt ausgewählt und sicher zusammengeführt werden.</li>
    <li>Reisen und Personen werden anhand stabiler IDs erkannt; gleichnamige Personen mit unterschiedlichen IDs bleiben getrennt.</li>
    <li>Buchungen werden über ihren stabilen Merge-Key abgeglichen. Bereits vorhandene Buchungen werden übersprungen, abweichende Datensätze als Konflikt lokal beibehalten.</li>
    <li>Reiseexporte erhalten Formatversion, Export-ID, Bestandsübersicht und SHA-256-Integritätsprüfung.</li>
    <li>Beim iOS-Teilen wird nur noch die JSON-Datei übergeben; die zusätzliche Textdatei entfällt.</li>
  </ul>
  <h2>Version 4.4.1</h2>
  <ul>
    <li>Vollbackup, Reiseexport und Backup-Test öffnen auf unterstützten iPhones und iPads das native Teilen-Menü.</li>
    <li>Über „In Dateien sichern“ kann der gewünschte Zielordner unter „Auf meinem iPhone“, in iCloud Drive oder bei einem eingebundenen Dateidienst ausgewählt werden.</li>
    <li>Browser ohne Dateifreigabe verwenden weiterhin den direkten JSON-Download als Rückfalllösung.</li>
    <li>Ein abgebrochener Teilen-Dialog wird nicht als erfolgreiches Backup protokolliert.</li>
  </ul>
  <h2>Version 4.4.0</h2>
  <ul>
    <li>Vollständiges Offline-Backup aller lokalen IndexedDB-Daten mit App-Version, Exportzeitpunkt, Gerätekennung und SHA-256-Integritätsprüfung ergänzt.</li>
    <li>Importvorschau zeigt lokale und gesicherte Reisen, Personen, Buchungen, Getränke, Einstellungen, Dubletten, Konflikte und Warnungen vor jeder Änderung.</li>
    <li>„Daten ergänzen“ erhält stabile Reise-, Personen- und Buchungs-IDs, ergänzt fehlende Datensätze und überspringt bereits importierte Buchungen.</li>
    <li>„Vollständig ersetzen“ arbeitet atomar über alle sieben Stores und verlangt die ausdrückliche Bestätigung „DATEN ERSETZEN“.</li>
    <li>Die Geräte-ID bleibt beim Ersetzen standardmäßig erhalten; eine Wiederherstellung der Backup-Geräte-ID ist nur als klar gekennzeichnete Expertenoption möglich.</li>
    <li>Bestehender Fehler beim Speichern lokal geänderter Getränkepreise behoben.</li>
  </ul>
  <h2>Version 4.3.8</h2>
  <ul>
    <li>Offline-Sicherheitsstatus im Setup ergänzt.</li>
    <li>Prüft Home-Bildschirm-Modus, Service Worker, aktuellen App-Cache, IndexedDB-Schreibfähigkeit und Speicherverwaltung.</li>
    <li>Ein echter Offline-Start wird separat ausgewiesen; die Diagnose verändert keine Reisen oder Buchungen.</li>
  </ul>
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
    <li>Separate Karte „Aktive Person“ aus der Erfassungsansicht entfernt.</li>
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
    <li>Erfassungsansicht mit großen, zweispaltigen Getränkekacheln für die iPhone-Bedienung optimiert.</li>
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
    <li>Erfassung neu strukturiert: stabile Suche ohne Fokusverlust, dauerhafter Rückgängig-Dock, Favoriten, Kategorien und zuletzt verwendete Getränke.</li>
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
