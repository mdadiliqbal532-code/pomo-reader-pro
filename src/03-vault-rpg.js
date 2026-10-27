/* =========================================================================
   03-VAULT-RPG.JS (v16.0 PURE DESKTOP EDITION) — 3-TIER COMPASS, MEMORY BEAST
   FSRS-5 VAULT, BUILT-IN FLASHCARD CREATOR & REVIEWER, ADDITIVE +4/-1 MCQ
   ENGINE, 5-PILLAR POLYMATH SKILL TREE, WEEKLY BOSS RAID & ACHIEVEMENTS
   ========================================================================= */

window.haptic = window.haptic || function() {};
window.escapeJsStr = window.escapeJsStr || function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
};

window.showCompletedVaultItems = true;

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
        if (daysLeft > 150) return `💡 Foundation & Polymath Phase: ${daysLeft} days gives you ${(daysLeft * studyTarget).toLocaleString()} deep focus hours.`;
        if (daysLeft >= 60) return `💡 High-Yield Memory Beast Phase: ${daysLeft} days left. Prioritize daily active recall & FSRS flashcards.`;
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
        sgList.innerHTML = `<p class="text-xs text-slate-500 italic text-center p-3">No side goals added. Click "+ Add Side Goal" above.</p>`;
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
                    <button onclick="openGoalModal('side-edit', ${idx})" class="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg text-xs">✏️</button>
                    <button onclick="deleteSideGoal(${idx})" class="bg-slate-900 hover:bg-red-950 text-red-400 border border-slate-700 px-2 py-1.5 rounded-lg text-xs">🗑️</button>
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
        heading.textContent = "🕌 Edit Lifelong Purpose (∞)";
        titleWrap.classList.remove('hidden');
        descWrap.classList.remove('hidden');
        dateSection.classList.add('hidden');
        titleInp.value = extConfig.deenPurpose.title;
        descInp.value = extConfig.deenPurpose.desc || "";
    } else if (mode === 'todo-new-due') {
        heading.textContent = "📅 Select PomoTask Due Date";
        titleWrap.classList.add('hidden');
        clearDateBtn.classList.remove('hidden');
        syncPickerFromISO(newTodoDue || getLocalTodayString());
    } else if (mode === 'todo-detail-due') {
        heading.textContent = "📅 Select PomoTask Due Date";
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
        extConfig.mainGoal.title = titleVal || "Primary Life & Medical Science Goal";
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
        extConfig.deenPurpose.title = titleVal || "🕌 Strengthen Deen, Imaan & Purpose";
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
   2. MEMORY BEAST FSRS-5 RETENTION ENGINE, MANUAL FLASHCARD BUILDER & VAULT
   ========================================================================= */
['World History', 'Human Behavior', 'Universe & Existence'].forEach(polySubj => {
    if (extConfig.customSubjects && !extConfig.customSubjects.includes(polySubj) && extConfig.customSubjects.length < 7) {
        extConfig.customSubjects.push(polySubj);
    }
});

// Calculates live Memory Retention % using FSRS-5 power-law forgetting curve: R(t) = (1 + t / (9 * S))^-1
window.computeMemoryRetentionPct = function(item) {
    const stabilityDays = Math.max(0.5, parseFloat(item.stabilityDays) || (item.completed ? 7.0 : 2.5));
    const lastRev = item.lastReviewedAt || (item.createdDate ? new Date(item.createdDate).getTime() : Date.now());
    const elapsedDays = Math.max(0, (Date.now() - lastRev) / 86400000);
    const r = Math.pow(1 + elapsedDays / (9 * stabilityDays), -1);
    return Math.max(15, Math.min(100, Math.round(r * 100)));
};

window.quickBoostMemoryStability = function(taskId) {
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    const prevRet = window.computeMemoryRetentionPct(t);
    t.lastReviewedAt = Date.now();
    t.reviewCount = (t.reviewCount || 0) + 1;
    t.stabilityDays = Math.min(365, +((parseFloat(t.stabilityDays) || 2.5) * 2.2).toFixed(1));
    t.memoryBonusXP = (t.memoryBonusXP || 0) + (prevRet >= 75 ? 120 : 85);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks(activeTaskTab);
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');

    if (t.reviewCount === 3 && window.triggerForceAchievementNotification) {
        window.triggerForceAchievementNotification(
            '🧬 Memory Beast Lock-In!',
            `"${t.title}" reached ${t.stabilityDays}d Memory Stability (100% Retention + 2.0x XP Bonus)!`,
            '🧠',
            `mem_beast_${t.id}_3`
        );
    } else {
        showToast(`🧠 Memory Restored to 100%! Stability boosted to ${t.stabilityDays} Days (+2.0x XP)!`);
    }
};

// Built-in Manual FSRS-5 Flashcard Creator & Editor Modal (Zero AI Dependency)
window.openManualFlashcardCreatorModal = function(editIdx = -1) {
    const modal = document.getElementById('reader-suboptions-modal');
    const titleEl = document.getElementById('suboptions-modal-title');
    const bodyEl = document.getElementById('suboptions-modal-body');
    if (!modal || !titleEl || !bodyEl) return;

    const cards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));
    const existing = editIdx >= 0 && cards[editIdx] ? cards[editIdx] : null;

    titleEl.textContent = existing ? "✏️ Edit Memory Beast Flashcard" : "🃏 Create Memory Beast FSRS Flashcard";
    bodyEl.innerHTML = `
        <div class="flex flex-col gap-3 text-xs">
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-extrabold uppercase text-cyan-400">Subject / Topic Tag</label>
                <input type="text" id="manual-fc-topic-inp" value="${escapeHtml(existing?.topic || activeTaskSubj || 'Medical Science')}" placeholder="e.g. Anatomy / Pharmacology / World History" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none">
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-extrabold uppercase text-amber-400">Front (Question / Clinical Vignette / Prompt)</label>
                <textarea id="manual-fc-front-inp" placeholder="Type your question, mechanism prompt, or historical recall cue..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white h-24 resize-none focus:outline-none">${escapeHtml(existing?.front || '')}</textarea>
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-[10px] font-extrabold uppercase text-emerald-400">Back (Answer / Mechanism / Mnemonic)</label>
                <textarea id="manual-fc-back-inp" placeholder="Type the high-yield answer, formula, or mnemonic..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white h-24 resize-none focus:outline-none">${escapeHtml(existing?.back || '')}</textarea>
            </div>
            <button type="button" id="manual-fc-save-btn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow">
                ${existing ? '💾 Save Flashcard Changes' : '➕ Add Flashcard to Memory Beast Deck'}
            </button>
        </div>
    `;
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('manual-fc-front-inp')?.focus(), 50);

    document.getElementById('manual-fc-save-btn').onclick = () => {
        const topic = (document.getElementById('manual-fc-topic-inp')?.value || '').trim() || activeTaskSubj || 'General';
        const front = (document.getElementById('manual-fc-front-inp')?.value || '').trim();
        const back = (document.getElementById('manual-fc-back-inp')?.value || '').trim();
        if (!front || !back) {
            showToast("Enter both the Front question and Back answer!", true);
            return;
        }
        if (existing) {
            cards[editIdx].topic = topic;
            cards[editIdx].front = front;
            cards[editIdx].back = back;
        } else {
            cards.unshift({
                id: 'fc_' + Date.now(),
                topic,
                front,
                back,
                intervalDays: 1,
                stabilityPct: 95,
                lastReviewed: Date.now()
            });
        }
        safeSet('pages_pomodoro_fsrs_cards_v15', JSON.stringify(cards));
        modal.classList.add('hidden');
        window.activeTaskTab = 'revision';
        renderTasks('revision');
        PomoEventBus.emit('vault:updated');
        showToast(existing ? "✅ Flashcard updated!" : "🃏 Flashcard added to Memory Beast Deck!");
    };
};

