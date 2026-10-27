/* =========================================================================
   02-POMO-CORE.JS (v16.0 PURE DESKTOP EDITION) — UNIFIED TIMER, OVERTIME
   GUARDRAIL, 5-WAY POMOCLOUD FIREBASE SYNC, PROTOCOL LAUNCHER, WINDOW-AWARE
   SALAH FREEZE LOCK, POMOTASKS, 4-GRAPH STUDIO & DESKTOP HOTKEYS
   ========================================================================= */

// 0. DEFENSIVE DESKTOP COMPATIBILITY SHIM (Guarantees 100% sync with 01-core-bus.js)
window.haptic = window.haptic || function() {};
window.escapeJsStr = window.escapeJsStr || function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
};

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const defaultExtConfig = {
    studyTargetHours: 8.0,
    deenTargetHours: 1.0,
    customSubjects: ['Physics', 'Chemistry', 'Biology'],
    deenPurpose: {
        title: "🕌 Strengthen Deen & Imaan",
        desc: "Follow the Islamic path for my entire life — Salah on time & daily Deen knowledge."
    },
    mainGoal: {
        title: "Primary Life & Academic Goal",
        targetDate: addDaysToTodayISO(210)
    },
    sideGoals: [
        { id: 101, title: "Build & Ship Projects", targetDate: addDaysToTodayISO(45) },
        { id: 102, title: "Morning Fitness & Strength Routine", targetDate: addDaysToTodayISO(90) },
        { id: 103, title: "Master High-Yield Revision Bank", targetDate: addDaysToTodayISO(120) }
    ],
    salahTimes: {
        Fajr: "05:15",
        Dhuhr: "13:15",
        Asr: "16:45",
        Maghrib: "18:10",
        Isha: "19:45"
    },
    salahAlertsEnabled: true,
    salahFreezeEnabled: true,
    salahFreezeDurationMins: 10,
    masjidLocationName: "Local Masjid Schedule (Click any time to customize)"
};

window.extConfig = JSON.parse(safeGet('pages_pomodoro_ext_config_v9', 'null')) || defaultExtConfig;
extConfig.studyTargetHours = parseFloat(extConfig.studyTargetHours) || 8.0;
extConfig.deenTargetHours = parseFloat(extConfig.deenTargetHours) || 1.0;
if (!extConfig.deenPurpose) extConfig.deenPurpose = defaultExtConfig.deenPurpose;
if (!extConfig.mainGoal) extConfig.mainGoal = defaultExtConfig.mainGoal;
if (extConfig.mainGoal.title === 'Cracking NEET') extConfig.mainGoal.title = 'Primary Life & Academic Goal';
if (!Array.isArray(extConfig.sideGoals)) extConfig.sideGoals = defaultExtConfig.sideGoals;
if (!extConfig.salahTimes) extConfig.salahTimes = defaultExtConfig.salahTimes;
if (extConfig.salahFreezeEnabled === undefined) extConfig.salahFreezeEnabled = true;
extConfig.salahFreezeDurationMins = parseInt(extConfig.salahFreezeDurationMins) || 10;
if (!Array.isArray(extConfig.customSubjects) || !extConfig.customSubjects.length) {
    extConfig.customSubjects = ['Physics', 'Chemistry', 'Biology'];
}

window.salahHistory = JSON.parse(safeGet('pages_pomodoro_salah_hist_v9', '{}'));
window.deenHistory = JSON.parse(safeGet('pages_pomodoro_deen_hist_v9', '{}'));
window.todos = JSON.parse(safeGet('pages_pomodoro_todos_v9', '[]'));
window.todoLists = JSON.parse(safeGet('pages_pomodoro_todolists_v9', '[]'));
window.schedule = JSON.parse(safeGet('pages_pomodoro_schedule_v8', '[]'));
window.weeklyTemplates = JSON.parse(safeGet('pages_pomodoro_weekly_v8', 'null'));
if (!weeklyTemplates) {
    window.weeklyTemplates = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (let i = 0; i <= 6; i++) weeklyTemplates[i] = JSON.parse(JSON.stringify(schedule));
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
}

window.activeTemplateDay = new Date().getDay();
window.currentStepIndex = 0;
window.timeLeft = 0;
window.timerInterval = null;
window.isRunning = false;
window.targetEndTime = 0;
window.accumulatedStudyTime = 0;
window.accumulatedDeenTime = 0;
window.isOvertime = false;
window.overtimeExtensionMins = 0;
window.lastOvertimeWarnStage = 0;
window.isPureCountUpMode = false;
window.pureCountUpSeconds = 0;
window.activeTaskTab = 'backlog';
window.activeTaskSubj = extConfig.customSubjects[0] || 'Physics';
window.todoLayoutMode = safeGet('pages_pomodoro_todo_layout_v1', 'list');

let lastRenderedTime = -1, guidePopupTimeout = null, lastPopupStep = -1;

window.saveExtConfig = function() {
    safeSet('pages_pomodoro_ext_config_v9', JSON.stringify(extConfig));
    safeSet('pages_pomodoro_salah_hist_v9', JSON.stringify(salahHistory));
    safeSet('pages_pomodoro_deen_hist_v9', JSON.stringify(deenHistory));
    PomoEventBus.emit('config:saved');
};

/* =========================================================================
   1. POMOCLOUD FIREBASE OMNI-SYNC & EXTERNAL STUDIO BRIDGE
   ========================================================================= */
const firebaseConfig = {
    apiKey: "AIza" + "SyAbi9-V0S3DOtOAgBirMxrvV6J-XdwLf3Q",
    authDomain: "neettimercloud.firebaseapp.com",
    projectId: "neettimercloud",
    storageBucket: "neettimercloud.firebasestorage.app",
    messagingSenderId: "337999532676",
    appId: "1:337999532676:web:545ae526ab038192e3e8d1"
};

let db = null, auth = null, isAuthReady = false;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) {}

window.getPomoCloudDb = function() { return db; };

async function authenticateForCloud() {
    if (!auth) { isAuthReady = false; return false; }
    try { await auth.signInAnonymously(); isAuthReady = true; return true; }
    catch (err) { isAuthReady = true; return true; }
}
authenticateForCloud();

let currentSyncRoom = safeGet('pages_pomodoro_sync_room', '');
let savedPlainUser = safeGet('pages_pomodoro_sync_user', '');
let savedPlainPass = safeGet('pages_pomodoro_sync_pass', '');
let unsubscribeSnapshot = null;
let isInternalSyncUpdate = false;
let lastCloudReceiveTime = 0;
let cloudBroadcastTimer = null;

window.getCurrentSyncRoom = function() { return currentSyncRoom; };

window.broadcastToCloud = function() {
    if (!currentSyncRoom || isInternalSyncUpdate || (Date.now() - lastCloudReceiveTime < 900) || !db) return;
    clearTimeout(cloudBroadcastTimer);
    cloudBroadcastTimer = setTimeout(async () => {
        if (!currentSyncRoom || isInternalSyncUpdate || (Date.now() - lastCloudReceiveTime < 900) || !db) return;
        try {
            const roomDoc = db.collection('artifacts').doc('neettimercloud').collection('public').doc('data').collection('sync_rooms').doc(currentSyncRoom);
            await roomDoc.set({
                stepIndex: currentStepIndex,
                timeLeft: timeLeft,
                isRunning: isRunning,
                isOvertime: isOvertime,
                targetEndTime: targetEndTime,
                schedule: schedule,
                tasksStr: safeGet('pages_pomodoro_tasks_v8', '[]'),
                weeklyStr: safeGet('pages_pomodoro_weekly_v8', null),
                statsStr: safeGet('pages_pomodoro_stats_v8', '{"history":{}}'),
                mcqStr: safeGet('pages_pomodoro_mcq_v8', '{}'),
                pomoExtStr: JSON.stringify({ extConfig, salahHistory, deenHistory, todos, todoLists }),
                timestamp: Date.now()
            }, { merge: true });
        } catch (e) {}
    }, 380);
};

async function connectToCloud(roomId) {
    if (!db) return;
    if (!isAuthReady) await authenticateForCloud();
    try {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        document.getElementById('sync-status')?.classList.remove('hidden');
        const roomDoc = db.collection('artifacts').doc('neettimercloud').collection('public').doc('data').collection('sync_rooms').doc(roomId);
        unsubscribeSnapshot = roomDoc.onSnapshot((docSnap) => {
            if (!docSnap.exists) return;
            const data = docSnap.data();
            isInternalSyncUpdate = true;
            lastCloudReceiveTime = Date.now();

            if (data.schedule && JSON.stringify(schedule) !== JSON.stringify(data.schedule)) {
                window.schedule = data.schedule;
                safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
                renderSchedule();
            }
            if (data.isOvertime !== undefined) {
                window.isOvertime = Boolean(data.isOvertime);
                timeDisplay?.classList.toggle('overtime-glow', window.isOvertime);
            }
            if (data.stepIndex !== undefined && currentStepIndex !== data.stepIndex) loadStep(data.stepIndex, true);
            if (data.isRunning !== undefined) {
                if (data.isRunning && !isRunning) {
                    targetEndTime = data.targetEndTime;
                    let rem = Math.round((targetEndTime - Date.now()) / 1000);
                    timeLeft = rem > 0 ? rem : Math.abs(rem);
                    startTimer(true);
                } else if (!data.isRunning && isRunning) {
                    timeLeft = data.timeLeft;
                    stopTimer(true, true);
                }
            } else if (!isRunning && data.timeLeft !== undefined) {
                timeLeft = data.timeLeft;
                updateDisplay();
            }
            if (data.tasksStr) { safeSet('pages_pomodoro_tasks_v8', data.tasksStr); PomoEventBus.emit('vault:remoteUpdated'); }
            if (data.weeklyStr) { safeSet('pages_pomodoro_weekly_v8', data.weeklyStr); window.weeklyTemplates = JSON.parse(data.weeklyStr); populateSettingsList(); }
            if (data.statsStr) { safeSet('pages_pomodoro_stats_v8', data.statsStr); renderStats(); renderHomeHUD(); }
            if (data.mcqStr) { safeSet('pages_pomodoro_mcq_v8', data.mcqStr); }
            if (data.pomoExtStr) {
                try {
                    const ext = JSON.parse(data.pomoExtStr);
                    if (ext.extConfig) { window.extConfig = ext.extConfig; safeSet('pages_pomodoro_ext_config_v9', JSON.stringify(extConfig)); }
                    if (ext.salahHistory) { window.salahHistory = ext.salahHistory; safeSet('pages_pomodoro_salah_hist_v9', JSON.stringify(salahHistory)); }
                    if (ext.deenHistory) { window.deenHistory = ext.deenHistory; safeSet('pages_pomodoro_deen_hist_v9', JSON.stringify(deenHistory)); }
                    if (Array.isArray(ext.todos)) { window.todos = ext.todos; safeSet('pages_pomodoro_todos_v9', JSON.stringify(todos)); renderTodoListsBar(); renderTodos(); }
                    if (Array.isArray(ext.todoLists)) { window.todoLists = ext.todoLists; safeSet('pages_pomodoro_todolists_v9', JSON.stringify(todoLists)); renderTodoListsBar(); }
                    renderHomeHUD();
                    renderSalahStrip();
                    PomoEventBus.emit('compass:remoteUpdated');
                } catch (err) {}
            }
            isInternalSyncUpdate = false;
        });
    } catch (e) {}
}

const syncEmailInp = document.getElementById('sync-email-input');
const syncPassInp = document.getElementById('sync-pass-input');
const loginSyncBtn = document.getElementById('login-sync-btn');
if (currentSyncRoom && loginSyncBtn) {
    connectToCloud(currentSyncRoom);
    loginSyncBtn.textContent = "Disconnect System";
    loginSyncBtn.className = "w-full bg-red-600/30 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-lg text-sm";
    syncEmailInp.value = savedPlainUser || currentSyncRoom;
    syncPassInp.value = savedPlainPass || '';
    syncEmailInp.disabled = true;
    syncPassInp.disabled = true;
}

loginSyncBtn?.addEventListener('click', () => {
    if (currentSyncRoom) {
        currentSyncRoom = '';
        safeSet('pages_pomodoro_sync_room', '');
        safeSet('pages_pomodoro_sync_user', '');
        safeSet('pages_pomodoro_sync_pass', '');
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        loginSyncBtn.textContent = "Connect System";
        loginSyncBtn.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md";
        document.getElementById('sync-status')?.classList.add('hidden');
        syncEmailInp.disabled = false;
        syncPassInp.disabled = false;
        syncEmailInp.value = '';
        syncPassInp.value = '';
        showToast("PomoCloud Disconnected");
    } else {
        const em = syncEmailInp.value.trim();
        const pw = syncPassInp.value.trim();
        if (em && pw) {
            currentSyncRoom = encodeURIComponent(btoa(em + ":" + pw)).replace(/%/g, '');
            safeSet('pages_pomodoro_sync_room', currentSyncRoom);
            safeSet('pages_pomodoro_sync_user', em);
            safeSet('pages_pomodoro_sync_pass', pw);
            syncEmailInp.disabled = true;
            syncPassInp.disabled = true;
            loginSyncBtn.textContent = "Disconnect System";
            loginSyncBtn.className = "w-full bg-red-600/30 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-lg text-sm";
            connectToCloud(currentSyncRoom);
            broadcastToCloud();
            showToast("Connected to PomoCloud Room: " + em);
        } else {
            showToast("Enter Room ID and Security Key", true);
        }
    }
});

document.getElementById('toggle-sync-pass-btn')?.addEventListener('click', () => {
    syncPassInp.type = syncPassInp.type === 'password' ? 'text' : 'password';
});

document.getElementById('export-backup-btn')?.addEventListener('click', () => {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pages_pomodoro_')) dump[k] = localStorage.getItem(k);
    }
    const jsonStr = JSON.stringify(dump);
    document.getElementById('backup-json-input').value = jsonStr;
    try { navigator.clipboard.writeText(jsonStr); } catch (e) {}
    showToast("Backup JSON copied & ready!");
});

document.getElementById('import-backup-btn')?.addEventListener('click', () => {
    const raw = document.getElementById('backup-json-input').value.trim();
    if (!raw) { showToast("Paste backup JSON first", true); return; }
    try {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(k => {
            if (k.startsWith('pages_pomodoro_')) safeSet(k, parsed[k]);
        });
        showToast("Backup Restored! Reloading...");
        setTimeout(() => window.location.reload(), 900);
    } catch (e) { showToast("Invalid Backup JSON", true); }
});

/* =========================================================================
   2. NAVIGATION, ESC HANDLER, DIM MODE & DESKTOP SHORTCUTS ENGINE
   ========================================================================= */
window.currentPageId = 'page-timer';
window.switchPage = function(targetId) {
    document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active-page'));
    document.getElementById(targetId)?.classList.add('active-page');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === targetId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    window.currentPageId = targetId;
    if (targetId === 'page-timer') { renderHomeHUD(); renderSalahStrip(); evaluateDriftAndAlerts(); }
    if (targetId === 'page-schedule') { renderSchedule(); populateSettingsList(); }
    if (targetId === 'page-todo') { renderTodoListsBar(); renderTodos(); }
    if (targetId === 'page-vault') { PomoEventBus.emit('vault:tabOpened'); }
    if (targetId === 'page-settings') { renderStats(); renderSettingsSalahList(); }
    if (targetId === 'page-reader') { PomoEventBus.emit('reader:openedTab'); }
};

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchPage(e.currentTarget.getAttribute('data-target')));
});

document.getElementById('header-goal-pill')?.addEventListener('click', () => {
    switchPage('page-vault');
    if (window.activateVaultSubview) window.activateVaultSubview('compass');
});
document.getElementById('top-rpg-quick-btn')?.addEventListener('click', () => {
    switchPage('page-vault');
    document.getElementById('mode-rpg-rank-btn')?.click();
});
document.getElementById('home-masjid-Config-btn')?.addEventListener('click', () => {
    switchPage('page-settings');
    document.querySelector('.prof-tab[data-tab="prof-salah"]')?.click();
});
document.getElementById('desktop-pip-top-btn')?.addEventListener('click', () => {
    if (window.launchPipMiniCockpitWidget) window.launchPipMiniCockpitWidget();
});

window.openDesktopKeysModal = window.openDesktopKeysModal || function() {
    const modal = document.getElementById('reader-suboptions-modal');
    const titleEl = document.getElementById('suboptions-modal-title');
    const bodyEl = document.getElementById('suboptions-modal-body');
    if (!modal || !titleEl || !bodyEl) return;
    titleEl.textContent = "⌨️ Desktop Pro Keyboard Shortcuts Cheat-Sheet";
    const rows = [
        ['Alt + 1 … Alt + 6', 'Switch Tabs: 1 Timer • 2 Plan • 3 Tasks • 4 Vault • 5 Reader • 6 Profile'],
        ['Ctrl + K / Cmd + K', 'Open Master 15-Pro Command Center & Audio Synth'],
        ['? or Alt + K', 'Open this Keyboard Shortcuts Cheat-Sheet'],
        ['Alt + L', 'Lock Workspace with Steel Privacy PIN Shield'],
        ['Space (on Timer)', 'Start / Pause active Pomodoro Focus Session'],
        ['C / S / U (on Timer)', 'C: Complete Session • S: Skip Session • U: Undo Session'],
        ['D / W (on Timer)', 'D: Toggle OLED Dim Mode • W: Pop Out Mini-PiP Window'],
        ['N (on Tasks / Vault)', 'Focus New PomoTask or New Vault Chapter input box'],
        ['← / → or J / K (Reader)', 'Previous Page / Next Page in active book'],
        ['+ / - or Ctrl+Wheel', 'Zoom In / Zoom Out isolated to book page'],
        ['B / P / T / F (Reader)', 'B: Bookmark • P: Pencil Studio • T: Chapters • F: Search Book'],
        ['L / Ctrl + Z (Reader)', 'L: 4-Language Dictionary • Ctrl+Z: Undo Last Highlight/Drawing']
    ];
    bodyEl.innerHTML = `
        <div class="flex flex-col gap-1.5 text-xs">
            ${rows.map(([k, desc]) => `
                <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 gap-3">
                    <kbd class="bg-slate-900 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-lg font-mono font-extrabold text-[11px] shrink-0">${escapeHtml(k)}</kbd>
                    <span class="text-slate-200 font-medium text-right">${escapeHtml(desc)}</span>
                </div>
            `).join('')}
        </div>
    `;
    modal.classList.remove('hidden');
};
document.getElementById('desktop-keys-top-btn')?.addEventListener('click', () => window.openDesktopKeysModal());

