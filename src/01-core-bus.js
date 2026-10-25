/* =========================================================================
   01-CORE-BUS.JS (v9.0) — EVENT BUS, 50GB APPDATA, ALARMY MISSION ENGINE & MOON+ CLOUD
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

// 2. UNIFIED INDEXEDDB ENGINE (50+ GB Capacity for Books, Covers, Alarms & Attachments)
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

// 6. WINDOWS DESKTOP NATIVE PERMISSIONS, ALARMY MISSION ENGINE & MOON+ CLOUD CONNECTOR
(function initDesktopNativeOSAndAlarmy() {
    const st = document.createElement('style');
    st.textContent = `
        body.dim-mode #home-reader-widget-card,
        body.dim-mode #home-omni-bento-strip { display: none !important; }
        @keyframes sirenPulse {
            0%, 100% { background-color: rgba(127, 29, 29, 0.96); box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.85); }
            50% { background-color: rgba(15, 23, 42, 0.98); box-shadow: inset 0 0 30px rgba(245, 158, 11, 0.5); }
        }
        .alarmy-siren-bg { animation: sirenPulse 1.1s infinite ease-in-out; }
    `;
    document.head.appendChild(st);

    window.sendDesktopNotification = function(title, body, tag = 'pomo-os', requireInteraction = false) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const n = new Notification(title, {
                    body,
                    icon: './icon.svg',
                    badge: './icon.svg',
                    tag,
                    requireInteraction
                });
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

        updateDesktopPermBtnUI();
        if (interactive) {
            window.showToast(`🖥️ Desktop Permissions Active: ${grantedList.join(' • ') || 'Ready'}`);
            window.sendDesktopNotification("⚡ DeenTimeR Pro Desktop OS", "All Windows Desktop notifications, alarms & background locks are active!");
        }
    };

    function updateDesktopPermBtnUI() {
        const btn = document.getElementById('desktop-perm-top-btn');
        if (!btn) return;
        const isGranted = ('Notification' in window && Notification.permission === 'granted');
        btn.className = isGranted
            ? "bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"
            : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 animate-pulse active:scale-95";
        btn.innerHTML = isGranted ? `<span>🔔</span><span class="hidden md:inline text-[10px]">OS Ready</span>` : `<span>🔔</span><span class="hidden md:inline text-[10px]">Allow Alerts</span>`;
    }

    // 7. ALARMY-KILLER MISSION ALARM ENGINE + CUSTOM MP3 RINGTONE + SIREN SYNTHESIZER
    window.pomoAlarms = JSON.parse(window.safeGet('pages_pomodoro_alarms_v1', 'null')) || [
        { id: 'alm_fajr', time: '05:05', label: '🕋 Fajr & Tahajjud Wake-Up', mission: 'math', difficulty: 'medium', enabled: false, days: [0,1,2,3,4,5,6] },
        { id: 'alm_study', time: '08:00', label: '🔥 Morning Deep Study Lock-In', mission: 'vault', difficulty: 'medium', enabled: false, days: [0,1,2,3,4,5,6] }
    ];
    window.firedAlarmKeys = {};
    window.activeSirenLoop = null;
    window.customAlarmAudioEl = null;

    window.savePomoAlarms = function() {
        window.safeSet('pages_pomodoro_alarms_v1', JSON.stringify(window.pomoAlarms));
        updateTopAlarmBtnBadge();
        PomoEventBus.emit('alarms:updated');
    };

    window.startLoudSirenLoop = async function() {
        window.stopLoudSirenLoop();
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
                gain.gain.setValueAtTime(0.45, now);
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
        window.activeSirenLoop = setInterval(fireSirenPulse, 820);
    };

    window.stopLoudSirenLoop = function() {
        if (window.activeSirenLoop) { clearInterval(window.activeSirenLoop); window.activeSirenLoop = null; }
        if (window.customAlarmAudioEl) {
            try { window.customAlarmAudioEl.pause(); window.customAlarmAudioEl.currentTime = 0; } catch (e) {}
            window.customAlarmAudioEl = null;
        }
    };

    function updateTopAlarmBtnBadge() {
        const btn = document.getElementById('alarmy-top-btn');
        if (!btn) return;
        const activeCount = (window.pomoAlarms || []).filter(a => a.enabled).length;
        btn.innerHTML = `<span>⏰</span><span class="hidden sm:inline text-[10px]">${activeCount > 0 ? `${activeCount} Active` : 'Alarms'}</span>`;
        btn.className = activeCount > 0
            ? "bg-rose-600/25 hover:bg-rose-600/35 text-rose-300 border border-rose-500/50 px-2.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 active:scale-95"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95";
    }

    const leftHeaderGrp = document.getElementById('dim-toggle-btn')?.parentElement;
    if (leftHeaderGrp) {
        if (!document.getElementById('desktop-perm-top-btn')) {
            const permBtn = document.createElement('button');
            permBtn.type = 'button';
            permBtn.id = 'desktop-perm-top-btn';
            permBtn.onclick = () => window.requestAllDesktopPermissions(true);
            leftHeaderGrp.appendChild(permBtn);
            updateDesktopPermBtnUI();
        }
        if (!document.getElementById('alarmy-top-btn')) {
            const almBtn = document.createElement('button');
            almBtn.type = 'button';
            almBtn.id = 'alarmy-top-btn';
            almBtn.title = "Open Built-In Alarmy Mission Alarms & Task Reminders";
            almBtn.onclick = () => window.openAlarmyStudioModal();
            leftHeaderGrp.appendChild(almBtn);
            updateTopAlarmBtnBadge();
        }
    }

    window.openAlarmyStudioModal = function() {
        let modal = document.getElementById('alarmy-studio-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'alarmy-studio-modal';
            modal.className = "hidden fixed inset-0 modal-backdrop z-[420] flex items-center justify-center p-3 sm:p-4";
            document.body.appendChild(modal);
        }
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        modal.innerHTML = `
            <div class="bg-slate-900 border border-rose-500/50 rounded-3xl p-5 w-full max-w-lg shadow-2xl flex flex-col gap-3.5 max-h-[92dvh] native-scroll">
                <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
                    <div>
                        <span class="text-[9px] font-extrabold uppercase tracking-widest bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">⏰ Built-In Alarmy-Killer OS</span>
                        <h3 class="text-base font-extrabold text-white mt-1">Mission Alarms & Wake-Up Studio</h3>
                    </div>
                    <button type="button" onclick="document.getElementById('alarmy-studio-modal').classList.add('hidden')" class="bg-slate-800 text-slate-300 px-3 py-1 rounded-xl text-xs font-bold">✕ Close</button>
                </div>

                <!-- Add New Mission Alarm -->
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
                    <p class="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">➕ Create New Mission Alarm</p>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="time" id="new-alarm-time-inp" value="05:15" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-extrabold text-white">
                        <select id="new-alarm-mission-sel" class="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-amber-300">
                            <option value="math">🧮 Math Brain-Wake (3 Equations)</option>
                            <option value="vault">🧬 Study Vault Recall Mission</option>
                            <option value="typing">⌨️ Discipline Typing Mission</option>
                            <option value="standard">🔔 Standard 1-Click Dismiss</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="new-alarm-label-inp" placeholder="Alarm Label (e.g. Fajr + Biology Revision)..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                        <button type="button" onclick="window.addNewMissionAlarm()" class="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow">＋ Add Alarm</button>
                    </div>
                </div>

                <!-- Custom MP3 Ringtone Uploader -->
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div>
                        <p class="text-xs font-bold text-white">🎵 Custom Alarm Ringtone (Optional MP3/WAV)</p>
                        <p class="text-[10px] text-slate-400">Stored 100% offline in AppData, or uses built-in High-Decibel Siren</p>
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                        <input type="file" id="custom-alarm-audio-inp" accept="audio/*" class="hidden">
                        <button type="button" onclick="document.getElementById('custom-alarm-audio-inp').click()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold">📂 Upload Audio</button>
                        <button type="button" onclick="window.triggerMissionAlarmOverlay({id:'test', time:'NOW', label:'Test Mission Alarm', mission: document.getElementById('new-alarm-mission-sel')?.value || 'math'})" class="bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold">🔊 Test Mission</button>
                    </div>
                </div>

                <!-- Alarms List -->
                <div class="flex flex-col gap-2 max-h-64 native-scroll">
                    ${window.pomoAlarms.map((a, idx) => `
                        <div class="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border ${a.enabled ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800 opacity-60'}">
                            <div class="min-w-0 flex-1 pr-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg font-mono font-extrabold text-white">${escapeHtml(a.time)}</span>
                                    <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-700">Mission: ${escapeHtml(a.mission.toUpperCase())}</span>
                                </div>
                                <p class="text-xs font-bold text-slate-200 truncate mt-0.5">${escapeHtml(a.label)}</p>
                                <p class="text-[9px] text-slate-500 font-mono mt-0.5">${(a.days || [0,1,2,3,4,5,6]).map(d => dayNames[d]).join(' • ')}</p>
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

        document.getElementById('custom-alarm-audio-inp')?.addEventListener('change', (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = async () => {
                await window.idbPut('steelSnapshots', { key: 'custom_alarm_ringtone', name: f.name, dataUrl: r.result });
                window.showToast(`🎵 Saved "${f.name}" as offline alarm ringtone!`);
            };
            r.readAsDataURL(f);
        });
    };

    window.addNewMissionAlarm = function() {
        const time = document.getElementById('new-alarm-time-inp')?.value || '06:00';
        const mission = document.getElementById('new-alarm-mission-sel')?.value || 'math';
        const label = (document.getElementById('new-alarm-label-inp')?.value || '').trim() || 'Wake-Up & Focus Mission';
        window.pomoAlarms.unshift({
            id: 'alm_' + Date.now(),
            time,
            label,
            mission,
            enabled: true,
            days: [0,1,2,3,4,5,6]
        });
        window.savePomoAlarms();
        window.openAlarmyStudioModal();
        window.showToast(`⏰ Alarm set for ${time} (${mission.toUpperCase()} Mission)!`);
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

    // Full-Screen Unstoppable Mission Alarm Overlay
    window.triggerMissionAlarmOverlay = function(alarmObj) {
        let ov = document.getElementById('alarmy-mission-active-overlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'alarmy-mission-active-overlay';
            ov.className = "fixed inset-0 z-[99995] alarmy-siren-bg flex items-center justify-center p-4";
            document.body.appendChild(ov);
        }
        window.startLoudSirenLoop();
        window.sendDesktopNotification(`⏰ ALARM: ${alarmObj.label}`, `Complete your ${alarmObj.mission.toUpperCase()} mission to stop the siren!`, 'alarmy-ring', true);

        let missionPrompt = '';
        let expectedAnswer = '';
        let stepCount = alarmObj.mission === 'math' ? 3 : 1;
        let currentStep = 1;

        function generateChallenge() {
            if (alarmObj.mission === 'math') {
                const a = Math.floor(Math.random() * 14) + 6;
                const b = Math.floor(Math.random() * 9) + 4;
                const c = Math.floor(Math.random() * 25) + 10;
                missionPrompt = `Solve Equation (${currentStep}/${stepCount}):  ${a} × ${b} + ${c} = ?`;
                expectedAnswer = String((a * b) + c);
            } else if (alarmObj.mission === 'vault') {
                const vTasks = JSON.parse(window.safeGet('pages_pomodoro_tasks_v8', '[]')).filter(t => !t.completed);
                const pick = vTasks[0]?.title || 'BIOLOGY MASTER';
                const cleanTarget = pick.slice(0, 22).trim();
                missionPrompt = `🧬 Vault Recall: Type "${cleanTarget}" below to prove you're awake:`;
                expectedAnswer = cleanTarget.toLowerCase();
            } else if (alarmObj.mission === 'typing') {
                const phrases = [
                    "LOCK IN AND PROTECT MY DEEN AND GOALS",
                    "DISCIPLINE OVER SLEEP SUCCESS IS EARNED",
                    "BISMILLAH I WILL MASTER MY TARGETS TODAY"
                ];
                const p = phrases[Math.floor(Math.random() * phrases.length)];
                missionPrompt = `⌨️ Type this phrase exactly:\n"${p}"`;
                expectedAnswer = p.toLowerCase();
            } else {
                missionPrompt = `🔔 Tap Dismiss below to wake up & start your day!`;
                expectedAnswer = '';
            }
        }
        generateChallenge();

        function renderMissionCard() {
            ov.innerHTML = `
                <div class="bg-slate-950/95 border-2 border-red-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-4">
                    <span class="text-5xl animate-bounce">⏰</span>
                    <div>
                        <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">${escapeHtml(alarmObj.time)} • MISSION ALARM ACTIVE</span>
                        <h2 class="text-xl font-extrabold text-white mt-2">${escapeHtml(alarmObj.label)}</h2>
                    </div>
                    <div class="bg-slate-900 border border-amber-500/50 rounded-2xl p-4">
                        <p class="text-sm font-mono font-extrabold text-amber-300 whitespace-pre-wrap">${escapeHtml(missionPrompt)}</p>
                        ${expectedAnswer ? `
                            <input type="text" id="alarmy-mission-ans-inp" placeholder="Type answer here..." class="w-full mt-3 bg-slate-950 border-2 border-blue-500 rounded-xl px-4 py-3 text-center font-mono text-base font-extrabold text-white focus:outline-none" autocomplete="off">
                        ` : ''}
                    </div>
                    <button type="button" id="alarmy-submit-mission-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-sm uppercase tracking-wider shadow-lg">
                        ${expectedAnswer ? `✅ Verify Answer (${currentStep}/${stepCount})` : `🔓 Dismiss Alarm Now`}
                    </button>
                </div>
            `;
            const inp = document.getElementById('alarmy-mission-ans-inp');
            setTimeout(() => inp?.focus(), 60);

            const checkFn = () => {
                if (!expectedAnswer) {
                    window.stopLoudSirenLoop();
                    ov.remove();
                    window.showToast("☀️ Alhamdulillah! Alarm dismissed — have a blessed & productive day!");
                    return;
                }
                const userVal = (inp?.value || '').trim().toLowerCase();
                if (userVal === expectedAnswer.toLowerCase()) {
                    if (currentStep < stepCount) {
                        currentStep++;
                        generateChallenge();
                        renderMissionCard();
                    } else {
                        window.stopLoudSirenLoop();
                        ov.remove();
                        window.showToast("🔥 Brain-Wake Mission Complete! Siren stopped.");
                    }
                } else {
                    window.showToast("❌ Incorrect! Keep trying to stop the siren!", true);
                    if (inp) { inp.value = ''; inp.focus(); }
                }
            };
            document.getElementById('alarmy-submit-mission-btn').onclick = checkFn;
            inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkFn(); });
        }
        renderMissionCard();
    };

    // Background Clock Watcher (Checks Mission Alarms & Per-Task Reminders Every 12 Seconds)
    setInterval(() => {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayIso = window.getLocalTodayString(now);
        const dayIdx = now.getDay();

        // 1. Check Alarmy Mission Alarms
        (window.pomoAlarms || []).forEach(alm => {
            if (!alm.enabled) return;
            if (Array.isArray(alm.days) && !alm.days.includes(dayIdx)) return;
            const key = `alm_${alm.id}_${todayIso}_${hhmm}`;
            if (alm.time === hhmm && !window.firedAlarmKeys[key]) {
                window.firedAlarmKeys[key] = true;
                window.triggerMissionAlarmOverlay(alm);
            }
        });

        // 2. Check Per-Task To-Do & Study Vault Reminders
        (window.todos || []).forEach(t => {
            if (t.completed || !t.reminderTime) return;
            if (t.dueDate && t.dueDate !== todayIso && t.myDayDate !== todayIso) return;
            const rKey = `todo_rem_${t.id}_${todayIso}_${hhmm}`;
            if (t.reminderTime === hhmm && !window.firedAlarmKeys[rKey]) {
                window.firedAlarmKeys[rKey] = true;
                if (window.playChime) window.playChime('salah');
                window.sendDesktopNotification(`🔔 Task Reminder: ${t.title}`, `Scheduled for ${hhmm}. Click to launch on Timer!`, rKey, true);
                window.showTaskReminderBanner(t);
            }
        });
    }, 12000);

    window.showTaskReminderBanner = function(taskObj) {
        let b = document.getElementById('live-task-reminder-popup');
        if (!b) {
            b = document.createElement('div');
            b.id = 'live-task-reminder-popup';
            b.className = "fixed bottom-20 right-4 left-4 sm:left-auto sm:w-96 z-[450] bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5";
            document.body.appendChild(b);
        }
        b.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <span class="text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">🔔 Scheduled Task Reminder (${escapeHtml(taskObj.reminderTime || 'NOW')})</span>
                    <h4 class="text-xs sm:text-sm font-extrabold text-white mt-1">${escapeHtml(taskObj.title)}</h4>
                </div>
                <button type="button" onclick="this.closest('#live-task-reminder-popup').remove()" class="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>
            <div class="flex gap-2">
                <button type="button" onclick="document.getElementById('live-task-reminder-popup')?.remove(); window.openProtocolRunModal && window.openProtocolRunModal('todo', '${taskObj.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-xs shadow">▶️ Run Now on Timer</button>
                <button type="button" onclick="document.getElementById('live-task-reminder-popup')?.remove()" class="bg-slate-800 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs">Later</button>
            </div>
        `;
    };

    // 8. MOON+ READER STYLE DIRECT CLOUD CONNECTOR (Google Drive, Dropbox API, WebDAV/URL & Local Folder)
    setTimeout(() => {
        const origConnect = window.connectOrConfigureCloud;
        window.connectOrConfigureCloud = function(cloudKey) {
            if (cloudKey === 'local' && origConnect) return origConnect('local');
            const cfg = window.readerSettings?.clouds?.[cloudKey];
            if (!cfg) return;

            const modal = document.getElementById('reader-suboptions-modal');
            const titleEl = document.getElementById('suboptions-modal-title');
            const bodyEl = document.getElementById('suboptions-modal-body');
            if (!modal || !titleEl || !bodyEl) {
                if (origConnect) return origConnect(cloudKey);
                return;
            }

            titleEl.textContent = `${cfg.icon} ${cfg.name} — Moon+ Cloud Connector`;
            bodyEl.innerHTML = `
                <p class="text-xs text-slate-400">Connect <b class="text-white">${escapeHtml(cfg.name)}</b> via Direct Cloud Link/API (works on PC & Smartphone) or link a local synced folder.</p>

                ${cloudKey === 'dropbox' ? `
                    <div class="bg-slate-950 border border-blue-500/40 rounded-2xl p-3.5 flex flex-col gap-2">
                        <label class="text-[10px] font-extrabold uppercase text-blue-400">📦 Dropbox Direct Cloud API Token (Moon+ Net Library)</label>
                        <input type="password" id="cloud-dbx-token-inp" value="${escapeHtml(cfg.token || '')}" placeholder="Paste Dropbox Access Token (sl.u...)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono">
                        <div class="flex gap-2">
                            <button type="button" id="save-dbx-token-btn" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs">💾 Save Dropbox Token</button>
                            <button type="button" id="browse-dbx-cloud-btn" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs">☁️ Browse / Pull /PomoReader</button>
                        </div>
                        <div id="dbx-cloud-files-list" class="flex flex-col gap-1.5 max-h-40 native-scroll mt-1"></div>
                    </div>
                ` : ''}

                <!-- Direct Cloud URL / Google Drive Link Downloader -->
                <div class="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-col gap-2">
                    <label class="text-[10px] font-extrabold uppercase text-emerald-400">🌐 Direct ${escapeHtml(cfg.name)} Share Link / Direct Book URL Import</label>
                    <input type="text" id="cloud-direct-url-inp" placeholder="Paste Google Drive Share Link, Dropbox Link, or Direct .pdf / .epub URL..." class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                    <div class="flex gap-2">
                        <input type="text" id="cloud-direct-name-inp" placeholder="Book Filename (e.g. Biology_Notes.pdf)" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                        <button type="button" id="cloud-direct-download-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow">⬇️ Pull to Shelf</button>
                    </div>
                </div>

                <!-- Local Synced Cloud Folder / File Picker -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <button type="button" id="cloud-link-pc-folder-btn" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5">📂 Link Synced PC Folder</button>
                    <button type="button" id="cloud-pick-files-btn" class="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5">📥 Select Files From Device</button>
                </div>
            `;
            modal.classList.remove('hidden');

            document.getElementById('save-dbx-token-btn')?.addEventListener('click', () => {
                const tk = (document.getElementById('cloud-dbx-token-inp')?.value || '').trim();
                cfg.token = tk;
                cfg.connected = Boolean(tk);
                cfg.status = tk ? 'Connected via Direct Dropbox API' : 'Not Connected';
                window.saveReaderMeta();
                window.showToast("✅ Dropbox Cloud API Token Saved!");
            });

            document.getElementById('browse-dbx-cloud-btn')?.addEventListener('click', async () => {
                const tk = (document.getElementById('cloud-dbx-token-inp')?.value || cfg.token || '').trim();
                if (!tk) { window.showToast("Paste your Dropbox Token first!", true); return; }
                cfg.token = tk; cfg.connected = true; window.saveReaderMeta();
                const listBox = document.getElementById('dbx-cloud-files-list');
                if (listBox) listBox.innerHTML = `<p class="text-[11px] text-slate-400">⏳ Scanning Dropbox /PomoReader folder...</p>`;
                try {
                    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${tk}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: '/PomoReader' })
                    });
                    const data = await res.json();
                    const entries = (data.entries || []).filter(e => e['.tag'] === 'file');
                    if (!entries.length) {
                        listBox.innerHTML = `<p class="text-[11px] text-slate-400">No books in /PomoReader yet. Click "☁️ Push" on any book card to upload!</p>`;
                        return;
                    }
                    listBox.innerHTML = entries.map(e => `
                        <div class="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <span class="text-xs text-white truncate pr-2">📘 ${escapeHtml(e.name)}</span>
                            <button type="button" onclick="window.pullSingleDropboxFile('${escapeHtml(e.path_display || e.path_lower)}', '${escapeHtml(e.name)}')" class="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded">⬇️ Pull</button>
                        </div>
                    `).join('');
                } catch (err) {
                    if (listBox) listBox.innerHTML = `<p class="text-[11px] text-red-400">Could not list /PomoReader (Push a book first to create the folder).</p>`;
                }
            });

            document.getElementById('cloud-direct-download-btn')?.addEventListener('click', async () => {
                let rawUrl = (document.getElementById('cloud-direct-url-inp')?.value || '').trim();
                let fName = (document.getElementById('cloud-direct-name-inp')?.value || '').trim() || `Cloud_Book_${Date.now()}.pdf`;
                if (!rawUrl) { window.showToast("Paste a cloud share link or direct URL first", true); return; }
                if (!/\.(pdf|epub|txt|md|docx)$/i.test(fName)) fName += '.pdf';

                // Convert Google Drive Share Link or Dropbox Share Link into direct download stream
                const gdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (gdMatch && gdMatch[1]) {
                    rawUrl = `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;
                } else if (rawUrl.includes('dropbox.com') && rawUrl.includes('dl=0')) {
                    rawUrl = rawUrl.replace('dl=0', 'dl=1');
                }

                try {
                    window.showToast(`☁️ Downloading "${fName}" from ${cfg.name}...`);
                    const res = await fetch(rawUrl);
                    if (!res.ok) throw new Error('CORS or private link');
                    const blob = await res.blob();
                    const fileObj = new File([blob], fName, { type: blob.type || 'application/pdf' });
                    cfg.connected = true;
                    cfg.status = `Connected (${fName})`;
                    window.saveReaderMeta();
                    modal.classList.add('hidden');
                    if (window.handleMultipleBookImport) await window.handleMultipleBookImport([fileObj], cloudKey, null);
                } catch (e) {
                    window.showToast("Direct fetch blocked by Google CORS — opening link in browser to save & drop onto shelf!", true);
                    window.open(rawUrl, '_blank');
                }
            });

            document.getElementById('cloud-link-pc-folder-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
                if (origConnect) origConnect(cloudKey);
            });

            document.getElementById('cloud-pick-files-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
                const inp = document.getElementById('reader-book-file-input');
                if (inp) {
                    inp.onchange = (ev) => {
                        cfg.connected = true;
                        cfg.status = 'Connected (Files Imported)';
                        window.saveReaderMeta();
                        if (window.handleMultipleBookImport) window.handleMultipleBookImport(ev.target.files, cloudKey, null);
                    };
                    inp.click();
                }
            });
        };

        window.pullSingleDropboxFile = async function(dbxPath, fileName) {
            const tk = window.readerSettings?.clouds?.dropbox?.token?.trim();
            if (!tk) return;
            try {
                window.showToast(`📲 Pulling "${fileName}" from Dropbox...`);
                const res = await fetch('https://content.dropboxapi.com/2/files/download', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${tk}`, 'Dropbox-API-Arg': JSON.stringify({ path: dbxPath }) }
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const fileObj = new File([blob], fileName, { type: 'application/pdf' });
                    document.getElementById('reader-suboptions-modal')?.classList.add('hidden');
                    if (window.handleMultipleBookImport) await window.handleMultipleBookImport([fileObj], 'dropbox', null);
                }
            } catch (e) { window.showToast("Dropbox download failed", true); }
        };
    }, 600);
})();
// ✅ END OF FILE (01-core-bus.js v9.0) — 100% UNCUT
