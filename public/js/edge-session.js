/**
 * AegisResil Apex — Edge Session Manager (Disconnected Guest State)
 * Implements a hybrid localStorage + IndexedDB offline storage strategy.
 * - localStorage: fast session metadata (region preference, scan counts)
 * - IndexedDB: large offline payload storage (full scan result JSON)
 * - Pending sync queue: drains to server/Firestore on reconnect
 */

window.EdgeSession = (() => {

  const DB_NAME = 'aegisresil_edge_db';
  const DB_VERSION = 1;
  const STORE_SCANS = 'offline_scans';
  const STORE_QUEUE = 'pending_sync';
  const MAX_OFFLINE_SCANS = 50;

  let _db = null;

  /**
   * Opens (or creates) the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   */
  function _openDB() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for completed offline scan results
        if (!db.objectStoreNames.contains(STORE_SCANS)) {
          const scansStore = db.createObjectStore(STORE_SCANS, { keyPath: 'id' });
          scansStore.createIndex('timestamp', 'timestamp', { unique: false });
          scansStore.createIndex('type', 'type', { unique: false });
        }

        // Store for items queued to sync when back online
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        resolve(_db);
      };

      request.onerror = (event) => {
        console.error('[EdgeSession] IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generic IDB write helper.
   * @param {string} storeName
   * @param {object} data
   * @returns {Promise<void>}
   */
  async function _write(storeName, data) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Generic IDB get-all helper.
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async function _getAll(storeName) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Generic IDB delete helper.
   * @param {string} storeName
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function _delete(storeName, id) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ── Public API ──────────────────────────────────────────────────

  return {

    /**
     * Saves a scan result to IndexedDB offline storage.
     * Enforces MAX_OFFLINE_SCANS limit by removing oldest entries.
     *
     * @param {object} entry - { id, type, timestamp, summaryTitle, result, region }
     * @returns {Promise<void>}
     */
    async saveOffline(entry) {
      try {
        await _write(STORE_SCANS, entry);

        // Enforce limit — prune oldest entries if over cap
        const all = await _getAll(STORE_SCANS);
        if (all.length > MAX_OFFLINE_SCANS) {
          const sorted = all.sort((a, b) => a.timestamp - b.timestamp);
          const toDelete = sorted.slice(0, all.length - MAX_OFFLINE_SCANS);
          for (const item of toDelete) {
            await _delete(STORE_SCANS, item.id);
          }
        }
      } catch (e) {
        console.warn('[EdgeSession] saveOffline failed:', e);
      }
    },

    /**
     * Adds an entry to the pending sync queue (for when back online).
     *
     * @param {object} entry - Scan entry to queue
     * @returns {Promise<void>}
     */
    async queueForSync(entry) {
      try {
        await _write(STORE_QUEUE, { ...entry, queuedAt: Date.now() });
      } catch (e) {
        console.warn('[EdgeSession] queueForSync failed:', e);
      }
    },

    /**
     * Returns all items in the pending sync queue.
     * @returns {Promise<Array>}
     */
    async getQueue() {
      try {
        return await _getAll(STORE_QUEUE);
      } catch (e) {
        console.warn('[EdgeSession] getQueue failed:', e);
        return [];
      }
    },

    /**
     * Attempts to flush the pending sync queue to Firestore (if authenticated).
     * Clears each item from the queue after successful sync.
     * @returns {Promise<{ flushed: number, failed: number }>}
     */
    async flushQueue() {
      const queue = await this.getQueue();
      if (queue.length === 0) return { flushed: 0, failed: 0 };

      let flushed = 0;
      let failed = 0;

      for (const entry of queue) {
        try {
          // Sync to Firestore if user is authenticated
          if (window.firebase && firebase.apps && firebase.apps.length > 0) {
            const user = firebase.auth().currentUser;
            if (user) {
              await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('scans')
                .doc(entry.id)
                .set(entry);
            }
          }

          // Also persist to localStorage as primary local cache
          try {
            const existing = JSON.parse(localStorage.getItem('aegisresil_scans_v1') || '[]');
            const alreadyExists = existing.some(e => e.id === entry.id);
            if (!alreadyExists) {
              existing.push(entry);
              localStorage.setItem('aegisresil_scans_v1', JSON.stringify(existing));
            }
          } catch (lsErr) {
            console.warn('[EdgeSession] localStorage sync failed:', lsErr);
          }

          await _delete(STORE_QUEUE, entry.id);
          flushed++;
        } catch (e) {
          console.warn('[EdgeSession] Failed to flush entry:', entry.id, e);
          failed++;
        }
      }

      console.log(`[EdgeSession] Flushed ${flushed} queued entries. ${failed} failed.`);
      return { flushed, failed };
    },

    /**
     * Retrieves all offline stored scans from IndexedDB, sorted newest first.
     * @returns {Promise<Array>}
     */
    async getOfflineScans() {
      try {
        const all = await _getAll(STORE_SCANS);
        return all.sort((a, b) => b.timestamp - a.timestamp);
      } catch (e) {
        console.warn('[EdgeSession] getOfflineScans failed:', e);
        return [];
      }
    },

    /**
     * Returns count of pending-sync queue items.
     * Useful for showing a "N items pending sync" badge in the UI.
     * @returns {Promise<number>}
     */
    async getPendingCount() {
      const queue = await this.getQueue();
      return queue.length;
    },

    /**
     * Saves user session metadata to localStorage (fast, synchronous).
     * @param {string} key - e.g. 'region', 'lastTool', 'scanCount'
     * @param {*} value
     */
    setMeta(key, value) {
      try {
        localStorage.setItem(`aegisresil_meta_${key}`, JSON.stringify(value));
      } catch (e) {
        console.warn('[EdgeSession] setMeta failed:', e);
      }
    },

    /**
     * Gets user session metadata from localStorage.
     * @param {string} key
     * @param {*} defaultValue
     * @returns {*}
     */
    getMeta(key, defaultValue = null) {
      try {
        const raw = localStorage.getItem(`aegisresil_meta_${key}`);
        return raw !== null ? JSON.parse(raw) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },

    /**
     * Clears all IndexedDB offline data. Called on explicit user sign-out or data reset.
     * @returns {Promise<void>}
     */
    async clearAll() {
      try {
        const db = await _openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction([STORE_SCANS, STORE_QUEUE], 'readwrite');
          tx.objectStore(STORE_SCANS).clear();
          tx.objectStore(STORE_QUEUE).clear();
          tx.oncomplete = resolve;
          tx.onerror = (e) => reject(e.target.error);
        });
        console.log('[EdgeSession] All offline data cleared.');
      } catch (e) {
        console.warn('[EdgeSession] clearAll failed:', e);
      }
    },

    /**
     * Initializes the IndexedDB connection eagerly on load.
     * Call this once on app startup (in app.js or DOMContentLoaded).
     */
    async init() {
      try {
        await _openDB();
        console.log('[EdgeSession] IndexedDB initialized. Offline storage ready.');
      } catch (e) {
        console.warn('[EdgeSession] IndexedDB initialization failed. Offline storage unavailable:', e);
      }
    },
  };

})();
