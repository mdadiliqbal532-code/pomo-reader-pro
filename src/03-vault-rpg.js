/* =========================================================================
   03-VAULT-RPG.JS (v9.0) — 3-TIER COMPASS, 5-WAY SYNC, OVERTIME GUARDRAIL,
   OMNI-BENTO WIDGETS, ADVANCED PROFILE ANALYTICS & PRO-GAMER RPG ARENA
   ========================================================================= */

window.showCompletedVaultItems = true;
window.overtimeExtensionMins = 0;
window.lastOvertimeWarnStage = 0;
window.isPureCountUpMode = false;
window.pureCountUpSeconds = 0;

window.activateVaultSubview = function(mode) {
    const compBtn = document.getElementById('mode-compass-btn');
    const neetBtn = document.getElementById('mode-neet-vault-btn');
    const rpgBtn = document.getElementById('mode-rpg-rank-btn');
    const compView = document.getElementById('compass-subview');
    const neetView = document.getElementById('neet-vault-subview');
    const rpgView = document.getElementById('rpg-arena-subview');

    if (compBtn) compBtn.className = "flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all";
    if (neetBtn) neetBtn.className = "flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all";
    if (rpgBtn) rpgBtn.className = "flex-1 bg-transparent text-amber-400 font-bold py-2 rounded-lg text-xs transition-all";

    compView?.classList.add('hidden');
    neetView?.classList.add('hidden');
    rpgView?.classList.add('hidden');

    if (mode === 'compass') {
        if (compBtn) compBtn.className = "flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        compView?.classList.remove('hidden');
        renderCompassView();
    } else if (mode === 'rpg') {
        if (rpgBtn) rpgBtn.className = "flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        rpgView?.classList.remove('hidden');
        rpgView?.classList.add('flex');
        renderRpgArena();
    } else {
        if (neetBtn) neetBtn.className = "flex-1 bg-purple-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        neetView?.classList.remove('hidden');
        neetView?.classList.add('flex');
        upgradeVaultAddFormUI();
        renderCustomSubjectBar();
        renderTasks(activeTaskTab);
    }
};

document.getElementById('mode-compass-btn')?.addEventListener('click', () => activateVaultSubview('compass'));
document.getElementById('mode-neet-vault-btn')?.addEventListener('click', () => activateVaultSubview('neet'));
document.getElementById('mode-rpg-rank-btn')?.addEventListener('click', () => activateVaultSubview('rpg'));

/* =========================================================================
   1. 3-TIER LIFE COMPASS & TWO-WAY DD/MM/YYYY <-> DAYS MODAL
   ========================================================================= */
function getSmartGoalSuggestion(daysLeft, isMain = false) {
    const studyTarget = extConfig.studyTargetHours || 8.0;
    if (daysLeft <= 0) return "🚨 Target Day Reached! Update your milestone or set your next target.";
    if (isMain) {
        if (daysLeft > 150) return `💡 Foundation & Backlog Phase: ${daysLeft} days gives you ${(daysLeft * studyTarget).toLocaleString()} focus hours.`;
        if (daysLeft >= 60) return `💡 High-Yield Revision & Practice Phase: ${daysLeft} days left. Prioritize daily active recall.`;
        return `🔥 Final Sprint Mode (${daysLeft}d left): Protect your ${studyTarget}h daily block + 5/5 Salah.`;
    }
    return `💡 Side Goal Pacing: ${daysLeft} days remaining. Work on this after completing 50% of your Main Goal + Deen.`;
}