if (!window._desktopHotkeysBound) {
    window._desktopHotkeysBound = true;
    window.addEventListener('keydown', (e) => {
        const tag = (e.target?.tagName || '').toLowerCase();
        const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            const pageMap = { '1': 'page-timer', '2': 'page-schedule', '3': 'page-todo', '4': 'page-vault', '5': 'page-reader', '6': 'page-settings' };
            if (pageMap[e.key]) {
                e.preventDefault();
                document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden');
                switchPage(pageMap[e.key]);
                return;
            }
            if (e.key.toLowerCase() === 'k') { e.preventDefault(); window.openDesktopKeysModal(); return; }
            if (e.key.toLowerCase() === 'l') { e.preventDefault(); document.getElementById('privacy-lock-top-btn')?.click(); return; }
        }

        if (isTyping) return;

        if (e.key === '?') { e.preventDefault(); window.openDesktopKeysModal(); return; }

        const readerOpen = !document.getElementById('reader-fullscreen-overlay')?.classList.contains('hidden');
        if (readerOpen) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                window.undoLastReaderAnnotation && window.undoLastReaderAnnotation();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('reader-bottom-search-btn')?.click();
            } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
                e.preventDefault();
                document.getElementById('reader-prev-page-btn')?.click();
            } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k') {
                e.preventDefault();
                document.getElementById('reader-next-page-btn')?.click();
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                document.getElementById('reader-zoom-in-btn')?.click();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                document.getElementById('reader-zoom-out-btn')?.click();
            } else if (e.key.toLowerCase() === 'b') {
                e.preventDefault();
                document.getElementById('reader-quick-bookmark-btn')?.click();
            } else if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                document.getElementById('reader-pencil-toggle-btn')?.click();
            } else if (e.key.toLowerCase() === 't') {
                e.preventDefault();
                document.getElementById('reader-bottom-toc-btn')?.click();
            } else if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('reader-bottom-search-btn')?.click();
            } else if (e.key.toLowerCase() === 'l') {
                e.preventDefault();
                document.getElementById('reader-open-dict-top-btn')?.click();
            }
            return;
        }

        if (window.currentPageId === 'page-timer') {
            if (e.code === 'Space') {
                e.preventDefault();
                if (window.isRunning) window.stopTimer();
                else window.startTimer();
            } else if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                window.completeSession();
            } else if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                document.getElementById('skip-btn')?.click();
            } else if (e.key.toLowerCase() === 'u') {
                e.preventDefault();
                document.getElementById('undo-btn')?.click();
            } else if (e.key.toLowerCase() === 'd') {
                e.preventDefault();
                document.body.classList.toggle('dim-mode');
            } else if (e.key.toLowerCase() === 'w') {
                e.preventDefault();
                window.launchPipMiniCockpitWidget && window.launchPipMiniCockpitWidget();
            }
        } else if (window.currentPageId === 'page-todo' && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            document.getElementById('todo-new-input')?.focus();
        } else if (window.currentPageId === 'page-vault' && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            document.getElementById('task-title-input')?.focus();
        }
    });
}

window.handleAndroidBack = function() {
    const openModals = [
        'salah-freeze-active-overlay', 'critical-overtime-modal', 'pomowake-recheck-modal',
        'master-15-upgrades-modal', 'alarmy-studio-modal', 'protocol-run-modal', 'todo-analytics-modal',
        'reader-dictionary-modal', 'ilovepdf-studio-modal',
        'v4-canvas-text-modal', 'v45-manual-import-modal', 'line-item-viewer-modal',
        'reader-suboptions-modal', 'reader-toc-bookmarks-drawer', 'reader-fullsearch-drawer',
        'book-corner-modal', 'reader-master-settings-modal', 'goal-date-modal',
        'inapp-time-modal', 'targets-modal', 'custom-repeat-modal', 'todo-detail-modal',
        'todo-suggestions-modal', 'new-todolist-modal', 'confirm-reset-modal', 'full-screen-guide-overlay'
    ];
    for (const mId of openModals) {
        const el = document.getElementById(mId);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
            return true;
        }
    }
    const activeReaderOverlay = document.getElementById('reader-fullscreen-overlay');
    if (activeReaderOverlay && !activeReaderOverlay.classList.contains('hidden')) {
        document.getElementById('reader-back-to-shelf-btn')?.click();
        return true;
    }
    if (document.body.classList.contains('dim-mode')) {
        document.body.classList.remove('dim-mode');
        return true;
    }
    if (window.currentPageId !== 'page-timer') {
        switchPage('page-timer');
        return true;
    }
    return false;
};

window.addEventListener('popstate', () => window.handleAndroidBack());
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.handleAndroidBack();
});

document.getElementById('dim-toggle-btn')?.addEventListener('click', () => {
    document.body.classList.add('dim-mode');
    enforceKeepScreenOn();
});
document.getElementById('dim-exit-btn')?.addEventListener('click', () => {
    document.body.classList.remove('dim-mode');
});
document.getElementById('dim-stop-btn')?.addEventListener('click', () => {
    if (isRunning) stopTimer();
    else startTimer();
});

document.querySelectorAll('.prof-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-tab');
        document.querySelectorAll('.prof-tab').forEach(t => t.className = "prof-tab flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all");
        e.currentTarget.className = "prof-tab flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        document.querySelectorAll('.prof-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(targetId)?.classList.remove('hidden');
        if (targetId === 'prof-salah') renderSettingsSalahList();
    });
});

/* =========================================================================
   3. UNIFIED TIMER, 5-WAY SYNC & 3-STAGE OVERTIME GUARDRAIL ENGINE
   ========================================================================= */
const defaultStudyQuotes = ["No distractions. Lock in.", "Your competition is working right now.", "Pain is temporary. Mastery & Success are forever."];
const defaultBreakQuotes = ["Hydrate. Breathe.", "Stand up and stretch.", "Rest your eyes. 20-20-20 rule."];
window.studyQuotes = JSON.parse(safeGet('pages_pomodoro_study_q', JSON.stringify(defaultStudyQuotes)));
window.breakQuotes = JSON.parse(safeGet('pages_pomodoro_break_q', JSON.stringify(defaultBreakQuotes)));

const sqEl = document.getElementById('custom-study-quotes');
const bqEl = document.getElementById('custom-break-quotes');
if (sqEl) sqEl.value = studyQuotes.join('\n');
if (bqEl) bqEl.value = breakQuotes.join('\n');

window.timeDisplay = document.getElementById('time-display');
const sessionTypeDisplay = document.getElementById('session-type');
const currentPhaseDisplay = document.getElementById('current-phase-display');

window.persistState = function() {
    safeSet('pages_pomodoro_app_state_v8', JSON.stringify({
        currentStepIndex, timeLeft, isRunning, targetEndTime, accumulatedStudyTime, accumulatedDeenTime, isOvertime
    }));
};

window.isDeenBlock = function(item) {
    if (!item) return false;
    if (item.category === 'deen') return true;
    const t = (item.title || '').toLowerCase();
    return t.includes('deen') || t.includes('quran') || t.includes('salah') || t.includes('namaz') || t.includes('tafseer') || t.includes('hadith') || t.includes('imaan');
};

window.recordOvertimeToStatsLedger = function(extraMins) {
    if (!extraMins || extraMins <= 0) return;
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0, overtimeMins: 0 };
    stats.history[today].overtimeMins = (stats.history[today].overtimeMins || 0) + extraMins;
    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
};

window.ensureProtocolBlockSyncedToTodo = function(blk) {
    if (!blk || blk.type === 'break') return;
    const today = getLocalTodayString();
    const plannedMins = Math.max(1, Math.round((blk.duration || 2700) / 60));

    if (blk.linkedTodoId) {
        const existing = todos.find(t => String(t.id) === String(blk.linkedTodoId));
        if (existing) {
            existing.durationMins = plannedMins;
            existing.myDayDate = today;
            saveTodos();
            renderTodos();
            return;
        }
    }

    const newTodoId = Date.now() + Math.floor(Math.random() * 999);
    blk.linkedTodoId = newTodoId;
    todos.unshift({
        id: newTodoId,
        linkedVaultId: blk.linkedVaultId || null,
        title: blk.title,
        completed: false,
        important: true,
        myDayDate: today,
        createdDate: today,
        dueDate: blk.dueDate || today,
        durationMins: plannedMins,
        repeat: { type: 'none' },
        steps: [],
        note: blk.note || 'Auto-synced from Live Protocol',
        listId: 'tasks'
    });
    saveTodos();
    renderTodos();
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
};

window.syncCompletionToTimerAndProtocol = function(sourceType, itemId, isNowCompleted) {
    if (!isNowCompleted) return { usedMins: 0, plannedMins: 0, overtimeMins: 0 };
    const today = getLocalTodayString();
    let matchedIdx = -1;

    schedule.forEach((blk, idx) => {
        if (blk.status === 'completed') return;
        if (sourceType === 'todo' && String(blk.linkedTodoId) === String(itemId)) matchedIdx = idx;
        if (sourceType === 'vault' && String(blk.linkedVaultId) === String(itemId)) matchedIdx = idx;
    });

    if (matchedIdx === -1) return null;

    const blk = schedule[matchedIdx];
    const plannedMins = Math.max(1, Math.round((blk.duration || 2700) / 60));
    let usedMins = plannedMins;
    let overtimeMins = 0;

    if (matchedIdx === currentStepIndex && (isRunning || isOvertime || timeLeft < blk.duration)) {
        if (isOvertime) {
            overtimeMins = Math.max(1, Math.ceil(timeLeft / 60));
            usedMins = plannedMins + overtimeMins;
            window.recordOvertimeToStatsLedger(overtimeMins);
        } else {
            const elapsedSec = Math.max(60, (blk.duration || 2700) - timeLeft);
            usedMins = Math.max(1, Math.round(elapsedSec / 60));
        }

        stopTimer(true, true);
        blk.status = 'completed';
        blk._credited = true;
        blk.usedDurationMins = usedMins;
        blk.overtimeMins = overtimeMins;

        if (isDeenBlock(blk)) {
            deenHistory[today] = (deenHistory[today] || 0) + usedMins;
            saveExtConfig();
        } else {
            const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
            if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
            stats.history[today].mins += usedMins;
            stats.history[today].sessions += 1;
            safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
        }

        window.accumulatedStudyTime = 0;
        window.accumulatedDeenTime = 0;
        window.isOvertime = false;
        document.getElementById('complete-main-btn')?.classList.add('hidden');
        timeDisplay?.classList.remove('overtime-glow');
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(currentStepIndex + 1, false);
        renderSchedule();
        renderStats();
        renderHomeHUD();
        showToast(`⏱️ Timer Auto-Stopped! Logged ${usedMins}m${overtimeMins > 0 ? ` (incl. +${overtimeMins}m overtime)` : ''} to Stats!`);
    } else {
        blk.status = 'completed';
        blk.usedDurationMins = plannedMins;
        if (blk.type === 'work' && !blk._credited) {
            blk._credited = true;
            if (isDeenBlock(blk)) {
                deenHistory[today] = (deenHistory[today] || 0) + plannedMins;
                saveExtConfig();
            } else {
                const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
                if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
                stats.history[today].mins += plannedMins;
                stats.history[today].sessions += 1;
                safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
            }
        }
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        renderSchedule();
        renderStats();
        renderHomeHUD();
    }

    return { usedMins, plannedMins, overtimeMins };
};

function syncLinkedProtocolCompletion(item, usedMins = null, plannedMins = null, overtimeMins = 0) {
    if (!item) return;
    const today = getLocalTodayString();
    if (item.linkedTodoId) {
        const t = todos.find(x => String(x.id) === String(item.linkedTodoId));
        if (t) {
            t.completed = true;
            t.completedDate = today;
            if (usedMins !== null) t.usedDurationMins = usedMins;
            if (plannedMins !== null) t.plannedDurationMins = plannedMins;
            t.overtimeMins = overtimeMins || 0;
            saveTodos();
            renderTodos();
        }
    }
    if (item.linkedVaultId) {
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const vt = tasks.find(x => String(x.id) === String(item.linkedVaultId));
        if (vt) {
            vt.completed = true;
            vt.completedDate = today;
            if (usedMins !== null) vt.usedDurationMins = usedMins;
            if (plannedMins !== null) vt.plannedDurationMins = plannedMins;
            vt.overtimeMins = overtimeMins || 0;
            safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
            PomoEventBus.emit('vault:updated');
        }
    }
}