function upgradeVaultAddFormUI() {
    const dueInp = document.getElementById('vault-new-due-input');
    if (dueInp && !dueInp.value) {
        dueInp.value = getLocalTodayString();
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
    titleEl.textContent = "📚 Manage Polymath & Medical Vault Subjects";
    bodyEl.innerHTML = `
        <p class="text-xs text-slate-400">Add any field of study (Anatomy, Pharmacology, World History, Human Behavior, Cosmology, Tafseer, etc.).</p>
        <div class="flex gap-2">
            <input type="text" id="new-vault-subj-input" placeholder="e.g. Neurobiology / Ottoman History / Behavioral Econ" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
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
        note: noteStr,
        lastReviewedAt: Date.now(),
        stabilityDays: 2.5,
        reviewCount: 1
    };
    tasks.unshift(newItem);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));

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
    if (created) showToast(`📚 Added "${created.title}" to Memory Beast Vault & PomoTasks!`);
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
        if (created) showToast(`📚 Added "${created.title}" to Memory Beast Vault & PomoTasks!`);
    }
});

window.saveNotebookLmReportToVault = function(title, subject, noteText, bookId = null, pageNum = 1) {
    const today = getLocalTodayString();
    const targetSubj = subject || activeTaskSubj || extConfig.customSubjects[0] || 'Biology';
    const vaultId = Date.now();
    const todoMirrorId = vaultId + 1;

    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    tasks.unshift({
        id: vaultId,
        linkedTodoId: todoMirrorId,
        title: title || 'High-Yield Chapter Summary',
        subject: targetSubj,
        type: 'revision',
        completed: false,
        createdDate: today,
        dueDate: today,
        durationMins: 45,
        note: noteText || '',
        bookId,
        page: pageNum,
        lastReviewedAt: Date.now(),
        stabilityDays: 3.5,
        reviewCount: 1
    });
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));

    todos.unshift({
        id: todoMirrorId,
        linkedVaultId: vaultId,
        title: `🧠 [${targetSubj} • REVISION] ${title}`,
        completed: false,
        important: true,
        myDayDate: today,
        createdDate: today,
        dueDate: today,
        durationMins: 45,
        repeat: { type: 'none' },
        steps: [],
        note: noteText || '',
        listId: 'tasks',
        bookId,
        bookPage: pageNum
    });
    saveTodos();
    renderTodos();
    renderTasks(activeTaskTab);
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');
    showToast(`📌 Saved "${title}" to "${targetSubj}" Memory Beast Vault & PomoTasks!`);
};

window.logNotebookLmMcqScoreToVault = function(subject, totalQ, attemptedQ, correctQ) {
    const today = getLocalTodayString();
    const targetSubj = subject || activeTaskSubj || extConfig.customSubjects[0] || 'Biology';
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    if (!mcqs[today]) mcqs[today] = {};
    const cur = mcqs[today][targetSubj] || { t: 0, a: 0, c: 0 };
    cur.t = Math.max(cur.t, (cur.a || 0) + (parseInt(totalQ) || 5));
    cur.a = (cur.a || 0) + (parseInt(attemptedQ) || 0);
    cur.c = (cur.c || 0) + (parseInt(correctQ) || 0);
    mcqs[today][targetSubj] = cur;
    safeSet('pages_pomodoro_mcq_v8', JSON.stringify(mcqs));
    loadMCQInputs();
    renderStats();
    broadcastToCloud();
    PomoEventBus.emit('vault:updated');
    const wrongQ = Math.max(0, (parseInt(attemptedQ) || 0) - (parseInt(correctQ) || 0));
    const batchNet = ((parseInt(correctQ) || 0) * 4) - wrongQ;
    if (correctQ >= 5 && (correctQ / Math.max(1, attemptedQ)) >= 0.85 && window.triggerForceAchievementNotification) {
        window.triggerForceAchievementNotification(
            `🎯 High-Yield MCQ Sniper (${targetSubj})!`,
            `Scored ${correctQ}/${attemptedQ} (+${batchNet} Net Marks) in ${targetSubj}!`,
            '🎯'
        );
    } else {
        showToast(`🎯 Logged +${correctQ}/${attemptedQ} MCQs (${batchNet >= 0 ? '+' : ''}${batchNet} Marks) into ${targetSubj} Vault!`);
    }
};

window.toggleTask = function(id) {
    const today = getLocalTodayString();
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => String(x.id) === String(id));
    if (!t) return;

    t.completed = !t.completed;
    if (t.completed) {
        t.completedDate = today;
        t.lastReviewedAt = Date.now();
        t.stabilityDays = Math.max(5.0, (parseFloat(t.stabilityDays) || 2.5) * 2.0);
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

/* =========================================================================
   3. STUDY VAULT CARDS, FSRS FLASHCARD DECK & ADDITIVE +4/-1 MCQ ENGINE
   ========================================================================= */
function mountAdditiveMcqBatchControls() {
    const mcqForm = document.getElementById('mcq-add-form');
    if (!mcqForm || document.getElementById('mcq-net-marks-pill')) return;
    const netRow = document.createElement('div');
    netRow.className = "mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2";
    netRow.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2">
            <span id="mcq-net-marks-pill" class="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-950/50 border border-emerald-500/40 px-2.5 py-1 rounded-lg">🎯 Competitive Net Score (+4/-1): 0 / 0</span>
            <span id="mcq-acc-pct-pill" class="text-xs font-mono font-bold text-cyan-300">Accuracy: 0%</span>
        </div>
        <div class="bg-slate-950 border border-purple-500/40 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
            <span class="text-[10px] font-extrabold uppercase text-purple-300">➕ Add Practice Batch to Today:</span>
            <div class="flex items-center gap-1.5 flex-1 sm:flex-initial justify-end">
                <input type="number" id="mcq-batch-att-inp" placeholder="+Attempted" class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white text-center">
                <input type="number" id="mcq-batch-cor-inp" placeholder="+Correct" class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-emerald-300 text-center">
                <button type="button" id="mcq-add-batch-inline-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-1 rounded-lg text-xs shadow">＋ Add Batch</button>
            </div>
        </div>
    `;
    mcqForm.appendChild(netRow);

    document.getElementById('mcq-add-batch-inline-btn')?.addEventListener('click', () => {
        const addA = parseInt(document.getElementById('mcq-batch-att-inp')?.value) || 0;
        const addC = Math.min(addA, parseInt(document.getElementById('mcq-batch-cor-inp')?.value) || 0);
        if (addA <= 0) { showToast("Enter how many MCQs you attempted in this batch!", true); return; }
        document.getElementById('mcq-batch-att-inp').value = '';
        document.getElementById('mcq-batch-cor-inp').value = '';
        window.logNotebookLmMcqScoreToVault(activeTaskSubj, addA, addA, addC);
    });
}

window.loadMCQInputs = function() {
    mountAdditiveMcqBatchControls();
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const today = getLocalTodayString();
    const d = (mcqs[today] && mcqs[today][activeTaskSubj]) ? mcqs[today][activeTaskSubj] : { t: 0, a: 0, c: 0 };
    if (document.getElementById('mcq-target')) document.getElementById('mcq-target').value = d.t || '';
    if (document.getElementById('mcq-attempted')) document.getElementById('mcq-attempted').value = d.a || '';
    if (document.getElementById('mcq-correct')) document.getElementById('mcq-correct').value = d.c || '';
    updateMCQMath();
};

function updateMCQMath() {
    const t = parseInt(document.getElementById('mcq-target')?.value) || 0;
    const a = parseInt(document.getElementById('mcq-attempted')?.value) || 0;
    const c = parseInt(document.getElementById('mcq-correct')?.value) || 0;
    const w = Math.max(0, a - c);
    const netMarks = (c * 4) - (w * 1);
    const maxMarks = a * 4;
    const accPct = a > 0 ? Math.round((c / a) * 100) : 0;

    if (document.getElementById('mcq-display-incorrect')) document.getElementById('mcq-display-incorrect').textContent = w;
    if (document.getElementById('mcq-display-left')) document.getElementById('mcq-display-left').textContent = Math.max(0, t - a);
    const netPill = document.getElementById('mcq-net-marks-pill');
    if (netPill) netPill.textContent = `🎯 Competitive Net Score (+4/-1): ${netMarks} / ${maxMarks}  (+${c * 4} | -${w})`;
    const accPill = document.getElementById('mcq-acc-pct-pill');
    if (accPill) accPill.textContent = `Accuracy: ${accPct}%`;
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
    updateMCQMath();
    showToast("MCQ Stats Saved");
    broadcastToCloud();
    renderStats();
    PomoEventBus.emit('vault:updated');
});

