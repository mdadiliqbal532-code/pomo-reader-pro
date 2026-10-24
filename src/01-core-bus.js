/* =========================================================================
   01-CORE-BUS.JS — EVENT BUS, UNIFIED APPDATA STORAGE & PLATFORM SHIELD
   ========================================================================= */

// 1. CENTRAL EVENT BUS (Decoupled Walkie-Talkie Between Modules)
window.PomoEventBus = {
    _listeners: {},
    on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    },
    emit(event, payload) {
        (this._listeners[event] || []).forEach(fn => {
            try { fn(payload); } catch (err) { console.warn(`[EventBus Error on ${event}]:`, err); }
        });
    }
};

// 2. UNIFIED INDEXEDDB ENGINE (50+ GB Capacity for Books, Covers & Attachments)
const DB_NAME = 'PomoReaderProDB_v1';
const DB_VERSION = 2;
let idbInstance = null;
window.coverMemoryCache = {};

function openUnifiedIDB() {
    return new Promise((resolve, reject) => {
        if (idbInstance) return resolve(idbInstance);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('bookFiles')) db.createObjectStore('bookFiles', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('lineAttachments')) db.createObjectStore('lineAttachments', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'key' });
            if (!db.objectStoreNames.contains('bookCovers')) db.createObjectStore('bookCovers', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('steelSnapshots')) db.createObjectStore('steelSnapshots', { keyPath: 'key' });
        };
        req.onsuccess = (e) => { idbInstance = e.target.result; resolve(idbInstance); };
        req.onerror = () => {
            const fb = indexedDB.open(DB_NAME);
            fb.onsuccess = (ev) => { idbInstance = ev.target.result; resolve(idbInstance); };
            fb.onerror = (er) => reject(er);
        };
    });
}

window.idbPut = async function(storeName, obj) {
    try {
        const db = await openUnifiedIDB();
        if (!db.objectStoreNames.contains(storeName)) return false;
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(obj);
            tx.oncomplete = () => res(true);
            tx.onerror = () => res(false);
        });
    } catch (e) { return false; }
};

window.idbGet = async function(storeName, key) {
    try {
        const db = await openUnifiedIDB();
        if (!db.objectStoreNames.contains(storeName)) return null;
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readonly');
            const r = tx.objectStore(storeName).get(key);
            r.onsuccess = () => res(r.result || null);
            r.onerror = () => res(null);
        });
    } catch (e) { return null; }
};

window.idbDelete = async function(storeName, key) {
    try {
        const db = await openUnifiedIDB();
        if (!db.objectStoreNames.contains(storeName)) return false;
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(key);
            tx.oncomplete = () => res(true);
            tx.onerror = () => res(false);
        });
    } catch (e) { return false; }
};

// Request Persistent OS AppData Storage Lock
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then(persisted => {
        const badge = document.getElementById('reader-folder-sync-badge');
        if (badge) {
            badge.innerHTML = `🛡️ AppData ${persisted ? 'Locked' : 'Active'} • Unlimited Shelf`;
        }
    }).catch(() => {});
}

// 3. SAFE LOCALSTORAGE ENGINE + UTILITIES
const MEM_CACHE = {};
window.safeGet = function(key, def) {
    try {
        const v = localStorage.getItem(key);
        if (v !== null && v !== undefined) return v;
        return MEM_CACHE[key] !== undefined ? MEM_CACHE[key] : def;
    } catch (e) {
        return MEM_CACHE[key] !== undefined ? MEM_CACHE[key] : def;
    }
};

window.safeSet = function(key, val) {
    MEM_CACHE[key] = val;
    try { localStorage.setItem(key, val); } catch (e) {}
};

window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

window.getLocalTodayString = function(dateObj = new Date()) {
    const d = new Date(dateObj.getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

window.formatDDMMYYYY = function(isoDateStr) {
    if (!isoDateStr || !isoDateStr.includes('-')) return '--/--/----';
    const [y, m, d] = isoDateStr.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

window.calcDaysRemaining = function(isoDateStr) {
    if (!isoDateStr) return 0;
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, 0, 0, 0, 0);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
};

window.addDaysToTodayISO = function(days) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (parseInt(days) || 0));
    return window.getLocalTodayString(target);
};