window.renderSchedule = function() {
    const cont = document.getElementById('schedule-container');
    if (!cont) return;
    cont.innerHTML = '';
    if (schedule.length === 0) {
        cont.innerHTML = `
            <div class="p-4 text-xs text-center bg-slate-900/50 rounded-xl border border-slate-800/60 flex flex-col items-center gap-2">
                <p class="text-slate-400 italic">Live Protocol is empty. Insert a block above, or auto-generate a 50m/10m Pomodoro cycle:</p>
                <button type="button" onclick="window.autoPackPomodoroCycles && window.autoPackPomodoroCycles(3, 'Deep Study Block')" class="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-extrabold px-3.5 py-1.5 rounded-xl text-xs">🪄 Auto-Generate 3× (50m Study / 10m Break) Cycles</button>
            </div>
        `;
        document.getElementById('session-count-badge').textContent = `0 Remaining`;
        return;
    }
    const activeCount = schedule.filter(s => s.status !== 'completed' && s.status !== 'skipped').length;
    document.getElementById('session-count-badge').textContent = `${activeCount} Remaining`;

    schedule.forEach((item, index) => {
        const div = document.createElement('div');
        let baseClasses = "flex justify-between items-center p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ";
        if (index === currentStepIndex) baseClasses += "bg-blue-950/50 border-blue-500/60 shadow-md ";
        else if (item.status === 'completed' || item.status === 'skipped') baseClasses += "opacity-45 line-through bg-slate-900/60 border-slate-800 ";
        else baseClasses += "bg-slate-900 border-slate-800 hover:border-slate-700 ";

        div.className = baseClasses;
        div.onclick = () => {
            if (index !== currentStepIndex) jumpToStep(index, true);
            switchPage('page-timer');
        };

        const mins = Math.max(1, Math.round(item.duration / 60));
        const deenFlag = isDeenBlock(item);
        const icon = item.type === 'break' ? '💧' : (deenFlag ? '🕌' : '🧠');
        const linkBadge = item.linkedVaultId
            ? `<span class="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded ml-1">📚 Vault</span>`
            : (item.linkedTodoId ? `<span class="text-[9px] bg-blue-950 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded ml-1">☑️ Task</span>` : '');

        div.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <span class="text-base shrink-0">${icon}</span>
                <div class="min-w-0 flex-1">
                    <p class="text-xs sm:text-sm font-bold truncate ${index === currentStepIndex ? 'text-blue-400' : 'text-slate-200'}">${escapeHtml(item.title)} ${linkBadge}</p>
                    <span class="text-[10px] font-mono text-slate-400">${mins} mins • ${item.type === 'break' ? 'Break' : (deenFlag ? 'Deen' : 'Study')}${item.dueDate ? ` • 📅 Due ${formatDDMMYYYY(item.dueDate)}` : ''}</span>
                </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="event.stopPropagation(); moveLiveBlock(${index}, -1)" class="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 text-[10px]">⬆️</button>
                <button onclick="event.stopPropagation(); moveLiveBlock(${index}, 1)" class="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 text-[10px]">⬇️</button>
                <button onclick="event.stopPropagation(); quickComplete(${index})" class="bg-slate-950 hover:bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-slate-800 text-[10px]">✅</button>
                <button onclick="event.stopPropagation(); deleteLiveBlock(${index})" class="bg-slate-950 hover:bg-red-950 text-red-400 px-2 py-1 rounded border border-slate-800 text-[10px]">🗑️</button>
            </div>
        `;
        cont.appendChild(div);
    });
};

window.moveLiveBlock = function(index, dir) {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= schedule.length) return;
    const temp = schedule[index];
    schedule[index] = schedule[targetIdx];
    schedule[targetIdx] = temp;
    if (currentStepIndex === index) window.currentStepIndex = targetIdx;
    else if (currentStepIndex === targetIdx) window.currentStepIndex = index;
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    persistState();
    renderSchedule();
    broadcastToCloud();
};

window.deleteLiveBlock = function(index) {
    if (index < 0 || index >= schedule.length) return;
    const deletingCurrent = (index === currentStepIndex);
    schedule.splice(index, 1);
    if (schedule.length === 0) {
        stopTimer(true, true);
        window.currentStepIndex = 0;
        loadStep(0, false);
    } else if (deletingCurrent) {
        stopTimer(true, true);
        if (currentStepIndex >= schedule.length) window.currentStepIndex = schedule.length - 1;
        loadStep(currentStepIndex, false);
    } else if (index < currentStepIndex) {
        window.currentStepIndex = Math.max(0, currentStepIndex - 1);
    }
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    persistState();
    renderSchedule();
    broadcastToCloud();
    showToast("Block removed from Live Protocol");
};

window.quickComplete = function(index) {
    if (index === currentStepIndex) {
        const cur = schedule[currentStepIndex];
        if (cur && cur.type === 'work' && !isOvertime && timeLeft > 0) {
            if (isDeenBlock(cur)) window.accumulatedDeenTime += timeLeft;
            else window.accumulatedStudyTime += timeLeft;
        }
        completeSession();
    } else if (schedule[index]) {
        const item = schedule[index];
        if (item.status !== 'completed') {
            item.status = 'completed';
            const mins = Math.max(1, Math.round(item.duration / 60));
            syncLinkedProtocolCompletion(item, mins, mins, 0);
            if (item.type === 'work' && !item._credited) {
                item._credited = true;
                const today = getLocalTodayString();
                if (isDeenBlock(item)) {
                    deenHistory[today] = (deenHistory[today] || 0) + mins;
                    saveExtConfig();
                } else {
                    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
                    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
                    stats.history[today].mins += mins;
                    stats.history[today].sessions += 1;
                    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
                }
                renderStats();
                renderHomeHUD();
                evaluateDriftAndAlerts();
                PomoEventBus.emit('stats:updated');
                showToast(`✅ +${mins}m credited to ${isDeenBlock(item) ? 'Deen' : 'Study'}!`);
            }
            safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
            renderSchedule();
            broadcastToCloud();
        }
    }
};

document.getElementById('toggle-live-add-btn')?.addEventListener('click', () => {
    const dr = document.getElementById('live-insert-drawer');
    dr.classList.toggle('hidden');
    dr.classList.toggle('flex');
});

document.getElementById('confirm-live-insert-btn')?.addEventListener('click', () => {
    const titleInp = document.getElementById('live-new-title');
    const durInp = document.getElementById('live-new-dur');
    const catVal = document.getElementById('live-new-cat').value;
    const mins = Math.max(1, parseInt(durInp.value) || 45);
    const isBrk = catVal === 'break';
    const defaultName = isBrk ? 'Recovery Break' : (catVal === 'deen' ? 'Deen & Imaan Session' : 'Deep Study Block');
    const newBlock = {
        id: Date.now(),
        type: isBrk ? 'break' : 'work',
        category: catVal === 'deen' ? 'deen' : (isBrk ? 'break' : 'study'),
        title: titleInp.value.trim() || defaultName,
        duration: mins * 60
    };
    const wasEmpty = schedule.length === 0;
    schedule.push(newBlock);
    if (newBlock.type === 'work') window.ensureProtocolBlockSyncedToTodo(newBlock);
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    titleInp.value = '';
    document.getElementById('live-insert-drawer').classList.add('hidden');
    if (wasEmpty) loadStep(0, false);
    renderSchedule();
    broadcastToCloud();
    showToast("Inserted into Live Protocol & synced to PomoTasks!");
});

window.loadStep = function(index, preserveState = false) {
    window.currentStepIndex = Math.max(0, Math.min(index, schedule.length));
    if (!preserveState) {
        window.isOvertime = false;
        timeDisplay?.classList.remove('overtime-glow');
    } else if (isOvertime) {
        timeDisplay?.classList.add('overtime-glow');
    }

    if (currentStepIndex >= schedule.length || schedule.length === 0) {
        window.timeLeft = 0;
        window.isOvertime = false;
        timeDisplay?.classList.remove('overtime-glow');
        updateDisplay();
        sessionTypeDisplay.textContent = schedule.length === 0 ? "Press Space or ▶️ for 50m Deep Focus" : "All Sessions Done (Press ▶️ for +50m)";
        currentPhaseDisplay.textContent = schedule.length === 0 ? "READY TO LOCK IN" : "PROTOCOL COMPLETE";
        currentPhaseDisplay.className = "mt-1 bg-emerald-500/10 px-4 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-phase";
        document.getElementById('anim-study')?.classList.add('hidden');
        document.getElementById('anim-deen')?.classList.add('hidden');
        document.getElementById('anim-break')?.classList.add('hidden');
        document.getElementById('guide-box-title').textContent = schedule.length === 0 ? "⚡ Focus Coach Ready" : "🎉 Day Complete";
        document.getElementById('deep-guide-text').textContent = schedule.length === 0 ? "Press Space or click the blue ▶️ Start button anytime to auto-launch a 50m Study + 10m Break cycle, or click ⚡ on any PomoTask / Vault item." : "Alhamdulillah! Incredible work today.";
        stopTimer(true, true);
        document.getElementById('start-btn')?.classList.remove('hidden');
        document.getElementById('pause-btn')?.classList.add('hidden');
        document.getElementById('complete-main-btn')?.classList.add('hidden');
        renderSchedule();
        persistState();
        return;
    }

    const currentSession = schedule[currentStepIndex];
    if (!preserveState) window.timeLeft = currentSession.duration;
    sessionTypeDisplay.textContent = currentSession.title;

    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('complete-main-btn').classList.toggle('hidden', !isOvertime);

    const deenBlock = isDeenBlock(currentSession);
    if (currentSession.type === 'work') {
        currentPhaseDisplay.textContent = deenBlock ? "DEEN & IMAAN PHASE" : "DEEP STUDY PHASE";
        currentPhaseDisplay.className = deenBlock
            ? "mt-1 bg-emerald-500/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-phase"
            : "mt-1 bg-tomato/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-tomato border border-tomato/30 uppercase tracking-widest font-phase";
        document.getElementById('guide-box-title').textContent = deenBlock ? "🕌 Deen Focus Protocol" : "🔥 Focus Protocol";
        document.getElementById('deep-guide-text').textContent = currentSession.note
            ? `📝 Session Note: ${currentSession.note}`
            : (deenBlock ? "Strengthening your Imaan brings Barakah to your entire day." : studyQuotes[Math.floor(Math.random() * studyQuotes.length)]);
        document.getElementById('anim-study')?.classList.toggle('hidden', deenBlock);
        document.getElementById('anim-deen')?.classList.toggle('hidden', !deenBlock);
        document.getElementById('anim-break')?.classList.add('hidden');
    } else {
        currentPhaseDisplay.textContent = "RECOVERY PHASE";
        currentPhaseDisplay.className = "mt-1 bg-blue-500/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-blue-400 border border-blue-500/30 uppercase tracking-widest font-phase";
        document.getElementById('guide-box-title').textContent = "💧 Recovery Protocol";
        document.getElementById('deep-guide-text').textContent = breakQuotes[Math.floor(Math.random() * breakQuotes.length)];
        document.getElementById('anim-study')?.classList.add('hidden');
        document.getElementById('anim-deen')?.classList.add('hidden');
        document.getElementById('anim-break')?.classList.remove('hidden');
    }

    lastRenderedTime = -1;
    updateDisplay();
    renderSchedule();
    if (currentStepIndex > 0 && !isRunning && !preserveState) playAlarmSound();
    persistState();
};

window.updateDisplay = function() {
    if (timeLeft === lastRenderedTime && !isOvertime) return;
    lastRenderedTime = timeLeft;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    if (timeDisplay) {
        timeDisplay.textContent = `${isOvertime ? '+' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
};

window.lastPersistedTickSec = -1;
function timerCoreTick() {
    if (!isRunning) return;
    const now = Date.now();
    const remaining = Math.round((targetEndTime - now) / 1000);
    const curSess = schedule[currentStepIndex];

    if (remaining <= 0) {
        if (!isOvertime) {
            if (curSess?.type === 'work' && timeLeft > 0) {
                if (isDeenBlock(curSess)) window.accumulatedDeenTime += timeLeft;
                else window.accumulatedStudyTime += timeLeft;
            }
            window.isOvertime = true;
            playAlarmSound();
            if (window.sendDesktopNotification && curSess) {
                window.sendDesktopNotification(`✅ Session Complete: ${curSess.title}`, `Press C or click ✓ Complete in DeenTimeR Pro to log your time & advance!`, 'timer-done');
            }
            timeDisplay.classList.add('overtime-glow');
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('complete-main-btn').classList.remove('hidden');
            renderHomeHUD();
        }
        window.timeLeft = Math.abs(remaining);
        if (window.isPureCountUpMode) window.pureCountUpSeconds = window.timeLeft;
        updateDisplay();
        if (window.timeLeft !== lastPersistedTickSec) {
            lastPersistedTickSec = window.timeLeft;
            persistState();
        }
    } else {
        window.isOvertime = false;
        timeDisplay.classList.remove('overtime-glow');
        if (curSess?.type === 'work' && timeLeft > remaining) {
            const delta = timeLeft - remaining;
            if (isDeenBlock(curSess)) window.accumulatedDeenTime += delta;
            else window.accumulatedStudyTime += delta;
            if (remaining % 15 === 0) renderHomeHUD();
        }
        window.timeLeft = remaining;
        updateDisplay();
        if (remaining !== lastPersistedTickSec) {
            lastPersistedTickSec = remaining;
            persistState();
        }
    }
}

window.startTimer = function(skipBc = false) {
    if (isRunning) return;
    if (schedule.length === 0 || currentStepIndex >= schedule.length) {
        const autoBlk = {
            id: Date.now(),
            type: 'work',
            category: 'study',
            title: '🧠 50m Deep Study Focus Block',
            duration: 50 * 60
        };
        const autoBrk = {
            id: Date.now() + 1,
            type: 'break',
            category: 'break',
            title: '💧 10m Pomodoro Recovery Break',
            duration: 10 * 60
        };
        const startIdx = schedule.length;
        schedule.push(autoBlk, autoBrk);
        window.ensureProtocolBlockSyncedToTodo(autoBlk);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(startIdx, false);
    }

    enforceKeepScreenOn();
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
    } catch (e) {}

    window.isRunning = true;
    document.getElementById('start-btn').classList.add('hidden');
    if (isOvertime) document.getElementById('complete-main-btn').classList.remove('hidden');
    else document.getElementById('pause-btn').classList.remove('hidden');

    const currentSession = schedule[currentStepIndex];
    if (lastPopupStep !== currentStepIndex && currentSession) {
        lastPopupStep = currentStepIndex;
        clearTimeout(guidePopupTimeout);
        document.getElementById('full-screen-guide-overlay').classList.add('hidden');
        if (currentSession.type !== 'work' && !document.body.classList.contains('dim-mode')) {
            document.getElementById('full-screen-guide-text').textContent = breakQuotes[Math.floor(Math.random() * breakQuotes.length)];
            document.getElementById('full-screen-guide-overlay').classList.remove('hidden');
            guidePopupTimeout = setTimeout(() => document.getElementById('full-screen-guide-overlay').classList.add('hidden'), 8000);
        }
    }

    window.targetEndTime = isOvertime ? Date.now() - (timeLeft * 1000) : Date.now() + (timeLeft * 1000);
    clearInterval(timerInterval);
    window.timerInterval = setInterval(timerCoreTick, 250);
    persistState();
    if (!skipBc) broadcastToCloud();
};

window.stopTimer = function(skipBc = false, skipFlush = false) {
    if (!isRunning) return;
    window.isRunning = false;
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    clearInterval(timerInterval);
    if (!skipFlush) flushSessionStats(false);
    persistState();
    if (!skipBc) broadcastToCloud();
};

let activeAlarmNodes = [];
function killActiveAlarms() {
    activeAlarmNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
    activeAlarmNodes = [];
}

window.playChime = function(type = 'todo') {
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
        const now = window.fallbackCtx.currentTime;
        const osc = window.fallbackCtx.createOscillator();
        const gain = window.fallbackCtx.createGain();
        osc.connect(gain);
        gain.connect(window.fallbackCtx.destination);
        if (type === 'todo') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.09);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'salah') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.18);
            osc.frequency.setValueAtTime(659.25, now + 0.36);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.start(now);
            osc.stop(now + 0.9);
        }
    } catch (e) {}
};

window.playAlarmSound = function() {
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
        killActiveAlarms();
        const isWork = schedule[currentStepIndex]?.type === 'work';
        const count = isWork ? 12 : 8;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!isRunning && i > 2) return;
                try {
                    const osc = window.fallbackCtx.createOscillator();
                    const gain = window.fallbackCtx.createGain();
                    osc.connect(gain);
                    gain.connect(window.fallbackCtx.destination);
                    osc.type = isWork ? 'square' : 'sine';
                    osc.frequency.setValueAtTime(isWork ? 820 : 523.25, window.fallbackCtx.currentTime);
                    gain.gain.setValueAtTime(0.35, window.fallbackCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, window.fallbackCtx.currentTime + 0.3);
                    osc.start(window.fallbackCtx.currentTime);
                    osc.stop(window.fallbackCtx.currentTime + 0.3);
                    activeAlarmNodes.push(osc, gain);
                } catch (e) {}
            }, i * 550);
        }
    } catch (e) {}
};

window.flushSessionStats = function(isWorkComplete = false) {
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };

    if (accumulatedStudyTime >= 60) {
        const addM = Math.floor(accumulatedStudyTime / 60);
        stats.history[today].mins += addM;
        window.accumulatedStudyTime = accumulatedStudyTime % 60;
    }
    if (accumulatedDeenTime >= 60) {
        const addD = Math.floor(accumulatedDeenTime / 60);
        deenHistory[today] = (deenHistory[today] || 0) + addD;
        window.accumulatedDeenTime = accumulatedDeenTime % 60;
    }
    if (isWorkComplete && schedule[currentStepIndex]?.type === 'work') {
        if (accumulatedStudyTime >= 15) stats.history[today].mins += 1;
        if (accumulatedDeenTime >= 15) deenHistory[today] = (deenHistory[today] || 0) + 1;
        window.accumulatedStudyTime = 0;
        window.accumulatedDeenTime = 0;
        stats.history[today].sessions += 1;
    }

    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
    saveExtConfig();
    renderStats();
    renderHomeHUD();
    evaluateDriftAndAlerts();
    PomoEventBus.emit('stats:updated');
};

window.completeSession = function() {
    stopTimer(true, true);
    killActiveAlarms();
    const cur = schedule[currentStepIndex];

    if (cur && cur.type === 'work') {
        const plannedMins = Math.max(1, Math.round((cur.duration || 2700) / 60));
        let overtimeMins = 0;
        let usedMins = plannedMins;

        if (window.isPureCountUpMode) {
            usedMins = Math.max(1, Math.ceil((window.pureCountUpSeconds || timeLeft) / 60));
            overtimeMins = Math.max(0, usedMins - plannedMins);
            window.isPureCountUpMode = false;
            window.pureCountUpSeconds = 0;
        } else if (isOvertime) {
            overtimeMins = Math.max(1, Math.ceil(timeLeft / 60));
            usedMins = plannedMins + overtimeMins;
            window.recordOvertimeToStatsLedger(overtimeMins);
            if (isDeenBlock(cur)) window.accumulatedDeenTime += timeLeft;
            else window.accumulatedStudyTime += timeLeft;
        } else if (timeLeft > 0 && timeLeft < cur.duration) {
            usedMins = Math.max(1, Math.round((cur.duration - timeLeft) / 60));
        }

        cur.usedDurationMins = usedMins;
        cur.overtimeMins = overtimeMins;
        if (!cur.linkedTodoId) window.ensureProtocolBlockSyncedToTodo(cur);
        syncLinkedProtocolCompletion(cur, usedMins, plannedMins, overtimeMins);
    }

    if (cur) {
        cur.status = 'completed';
        cur._credited = true;
    }

    window.overtimeExtensionMins = 0;
    window.lastOvertimeWarnStage = 0;
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop(true);
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');

    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    flushSessionStats(cur?.type === 'work');
    window.isOvertime = false;
    document.getElementById('complete-main-btn').classList.add('hidden');
    timeDisplay.classList.remove('overtime-glow');
    loadStep(currentStepIndex + 1);
    if (currentStepIndex < schedule.length) startTimer();
    renderSchedule();
    renderStats();
    PomoEventBus.emit('session:completed');
};

window.jumpToStep = function(index, isManualSelectOrUndo = false) {
    stopTimer(true, true);
    killActiveAlarms();
    document.getElementById('full-screen-guide-overlay').classList.add('hidden');
    clearTimeout(guidePopupTimeout);

    if (!isManualSelectOrUndo && schedule[currentStepIndex] && schedule[currentStepIndex].status !== 'completed') {
        schedule[currentStepIndex].status = 'skipped';
    }
    if (isManualSelectOrUndo && schedule[index] && schedule[index].status === 'skipped') {
        delete schedule[index].status;
    }

    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    window.accumulatedStudyTime = 0;
    window.accumulatedDeenTime = 0;
    flushSessionStats(false);
    window.isOvertime = false;
    document.getElementById('complete-main-btn').classList.add('hidden');
    timeDisplay.classList.remove('overtime-glow');
    loadStep(index);
    if (!isManualSelectOrUndo && currentStepIndex < schedule.length) startTimer();
    else broadcastToCloud();
    renderSchedule();
};

document.getElementById('start-btn')?.addEventListener('click', () => startTimer());
document.getElementById('pause-btn')?.addEventListener('click', () => stopTimer());
document.getElementById('skip-btn')?.addEventListener('click', () => { if (currentStepIndex < schedule.length) jumpToStep(currentStepIndex + 1, false); });
document.getElementById('undo-btn')?.addEventListener('click', () => { if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1, true); });
document.getElementById('complete-main-btn')?.addEventListener('click', completeSession);
document.getElementById('close-guide-btn')?.addEventListener('click', () => {
    document.getElementById('full-screen-guide-overlay').classList.add('hidden');
    clearTimeout(guidePopupTimeout);
});

