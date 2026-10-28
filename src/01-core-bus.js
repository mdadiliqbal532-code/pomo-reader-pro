/* =========================================================================
   01-CORE-BUS.JS (v17.0 ENTERPRISE DESKTOP EDITION)
   EVENT BUS, 32GB RAM / 1TB SSD HARDWARE DETECTOR, SAFE STORAGE, KEEP-SCREEN-ON,
   PRIVACY PIN (BOOT-TIME ENFORCED), GRANULAR ACHIEVEMENT NOTIFICATIONS,
   POMOWAKE MISSION OS (NEET-CALIBER SCIENCE & MATH MISSIONS),
   4-LANGUAGE SCHOLAR DICTIONARY & MASTER 15-PRO COMMAND HUB
   ========================================================================= */

// 1. CENTRAL EVENT BUS
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

// 2. 32GB RAM / 1TB SSD UNIFIED NON-BLOCKING INDEXEDDB ENGINE
const DB_NAME = 'PomoReaderProDB_v1';
const DB_VERSION = 6;
let idbInstance = null;
window.coverMemoryCache = {};

function openUnifiedIDB() {
    return new Promise((resolve) => {
        if (idbInstance) return resolve(idbInstance);
        let settled = false;
        const finish = (db) => {
            if (settled) return;
            settled = true;
            if (db) {
                db.onversionchange = () => { try { db.close(); } catch (e) {} idbInstance = null; };
                idbInstance = db;
            }
            resolve(db || null);
        };
        const safetyTimer = setTimeout(() => finish(null), 2500);
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('bookFiles')) db.createObjectStore('bookFiles', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('lineAttachments')) db.createObjectStore('lineAttachments', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('bookCovers')) db.createObjectStore('bookCovers', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('steelSnapshots')) db.createObjectStore('steelSnapshots', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('nlmCache')) db.createObjectStore('nlmCache', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('pomoAiSources')) db.createObjectStore('pomoAiSources', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('localAiBrainStore')) db.createObjectStore('localAiBrainStore', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('flashcardsStore')) db.createObjectStore('flashcardsStore', { keyPath: 'id' });
            };
            req.onsuccess = (e) => { clearTimeout(safetyTimer); finish(e.target.result); };
            req.onblocked = () => { clearTimeout(safetyTimer); finish(null); };
            req.onerror = () => {
                clearTimeout(safetyTimer);
                try {
                    const fb = indexedDB.open(DB_NAME);
                    fb.onsuccess = (ev) => finish(ev.target.result);
                    fb.onerror = () => finish(null);
                } catch (err) { finish(null); }
            };
        } catch (err) {
            clearTimeout(safetyTimer);
            finish(null);
        }
    });
}

window.idbPut = async function(storeName, obj) {
    try {
        const db = await openUnifiedIDB();
        if (!db || !db.objectStoreNames.contains(storeName)) return false;
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
        if (!db || !db.objectStoreNames.contains(storeName)) return null;
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readonly');
            const r = tx.objectStore(storeName).get(key);
            r.onsuccess = () => res(r.result || null);
            r.onerror = () => res(null);
        });
    } catch (e) { return null; }
};

window.idbGetAll = async function(storeName) {
    try {
        const db = await openUnifiedIDB();
        if (!db || !db.objectStoreNames.contains(storeName)) return [];
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readonly');
            const r = tx.objectStore(storeName).getAll();
            r.onsuccess = () => res(r.result || []);
            r.onerror = () => res([]);
        });
    } catch (e) { return []; }
};

window.idbDelete = async function(storeName, key) {
    try {
        const db = await openUnifiedIDB();
        if (!db || !db.objectStoreNames.contains(storeName)) return false;
        return new Promise((res) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(key);
            tx.oncomplete = () => res(true);
            tx.onerror = () => res(false);
        });
    } catch (e) { return false; }
};

// AUTO-DETECT 32GB RAM & 1TB SSD HARDWARE TIER
(async function detectHardwareAndStorageQuota() {
    const badge = document.getElementById('reader-folder-sync-badge');
    let persisted = false;
    try {
        if (navigator.storage && navigator.storage.persist) {
            persisted = await navigator.storage.persist();
        }
    } catch (e) {}

    let ssdLabel = '1TB+ NVMe SSD';
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            if (est && est.quota) {
                const totalGb = Math.round(est.quota / (1024 * 1024 * 1024));
                const usedMb = Math.round((est.usage || 0) / (1024 * 1024));
                if (totalGb > 0) {
                    ssdLabel = `${totalGb}GB SSD (${usedMb}MB Used)`;
                }
            }
        }
    } catch (e) {}

    const rawRam = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    const isHighSpecPc = (rawRam >= 8 && cores >= 8);
    window.pomoMaxPageBufferWindow = isHighSpecPc ? 40 : (rawRam <= 4 ? 6 : 16);
    const ramLabel = isHighSpecPc ? `32GB Workstation Turbo (${cores}-Thread)` : `${rawRam}GB+ RAM Mode`;

    if (badge) {
        badge.innerHTML = `🛡️ ${persisted ? 'Locked' : 'Active'} • ${ssdLabel} • ⚡ ${ramLabel}`;
    }
})();

// 3. SAFE LOCALSTORAGE ENGINE + APOSTROPHE-SAFE ESCAPE UTILITIES
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

window.escapeJsStr = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
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

window.haptic = function() {};