window.renderCompassView = function() {
    document.getElementById('deen-purpose-title').textContent = extConfig.deenPurpose.title;
    document.getElementById('deen-purpose-desc').textContent = extConfig.deenPurpose.desc;
    const deenH = getTodayDeenMinutes() / 60;
    document.getElementById('compass-deen-today').textContent = `${deenH.toFixed(1)}h / ${extConfig.deenTargetHours.toFixed(1)}h`;
    document.getElementById('compass-salah-today').textContent = `${getTodaySalahDoneCount()} / 5`;

    const mgDays = Math.max(0, calcDaysRemaining(extConfig.mainGoal.targetDate));
    const totalEffortHours = Math.round(mgDays * (extConfig.studyTargetHours || 8.0));
    document.getElementById('main-goal-card-title').textContent = `🎯 ${extConfig.mainGoal.title}`;
    document.getElementById('main-goal-card-date').textContent = `Target Date: ${formatDDMMYYYY(extConfig.mainGoal.targetDate)}`;
    document.getElementById('main-goal-card-days').textContent = mgDays;
    document.getElementById('main-goal-effort-bank').textContent = `⚡ Effort Bank: ${totalEffortHours.toLocaleString()} Focus Hours remaining (@ ${extConfig.studyTargetHours.toFixed(1)}h/day)`;
    document.getElementById('main-goal-suggestion').textContent = getSmartGoalSuggestion(mgDays, true);

    const sgList = document.getElementById('side-goals-list');
    document.getElementById('side-goals-count').textContent = extConfig.sideGoals.length;
    sgList.innerHTML = '';

    if (!extConfig.sideGoals.length) {
        sgList.innerHTML = `<p class="text-xs text-slate-500 italic text-center p-3">No side goals added. Tap "+ Add Side Goal" above.</p>`;
        return;
    }

    extConfig.sideGoals.forEach((sg, idx) => {
        const days = Math.max(0, calcDaysRemaining(sg.targetDate));
        const card = document.createElement('div');
        card.className = "bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-2";
        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                    <h4 class="text-xs sm:text-sm font-bold text-white truncate">🚀 ${escapeHtml(sg.title)}</h4>
                    <p class="text-[10px] font-mono text-slate-400 mt-0.5">Target: ${formatDDMMYYYY(sg.targetDate)}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="text-right bg-purple-950/50 border border-purple-700/40 px-2.5 py-1 rounded-lg">
                        <span class="text-sm font-mono font-extrabold text-purple-300">${days}</span>
                        <span class="text-[9px] font-bold uppercase text-purple-400 block leading-none">Days</span>
                    </div>
                    <button onclick="openGoalModal('side-edit', ${idx})" class="bg-slate-900 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg text-xs">✏️</button>
                    <button onclick="deleteSideGoal(${idx})" class="bg-slate-900 text-red-400 border border-slate-700 px-2 py-1.5 rounded-lg text-xs">🗑️</button>
                </div>
            </div>
            <p class="text-[10px] text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80">${escapeHtml(getSmartGoalSuggestion(days, false))}</p>
        `;
        sgList.appendChild(card);
    });
};

window.deleteSideGoal = function(idx) {
    extConfig.sideGoals.splice(idx, 1);
    saveExtConfig();
    renderCompassView();
    broadcastToCloud();
    showToast("Side Goal Removed");
};

window.modalContextMode = 'main-goal';
window.modalEditIndex = -1;
window.pDay = 15;
window.pMonth = 5;
window.pYear = 2027;
window.pDaysBuffer = "210";
window.numpadFreshOpen = true;

function maxDaysInMonth(m, y) { return new Date(y, m, 0).getDate(); }

function refreshGoalModalUI() {
    const maxD = maxDaysInMonth(window.pMonth, window.pYear);
    if (window.pDay > maxD) window.pDay = maxD;
    const iso = `${window.pYear}-${String(window.pMonth).padStart(2, '0')}-${String(window.pDay).padStart(2, '0')}`;
    const daysLeft = Math.max(0, calcDaysRemaining(iso));
    document.getElementById('picker-dd-val').textContent = String(window.pDay).padStart(2, '0');
    document.getElementById('picker-mm-val').textContent = String(window.pMonth).padStart(2, '0');
    document.getElementById('picker-yy-val').textContent = String(window.pYear);
    document.getElementById('modal-live-date-badge').textContent = `${String(window.pDay).padStart(2, '0')}/${String(window.pMonth).padStart(2, '0')}/${window.pYear}`;
    document.getElementById('picker-days-display').textContent = daysLeft;
    document.getElementById('modal-goal-smart-suggestion').textContent = getSmartGoalSuggestion(daysLeft, window.modalContextMode === 'main-goal');
}

function syncPickerFromISO(isoStr) {
    const parts = (isoStr || addDaysToTodayISO(30)).split('-').map(Number);
    window.pYear = parts[0] || 2027; window.pMonth = parts[1] || 5; window.pDay = parts[2] || 15;
    window.pDaysBuffer = String(Math.max(0, calcDaysRemaining(`${window.pYear}-${String(window.pMonth).padStart(2, '0')}-${String(window.pDay).padStart(2, '0')}`)));
    refreshGoalModalUI();
}

function syncPickerFromDays(daysInt) {
    const iso = addDaysToTodayISO(Math.max(0, Math.min(9999, parseInt(daysInt) || 0)));
    const [y, m, d] = iso.split('-').map(Number);
    window.pYear = y; window.pMonth = m; window.pDay = d;
    refreshGoalModalUI();
}

window.openGoalModal = function(mode, idx = -1) {
    window.modalContextMode = mode;
    window.modalEditIndex = idx;
    const titleWrap = document.getElementById('goal-title-wrapper');
    const descWrap = document.getElementById('goal-desc-wrapper');
    const dateSection = document.getElementById('goal-date-picker-section');
    const clearDateBtn = document.getElementById('clear-goal-date-btn');
    const titleInp = document.getElementById('modal-goal-title-input');
    const descInp = document.getElementById('modal-goal-desc-input');
    const heading = document.getElementById('goal-modal-heading');

    descWrap.classList.add('hidden');
    dateSection.classList.remove('hidden');
    clearDateBtn.classList.add('hidden');

    if (mode === 'main-goal') {
        heading.textContent = "🎯 Edit Main Goal & Countdown";
        titleWrap.classList.remove('hidden');
        titleInp.value = extConfig.mainGoal.title;
        syncPickerFromISO(extConfig.mainGoal.targetDate);
    } else if (mode === 'side-add') {
        heading.textContent = "🚀 Add New Side Goal";
        titleWrap.classList.remove('hidden');
        titleInp.value = "";
        syncPickerFromISO(addDaysToTodayISO(60));
    } else if (mode === 'side-edit') {
        heading.textContent = "✏️ Edit Side Goal";
        titleWrap.classList.remove('hidden');
        const sg = extConfig.sideGoals[idx];
        titleInp.value = sg ? sg.title : "";
        syncPickerFromISO(sg ? sg.targetDate : addDaysToTodayISO(60));
    } else if (mode === 'deen-purpose') {
        heading.textContent = "🕌 Edit Lifelong Deen Purpose (∞)";
        titleWrap.classList.remove('hidden');
        descWrap.classList.remove('hidden');
        dateSection.classList.add('hidden');
        titleInp.value = extConfig.deenPurpose.title;
        descInp.value = extConfig.deenPurpose.desc || "";
    } else if (mode === 'todo-new-due') {
        heading.textContent = "📅 Select Task Due Date";
        titleWrap.classList.add('hidden');
        clearDateBtn.classList.remove('hidden');
        syncPickerFromISO(newTodoDue || getLocalTodayString());
    } else if (mode === 'todo-detail-due') {
        heading.textContent = "📅 Select Task Due Date";
        titleWrap.classList.add('hidden');
        clearDateBtn.classList.remove('hidden');
        const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
        syncPickerFromISO(t?.dueDate || getLocalTodayString());
    }
    document.getElementById('goal-date-modal').classList.remove('hidden');
};

document.getElementById('edit-deen-purpose-btn')?.addEventListener('click', () => openGoalModal('deen-purpose'));
document.getElementById('edit-main-goal-btn')?.addEventListener('click', () => openGoalModal('main-goal'));
document.getElementById('add-side-goal-btn')?.addEventListener('click', () => openGoalModal('side-add'));
document.getElementById('close-goal-modal-btn')?.addEventListener('click', () => document.getElementById('goal-date-modal').classList.add('hidden'));
document.getElementById('clear-goal-date-btn')?.addEventListener('click', () => {
    if (window.modalContextMode === 'todo-new-due') {
        window.newTodoDue = '';
        document.getElementById('todo-new-due-label').textContent = 'Due Date';
    } else if (window.modalContextMode === 'todo-detail-due') {
        const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
        if (t) { t.dueDate = ''; document.getElementById('detail-due-status').textContent = 'Not Set'; saveTodos(); renderTodos(); }
    }
    document.getElementById('goal-date-modal').classList.add('hidden');
});

document.getElementById('dd-minus-btn')?.addEventListener('click', () => { const m = maxDaysInMonth(window.pMonth, window.pYear); window.pDay = window.pDay <= 1 ? m : window.pDay - 1; refreshGoalModalUI(); });
document.getElementById('dd-plus-btn')?.addEventListener('click', () => { const m = maxDaysInMonth(window.pMonth, window.pYear); window.pDay = window.pDay >= m ? 1 : window.pDay + 1; refreshGoalModalUI(); });
document.getElementById('mm-minus-btn')?.addEventListener('click', () => { window.pMonth = window.pMonth <= 1 ? 12 : window.pMonth - 1; refreshGoalModalUI(); });
document.getElementById('mm-plus-btn')?.addEventListener('click', () => { window.pMonth = window.pMonth >= 12 ? 1 : window.pMonth + 1; refreshGoalModalUI(); });
document.getElementById('yy-minus-btn')?.addEventListener('click', () => { window.pYear = Math.max(2025, window.pYear - 1); refreshGoalModalUI(); });
document.getElementById('yy-plus-btn')?.addEventListener('click', () => { window.pYear = Math.min(2045, window.pYear + 1); refreshGoalModalUI(); });

document.querySelectorAll('.days-numpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-key');
        if (key === 'CLR') { window.pDaysBuffer = '0'; window.numpadFreshOpen = false; }
        else if (key === 'BS') { window.pDaysBuffer = window.pDaysBuffer.length > 1 ? window.pDaysBuffer.slice(0, -1) : '0'; window.numpadFreshOpen = false; }
        else {
            if (window.numpadFreshOpen || window.pDaysBuffer === '0') { window.pDaysBuffer = key; window.numpadFreshOpen = false; }
            else if (window.pDaysBuffer.length < 4) window.pDaysBuffer += key;
        }
        syncPickerFromDays(parseInt(window.pDaysBuffer) || 0);
    });
});

document.getElementById('save-goal-modal-btn')?.addEventListener('click', () => {
    const iso = `${window.pYear}-${String(window.pMonth).padStart(2, '0')}-${String(window.pDay).padStart(2, '0')}`;
    const titleVal = document.getElementById('modal-goal-title-input').value.trim();
    const descVal = document.getElementById('modal-goal-desc-input').value.trim();

    if (window.modalContextMode === 'main-goal') {
        extConfig.mainGoal.title = titleVal || "Primary Life & Academic Goal";
        extConfig.mainGoal.targetDate = iso;
        saveExtConfig(); renderHomeHUD(); renderCompassView(); broadcastToCloud();
    } else if (window.modalContextMode === 'side-add') {
        extConfig.sideGoals.push({ id: Date.now(), title: titleVal || `Side Milestone #${extConfig.sideGoals.length + 1}`, targetDate: iso });
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (window.modalContextMode === 'side-edit' && extConfig.sideGoals[window.modalEditIndex]) {
        extConfig.sideGoals[window.modalEditIndex].title = titleVal || extConfig.sideGoals[window.modalEditIndex].title;
        extConfig.sideGoals[window.modalEditIndex].targetDate = iso;
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (window.modalContextMode === 'deen-purpose') {
        extConfig.deenPurpose.title = titleVal || "🕌 Strengthen Deen & Imaan";
        extConfig.deenPurpose.desc = descVal || "Follow the Islamic path for my entire life.";
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (window.modalContextMode === 'todo-new-due') {
        window.newTodoDue = iso;
        document.getElementById('todo-new-due-label').textContent = formatDDMMYYYY(iso);
    } else if (window.modalContextMode === 'todo-detail-due') {
        const t = todos.find(x => String(x.id) === String(activeDetailTodoId));
        if (t) { t.dueDate = iso; document.getElementById('detail-due-status').textContent = formatDDMMYYYY(iso); saveTodos(); renderTodos(); }
    }
    window.numpadFreshOpen = true;
    document.getElementById('goal-date-modal').classList.add('hidden');
});

/* =========================================================================
   2. INTEGRATED STUDY VAULT (AUTO TO-DO MIRRORING, REMINDERS & COMPLETED SECTION)
   ========================================================================= */
function upgradeVaultAddFormUI() {
    const dueInp = document.getElementById('vault-new-due-input');
    if (dueInp && !dueInp.value) {
        dueInp.value = getLocalTodayString();
    }
    // Add Reminder Clock Input to To-Do Bar if not yet present
    const todoBar = document.getElementById('todo-pick-due-btn')?.parentElement;
    if (todoBar && !document.getElementById('todo-new-rem-time')) {
        const remWrap = document.createElement('div');
        remWrap.className = "inline-flex items-center gap-1 bg-slate-950 text-amber-300 border border-slate-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold";
        remWrap.innerHTML = `<span>⏰</span><input type="time" id="todo-new-rem-time" class="bg-transparent text-[11px] font-mono text-amber-300 focus:outline-none" title="Set Reminder Notification Time">`;
        todoBar.appendChild(remWrap);
    }
}
upgradeVaultAddFormUI();

window.renderCustomSubjectBar = function() {
    const container = document.getElementById('subject-filter-container');
    if (!container) return;
    container.className = "flex gap-1.5 mb-4 shrink-0 overflow-x-auto no-scrollbar pb-1 items-center";
    container.innerHTML = `<input type="hidden" id="active-subject-input" value="${escapeHtml(activeTaskSubj)}">`;

    extConfig.customSubjects.forEach(subj => {
        const isAct = (subj === activeTaskSubj);
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = isAct
            ? "subj-btn active px-3.5 py-2 bg-slate-700 text-white border border-slate-500 font-bold rounded-xl text-xs transition-all shadow-sm whitespace-nowrap shrink-0"
            : "subj-btn px-3.5 py-2 bg-slate-900 text-slate-400 border border-slate-800 font-bold rounded-xl text-xs transition-all whitespace-nowrap shrink-0";
        btn.textContent = subj;
        btn.onclick = () => {
            window.activeTaskSubj = subj;
            renderCustomSubjectBar();
            if (activeTaskTab === 'mcq') {
                document.getElementById('mcq-subject-title').textContent = `${activeTaskSubj} Daily Target`;
                loadMCQInputs();
            }
            renderTasks(activeTaskTab);
        };
        container.appendChild(btn);
    });

    const addSubjBtn = document.createElement('button');
    addSubjBtn.type = "button";
    addSubjBtn.className = "px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-700/50 font-bold rounded-xl text-xs whitespace-nowrap shrink-0";
    addSubjBtn.textContent = "➕ Subject";
    addSubjBtn.onclick = () => openCustomSubjectModal();
    container.appendChild(addSubjBtn);
};

window.openCustomSubjectModal = function() {
    const modal = document.getElementById('reader-suboptions-modal');
    const titleEl = document.getElementById('suboptions-modal-title');
    const bodyEl = document.getElementById('suboptions-modal-body');
    titleEl.textContent = "📚 Manage Custom Study Vault Subjects";
    bodyEl.innerHTML = `
        <p class="text-xs text-slate-400">Add any subject for your exams, career, or Deen. Works across Backlog, Revision, Daily MCQ, and Matrix.</p>
        <div class="flex gap-2">
            <input type="text" id="new-vault-subj-input" placeholder="e.g. Anatomy / Tafseer / Hadith / Coding" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
            <button type="button" id="confirm-add-vault-subj" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs">＋ Add</button>
        </div>
        <div class="flex flex-col gap-1.5 max-h-60 native-scroll mt-2">
            ${extConfig.customSubjects.map((s, idx) => `
                <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <span class="text-xs font-bold text-white">${escapeHtml(s)}</span>
                    ${extConfig.customSubjects.length > 1 ? `<button type="button" onclick="window.removeCustomVaultSubj(${idx})" class="text-red-400 text-xs font-bold px-2">🗑️ Remove</button>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    modal.classList.remove('hidden');
    const inp = document.getElementById('new-vault-subj-input');
    setTimeout(() => inp?.focus(), 50);
    const addFn = () => {
        const val = (inp.value || '').trim();
        if (val && !extConfig.customSubjects.includes(val)) {
            extConfig.customSubjects.push(val);
            window.activeTaskSubj = val;
            saveExtConfig(); broadcastToCloud();
            renderCustomSubjectBar(); renderTasks(activeTaskTab);
            openCustomSubjectModal();
            showToast(`✅ Subject "${val}" added!`);
        }
    };
    document.getElementById('confirm-add-vault-subj').onclick = addFn;
    inp.onkeydown = (e) => { if (e.key === 'Enter') addFn(); };
};

window.removeCustomVaultSubj = function(idx) {
    if (extConfig.customSubjects.length <= 1) return;
    extConfig.customSubjects.splice(idx, 1);
    window.activeTaskSubj = extConfig.customSubjects[0];
    saveExtConfig(); broadcastToCloud();
    renderCustomSubjectBar(); renderTasks(activeTaskTab);
    openCustomSubjectModal();
};

document.querySelectorAll('.task-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        window.activeTaskTab = e.currentTarget.getAttribute('data-tab');
        document.querySelectorAll('.task-tab').forEach(t => t.className = "task-tab flex-1 min-w-[70px] bg-transparent text-slate-400 font-bold py-2 px-2 rounded-lg text-xs transition-all");
        let colorClass = "bg-purple-600 text-white shadow-md";
        if (activeTaskTab === 'revision') colorClass = "bg-amber-600 text-white shadow-md";
        else if (activeTaskTab === 'mcq' || activeTaskTab === 'matrix') colorClass = "bg-blue-600 text-white shadow-md";
        e.currentTarget.className = `task-tab flex-1 min-w-[70px] ${colorClass} font-bold py-2 px-2 rounded-lg text-xs transition-all`;

        const tf = document.getElementById('task-add-form'), mf = document.getElementById('mcq-add-form'), sf = document.getElementById('subject-filter-container');
        if (activeTaskTab === 'matrix') { tf.classList.add('hidden'); mf.classList.add('hidden'); sf.classList.add('hidden'); }
        else if (activeTaskTab === 'mcq') { tf.classList.add('hidden'); mf.classList.remove('hidden'); sf.classList.remove('hidden'); document.getElementById('mcq-subject-title').textContent = `${activeTaskSubj} Daily Target`; loadMCQInputs(); }
        else { tf.classList.remove('hidden'); mf.classList.add('hidden'); sf.classList.remove('hidden'); }
        renderTasks(activeTaskTab);
    });
});

// Create Study Vault Item + Automatically Mirror to To-Do List!
function createNewVaultTaskObject() {
    upgradeVaultAddFormUI();
    const titleInput = document.getElementById('task-title-input');
    const dueInput = document.getElementById('vault-new-due-input');
    const durInput = document.getElementById('vault-new-dur-input');
    const noteInput = document.getElementById('vault-new-note-input');
    const title = (titleInput?.value || '').trim();
    if (!title) {
        showToast("Type a chapter or topic name first!", true);
        return null;
    }
    const today = getLocalTodayString();
    const vaultId = Date.now();
    const todoMirrorId = vaultId + 1;
    const durMins = Math.max(5, parseInt(durInput?.value) || 45);
    const dueIso = dueInput?.value || today;
    const noteStr = (noteInput?.value || '').trim();
    const vType = activeTaskTab === 'revision' ? 'revision' : 'backlog';

    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const newItem = {
        id: vaultId,
        linkedTodoId: todoMirrorId,
        title,
        subject: activeTaskSubj,
        type: vType,
        completed: false,
        createdDate: today,
        dueDate: dueIso,
        durationMins: durMins,
        note: noteStr
    };
    tasks.unshift(newItem);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));

    // Auto-Mirror into Microsoft To-Do so Vault & To-Do stay 100% integrated
    todos.unshift({
        id: todoMirrorId,
        linkedVaultId: vaultId,
        title: `📚 [${activeTaskSubj} • ${vType.toUpperCase()}] ${title}`,
        completed: false,
        important: vType === 'backlog',
        myDayDate: today,
        createdDate: today,
        dueDate: dueIso,
        durationMins: durMins,
        repeat: { type: 'none' },
        steps: [],
        note: noteStr,
        listId: 'tasks'
    });
    saveTodos();
    renderTodos();

    if (titleInput) titleInput.value = '';
    if (noteInput) noteInput.value = '';
    renderTasks(activeTaskTab);
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');
    return newItem;
}

document.getElementById('add-task-btn')?.addEventListener('click', () => {
    const created = createNewVaultTaskObject();
    if (created) showToast(`📚 Added "${created.title}" to Vault & synced to To-Do!`);
});

document.getElementById('add-and-run-vault-btn')?.addEventListener('click', () => {
    const created = createNewVaultTaskObject();
    if (created && window.openProtocolRunModal) {
        window.openProtocolRunModal('vault', created.id);
    }
});

document.getElementById('task-title-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const created = createNewVaultTaskObject();
        if (created) showToast(`📚 Added "${created.title}" to Vault & synced to To-Do!`);
    }
});

/* =========================================================================
   3. CLOSED-LOOP 5-WAY BI-DIRECTIONAL SYNC ENGINE
      (Timer <-> Plan <-> To-Do <-> Study Vault <-> Profile Stats)
   ========================================================================= */
window.recordOvertimeToStatsLedger = function(extraMins) {
    if (!extraMins || extraMins <= 0) return;
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0, overtimeMins: 0 };
    stats.history[today].overtimeMins = (stats.history[today].overtimeMins || 0) + extraMins;
    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
};

// Helper: If user checks off a To-Do or Study Vault item, stop/complete its linked Timer or Live Protocol block!
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

        // Credit the actual elapsed time to Study or Deen before stopping
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
        // Queued block in Live Protocol (not currently running)
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

// Two-Way Vault Toggle (Syncs Vault <-> To-Do <-> Timer & Live Protocol)
window.toggleTask = function(id) {
    haptic(20);
    const today = getLocalTodayString();
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => String(x.id) === String(id));
    if (!t) return;

    t.completed = !t.completed;
    if (t.completed) {
        t.completedDate = today;
        if (window.playChime) window.playChime('todo');

        const timerUsage = window.syncCompletionToTimerAndProtocol('vault', t.id, true);
        if (timerUsage) {
            t.usedDurationMins = timerUsage.usedMins;
            t.plannedDurationMins = timerUsage.plannedMins;
            t.overtimeMins = timerUsage.overtimeMins;
        } else if (!t.usedDurationMins) {
            t.usedDurationMins = t.durationMins || 45;
            t.plannedDurationMins = t.durationMins || 45;
        }
    } else {
        delete t.completedDate;
    }

    // Mirror completion state to linked To-Do task
    const linkedTodo = todos.find(x => String(x.id) === String(t.linkedTodoId) || String(x.linkedVaultId) === String(t.id));
    if (linkedTodo) {
        linkedTodo.completed = t.completed;
        if (t.completed) {
            linkedTodo.completedDate = today;
            linkedTodo.usedDurationMins = t.usedDurationMins;
            linkedTodo.plannedDurationMins = t.plannedDurationMins;
            linkedTodo.overtimeMins = t.overtimeMins || 0;
        } else {
            delete linkedTodo.completedDate;
        }
        saveTodos();
        renderTodos();
    }

    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks(activeTaskTab);
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');
};

window.deleteTask = function(id) {
    let tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    tasks = tasks.filter(x => String(x.id) !== String(id));
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks(activeTaskTab);
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');
};

// Two-Way To-Do Toggle (Syncs To-Do <-> Vault <-> Timer & Live Protocol)
window.toggleTodoComplete = function(id) {
    haptic(20);
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

        // Also sync linked Study Vault item if linked
        if (t.linkedVaultId) {
            const vTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
            const vt = vTasks.find(x => String(x.id) === String(t.linkedVaultId));
            if (vt) {
                vt.completed = true;
                vt.completedDate = today;
                vt.usedDurationMins = t.usedDurationMins || vt.durationMins || 45;
                vt.overtimeMins = t.overtimeMins || 0;
                safeSet('pages_pomodoro_tasks_v8', JSON.stringify(vTasks));
                renderTasks(activeTaskTab);
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
                renderTasks(activeTaskTab);
            }
        }
    }
    saveTodos();
    renderTodos();
};

// Upgrade createTodoRow to display Used Duration, Reverse Count-Up Overtime, Reminder Time & Live Protocol Badges
window.createTodoRow = function(t) {
    const div = document.createElement('div');
    div.className = `flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${t.completed ? 'bg-slate-950/60 border-slate-900 opacity-65' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`;
    const stepsDone = (t.steps || []).filter(s => s.done).length;
    const stepsTot = (t.steps || []).length;
    const repText = formatRepeatBadge(t.repeat);

    const inLiveQueue = schedule.some(s => String(s.linkedTodoId) === String(t.id) && s.status !== 'completed');
    const isRunningNow = isRunning && schedule[currentStepIndex] && String(schedule[currentStepIndex].linkedTodoId) === String(t.id);

    let durationBadgeHtml = '';
    if (t.usedDurationMins) {
        if (t.overtimeMins && t.overtimeMins > 0) {
            durationBadgeHtml = `<span class="text-[10px] bg-rose-950/90 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-md font-mono font-extrabold" title="Total Time Used (Planned + Extra Count-Up Overtime)">🔥 Used: ${t.usedDurationMins}m (${t.plannedDurationMins || (t.usedDurationMins - t.overtimeMins)}m + ${t.overtimeMins}m Extra Count-Up)</span>`;
        } else {
            durationBadgeHtml = `<span class="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono font-bold">⏱️ Used: ${t.usedDurationMins}m${t.plannedDurationMins ? ` / ${t.plannedDurationMins}m` : ''}</span>`;
        }
    } else if (t.durationMins) {
        durationBadgeHtml = `<span class="text-[10px] text-blue-400 font-mono">⏱️ ${t.durationMins}m</span>`;
    }

    div.onclick = () => openTodoDetail(t.id);
    div.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <button type="button" onclick="event.stopPropagation(); toggleTodoComplete('${t.id}')" class="todo-check-circle ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</button>
            <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-100'}">${escapeHtml(t.title)}</p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    ${isRunningNow ? '<span class="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">▶️ RUNNING ON TIMER</span>' : (inLiveQueue ? '<span class="text-[9px] bg-blue-950 text-blue-300 border border-blue-600/40 px-1.5 py-0.5 rounded font-bold">⏳ In Live Protocol</span>' : '')}
                    ${durationBadgeHtml}
                    ${t.reminderTime ? `<span class="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold">⏰ ${escapeHtml(t.reminderTime)}</span>` : ''}
                    ${t.myDayDate === getLocalTodayString() ? '<span class="text-[10px] text-blue-400 font-semibold">☀️ My Day</span>' : ''}
                    ${t.dueDate ? `<span class="text-[10px] text-emerald-400 font-mono">📅 ${formatDDMMYYYY(t.dueDate)}</span>` : ''}
                    ${repText ? `<span class="text-[10px] text-purple-400 font-semibold">${escapeHtml(repText)}</span>` : ''}
                    ${stepsTot > 0 ? `<span class="text-[10px] text-slate-400 font-mono">☑️ ${stepsDone}/${stepsTot}</span>` : ''}
                    ${t.note ? `<span class="text-[10px] text-slate-400 truncate max-w-[140px]">📝 ${escapeHtml(t.note)}</span>` : ''}
                    ${t.bookId ? `<button type="button" onclick="event.stopPropagation(); window.openBookAtPage && window.openBookAtPage('${t.bookId}', ${t.bookPage || 1})" class="text-[10px] bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold hover:bg-emerald-600 hover:text-white">📖 Open p.${t.bookPage || 1}</button>` : ''}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="event.stopPropagation(); window.openProtocolRunModal('todo', '${t.id}')" class="bg-blue-600/20 hover:bg-emerald-600 text-blue-300 hover:text-white border border-blue-500/40 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1" title="Add to Live Protocol or Run Timer Now">
                <span>⚡</span><span class="hidden sm:inline">Run</span>
            </button>
            <button type="button" onclick="event.stopPropagation(); toggleTodoImportant('${t.id}')" class="text-base px-1.5 ${t.important ? 'text-amber-400' : 'text-slate-600'}" title="Mark Important">${t.important ? '★' : '☆'}</button>
        </div>
    `;
    return div;
};

// Save Reminder Time when adding a new To-Do task
document.getElementById('todo-add-submit-btn')?.addEventListener('click', () => {
    const remInp = document.getElementById('todo-new-rem-time');
    if (remInp && remInp.value && todos[0]) {
        todos[0].reminderTime = remInp.value;
        remInp.value = '';
        saveTodos();
        renderTodos();
    }
});

// Auto-Sync any Live Protocol Block insertion to Microsoft To-Do!
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

document.getElementById('confirm-live-insert-btn')?.addEventListener('click', () => {
    setTimeout(() => {
        const lastBlk = schedule[schedule.length - 1];
        if (lastBlk && !lastBlk.linkedTodoId && lastBlk.type === 'work') {
            window.ensureProtocolBlockSyncedToTodo(lastBlk);
            renderSchedule();
        }
    }, 60);
});

document.getElementById('load-day-btn')?.addEventListener('click', () => {
    setTimeout(() => {
        schedule.forEach(blk => {
            if (blk.type === 'work' && !blk.linkedTodoId) window.ensureProtocolBlockSyncedToTodo(blk);
        });
        renderSchedule();
    }, 80);
});

// Hook completeSession() so finishing a Timer / Reverse Count-Up session saves exact Used + Overtime duration into To-Do & Vault!
const origCompleteSession = window.completeSession;
window.completeSession = function() {
    const cur = schedule[currentStepIndex];
    const today = getLocalTodayString();
    if (cur && cur.type === 'work') {
        const plannedMins = Math.max(1, Math.round((cur.duration || 2700) / 60));
        let overtimeMins = 0;
        let usedMins = plannedMins;

        if (window.isPureCountUpMode) {
            usedMins = Math.max(1, Math.ceil(window.pureCountUpSeconds / 60));
            overtimeMins = Math.max(0, usedMins - plannedMins);
            window.isPureCountUpMode = false;
            window.pureCountUpSeconds = 0;
        } else if (isOvertime) {
            overtimeMins = Math.max(1, Math.ceil(timeLeft / 60));
            usedMins = plannedMins + overtimeMins;
            window.recordOvertimeToStatsLedger(overtimeMins);
        } else if (timeLeft > 0 && timeLeft < cur.duration) {
            usedMins = Math.max(1, Math.round((cur.duration - timeLeft) / 60));
        }

        cur.usedDurationMins = usedMins;
        cur.overtimeMins = overtimeMins;

        if (!cur.linkedTodoId) window.ensureProtocolBlockSyncedToTodo(cur);

        if (cur.linkedTodoId) {
            const t = todos.find(x => String(x.id) === String(cur.linkedTodoId));
            if (t) {
                t.completed = true;
                t.completedDate = today;
                t.usedDurationMins = usedMins;
                t.plannedDurationMins = plannedMins;
                t.overtimeMins = overtimeMins;
                saveTodos();
                renderTodos();
            }
        }
        if (cur.linkedVaultId) {
            const vTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
            const vt = vTasks.find(x => String(x.id) === String(cur.linkedVaultId));
            if (vt) {
                vt.completed = true;
                vt.completedDate = today;
                vt.usedDurationMins = usedMins;
                vt.plannedDurationMins = plannedMins;
                vt.overtimeMins = overtimeMins;
                safeSet('pages_pomodoro_tasks_v8', JSON.stringify(vTasks));
                renderTasks(activeTaskTab);
            }
        }
    }
    window.overtimeExtensionMins = 0;
    window.lastOvertimeWarnStage = 0;
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop();
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');
    if (origCompleteSession) origCompleteSession();
    renderStats();
    if (window.renderOmniBentoStrip) window.renderOmniBentoStrip();
};

/* =========================================================================
   4. 3-STAGE ESCALATING OVERTIME GUARDRAIL & PURE COUNT-UP STOPWATCH MODE
   ========================================================================= */
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
    window.timeLeft = 0;
    window.targetEndTime = Date.now();
    document.getElementById('complete-main-btn')?.classList.remove('hidden');
    switchPage('page-timer');
    startTimer();
    showToast("⏱️ Count-Up Stopwatch Started! All time will save to To-Do & Stats.");
};

// Monitor Overtime Every Second for 3-Stage Escalating Guardrail (+5m Soft Warning, +10m Critical Siren)
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
        if (window.sendDesktopNotification) {
            window.sendDesktopNotification(`⚠️ +${overMins}m Overtime Warning`, `You are ${overMins} mins over assigned time on "${curSess.title}".`, 'overtime-soft');
        }
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
    if (window.sendDesktopNotification) {
        window.sendDesktopNotification(`🚨 CRITICAL OVERTIME (+${overMins}m)`, `Stop cannibalizing your next schedule block! Complete "${sessObj.title}" now.`, 'overtime-crit', true);
    }

    const plannedMins = Math.max(1, Math.round((sessObj.duration || 2700) / 60));
    modal.innerHTML = `
        <div class="bg-slate-950/95 border-2 border-red-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-4">
            <span class="text-5xl animate-bounce">🚨</span>
            <div>
                <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">CRITICAL SCHEDULE DRIFT ALARM (+${overMins}m EXTRA)</span>
                <h3 class="text-lg font-extrabold text-white mt-2">${escapeHtml(sessObj.title)}</h3>
                <p class="text-xs text-amber-200 mt-1">Assigned: <b>${plannedMins}m</b> • Extra Count-Up: <b class="text-red-400">+${overMins}m</b> (Total: ${plannedMins + overMins}m)</p>
                <p class="text-[11px] text-slate-400 mt-1">Overdoing this task is eating into your next Live Protocol block & Salah schedule!</p>
            </div>
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.completeSession()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg">
                    ✅ Complete Session & Save ${plannedMins + overMins}m to To-Do Now
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
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop();
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');
    showToast(`⏳ Authorized +${extraM}m overtime extension.`);
};

/* =========================================================================
   5. STUDY VAULT CARDS, MCQ & MATRIX RENDERING
   ========================================================================= */
window.loadMCQInputs = function() {
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const today = getLocalTodayString();
    const d = (mcqs[today] && mcqs[today][activeTaskSubj]) ? mcqs[today][activeTaskSubj] : { t: 0, a: 0, c: 0 };
    document.getElementById('mcq-target').value = d.t || '';
    document.getElementById('mcq-attempted').value = d.a || '';
    document.getElementById('mcq-correct').value = d.c || '';
    updateMCQMath();
};
function updateMCQMath() {
    const t = parseInt(document.getElementById('mcq-target')?.value) || 0;
    const a = parseInt(document.getElementById('mcq-attempted')?.value) || 0;
    const c = parseInt(document.getElementById('mcq-correct')?.value) || 0;
    document.getElementById('mcq-display-incorrect').textContent = Math.max(0, a - c);
    document.getElementById('mcq-display-left').textContent = Math.max(0, t - a);
}
['mcq-target', 'mcq-attempted', 'mcq-correct'].forEach(id => document.getElementById(id)?.addEventListener('input', updateMCQMath));
document.getElementById('save-mcq-btn')?.addEventListener('click', () => {
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const today = getLocalTodayString();
    if (!mcqs[today]) mcqs[today] = {};
    mcqs[today][activeTaskSubj] = {
        t: parseInt(document.getElementById('mcq-target').value) || 0,
        a: parseInt(document.getElementById('mcq-attempted').value) || 0,
        c: parseInt(document.getElementById('mcq-correct').value) || 0
    };
    safeSet('pages_pomodoro_mcq_v8', JSON.stringify(mcqs));
    showToast("MCQ Stats Saved");
    broadcastToCloud();
    renderStats();
    PomoEventBus.emit('vault:updated');
});

function createVaultItemCard(task) {
    const div = document.createElement('div');
    div.className = `flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-slate-950/60 border-slate-900 opacity-65' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`;
    div.onclick = () => window.openProtocolRunModal && window.openProtocolRunModal('vault', task.id);

    const bookBadge = task.bookId
        ? `<button type="button" onclick="event.stopPropagation(); window.openBookAtPage && window.openBookAtPage('${task.bookId}', ${task.page || 1})" class="bg-blue-600/25 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0">📖 p.${task.page || 1}</button>`
        : '';

    const usedBadge = task.usedDurationMins
        ? `<span class="text-[10px] ${task.overtimeMins > 0 ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'} border px-1.5 py-0.5 rounded font-mono font-bold">⏱️ Used: ${task.usedDurationMins}m${task.overtimeMins > 0 ? ` (+${task.overtimeMins}m Extra)` : ''}</span>`
        : `<span class="text-[10px] text-blue-400 font-mono">⏱️ ${task.durationMins || 45}m</span>`;

    div.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <button type="button" onclick="event.stopPropagation(); toggleTask('${task.id}')" class="todo-check-circle ${task.completed ? 'checked' : ''}">${task.completed ? '✓' : ''}</button>
            <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}">${escapeHtml(task.title)}</p>
                <div class="flex flex-wrap items-center gap-2 mt-0.5">
                    <span class="text-[10px] text-purple-400 font-bold uppercase">${escapeHtml(task.subject)} • ${escapeHtml(task.type)}</span>
                    ${usedBadge}
                    ${task.dueDate ? `<span class="text-[10px] text-emerald-400 font-mono">📅 Due ${formatDDMMYYYY(task.dueDate)}</span>` : ''}
                    ${task.note ? `<span class="text-[10px] text-slate-400 truncate max-w-[180px]">📝 ${escapeHtml(task.note)}</span>` : ''}
                    ${bookBadge}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="event.stopPropagation(); window.openProtocolRunModal && window.openProtocolRunModal('vault', '${task.id}')" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 shadow" title="Add Duration to Live Protocol or Run Timer Now">
                <span>⚡</span><span>Protocol / Run</span>
            </button>
            <button type="button" onclick="event.stopPropagation(); deleteTask('${task.id}')" class="text-red-400 hover:text-red-300 px-1.5 py-1 text-xs" title="Delete Vault Item">🗑️</button>
        </div>
    `;
    return div;
}

window.renderTasks = function(tab) {
    upgradeVaultAddFormUI();
    const container = document.getElementById('vault-list-container');
    if (!container) return;
    if (tab === 'matrix') {
        container.innerHTML = '';
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
        const today = getLocalTodayString();
        extConfig.customSubjects.forEach(subj => {
            const subT = tasks.filter(t => t.subject === subj);
            const bTot = subT.filter(t => t.type === 'backlog').length;
            const bDone = subT.filter(t => t.type === 'backlog' && t.completed).length;
            const rTot = subT.filter(t => t.type === 'revision').length;
            const rDone = subT.filter(t => t.type === 'revision' && t.completed).length;
            const mData = (mcqs[today] && mcqs[today][subj]) ? mcqs[today][subj] : { t: 0, a: 0, c: 0 };
            const mInc = Math.max(0, mData.a - mData.c);
            container.innerHTML += `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-2"><h4 class="text-xs font-bold text-white mb-2 uppercase tracking-widest">${escapeHtml(subj)}</h4><div class="grid grid-cols-2 gap-2 text-center mb-2"><div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Backlogs Left</p><p class="text-sm font-bold text-purple-300">${bTot - bDone} <span class="text-[10px] text-emerald-400">(${bDone} ✓)</span></p></div><div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Revision Left</p><p class="text-sm font-bold text-amber-300">${rTot - rDone} <span class="text-[10px] text-emerald-400">(${rDone} ✓)</span></p></div></div><div class="bg-slate-950 rounded-lg p-2 text-center flex justify-between"><div class="text-[8px] text-slate-400 uppercase">Tar<br><b class="text-xs text-white">${mData.t}</b></div><div class="text-[8px] text-slate-400 uppercase">Att<br><b class="text-xs text-blue-400">${mData.a}</b></div><div class="text-[8px] text-slate-400 uppercase">Cor<br><b class="text-xs text-emerald-400">${mData.c}</b></div><div class="text-[8px] text-slate-400 uppercase">Wr<br><b class="text-xs text-tomato">${mInc}</b></div></div></div>`;
        });
        return;
    }
    if (tab === 'mcq') return;

    container.innerHTML = '';
    const allSubjTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(t => t.type === tab && t.subject === activeTaskSubj);
    const activeTasks = allSubjTasks.filter(t => !t.completed);
    const completedTasks = allSubjTasks.filter(t => t.completed);

    if (!activeTasks.length && !completedTasks.length) {
        container.innerHTML = `<p class="text-slate-500 italic p-4 text-xs text-center bg-slate-900/40 rounded-xl border border-slate-800/50">No ${escapeHtml(tab)} items in ${escapeHtml(activeTaskSubj)}. Add one above or send from Book Reader!</p>`;
        return;
    }

    const activeListDiv = document.createElement('div');
    activeListDiv.className = "flex flex-col gap-2";
    if (!activeTasks.length) {
        activeListDiv.innerHTML = `<p class="text-xs text-emerald-400/80 italic text-center p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/30">🎉 All ${escapeHtml(activeTaskSubj)} ${escapeHtml(tab)} items completed!</p>`;
    } else {
        activeTasks.forEach(task => activeListDiv.appendChild(createVaultItemCard(task)));
    }
    container.appendChild(activeListDiv);

    if (completedTasks.length > 0) {
        const compWrapper = document.createElement('div');
        compWrapper.className = "flex flex-col mt-3 pt-2 border-t border-slate-800/80";
        const toggleBtn = document.createElement('button');
        toggleBtn.type = "button";
        toggleBtn.className = "flex items-center gap-2 text-xs font-bold text-slate-400 py-2 px-1";
        toggleBtn.innerHTML = `<span>${window.showCompletedVaultItems ? '▼' : '▶'}</span><span>Completed ${escapeHtml(activeTaskSubj)} (${escapeHtml(tab.toUpperCase())})</span><span class="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-mono">${completedTasks.length}</span>`;
        toggleBtn.onclick = () => {
            window.showCompletedVaultItems = !window.showCompletedVaultItems;
            renderTasks(activeTaskTab);
        };
        compWrapper.appendChild(toggleBtn);

        if (window.showCompletedVaultItems) {
            const compListDiv = document.createElement('div');
            compListDiv.className = "flex flex-col gap-2 mt-1";
            completedTasks.forEach(task => compListDiv.appendChild(createVaultItemCard(task)));
            compWrapper.appendChild(compListDiv);
        }
        container.appendChild(compWrapper);
    }
};