window.startPureCountUpStopwatch = function(customTitle = null) {
    stopTimer(true, true);
    const title = customTitle || '⏱️ Open Count-Up Focus Session';
    const newBlk = {
        id: Date.now(),
        type: 'work',
        category: 'study',
        title,
        duration: 25 * 60
    };
    window.ensureProtocolBlockSyncedToTodo(newBlk);
    const insertAt = Math.min(currentStepIndex, schedule.length);
    schedule.splice(insertAt, 0, newBlk);
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    loadStep(insertAt, false);

    window.isOvertime = true;
    window.isPureCountUpMode = true;
    window.pureCountUpSeconds = 0;
    window.timeLeft = 0;
    window.targetEndTime = Date.now();
    document.getElementById('complete-main-btn')?.classList.remove('hidden');
    switchPage('page-timer');
    startTimer();
    showToast("⏱️ Count-Up Stopwatch Started! All time will save to PomoTasks & Stats.");
};

setInterval(() => {
    if (!isRunning || !isOvertime || window.isPureCountUpMode) return;
    const curSess = schedule[currentStepIndex];
    if (!curSess || curSess.type !== 'work') return;

    const overMins = Math.floor(timeLeft / 60);
    const softLimit = 5 + window.overtimeExtensionMins;
    const critLimit = 10 + window.overtimeExtensionMins;

    if (overMins >= softLimit && overMins < critLimit && window.lastOvertimeWarnStage < 1) {
        window.lastOvertimeWarnStage = 1;
        if (window.playChime) window.playChime('salah');
        showToast(`⚠️ +${overMins}m Overtime on "${curSess.title}"! Wrap up your current point.`, true);
    } else if (overMins >= critLimit && window.lastOvertimeWarnStage < 2) {
        window.lastOvertimeWarnStage = 2;
        window.triggerCriticalOvertimeModal(curSess, overMins);
    }
}, 2000);

window.triggerCriticalOvertimeModal = function(sessObj, overMins) {
    let modal = document.getElementById('critical-overtime-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'critical-overtime-modal';
        modal.className = "hidden fixed inset-0 z-[99990] alarmy-siren-bg flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    if (window.startLoudSirenLoop) window.startLoudSirenLoop();
    const plannedMins = Math.max(1, Math.round((sessObj.duration || 2700) / 60));
    modal.innerHTML = `
        <div class="bg-slate-950/95 border-2 border-red-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-4">
            <span class="text-5xl animate-bounce">🚨</span>
            <div>
                <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">CRITICAL SCHEDULE DRIFT ALARM (+${overMins}m EXTRA)</span>
                <h3 class="text-lg font-extrabold text-white mt-2">${escapeHtml(sessObj.title)}</h3>
                <p class="text-xs text-amber-200 mt-1">Assigned: <b>${plannedMins}m</b> • Extra Count-Up: <b class="text-red-400">+${overMins}m</b> (Total: ${plannedMins + overMins}m)</p>
            </div>
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.completeSession()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg">
                    ✅ Complete Session & Save ${plannedMins + overMins}m to PomoTasks Now
                </button>
                <button type="button" onclick="window.authorizeOvertimeExtension(10)" class="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold py-2.5 rounded-xl text-xs">
                    ⏳ Authorize +10m Extension (Snooze Siren)
                </button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.authorizeOvertimeExtension = function(extraM) {
    window.overtimeExtensionMins += (extraM || 10);
    window.lastOvertimeWarnStage = 1;
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop(true);
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');
    showToast(`⏳ Authorized +${extraM}m overtime extension.`);
};

/* =========================================================================
   4. UNIFIED "ADD TO LIVE PROTOCOL & RUN NOW" LAUNCHER MODAL
   ========================================================================= */
let activeProtoLauncherCtx = null;

function ensureProtocolRunModalExists() {
    if (document.getElementById('protocol-run-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'protocol-run-modal';
    modal.className = "hidden fixed inset-0 modal-backdrop z-[380] flex items-center justify-center p-4";
    modal.innerHTML = `
        <div class="bg-slate-900 border border-blue-500/50 rounded-3xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-3.5 max-h-[92dvh] native-scroll">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div>
                    <span id="proto-run-badge" class="text-[9px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">⚡ Live Protocol & Timer Launcher</span>
                    <h3 class="text-sm font-extrabold text-white mt-1">Configure Session & Schedule</h3>
                </div>
                <button type="button" id="close-proto-run-modal-btn" class="text-slate-400 hover:text-white font-bold px-2 text-lg">✕</button>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold uppercase text-slate-400">Session / Task Title</label>
                <input type="text" id="proto-run-title-inp" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500">
            </div>

            <div class="grid grid-cols-2 gap-2.5">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-blue-400">⏱️ Duration (Minutes)</label>
                    <input type="number" id="proto-run-dur-inp" value="50" min="1" max="360" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-extrabold text-white text-center focus:outline-none">
                    <div class="grid grid-cols-4 gap-1 mt-1">
                        <button type="button" onclick="document.getElementById('proto-run-dur-inp').value=25" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold py-1 rounded">25m</button>
                        <button type="button" onclick="document.getElementById('proto-run-dur-inp').value=50" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold py-1 rounded">50m</button>
                        <button type="button" onclick="document.getElementById('proto-run-dur-inp').value=60" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold py-1 rounded">60m</button>
                        <button type="button" onclick="document.getElementById('proto-run-dur-inp').value=90" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold py-1 rounded">90m</button>
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-emerald-400">⚖️ Protocol Category</label>
                    <select id="proto-run-cat-sel" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-white focus:outline-none">
                        <option value="study">🧠 Deep Study (8h Goal)</option>
                        <option value="deen">🕌 Deen & Imaan (1h Goal)</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-slate-400">📆 Start / Log Date</label>
                    <input type="date" id="proto-run-date-inp" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white">
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-[10px] font-bold uppercase text-amber-400">📅 Due Date (Target)</label>
                    <input type="date" id="proto-run-due-inp" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-emerald-400">
                </div>
                <div class="col-span-2 flex gap-1.5 pt-1">
                    <button type="button" onclick="window.setProtoDueOffset(0)" class="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold py-1 rounded-lg">Due Today</button>
                    <button type="button" onclick="window.setProtoDueOffset(1)" class="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold py-1 rounded-lg">Tomorrow</button>
                    <button type="button" onclick="window.setProtoDueOffset(3)" class="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold py-1 rounded-lg">+3 Days</button>
                    <button type="button" onclick="window.setProtoDueOffset(7)" class="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold py-1 rounded-lg">+7 Days</button>
                </div>
            </div>

            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-bold uppercase text-slate-400">📝 Session Note / Checklist</label>
                <textarea id="proto-run-note-inp" placeholder="Add study notes, page numbers, or key concepts to focus on..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white h-16 resize-none focus:outline-none"></textarea>
            </div>

            <div class="flex gap-2.5 pt-1">
                <button type="button" id="proto-save-queue-btn" class="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/40 font-extrabold py-3 rounded-xl text-xs shadow active:scale-95">
                    ➕ Save to Live Protocol
                </button>
                <button type="button" id="proto-run-now-btn" class="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg active:scale-95 flex items-center justify-center gap-1.5">
                    <span>▶️</span> <span>RUN NOW (Start Timer)</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    window.setProtoDueOffset = function(days) {
        document.getElementById('proto-run-due-inp').value = addDaysToTodayISO(days);
    };

    document.getElementById('close-proto-run-modal-btn').onclick = () => modal.classList.add('hidden');
    document.getElementById('proto-save-queue-btn').onclick = () => commitProtocolLauncherAction(false);
    document.getElementById('proto-run-now-btn').onclick = () => commitProtocolLauncherAction(true);
}

window.openProtocolRunModal = function(sourceType, itemId) {
    ensureProtocolRunModalExists();
    const today = getLocalTodayString();
    let item = null;
    if (sourceType === 'todo') {
        item = todos.find(x => String(x.id) === String(itemId));
    } else if (sourceType === 'vault') {
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        item = tasks.find(x => String(x.id) === String(itemId));
    }
    if (!item) return;

    const isDeenGuess = isDeenBlock(item) || /deen|quran|tafseer|hadith|salah|fiqh|seerah/i.test(`${item.title} ${item.subject || ''}`);
    const displayTitle = sourceType === 'vault'
        ? `📚 [${item.subject || 'Vault'} • ${(item.type || 'backlog').toUpperCase()}] ${item.title}`
        : item.title;

    activeProtoLauncherCtx = { sourceType, id: item.id };

    document.getElementById('proto-run-badge').textContent = sourceType === 'vault'
        ? `📚 Study Vault (${item.subject} • ${item.type.toUpperCase()}) ➔ Live Protocol`
        : `☑️ PomoTask ➔ Live Protocol & Timer`;
    document.getElementById('proto-run-title-inp').value = displayTitle;
    document.getElementById('proto-run-dur-inp').value = item.durationMins || 50;
    document.getElementById('proto-run-cat-sel').value = item.category || (isDeenGuess ? 'deen' : 'study');
    document.getElementById('proto-run-date-inp').value = item.createdDate || today;
    document.getElementById('proto-run-due-inp').value = item.dueDate || today;
    document.getElementById('proto-run-note-inp').value = item.note || '';

    document.getElementById('protocol-run-modal').classList.remove('hidden');
};

function commitProtocolLauncherAction(runImmediately = false) {
    if (!activeProtoLauncherCtx) return;
    const titleVal = document.getElementById('proto-run-title-inp').value.trim() || 'Focus Session';
    const mins = Math.max(1, parseInt(document.getElementById('proto-run-dur-inp').value) || 50);
    const cat = document.getElementById('proto-run-cat-sel').value || 'study';
    const createdDate = document.getElementById('proto-run-date-inp').value || getLocalTodayString();
    const dueDate = document.getElementById('proto-run-due-inp').value || '';
    const note = document.getElementById('proto-run-note-inp').value.trim();

    if (activeProtoLauncherCtx.sourceType === 'todo') {
        const t = todos.find(x => String(x.id) === String(activeProtoLauncherCtx.id));
        if (t) {
            t.createdDate = createdDate;
            t.dueDate = dueDate;
            t.note = note;
            t.durationMins = mins;
            t.category = cat;
            saveTodos();
            renderTodos();
        }
    } else if (activeProtoLauncherCtx.sourceType === 'vault') {
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const vt = tasks.find(x => String(x.id) === String(activeProtoLauncherCtx.id));
        if (vt) {
            vt.createdDate = createdDate;
            vt.dueDate = dueDate;
            vt.note = note;
            vt.durationMins = mins;
            vt.category = cat;
            safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
            PomoEventBus.emit('vault:updated');
        }
    }

    const newBlock = {
        id: Date.now(),
        type: 'work',
        category: cat,
        title: titleVal,
        duration: mins * 60,
        createdDate,
        dueDate,
        note,
        linkedTodoId: activeProtoLauncherCtx.sourceType === 'todo' ? activeProtoLauncherCtx.id : null,
        linkedVaultId: activeProtoLauncherCtx.sourceType === 'vault' ? activeProtoLauncherCtx.id : null
    };

    document.getElementById('protocol-run-modal').classList.add('hidden');

    if (runImmediately) {
        stopTimer(true, true);
        killActiveAlarms();
        const insertAt = Math.min(currentStepIndex, schedule.length);
        schedule.splice(insertAt, 0, newBlock);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(insertAt, false);
        switchPage('page-timer');
        startTimer();
        showToast(`▶️ Running "${titleVal}" (${mins}m)!`);
    } else {
        const wasEmpty = schedule.length === 0;
        schedule.push(newBlock);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        if (wasEmpty) loadStep(0, false);
        renderSchedule();
        broadcastToCloud();
        showToast(`⚡ Saved "${titleVal}" (${mins}m) to Live Protocol!`);
    }
}

/* =========================================================================
   5. DAILY TEMPLATE BUILDER
   ========================================================================= */
function updateDayTabs() {
    document.querySelectorAll('.day-tab-btn').forEach(btn => {
        if (parseInt(btn.getAttribute('data-day')) === activeTemplateDay) {
            btn.className = "day-tab-btn flex-1 min-w-[40px] bg-blue-600 text-white text-[10px] px-2 py-2 rounded-lg font-bold shadow-md transition-all";
        } else {
            btn.className = "day-tab-btn flex-1 min-w-[40px] bg-slate-800 text-slate-300 text-[10px] px-2 py-2 rounded-lg font-bold transition-all";
        }
    });
}

window.saveTemplateInputs = function() {
    const titleInputs = document.querySelectorAll('.session-title-input');
    const durInputs = document.querySelectorAll('.session-dur-input');
    if (weeklyTemplates[activeTemplateDay] && titleInputs.length === weeklyTemplates[activeTemplateDay].length) {
        titleInputs.forEach((input, i) => weeklyTemplates[activeTemplateDay][i].title = input.value);
        durInputs.forEach((input, i) => weeklyTemplates[activeTemplateDay][i].duration = Math.max(1, parseInt(input.value) || 1) * 60);
        safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
        broadcastToCloud();
    }
};

document.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        saveTemplateInputs();
        window.activeTemplateDay = parseInt(e.currentTarget.getAttribute('data-day'));
        updateDayTabs();
        populateSettingsList();
    });
});

document.querySelectorAll('.type-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-val');
        const cat = e.currentTarget.getAttribute('data-cat');
        document.getElementById('new-sess-type').value = val;
        document.getElementById('new-sess-cat').value = cat;
        document.querySelectorAll('.type-toggle-btn').forEach(b => {
            if (b.getAttribute('data-cat') === cat) {
                const activeColor = cat === 'deen' ? 'bg-emerald-600' : 'bg-blue-600';
                b.className = `type-toggle-btn flex-1 ${activeColor} text-white text-[11px] py-1.5 px-2 rounded-md font-bold transition-all shadow-md`;
            } else {
                b.className = "type-toggle-btn flex-1 bg-transparent text-slate-400 text-[11px] py-1.5 px-2 rounded-md font-bold transition-all";
            }
        });
    });
});

window.templateCycleType = function(index) {
    saveTemplateInputs();
    const item = weeklyTemplates[activeTemplateDay]?.[index];
    if (!item) return;
    if (item.type === 'break') { item.type = 'work'; item.category = 'study'; }
    else if (isDeenBlock(item)) { item.type = 'break'; item.category = 'break'; }
    else { item.type = 'work'; item.category = 'deen'; }
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
    populateSettingsList();
    broadcastToCloud();
};

window.templateMove = function(index, dir) {
    saveTemplateInputs();
    const arr = weeklyTemplates[activeTemplateDay];
    const target = index + dir;
    if (!arr || target < 0 || target >= arr.length) return;
    const tmp = arr[index];
    arr[index] = arr[target];
    arr[target] = tmp;
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
    populateSettingsList();
    broadcastToCloud();
};

window.templateDelete = function(index) {
    saveTemplateInputs();
    weeklyTemplates[activeTemplateDay].splice(index, 1);
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
    populateSettingsList();
    broadcastToCloud();
};

window.populateSettingsList = function() {
    const list = document.getElementById('settings-list');
    if (!list) return;
    list.innerHTML = '';
    const currentPlan = weeklyTemplates[activeTemplateDay] || [];
    if (currentPlan.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-xs italic p-3 text-center">Template is empty for this day.</p>`;
        return;
    }
    currentPlan.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800";
        const icon = item.type === 'break' ? '💧' : (isDeenBlock(item) ? '🕌' : '🧠');
        row.innerHTML = `
            <span class="text-[10px] font-mono text-slate-500 w-4 text-center">${index + 1}</span>
            <button onclick="templateCycleType(${index})" class="bg-slate-900 border border-slate-700 px-1.5 py-1 rounded-lg text-xs">${icon}</button>
            <input type="text" value="${escapeHtml(item.title)}" class="session-title-input flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" onchange="saveTemplateInputs()">
            <input type="number" value="${Math.round(item.duration / 60)}" class="session-dur-input w-12 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1.5 text-xs text-white text-center focus:outline-none" onchange="saveTemplateInputs()">
            <button onclick="templateMove(${index}, -1)" class="text-slate-300 bg-slate-900 px-1.5 py-1.5 rounded-lg border border-slate-800 text-[10px]">⬆️</button>
            <button onclick="templateMove(${index}, 1)" class="text-slate-300 bg-slate-900 px-1.5 py-1.5 rounded-lg border border-slate-800 text-[10px]">⬇️</button>
            <button onclick="templateDelete(${index})" class="text-red-400 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800 text-xs">🗑️</button>
        `;
        list.appendChild(row);
    });
};

document.getElementById('add-sess-btn')?.addEventListener('click', () => {
    saveTemplateInputs();
    const titleInput = document.getElementById('new-sess-title');
    const durInput = document.getElementById('new-sess-dur');
    const typeVal = document.getElementById('new-sess-type').value;
    const catVal = document.getElementById('new-sess-cat').value;
    const defTitle = catVal === 'deen' ? "Deen & Imaan Block" : (typeVal === 'work' ? "Study Block" : "Break Block");
    const title = titleInput.value.trim() || defTitle;
    const durationMins = parseInt(durInput.value) || (typeVal === 'work' ? 50 : 10);
    if (!weeklyTemplates[activeTemplateDay]) weeklyTemplates[activeTemplateDay] = [];
    weeklyTemplates[activeTemplateDay].push({
        id: Date.now(), type: typeVal, category: catVal, title, duration: durationMins * 60
    });
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
    titleInput.value = '';
    durInput.value = '';
    populateSettingsList();
    broadcastToCloud();
    showToast("Block Added to Template");
});

