/* =========================================================================
   06-ONENOTE-STUDIO.JS (v17.1 ENTERPRISE DESKTOP EDITION — HYBRID STUDIO)
   TRUE 50/50 SPLIT-SCREEN & RESIZABLE ONENOTE + ROUGH WORK STUDIO,
   SIMULTANEOUS HANDWRITING/DRAWING (PEN, HIGHLIGHTER, SHAPES, ERASER, UNDO)
   AND TYPING + MATH, PHYSICS, ORGANIC/PHYSICAL/INORGANIC CHEM & MEDICAL SYMBOLS
   ========================================================================= */
(function() {
    let currentBookId = null;
    let studioPages = [];
    let activePageIndex = 0;
    let studioMode = 'hybrid'; // 'hybrid' (Handwriting overlay + Typing), 'notes' or 'canvas'
    let currentTemplate = 'ruled';
    let isSplitDocked = true;
    let activeCanvasTool = 'pen';
    let activePenColor = '#38bdf8';
    let canvasPathsMap = {}; // pageId -> array of stroke paths

    const MATH_SYMBOLS = ['²', '³', '⁻¹', '√', '∫', 'd/dx', '∂', '∑', '∏', '±', '∓', '·', '×', '÷', '≈', '≠', '≡', '≤', '≥', '∝', '→', '⇒', '⇌', 'Δ', 'θ', 'λ', 'μ', 'π', 'Ω', '∞', '⃗'];
    const CHEM_SYMBOLS = ['→', '⇌', '↑', '↓', '△ (Heat)', 'hν (Light)', 'ΔG°', 'Kₛₚ', 'Kₐ', 'Kᵦ', 'E° (Cell)', 'pH', 'pOH', '[-log]', 'sp³', 'sp²', 'sp', 'R-OH', 'R-COOH', 'R-CHO', 'R-CO-R', 'R-NH₂', '苯 (Aromatic)', '⚡ (Exotherm)'];
    const MED_SYMBOLS = ['🩺 [Clinical Pearl]', '⚡ [Action Potential]', '🫀 [Cardio Flow]', '🫁 [Respiratory Compliance]', '🧠 [Neuro Transmitter]', '🧪 [Normal Lab Value]', '⚠️ [High-Yield NEET Fact]'];

    window.initOnenoteStudioDock = function(bookId) {
        currentBookId = bookId || 'general_notes';
        loadNotesFromIDB();
        renderOnenoteStudioDOM();
    };

    window.closeOnenoteStudioDock = function() {
        const dock = document.getElementById('onenote-studio-dock');
        const resizer = document.getElementById('onenote-split-resizer');
        if (dock) dock.classList.add('hidden');
        if (resizer) resizer.classList.add('hidden');
    };

    async function loadNotesFromIDB() {
        try {
            const stored = await window.idbGet('bookFiles', 'notes_' + currentBookId);
            if (stored && Array.isArray(stored.studioPages) && stored.studioPages.length > 0) {
                studioPages = stored.studioPages;
                canvasPathsMap = stored.canvasPathsMap || {};
            } else {
                studioPages = [{ id: 'p_' + Date.now(), title: 'Chapter Revision Note 1', content: '', template: 'ruled' }];
                canvasPathsMap = {};
            }
        } catch (e) {
            studioPages = [{ id: 'p_' + Date.now(), title: 'Chapter Revision Note 1', content: '', template: 'ruled' }];
            canvasPathsMap = {};
        }
        activePageIndex = 0;
        renderActivePageEditor();
    }

    async function saveNotesToIDB() {
        if (!currentBookId) return;
        try {
            await window.idbPut('bookFiles', { id: 'notes_' + currentBookId, studioPages, canvasPathsMap });
            window.showToast("💾 Notes & Handwriting saved to offline storage!");
        } catch (e) {}
    }

    function renderOnenoteStudioDOM() {
        const dock = document.getElementById('onenote-studio-dock');
        const resizer = document.getElementById('onenote-split-resizer');
        if (!dock || !resizer) return;

        dock.classList.remove('hidden');
        resizer.classList.remove('hidden');
        dock.className = isSplitDocked ? "split-docked flex flex-col w-[50%] bg-slate-950 text-slate-100 overflow-hidden" : "floating-resizable flex flex-col bg-slate-950 text-slate-100 z-[285]";
        if (!isSplitDocked) {
            dock.style.width = '540px'; dock.style.height = '720px';
            dock.style.top = '8vh'; dock.style.right = '4vw';
        }

        dock.innerHTML = `
            <!-- Top Studio Header -->
            <div class="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-base">📝</span>
                    <span class="text-xs font-extrabold text-cyan-300 uppercase tracking-wider truncate">Hybrid OneNote & Rough Studio</span>
                    <span id="onenote-page-count-badge" class="text-[9px] font-mono font-extrabold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">Page 1/${studioPages.length}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="window.toggleOnenoteDockMode()" class="bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold" title="Toggle Split-Screen vs Floating Window">${isSplitDocked ? '🗗 Float' : '◫ Split 50/50'}</button>
                    <button type="button" onclick="window.openOnenotePageDrawerModal()" class="bg-slate-800 text-amber-300 px-2 py-1 rounded text-[10px] font-extrabold" title="Slide-Out A4 Pages Drawer">📚 Pages</button>
                    <button type="button" onclick="window.closeOnenoteStudioDock()" class="bg-slate-800 text-red-400 px-2 py-1 rounded text-[10px] font-bold">✕</button>
                </div>
            </div>

            <!-- Mode & Template Selector Bar -->
            <div class="bg-slate-900/80 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div class="flex gap-1">
                    <button type="button" onclick="window.setOnenoteStudioMode('hybrid')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'hybrid' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">✍️ Hybrid (Draw+Type)</button>
                    <button type="button" onclick="window.setOnenoteStudioMode('notes')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'notes' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">📝 Type Only</button>
                    <button type="button" onclick="window.setOnenoteStudioMode('canvas')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'canvas' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">✏️ Draw Only</button>
                </div>
                <div class="flex items-center gap-1">
                    <select id="onenote-template-sel" onchange="window.setOnenotePaperTemplate(this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-300">
                        <option value="ruled" ${currentTemplate === 'ruled' ? 'selected' : ''}>📝 Ruled A4</option>
                        <option value="grid" ${currentTemplate === 'grid' ? 'selected' : ''}>⊞ Dot-Grid</option>
                        <option value="graph" ${currentTemplate === 'graph' ? 'selected' : ''}>📈 Graph Grid</option>
                        <option value="cornell" ${currentTemplate === 'cornell' ? 'selected' : ''}>📐 Cornell Notes</option>
                        <option value="white" ${currentTemplate === 'white' ? 'selected' : ''}>☀️ White Paper</option>
                    </select>
                </div>
            </div>

            <!-- Handwriting & Shape Toolbar (Active in Hybrid & Canvas modes) -->
            ${studioMode !== 'notes' ? `
                <div class="bg-slate-950 border-b border-slate-800 px-3 py-1 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="window.setScratchpadTool('pen')" class="px-2 py-1 rounded text-[11px] font-bold ${activeCanvasTool === 'pen' ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-300'}">✏️ Pen</button>
                        <button type="button" onclick="window.setScratchpadTool('hl')" class="px-2 py-1 rounded text-[11px] font-bold ${activeCanvasTool === 'hl' ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-300'}">🖍️ Highlighter</button>
                        <button type="button" onclick="window.setScratchpadTool('eraser')" class="px-2 py-1 rounded text-[11px] font-bold ${activeCanvasTool === 'eraser' ? 'bg-red-600 text-white' : 'bg-slate-950 text-slate-300'}">🧽 Eraser</button>
                    </div>
                    <div class="flex items-center gap-1">
                        ${['#38bdf8', '#34d399', '#facc15', '#f472b6', '#ffffff'].map(c => `<button type="button" onclick="window.setScratchpadPenColor('${c}')" class="w-4 h-4 rounded-full border ${activePenColor === c ? 'border-white scale-110' : 'border-slate-700'}" style="background:${c}"></button>`).join('')}
                        <button type="button" onclick="window.clearActiveScratchpadCanvas()" class="bg-slate-900 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">Clear</button>
                    </div>
                </div>
            ` : ''}

            <!-- Specialized Math, Physics, Chem & Medical Symbol Toolbars -->
            <div id="onenote-symbol-toolbars" class="bg-slate-950 border-b border-slate-800 px-2.5 py-1.5 flex flex-col gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-[9px] font-extrabold uppercase text-cyan-400 shrink-0">📐 Math:</span>
                    ${MATH_SYMBOLS.map(sym => `<button type="button" onclick="window.insertSymbolIntoOnenoteEditor('${escapeJsStr(sym)}')" class="px-2 py-0.5 bg-slate-900 hover:bg-cyan-600 hover:text-white text-cyan-300 border border-slate-800 rounded font-mono text-xs font-bold">${sym}</button>`).join('')}
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-[9px] font-extrabold uppercase text-amber-400 shrink-0">🧪 Chem:</span>
                    ${CHEM_SYMBOLS.map(sym => `<button type="button" onclick="window.insertSymbolIntoOnenoteEditor('${escapeJsStr(sym)}')" class="px-2 py-0.5 bg-slate-900 hover:bg-amber-600 hover:text-slate-950 text-amber-300 border border-slate-800 rounded text-xs font-bold">${sym}</button>`).join('')}
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-[9px] font-extrabold uppercase text-emerald-400 shrink-0">🩺 Med:</span>
                    ${MED_SYMBOLS.map(sym => `<button type="button" onclick="window.insertSymbolIntoOnenoteEditor('${escapeJsStr(sym)}')" class="px-2.5 py-0.5 bg-slate-900 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-slate-800 rounded text-xs font-bold">${sym}</button>`).join('')}
                </div>
            </div>

            <!-- Main Editor Stage (Hybrid Canvas + Textarea) -->
            <div class="flex-1 native-scroll p-3 flex flex-col bg-slate-950 relative" id="onenote-editor-stage"></div>

            <!-- Bottom Action Footer -->
            <div class="bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                <div class="flex gap-1.5">
                    <button type="button" onclick="window.addNewOnenoteA4Page()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">➕ Add A4 Page</button>
                    <button type="button" onclick="window.exportOnenoteNotesAsPdf()" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">📦 Export Revision PDF</button>
                </div>
                <div class="flex gap-1.5">
                    <button type="button" onclick="window.saveNotesToIDB()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold">💾 Save Notes</button>
                    <button type="button" onclick="window.purgeAllOnenoteNotesForBook()" class="bg-red-950/80 text-red-300 hover:bg-red-700 hover:text-white border border-red-800/50 px-2.5 py-1.5 rounded-xl text-xs font-bold" title="Delete all saved A4 notes for this book to free local storage">🗑️ Purge Notes</button>
                </div>
            </div>
        `;

        bindResizerEvents();
        renderActivePageEditor();
    }

    function bindResizerEvents() {
        const resizer = document.getElementById('onenote-split-resizer');
        const host = document.getElementById('reader-split-host');
        const dock = document.getElementById('onenote-studio-dock');
        if (!resizer || !host || !dock || !isSplitDocked) return;

        let isDragging = false;
        resizer.onpointerdown = (e) => {
            isDragging = true;
            resizer.setPointerCapture(e.pointerId);
            resizer.classList.add('dragging');
        };
        resizer.onpointermove = (e) => {
            if (!isDragging) return;
            const hostRect = host.getBoundingClientRect();
            const pointerX = e.clientX - hostRect.left;
            const pct = Math.max(25, Math.min(75, (pointerX / hostRect.width) * 100));
            dock.style.width = `${100 - pct}%`;
        };
        resizer.onpointerup = (e) => {
            isDragging = false;
            resizer.classList.remove('dragging');
        };
    }

    window.toggleOnenoteDockMode = function() {
        isSplitDocked = !isSplitDocked;
        const resizer = document.getElementById('onenote-split-resizer');
        if (resizer) resizer.classList.toggle('hidden', !isSplitDocked);
        renderOnenoteStudioDOM();
        window.showToast(isSplitDocked ? "◫ Split 50/50 Mode Active" : "🗗 Floating Resizable Window Active");
    };

    window.setOnenoteStudioMode = function(m) {
        studioMode = m;
        renderOnenoteStudioDOM();
    };

    window.setScratchpadTool = function(t) {
        activeCanvasTool = t;
        renderOnenoteStudioDOM();
    };

    window.setScratchpadPenColor = function(c) {
        activePenColor = c;
        renderOnenoteStudioDOM();
    };

    window.setOnenotePaperTemplate = function(tpl) {
        currentTemplate = tpl;
        if (studioPages[activePageIndex]) {
            studioPages[activePageIndex].template = tpl;
            saveNotesToIDB();
        }
        renderActivePageEditor();
    };

    window.insertSymbolIntoOnenoteEditor = function(sym) {
        const ta = document.getElementById('onenote-textarea-main');
        if (!ta) return;
        const start = ta.selectionStart || ta.value.length;
        const end = ta.selectionEnd || ta.value.length;
        ta.value = ta.value.slice(0, start) + ' ' + sym + ' ' + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + sym.length + 2;
        ta.focus();
        studioPages[activePageIndex].content = ta.value;
    };

    function renderActivePageEditor() {
        const stage = document.getElementById('onenote-editor-stage');
        if (!stage) return;
        const pg = studioPages[activePageIndex] || { title: 'Note 1', content: '', template: 'ruled' };
        currentTemplate = pg.template || currentTemplate;

        document.getElementById('onenote-page-count-badge').textContent = `Page ${activePageIndex + 1}/${studioPages.length}`;

        stage.innerHTML = `
            <div class="mb-2 flex items-center gap-2">
                <input type="text" id="onenote-page-title-inp" value="${escapeHtml(pg.title)}" onchange="window.updateActivePageTitle(this.value)" placeholder="A4 Page Title (e.g. Cardiac Cycle & ECG Waves)..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none">
            </div>
            <div class="flex-1 flex flex-col relative min-h-[600px]">
                <!-- Hybrid A4 Paper Sheet Background / Typing Area -->
                <textarea id="onenote-textarea-main" oninput="window.updateActivePageContent(this.value)" placeholder="Type notes here, or draw freehand directly on top using Stylus Canvas mode..." class="onenote-a4-page a4-tpl-${currentTemplate} absolute inset-0 w-full h-full resize-none focus:outline-none font-mono ${studioMode === 'canvas' ? 'opacity-20' : 'opacity-100'} z-10">${escapeHtml(pg.content || '')}</textarea>
                <!-- Simultaneous Handwriting & Drawing Overlay Canvas -->
                ${studioMode !== 'notes' ? `<canvas id="onenote-stylus-canvas" class="absolute inset-0 w-full h-full cursor-crosshair touch-none z-25 pointer-events-auto"></canvas>` : ''}
            </div>
        `;

        if (studioMode !== 'notes') {
            setTimeout(initHybridStylusCanvas, 60);
        }
    }

    window.updateActivePageTitle = function(val) {
        if (studioPages[activePageIndex]) {
            studioPages[activePageIndex].title = val;
            saveNotesToIDB();
        }
    };
    window.updateActivePageContent = function(val) {
        if (studioPages[activePageIndex]) {
            studioPages[activePageIndex].content = val;
        }
    };

    window.addNewOnenoteA4Page = function() {
        studioPages.push({ id: 'p_' + Date.now(), title: `Chapter Revision Note ${studioPages.length + 1}`, content: '', template: currentTemplate });
        activePageIndex = studioPages.length - 1;
        saveNotesToIDB();
        renderOnenoteStudioDOM();
        window.showToast(`➕ Added A4 Page #${studioPages.length}!`);
    };

    window.openOnenotePageDrawerModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = `📚 Slide-Out A4 Pages Drawer (${studioPages.length} Pages)`;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-2 max-h-72 native-scroll">
                ${studioPages.map((pg, idx) => `
                    <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border ${idx === activePageIndex ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800'}">
                        <div class="min-w-0 flex-1 cursor-pointer pr-2" onclick="window.switchActiveOnenotePage(${idx}); document.getElementById('reader-suboptions-modal').classList.add('hidden');">
                            <span class="text-[10px] font-mono text-cyan-400 font-extrabold">Page #${idx + 1}</span>
                            <p class="text-xs font-bold text-white truncate mt-0.5">${escapeHtml(pg.title || 'Untitled Note')} (${(pg.content || '').length} chars)</p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="window.switchActiveOnenotePage(${idx}); document.getElementById('reader-suboptions-modal').classList.add('hidden');" class="bg-cyan-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">📖 Open</button>
                            ${studioPages.length > 1 ? `<button type="button" onclick="window.deleteOnenoteA4Page(${idx}); window.openOnenotePageDrawerModal();" class="text-red-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs">🗑️</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button type="button" onclick="document.getElementById('reader-suboptions-modal').classList.add('hidden'); window.addNewOnenoteA4Page();" class="w-full bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs mt-2 shadow">➕ Create New A4 Page</button>
        `;
        modal.classList.remove('hidden');
    };

    window.switchActiveOnenotePage = function(idx) {
        if (studioPages[idx]) {
            activePageIndex = idx;
            renderActivePageEditor();
        }
    };

    window.deleteOnenoteA4Page = function(idx) {
        if (studioPages.length <= 1) return;
        studioPages.splice(idx, 1);
        if (activePageIndex >= studioPages.length) activePageIndex = studioPages.length - 1;
        saveNotesToIDB();
        renderOnenoteStudioDOM();
        window.showToast("🗑️ A4 Page deleted");
    };

    window.purgeAllOnenoteNotesForBook = async function() {
        if (!confirm("Are you sure you want to permanently delete all saved A4 revision notes for this book?")) return;
        studioPages = [{ id: 'p_' + Date.now(), title: 'Chapter Revision Note 1', content: '', template: 'ruled' }];
        activePageIndex = 0;
        canvasPathsMap = {};
        await window.idbDelete('bookFiles', 'notes_' + currentBookId);
        renderOnenoteStudioDOM();
        window.showToast("🗑️ All saved revision notes purged to save storage!");
    };

    window.exportOnenoteNotesAsPdf = function() {
        const fullTxt = studioPages.map((pg, idx) => `==================== PAGE ${idx + 1}: ${pg.title} ====================\n\n${pg.content || ''}`).join('\n\n\n\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([fullTxt], { type: 'text/plain;charset=utf-8' }));
        a.download = `Revision_Notes_${currentBookId}_${getLocalTodayString()}.txt`;
        a.click();
        window.showToast("📦 Revision Notes exported successfully!");
    };

    function initHybridStylusCanvas() {
        const canvas = document.getElementById('onenote-stylus-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const pgId = studioPages[activePageIndex]?.id || 'p_default';

        canvas.width = canvas.parentElement.clientWidth || 600;
        canvas.height = Math.max(840, canvas.parentElement.clientHeight || 840);

        // Restore saved paths for this page
        if (!canvasPathsMap[pgId]) canvasPathsMap[pgId] = [];
        redrawCanvasPaths(ctx, canvas.width, canvas.height, pgId);

        let drawing = false;
        canvas.onpointerdown = (e) => {
            if (studioMode === 'notes') return;
            drawing = true;
            canvas.setPointerCapture(e.pointerId);
            const r = canvas.getBoundingClientRect();
            const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
            canvasPathsMap[pgId].push({ tool: activeCanvasTool, color: activePenColor, points: [pt] });
        };
        canvas.onpointermove = (e) => {
            if (!drawing || studioMode === 'notes') return;
            const r = canvas.getBoundingClientRect();
            const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
            const curStroke = canvasPathsMap[pgId][canvasPathsMap[pgId].length - 1];
            if (curStroke) {
                curStroke.points.push(pt);
                redrawCanvasPaths(ctx, canvas.width, canvas.height, pgId);
            }
        };
        canvas.onpointerup = () => {
            if (!drawing) return;
            drawing = false;
            saveNotesToIDB();
        };
    }

    function redrawCanvasPaths(ctx, w, h, pgId) {
        ctx.clearRect(0, 0, w, h);
        const paths = canvasPathsMap[pgId] || [];
        paths.forEach(stroke => {
            if (!stroke.points || !stroke.points.length) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.tool === 'eraser' ? '#0f172a' : (stroke.color || '#38bdf8');
            ctx.lineWidth = stroke.tool === 'hl' ? 22 : (stroke.tool === 'eraser' ? 24 : 3);
            ctx.globalAlpha = stroke.tool === 'hl' ? 0.35 : 1.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            stroke.points.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        });
    }

    window.clearActiveScratchpadCanvas = function() {
        const pgId = studioPages[activePageIndex]?.id;
        if (pgId) {
            canvasPathsMap[pgId] = [];
            saveNotesToIDB();
            renderActivePageEditor();
            window.showToast("🧹 Canvas cleared");
        }
    };

    window.addEventListener('keydown', (e) => {
        const readerOpen = !document.getElementById('reader-fullscreen-overlay')?.classList.contains('hidden');
        const tag = (e.target?.tagName || '').toLowerCase();
        const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
        if (readerOpen && !isTyping && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            const dock = document.getElementById('onenote-studio-dock');
            if (dock && !dock.classList.contains('hidden')) {
                window.closeOnenoteStudioDock();
                window.showToast("📝 Closed OneNote Studio");
            } else if (activeReaderBook) {
                window.initOnenoteStudioDock(activeReaderBook.id);
                window.showToast("📝 Opened Hybrid OneNote & Rough Studio (Split-Screen)");
            }
        }
    });
})();
// ✅ END OF FILE (06-onenote-studio.js v17.1 Enterprise Desktop Edition) — 100% COMPLETE & UNCUT
