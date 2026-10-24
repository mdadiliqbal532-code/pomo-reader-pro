/* =========================================================================
   03-VAULT-RPG.JS — 3-TIER COMPASS, CUSTOM STUDY VAULT & RPG LEVELING ARENA
   ========================================================================= */

window.activateVaultSubview = function(mode) {
    const compBtn = document.getElementById('mode-compass-btn');
    const neetBtn = document.getElementById('mode-neet-vault-btn');
    const rpgBtn = document.getElementById('mode-rpg-rank-btn');
    const compView = document.getElementById('compass-subview');
    const neetView = document.getElementById('neet-vault-subview');
    const rpgView = document.getElementById('rpg-arena-subview');

    compBtn.className = "flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all";
    neetBtn.className = "flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all";
    if (rpgBtn) rpgBtn.className = "flex-1 bg-transparent text-amber-400 font-bold py-2 rounded-lg text-xs transition-all";

    compView?.classList.add('hidden');
    neetView?.classList.add('hidden');
    rpgView?.classList.add('hidden');

    if (mode === 'compass') {
        compBtn.className = "flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        compView?.classList.remove('hidden');
        renderCompassView();
    } else if (mode === 'rpg') {
        if (rpgBtn) rpgBtn.className = "flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        rpgView?.classList.remove('hidden');
        rpgView?.classList.add('flex');
        renderRpgArena();
    } else {
        neetBtn.className = "flex-1 bg-purple-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        neetView?.classList.remove('hidden');
        neetView?.classList.add('flex');
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

let modalContextMode = 'main-goal', modalEditIndex = -1;
let pDay = 15, pMonth = 5, pYear = 2027, pDaysBuffer = "210", numpadFreshOpen = true;

function maxDaysInMonth(m, y) { return new Date(y, m, 0).getDate(); }

function refreshGoalModalUI() {
    const maxD = maxDaysInMonth(pMonth, pYear);
    if (pDay > maxD) pDay = maxD;
    const iso = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
    const daysLeft = Math.max(0, calcDaysRemaining(iso));
    document.getElementById('picker-dd-val').textContent = String(pDay).padStart(2, '0');
    document.getElementById('picker-mm-val').textContent = String(pMonth).padStart(2, '0');
    document.getElementById('picker-yy-val').textContent = String(pYear);
    document.getElementById('modal-live-date-badge').textContent = `${String(pDay).padStart(2, '0')}/${String(pMonth).padStart(2, '0')}/${pYear}`;
    document.getElementById('picker-days-display').textContent = daysLeft;
    document.getElementById('modal-goal-smart-suggestion').textContent = getSmartGoalSuggestion(daysLeft, modalContextMode === 'main-goal');
}

function syncPickerFromISO(isoStr) {
    const parts = (isoStr || addDaysToTodayISO(30)).split('-').map(Number);
    pYear = parts[0] || 2027; pMonth = parts[1] || 5; pDay = parts[2] || 15;
    pDaysBuffer = String(Math.max(0, calcDaysRemaining(`${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`)));
    refreshGoalModalUI();
}

function syncPickerFromDays(daysInt) {
    const iso = addDaysToTodayISO(Math.max(0, Math.min(9999, parseInt(daysInt) || 0)));
    const [y, m, d] = iso.split('-').map(Number);
    pYear = y; pMonth = m; pDay = d;
    refreshGoalModalUI();
}

window.openGoalModal = function(mode, idx = -1) {
    modalContextMode = mode;
    modalEditIndex = idx;
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
        const t = todos.find(x => x.id === activeDetailTodoId);
        syncPickerFromISO(t?.dueDate || getLocalTodayString());
    }
    document.getElementById('goal-date-modal').classList.remove('hidden');
};

document.getElementById('edit-deen-purpose-btn')?.addEventListener('click', () => openGoalModal('deen-purpose'));
document.getElementById('edit-main-goal-btn')?.addEventListener('click', () => openGoalModal('main-goal'));
document.getElementById('add-side-goal-btn')?.addEventListener('click', () => openGoalModal('side-add'));
document.getElementById('close-goal-modal-btn')?.addEventListener('click', () => document.getElementById('goal-date-modal').classList.add('hidden'));

document.getElementById('dd-minus-btn')?.addEventListener('click', () => { const m = maxDaysInMonth(pMonth, pYear); pDay = pDay <= 1 ? m : pDay - 1; refreshGoalModalUI(); });
document.getElementById('dd-plus-btn')?.addEventListener('click', () => { const m = maxDaysInMonth(pMonth, pYear); pDay = pDay >= m ? 1 : pDay + 1; refreshGoalModalUI(); });
document.getElementById('mm-minus-btn')?.addEventListener('click', () => { pMonth = pMonth <= 1 ? 12 : pMonth - 1; refreshGoalModalUI(); });
document.getElementById('mm-plus-btn')?.addEventListener('click', () => { pMonth = pMonth >= 12 ? 1 : pMonth + 1; refreshGoalModalUI(); });
document.getElementById('yy-minus-btn')?.addEventListener('click', () => { pYear = Math.max(2025, pYear - 1); refreshGoalModalUI(); });
document.getElementById('yy-plus-btn')?.addEventListener('click', () => { pYear = Math.min(2045, pYear + 1); refreshGoalModalUI(); });

document.querySelectorAll('.days-numpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-key');
        if (key === 'CLR') { pDaysBuffer = '0'; numpadFreshOpen = false; }
        else if (key === 'BS') { pDaysBuffer = pDaysBuffer.length > 1 ? pDaysBuffer.slice(0, -1) : '0'; numpadFreshOpen = false; }
        else {
            if (numpadFreshOpen || pDaysBuffer === '0') { pDaysBuffer = key; numpadFreshOpen = false; }
            else if (pDaysBuffer.length < 4) pDaysBuffer += key;
        }
        syncPickerFromDays(parseInt(pDaysBuffer) || 0);
    });
});