window.showToast = function(msg, isError = false) {
    const toast = document.getElementById('custom-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed top-5 right-5 backdrop-blur-md border font-bold py-3 px-5 rounded-xl shadow-2xl z-[99999] text-xs sm:text-sm text-center transition-opacity ${isError ? 'bg-red-900/95 border-red-500 text-red-100' : 'bg-emerald-900/95 border-emerald-500 text-emerald-100'}`;
    toast.classList.remove('hidden');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
};

// 4. STRICT KEEP-SCREEN-ON ENGINE & BOOT-TIME PRIVACY PIN SHIELD
let wakeLockSentinel = null;
let keepAwakeOsc = null;
window.fallbackCtx = null;

window.enforceKeepScreenOn = async function() {
    try {
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

// Enforce Privacy PIN Lock on Startup / Refresh if configured
window.addEventListener('DOMContentLoaded', () => {
    const savedPin = localStorage.getItem('pages_pomodoro_privacy_pin') || '';
    if (savedPin) {
        document.getElementById('pomo-privacy-lock-overlay')?.classList.remove('hidden');
    }
});

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
            <p class="text-xs text-slate-400">Protect your desktop workspace with a personal Passcode/PIN (Shortcut: Alt + L).</p>
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

// Manual Cockpit Layout Switcher Toggle (Split / Bento Grid / Zen Focus)
(function initCockpitLayoutSwitcher() {
    const btn = document.getElementById('cockpit-layout-toggle-btn');
    const lbl = document.getElementById('cockpit-layout-label');
    const layouts = ['split', 'bento', 'zen'];
    const names = { split: 'Layout: Split', bento: 'Layout: Bento', zen: 'Layout: Zen' };
    let curLayout = localStorage.getItem('pomo_cockpit_layout_mode') || 'split';

    function applyLayout(l) {
        curLayout = l;
        localStorage.setItem('pomo_cockpit_layout_mode', l);
        document.body.setAttribute('data-cockpit-layout', l);
        if (lbl) lbl.textContent = names[l] || 'Layout: Split';
    }
    applyLayout(curLayout);

    btn?.addEventListener('click', () => {
        const nextIdx = (layouts.indexOf(curLayout) + 1) % layouts.length;
        applyLayout(layouts[nextIdx]);
        window.showToast(`📐 Cockpit Layout switched to ${layouts[nextIdx].toUpperCase()}`);
    });
})();

// 5. GRANULAR FORCE ACHIEVEMENT NOTIFICATION ENGINE (DESKTOP EDITION)
(function initForceNotificationsAndAlertStudio() {
    const HTTPS = 'https:' + '//';
    window.unlockedAchievementsLog = JSON.parse(window.safeGet('pages_pomodoro_achievements_v15', '[]'));

    const defaultForceNotifyCfg = {
        masterEnabled: true,
        channels: { inAppBanner: true, osNotification: true, soundFanfare: true, telegramPush: false },
        categories: { level_up: true, memory_beast: true, reading_goal: true, mcq_sniper: false, study_streak: true, wake_recheck: false }
    };

    window.forceNotifyCfg = JSON.parse(window.safeGet('pages_pomodoro_force_notify_cfg_v15', 'null')) || defaultForceNotifyCfg;
    if (!window.forceNotifyCfg.channels) window.forceNotifyCfg.channels = defaultForceNotifyCfg.channels;
    if (!window.forceNotifyCfg.categories) window.forceNotifyCfg.categories = defaultForceNotifyCfg.categories;

    window.saveForceNotifyCfg = function() {
        window.safeSet('pages_pomodoro_force_notify_cfg_v15', JSON.stringify(window.forceNotifyCfg));
    };

    window.toggleForceNotifySetting = function(group, key) {
        if (group === 'master') {
            window.forceNotifyCfg.masterEnabled = !window.forceNotifyCfg.masterEnabled;
        } else if (group === 'channels' && window.forceNotifyCfg.channels) {
            window.forceNotifyCfg.channels[key] = !window.forceNotifyCfg.channels[key];
        } else if (group === 'categories' && window.forceNotifyCfg.categories) {
            window.forceNotifyCfg.categories[key] = !window.forceNotifyCfg.categories[key];
        }
        window.saveForceNotifyCfg();
        window.openDeviceWidgetStudioModal();
    };

    function detectAchievementCategory(title = '', achKey = '') {
        const hay = `${title} ${achKey}`.toLowerCase();
        if (hay.includes('level up') || hay.includes('lv_up')) return 'level_up';
        if (hay.includes('memory') || hay.includes('flashcard') || hay.includes('mem_beast')) return 'memory_beast';
        if (hay.includes('reading') || hay.includes('read_goal')) return 'reading_goal';
        if (hay.includes('mcq') || hay.includes('sniper')) return 'mcq_sniper';
        if (hay.includes('wake') || hay.includes('riser')) return 'wake_recheck';
        return 'study_streak';
    }

    window.playAchievementFanfare = function() {
        if (!window.forceNotifyCfg?.channels?.soundFanfare) return;
        try {
            if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = window.fallbackCtx;
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.11);
                gain.gain.setValueAtTime(0.28, now + idx * 0.11);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.55);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.11);
                osc.stop(now + idx * 0.11 + 0.55);
            });
        } catch (e) {}
    };

    window.triggerForceAchievementNotification = async function(title, body, badgeIcon = '🏆', achKey = null, pushToTelegram = true, forcedCat = null) {
        if (!window.forceNotifyCfg?.masterEnabled) return;

        const catKey = forcedCat || detectAchievementCategory(title, achKey || '');
        if (achKey !== 'test_alert' && window.forceNotifyCfg?.categories && window.forceNotifyCfg.categories[catKey] === false) {
            return;
        }

        if (achKey && achKey !== 'test_alert' && window.unlockedAchievementsLog.some(a => a.key === achKey)) return;
        if (achKey && achKey !== 'test_alert') {
            window.unlockedAchievementsLog.unshift({ key: achKey, title, body, badgeIcon, category: catKey, date: new Date().toISOString() });
            window.safeSet('pages_pomodoro_achievements_v15', JSON.stringify(window.unlockedAchievementsLog.slice(0, 100)));
        }

        const ch = window.forceNotifyCfg.channels || {};
        if (ch.soundFanfare) window.playAchievementFanfare();

        if (ch.osNotification) {
            try {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`${badgeIcon} ${title}`, { body, icon: './icon.svg', requireInteraction: true });
                }
            } catch (e) {}
        }

        if (ch.inAppBanner) {
            let banner = document.getElementById('force-achievement-popup-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'force-achievement-popup-banner';
                banner.className = "fixed top-16 left-1/2 -translate-x-1/2 z-[99998] w-[92vw] max-w-md bg-gradient-to-r from-amber-950/98 via-slate-900/98 to-emerald-950/98 border-2 border-amber-400 rounded-3xl p-4 shadow-[0_0_40px_rgba(245,158,11,0.5)] flex items-center justify-between gap-3 transition-all";
                document.body.appendChild(banner);
            }
            banner.innerHTML = `
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-2xl shrink-0 animate-bounce">${badgeIcon}</div>
                    <div class="min-w-0">
                        <span class="text-[9px] font-mono font-extrabold uppercase tracking-widest bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">⚡ ACHIEVEMENT UNLOCKED</span>
                        <h4 class="text-xs sm:text-sm font-extrabold text-white mt-1 truncate">${escapeHtml(title)}</h4>
                        <p class="text-[11px] text-amber-200/90 leading-snug mt-0.5">${escapeHtml(body)}</p>
                    </div>
                </div>
                <div class="flex flex-col gap-1 shrink-0">
                    <button type="button" onclick="this.closest('#force-achievement-popup-banner').remove()" class="bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold px-2.5 py-1 rounded-xl text-xs">OK</button>
                    <button type="button" onclick="this.closest('#force-achievement-popup-banner').remove(); window.openDeviceWidgetStudioModal();" class="text-[9px] text-slate-400 hover:text-white underline">⚙️ Mute</button>
                </div>
            `;
            clearTimeout(window._achBannerTimer);
            window._achBannerTimer = setTimeout(() => banner?.remove(), 8000);
        }

        if (ch.telegramPush && pushToTelegram && navigator.onLine) {
            const token = window.safeGet('pages_pomodoro_tg_token', '');
            const chatId = window.safeGet('pages_pomodoro_tg_chatid', '');
            if (token && chatId) {
                try {
                    await fetch(`${HTTPS}api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `${badgeIcon} *DEENTIMER PRO ACHIEVEMENT ALERT* ${badgeIcon}\n\n*${title}*\n${body}`,
                            parse_mode: 'Markdown'
                        })
                    });
                } catch (e) {}
            }
        }
    };

    window.openDeviceWidgetStudioModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;

        const cfg = window.forceNotifyCfg;
        const ch = cfg.channels || {};
        const cat = cfg.categories || {};

        titleEl.textContent = "🔔 Granular Force Notification Controls & Mini-PiP";
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-3 text-xs">
                <div class="bg-slate-950 border border-amber-500/50 rounded-2xl p-3.5 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                            <span class="text-[10px] font-extrabold uppercase text-amber-400">🔔 Force Achievement Notifications</span>
                            <p class="text-[10px] text-slate-400">Choose which channels & achievement types are allowed to notify you</p>
                        </div>
                        <button type="button" onclick="window.toggleForceNotifySetting('master')" class="px-3 py-1.5 rounded-xl text-xs font-extrabold ${cfg.masterEnabled ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">
                            ${cfg.masterEnabled ? 'MASTER ON ✓' : 'ALL MUTED 🔇'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    document.getElementById('mobile-widget-hub-btn')?.addEventListener('click', window.openDeviceWidgetStudioModal);
})();

// 6. POMOWAKE MISSION OS (WITH NEET-CALIBER SCIENCE, PHYSICS & MATH CHALLENGES + 5-MIN WAKE RECHECK)
(function initPomoWakeMissionOS() {
    window.sendDesktopNotification = function(title, body, tag = 'pomo-os', requireInteraction = false) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const n = new Notification(title, { body, icon: './icon.svg', badge: './icon.svg', tag, requireInteraction });
                n.onclick = () => { window.focus(); n.close(); };
            }
        } catch (e) {}
    };

    window.requestAllDesktopPermissions = async function(interactive = true) {
        const grantedList = [];
        try {
            if ('Notification' in window) {
                const np = await Notification.requestPermission();
                if (np === 'granted') grantedList.push('Notifications');
            }
        } catch (e) {}
        try {
            if (navigator.storage && navigator.storage.persist) {
                const sp = await navigator.storage.persist();
                if (sp) grantedList.push('AppData Lock');
            }
        } catch (e) {}
        try {
            await window.enforceKeepScreenOn();
            grantedList.push('WakeLock');
        } catch (e) {}
        if (interactive) {
            window.showToast(`🖥️ OS Permissions Active: ${grantedList.join(' • ') || 'Ready'}`);
        }
    };

    window.pomoAlarms = JSON.parse(window.safeGet('pages_pomodoro_alarms_v1', 'null')) || [
        { id: 'alm_fajr', time: '05:05', label: '🕋 Fajr & NEET Physics Wake-Up', mission: 'neet_physics', muteWindowSec: 90, wakeRecheck: true, enabled: false, days: [0,1,2,3,4,5,6] },
        { id: 'alm_study', time: '08:00', label: '🔥 Morning NEET Chem & Bio Lock-In', mission: 'neet_chem', muteWindowSec: 90, wakeRecheck: true, enabled: false, days: [0,1,2,3,4,5,6] }
    ];
    window.firedAlarmKeys = {};
    window.activeSirenLoop = null;
    window.customAlarmAudioEl = null;
    window.alarmMuteCountdownTimer = null;
    window.alarmMuteSecondsLeft = 0;

    window.savePomoAlarms = function() {
        window.safeSet('pages_pomodoro_alarms_v1', JSON.stringify(window.pomoAlarms));
        updateTopAlarmBtnBadge();
        PomoEventBus.emit('alarms:updated');
    };

    window.startLoudSirenLoop = async function() {
        window.stopLoudSirenLoop(false);
        try {
            const customRing = await window.idbGet('steelSnapshots', 'custom_alarm_ringtone');
            if (customRing && customRing.dataUrl) {
                window.customAlarmAudioEl = new Audio(customRing.dataUrl);
                window.customAlarmAudioEl.loop = true;
                window.customAlarmAudioEl.volume = 1.0;
                await window.customAlarmAudioEl.play();
                return;
            }
        } catch (e) {}

        const fireSirenPulse = () => {
            try {
                if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
                const ctx = window.fallbackCtx;
                const now = ctx.currentTime;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = 'sawtooth';
                osc2.type = 'square';
                osc1.frequency.setValueAtTime(740, now);
                osc1.frequency.linearRampToValueAtTime(1180, now + 0.35);
                osc2.frequency.setValueAtTime(370, now);
                osc2.frequency.linearRampToValueAtTime(590, now + 0.35);
                gain.gain.setValueAtTime(0.42, now);
                gain.gain.exponentialRampToValueAtTime(0.02, now + 0.72);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(now);
                osc2.start(now);
                osc1.stop(now + 0.72);
                osc2.stop(now + 0.72);
            } catch (e) {}
        };
        fireSirenPulse();
        window.activeSirenLoop = setInterval(fireSirenPulse, 850);
    };

    window.stopLoudSirenLoop = function(clearQuietTimer = true) {
        if (window.activeSirenLoop) { clearInterval(window.activeSirenLoop); window.activeSirenLoop = null; }
        if (window.customAlarmAudioEl) {
            try { window.customAlarmAudioEl.pause(); window.customAlarmAudioEl.currentTime = 0; } catch (e) {}
            window.customAlarmAudioEl = null;
        }
        if (clearQuietTimer && window.alarmMuteCountdownTimer) {
            clearInterval(window.alarmMuteCountdownTimer);
            window.alarmMuteCountdownTimer = null;
            window.alarmMuteSecondsLeft = 0;
        }
    };

    window.activateAlarmQuietSolveWindow = function(seconds = 90) {
        window.stopLoudSirenLoop(true);
        window.alarmMuteSecondsLeft = parseInt(seconds) || 90;
        const badge = document.getElementById('alarmy-quiet-solve-badge');
        if (badge) {
            badge.className = "text-[11px] font-mono font-extrabold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-3 py-1.5 rounded-xl";
            badge.textContent = `🔇 Siren Muted (${window.alarmMuteSecondsLeft}s left to solve peacefully)`;
        }
        window.alarmMuteCountdownTimer = setInterval(() => {
            if (!document.getElementById('alarmy-mission-active-overlay')) {
                window.stopLoudSirenLoop(true);
                return;
            }
            window.alarmMuteSecondsLeft--;
            const b = document.getElementById('alarmy-quiet-solve-badge');
            if (window.alarmMuteSecondsLeft > 0) {
                if (b) b.textContent = `🔇 Siren Muted (${window.alarmMuteSecondsLeft}s left to solve peacefully)`;
            } else {
                clearInterval(window.alarmMuteCountdownTimer);
                window.alarmMuteCountdownTimer = null;
                if (b) {
                    b.className = "text-[11px] font-mono font-extrabold bg-red-950/90 text-red-300 border border-red-500/50 px-3 py-1.5 rounded-xl animate-pulse";
                    b.textContent = `🔊 Time Up! Siren Resumed — Click Mute 60s/90s or Type to Silence`;
                }
                window.startLoudSirenLoop();
            }
        }, 1000);
    };

    window.scheduleFiveMinuteWakeRecheck = function(alarmObj) {
        if (alarmObj.wakeRecheck === false) return;
        window.showToast("🛡️ 5-Min Wake-Up Recheck Armed!");
        setTimeout(() => {
            let responded = false;
            let recheckModal = document.getElementById('pomowake-recheck-modal');
            if (!recheckModal) {
                recheckModal = document.createElement('div');
                recheckModal.id = 'pomowake-recheck-modal';
                recheckModal.className = "fixed inset-0 z-[99994] modal-backdrop flex items-center justify-center p-4";
                document.body.appendChild(recheckModal);
            }
            if (window.playChime) window.playChime('salah');
            recheckModal.innerHTML = `
                <div class="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 max-w-sm w-full text-center flex flex-col gap-3 shadow-2xl">
                    <span class="text-4xl animate-bounce">☀️</span>
                    <h3 class="text-base font-extrabold text-white">5-Minute Wake-Up Recheck!</h3>
                    <p class="text-xs text-slate-300">Click below within <b>60 seconds</b> to confirm you didn't fall back asleep after "${escapeHtml(alarmObj.label)}"!</p>
                    <button type="button" id="confirm-awake-recheck-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs uppercase shadow-lg">✅ I Am 100% Awake & Locked In!</button>
                </div>
            `;
            recheckModal.classList.remove('hidden');
            const failTimer = setTimeout(() => {
                if (!responded) {
                    recheckModal.remove();
                    window.triggerMissionAlarmOverlay(alarmObj);
                }
            }, 60000);
            document.getElementById('confirm-awake-recheck-btn').onclick = () => {
                responded = true;
                clearTimeout(failTimer);
                recheckModal.remove();
                window.triggerForceAchievementNotification('Early Riser Discipline!', `Passed 5-Minute Wake Recheck for "${alarmObj.label}" (+50 XP)!`, '☀️');
            };
        }, 5 * 60 * 1000);
    };

    function updateTopAlarmBtnBadge() {
        const btn = document.getElementById('alarmy-top-btn');
        if (!btn) return;
        const activeCount = (window.pomoAlarms || []).filter(a => a.enabled).length;
        btn.innerHTML = `<span>⏰</span><span class="text-[10px]">${activeCount > 0 ? `${activeCount} ON` : 'Wake'}</span>`;
        btn.className = activeCount > 0
            ? "bg-rose-600/25 hover:bg-rose-600/35 text-rose-300 border border-rose-500/50 px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 active:scale-95"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95";
    }

    const leftHeaderGrp = document.getElementById('dim-toggle-btn')?.parentElement;
    if (leftHeaderGrp && !document.getElementById('alarmy-top-btn')) {
        const almBtn = document.createElement('button');
        almBtn.type = 'button';
        almBtn.id = 'alarmy-top-btn';
        almBtn.title = "Open PomoWake Mission Alarms & Task Reminders";
        almBtn.onclick = () => window.openAlarmyStudioModal();
        leftHeaderGrp.appendChild(almBtn);
        updateTopAlarmBtnBadge();
    }

    window.openAlarmyStudioModal = function() {
        let modal = document.getElementById('alarmy-studio-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'alarmy-studio-modal';
            modal.className = "hidden fixed inset-0 modal-backdrop z-[420] flex items-center justify-center p-4";
            document.body.appendChild(modal);
        }
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        modal.innerHTML = `
            <div class="bg-slate-900 border border-rose-500/50 rounded-3xl p-5 w-full max-w-lg shadow-2xl flex flex-col gap-3.5 max-h-[92dvh] native-scroll">
                <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
                    <div>
                        <span class="text-[9px] font-extrabold uppercase tracking-widest bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">⏰ PomoWake Mission OS (v17.0 NEET Edition)</span>
                        <h3 class="text-base font-extrabold text-white mt-1">NEET Physics, Chem & Bio Numerical Alarms</h3>
                    </div>
                    <button type="button" onclick="document.getElementById('alarmy-studio-modal').classList.add('hidden')" class="bg-slate-800 text-slate-300 px-3 py-1 rounded-xl text-xs font-bold">✕ Close</button>
                </div>

                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
                    <p class="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">➕ Create New NEET-Caliber Alarm</p>
                    <div class="grid grid-cols-3 gap-2">
                        <input type="time" id="new-alarm-time-inp" value="05:05" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-extrabold text-white">
                        <select id="new-alarm-mission-sel" class="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-amber-300">
                            <option value="neet_physics">⚡ NEET Physics (Kinematics & Optics v=u+at)</option>
                            <option value="neet_chem">🧪 Physical Chem (pH = -log[H+] & Half-life)</option>
                            <option value="neet_calculus">📐 Calculus & Algebra Derivatives (d/dx)</option>
                            <option value="neet_master">🩺 NEET Master Mix (Physics + Chem + Bio Math)</option>
                            <option value="vault">🧬 Study Vault Recall Mission</option>
                            <option value="standard">🔔 Standard 1-Click Dismiss</option>
                        </select>
                        <select id="new-alarm-mute-sel" class="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-emerald-300">
                            <option value="60">🔇 60s Quiet-Solve Mute</option>
                            <option value="90" selected>🔇 90s Quiet-Solve Mute</option>
                            <option value="120">🔇 120s Quiet-Solve Mute</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="new-alarm-label-inp" placeholder="Alarm Label (e.g. Fajr + Physics Wave Optics)..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                        <button type="button" onclick="window.addNewMissionAlarm()" class="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow">＋ Add Alarm</button>
                    </div>
                </div>

                <div class="flex flex-col gap-2 max-h-64 native-scroll">
                    ${window.pomoAlarms.map((a, idx) => `
                        <div class="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border ${a.enabled ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800 opacity-60'}">
                            <div class="min-w-0 flex-1 pr-2">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-lg font-mono font-extrabold text-white">${escapeHtml(a.time)}</span>
                                    <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">${escapeHtml(a.mission.toUpperCase())}</span>
                                    <span class="text-[9px] font-mono text-emerald-400">🔇 ${a.muteWindowSec || 90}s Mute • 🛡️ 5m Recheck</span>
                                </div>
                                <p class="text-xs font-bold text-slate-200 truncate mt-0.5">${escapeHtml(a.label)}</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button type="button" onclick="window.toggleMissionAlarm(${idx})" class="px-3 py-1.5 rounded-xl text-xs font-extrabold ${a.enabled ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">${a.enabled ? 'ON' : 'OFF'}</button>
                                <button type="button" onclick="window.deleteMissionAlarm(${idx})" class="bg-slate-900 text-red-400 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    window.addNewMissionAlarm = function() {
        const time = document.getElementById('new-alarm-time-inp')?.value || '05:05';
        const mission = document.getElementById('new-alarm-mission-sel')?.value || 'neet_physics';
        const muteWindowSec = parseInt(document.getElementById('new-alarm-mute-sel')?.value) || 90;
        const label = (document.getElementById('new-alarm-label-inp')?.value || '').trim() || 'NEET Morning Wake-Up';
        window.pomoAlarms.unshift({
            id: 'alm_' + Date.now(),
            time, label, mission, muteWindowSec, wakeRecheck: true, enabled: true, days: [0,1,2,3,4,5,6]
        });
        window.savePomoAlarms();
        window.openAlarmyStudioModal();
        window.showToast(`⏰ PomoWake NEET Alarm set for ${time}!`);
    };

    window.toggleMissionAlarm = function(idx) {
        if (window.pomoAlarms[idx]) {
            window.pomoAlarms[idx].enabled = !window.pomoAlarms[idx].enabled;
            window.savePomoAlarms();
            window.openAlarmyStudioModal();
        }
    };

    window.deleteMissionAlarm = function(idx) {
        window.pomoAlarms.splice(idx, 1);
        window.savePomoAlarms();
        window.openAlarmyStudioModal();
    };

    // NEET-CALIBER ALARM MISSION GENERATOR (Physics, Physical Chemistry, Calculus & Physiology)
    window.triggerMissionAlarmOverlay = function(alarmObj) {
        let ov = document.getElementById('alarmy-mission-active-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'alarmy-mission-active-overlay';
            ov.className = "fixed inset-0 z-[99995] alarmy-siren-bg flex items-center justify-center p-4";
            document.body.appendChild(ov);
        }
        window.startLoudSirenLoop();
        window.sendDesktopNotification(`⏰ POMOWAKE NEET: ${alarmObj.label}`, `Solve your ${alarmObj.mission.toUpperCase()} challenge to wake up!`, 'alarmy-ring', true);

        let missionPrompt = '';
        let expectedAnswer = '';
        let stepCount = 3;
        let currentStep = 1;
        const defaultMuteSec = alarmObj.muteWindowSec || 90;

        function generateNeetChallenge() {
            const mType = alarmObj.mission === 'neet_master'
                ? ['neet_physics', 'neet_chem', 'neet_calculus'][currentStep % 3]
                : (alarmObj.mission || 'neet_physics');

            if (mType === 'neet_physics') {
                const u = Math.floor(Math.random() * 5) * 2; // 0, 2, 4, 6, 8
                const a = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
                const t = Math.floor(Math.random() * 4) + 3; // 3, 4, 5, 6
                const v = u + a * t;
                missionPrompt = `⚡ NEET Physics Kinematics (${currentStep}/${stepCount}):\nA particle starts with initial velocity u = ${u} m/s and constant acceleration a = ${a} m/s² for t = ${t} s.\nFind final velocity v = ? (m/s)`;
                expectedAnswer = String(v);
            } else if (mType === 'neet_chem') {
                const powers = [3, 4, 5, 6];
                const p = powers[Math.floor(Math.random() * powers.length)];
                // [H+] = 1.0 x 10^-p -> pH = p
                missionPrompt = `🧪 NEET Physical Chemistry (${currentStep}/${stepCount}):\nCalculate the pH of an aqueous solution where hydrogen ion concentration [H⁺] = 1.0 × 10⁻${p} mol/L.\nFind pH = ?`;
                expectedAnswer = String(p);
            } else if (mType === 'neet_calculus') {
                const coeff = Math.floor(Math.random() * 4) + 2;
                const pow = Math.floor(Math.random() * 2) + 3; // 3 or 4
                const atX = Math.floor(Math.random() * 2) + 1; // 1 or 2
                // y = coeff * x^pow -> y' = coeff * pow * x^(pow-1)
                const derivedCoeff = coeff * pow;
                const derivedPow = pow - 1;
                const ans = derivedCoeff * Math.pow(atX, derivedPow);
                missionPrompt = `📐 NEET Calculus & Math (${currentStep}/${stepCount}):\nIf y = ${coeff}x^${pow}, evaluate the derivative dy/dx at x = ${atX}.\nAnswer = ?`;
                expectedAnswer = String(ans);
            } else {
                const sv = Math.floor(Math.random() * 15) + 65; // 70-80 mL
                const hr = Math.floor(Math.random() * 10) + 70; // 70-80 bpm
                const co = (sv * hr) / 1000; // Liters/min
                missionPrompt = `🩺 NEET Human Physiology (${currentStep}/${stepCount}):\nCalculate Cardiac Output (CO in L/min) if Stroke Volume (SV) = ${sv} mL and Heart Rate (HR) = ${hr} beats/min.\nAnswer (in L/min, e.g. 5.2 or 5) = ?`;
                expectedAnswer = String(Number.isInteger(co) ? co : co.toFixed(1));
            }
        }
        generateNeetChallenge();

        function renderMissionCard() {
            ov.innerHTML = `
                <div class="bg-slate-950/95 border-2 border-red-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-3.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">${escapeHtml(alarmObj.time)} • NEET ALARM ACTIVE</span>
                        <div class="flex gap-1.5">
                            <button type="button" onclick="window.activateAlarmQuietSolveWindow(60)" class="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 border border-emerald-500/50 px-2.5 py-1 rounded-lg text-[10px] font-extrabold">🔇 Mute 60s</button>
                            <button type="button" onclick="window.activateAlarmQuietSolveWindow(90)" class="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 border border-cyan-500/50 px-2.5 py-1 rounded-lg text-[10px] font-extrabold">🔇 Mute 90s</button>
                        </div>
                    </div>
                    <h2 class="text-xl font-extrabold text-white">${escapeHtml(alarmObj.label)}</h2>
                    <div id="alarmy-quiet-solve-badge" class="text-[11px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                        💡 Solve the NEET numerical below to silence the siren!
                    </div>
                    <div class="bg-slate-900 border border-amber-500/50 rounded-2xl p-4">
                        <p class="text-xs sm:text-sm font-mono font-extrabold text-amber-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(missionPrompt)}</p>
                        <input type="text" id="alarmy-mission-ans-inp" placeholder="Type numerical answer..." class="w-full mt-3 bg-slate-950 border-2 border-blue-500 rounded-xl px-4 py-3 text-center font-mono text-base font-extrabold text-white focus:outline-none" autocomplete="off">
                    </div>
                    <button type="button" id="alarmy-submit-mission-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-lg">
                        ✅ Verify NEET Answer (${currentStep}/${stepCount})
                    </button>
                </div>
            `;
            const inp = document.getElementById('alarmy-mission-ans-inp');
            setTimeout(() => inp?.focus(), 60);

            inp?.addEventListener('input', () => {
                if (window.activeSirenLoop || window.customAlarmAudioEl) {
                    window.activateAlarmQuietSolveWindow(defaultMuteSec);
                }
            });

            const checkFn = () => {
                const userVal = (inp?.value || '').trim().toLowerCase();
                if (userVal === expectedAnswer.toLowerCase()) {
                    if (currentStep < stepCount) {
                        currentStep++;
                        generateNeetChallenge();
                        renderMissionCard();
                        window.activateAlarmQuietSolveWindow(defaultMuteSec);
                    } else {
                        window.stopLoudSirenLoop(true);
                        ov.remove();
                        window.scheduleFiveMinuteWakeRecheck(alarmObj);
                        window.triggerForceAchievementNotification('NEET Morning Challenger!', `Successfully solved all 3 NEET numericals for "${alarmObj.label}" (+100 XP)!`, '🩺');
                    }
                } else {
                    window.showToast("❌ Incorrect numerical answer! Try again.", true);
                    if (inp) { inp.value = ''; inp.focus(); }
                }
            };
            document.getElementById('alarmy-submit-mission-btn').onclick = checkFn;
            inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkFn(); });
        }
        renderMissionCard();
    };

    setInterval(() => {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayIso = window.getLocalTodayString(now);
        const dayIdx = now.getDay();

        (window.pomoAlarms || []).forEach(alm => {
            if (!alm.enabled) return;
            if (Array.isArray(alm.days) && !alm.days.includes(dayIdx)) return;
            const key = `alm_${alm.id}_${todayIso}_${hhmm}`;
            if (alm.time === hhmm && !window.firedAlarmKeys[key]) {
                window.firedAlarmKeys[key] = true;
                window.triggerMissionAlarmOverlay(alm);
            }
        });
    }, 12000);
})();

// 7. POMOLEXICON 4-LANGUAGE MASTER DICTIONARY
(function initFourLanguageScholarDictionary() {
    const HTTPS = 'https:' + '//';
    const MEDICAL_ROOTS = {
        hyper: 'Greek: Over / Excessive / Above normal',
        hypo: 'Greek: Under / Deficient / Below normal',
        tachy: 'Greek: Fast / Rapid',
        brady: 'Greek: Slow',
        cardio: 'Greek (Kardia): Heart',
        neuro: 'Greek (Neuron): Nerve / Nervous system',
        hema: 'Greek (Haima): Blood',
        itis: 'Suffix: Inflammation',
        ectomy: 'Suffix: Surgical removal',
        pathy: 'Suffix: Disease or disorder'
    };

    var savedVocabBank = JSON.parse(window.safeGet('pages_pomodoro_vocab_bank_v12', '[]'));

    window.openReaderDictionaryModal = function(initialWord = '') {
        const modal = document.getElementById('reader-dictionary-modal');
        const inp = document.getElementById('dict-search-word-inp');
        if (!modal) return;
        modal.classList.remove('hidden');
        if (inp) {
            const cleanedInit = String(initialWord || '').replace(/\s+/g, ' ').trim().slice(0, 110);
            inp.value = cleanedInit;
            if (cleanedInit) window.lookupWordIn4Languages(cleanedInit);
            else setTimeout(() => inp.focus(), 60);
        }
    };

    document.getElementById('close-dictionary-modal-btn')?.addEventListener('click', () => {
        document.getElementById('reader-dictionary-modal')?.classList.add('hidden');
    });
    document.getElementById('reader-open-dict-top-btn')?.addEventListener('click', () => {
        window.openReaderDictionaryModal('');
    });
    document.getElementById('dict-lookup-run-btn')?.addEventListener('click', () => {
        const w = document.getElementById('dict-search-word-inp')?.value || '';
        window.lookupWordIn4Languages(w);
    });
    document.getElementById('dict-search-word-inp')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.lookupWordIn4Languages(e.target.value);
    });

    window.lookupWordIn4Languages = async function(rawQuery) {
        const query = String(rawQuery || '').replace(/\s+/g, ' ').trim();
        const body = document.getElementById('dict-results-body');
        if (!query || !body) return;

        const firstWordClean = query.split(/\s+/)[0].replace(/^[^a-zA-Z0-9\u0600-\u06FF\u0900-\u097F]+|[^a-zA-Z0-9\u0600-\u06FF\u0900-\u097F]+$/g, '') || query;
        body.innerHTML = `<p class="text-xs text-slate-400 p-4 text-center">⏳ Looking up "<b class="text-white">${escapeHtml(query)}</b>" across English, Arabic (العربية), Urdu (اردو) & Hindi (हिन्दी)...</p>`;

        const qLow = firstWordClean.toLowerCase();
        const matchedRoots = Object.entries(MEDICAL_ROOTS)
            .filter(([k]) => qLow.includes(k))
            .map(([k, v]) => `<span class="bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-mono"><b>-${k}-</b>: ${escapeHtml(v)}</span>`);

        let engDef = '', phonetic = '', partOfSpeech = '', example = '';
        let arTrans = '', urTrans = '', hiTrans = '';

        if (navigator.onLine) {
            try {
                const dictUrl = `${HTTPS}api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(firstWordClean)}`;
                const dRes = await fetch(dictUrl);
                if (dRes.ok) {
                    const dJson = await dRes.json();
                    const entry = dJson?.[0];
                    phonetic = entry?.phonetic || entry?.phonetics?.find(p => p.text)?.text || '';
                    const m = entry?.meanings?.[0];
                    partOfSpeech = m?.partOfSpeech || '';
                    engDef = m?.definitions?.[0]?.definition || '';
                    example = m?.definitions?.[0]?.example || '';
                }
            } catch (e) {}

            const fetchTrans = async (langCode) => {
                try {
                    const transUrl = `${HTTPS}translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(query)}`;
                    const r = await fetch(transUrl);
                    if (r.ok) {
                        const j = await r.json();
                        return (j?.[0] || []).map(x => x?.[0]).join('') || '';
                    }
                } catch (e) {}
                return '';
            };

            [arTrans, urTrans, hiTrans] = await Promise.all([fetchTrans('ar'), fetchTrans('ur'), fetchTrans('hi')]);
        }

        window.lastDictLookupObj = { word: firstWordClean, engDef: engDef || query, arTrans, urTrans, hiTrans };
        const safePronounceWord = window.escapeJsStr(firstWordClean);

        body.innerHTML = `
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div class="flex items-baseline justify-between border-b border-slate-800 pb-2 gap-2 flex-wrap">
                    <div class="min-w-0">
                        <span class="text-base font-extrabold text-white">${escapeHtml(firstWordClean)}</span>
                        ${phonetic ? `<span class="text-xs font-mono text-cyan-400 ml-2">${escapeHtml(phonetic)}</span>` : ''}
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                        <button type="button" onclick="window.saveCurrentWordToVocabBank()" class="bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-bold">⭐ Save Word</button>
                        <button type="button" onclick="window.speechSynthesis && window.speechSynthesis.speak(new SpeechSynthesisUtterance('${safePronounceWord}'))" class="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-bold">🔊 Pronounce</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-slate-900 border border-blue-500/30 rounded-xl p-2.5">
                        <span class="text-[10px] font-extrabold uppercase text-blue-400">🇬🇧 English Meaning</span>
                        <p class="text-xs text-slate-100 mt-1 leading-relaxed">${escapeHtml(engDef || `Term: "${query}"`)}</p>
                    </div>
                    <div class="bg-slate-900 border border-emerald-500/30 rounded-xl p-2.5 text-right" dir="rtl">
                        <span class="text-[10px] font-extrabold uppercase text-emerald-400 block" dir="ltr">🇸🇦 Arabic (العربية)</span>
                        <p class="text-base font-bold text-white mt-1">${escapeHtml(arTrans || '—')}</p>
                    </div>
                    <div class="bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 text-right" dir="rtl">
                        <span class="text-[10px] font-extrabold uppercase text-amber-400 block" dir="ltr">🇵🇰🇮🇳 Urdu (اردو)</span>
                        <p class="text-base font-bold text-white mt-1">${escapeHtml(urTrans || '—')}</p>
                    </div>
                    <div class="bg-slate-900 border border-purple-500/30 rounded-xl p-2.5">
                        <span class="text-[10px] font-extrabold uppercase text-purple-400 block">🇮🇳 Hindi (हिन्दी)</span>
                        <p class="text-base font-bold text-white mt-1">${escapeHtml(hiTrans || '—')}</p>
                    </div>
                </div>
                ${matchedRoots.length ? `<div class="flex flex-wrap gap-1.5 pt-1">${matchedRoots.join('')}</div>` : ''}
            </div>
        `;
    };

    window.saveCurrentWordToVocabBank = function() {
        if (!window.lastDictLookupObj) return;
        savedVocabBank = savedVocabBank.filter(x => x.word.toLowerCase() !== window.lastDictLookupObj.word.toLowerCase());
        savedVocabBank.unshift({ ...window.lastDictLookupObj, savedAt: Date.now() });
        window.safeSet('pages_pomodoro_vocab_bank_v12', JSON.stringify(savedVocabBank));
        window.showToast(`⭐ Saved "${window.lastDictLookupObj.word}" to Vocab Bank!`);
    };
})();
// ✅ END OF FILE (01-core-bus.js v17.0 Enterprise Desktop Edition) — 100% COMPLETE & UNCUT