document.getElementById('load-day-btn')?.addEventListener('click', () => {
    saveTemplateInputs();
    stopTimer(true, true);
    killActiveAlarms();
    window.schedule = JSON.parse(JSON.stringify(weeklyTemplates[activeTemplateDay] || []));
    schedule.forEach(s => {
        delete s.status;
        delete s._credited;
        if (s.type === 'work' && !s.linkedTodoId) window.ensureProtocolBlockSyncedToTodo(s);
    });
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    window.currentStepIndex = 0;
    window.accumulatedStudyTime = 0;
    window.accumulatedDeenTime = 0;
    window.isOvertime = false;
    loadStep(0, false);
    renderSchedule();
    broadcastToCloud();
    showToast("Live Protocol Overwritten & Synced to PomoTasks!");
    switchPage('page-timer');
});

/* =========================================================================
   6. STUDY / DEEN BALANCE HUD, SALAH TRACKER & WINDOW-AWARE SALAH FREEZE
   ========================================================================= */
window.getTodayStudyMinutes = function() {
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const savedMins = (stats.history[today] && stats.history[today].mins) ? stats.history[today].mins : 0;
    return savedMins + (accumulatedStudyTime / 60);
};

window.getTodayDeenMinutes = function() {
    const today = getLocalTodayString();
    const savedMins = deenHistory[today] || 0;
    return savedMins + (accumulatedDeenTime / 60);
};

window.getTodaySalahDoneCount = function() {
    const today = getLocalTodayString();
    const sMap = salahHistory[today] || {};
    return PRAYERS.filter(p => sMap[p]).length;
};

window.renderHomeHUD = function() {
    const studyHours = getTodayStudyMinutes() / 60;
    const deenHours = getTodayDeenMinutes() / 60;
    const studyTarget = extConfig.studyTargetHours || 8.0;
    const deenTarget = extConfig.deenTargetHours || 1.0;

    document.getElementById('hud-study-hours-text').innerHTML = `${studyHours.toFixed(1)}h <span class="text-slate-500 font-normal">/</span> ${studyTarget.toFixed(1)}h`;
    document.getElementById('hud-deen-hours-text').innerHTML = `${deenHours.toFixed(1)}h <span class="text-slate-500 font-normal">/</span> ${deenTarget.toFixed(1)}h`;

    document.getElementById('hud-study-bar').style.width = `${Math.min(100, Math.round((studyHours / studyTarget) * 100))}%`;
    document.getElementById('hud-deen-bar').style.width = `${Math.min(100, Math.round((deenHours / deenTarget) * 100))}%`;

    const mgDays = Math.max(0, calcDaysRemaining(extConfig.mainGoal.targetDate));
    document.getElementById('header-goal-name').textContent = `🎯 ${extConfig.mainGoal.title}`;
    document.getElementById('header-goal-days').textContent = `${mgDays}d left`;
    PomoEventBus.emit('hud:rendered');
};

document.getElementById('quick-add-deen-15-btn')?.addEventListener('click', () => {
    const today = getLocalTodayString();
    deenHistory[today] = (deenHistory[today] || 0) + 15;
    saveExtConfig();
    renderHomeHUD();
    evaluateDriftAndAlerts();
    broadcastToCloud();
    PomoEventBus.emit('stats:updated');
    showToast("🕌 +15 mins Deen & Imaan logged!");
});

document.getElementById('open-targets-modal-btn')?.addEventListener('click', () => {
    document.getElementById('study-target-val').textContent = `${extConfig.studyTargetHours.toFixed(1)}h`;
    document.getElementById('deen-target-val').textContent = `${extConfig.deenTargetHours.toFixed(1)}h`;
    document.getElementById('targets-modal').classList.remove('hidden');
});
document.getElementById('close-targets-modal-btn')?.addEventListener('click', () => document.getElementById('targets-modal').classList.add('hidden'));
document.getElementById('study-target-minus')?.addEventListener('click', () => {
    extConfig.studyTargetHours = Math.max(1.0, extConfig.studyTargetHours - 0.5);
    document.getElementById('study-target-val').textContent = `${extConfig.studyTargetHours.toFixed(1)}h`;
});
document.getElementById('study-target-plus')?.addEventListener('click', () => {
    extConfig.studyTargetHours = Math.min(16.0, extConfig.studyTargetHours + 0.5);
    document.getElementById('study-target-val').textContent = `${extConfig.studyTargetHours.toFixed(1)}h`;
});
document.getElementById('deen-target-minus')?.addEventListener('click', () => {
    extConfig.deenTargetHours = Math.max(0.5, extConfig.deenTargetHours - 0.25);
    document.getElementById('deen-target-val').textContent = `${extConfig.deenTargetHours.toFixed(2).replace('.00', '.0')}h`;
});
document.getElementById('deen-target-plus')?.addEventListener('click', () => {
    extConfig.deenTargetHours = Math.min(6.0, extConfig.deenTargetHours + 0.25);
    document.getElementById('deen-target-val').textContent = `${extConfig.deenTargetHours.toFixed(2).replace('.00', '.0')}h`;
});
document.getElementById('manual-study-add30')?.addEventListener('click', () => {
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
    stats.history[today].mins += 30;
    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
    renderHomeHUD(); renderStats(); broadcastToCloud();
    showToast("+30m Study Added");
});
document.getElementById('manual-deen-add15')?.addEventListener('click', () => {
    const today = getLocalTodayString();
    deenHistory[today] = (deenHistory[today] || 0) + 15;
    saveExtConfig(); renderHomeHUD(); broadcastToCloud();
    showToast("+15m Deen Added");
});
document.getElementById('manual-deen-minus15')?.addEventListener('click', () => {
    const today = getLocalTodayString();
    deenHistory[today] = Math.max(0, (deenHistory[today] || 0) - 15);
    saveExtConfig(); renderHomeHUD(); broadcastToCloud();
    showToast("-15m Deen Adjusted");
});
document.getElementById('save-targets-modal-btn')?.addEventListener('click', () => {
    saveExtConfig();
    renderHomeHUD();
    evaluateDriftAndAlerts();
    broadcastToCloud();
    document.getElementById('targets-modal').classList.add('hidden');
    showToast("Daily Targets Saved!");
});

window.renderSalahStrip = function() {
    const cont = document.getElementById('home-salah-pills');
    if (!cont) return;
    const today = getLocalTodayString();
    if (!salahHistory[today]) salahHistory[today] = {};
    document.getElementById('salah-score-badge').textContent = `${getTodaySalahDoneCount()}/5`;

    cont.innerHTML = '';
    PRAYERS.forEach(prayer => {
        const isDone = !!salahHistory[today][prayer];
        const tStr = extConfig.salahTimes[prayer] || "00:00";
        const btn = document.createElement('button');
        btn.className = `flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 min-w-0 ${
            isDone ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-300 shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
        }`;
        btn.innerHTML = `
            <span class="text-[9px] font-extrabold uppercase tracking-tight truncate max-w-full">${prayer}</span>
            <span class="text-[8px] font-mono opacity-80 mt-0.5">${tStr}</span>
            <span class="text-xs mt-0.5">${isDone ? '✅' : '⭕'}</span>
        `;
        btn.onclick = () => {
            salahHistory[today][prayer] = !salahHistory[today][prayer];
            if (salahHistory[today][prayer]) playChime('todo');
            saveExtConfig();
            renderSalahStrip();
            evaluateDriftAndAlerts();
            broadcastToCloud();
            PomoEventBus.emit('stats:updated');
        };
        cont.appendChild(btn);
    });
};

let editingPrayerName = null, pickerHr = 5, pickerMin = 15;
window.renderSettingsSalahList = function() {
    const list = document.getElementById('settings-salah-list');
    if (!list) return;
    const today = getLocalTodayString();
    if (!salahHistory[today]) salahHistory[today] = {};
    document.getElementById('masjid-location-label').textContent = extConfig.masjidLocationName || "Local Masjid Times";

    const alertBtn = document.getElementById('toggle-salah-alerts-btn');
    if (alertBtn) {
        alertBtn.textContent = extConfig.salahAlertsEnabled ? "Enabled" : "Muted";
        alertBtn.className = extConfig.salahAlertsEnabled ? "bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg" : "bg-slate-800 text-slate-400 text-[11px] font-bold px-3 py-1 rounded-lg";
    }

    const freezeBtn = document.getElementById('toggle-salah-freeze-btn');
    if (freezeBtn) {
        freezeBtn.textContent = extConfig.salahFreezeEnabled ? "ON ✓" : "OFF";
        freezeBtn.className = extConfig.salahFreezeEnabled
            ? "bg-emerald-600 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow"
            : "bg-slate-800 text-slate-400 text-[11px] font-bold px-3 py-1.5 rounded-lg";
    }
    const freezeSel = document.getElementById('salah-freeze-mins-select');
    if (freezeSel) freezeSel.value = String(extConfig.salahFreezeDurationMins || 10);

    list.innerHTML = '';
    PRAYERS.forEach(prayer => {
        const tStr = extConfig.salahTimes[prayer] || "05:00";
        const isDone = !!salahHistory[today][prayer];
        const row = document.createElement('div');
        row.className = "flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800";
        row.innerHTML = `
            <div class="flex items-center gap-2.5">
                <button onclick="togglePrayerFromSettings('${prayer}')" class="w-6 h-6 rounded-lg border flex items-center justify-center ${isDone ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900'}">${isDone ? '✓' : ''}</button>
                <span class="text-xs font-extrabold text-white">${prayer}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button onclick="window.triggerSalahFreezeOverlay('${prayer}', ${extConfig.salahFreezeDurationMins || 10})" class="bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" title="Start ${extConfig.salahFreezeDurationMins || 10}m Salah Focus Freeze Now">🔒 Pray Now</button>
                <button onclick="openInAppTimeModal('${prayer}')" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                    <span>🕒 ${tStr}</span><span class="text-[10px] text-slate-400">Edit</span>
                </button>
            </div>
        `;
        list.appendChild(row);
    });
};

document.getElementById('toggle-salah-freeze-btn')?.addEventListener('click', () => {
    extConfig.salahFreezeEnabled = !extConfig.salahFreezeEnabled;
    saveExtConfig();
    renderSettingsSalahList();
    broadcastToCloud();
    showToast(`🔒 Salah Time Freeze ${extConfig.salahFreezeEnabled ? 'Enabled' : 'Disabled'}`);
});

document.getElementById('salah-freeze-mins-select')?.addEventListener('change', (e) => {
    extConfig.salahFreezeDurationMins = parseInt(e.target.value) || 10;
    saveExtConfig();
    renderSettingsSalahList();
    broadcastToCloud();
    showToast(`⏱️ Salah Freeze Duration set to ${extConfig.salahFreezeDurationMins} minutes`);
});

document.getElementById('test-salah-freeze-now-btn')?.addEventListener('click', () => {
    window.triggerSalahFreezeOverlay('Asr / Test', extConfig.salahFreezeDurationMins || 10);
});

let salahFreezeTimerInterval = null;
window.firedSalahFreezeKeys = {};

window.triggerSalahFreezeOverlay = function(prayerName = 'Salah', durationMins = 10) {
    if (isRunning) stopTimer();
    if (window.playChime) window.playChime('salah');

    let ov = document.getElementById('salah-freeze-active-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'salah-freeze-active-overlay';
        ov.className = "fixed inset-0 z-[99992] salah-freeze-bg flex items-center justify-center p-4";
        document.body.appendChild(ov);
    }

    let secondsLeft = Math.max(60, (parseInt(durationMins) || 10) * 60);
    clearInterval(salahFreezeTimerInterval);

    function renderFreezeCard() {
        const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const s = String(secondsLeft % 60).padStart(2, '0');
        ov.innerHTML = `
            <div class="bg-slate-950/95 border-2 border-emerald-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-4">
                <span class="text-5xl animate-bounce">🕌</span>
                <div>
                    <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-emerald-600 text-white px-3 py-1 rounded-full">🕋 SALAH WORKSPACE FREEZE ACTIVE</span>
                    <h2 class="text-xl font-extrabold text-white mt-2">Time for ${escapeHtml(prayerName)} Salah</h2>
                    <p class="text-xs text-slate-300 mt-1">Your study timer is safely paused. Step away from the screen, perform Wudu, and pray ${escapeHtml(prayerName)} with Khushu.</p>
                </div>
                <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl py-4 px-6">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">Workspace Unlocks Automatically In</span>
                    <span id="salah-freeze-countdown-text" class="text-5xl font-mono font-extrabold text-white">${m}:${s}</span>
                </div>
                <div class="flex flex-col gap-2">
                    <button type="button" id="salah-freeze-mark-done-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg">
                        ✅ Alhamdulillah, I Prayed ${escapeHtml(prayerName)} (Log & Unlock)
                    </button>
                    <button type="button" id="salah-freeze-unlock-early-btn" class="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold py-2.5 rounded-xl text-xs">
                        🔓 Unlock Workspace Without Logging
                    </button>
                </div>
            </div>
        `;
        ov.classList.remove('hidden');

        document.getElementById('salah-freeze-mark-done-btn').onclick = () => {
            clearInterval(salahFreezeTimerInterval);
            const today = getLocalTodayString();
            if (!salahHistory[today]) salahHistory[today] = {};
            if (PRAYERS.includes(prayerName)) {
                salahHistory[today][prayerName] = true;
            }
            deenHistory[today] = (deenHistory[today] || 0) + (parseInt(durationMins) || 10);
            saveExtConfig();
            renderSalahStrip();
            renderSettingsSalahList();
            renderHomeHUD();
            broadcastToCloud();
            ov.classList.add('hidden');
            showToast(`🕋 MashaAllah! ${prayerName} Salah & +${durationMins}m Deen logged!`);
        };

        document.getElementById('salah-freeze-unlock-early-btn').onclick = () => {
            clearInterval(salahFreezeTimerInterval);
            ov.classList.add('hidden');
        };
    }

    renderFreezeCard();
    salahFreezeTimerInterval = setInterval(() => {
        secondsLeft--;
        const cdEl = document.getElementById('salah-freeze-countdown-text');
        if (secondsLeft > 0) {
            if (cdEl) {
                cdEl.textContent = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
            }
        } else {
            clearInterval(salahFreezeTimerInterval);
            ov.classList.add('hidden');
            showToast(`🕌 ${prayerName} Freeze window complete — Don't forget to mark your Salah!`);
        }
    }, 1000);
};

window.togglePrayerFromSettings = function(prayer) {
    const today = getLocalTodayString();
    if (!salahHistory[today]) salahHistory[today] = {};
    salahHistory[today][prayer] = !salahHistory[today][prayer];
    saveExtConfig();
    renderSettingsSalahList();
    renderSalahStrip();
    evaluateDriftAndAlerts();
    broadcastToCloud();
};

window.openInAppTimeModal = function(prayer) {
    editingPrayerName = prayer;
    const cur = (extConfig.salahTimes[prayer] || "05:15").split(':');
    pickerHr = parseInt(cur[0]) || 0;
    pickerMin = parseInt(cur[1]) || 0;
    document.getElementById('time-modal-title').textContent = `🕌 Set ${prayer} Masjid Time`;
    document.getElementById('time-hr-val').textContent = pickerHr.toString().padStart(2, '0');
    document.getElementById('time-min-val').textContent = pickerMin.toString().padStart(2, '0');
    document.getElementById('inapp-time-modal').classList.remove('hidden');
};

document.getElementById('time-hr-plus')?.addEventListener('click', () => { pickerHr = (pickerHr + 1) % 24; document.getElementById('time-hr-val').textContent = pickerHr.toString().padStart(2, '0'); });
document.getElementById('time-hr-minus')?.addEventListener('click', () => { pickerHr = (pickerHr + 23) % 24; document.getElementById('time-hr-val').textContent = pickerHr.toString().padStart(2, '0'); });
document.getElementById('time-min-plus')?.addEventListener('click', () => { pickerMin = (pickerMin + 5) % 60; document.getElementById('time-min-val').textContent = pickerMin.toString().padStart(2, '0'); });
document.getElementById('time-min-minus')?.addEventListener('click', () => { pickerMin = (pickerMin + 59) % 60; document.getElementById('time-min-val').textContent = pickerMin.toString().padStart(2, '0'); });
document.getElementById('cancel-time-modal-btn')?.addEventListener('click', () => document.getElementById('inapp-time-modal').classList.add('hidden'));
document.getElementById('save-time-modal-btn')?.addEventListener('click', () => {
    if (editingPrayerName) {
        extConfig.salahTimes[editingPrayerName] = `${pickerHr.toString().padStart(2, '0')}:${pickerMin.toString().padStart(2, '0')}`;
        saveExtConfig();
        renderSettingsSalahList();
        renderSalahStrip();
        evaluateDriftAndAlerts();
        broadcastToCloud();
        showToast(`${editingPrayerName} set to ${extConfig.salahTimes[editingPrayerName]}`);
    }
    document.getElementById('inapp-time-modal').classList.add('hidden');
});

document.getElementById('toggle-salah-alerts-btn')?.addEventListener('click', () => {
    extConfig.salahAlertsEnabled = !extConfig.salahAlertsEnabled;
    saveExtConfig();
    renderSettingsSalahList();
    broadcastToCloud();
});