function createVaultItemCard(task) {
    const div = document.createElement('div');
    div.className = `flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-slate-950/60 border-slate-900 opacity-65' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`;
    div.onclick = () => window.openProtocolRunModal && window.openProtocolRunModal('vault', task.id);

    const retPct = window.computeMemoryRetentionPct(task);
    const stabDays = +(parseFloat(task.stabilityDays) || 2.5).toFixed(1);
    const retColor = retPct >= 85
        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
        : (retPct >= 65 ? 'bg-amber-950/90 text-amber-300 border-amber-500/40' : 'bg-red-950/90 text-red-300 border-red-500/50 animate-pulse');

    const safeBookId = escapeJsStr(task.bookId || '');
    const safeTaskId = escapeJsStr(task.id);
    const safeTitle = escapeJsStr(task.title || '');
    const safeSubj = escapeJsStr(task.subject || '');

    const bookBadge = task.bookId
        ? `<button type="button" onclick="event.stopPropagation(); window.openBookAtPage && window.openBookAtPage('${safeBookId}', ${task.page || 1})" class="bg-blue-600/25 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0">📖 p.${task.page || 1}</button>`
        : '';

    const usedBadge = task.usedDurationMins
        ? `<span class="text-[10px] ${task.overtimeMins > 0 ? 'bg-rose-950 text-rose-300 border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'} border px-1.5 py-0.5 rounded font-mono font-bold">⏱️ Used: ${task.usedDurationMins}m${task.overtimeMins > 0 ? ` (+${task.overtimeMins}m Extra)` : ''}</span>`
        : `<span class="text-[10px] text-blue-400 font-mono">⏱️ ${task.durationMins || 45}m</span>`;

    div.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <button type="button" onclick="event.stopPropagation(); toggleTask('${safeTaskId}')" class="todo-check-circle ${task.completed ? 'checked' : ''}">${task.completed ? '✓' : ''}</button>
            <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}">${escapeHtml(task.title)}</p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    <span class="text-[10px] text-purple-400 font-bold uppercase">${escapeHtml(task.subject)} • ${escapeHtml(task.type)}</span>
                    <span class="text-[10px] ${retColor} border px-1.5 py-0.5 rounded font-mono font-extrabold" title="FSRS-5 Memory Retention Curve (Stability: ${stabDays}d)">🧠 Retention: ${retPct}% (${stabDays}d)</span>
                    ${usedBadge}
                    ${task.dueDate ? `<span class="text-[10px] text-emerald-400 font-mono">📅 Due ${formatDDMMYYYY(task.dueDate)}</span>` : ''}
                    ${task.note ? `<span class="text-[10px] text-slate-400 truncate max-w-[180px]">📝 ${escapeHtml(task.note)}</span>` : ''}
                    ${bookBadge}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="event.stopPropagation(); window.quickBoostMemoryStability('${safeTaskId}')" class="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-1.5 rounded-lg text-[10px] font-extrabold" title="Active Recall Check: Restore 100% Retention & Multiply Stability (+2.0x XP)">⚡ Recall</button>
            <button type="button" onclick="event.stopPropagation(); window.scheduleChapterSpacedRepetition && window.scheduleChapterSpacedRepetition('${safeTitle}', '${safeSubj}')" class="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 px-2 py-1.5 rounded-lg text-[10px] font-extrabold" title="Schedule 1-3-7-14-30 Day Spaced Repetition">🔁 SRS</button>
            <button type="button" onclick="event.stopPropagation(); window.openProtocolRunModal && window.openProtocolRunModal('vault', '${safeTaskId}')" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 shadow">
                <span>▶️</span><span>Run</span>
            </button>
            <button type="button" onclick="event.stopPropagation(); deleteTask('${safeTaskId}')" class="text-red-400 hover:text-red-300 px-1.5 py-1 text-xs">🗑️</button>
        </div>
    `;
    return div;
}

window.gradeVaultFlashcardFSRS = function(cardIdx, gradeMultiplier) {
    const cards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));
    if (!cards[cardIdx]) return;
    const c = cards[cardIdx];
    c.intervalDays = Math.max(1, Math.round((c.intervalDays || 1) * gradeMultiplier));
    c.stabilityPct = gradeMultiplier >= 1.5 ? 100 : (gradeMultiplier >= 1.0 ? 85 : 60);
    c.lastReviewed = Date.now();
    safeSet('pages_pomodoro_fsrs_cards_v15', JSON.stringify(cards));
    renderTasks(activeTaskTab);
    showToast(`🃏 Flashcard Scheduled (+${c.intervalDays}d Interval • +35 Memory Beast XP)!`);
};

window.deleteVaultFlashcard = function(cardIdx) {
    const cards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));
    cards.splice(cardIdx, 1);
    safeSet('pages_pomodoro_fsrs_cards_v15', JSON.stringify(cards));
    renderTasks(activeTaskTab);
};

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
            const avgRetention = subT.length
                ? Math.round(subT.reduce((acc, it) => acc + window.computeMemoryRetentionPct(it), 0) / subT.length)
                : 100;
            const mData = (mcqs[today] && mcqs[today][subj]) ? mcqs[today][subj] : { t: 0, a: 0, c: 0 };
            const mInc = Math.max(0, mData.a - mData.c);
            const netScore = (mData.c * 4) - mInc;
            const accPct = mData.a > 0 ? Math.round((mData.c / mData.a) * 100) : 0;
            const zoneBadge = mData.a === 0
                ? `<span class="text-[9px] font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded">🧠 Avg Memory: ${avgRetention}%</span>`
                : (accPct >= 80
                    ? `<span class="text-[9px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">🟢 Strong (${accPct}% • Net ${netScore}) • 🧠 ${avgRetention}%</span>`
                    : (accPct >= 60
                        ? `<span class="text-[9px] font-mono font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">🟡 Moderate (${accPct}% • Net ${netScore}) • 🧠 ${avgRetention}%</span>`
                        : `<span class="text-[9px] font-mono font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded">🔴 Weak Zone (${accPct}% • Net ${netScore}) • 🧠 ${avgRetention}%</span>`));

            container.innerHTML += `
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-2">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-xs font-extrabold text-white uppercase tracking-widest">${escapeHtml(subj)}</h4>
                        ${zoneBadge}
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-center mb-2">
                        <div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Backlogs Left</p><p class="text-sm font-bold text-purple-300">${bTot - bDone} <span class="text-[10px] text-emerald-400">(${bDone} ✓)</span></p></div>
                        <div class="bg-slate-950 rounded-lg p-2"><p class="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Memory Beast Left</p><p class="text-sm font-bold text-amber-300">${rTot - rDone} <span class="text-[10px] text-emerald-400">(${rDone} ✓)</span></p></div>
                    </div>
                    <div class="bg-slate-950 rounded-lg p-2 text-center flex justify-between">
                        <div class="text-[8px] text-slate-400 uppercase">Tar<br><b class="text-xs text-white">${mData.t}</b></div>
                        <div class="text-[8px] text-slate-400 uppercase">Att<br><b class="text-xs text-blue-400">${mData.a}</b></div>
                        <div class="text-[8px] text-slate-400 uppercase">Cor (+4)<br><b class="text-xs text-emerald-400">${mData.c}</b></div>
                        <div class="text-[8px] text-slate-400 uppercase">Wr (-1)<br><b class="text-xs text-tomato">${mInc}</b></div>
                        <div class="text-[8px] text-slate-400 uppercase">Net Score<br><b class="text-xs text-amber-300">${netScore}</b></div>
                    </div>
                </div>
            `;
        });
        return;
    }
    if (tab === 'mcq') {
        mountAdditiveMcqBatchControls();
        return;
    }

    container.innerHTML = '';

    // In "🧠 Memory Beast" ('revision') tab, render FSRS Flashcard Deck & Creator Bar
    if (tab === 'revision') {
        const savedCards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));
        const fcSection = document.createElement('div');
        fcSection.className = "bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-3.5 mb-3 flex flex-col gap-2.5";
        fcSection.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-cyan-300">🃏 Memory Beast Active Flashcards (${savedCards.length} Cards — Click any card to flip Answer)</span>
                <button type="button" onclick="window.openManualFlashcardCreatorModal()" class="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow">➕ Create Flashcard</button>
            </div>
            ${savedCards.length > 0 ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 native-scroll">
                    ${savedCards.map((c, cIdx) => `
                        <div class="flashcard-card-box flex flex-col justify-between gap-2" onclick="const ans=this.querySelector('.fc-ans'); ans.classList.toggle('hidden');">
                            <div>
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[9px] font-mono bg-slate-950 text-amber-300 px-2 py-0.5 rounded border border-slate-800">${escapeHtml(c.topic || 'Concept')} • Next: +${c.intervalDays || 1}d</span>
                                    <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                                        <button type="button" onclick="window.openManualFlashcardCreatorModal(${cIdx})" class="text-[10px] text-slate-400 hover:text-cyan-300" title="Edit Flashcard">✏️</button>
                                        <button type="button" onclick="window.deleteVaultFlashcard(${cIdx})" class="text-[10px] text-slate-400 hover:text-red-400" title="Delete Flashcard">🗑️</button>
                                    </div>
                                </div>
                                <p class="text-xs font-extrabold text-white leading-snug">${escapeHtml(c.front)}</p>
                                <div class="fc-ans hidden mt-2 pt-2 border-t border-cyan-500/30 text-xs text-emerald-300 font-medium leading-relaxed whitespace-pre-wrap">${escapeHtml(c.back)}</div>
                            </div>
                            <div class="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80" onclick="event.stopPropagation()">
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS(${cIdx}, 0.5)" class="bg-red-950/70 hover:bg-red-600 text-red-200 text-[9px] font-extrabold py-1 rounded">Again</button>
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS(${cIdx}, 1.2)" class="bg-amber-950/70 hover:bg-amber-600 text-amber-200 text-[9px] font-extrabold py-1 rounded">Hard</button>
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS(${cIdx}, 2.2)" class="bg-blue-950/70 hover:bg-blue-600 text-blue-200 text-[9px] font-extrabold py-1 rounded">Good</button>
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS(${cIdx}, 3.5)" class="bg-emerald-950/70 hover:bg-emerald-600 text-emerald-200 text-[9px] font-extrabold py-1 rounded">Easy</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `<p class="text-[11px] text-slate-400 italic">No flashcards in deck yet. Click "➕ Create Flashcard" to build your FSRS-5 active recall deck!</p>`}
        `;
        container.appendChild(fcSection);
    }

    const allSubjTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(t => t.type === tab && t.subject === activeTaskSubj);
    const activeTasks = allSubjTasks.filter(t => !t.completed);
    const completedTasks = allSubjTasks.filter(t => t.completed);

    if (!activeTasks.length && !completedTasks.length) {
        container.innerHTML += `<p class="text-slate-500 italic p-4 text-xs text-center bg-slate-900/40 rounded-xl border border-slate-800/50">No ${escapeHtml(tab)} items in ${escapeHtml(activeTaskSubj)}. Add one above or send from PomoReader!</p>`;
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
   4. ADVANCED ANALYTICAL PROFILE STATS STUDIO (DECOUPLED VIA EVENT BUS)
   ========================================================================= */
function renderAdvancedProfileTelemetry() {
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

    const extraOvertimeToday = todayRec.overtimeMins || 0;
    const focusEffPct = Math.min(100, Math.round(((todayRec.mins + deenMins) / Math.max(60, (extConfig.studyTargetHours + extConfig.deenTargetHours) * 60)) * 100));

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
                    <h3 class="text-xs font-extrabold text-white mt-0.5">Timer • PomoTasks • Memory Beast Vault • Overtime Telemetry</h3>
                </div>
                <button type="button" onclick="window.openTodoAnalyticsModal('12m')" class="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow">📈 4-Graph (Up to 3Y)</button>
            </div>

            <div class="grid grid-cols-4 gap-2 text-center">
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

            <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
                <div class="flex justify-between text-[10px] font-bold">
                    <span class="text-blue-400">☑️ PomoTasks Completion Rate (${todoCompCount}/${todos.length})</span>
                    <span class="font-mono text-white">${Math.round((todoCompCount / todoTotCount) * 100)}%</span>
                </div>
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div class="h-full bg-blue-500 rounded-full" style="width:${Math.min(100, Math.round((todoCompCount / todoTotCount) * 100))}%"></div></div>

                <div class="flex justify-between text-[10px] font-bold mt-1">
                    <span class="text-purple-400">📚 Memory Beast Vault Cleared</span>
                    <span class="font-mono text-white">${Math.round((vaultCompCount / vaultTotCount) * 100)}%</span>
                </div>
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div class="h-full bg-purple-500 rounded-full" style="width:${Math.min(100, Math.round((vaultCompCount / vaultTotCount) * 100))}%"></div></div>
            </div>
        </div>
    `;
}