/* =========================================================================
   6. ADVANCED ANALYTICAL PROFILE STATS STUDIO (INSIDE #prof-stats)
   ========================================================================= */
const origRenderStats = window.renderStats;
window.renderStats = function() {
    if (origRenderStats) origRenderStats();
    const profStatsPanel = document.getElementById('prof-stats');
    if (!profStatsPanel) return;

    let advBox = document.getElementById('advanced-analytics-prof-box');
    if (!advBox) {
        advBox = document.createElement('div');
        advBox.id = 'advanced-analytics-prof-box';
        advBox.className = "flex flex-col gap-3 shrink-0";
        const tgCard = document.getElementById('save-tg-btn')?.closest('div.bg-slate-900');
        if (tgCard) profStatsPanel.insertBefore(advBox, tgCard);
        else profStatsPanel.appendChild(advBox);
    }

    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const todayRec = stats.history[today] || { mins: 0, sessions: 0, overtimeMins: 0 };
    const deenMins = Math.round(getTodayDeenMinutes());
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));

    // Calculate Extra Overtime Mins from today's completed To-Do & Stats
    let extraOvertimeToday = todayRec.overtimeMins || 0;
    let totalPlannedToday = 0;
    todos.forEach(t => {
        if (t.completed && t.completedDate === today) {
            totalPlannedToday += (t.plannedDurationMins || t.durationMins || 0);
        }
    });
    const focusEffPct = Math.min(100, Math.round(((todayRec.mins + deenMins) / Math.max(60, (extConfig.studyTargetHours + extConfig.deenTargetHours) * 60)) * 100));

    // Calculate MCQ Accuracy across all subjects today
    let mcqAtt = 0, mcqCor = 0;
    Object.values(mcqs[today] || {}).forEach(m => { mcqAtt += (m.a || 0); mcqCor += (m.c || 0); });
    const mcqAccPct = mcqAtt > 0 ? Math.round((mcqCor / mcqAtt) * 100) : 0;

    const todoCompCount = todos.filter(t => t.completed).length;
    const todoTotCount = Math.max(1, todos.length);
    const vaultCompCount = vaultTasks.filter(v => v.completed).length;
    const vaultTotCount = Math.max(1, vaultTasks.length);

    advBox.innerHTML = `
        <div class="bg-slate-900 border border-blue-500/30 rounded-2xl p-3.5 flex flex-col gap-3 shadow-lg">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                    <span class="text-[9px] font-extrabold uppercase tracking-widest text-cyan-400">📊 Deep Analytical Intelligence</span>
                    <h3 class="text-xs font-extrabold text-white mt-0.5">Timer • To-Do • Study Vault • Overtime Telemetry</h3>
                </div>
                <button type="button" onclick="window.openTodoAnalyticsModal('4w')" class="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow">📈 6M Line Graph</button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-2">
                    <p class="text-[9px] font-bold uppercase text-slate-400">Target Efficiency</p>
                    <p class="text-base font-mono font-extrabold text-emerald-400 mt-0.5">${focusEffPct}%</p>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-2">
                    <p class="text-[9px] font-bold uppercase text-rose-400">🔥 Extra Count-Up</p>
                    <p class="text-base font-mono font-extrabold text-rose-300 mt-0.5">+${extraOvertimeToday}m</p>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-2">
                    <p class="text-[9px] font-bold uppercase text-purple-400">📚 Vault Mastery</p>
                    <p class="text-base font-mono font-extrabold text-purple-300 mt-0.5">${vaultCompCount}/${vaultTasks.length}</p>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-2">
                    <p class="text-[9px] font-bold uppercase text-amber-400">🎯 MCQ Accuracy</p>
                    <p class="text-base font-mono font-extrabold text-amber-300 mt-0.5">${mcqAccPct}% <span class="text-[9px] text-slate-500">(${mcqCor}/${mcqAtt})</span></p>
                </div>
            </div>

            <!-- Subject & Pillar Progress Breakdown -->
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div class="flex justify-between text-[10px] font-bold">
                    <span class="text-blue-400">☑️ To-Do Completion Rate (${todoCompCount}/${todos.length})</span>
                    <span class="font-mono text-white">${Math.round((todoCompCount / todoTotCount) * 100)}%</span>
                </div>
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div class="h-full bg-blue-500 rounded-full" style="width:${Math.min(100, Math.round((todoCompCount / todoTotCount) * 100))}%"></div></div>

                <div class="flex justify-between text-[10px] font-bold mt-1">
                    <span class="text-purple-400">📚 Study Vault Backlog & Revision Cleared</span>
                    <span class="font-mono text-white">${Math.round((vaultCompCount / vaultTotCount) * 100)}%</span>
                </div>
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div class="h-full bg-purple-500 rounded-full" style="width:${Math.min(100, Math.round((vaultCompCount / vaultTotCount) * 100))}%"></div></div>
            </div>
        </div>
    `;
};