document.getElementById('sync-masjid-gps-btn')?.addEventListener('click', () => {
    if (!navigator.geolocation) { showToast("GPS unavailable. Click times to edit manually.", true); return; }
    showToast("📍 Locating nearby Masjid timings...");
    const HTTPS = 'https:' + '//';
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`${HTTPS}api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=1`);
            const json = await res.json();
            if (json?.data?.timings) {
                PRAYERS.forEach(p => { if (json.data.timings[p]) extConfig.salahTimes[p] = json.data.timings[p].substring(0, 5); });
                extConfig.masjidLocationName = `Synced via GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
                saveExtConfig();
                renderSettingsSalahList();
                renderSalahStrip();
                broadcastToCloud();
                showToast("🕌 Masjid timings synced!");
            }
        } catch (e) { showToast("Offline: Using saved local Masjid schedule.", true); }
    }, () => showToast("Location permission denied.", true), { timeout: 7000 });
});

let dismissedDriftKey = '', currentActiveAlertKey = '', lastSalahChimeKey = '';
function timeStrToMins(tStr) {
    const [h, m] = (tStr || "00:00").split(':').map(Number);
    return (h * 60) + (m || 0);
}

window.evaluateDriftAndAlerts = function() {
    const today = getLocalTodayString();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const sMap = salahHistory[today] || {};
    const studyH = getTodayStudyMinutes() / 60;
    const deenH = getTodayDeenMinutes() / 60;
    const studyTarget = extConfig.studyTargetHours || 8.0;
    const freezeDur = parseInt(extConfig.salahFreezeDurationMins) || 10;

    if (extConfig.salahFreezeEnabled) {
        PRAYERS.forEach(p => {
            if (sMap[p]) return;
            const pMins = timeStrToMins(extConfig.salahTimes[p]);
            const warnKey = `salah_warn2m_${today}_${p}`;
            if (nowMins === pMins - 2 && !window.firedSalahFreezeKeys[warnKey]) {
                window.firedSalahFreezeKeys[warnKey] = true;
                showToast(`🕌 2 Minutes until ${p} Salah! Wrap up your current sentence.`);
            }
            const fKey = `salah_freeze_${today}_${p}`;
            if (nowMins >= pMins && nowMins < pMins + freezeDur && !window.firedSalahFreezeKeys[fKey]) {
                window.firedSalahFreezeKeys[fKey] = true;
                const remMins = Math.max(1, (pMins + freezeDur) - nowMins);
                window.triggerSalahFreezeOverlay(p, remMins);
            }
        });
    }

    let alertTitle = '', alertDesc = '', alertKey = '';
    if (extConfig.salahAlertsEnabled) {
        for (let i = 0; i < PRAYERS.length; i++) {
            const p = PRAYERS[i];
            if (sMap[p]) continue;
            const pStart = timeStrToMins(extConfig.salahTimes[p]);
            const nextPStart = (i < PRAYERS.length - 1) ? timeStrToMins(extConfig.salahTimes[PRAYERS[i + 1]]) : (23 * 60 + 50);
            if (nowMins >= pStart && nowMins < nextPStart) {
                const minsLeft = nextPStart - nowMins;
                if (minsLeft <= 35) {
                    alertTitle = `🚨 You Are Missing ${p} Salah!`;
                    alertDesc = `Only ${minsLeft} mins left before ${i < PRAYERS.length - 1 ? PRAYERS[i + 1] : 'Midnight'}. Pause & pray ${p} now!`;
                    alertKey = `urgent_${today}_${p}`;
                    break;
                }
            }
        }
    }
    if (!alertKey && studyH >= studyTarget * 0.5 && deenH < 0.08) {
        alertTitle = `⚠️ You Are Drifting (Deen Neglected)`;
        alertDesc = `You've studied ${studyH.toFixed(1)}h today with 0m for Deen. Balance your Dunya with your Akhirah!`;
        alertKey = `drift_deen_${today}`;
    }

    currentActiveAlertKey = alertKey;
    const banner = document.getElementById('drift-alert-banner');
    const statusPill = document.getElementById('balance-status-pill');
    if (alertKey && alertKey !== dismissedDriftKey) {
        document.getElementById('drift-alert-title').textContent = alertTitle;
        document.getElementById('drift-alert-desc').textContent = alertDesc;
        banner?.classList.remove('hidden');
        if (statusPill) { statusPill.textContent = "⚠️ Drifting"; statusPill.className = "text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40"; }
        if (lastSalahChimeKey !== alertKey) {
            lastSalahChimeKey = alertKey;
            playChime('salah');
            if (window.sendDesktopNotification) window.sendDesktopNotification(alertTitle, alertDesc, 'salah-alert');
        }
    } else {
        banner?.classList.add('hidden');
        if (statusPill) { statusPill.textContent = "Balanced ✓"; statusPill.className = "text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"; }
    }
};
setInterval(window.evaluateDriftAndAlerts, 15000);

document.getElementById('dismiss-drift-btn')?.addEventListener('click', () => {
    if (currentActiveAlertKey) dismissedDriftKey = currentActiveAlertKey;
    document.getElementById('drift-alert-banner').classList.add('hidden');
});

/* =========================================================================
   7. POMOTASKS & MY DAY PLANNER + AUTO-OVERDUE ROLLOVER + SUBTASK BARS
   ========================================================================= */
window.activeTodoList = 'myday';
window.newTodoDue = '';
window.newTodoRepeat = null;
window.newTodoMyDay = true;
window.newTodoImportant = false;
window.showCompletedTodos = true;
window.activeDetailTodoId = null;
window.repeatModalTarget = 'new';

window.saveTodos = function() {
    safeSet('pages_pomodoro_todos_v9', JSON.stringify(todos));
    safeSet('pages_pomodoro_todolists_v9', JSON.stringify(todoLists));
    broadcastToCloud();
    PomoEventBus.emit('todos:updated');
};

function rolloverOverduePomoTasks() {
    const today = getLocalTodayString();
    let changed = false;
    (window.todos || []).forEach(t => {
        if (!t.completed && t.dueDate && t.dueDate < today && t.myDayDate !== today) {
            t.myDayDate = today;
            changed = true;
        }
    });
    if (changed) safeSet('pages_pomodoro_todos_v9', JSON.stringify(todos));
}

function mountTodoTopBarUpgrades() {
    const suggBtn = document.getElementById('todo-suggestions-btn');
    const rightGrp = suggBtn?.parentElement;
    if (rightGrp && !document.getElementById('todo-grid-toggle-btn')) {
        const gridBtn = document.createElement('button');
        gridBtn.type = 'button';
        gridBtn.id = 'todo-grid-toggle-btn';
        gridBtn.className = "bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95";
        gridBtn.innerHTML = todoLayoutMode === 'grid' ? `<span>⊞</span> <span>Grid</span>` : `<span>☰</span> <span>List</span>`;
        gridBtn.onclick = () => {
            window.todoLayoutMode = todoLayoutMode === 'grid' ? 'list' : 'grid';
            safeSet('pages_pomodoro_todo_layout_v1', todoLayoutMode);
            gridBtn.innerHTML = todoLayoutMode === 'grid' ? `<span>⊞</span> <span>Grid</span>` : `<span>☰</span> <span>List</span>`;
            renderTodos();
        };

        const analyticsBtn = document.createElement('button');
        analyticsBtn.type = 'button';
        analyticsBtn.id = 'todo-analytics-open-btn';
        analyticsBtn.className = "bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 shadow";
        analyticsBtn.innerHTML = `<span>📊</span> <span>4-Graph Studio</span>`;
        analyticsBtn.onclick = () => window.openTodoAnalyticsModal();

        rightGrp.insertBefore(gridBtn, suggBtn);
        rightGrp.insertBefore(analyticsBtn, suggBtn);
    }

    const todoBar = document.getElementById('todo-pick-due-btn')?.parentElement;
    if (todoBar && !document.getElementById('todo-new-rem-time')) {
        const remWrap = document.createElement('div');
        remWrap.className = "inline-flex items-center gap-1 bg-slate-950 text-amber-300 border border-slate-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold";
        remWrap.innerHTML = `<span>⏰</span><input type="time" id="todo-new-rem-time" class="bg-transparent text-[11px] font-mono text-amber-300 focus:outline-none" title="Set Reminder Notification Time">`;
        todoBar.appendChild(remWrap);
    }
}

window.formatRepeatBadge = function(rep) {
    if (!rep || rep.type === 'none') return '';
    if (rep.type === 'daily') return '🔁 Daily';
    if (rep.type === 'weekdays') return '🔁 Mon–Fri';
    if (rep.type === 'weekly') return '🔁 Weekly';
    if (rep.type === 'monthly') return '🔁 Monthly';
    if (rep.type === 'yearly') return '🔁 Yearly';
    if (rep.type === 'custom') return `🔁 Every ${rep.interval} ${rep.unit}`;
    return '🔁 Repeat';
};

function computeNextDueDate(baseIso, rep) {
    const startIso = baseIso || getLocalTodayString();
    const [y, m, d] = startIso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!rep || rep.type === 'none') return startIso;
    if (rep.type === 'daily') dt.setDate(dt.getDate() + 1);
    else if (rep.type === 'weekdays') { do { dt.setDate(dt.getDate() + 1); } while (dt.getDay() === 0 || dt.getDay() === 6); }
    else if (rep.type === 'weekly') dt.setDate(dt.getDate() + 7);
    else if (rep.type === 'monthly') dt.setMonth(dt.getMonth() + 1);
    else if (rep.type === 'yearly') dt.setFullYear(dt.getFullYear() + 1);
    else if (rep.type === 'custom') {
        const iv = Math.max(1, parseInt(rep.interval) || 1);
        if (rep.unit === 'days') dt.setDate(dt.getDate() + iv);
        else if (rep.unit === 'months') dt.setMonth(dt.getMonth() + iv);
        else if (rep.unit === 'years') dt.setFullYear(dt.getFullYear() + iv);
        else dt.setDate(dt.getDate() + 7 * iv);
    }
    return getLocalTodayString(dt);
}

window.renderTodoListsBar = function() {
    mountTodoTopBarUpgrades();
    const bar = document.getElementById('todo-lists-bar');
    if (!bar) return;
    const smart = [
        { id: 'myday', label: '☀️ My Day' },
        { id: 'important', label: '⭐ Important' },
        { id: 'planned', label: '📅 Planned' },
        { id: 'tasks', label: '🏠 All Tasks' }
    ];
    bar.innerHTML = '';
    smart.forEach(s => {
        const btn = document.createElement('button');
        const active = activeTodoList === s.id;
        btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${active ? 'bg-blue-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800'}`;
        btn.textContent = s.label;
        btn.onclick = () => { window.activeTodoList = s.id; renderTodoListsBar(); renderTodos(); };
        bar.appendChild(btn);
    });
    todoLists.forEach(cl => {
        const btn = document.createElement('button');
        const active = activeTodoList === cl.id;
        btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${active ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-300 border border-slate-800'}`;
        btn.textContent = `📁 ${cl.name}`;
        btn.onclick = () => { window.activeTodoList = cl.id; renderTodoListsBar(); renderTodos(); };
        bar.appendChild(btn);
    });
    const addListBtn = document.createElement('button');
    addListBtn.className = "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-950 text-emerald-400 border border-slate-800";
    addListBtn.textContent = "➕ New List";
    addListBtn.onclick = () => {
        document.getElementById('new-todolist-name-input').value = '';
        document.getElementById('new-todolist-modal').classList.remove('hidden');
    };
    bar.appendChild(addListBtn);
};

document.getElementById('cancel-new-todolist-btn')?.addEventListener('click', () => document.getElementById('new-todolist-modal').classList.add('hidden'));
document.getElementById('confirm-new-todolist-btn')?.addEventListener('click', () => {
    const name = document.getElementById('new-todolist-name-input').value.trim();
    if (!name) return;
    const id = 'list_' + Date.now();
    todoLists.push({ id, name });
    window.activeTodoList = id;
    saveTodos();
    renderTodoListsBar();
    renderTodos();
    document.getElementById('new-todolist-modal').classList.add('hidden');
});