document.getElementById('save-goal-modal-btn')?.addEventListener('click', () => {
    const iso = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
    const titleVal = document.getElementById('modal-goal-title-input').value.trim();
    const descVal = document.getElementById('modal-goal-desc-input').value.trim();

    if (modalContextMode === 'main-goal') {
        extConfig.mainGoal.title = titleVal || "Primary Life & Academic Goal";
        extConfig.mainGoal.targetDate = iso;
        saveExtConfig(); renderHomeHUD(); renderCompassView(); broadcastToCloud();
    } else if (modalContextMode === 'side-add') {
        extConfig.sideGoals.push({ id: Date.now(), title: titleVal || `Side Milestone #${extConfig.sideGoals.length + 1}`, targetDate: iso });
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (modalContextMode === 'side-edit' && extConfig.sideGoals[modalEditIndex]) {
        extConfig.sideGoals[modalEditIndex].title = titleVal || extConfig.sideGoals[modalEditIndex].title;
        extConfig.sideGoals[modalEditIndex].targetDate = iso;
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (modalContextMode === 'deen-purpose') {
        extConfig.deenPurpose.title = titleVal || "🕌 Strengthen Deen & Imaan";
        extConfig.deenPurpose.desc = descVal || "Follow the Islamic path for my entire life.";
        saveExtConfig(); renderCompassView(); broadcastToCloud();
    } else if (modalContextMode === 'todo-new-due') {
        window.newTodoDue = iso;
        document.getElementById('todo-new-due-label').textContent = formatDDMMYYYY(iso);
    } else if (modalContextMode === 'todo-detail-due') {
        const t = todos.find(x => x.id === activeDetailTodoId);
        if (t) { t.dueDate = iso; document.getElementById('detail-due-status').textContent = formatDDMMYYYY(iso); saveTodos(); renderTodos(); }
    }
    numpadFreshOpen = true;
    document.getElementById('goal-date-modal').classList.add('hidden');
});

/* =========================================================================
   2. CUSTOMIZABLE STUDY VAULT SUBJECTS, BACKLOG, REVISION, MCQ & MATRIX
   ========================================================================= */
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

document.getElementById('add-task-btn')?.addEventListener('click', () => {
    const titleInput = document.getElementById('task-title-input');
    const title = titleInput.value.trim();
    if (!title) return;
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    tasks.push({ id: Date.now(), title, subject: activeTaskSubj, type: activeTaskTab, completed: false });
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    titleInput.value = '';
    renderTasks(activeTaskTab);
    broadcastToCloud();
});

window.toggleTask = function(id) {
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => x.id === id);
    if (t) { t.completed = !t.completed; safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks)); renderTasks(activeTaskTab); broadcastToCloud(); PomoEventBus.emit('vault:updated'); }
};
window.deleteTask = function(id) {
    let tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    tasks = tasks.filter(x => x.id !== id);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks(activeTaskTab);
    broadcastToCloud();
};

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
});