/* =========================================================================
   7. INTERACTIVE 4-WIDGET "OMNI-COMMAND BENTO STRIP" ON HOME TIMER PAGE
      (Works on Desktop + Smartphone, Auto-Hides in Stealth / Dim Mode!)
   ========================================================================= */
window.renderOmniBentoStrip = function() {
    const rightCol = document.querySelector('#page-timer .cockpit-right');
    if (!rightCol) return;

    let strip = document.getElementById('home-omni-bento-strip');
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'home-omni-bento-strip';
        strip.className = "w-full grid grid-cols-2 gap-2";
        rightCol.appendChild(strip);
    }

    const rpg = calculateLifetimeRPGStats();
    const curSess = schedule[currentStepIndex];
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const unfinVault = vaultTasks.filter(v => !v.completed);
    const activeAlarmsCount = (window.pomoAlarms || []).filter(a => a.enabled).length;

    strip.innerHTML = `
        <!-- Widget 1: Active Task & Count-Up Stopwatch -->
        <div class="bg-slate-900/90 border border-blue-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-blue-400">⏱️ Active Protocol</span>
                <button type="button" onclick="window.startPureCountUpStopwatch()" class="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold" title="Start Pure Count-Up Stopwatch">+Count-Up</button>
            </div>
            <p class="text-[11px] font-extrabold text-white truncate">${escapeHtml(curSess ? curSess.title : 'No Active Session')}</p>
            <div class="flex gap-1">
                <button type="button" onclick="window.completeSession()" class="flex-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 py-1 rounded-lg text-[9px] font-extrabold">✓ Complete & Log</button>
                <button type="button" onclick="switchPage('page-todo')" class="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[9px] font-bold">☑️ To-Do</button>
            </div>
        </div>

        <!-- Widget 2: Interactive RPG Level & World Ranker -->
        <div onclick="switchPage('page-vault'); activateVaultSubview('rpg');" class="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1 cursor-pointer hover:border-amber-400 shadow">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-400">${rpg.rankObj.badge} Lv.${rpg.level} Ranker</span>
                <span class="text-[9px] font-mono font-bold text-emerald-400">${rpg.levelPct}%</span>
            </div>
            <p class="text-[11px] font-extrabold text-white truncate">${escapeHtml(rpg.rankObj.title)}</p>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" style="width:${rpg.levelPct}%"></div>
            </div>
        </div>

        <!-- Widget 3: Study Vault Quick-Runner -->
        <div class="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-purple-400">📚 Study Vault</span>
                <span class="text-[9px] font-mono font-bold text-purple-300">${unfinVault.length} Left</span>
            </div>
            <p class="text-[11px] font-bold text-slate-200 truncate">${escapeHtml(unfinVault[0]?.title || 'All Vault Chapters Done!')}</p>
            <div class="flex gap-1">
                ${unfinVault[0] ? `<button type="button" onclick="window.openProtocolRunModal('vault', '${unfinVault[0].id}')" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-1 rounded-lg text-[9px] font-extrabold">⚡ Run Top Vault</button>` : ''}
                <button type="button" onclick="switchPage('page-vault'); activateVaultSubview('neet');" class="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[9px] font-bold">Open</button>
            </div>
        </div>

        <!-- Widget 4: Mission Alarms & 6M Analytics -->
        <div class="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-rose-400">⏰ Alarmy & Stats</span>
                <span class="text-[9px] font-mono font-bold text-rose-300">${activeAlarmsCount} ON</span>
            </div>
            <div class="flex gap-1 mt-0.5">
                <button type="button" onclick="window.openAlarmyStudioModal && window.openAlarmyStudioModal()" class="flex-1 bg-rose-600/25 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 py-1.5 rounded-lg text-[9px] font-extrabold">⏰ Mission Alarms</button>
                <button type="button" onclick="window.openTodoAnalyticsModal('4w')" class="flex-1 bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 py-1.5 rounded-lg text-[9px] font-extrabold">📈 6M Graph</button>
            </div>
        </div>
    `;
};

/* =========================================================================
   8. PRO-GAMER RPG LEVELING, WORLD RANKER & PRO DEVELOPER TACTICAL ENGINE
   ========================================================================= */
const RPG_RANKS = [
    { minLv: 0, title: 'Unranked Novice', badge: '🪨', color: 'text-slate-400' },
    { minLv: 2, title: 'Bronze Initiate', badge: '🥉', color: 'text-amber-500' },
    { minLv: 5, title: 'Silver Seeker', badge: '🥈', color: 'text-slate-200' },
    { minLv: 10, title: 'Gold Vanguard', badge: '🥇', color: 'text-yellow-400' },
    { minLv: 18, title: 'Platinum Scholar', badge: '💠', color: 'text-cyan-300' },
    { minLv: 28, title: 'Emerald Tactician', badge: '❇️', color: 'text-emerald-400' },
    { minLv: 40, title: 'Diamond Master', badge: '💎', color: 'text-blue-400' },
    { minLv: 55, title: 'Crimson Warlord', badge: '🔥', color: 'text-red-400' },
    { minLv: 75, title: 'Immortal Grandmaster', badge: '👑', color: 'text-purple-400' },
    { minLv: 100, title: 'Apex Sovereign (∞)', badge: '🌌', color: 'text-amber-300' }
];

function getDayMetrics(isoDate, preStats = null, preRLog = null, preVault = null) {
    const stats = preStats || JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const rLog = preRLog || JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const vaultTasks = preVault || JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));

    const studyMins = stats.history?.[isoDate]?.mins || 0;
    const sessions = stats.history?.[isoDate]?.sessions || 0;
    const deenMins = deenHistory[isoDate] || 0;
    const sMap = salahHistory[isoDate] || {};
    const salahCount = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].filter(p => sMap[p]).length;
    const readMins = rLog[isoDate]?.totalMins || 0;

    const dayTodosDone = todos.filter(t => t.completed && (t.completedDate === isoDate || (!t.completedDate && t.myDayDate === isoDate))).length;
    const dayVaultDone = vaultTasks.filter(vt => vt.completed && vt.completedDate === isoDate).length;

    const salahXP = (salahCount * 100) + (salahCount === 5 ? 250 : 0);
    const totalXP = Math.round((studyMins * 10) + (deenMins * 15) + salahXP + (readMins * 12) + (sessions * 40) + (dayTodosDone * 60) + (dayVaultDone * 90));
    return { studyMins, deenMins, salahCount, readMins, sessions, dayTodosDone, dayVaultDone, totalXP };
}

window.calculateLifetimeRPGStats = function() {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const rLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const books = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));

    const allDates = new Set([
        ...Object.keys(stats.history || {}),
        ...Object.keys(deenHistory || {}),
        ...Object.keys(salahHistory || {}),
        ...Object.keys(rLog),
        getLocalTodayString()
    ]);

    let lifetimeXP = 0, activeDaysCount = 0;
    allDates.forEach(d => {
        const m = getDayMetrics(d, stats, rLog, vaultTasks);
        if (m.totalXP > 0) activeDaysCount++;
        lifetimeXP += m.totalXP;
    });

    const completedTodos = todos.filter(t => t.completed).length;
    const completedVault = vaultTasks.filter(t => t.completed).length;
    const pendingVault = vaultTasks.filter(t => !t.completed).length;
    let totalAnnotations = 0, totalPagesRead = 0;
    books.forEach(b => {
        totalAnnotations += (b.annotations || []).length;
        totalPagesRead += Math.max(0, (b.currentPage || 1) - 1);
    });

    lifetimeXP += (completedTodos * 55) + (completedVault * 95) + (totalAnnotations * 25) + (totalPagesRead * 15);

    const level = Math.floor(Math.sqrt(lifetimeXP / 120));
    const currentLevelFloorXP = Math.pow(level, 2) * 120;
    const nextLevelCeilingXP = Math.pow(level + 1, 2) * 120;
    const xpIntoLevel = lifetimeXP - currentLevelFloorXP;
    const xpNeededForNext = Math.max(1, nextLevelCeilingXP - currentLevelFloorXP);
    const levelPct = Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100));

    let rankObj = RPG_RANKS[0];
    for (const r of RPG_RANKS) { if (level >= r.minLv) rankObj = r; }

    const todayIso = getLocalTodayString();
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yestIso = getLocalTodayString(yestDate);

    const todayM = getDayMetrics(todayIso, stats, rLog, vaultTasks);
    const yestM = getDayMetrics(yestIso, stats, rLog, vaultTasks);
    const xpDelta = todayM.totalXP - yestM.totalXP;
    const pctBetter = yestM.totalXP > 0
        ? Math.round(((todayM.totalXP - yestM.totalXP) / yestM.totalXP) * 100)
        : (todayM.totalXP > 0 ? 100 : 0);

    const disciplineScore = Math.min(99.9, Math.round(((todayM.studyMins / 480) * 55 + (todayM.salahCount / 5) * 45) * 10) / 10);
    const consistencyScore = Math.min(99.9, Math.round((Math.min(1, activeDaysCount / 30) * 60 + (todayM.totalXP >= yestM.totalXP && todayM.totalXP > 0 ? 40 : 20)) * 10) / 10);
    const executionScore = Math.min(99.9, Math.round((Math.min(1, (completedTodos + completedVault * 2 + totalPagesRead) / 50) * 100) * 10) / 10);

    return {
        lifetimeXP, level, xpIntoLevel, xpNeededForNext, levelPct, rankObj,
        todayM, yestM, xpDelta, pctBetter,
        disciplineScore, consistencyScore, readingScore: executionScore,
        totalPagesRead, totalAnnotations, activeDaysCount,
        completedTodos, completedVault, pendingVault
    };
};

function generateProDeveloperTacticalSuggestions(rpg) {
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const unfinVault = vaultTasks.filter(t => !t.completed);
    const unfinImpTodos = todos.filter(t => !t.completed && t.important);
    const unfinTodayTodos = todos.filter(t => !t.completed && t.myDayDate === getLocalTodayString());
    const tips = [];

    if (unfinVault.length > 0) {
        const topV = unfinVault[0];
        tips.push({
            badge: `📚 VAULT (${topV.subject})`,
            text: `You have ${unfinVault.length} active Vault chapters. Launch "${topV.title}" into Live Protocol now for +95 XP!`,
            btnLabel: `⚡ Run "${topV.title.slice(0, 18)}"`,
            action: `window.openProtocolRunModal('vault', '${topV.id}')`
        });
    }
    if (unfinImpTodos.length > 0) {
        const topT = unfinImpTodos[0];
        tips.push({
            badge: `⭐ PRIORITY TO-DO`,
            text: `High-priority task "${topT.title}" is pending. Schedule & run it on the countdown timer!`,
            btnLabel: `▶️ Run Task`,
            action: `window.openProtocolRunModal('todo', '${topT.id}')`
        });
    } else if (unfinTodayTodos.length > 0) {
        const topT = unfinTodayTodos[0];
        tips.push({
            badge: `☀️ MY DAY TASK`,
            text: `${unfinTodayTodos.length} task(s) left in My Day. Start "${topT.title}" now to boost your 4-Week Progression curve!`,
            btnLabel: `⚡ Launch Timer`,
            action: `window.openProtocolRunModal('todo', '${topT.id}')`
        });
    }
    if (rpg.todayM.salahCount < 5) {
        tips.push({
            badge: `🕋 SALAH BONUS`,
            text: `Complete ${5 - rpg.todayM.salahCount} more Salah today to unlock the +250 XP Perfect 5/5 Imaan Bonus!`,
            btnLabel: `🕌 Log Salah`,
            action: `switchPage('page-timer')`
        });
    }
    tips.push({
        badge: `📊 6M ANALYTICS`,
        text: `Inspect your 1-Week, 4-Week vs. Earlier 4-Week, and 6-Month completion Line Graph.`,
        btnLabel: `📈 Open Line Graph`,
        action: `window.openTodoAnalyticsModal('4w')`
    });
    return tips.slice(0, 3);
}

function updateTopBarRpgBadge() {
    const rpg = calculateLifetimeRPGStats();
    const iconEl = document.getElementById('top-rpg-badge-icon');
    const lvEl = document.getElementById('top-rpg-lv-text');
    if (iconEl) iconEl.textContent = rpg.rankObj.badge;
    if (lvEl) lvEl.textContent = `Lv.${rpg.level}`;
    if (window.renderOmniBentoStrip) window.renderOmniBentoStrip();
}

window.renderRpgArena = function() {
    updateTopBarRpgBadge();
    const rpgView = document.getElementById('rpg-arena-subview');
    if (!rpgView) return;
    const rpg = calculateLifetimeRPGStats();
    const prog = window.computeTodoAndVaultProgression ? window.computeTodoAndVaultProgression() : null;
    const tacticalTips = generateProDeveloperTacticalSuggestions(rpg);

    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const rLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = getLocalTodayString(d);
        const m = getDayMetrics(iso, stats, rLog, vaultTasks);
        last7Days.push({
            label: i === 0 ? 'Today' : (i === 1 ? 'Yest' : d.toLocaleDateString('en-US', { weekday: 'short' })),
            xp: m.totalXP
        });
    }
    const max7XP = Math.max(500, ...last7Days.map(x => x.xp));
    const deltaPositive = rpg.xpDelta >= 0;
    const deltaBannerColor = deltaPositive
        ? 'from-emerald-950/90 to-slate-900 border-emerald-500/50 text-emerald-300'
        : 'from-amber-950/90 to-slate-900 border-amber-500/50 text-amber-300';

    const quests = [
        { title: '🕋 Pray 5/5 Salah on Time', done: rpg.todayM.salahCount >= 5, prog: `${rpg.todayM.salahCount}/5`, reward: '+750 XP' },
        { title: '☑️ Complete 3 To-Do / Study Vault Tasks', done: (rpg.todayM.dayTodosDone + rpg.todayM.dayVaultDone) >= 3, prog: `${rpg.todayM.dayTodosDone + rpg.todayM.dayVaultDone}/3`, reward: '+350 XP' },
        { title: '🧠 Complete 4.0h Deep Study on Timer', done: rpg.todayM.studyMins >= 240, prog: `${(rpg.todayM.studyMins / 60).toFixed(1)}/4.0h`, reward: '+400 XP' },
        { title: '⚔️ Beat Yesterday\'s Total XP', done: rpg.todayM.totalXP > rpg.yestM.totalXP && rpg.todayM.totalXP > 0, prog: `${rpg.todayM.totalXP}/${Math.max(100, rpg.yestM.totalXP)} XP`, reward: '+300 XP' }
    ];

    rpgView.innerHTML = `
        <div class="rpg-card-glow rounded-3xl p-5 flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-blue-500 flex flex-col items-center justify-center shadow-lg">
                        <span class="text-2xl leading-none">${rpg.rankObj.badge}</span>
                        <span class="text-[10px] font-mono font-extrabold text-blue-400 mt-1">LV.${rpg.level}</span>
                    </div>
                    <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">Integrated Timer • To-Do • Study Vault Ranker</span>
                        <h3 class="text-lg sm:text-xl font-extrabold ${rpg.rankObj.color} mt-1">${rpg.rankObj.title}</h3>
                        <p class="text-xs text-slate-400 font-mono">Lifetime: <b class="text-white">${rpg.lifetimeXP.toLocaleString()} XP</b> • ☑️ <b class="text-blue-400">${rpg.completedTodos} To-Do</b> • 📚 <b class="text-purple-400">${rpg.completedVault} Vault</b></p>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1.5">
                    <div class="text-right bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl">
                        <p class="text-[10px] font-bold uppercase text-slate-400">Global Standing</p>
                        <p class="text-base font-mono font-extrabold text-amber-400">Top ${(100 - Math.min(99.8, (rpg.disciplineScore + rpg.consistencyScore + rpg.readingScore) / 3)).toFixed(1)}% Worldwide</p>
                    </div>
                    <button type="button" onclick="window.openTodoAnalyticsModal('4w')" class="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow">📈 Open 1W / 4W / 6M Line Graph</button>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-xs font-mono mb-1">
                    <span class="text-slate-300 font-bold">Level ${rpg.level} ➔ Level ${rpg.level + 1}</span>
                    <span class="text-blue-400 font-extrabold">${rpg.xpIntoLevel.toLocaleString()} / ${rpg.xpNeededForNext.toLocaleString()} XP (${rpg.levelPct}%)</span>
                </div>
                <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div class="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500" style="width: ${rpg.levelPct}%"></div>
                </div>
            </div>
        </div>

        <!-- PRO DEVELOPER TACTICAL ENGINE (1-CLICK ACTION SUGGESTIONS) -->
        <div class="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">🧠 Pro Developer Tactical Engine — Next Best Actions</span>
                ${prog ? `<span class="text-[10px] font-mono text-emerald-400">4W Velocity: ${prog.week4.totalItems} items (${prog.delta4W >= 0 ? '+' : ''}${prog.pctGrowth4W}%)</span>` : ''}
            </div>
            <div class="grid grid-cols-1 gap-2">
                ${tacticalTips.map(t => `
                    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div class="min-w-0 flex-1">
                            <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">${t.badge}</span>
                            <p class="text-xs text-slate-200 font-medium mt-1">${escapeHtml(t.text)}</p>
                        </div>
                        <button type="button" onclick="${t.action}" class="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-extrabold px-3 py-2 rounded-xl shrink-0 shadow active:scale-95">${t.btnLabel}</button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="bg-gradient-to-r ${deltaBannerColor} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
                <span class="text-[10px] font-extrabold uppercase tracking-widest opacity-80">⚡ Day-by-Day Progression (Today vs. Yesterday)</span>
                <h4 class="text-sm sm:text-base font-extrabold text-white mt-0.5">
                    ${deltaPositive
                        ? `🔥 You are +${rpg.pctBetter}% more productive than Yesterday (+${rpg.xpDelta} XP ahead)!`
                        : `⚔️ ${Math.abs(rpg.xpDelta)} XP needed to beat Yesterday's score (${Math.ceil(Math.abs(rpg.xpDelta) / 10)}m of Study to overtake!)`}
                </h4>
                <p class="text-xs text-slate-300 mt-1 font-mono">
                    Today: <b>${rpg.todayM.totalXP} XP</b> (${(rpg.todayM.studyMins/60).toFixed(1)}h Study • ${rpg.todayM.dayTodosDone} To-Do • ${rpg.todayM.dayVaultDone} Vault • ${rpg.todayM.salahCount}/5 Salah)
                    &nbsp;|&nbsp; Yesterday: <b>${rpg.yestM.totalXP} XP</b>
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div class="flex justify-between items-center mb-1.5"><span class="text-xs font-extrabold text-blue-400">⚔️ World Discipline</span><span class="text-xs font-mono font-extrabold text-white">${rpg.disciplineScore}%</span></div>
                <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800"><div class="h-full bg-blue-500 rounded-full" style="width:${rpg.disciplineScore}%"></div></div>
                <p class="text-[10px] text-slate-400 mt-1.5">Focus Hours + 5/5 Salah vs. Global Average</p>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div class="flex justify-between items-center mb-1.5"><span class="text-xs font-extrabold text-emerald-400">🔥 Consistency Index</span><span class="text-xs font-mono font-extrabold text-white">${rpg.consistencyScore}%</span></div>
                <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800"><div class="h-full bg-emerald-500 rounded-full" style="width:${rpg.consistencyScore}%"></div></div>
                <p class="text-[10px] text-slate-400 mt-1.5">Active Days (${rpg.activeDaysCount}d) & Daily Momentum</p>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div class="flex justify-between items-center mb-1.5"><span class="text-xs font-extrabold text-amber-400">📚 Vault & To-Do Mastery</span><span class="text-xs font-mono font-extrabold text-white">${rpg.readingScore}%</span></div>
                <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800"><div class="h-full bg-amber-500 rounded-full" style="width:${rpg.readingScore}%"></div></div>
                <p class="text-[10px] text-slate-400 mt-1.5">${rpg.completedVault} Vault Cleared • ${rpg.completedTodos} Tasks • ${rpg.totalPagesRead}p Read</p>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <span class="text-xs font-extrabold text-white uppercase tracking-wider mb-3">📊 7-Day XP Progression Curve</span>
                <div class="grid grid-cols-7 gap-2 items-end h-36 pt-4">
                    ${last7Days.map((d, idx) => {
                        const hPct = Math.max(8, Math.round((d.xp / max7XP) * 100));
                        const isToday = idx === 6;
                        return `<div class="flex flex-col items-center justify-end h-full gap-1"><span class="text-[9px] font-mono font-bold ${isToday ? 'text-emerald-400' : 'text-slate-400'}">${d.xp}</span><div class="w-full rounded-t-lg ${isToday ? 'bg-gradient-to-t from-emerald-600 to-teal-300' : 'bg-gradient-to-t from-blue-700 to-blue-400'}" style="height:${hPct}%"></div><span class="text-[10px] font-bold ${isToday ? 'text-white' : 'text-slate-400'}">${d.label}</span></div>`;
                    }).join('')}
                </div>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                <span class="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-1">🎯 Daily Boss Quests</span>
                ${quests.map(q => `<div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border ${q.done ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800'}"><div><p class="text-xs font-bold ${q.done ? 'text-emerald-300 line-through' : 'text-slate-200'}">${q.title}</p><span class="text-[10px] font-mono text-slate-400">Progress: ${q.prog}</span></div><span class="text-[10px] font-mono font-extrabold px-2 py-1 rounded-lg ${q.done ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-amber-400 border border-slate-800'}">${q.done ? '✓ CLAIMED' : q.reward}</span></div>`).join('')}
            </div>
        </div>
    `;
};

PomoEventBus.on('stats:updated', updateTopBarRpgBadge);
PomoEventBus.on('todos:updated', updateTopBarRpgBadge);
PomoEventBus.on('vault:updated', updateTopBarRpgBadge);
PomoEventBus.on('reader:updated', updateTopBarRpgBadge);
PomoEventBus.on('reading:minuteLogged', updateTopBarRpgBadge);
PomoEventBus.on('alarms:updated', updateTopBarRpgBadge);
PomoEventBus.on('hud:rendered', () => {
    if (window.renderOmniBentoStrip) window.renderOmniBentoStrip();
});

renderCompassView();
upgradeVaultAddFormUI();
renderCustomSubjectBar();
renderTasks(activeTaskTab);
renderTodos();
renderStats();
updateTopBarRpgBadge();
setTimeout(() => { if (window.renderOmniBentoStrip) window.renderOmniBentoStrip(); }, 300);
// ✅ END OF FILE (03-vault-rpg.js v9.0) — 100% UNCUT