window.renderTodos = function() {
    rolloverOverduePomoTasks();
    mountTodoTopBarUpgrades();
    const today = getLocalTodayString();
    document.getElementById('todo-header-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const titles = { myday: '☀️ My Day', important: '⭐ Important', planned: '📅 Planned', tasks: '🏠 All PomoTasks' };
    const customObj = todoLists.find(l => l.id === activeTodoList);
    document.getElementById('todo-header-title').textContent = customObj ? `📁 ${customObj.name}` : (titles[activeTodoList] || '☀️ My Day');
    document.getElementById('delete-custom-list-btn')?.classList.toggle('hidden', !customObj);
    document.getElementById('todo-sugg-badge').textContent = todos.filter(t => !t.completed && t.myDayDate !== today).length;

    const filtered = todos.filter(t => {
        if (activeTodoList === 'myday') return t.myDayDate === today;
        if (activeTodoList === 'important') return !!t.important;
        if (activeTodoList === 'planned') return !!t.dueDate || (t.repeat && t.repeat.type !== 'none');
        if (activeTodoList === 'tasks') return !t.listId || t.listId === 'tasks';
        return t.listId === activeTodoList;
    });

    const activeTasks = filtered.filter(t => !t.completed);
    const completedTasks = filtered.filter(t => t.completed);

    const actCont = document.getElementById('todo-active-container');
    actCont.className = todoLayoutMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4"
        : "flex flex-col gap-2 mb-4";
    actCont.innerHTML = '';
    if (!activeTasks.length) {
        actCont.className = "flex flex-col gap-2 mb-4";
        actCont.innerHTML = `<p class="text-xs text-slate-500 italic text-center p-4 bg-slate-900/40 rounded-xl border border-slate-800/50">No active PomoTasks in this view. Add one above!</p>`;
    } else {
        activeTasks.forEach(t => actCont.appendChild(createTodoRow(t)));
    }

    const compWrap = document.getElementById('todo-completed-wrapper');
    const compCont = document.getElementById('todo-completed-container');
    compCont.className = todoLayoutMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1"
        : "flex flex-col gap-2 mt-1";
    compCont.innerHTML = '';
    if (!completedTasks.length) {
        compWrap.classList.add('hidden');
    } else {
        compWrap.classList.remove('hidden');
        compWrap.classList.add('flex');
        document.getElementById('todo-completed-count').textContent = completedTasks.length;
        if (showCompletedTodos) completedTasks.forEach(t => compCont.appendChild(createTodoRow(t)));
    }
};

window.createTodoRow = function(t) {
    const today = getLocalTodayString();
    const div = document.createElement('div');
    div.className = `flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${t.completed ? 'bg-slate-950/60 border-slate-900 opacity-65' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`;
    const stepsDone = (t.steps || []).filter(s => s.done).length;
    const stepsTot = (t.steps || []).length;
    const stepsPct = stepsTot > 0 ? Math.round((stepsDone / stepsTot) * 100) : 0;
    const repText = formatRepeatBadge(t.repeat);

    const inLiveQueue = schedule.some(s => String(s.linkedTodoId) === String(t.id) && s.status !== 'completed');
    const isRunningNow = isRunning && schedule[currentStepIndex] && String(schedule[currentStepIndex].linkedTodoId) === String(t.id);
    const isOverdue = !t.completed && t.dueDate && t.dueDate < today;

    let durationBadgeHtml = '';
    if (t.usedDurationMins) {
        if (t.overtimeMins && t.overtimeMins > 0) {
            durationBadgeHtml = `<span class="text-[10px] bg-rose-950/90 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-md font-mono font-extrabold">🔥 Used: ${t.usedDurationMins}m (${t.plannedDurationMins || (t.usedDurationMins - t.overtimeMins)}m + ${t.overtimeMins}m Extra)</span>`;
        } else {
            durationBadgeHtml = `<span class="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono font-bold">⏱️ Used: ${t.usedDurationMins}m${t.plannedDurationMins ? ` / ${t.plannedDurationMins}m` : ''}</span>`;
        }
    } else if (t.durationMins) {
        durationBadgeHtml = `<span class="text-[10px] text-blue-400 font-mono">⏱️ ${t.durationMins}m</span>`;
    }

    const safeBookId = escapeJsStr(t.bookId || '');
    const safeTodoId = escapeJsStr(t.id);

    div.onclick = () => openTodoDetail(t.id);
    div.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <button type="button" onclick="event.stopPropagation(); toggleTodoComplete('${safeTodoId}')" class="todo-check-circle ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</button>
            <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-100'}">${escapeHtml(t.title)}</p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    ${isRunningNow ? '<span class="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">▶️ RUNNING ON TIMER</span>' : (inLiveQueue ? '<span class="text-[9px] bg-blue-950 text-blue-300 border border-blue-600/40 px-1.5 py-0.5 rounded font-bold">⏳ In Live Protocol</span>' : '')}
                    ${isOverdue ? '<span class="text-[9px] bg-red-950 text-red-300 border border-red-500/50 px-1.5 py-0.5 rounded font-extrabold">⚠️ Overdue</span>' : ''}
                    ${durationBadgeHtml}
                    ${t.reminderTime ? `<span class="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">⏰ ${escapeHtml(t.reminderTime)}</span>` : ''}
                    ${t.myDayDate === today ? '<span class="text-[10px] text-blue-400 font-semibold">☀️ My Day</span>' : ''}
                    ${t.dueDate ? `<span class="text-[10px] ${isOverdue ? 'text-red-400 font-bold' : 'text-emerald-400'} font-mono">📅 ${formatDDMMYYYY(t.dueDate)}</span>` : ''}
                    ${repText ? `<span class="text-[10px] text-purple-400 font-semibold">${escapeHtml(repText)}</span>` : ''}
                    ${stepsTot > 0 ? `<span class="inline-flex items-center gap-1 text-[10px] text-cyan-300 font-mono">☑️ ${stepsDone}/${stepsTot} <span class="w-10 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700 inline-block"><span class="h-full bg-cyan-400 block" style="width:${stepsPct}%"></span></span></span>` : ''}
                    ${t.note ? `<span class="text-[10px] text-slate-400 truncate max-w-[140px]">📝 ${escapeHtml(t.note)}</span>` : ''}
                    ${t.bookId ? `<button type="button" onclick="event.stopPropagation(); window.openBookAtPage && window.openBookAtPage('${safeBookId}', ${t.bookPage || 1})" class="text-[10px] bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold hover:bg-emerald-600 hover:text-white">📖 Open p.${t.bookPage || 1}</button>` : ''}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="event.stopPropagation(); window.openProtocolRunModal('todo', '${safeTodoId}')" class="bg-blue-600/20 hover:bg-emerald-600 text-blue-300 hover:text-white border border-blue-500/40 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1" title="Add to Live Protocol or Run Timer Now">
                <span>⚡</span><span>Run</span>
            </button>
            <button type="button" onclick="event.stopPropagation(); toggleTodoImportant('${safeTodoId}')" class="text-base px-1.5 ${t.important ? 'text-amber-400' : 'text-slate-600'}" title="Mark Important">${t.important ? '★' : '☆'}</button>
        </div>
    `;
    return div;
};

window.toggleTodoComplete = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (!t) return;
    t.completed = !t.completed;
    const today = getLocalTodayString();

    if (t.completed) {
        t.completedDate = today;
        playChime('todo');

        const timerUsage = window.syncCompletionToTimerAndProtocol('todo', t.id, true);
        if (timerUsage) {
            t.usedDurationMins = timerUsage.usedMins;
            t.plannedDurationMins = timerUsage.plannedMins;
            t.overtimeMins = timerUsage.overtimeMins;
        } else if (!t.usedDurationMins && t.durationMins) {
            t.usedDurationMins = t.durationMins;
            t.plannedDurationMins = t.durationMins;
        }

        if (t.repeat && t.repeat.type && t.repeat.type !== 'none' && !t._spawnedNext) {
            t._spawnedNext = true;
            const nextDue = computeNextDueDate(t.dueDate || today, t.repeat);
            todos.unshift({
                id: Date.now() + Math.floor(Math.random() * 100),
                title: t.title, completed: false, important: t.important,
                myDayDate: nextDue === today ? nextDue : '',
                createdDate: today,
                dueDate: nextDue, repeat: JSON.parse(JSON.stringify(t.repeat)),
                steps: (t.steps || []).map(s => ({ ...s, done: false })),
                note: t.note || '', listId: t.listId || 'tasks',
                bookId: t.bookId, bookPage: t.bookPage
            });
        }

        if (t.linkedVaultId) {
            const vTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
            const vt = vTasks.find(x => String(x.id) === String(t.linkedVaultId));
            if (vt) {
                vt.completed = true;
                vt.completedDate = today;
                vt.usedDurationMins = t.usedDurationMins || vt.durationMins || 45;
                vt.overtimeMins = t.overtimeMins || 0;
                safeSet('pages_pomodoro_tasks_v8', JSON.stringify(vTasks));
                PomoEventBus.emit('vault:updated');
            }
        }
    } else {
        delete t.completedDate;
        if (t.linkedVaultId) {
            const vTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
            const vt = vTasks.find(x => String(x.id) === String(t.linkedVaultId));
            if (vt) {
                vt.completed = false;
                delete vt.completedDate;
                safeSet('pages_pomodoro_tasks_v8', JSON.stringify(vTasks));
                PomoEventBus.emit('vault:updated');
            }
        }
    }
    saveTodos();
    renderTodos();
};

window.toggleTodoImportant = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (t) { t.important = !t.important; saveTodos(); renderTodos(); }
};

document.getElementById('todo-pick-due-btn')?.addEventListener('click', () => window.openGoalModal && window.openGoalModal('todo-new-due'));
document.getElementById('todo-pick-repeat-btn')?.addEventListener('click', () => {
    window.repeatModalTarget = 'new';
    document.getElementById('custom-repeat-modal').classList.remove('hidden');
});
document.getElementById('todo-toggle-myday-btn')?.addEventListener('click', (e) => {
    window.newTodoMyDay = !newTodoMyDay;
    e.currentTarget.className = newTodoMyDay
        ? "text-[11px] font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded-lg"
        : "text-[11px] font-semibold bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg";
});
document.getElementById('todo-toggle-imp-btn')?.addEventListener('click', (e) => {
    window.newTodoImportant = !newTodoImportant;
    e.currentTarget.textContent = newTodoImportant ? "★ Important" : "☆ Important";
});

function submitNewTodo() {
    const inp = document.getElementById('todo-new-input');
    const remInp = document.getElementById('todo-new-rem-time');
    const title = inp.value.trim();
    if (!title) return;
    const today = getLocalTodayString();
    todos.unshift({
        id: Date.now(), title, completed: false,
        important: newTodoImportant || activeTodoList === 'important',
        myDayDate: (newTodoMyDay || activeTodoList === 'myday') ? today : '',
        createdDate: today,
        dueDate: newTodoDue || (newTodoRepeat ? today : ''),
        reminderTime: remInp?.value || '',
        repeat: newTodoRepeat ? JSON.parse(JSON.stringify(newTodoRepeat)) : { type: 'none' },
        steps: [], note: '',
        listId: ['myday', 'important', 'planned', 'tasks'].includes(activeTodoList) ? 'tasks' : activeTodoList
    });
    inp.value = '';
    if (remInp) remInp.value = '';
    window.newTodoDue = '';
    window.newTodoRepeat = null;
    document.getElementById('todo-new-due-label').textContent = 'Due Date';
    document.getElementById('todo-new-repeat-label').textContent = 'Repeat';
    saveTodos();
    renderTodos();
}
document.getElementById('todo-add-submit-btn')?.addEventListener('click', submitNewTodo);
document.getElementById('todo-new-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitNewTodo(); });

document.getElementById('todo-completed-toggle')?.addEventListener('click', () => {
    window.showCompletedTodos = !showCompletedTodos;
    document.getElementById('todo-completed-arrow').textContent = showCompletedTodos ? '▼' : '▶';
    renderTodos();
});

document.getElementById('delete-custom-list-btn')?.addEventListener('click', () => {
    window.todoLists = todoLists.filter(l => l.id !== activeTodoList);
    window.todos = todos.filter(t => t.listId !== activeTodoList);
    window.activeTodoList = 'myday';
    saveTodos();
    renderTodoListsBar();
    renderTodos();
});

let customRepInterval = 1, customRepDays = [];
document.getElementById('close-repeat-modal-btn')?.addEventListener('click', () => document.getElementById('custom-repeat-modal').classList.add('hidden'));
document.querySelectorAll('.repeat-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        applyRepeatRuleSelection({ type: e.currentTarget.getAttribute('data-preset') });
        document.getElementById('custom-repeat-modal').classList.add('hidden');
    });
});
document.getElementById('rep-int-minus')?.addEventListener('click', () => { customRepInterval = Math.max(1, customRepInterval - 1); document.getElementById('rep-int-val').textContent = customRepInterval; });
document.getElementById('rep-int-plus')?.addEventListener('click', () => { customRepInterval = Math.min(99, customRepInterval + 1); document.getElementById('rep-int-val').textContent = customRepInterval; });
document.getElementById('rep-unit-select')?.addEventListener('change', (e) => {
    const box = document.getElementById('rep-weekdays-box');
    if (box) {
        box.classList.toggle('hidden', e.target.value !== 'weeks');
        box.classList.toggle('flex', e.target.value === 'weeks');
    }
});
document.querySelectorAll('.rep-day-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        const d = parseInt(e.currentTarget.getAttribute('data-d'));
        if (customRepDays.includes(d)) customRepDays = customRepDays.filter(x => x !== d);
        else customRepDays.push(d);
        const active = customRepDays.includes(d);
        e.currentTarget.className = active
            ? "rep-day-pill bg-blue-600 border border-blue-400 text-[10px] font-bold py-1.5 rounded-lg text-white"
            : "rep-day-pill bg-slate-900 border border-slate-700 text-[10px] font-bold py-1.5 rounded-lg text-slate-400";
    });
});
document.getElementById('apply-custom-repeat-btn')?.addEventListener('click', () => {
    const unit = document.getElementById('rep-unit-select').value;
    applyRepeatRuleSelection({ type: 'custom', interval: customRepInterval, unit, daysOfWeek: [...customRepDays] });
    document.getElementById('custom-repeat-modal').classList.add('hidden');
});

function applyRepeatRuleSelection(rule) {
    if (repeatModalTarget === 'new') {
        window.newTodoRepeat = rule.type === 'none' ? null : rule;
        document.getElementById('todo-new-repeat-label').textContent = formatRepeatBadge(rule) || 'Repeat';
    } else {
        const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
        if (t) {
            t.repeat = rule;
            document.getElementById('detail-repeat-status').textContent = formatRepeatBadge(rule) || 'Never';
            saveTodos();
            renderTodos();
        }
    }
}

window.openTodoDetail = function(id) {
    window.activeDetailTodoId = id;
    const t = todos.find(x => String(x.id) === String(id));
    if (!t) return;
    document.getElementById('detail-task-title').value = t.title;
    document.getElementById('detail-note-input').value = t.note || '';
    document.getElementById('detail-myday-status').textContent = (t.myDayDate === getLocalTodayString()) ? 'Added ☀️' : 'Add to My Day';
    document.getElementById('detail-due-status').textContent = t.dueDate ? formatDDMMYYYY(t.dueDate) : 'Not Set';
    document.getElementById('detail-repeat-status').textContent = formatRepeatBadge(t.repeat) || 'Never';
    renderDetailSteps();
    document.getElementById('todo-detail-modal').classList.remove('hidden');
};

function renderDetailSteps() {
    const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
    const list = document.getElementById('detail-steps-list');
    if (!t || !list) return;
    list.innerHTML = '';
    (t.steps || []).forEach((s, i) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg";
        row.innerHTML = `<div onclick="toggleSubStep(${i})" class="flex items-center gap-2 flex-1 cursor-pointer"><span class="text-xs">${s.done ? '☑️' : '⬜'}</span><span class="text-xs ${s.done ? 'line-through text-slate-500' : 'text-slate-200'}">${escapeHtml(s.text)}</span></div><button onclick="deleteSubStep(${i})" class="text-[10px] text-red-400 px-1">✕</button>`;
        list.appendChild(row);
    });
}
window.toggleSubStep = function(i) { const t = todos.find(x => String(x.id) === String(activeDetailTodoId)); if (t?.steps[i]) { t.steps[i].done = !t.steps[i].done; saveTodos(); renderDetailSteps(); renderTodos(); } };
window.deleteSubStep = function(i) { const t = todos.find(x => String(x.id) === String(activeDetailTodoId)); if (t?.steps) { t.steps.splice(i, 1); saveTodos(); renderDetailSteps(); renderTodos(); } };

document.getElementById('detail-add-step-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('detail-new-step-input');
    const val = inp.value.trim();
    const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
    if (t && val) {
        if (!t.steps) t.steps = [];
        t.steps.push({ text: val, done: false });
        inp.value = '';
        saveTodos(); renderDetailSteps(); renderTodos();
    }
});
document.getElementById('detail-myday-btn')?.addEventListener('click', () => {
    const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
    if (!t) return;
    const today = getLocalTodayString();
    t.myDayDate = (t.myDayDate === today) ? '' : today;
    document.getElementById('detail-myday-status').textContent = (t.myDayDate === today) ? 'Added ☀️' : 'Add to My Day';
    saveTodos(); renderTodos();
});
document.getElementById('detail-due-btn')?.addEventListener('click', () => window.openGoalModal && window.openGoalModal('todo-detail-due'));
document.getElementById('detail-repeat-btn')?.addEventListener('click', () => { window.repeatModalTarget = 'detail'; document.getElementById('custom-repeat-modal').classList.remove('hidden'); });
document.getElementById('detail-save-btn')?.addEventListener('click', () => {
    const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
    if (t) {
        t.title = document.getElementById('detail-task-title').value.trim() || t.title;
        t.note = document.getElementById('detail-note-input').value;
        saveTodos(); renderTodos();
    }
    document.getElementById('todo-detail-modal').classList.add('hidden');
});
document.getElementById('detail-delete-btn')?.addEventListener('click', () => {
    window.todos = todos.filter(x => String(x.id) !== String(activeDetailTodoId));
    saveTodos(); renderTodos();
    document.getElementById('todo-detail-modal').classList.add('hidden');
});
document.getElementById('close-detail-modal-btn')?.addEventListener('click', () => document.getElementById('todo-detail-modal').classList.add('hidden'));

document.getElementById('todo-suggestions-btn')?.addEventListener('click', () => {
    const cont = document.getElementById('suggestions-list-container');
    const today = getLocalTodayString();
    const list = todos.filter(t => !t.completed && t.myDayDate !== today);
    cont.innerHTML = list.length ? '' : `<p class="text-xs text-slate-400 italic text-center p-4">All unfinished PomoTasks are already in My Day!</p>`;
    list.forEach(t => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800";
        row.innerHTML = `<span class="text-xs font-bold text-slate-200 truncate pr-2">${escapeHtml(t.title)}</span><button onclick="addSuggestedToMyDay('${escapeJsStr(t.id)}')" class="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">＋ My Day</button>`;
        cont.appendChild(row);
    });
    document.getElementById('todo-suggestions-modal').classList.remove('hidden');
});
window.addSuggestedToMyDay = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (t) { t.myDayDate = getLocalTodayString(); saveTodos(); renderTodos(); document.getElementById('todo-suggestions-btn').click(); }
};
document.getElementById('close-suggestions-modal-btn')?.addEventListener('click', () => document.getElementById('todo-suggestions-modal').classList.add('hidden'));

/* =========================================================================
   8. 4-GRAPH MULTI-HORIZON PROGRESSION STUDIO (1W, 4W, 6M, 12M, 18M, 3 YEARS)
   ========================================================================= */
let activeAnalyticsRange = '4w';

window.computeTodoAndVaultProgression = function() {
    const today = new Date();
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));

    const dayMap = {};
    for (let i = 0; i < 1100; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const iso = getLocalTodayString(d);
        const sMap = salahHistory[iso] || {};
        const salahCnt = PRAYERS.filter(p => sMap[p]).length;
        const studyM = stats.history?.[iso]?.mins || 0;
        const deenM = deenHistory[iso] || 0;
        dayMap[iso] = {
            todoDone: 0,
            vaultDone: 0,
            studyMins: studyM,
            deenMins: deenM,
            salahCount: salahCnt
        };
    }

    const todayIso = getLocalTodayString(today);
    todos.forEach(t => {
        if (t.completed) {
            const cDate = t.completedDate || t.dueDate || t.myDayDate || todayIso;
            if (!dayMap[cDate]) dayMap[cDate] = { todoDone: 0, vaultDone: 0, studyMins: 0, deenMins: 0, salahCount: 0 };
            dayMap[cDate].todoDone += 1;
        }
    });
    vaultTasks.forEach(vt => {
        if (vt.completed) {
            const cDate = vt.completedDate || vt.dueDate || todayIso;
            if (!dayMap[cDate]) dayMap[cDate] = { todoDone: 0, vaultDone: 0, studyMins: 0, deenMins: 0, salahCount: 0 };
            dayMap[cDate].vaultDone += 1;
        }
    });

    function sumRange(startOffset, endOffset) {
        let todoSum = 0, vaultSum = 0, minsSum = 0, deenSum = 0, salahSum = 0;
        for (let i = startOffset; i <= endOffset; i++) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const iso = getLocalTodayString(d);
            const rec = dayMap[iso] || { todoDone: 0, vaultDone: 0, studyMins: 0, deenMins: 0, salahCount: 0 };
            todoSum += rec.todoDone;
            vaultSum += rec.vaultDone;
            minsSum += rec.studyMins;
            deenSum += rec.deenMins;
            salahSum += rec.salahCount;
        }
        return {
            todoSum, vaultSum,
            totalItems: todoSum + vaultSum,
            hours: +(minsSum / 60).toFixed(1),
            deenHours: +(deenSum / 60).toFixed(1),
            salahTotal: salahSum
        };
    }

    const week1 = sumRange(0, 6);
    const week4 = sumRange(0, 27);
    const earlierWeek4 = sumRange(28, 55);
    const month6 = sumRange(0, 179);
    const month12 = sumRange(0, 364);
    const year3 = sumRange(0, 1094);

    const delta4W = week4.totalItems - earlierWeek4.totalItems;
    const pctGrowth4W = earlierWeek4.totalItems > 0
        ? Math.round(((week4.totalItems - earlierWeek4.totalItems) / earlierWeek4.totalItems) * 100)
        : (week4.totalItems > 0 ? 100 : 0);

    return { dayMap, week1, week4, earlierWeek4, month6, month12, year3, delta4W, pctGrowth4W };
};

function buildSvgLineChartCard(cfg) {
    const { title, subtitle, badgeText, strokeColor, gradId, seriesA, seriesB, labels, unitSuffix = '' } = cfg;
    const maxVal = Math.max(cfg.minCeiling || 5, ...seriesA, ...(seriesB && seriesB.length ? seriesB : [0]));
    const svgW = 680, svgH = 165, padL = 42, padR = 22, padT = 20, padB = 28;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;

    const toPt = (val, idx, count) => {
        const x = padL + (count <= 1 ? plotW / 2 : (idx / (count - 1)) * plotW);
        const y = padT + plotH - (Math.min(maxVal, val) / maxVal) * plotH;
        return { x: +x.toFixed(1), y: +y.toFixed(1), val: +Number(val).toFixed(1) };
    };

    const ptsA = seriesA.map((v, i) => toPt(v, i, seriesA.length));
    const ptsB = (seriesB || []).map((v, i) => toPt(v, i, seriesB.length));
    const polyA = ptsA.map(p => `${p.x},${p.y}`).join(' ');
    const areaA = `${ptsA[0].x},${padT + plotH} ${polyA} ${ptsA[ptsA.length - 1].x},${padT + plotH}`;
    const polyB = ptsB.length ? ptsB.map(p => `${p.x},${p.y}`).join(' ') : '';

    return `
        <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h4 class="text-xs font-extrabold text-white uppercase tracking-wider" style="color:${strokeColor}">${title}</h4>
                    <p class="text-[10px] text-slate-400">${subtitle}</p>
                </div>
                <span class="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200">${badgeText}</span>
            </div>
            <div class="w-full overflow-x-auto">
                <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-40 overflow-visible">
                    <defs>
                        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
                            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
                        </linearGradient>
                    </defs>
                    ${[0, 0.5, 1].map(r => {
                        const y = padT + plotH * (1 - r);
                        const v = +(maxVal * r).toFixed(1);
                        return `<line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="#1e293b" stroke-dasharray="4 4" stroke-width="1"/>
                                <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="9.5" font-family="monospace">${v}${unitSuffix}</text>`;
                    }).join('')}
                    <polygon points="${areaA}" fill="url(#${gradId})" />
                    ${polyB ? `<polyline fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5 4" points="${polyB}" />` : ''}
                    <polyline fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyA}" />
                    ${ptsA.map((p, i) => `
                        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${strokeColor}" stroke="#ffffff" stroke-width="1.5"></circle>
                        ${ptsA.length <= 12 || i % 2 === 0 ? `<text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="${strokeColor}" font-size="9.5" font-weight="bold" font-family="monospace">${p.val}${unitSuffix}</text>` : ''}
                        ${ptsA.length <= 12 || i % 2 === 0 || i === ptsA.length - 1 ? `<text x="${p.x}" y="${svgH - 6}" text-anchor="middle" fill="#94a3b8" font-size="9.5" font-weight="bold">${labels[i]}</text>` : ''}
                    `).join('')}
                </svg>
            </div>
        </div>
    `;
}

window.openTodoAnalyticsModal = function(rangeOverride = null) {
    if (rangeOverride) activeAnalyticsRange = rangeOverride;
    let modal = document.getElementById('todo-analytics-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'todo-analytics-modal';
        modal.className = "hidden fixed inset-0 modal-backdrop z-[385] flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }

    const data = window.computeTodoAndVaultProgression();
    const today = new Date();
    const studyTargetMins = (extConfig.studyTargetHours || 8) * 60;

    let labels = [];
    let g1StudyTasks = [], g1Prev4W = [];
    let g2DeenHours = [];
    let g3SalahScore = [];
    let g4DisciplinePct = [];

    if (activeAnalyticsRange === '1w') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const iso = getLocalTodayString(d);
            const rec = data.dayMap[iso] || { todoDone: 0, vaultDone: 0, studyMins: 0, deenMins: 0, salahCount: 0 };
            labels.push(i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }));
            g1StudyTasks.push(rec.todoDone + rec.vaultDone);
            g2DeenHours.push(+(rec.deenMins / 60).toFixed(2));
            g3SalahScore.push(rec.salahCount);
            const disc = Math.min(100, Math.round(((rec.studyMins / studyTargetMins) * 55) + ((rec.salahCount / 5) * 45)));
            g4DisciplinePct.push(disc);
        }
    } else if (activeAnalyticsRange === '4w') {
        for (let w = 3; w >= 0; w--) {
            let curTasks = 0, prevTasks = 0, deenM = 0, salahC = 0, studyM = 0;
            for (let d = 0; d < 7; d++) {
                const cIso = getLocalTodayString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (w * 7 + d)));
                const pIso = getLocalTodayString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (28 + w * 7 + d)));
                const cRec = data.dayMap[cIso] || { todoDone: 0, vaultDone: 0, studyMins: 0, deenMins: 0, salahCount: 0 };
                const pRec = data.dayMap[pIso] || { todoDone: 0, vaultDone: 0 };
                curTasks += cRec.todoDone + cRec.vaultDone;
                prevTasks += pRec.todoDone + pRec.vaultDone;
                deenM += cRec.deenMins;
                salahC += cRec.salahCount;
                studyM += cRec.studyMins;
            }
            labels.push(w === 0 ? 'This Wk' : `Wk -${w}`);
            g1StudyTasks.push(curTasks);
            g1Prev4W.push(prevTasks);
            g2DeenHours.push(+(deenM / 60).toFixed(1));
            g3SalahScore.push(+(salahC / 7).toFixed(1));
            g4DisciplinePct.push(Math.min(100, Math.round(((studyM / (studyTargetMins * 7)) * 55) + ((salahC / 35) * 45))));
        }
    } else {
        const is3Y = activeAnalyticsRange === '3y';
        const bucketCount = activeAnalyticsRange === '6m' ? 6 : (activeAnalyticsRange === '12m' ? 12 : (activeAnalyticsRange === '18m' ? 18 : 12));
        const monthsPerBucket = is3Y ? 3 : 1;

        for (let b = bucketCount - 1; b >= 0; b--) {
            let tasksTot = 0, deenM = 0, salahC = 0, studyM = 0, daysCount = 0;
            for (let mOff = 0; mOff < monthsPerBucket; mOff++) {
                const targetM = b * monthsPerBucket + mOff;
                const d = new Date(today.getFullYear(), today.getMonth() - targetM, 1);
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                Object.entries(data.dayMap).forEach(([k, v]) => {
                    if (k.startsWith(ym)) {
                        tasksTot += (v.todoDone + v.vaultDone);
                        deenM += v.deenMins;
                        salahC += v.salahCount;
                        studyM += v.studyMins;
                        daysCount++;
                    }
                });
            }
            const labelDate = new Date(today.getFullYear(), today.getMonth() - (b * monthsPerBucket), 1);
            labels.push(is3Y ? labelDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : labelDate.toLocaleDateString('en-US', { month: 'short' }));
            const safeDays = Math.max(1, daysCount);
            g1StudyTasks.push(tasksTot);
            g2DeenHours.push(+(deenM / 60).toFixed(1));
            g3SalahScore.push(+(salahC / safeDays).toFixed(1));
            g4DisciplinePct.push(Math.min(100, Math.round(((studyM / (studyTargetMins * safeDays)) * 55) + ((salahC / (5 * safeDays)) * 45))));
        }
    }

    const horizonBtns = [
        { id: '1w', label: '1W (7D)' },
        { id: '4w', label: '4W vs Earlier 4W' },
        { id: '6m', label: '6 Months' },
        { id: '12m', label: '12 Months (1Y)' },
        { id: '18m', label: '18 Months' },
        { id: '3y', label: '3 Years (36M)' }
    ];

    modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-3xl p-5 w-full max-w-5xl shadow-2xl flex flex-col gap-3.5 max-h-[92dvh] native-scroll">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                    <span class="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">📊 4-Graph Multi-Horizon Progression Studio (Up to 3 Years)</span>
                    <h3 class="text-lg font-extrabold text-white">Study & PomoTasks • Deen Hours • Salah 5/5 • Discipline & Consistency</h3>
                </div>
                <button type="button" onclick="document.getElementById('todo-analytics-modal').classList.add('hidden')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs">✕ Close</button>
            </div>

            <div class="grid grid-cols-4 gap-2.5">
                <div class="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3">
                    <p class="text-[10px] font-extrabold uppercase text-emerald-400">4-Week Tasks & Vault</p>
                    <p class="text-2xl font-mono font-extrabold text-white mt-0.5">${data.week4.totalItems}</p>
                    <p class="text-[10px] font-mono ${data.delta4W >= 0 ? 'text-emerald-400' : 'text-amber-400'}">${data.delta4W >= 0 ? `▲ +${data.pctGrowth4W}% vs Earlier 4W` : `▼ ${data.pctGrowth4W}% vs Earlier 4W`}</p>
                </div>
                <div class="bg-slate-950 border border-cyan-500/40 rounded-2xl p-3">
                    <p class="text-[10px] font-extrabold uppercase text-cyan-400">12-Month Study & Deen</p>
                    <p class="text-2xl font-mono font-extrabold text-cyan-300 mt-0.5">${data.month12.hours}h</p>
                    <p class="text-[10px] text-slate-400 font-mono">🕌 ${data.month12.deenHours}h Deen Logged</p>
                </div>
                <div class="bg-slate-950 border border-amber-500/40 rounded-2xl p-3">
                    <p class="text-[10px] font-extrabold uppercase text-amber-400">12-Month Salah Logged</p>
                    <p class="text-2xl font-mono font-extrabold text-amber-300 mt-0.5">${data.month12.salahTotal}</p>
                    <p class="text-[10px] text-slate-400 font-mono">🕋 5 Daily Prayers Tracker</p>
                </div>
                <div class="bg-slate-950 border border-purple-500/40 rounded-2xl p-3">
                    <p class="text-[10px] font-extrabold uppercase text-purple-400">3-Year Lifetime Total</p>
                    <p class="text-2xl font-mono font-extrabold text-purple-300 mt-0.5">${data.year3.totalItems}</p>
                    <p class="text-[10px] text-slate-400 font-mono">⏱️ ${data.year3.hours}h Total Focus</p>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                <span class="text-[11px] font-extrabold text-slate-300 px-2">📅 Select Horizon:</span>
                <div class="flex flex-wrap gap-1">
                    ${horizonBtns.map(b => `
                        <button type="button" onclick="window.openTodoAnalyticsModal('${b.id}')" class="px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all ${activeAnalyticsRange === b.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}">${b.label}</button>
                    `).join('')}
                </div>
            </div>

            <div class="flex flex-col gap-3">
                ${buildSvgLineChartCard({
                    title: '📈 Graph 1: Study Execution & Completed Tasks (PomoTasks + Study Vault)',
                    subtitle: activeAnalyticsRange === '4w' ? 'Solid Emerald = Current 4 Weeks  |  Dashed Grey = Earlier 4 Weeks' : 'Completed PomoTasks + Study Vault Backlog/Revision Chapters',
                    badgeText: `Peak: ${Math.max(0, ...g1StudyTasks)} items`,
                    strokeColor: '#10b981',
                    gradId: 'gradStudy1',
                    seriesA: g1StudyTasks,
                    seriesB: g1Prev4W,
                    labels,
                    minCeiling: 5
                })}

                ${buildSvgLineChartCard({
                    title: '🕌 Graph 2: Deen & Imaan Hours Progression',
                    subtitle: 'Tracks daily Quran, Tafseer, Hadith & Deen focus hours logged',
                    badgeText: `Total Period: ${g2DeenHours.reduce((a, b) => a + b, 0).toFixed(1)}h`,
                    strokeColor: '#06b6d4',
                    gradId: 'gradDeen2',
                    seriesA: g2DeenHours,
                    labels,
                    unitSuffix: 'h',
                    minCeiling: 2
                })}

                ${buildSvgLineChartCard({
                    title: '🕋 Graph 3: Salah Progression (Daily / Average Score Out of 5)',
                    subtitle: 'Tracks Fajr, Dhuhr, Asr, Maghrib & Isha completion consistency (0 to 5 scale)',
                    badgeText: `Target: 5.0 / 5`,
                    strokeColor: '#f59e0b',
                    gradId: 'gradSalah3',
                    seriesA: g3SalahScore,
                    labels,
                    unitSuffix: '/5',
                    minCeiling: 5
                })}

                ${buildSvgLineChartCard({
                    title: '⚔️ Graph 4: Discipline & Consistency Index (%)',
                    subtitle: 'Composite score combining Daily Study Target % (55% weight) + 5/5 Salah Completion % (45% weight)',
                    badgeText: `Avg: ${Math.round(g4DisciplinePct.reduce((a, b) => a + b, 0) / Math.max(1, g4DisciplinePct.length))}%`,
                    strokeColor: '#a855f7',
                    gradId: 'gradDisc4',
                    seriesA: g4DisciplinePct,
                    labels,
                    unitSuffix: '%',
                    minCeiling: 100
                })}
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

/* =========================================================================
   9. STATS, TELEGRAM REPORT & BOOTSTRAP
   ========================================================================= */
window.renderStats = function() {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const todayData = stats.history[getLocalTodayString()] || { mins: 0, sessions: 0 };
    document.getElementById('stat-today-mins').innerHTML = `${todayData.mins}<span class="text-sm text-slate-500 ml-1">m</span>`;
    document.getElementById('stat-today-sessions').textContent = todayData.sessions;
    let weekMins = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = getLocalTodayString(d);
        if (stats.history[ds]) weekMins += stats.history[ds].mins;
    }
    document.getElementById('stat-weekly-total').textContent = `${weekMins}m`;
    PomoEventBus.emit('stats:rendered');
};

async function sendTelegramMessage() {
    const token = safeGet('pages_pomodoro_tg_token', document.getElementById('tg-token-input')?.value.trim() || '');
    const chatId = safeGet('pages_pomodoro_tg_chatid', document.getElementById('tg-chatid-input')?.value.trim() || '');
    if (!token || !chatId) { showToast("Set Telegram keys in Profile", true); return; }

    const studyH = (getTodayStudyMinutes() / 60).toFixed(1);
    const deenH = (getTodayDeenMinutes() / 60).toFixed(1);
    const salahScore = getTodaySalahDoneCount();
    const mgDays = Math.max(0, calcDaysRemaining(extConfig.mainGoal.targetDate));
    const compCount = schedule.filter(s => s.status === 'completed').length;
    const HTTPS = 'https:' + '//';

    let text = `🩺 *POMO DAILY PROTOCOL REPORT* 🩺\n\n🎯 *${extConfig.mainGoal.title}:* ${mgDays} Days Left\n🧠 *Study:* ${studyH}h / ${extConfig.studyTargetHours.toFixed(1)}h\n🕌 *Deen & Imaan:* ${deenH}h / ${extConfig.deenTargetHours.toFixed(1)}h\n🕋 *Salah Completed:* ${salahScore}/5\n✅ *Protocol Blocks:* ${compCount}/${Math.max(1, schedule.length)}`;
    try {
        await fetch(`${HTTPS}api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
        showToast("Report Sent to Telegram!");
    } catch (e) { showToast("Offline: Could not reach Telegram", true); }
}

