// Lokaler Speicher im Browser (IndexedDB). Nichts verlässt das Gerät.

const DB_NAME = 'kostentool';
const DB_VERSION = 1;
const LISTEN = ['buchungen', 'vorlagen', 'ausnahmen'];

let dbPromise = null;

function oeffne() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of LISTEN) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('einstellungen')) db.createObjectStore('einstellungen', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function fertig(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen'));
  });
}

function alle(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function ladeAlles() {
  const db = await oeffne();
  const tx = db.transaction([...LISTEN, 'einstellungen'], 'readonly');
  const [buchungen, vorlagen, ausnahmen, einstellungsListe] = await Promise.all([
    ...LISTEN.map((n) => alle(tx.objectStore(n))),
    alle(tx.objectStore('einstellungen')),
  ]);
  const einstellungen = Object.fromEntries(einstellungsListe.map((e) => [e.key, e.value]));
  return { daten: { buchungen, vorlagen, ausnahmen }, einstellungen };
}

/** Mehrere Änderungen in einer Transaktion: [{liste, put}|{liste, delete}] */
export async function aendere(operationen) {
  const db = await oeffne();
  const namen = [...new Set(operationen.map((o) => o.liste))];
  const tx = db.transaction(namen, 'readwrite');
  for (const op of operationen) {
    const store = tx.objectStore(op.liste);
    if (op.put) store.put(op.put);
    if (op.delete) store.delete(op.delete);
  }
  return fertig(tx);
}

export async function setzeEinstellung(key, value) {
  return aendere([{ liste: 'einstellungen', put: { key, value } }]);
}

/** Ersetzt alle Buchungen, Vorlagen und Ausnahmen (Import). */
export async function ersetzeAlles(daten) {
  const db = await oeffne();
  const tx = db.transaction(LISTEN, 'readwrite');
  for (const name of LISTEN) {
    const store = tx.objectStore(name);
    store.clear();
    for (const eintrag of daten[name]) store.put(eintrag);
  }
  return fertig(tx);
}

/** Bittet iOS, die Daten nicht automatisch zu löschen. */
export async function dauerhaftAnfragen() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* nicht unterstützt */ }
  return false;
}

export function neueId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