window.renderTasks = function(tab) {
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
            container.innerHTML += `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-2"><h4 class="text-xs font-bold text-white mb-2 uppercase tracking-widest">${escapeHtml(subj)}</h4><div class="grid grid-cols-2 gap-2 text-center mb-2"><div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Backlogs Left</p><p class="text-sm font-bold">${bTot - bDone}</p></div><div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Revision Left</p><p class="text-sm font-bold">${rTot - rDone}</p></div></div><div class="bg-slate-950 rounded-lg p-2 text-center flex justify-between"><div class="text-[8px] text-slate-400 uppercase">Tar<br><b class="text-xs text-white">${mData.t}</b></div><div class="text-[8px] text-slate-400 uppercase">Att<br><b class="text-xs text-blue-400">${mData.a}</b></div><div class="text-[8px] text-slate-400 uppercase">Cor<br><b class="text-xs text-emerald-400">${mData.c}</b></div><div class="text-[8px] text-slate-400 uppercase">Wr<br><b class="text-xs text-tomato">${mInc}</b></div></div></div>`;
        });
        return;
    }
    if (tab === 'mcq') return;
    container.innerHTML = '';
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(t => t.type === tab && t.subject === activeTaskSubj);
    if (!tasks.length) {
        container.innerHTML = `<p class="text-slate-500 italic p-4 text-xs text-center">No chapters/topics found in ${escapeHtml(activeTaskSubj)}. Add above or send from Book Reader.</p>`;
        return;
    }
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `flex justify-between items-center p-3 rounded-xl border ${task.completed ? 'bg-slate-950 border-slate-900 opacity-50' : 'bg-slate-900 border-slate-800'}`;
        const bookBadge = task.bookId ? `<button onclick="event.stopPropagation(); window.openBookAtPage && window.openBookAtPage('${task.bookId}', ${task.page || 1})" class="bg-blue-600/25 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0">📖 p.${task.page || 1}</button>` : '';
        div.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <button onclick="toggleTask(${task.id})" class="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-700 bg-slate-950'}">${task.completed ? '✓' : ''}</button>
                <span class="text-xs font-medium truncate ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}">${escapeHtml(task.title)}</span>
                ${bookBadge}
            </div>
            <button onclick="deleteTask(${task.id})" class="text-red-400 ml-2 text-xs">🗑️</button>
        `;
        container.appendChild(div);
    });
};

/* =========================================================================
   3. PRO-GAMER RPG LEVELING & WORLD RANKING ENGINE (LEVEL 0 TO INFINITY)
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

function getDayMetrics(isoDate) {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const studyMins = stats.history?.[isoDate]?.mins || 0;
    const sessions = stats.history?.[isoDate]?.sessions || 0;
    const deenMins = deenHistory[isoDate] || 0;
    const sMap = salahHistory[isoDate] || {};
    const salahCount = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].filter(p => sMap[p]).length;
    const rLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const readMins = rLog[isoDate]?.totalMins || 0;
    const salahXP = (salahCount * 100) + (salahCount === 5 ? 250 : 0);
    const totalXP = Math.round((studyMins * 10) + (deenMins * 15) + salahXP + (readMins * 12) + (sessions * 40));
    return { studyMins, deenMins, salahCount, readMins, sessions, totalXP };
}

window.calculateLifetimeRPGStats = function() {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const rLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const books = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));

    const allDates = new Set([
        ...Object.keys(stats.history || {}),
        ...Object.keys(deenHistory || {}),
        ...Object.keys(salahHistory || {}),
        ...Object.keys(rLog)
    ]);

    let lifetimeXP = 0, activeDaysCount = 0;
    allDates.forEach(d => {
        const m = getDayMetrics(d);
        if (m.totalXP > 0) activeDaysCount++;
        lifetimeXP += m.totalXP;
    });

    const completedTodos = todos.filter(t => t.completed).length;
    const completedVault = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(t => t.completed).length;
    let totalAnnotations = 0, totalPagesRead = 0;
    books.forEach(b => {
        totalAnnotations += (b.annotations || []).length;
        totalPagesRead += Math.max(0, (b.currentPage || 1) - 1);
    });

    lifetimeXP += (completedTodos * 50) + (completedVault * 80) + (totalAnnotations * 25) + (totalPagesRead * 15);

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

    const todayM = getDayMetrics(todayIso);
    const yestM = getDayMetrics(yestIso);
    const xpDelta = todayM.totalXP - yestM.totalXP;
    const pctBetter = yestM.totalXP > 0
        ? Math.round(((todayM.totalXP - yestM.totalXP) / yestM.totalXP) * 100)
        : (todayM.totalXP > 0 ? 100 : 0);

    const disciplineScore = Math.min(99.9, Math.round(((todayM.studyMins / 480) * 55 + (todayM.salahCount / 5) * 45) * 10) / 10);
    const consistencyScore = Math.min(99.9, Math.round((Math.min(1, activeDaysCount / 30) * 60 + (todayM.totalXP >= yestM.totalXP && todayM.totalXP > 0 ? 40 : 20)) * 10) / 10);
    const readingScore = Math.min(99.9, Math.round((Math.min(1, (todayM.readMins + totalPagesRead * 2) / 120) * 100) * 10) / 10);

    return {
        lifetimeXP, level, xpIntoLevel, xpNeededForNext, levelPct, rankObj,
        todayM, yestM, xpDelta, pctBetter,
        disciplineScore, consistencyScore, readingScore,
        totalPagesRead, totalAnnotations, activeDaysCount
    };
};

function updateTopBarRpgBadge() {
    const rpg = calculateLifetimeRPGStats();
    const iconEl = document.getElementById('top-rpg-badge-icon');
    const lvEl = document.getElementById('top-rpg-lv-text');
    if (iconEl) iconEl.textContent = rpg.rankObj.badge;
    if (lvEl) lvEl.textContent = `Lv.${rpg.level}`;
}

window.renderRpgArena = function() {
    updateTopBarRpgBadge();
    const rpgView = document.getElementById('rpg-arena-subview');
    if (!rpgView) return;
    const rpg = calculateLifetimeRPGStats();

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = getLocalTodayString(d);
        const m = getDayMetrics(iso);
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
        { title: '⚔️ Beat Yesterday\'s Total XP', done: rpg.todayM.totalXP > rpg.yestM.totalXP && rpg.todayM.totalXP > 0, prog: `${rpg.todayM.totalXP}/${Math.max(100, rpg.yestM.totalXP)} XP`, reward: '+300 XP' },
        { title: '🧠 Complete 4.0h Deep Study', done: rpg.todayM.studyMins >= 240, prog: `${(rpg.todayM.studyMins / 60).toFixed(1)}/4.0h`, reward: '+400 XP' },
        { title: '📖 Read Books for 30 Mins', done: rpg.todayM.readMins >= 30, prog: `${rpg.todayM.readMins}/30m`, reward: '+360 XP' }
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
                        <span class="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">Global Player Progression (Lv.0 → ∞)</span>
                        <h3 class="text-lg sm:text-xl font-extrabold ${rpg.rankObj.color} mt-1">${rpg.rankObj.title}</h3>
                        <p class="text-xs text-slate-400 font-mono">Lifetime Score: <b class="text-white">${rpg.lifetimeXP.toLocaleString()} XP</b> • Active Days: <b class="text-emerald-400">${rpg.activeDaysCount}d</b></p>
                    </div>
                </div>
                <div class="text-right bg-slate-950/90 border border-slate-800 px-4 py-2.5 rounded-2xl">
                    <p class="text-[10px] font-bold uppercase text-slate-400">Global Standing</p>
                    <p class="text-base font-mono font-extrabold text-amber-400">Top ${(100 - Math.min(99.8, (rpg.disciplineScore + rpg.consistencyScore + rpg.readingScore) / 3)).toFixed(1)}% Worldwide</p>
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

        <div class="bg-gradient-to-r ${deltaBannerColor} border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
                <span class="text-[10px] font-extrabold uppercase tracking-widest opacity-80">⚡ Day-by-Day Progression (Today vs. Yesterday)</span>
                <h4 class="text-sm sm:text-base font-extrabold text-white mt-0.5">
                    ${deltaPositive
                        ? `🔥 You are +${rpg.pctBetter}% more productive than Yesterday (+${rpg.xpDelta} XP ahead)!`
                        : `⚔️ ${Math.abs(rpg.xpDelta)} XP needed to beat Yesterday's score (${Math.ceil(Math.abs(rpg.xpDelta) / 10)}m of Study to overtake!)`}
                </h4>
                <p class="text-xs text-slate-300 mt-1 font-mono">
                    Today: <b>${rpg.todayM.totalXP} XP</b> (${(rpg.todayM.studyMins/60).toFixed(1)}h Study • ${rpg.todayM.readMins}m Read • ${rpg.todayM.salahCount}/5 Salah)
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
                <div class="flex justify-between items-center mb-1.5"><span class="text-xs font-extrabold text-amber-400">📖 Scholar & Reading</span><span class="text-xs font-mono font-extrabold text-white">${rpg.readingScore}%</span></div>
                <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800"><div class="h-full bg-amber-500 rounded-full" style="width:${rpg.readingScore}%"></div></div>
                <p class="text-[10px] text-slate-400 mt-1.5">${rpg.totalPagesRead} Pages Read • ${rpg.totalAnnotations} Notes/Highlights</p>
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

// Listen to Event Bus for automatic RPG & Compass updates
PomoEventBus.on('stats:updated', updateTopBarRpgBadge);
PomoEventBus.on('todos:updated', updateTopBarRpgBadge);
PomoEventBus.on('vault:updated', updateTopBarRpgBadge);
PomoEventBus.on('reader:updated', updateTopBarRpgBadge);
PomoEventBus.on('reading:minuteLogged', updateTopBarRpgBadge);

renderCompassView();
renderCustomSubjectBar();
updateTopBarRpgBadge();