/* =========================================================================
   5. ANTI-CUTOFF 4-WIDGET "OMNI-COMMAND BENTO STRIP" ON HOME TIMER PAGE
   ========================================================================= */
window.renderOmniBentoStrip = function() {
    const rightCol = document.querySelector('#page-timer .cockpit-right');
    if (!rightCol) return;

    let strip = document.getElementById('home-omni-bento-strip');
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'home-omni-bento-strip';
        strip.className = "w-full grid grid-cols-2 gap-2 min-w-0 overflow-hidden";
        rightCol.appendChild(strip);
    }

    const rpg = calculateLifetimeRPGStats();
    const curSess = schedule[currentStepIndex];
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const unfinVault = vaultTasks.filter(v => !v.completed);
    const fsrsCards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));

    strip.innerHTML = `
        <div class="bg-slate-900/90 border border-blue-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow min-w-0 overflow-hidden">
            <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-blue-400 truncate">⏱️ Active Protocol</span>
                <button type="button" onclick="window.startPureCountUpStopwatch()" class="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0">+Count-Up</button>
            </div>
            <p class="text-[11px] font-extrabold text-white truncate max-w-full">${escapeHtml(curSess ? curSess.title : 'No Active Session')}</p>
            <div class="flex gap-1">
                <button type="button" onclick="window.completeSession()" class="flex-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 py-1 rounded-lg text-[9px] font-extrabold truncate">✓ Complete</button>
                <button type="button" onclick="switchPage('page-todo')" class="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[9px] font-bold shrink-0">☑️ Tasks</button>
            </div>
        </div>

        <div onclick="switchPage('page-vault'); activateVaultSubview('rpg');" class="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1 cursor-pointer hover:border-amber-400 shadow min-w-0 overflow-hidden">
            <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 truncate">${rpg.rankObj.badge} Lv.${rpg.level} Polymath</span>
                <span class="text-[9px] font-mono font-bold text-emerald-400 shrink-0">🛡️${rpg.streakShields} • ${rpg.levelPct}%</span>
            </div>
            <p class="text-[11px] font-extrabold text-white truncate max-w-full">${escapeHtml(rpg.rankObj.title)}</p>
            <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" style="width:${rpg.levelPct}%"></div>
            </div>
        </div>

        <div class="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow min-w-0 overflow-hidden">
            <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-purple-400 truncate">🧬 Memory Beast</span>
                <span class="text-[9px] font-mono font-bold text-emerald-300 shrink-0">🧠 ${rpg.avgMemoryRetention}%</span>
            </div>
            <p class="text-[11px] font-bold text-slate-200 truncate max-w-full">${escapeHtml(unfinVault[0]?.title || 'All Vault Chapters Locked In!')}</p>
            <div class="flex gap-1">
                ${unfinVault[0] ? `<button type="button" onclick="window.openProtocolRunModal('vault', '${escapeJsStr(unfinVault[0].id)}')" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-1 rounded-lg text-[9px] font-extrabold truncate">⚡ Run Top</button>` : ''}
                <button type="button" onclick="switchPage('page-vault'); activateVaultSubview('neet');" class="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg text-[9px] font-bold shrink-0">Vault</button>
            </div>
        </div>

        <div class="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-2.5 flex flex-col justify-between gap-1.5 shadow min-w-0 overflow-hidden">
            <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-cyan-400 truncate">📊 Analytics & Cards</span>
                <span class="text-[9px] font-mono font-bold text-emerald-300 shrink-0">🃏 ${fsrsCards.length} Cards</span>
            </div>
            <div class="flex gap-1 mt-0.5">
                <button type="button" onclick="window.openManualFlashcardCreatorModal()" class="flex-1 bg-purple-600/25 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 py-1.5 rounded-lg text-[9px] font-extrabold truncate">🃏 +Flashcard</button>
                <button type="button" onclick="window.openTodoAnalyticsModal('12m')" class="flex-1 bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 py-1.5 rounded-lg text-[9px] font-extrabold truncate">📈 4-Graphs</button>
            </div>
        </div>
    `;
};

/* =========================================================================
   6. POLYMATH & MEMORY BEAST RPG LEVELING, 5-PILLAR SKILL TREE & BOSS RAID
   ========================================================================= */
const RPG_RANKS = [
    { minLv: 0, title: 'Unranked Seeker', badge: '🪨', color: 'text-slate-400' },
    { minLv: 2, title: 'Bronze Initiate', badge: '🥉', color: 'text-amber-500' },
    { minLv: 5, title: 'Silver Scholar', badge: '🥈', color: 'text-slate-200' },
    { minLv: 10, title: 'Gold Anatomist & Historian', badge: '🥇', color: 'text-yellow-400' },
    { minLv: 18, title: 'Platinum Polymath', badge: '💠', color: 'text-cyan-300' },
    { minLv: 28, title: 'Emerald Memory Beast', badge: '❇️', color: 'text-emerald-400' },
    { minLv: 40, title: 'Diamond Sage of Sciences', badge: '💎', color: 'text-blue-400' },
    { minLv: 55, title: 'Crimson Grand Polymath', badge: '🔥', color: 'text-red-400' },
    { minLv: 75, title: 'Immortal Sovereign of Knowledge', badge: '👑', color: 'text-purple-400' },
    { minLv: 100, title: 'Apex Universal Polymath (∞)', badge: '🌌', color: 'text-amber-300' }
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
    const totalXP = Math.round((studyMins * 10) + (deenMins * 15) + salahXP + (readMins * 14) + (sessions * 40) + (dayTodosDone * 60) + (dayVaultDone * 95));
    return { studyMins, deenMins, salahCount, readMins, sessions, dayTodosDone, dayVaultDone, totalXP };
}

window.calculateLifetimeRPGStats = function() {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const rLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    const books = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const mcqs = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const fsrsCards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));

    const allDates = new Set([
        ...Object.keys(stats.history || {}),
        ...Object.keys(deenHistory || {}),
        ...Object.keys(salahHistory || {}),
        ...Object.keys(rLog),
        getLocalTodayString()
    ]);

    let lifetimeXP = 0, activeDaysCount = 0, earnedShieldDays = 0, totalDeenMins = 0, totalSalahLogged = 0, totalReadMins = 0;
    const studyTargetMins = (extConfig.studyTargetHours || 8.0) * 60;

    allDates.forEach(d => {
        const m = getDayMetrics(d, stats, rLog, vaultTasks);
        if (m.totalXP > 0) activeDaysCount++;
        if (m.salahCount === 5 && m.studyMins >= studyTargetMins * 0.8) earnedShieldDays++;
        totalDeenMins += m.deenMins;
        totalSalahLogged += m.salahCount;
        totalReadMins += m.readMins;
        lifetimeXP += m.totalXP;
    });

    const manualShieldBonus = parseInt(safeGet('pages_pomodoro_streak_shields_v14', '1')) || 1;
    const streakShields = Math.min(12, manualShieldBonus + earnedShieldDays);

    const completedTodos = todos.filter(t => t.completed).length;
    const completedVault = vaultTasks.filter(t => t.completed).length;
    const pendingVault = vaultTasks.filter(t => !t.completed).length;
    let totalAnnotations = 0, totalPagesRead = 0, memoryBonusTotal = 0;

    books.forEach(b => {
        totalAnnotations += (b.annotations || []).length;
        totalPagesRead += Math.max(0, (b.currentPage || 1) - 1);
    });
    vaultTasks.forEach(vt => {
        memoryBonusTotal += (vt.memoryBonusXP || 0);
    });

    const avgMemoryRetention = vaultTasks.length
        ? Math.round(vaultTasks.reduce((acc, vt) => acc + window.computeMemoryRetentionPct(vt), 0) / vaultTasks.length)
        : 100;

    lifetimeXP += (completedTodos * 55) + (completedVault * 95) + (totalAnnotations * 25) + (totalPagesRead * 18) + memoryBonusTotal + (fsrsCards.length * 30);

    const level = Math.floor(Math.sqrt(lifetimeXP / 120));
    const currentLevelFloorXP = Math.pow(level, 2) * 120;
    const nextLevelCeilingXP = Math.pow(level + 1, 2) * 120;
    const xpIntoLevel = lifetimeXP - currentLevelFloorXP;
    const xpNeededForNext = Math.max(1, nextLevelCeilingXP - currentLevelFloorXP);
    const levelPct = Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100));

    const lastRecordedLv = parseInt(safeGet('pages_pomodoro_last_notified_lv_v15', '0')) || 0;
    if (level > lastRecordedLv && level >= 1) {
        safeSet('pages_pomodoro_last_notified_lv_v15', String(level));
        setTimeout(() => {
            if (window.triggerForceAchievementNotification) {
                let rankNow = RPG_RANKS[0];
                for (const r of RPG_RANKS) { if (level >= r.minLv) rankNow = r; }
                window.triggerForceAchievementNotification(
                    `⚔️ LEVEL UP! You Reached Level ${level} (${rankNow.title})!`,
                    `Lifetime XP: ${lifetimeXP.toLocaleString()} XP • Memory Retention: ${avgMemoryRetention}% • Keep dominating your goals!`,
                    rankNow.badge,
                    `lv_up_${level}`
                );
            }
        }, 500);
    }

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
    const consistencyScore = Math.min(99.9, Math.round((Math.min(1, (activeDaysCount + streakShields) / 30) * 60 + (todayM.totalXP >= yestM.totalXP && todayM.totalXP > 0 ? 40 : 25)) * 10) / 10);
    const executionScore = Math.min(99.9, Math.round((Math.min(1, (completedTodos + completedVault * 2 + totalPagesRead) / 50) * 100) * 10) / 10);

    let totalMcqCor = 0;
    Object.values(mcqs).forEach(dayObj => {
        Object.values(dayObj || {}).forEach(s => { totalMcqCor += (s.c || 0); });
    });

    const polymathPillars = [
        {
            icon: '🩺',
            name: 'Medical Science & Biology',
            desc: 'Anatomy, Physiology, Pathology, Pharmacology & Clinical Mastery',
            xp: (completedVault * 180) + (totalMcqCor * 12) + (fsrsCards.length * 35),
            color: 'from-blue-600 to-cyan-400'
        },
        {
            icon: '🏛️',
            name: 'World History & Civilizations',
            desc: 'Historical Eras, Empires, Biographies & Geopolitical Evolution',
            xp: (totalPagesRead * 22) + (totalReadMins * 14) + (books.length * 90),
            color: 'from-amber-600 to-yellow-400'
        },
        {
            icon: '🧠',
            name: 'Human Behavior & Psychology',
            desc: 'Cognitive Biases, Neurobiology, Discipline & Behavioral Laws',
            xp: (activeDaysCount * 140) + (completedTodos * 65) + memoryBonusTotal,
            color: 'from-purple-600 to-pink-400'
        },
        {
            icon: '🌌',
            name: 'Universe & Existence Purpose',
            desc: 'Cosmology, Theoretical Physics, Philosophy & Deep Reflection',
            xp: (totalAnnotations * 45) + (totalPagesRead * 18) + (fsrsCards.length * 40),
            color: 'from-indigo-600 to-violet-400'
        },
        {
            icon: '🕌',
            name: 'Deen, Imaan & Eternal Akhirah',
            desc: '5/5 Salah Khushu, Quran, Tafseer, Hadith & Prophetic Character',
            xp: (totalSalahLogged * 110) + (totalDeenMins * 18) + (streakShields * 200),
            color: 'from-emerald-600 to-teal-400'
        }
    ].map(p => {
        const pLv = Math.floor(Math.sqrt(p.xp / 80)) + 1;
        const pPct = Math.min(100, Math.round(((p.xp % 400) / 400) * 100));
        return { ...p, level: pLv, pct: pPct };
    });

    const subjectTrees = (extConfig.customSubjects || ['Physics', 'Chemistry', 'Biology']).map(subj => {
        const subjVaultDone = vaultTasks.filter(t => t.subject === subj && t.completed).length;
        let subjMcqCor = 0;
        Object.values(mcqs).forEach(dayObj => {
            if (dayObj && dayObj[subj]) subjMcqCor += (dayObj[subj].c || 0);
        });
        const subjXP = (subjVaultDone * 180) + (subjMcqCor * 10);
        const sLv = Math.floor(Math.sqrt(subjXP / 60)) + 1;
        const sPct = Math.min(100, Math.round(((subjXP % 300) / 300) * 100));
        return { name: subj, xp: subjXP, level: sLv, pct: sPct, chapters: subjVaultDone, mcqs: subjMcqCor };
    });

    const bossMaxHP = 10000;
    const bossDamageDealt = Math.min(bossMaxHP, (todayM.totalXP * 3) + (totalPagesRead * 25) + (totalMcqCor * 15));
    const bossRemainingHP = Math.max(0, bossMaxHP - bossDamageDealt);
    const bossHpPct = Math.round((bossRemainingHP / bossMaxHP) * 100);

    return {
        lifetimeXP, level, xpIntoLevel, xpNeededForNext, levelPct, rankObj,
        todayM, yestM, xpDelta, pctBetter, streakShields, avgMemoryRetention,
        polymathPillars, subjectTrees, bossMaxHP, bossRemainingHP, bossHpPct,
        disciplineScore, consistencyScore, readingScore: executionScore,
        totalPagesRead, totalAnnotations, activeDaysCount,
        completedTodos, completedVault, pendingVault,
        fsrsCardsCount: fsrsCards.length
    };
};

function generateProDeveloperTacticalSuggestions(rpg) {
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const decayingTasks = vaultTasks.filter(t => window.computeMemoryRetentionPct(t) < 80);
    const unfinVault = vaultTasks.filter(t => !t.completed);
    const tips = [];

    if (decayingTasks.length > 0) {
        const topDecay = decayingTasks[0];
        tips.push({
            badge: `🧬 MEMORY DECAY ALERT (${window.computeMemoryRetentionPct(topDecay)}%)`,
            text: `"${topDecay.title}" is dropping on the forgetting curve! Click ⚡ Recall now to restore 100% retention and claim 2.0x XP!`,
            btnLabel: `⚡ Recall Now (+2x XP)`,
            action: `window.quickBoostMemoryStability('${escapeJsStr(topDecay.id)}')`
        });
    }
    if (unfinVault.length > 0) {
        const topV = unfinVault[0];
        tips.push({
            badge: `📚 VAULT (${topV.subject})`,
            text: `You have ${unfinVault.length} active Vault chapters. Launch "${topV.title}" into Live Protocol now for +95 XP!`,
            btnLabel: `▶️ Run "${topV.title.slice(0, 16)}"`,
            action: `window.openProtocolRunModal('vault', '${escapeJsStr(topV.id)}')`
        });
    }
    if (rpg.todayM.salahCount < 5) {
        tips.push({
            badge: `🕋 SALAH + SHIELD BONUS`,
            text: `Complete ${5 - rpg.todayM.salahCount} more Salah today to unlock the +250 XP Perfect 5/5 Imaan Bonus & Streak Shield!`,
            btnLabel: `🕌 Log Salah`,
            action: `switchPage('page-timer')`
        });
    }
    tips.push({
        badge: `🃏 MEMORY BEAST FLASHCARDS`,
        text: `Build active-recall FSRS flashcards or review your 4-Graph Multi-Horizon Progression up to 3 Years!`,
        btnLabel: `🃏 +Flashcard`,
        action: `window.openManualFlashcardCreatorModal()`
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
        { title: '🕋 Pray 5/5 Salah on Time', done: rpg.todayM.salahCount >= 5, prog: `${rpg.todayM.salahCount}/5`, reward: '+750 XP + 🛡️' },
        { title: '🧬 Maintain 85%+ Memory Beast Retention', done: rpg.avgMemoryRetention >= 85, prog: `${rpg.avgMemoryRetention}%`, reward: '2.0x XP Boost' },
        { title: '🧠 Complete 4.0h Deep Study on Timer', done: rpg.todayM.studyMins >= 240, prog: `${(rpg.todayM.studyMins / 60).toFixed(1)}/4.0h`, reward: '+400 XP' },
        { title: '📖 Read 15+ Pages in PomoReader Pro', done: rpg.totalPagesRead >= 15, prog: `${rpg.totalPagesRead}p Read`, reward: '+350 XP' }
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
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">Polymath & Memory Beast Ranker</span>
                            <span class="text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">🛡️ ${rpg.streakShields} Shields • 🧠 ${rpg.avgMemoryRetention}% Retention</span>
                        </div>
                        <h3 class="text-lg sm:text-xl font-extrabold ${rpg.rankObj.color} mt-1">${rpg.rankObj.title}</h3>
                        <p class="text-xs text-slate-400 font-mono">Lifetime: <b class="text-white">${rpg.lifetimeXP.toLocaleString()} XP</b> • 📖 <b class="text-amber-300">${rpg.totalPagesRead}p Read</b> • 📚 <b class="text-purple-400">${rpg.completedVault} Vault</b></p>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1.5">
                    <div class="text-right bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl">
                        <p class="text-[10px] font-bold uppercase text-slate-400">Global Standing</p>
                        <p class="text-base font-mono font-extrabold text-amber-400">Top ${(100 - Math.min(99.9, (rpg.disciplineScore + rpg.consistencyScore + rpg.readingScore) / 3)).toFixed(1)}% Worldwide</p>
                    </div>
                    <button type="button" onclick="window.openTodoAnalyticsModal('12m')" class="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow">📈 Open 4-Graph (Up to 3Y)</button>
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

        <!-- WEEKLY IGNORANCE & FORGETTING BOSS RAID -->
        <div class="bg-gradient-to-r from-red-950/80 via-slate-900 to-purple-950/80 border border-red-500/50 rounded-2xl p-4 flex flex-col gap-2 shadow-lg">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-2xl animate-pulse">🐉</span>
                    <div>
                        <span class="text-[9px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full">WEEKLY BOSS RAID</span>
                        <h4 class="text-xs sm:text-sm font-extrabold text-white mt-0.5">Arch-Titan of Forgetting & Procrastination</h4>
                    </div>
                </div>
                <span class="text-xs font-mono font-extrabold text-rose-300">${rpg.bossRemainingHP.toLocaleString()} / ${rpg.bossMaxHP.toLocaleString()} HP Left (${rpg.bossHpPct}%)</span>
            </div>
            <div class="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-red-800/60">
                <div class="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-500" style="width:${rpg.bossHpPct}%"></div>
            </div>
            <p class="text-[10px] text-slate-300">💡 Every Pomodoro minute, book page read, and FSRS Recall check deals direct damage to the Boss!</p>
        </div>

        <!-- 5-PILLAR POLYMATH MASTERY TREE -->
        <div class="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">🌌 5-Pillar Polymath & Medical Mastery Tree</span>
                <span class="text-[10px] font-mono text-emerald-400">🃏 Active Flashcards: ${rpg.fsrsCardsCount}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                ${rpg.polymathPillars.map(pil => `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-1.5">
                        <div>
                            <div class="flex items-center justify-between">
                                <span class="text-lg">${pil.icon}</span>
                                <span class="text-[10px] font-mono font-extrabold bg-slate-900 text-amber-300 px-2 py-0.5 rounded border border-slate-700">Lv.${pil.level}</span>
                            </div>
                            <h5 class="text-xs font-extrabold text-white mt-1">${escapeHtml(pil.name)}</h5>
                            <p class="text-[10px] text-slate-400 leading-snug mt-0.5">${escapeHtml(pil.desc)}</p>
                        </div>
                        <div>
                            <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-1">
                                <div class="h-full bg-gradient-to-r ${pil.color} rounded-full" style="width:${pil.pct}%"></div>
                            </div>
                            <span class="text-[9px] font-mono text-slate-400 mt-1 block">${pil.xp.toLocaleString()} XP (${pil.pct}%)</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- CUSTOM SUBJECT SKILL TREES -->
        <div class="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">🌳 Subject Vault Skill Trees (Chapters + Solved MCQs)</span>
                <button type="button" onclick="window.openCustomSubjectModal()" class="text-[10px] font-bold text-emerald-400 hover:underline">➕ Add Subject</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                ${rpg.subjectTrees.map(st => `
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
                        <div class="flex justify-between items-center">
                            <span class="text-xs font-extrabold text-white">${escapeHtml(st.name)}</span>
                            <span class="text-[10px] font-mono font-extrabold bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40">Lv.${st.level}</span>
                        </div>
                        <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div class="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" style="width:${st.pct}%"></div>
                        </div>
                        <p class="text-[10px] font-mono text-slate-400">${st.chapters} Chapters • ${st.mcqs} Correct MCQs (${st.xp} XP)</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 flex flex-col gap-2.5 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">🧠 Memory Beast Tactical Engine — Next Best Actions</span>
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
                    Today: <b>${rpg.todayM.totalXP} XP</b> (${(rpg.todayM.studyMins/60).toFixed(1)}h Study • ${rpg.todayM.dayTodosDone} Tasks • ${rpg.todayM.dayVaultDone} Vault • ${rpg.todayM.salahCount}/5 Salah)
                    &nbsp;|&nbsp; Yesterday: <b>${rpg.yestM.totalXP} XP</b>
                </p>
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
PomoEventBus.on('stats:rendered', renderAdvancedProfileTelemetry);
PomoEventBus.on('todos:updated', updateTopBarRpgBadge);
PomoEventBus.on('vault:updated', () => { renderTasks(activeTaskTab); updateTopBarRpgBadge(); });
PomoEventBus.on('vault:remoteUpdated', () => { renderTasks(activeTaskTab); updateTopBarRpgBadge(); });
PomoEventBus.on('compass:remoteUpdated', renderCompassView);
PomoEventBus.on('vault:tabOpened', () => { renderCompassView(); renderTasks(activeTaskTab); renderRpgArena(); });
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
renderAdvancedProfileTelemetry();
updateTopBarRpgBadge();
setTimeout(() => { if (window.renderOmniBentoStrip) window.renderOmniBentoStrip(); }, 250);
// ✅ END OF FILE (03-vault-rpg.js v16.0 Desktop) — 100% COMPLETE & UNCUT