document.getElementById('save-tg-btn')?.addEventListener('click', () => {
    safeSet('pages_pomodoro_tg_token', document.getElementById('tg-token-input').value.trim());
    safeSet('pages_pomodoro_tg_chatid', document.getElementById('tg-chatid-input').value.trim());
    showToast("Telegram Keys Saved");
});
document.getElementById('disconnect-tg-btn')?.addEventListener('click', () => {
    safeSet('pages_pomodoro_tg_token', ''); safeSet('pages_pomodoro_tg_chatid', '');
    document.getElementById('tg-token-input').value = ''; document.getElementById('tg-chatid-input').value = '';
    showToast("Telegram Disconnected");
});
document.getElementById('send-report-btn')?.addEventListener('click', sendTelegramMessage);
if (document.getElementById('tg-token-input')) document.getElementById('tg-token-input').value = safeGet('pages_pomodoro_tg_token', '');
if (document.getElementById('tg-chatid-input')) document.getElementById('tg-chatid-input').value = safeGet('pages_pomodoro_tg_chatid', '');

document.getElementById('save-coach-btn')?.addEventListener('click', () => {
    const sq = document.getElementById('custom-study-quotes').value.trim();
    const bq = document.getElementById('custom-break-quotes').value.trim();
    window.studyQuotes = sq ? sq.split('\n').filter(q => q.trim() !== '') : defaultStudyQuotes;
    window.breakQuotes = bq ? bq.split('\n').filter(q => q.trim() !== '') : defaultBreakQuotes;
    safeSet('pages_pomodoro_study_q', JSON.stringify(studyQuotes));
    safeSet('pages_pomodoro_break_q', JSON.stringify(breakQuotes));
    showToast("Focus Coach Quotes Saved");
});

document.getElementById('factory-reset-btn')?.addEventListener('click', () => document.getElementById('confirm-reset-modal').classList.remove('hidden'));
document.getElementById('cancel-reset-btn')?.addEventListener('click', () => document.getElementById('confirm-reset-modal').classList.add('hidden'));
document.getElementById('confirm-wipe-btn')?.addEventListener('click', async () => {
    try { localStorage.clear(); } catch (err) {}
    window.location.reload();
});

// Bootstrap Timer State
const savedStateRaw = safeGet('pages_pomodoro_app_state_v8', null);
if (savedStateRaw && schedule.length > 0) {
    try {
        const savedState = JSON.parse(savedStateRaw);
        window.currentStepIndex = savedState.currentStepIndex || 0;
        window.targetEndTime = savedState.targetEndTime || 0;
        window.accumulatedStudyTime = savedState.accumulatedStudyTime || 0;
        window.accumulatedDeenTime = savedState.accumulatedDeenTime || 0;
        window.isOvertime = savedState.isOvertime || false;
        window.timeLeft = savedState.timeLeft !== undefined ? savedState.timeLeft : (schedule[currentStepIndex] ? schedule[currentStepIndex].duration : 0);
        loadStep(currentStepIndex, true);
        if (savedState.isRunning) startTimer(true);
        else updateDisplay();
    } catch (e) { loadStep(0); }
} else {
    loadStep(0);
}

updateDayTabs();
populateSettingsList();
renderHomeHUD();
renderSalahStrip();
renderTodoListsBar();
renderTodos();
evaluateDriftAndAlerts();
// ✅ END OF FILE (02-pomo-core.js v16.0 Desktop) — 100% COMPLETE & UNCUT