window.haptic = function(ms = 18) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};

window.showToast = function(msg, isError = false) {
    const toast = document.getElementById('custom-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed top-5 right-5 left-5 sm:left-auto backdrop-blur-md border font-bold py-3 px-5 rounded-xl shadow-2xl z-[999] text-xs sm:text-sm text-center transition-opacity ${isError ? 'bg-red-900/95 border-red-500 text-red-100' : 'bg-emerald-900/95 border-emerald-500 text-emerald-100'}`;
    toast.classList.remove('hidden');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
};

// 4. STRICT INNATE KEEP-SCREEN-ON ENGINE (Desktop + Android Bridge)
let wakeLockSentinel = null;
let keepAwakeOsc = null;
window.fallbackCtx = null;

window.enforceKeepScreenOn = async function() {
    try {
        if (window.AndroidBridge && typeof window.AndroidBridge.setKeepScreenOn === 'function') {
            window.AndroidBridge.setKeepScreenOn(true);
        }
        if ('wakeLock' in navigator && !wakeLockSentinel) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
        }
    } catch (e) {}
};

function activateStrictKeepAwake() {
    window.enforceKeepScreenOn();
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
        if (!keepAwakeOsc && window.fallbackCtx) {
            const gain = window.fallbackCtx.createGain();
            gain.gain.setValueAtTime(0.00001, window.fallbackCtx.currentTime);
            keepAwakeOsc = window.fallbackCtx.createOscillator();
            keepAwakeOsc.frequency.setValueAtTime(1, window.fallbackCtx.currentTime);
            keepAwakeOsc.connect(gain);
            gain.connect(window.fallbackCtx.destination);
            keepAwakeOsc.start();
        }
    } catch (e) {}
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') window.enforceKeepScreenOn();
});
document.addEventListener('pointerdown', activateStrictKeepAwake, { once: true });
setInterval(() => {
    if (document.visibilityState === 'visible') window.enforceKeepScreenOn();
}, 15000);
window.enforceKeepScreenOn();

// 5. PRIVACY PIN SHIELD & GLOBAL CRASH GUARD
window.addEventListener('error', (e) => console.warn('[Steel Shield Intercepted]:', e.message));
window.addEventListener('unhandledrejection', (e) => console.warn('[Steel Shield Promise]:', e.reason));

document.getElementById('privacy-lock-top-btn')?.addEventListener('click', () => {
    const savedPin = localStorage.getItem('pages_pomodoro_privacy_pin') || '';
    if (!savedPin) {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;
        titleEl.textContent = "🛡️ Set Desktop Privacy PIN";
        bodyEl.innerHTML = `
            <p class="text-xs text-slate-400">Protect your workspace with a personal Passcode/PIN.</p>
            <input type="password" id="new-privacy-pin-inp" placeholder="Create PIN / Passcode" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
            <button type="button" id="save-privacy-pin-btn" class="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">Save PIN & Lock Now</button>
        `;
        modal.classList.remove('hidden');
        document.getElementById('save-privacy-pin-btn').onclick = () => {
            const p = (document.getElementById('new-privacy-pin-inp').value || '').trim();
            if (p) {
                localStorage.setItem('pages_pomodoro_privacy_pin', btoa(p));
                modal.classList.add('hidden');
                document.getElementById('pomo-privacy-lock-overlay').classList.remove('hidden');
            }
        };
    } else {
        document.getElementById('pomo-privacy-lock-overlay').classList.remove('hidden');
    }
});

document.getElementById('privacy-unlock-submit-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('privacy-unlock-pin-input');
    const saved = localStorage.getItem('pages_pomodoro_privacy_pin') || '';
    if (btoa((inp.value || '').trim()) === saved) {
        inp.value = '';
        document.getElementById('pomo-privacy-lock-overlay').classList.add('hidden');
        window.showToast("🔓 Workspace Unlocked");
    } else {
        window.showToast("❌ Incorrect Passcode", true);
    }
});
