// Minimal IndexedDB helper for storing original lesson files (PDFs) as Blobs.
// Kept out of localStorage so large binaries don't blow the ~5MB quota.

const DB_NAME = 'learnio-files';
const STORE = 'files';
const VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        try {
          result = fn(store);
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error('Transaction aborted'));
      })
  );
}

export async function putFile(id, blob) {
  return tx('readwrite', (store) => store.put(blob, id));
}

export async function getFile(id) {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
}

export async function deleteFile(id) {
  return tx('readwrite', (store) => store.delete(id));
}

export async function hasFile(id) {
  const f = await getFile(id).catch(() => null);
  return !!f;
}

// Best-effort; never throws (used during availability checks).
export async function isAvailable() {
  try {
    await openDB();
    return true;
  } catch (e) {
    return false;
  }
}
