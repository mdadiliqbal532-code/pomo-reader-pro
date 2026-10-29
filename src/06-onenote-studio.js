/* =========================================================================
   06-ONENOTE-STUDIO.JS — POMONOTE & HYBRID SCRATCHPAD STUDIO (v17.2 UNCUT)
   DEDICATED STANDALONE MODULE FOR POMONOTE STUDIO:
   1. TRUE 50/50 SPLIT-SCREEN DOCK, DRAGGABLE RESIZER & FLOATING WINDOW MODE
   2. SIMULTANEOUS HYBRID A4 SHEET (TYPING + 11-TOOL VECTOR/INK CANVAS)
   3. MOVE/RESIZE HANDLES FOR DRAWN SHAPES, STAMPS, LABELS & SNIPPED DIAGRAMS
   4. ORGANIC / PHYSICAL / INORGANIC CHEMISTRY RINGS, MATH, PHYSICS & MED TOOLS
   5. SLIDE-OUT A4 PAGE DRAWER, REAL MULTI-PAGE PDF COMPILER & STORAGE PURGER
   ========================================================================= */
(function() {
    let currentBookId = null;
    let studioPages = [];
    let activePageIndex = 0;
    let studioMode = 'hybrid'; // 'hybrid' (Draw + Type), 'notes' (Type Only), 'canvas' (Draw Only)
    let currentTemplate = 'ruled'; // 'ruled' | 'grid' | 'graph' | 'cornell' | 'white'
    let isSplitDocked = true;

    let activeTool = 'pen'; // 'select'|'pen'|'hl'|'line'|'arrow'|'darrow'|'rect'|'circle'|'text'|'occlusion'|'eraser'
    let activeColor = '#38bdf8';
    let activeWidth = 3;
    let hybridPointerTarget = 'draw'; // 'draw' or 'type' in Hybrid mode
    let activeSymbolTab = 'chem'; // 'chem' | 'stamps' | 'math' | 'med'
    let selectedCanvasItemId = null;
    let legacyCanvasPathsMap = {};
    const imageElementCache = {};

    const MATH_PHYSICS_SYMBOLS = [
        '²', '³', '⁴', '⁻¹', '⁻²', '⁻³', '½', '⅓', '¼', '√', '∛',
        '∫', '∮', 'd/dx', '∂/∂t', '∑', '∏', '∆', '∇', '±', '∓',
        '×', '÷', '·', '≈', '≠', '≡', '≤', '≥', '≪', '≫', '∝', '∞',
        '→', '⇒', '⇔', '↑', '↓', 'α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ',
        'μ', 'ν', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Ω', 'Å', '⃗', '⊥', '∥'
    ];

    const PHYSICS_CONSTANTS = [
        { label: 'c (Light)', val: 'c = 3.0 × 10⁸ m/s' },
        { label: 'h (Planck)', val: 'h = 6.626 × 10⁻³⁴ J·s' },
        { label: 'G (Gravity)', val: 'G = 6.674 × 10⁻¹¹ N·m²/kg²' },
        { label: 'NA (Avogadro)', val: 'Nₐ = 6.022 × 10²³ mol⁻¹' },
        { label: 'R (Gas Const)', val: 'R = 8.314 J/(mol·K) = 0.0821 L·atm/(mol·K)' },
        { label: 'F (Faraday)', val: 'F = 96,485 C/mol' },
        { label: 'e (Charge)', val: 'e = 1.602 × 10⁻¹⁹ C' },
        { label: 'ε₀ (Permittivity)', val: 'ε₀ = 8.854 × 10⁻¹² C²/(N·m²)' }
    ];

    const CHEM_SYMBOLS = [
        '→', '⇌', '↔', '↑', '↓', '—(Δ)→', '—(hν)→', '—(cat.)→',
        'ΔG°', 'ΔH°', 'ΔS°', 'K_eq', 'K_c', 'K_p', 'K_sp', 'K_a', 'K_b', 'pK_a', 'pK_b',
        'pH = -log[H⁺]', 'E°_cell = E°_cathode - E°_anode', 'sp³', 'sp²', 'sp', 'dsp²', 'd²sp³',
        'σ-bond', 'π-bond', 'δ⁺', 'δ⁻', '⊕', '⊖', '• (Radical)', '∶ (Lone Pair)',
        '-OH', '-COOH', '-CHO', '-CO-', '-NH₂', '-CN', '-NO₂', '-SO₃H', '-X (Halogen)',
        'SN1', 'SN2', 'E1', 'E2', '+I Effect', '-I Effect', '+M / +R', '-M / -R'
    ];

    const CHEM_BIO_STAMPS = [
        { id: 'benzene', icon: '⬡', label: 'Benzene Ring' },
        { id: 'cyclohexane', icon: '⎔', label: 'Cyclohexane' },
        { id: 'cyclopentane', icon: '⬠', label: 'Cyclopentane' },
        { id: 'chair', icon: '🪑', label: 'Chair Conf.' },
        { id: 'newman', icon: '🔭', label: 'Newman Proj.' },
        { id: 'fischer', icon: '➕', label: 'Fischer Proj.' },
        { id: 'octahedral', icon: '⚛️', label: 'Octahedral [ML₆]' },
        { id: 'energy_curve', icon: '📈', label: 'Rxn Energy Graph' },
        { id: 'action_pot', icon: '⚡', label: 'Action Potential' },
        { id: 'axes_xy', icon: '📐', label: 'X-Y Graph Axes' }
    ];

    const MED_TEMPLATES = [
        { label: '🩺 Clinical Pearl', text: '\n🩺 [CLINICAL PEARL]: ' },
        { label: '⚠️ High-Yield NEET Trap', text: '\n⚠️ [NEET EXAM TRAP]: ' },
        { label: '🫀 Physiological Pathway', text: '\n🫀 [PATHWAY]: Stimulus ➔ Receptor ➔ Afferent ➔ Integration ➔ Efferent ➔ Effector\n' },
        { label: '💊 Pharm Mechanism', text: '\n💊 [DRUG MECHANISM]: Drug: ___ | Target: ___ | Effect: ___ | Side Effect: ___\n' },
        { label: '🧪 Normal Lab Values', text: '\n🧪 [LAB REF]: pH: 7.35–7.45 | pCO₂: 35–45 mmHg | HCO₃⁻: 22–26 mEq/L | GFR: ~125 mL/min\n' },
        { label: '🧬 Mnemonic Box', text: '\n🧬 [MEMORY BEAST MNEMONIC]: ' }
    ];

    function ensurePageStructure(pg, idx = 0) {
        if (!pg) {
            pg = { id: 'p_' + Date.now() + '_' + idx, title: `PomoNote Revision Sheet ${idx + 1}`, content: '', template: currentTemplate, items: [], redoStack: [] };
        }
        if (!Array.isArray(pg.items)) {
            pg.items = [];
            // Migrate any legacy strokes if present
            if (legacyCanvasPathsMap[pg.id] && Array.isArray(legacyCanvasPathsMap[pg.id])) {
                legacyCanvasPathsMap[pg.id].forEach((st, sIdx) => {
                    pg.items.push({
                        id: 'mig_' + Date.now() + '_' + sIdx,
                        tool: st.tool || 'pen',
                        color: st.color || '#38bdf8',
                        width: st.width || 3,
                        points: st.points || [],
                        x1: st.start?.x || 0,
                        y1: st.start?.y || 0,
                        x2: st.end?.x || 0,
                        y2: st.end?.y || 0
                    });
                });
            }
        }
        if (!Array.isArray(pg.redoStack)) pg.redoStack = [];
        return pg;
    }

    function getActivePageObj() {
        if (!studioPages.length) {
            studioPages.push(ensurePageStructure(null, 0));
        }
        if (activePageIndex < 0 || activePageIndex >= studioPages.length) {
            activePageIndex = 0;
        }
        studioPages[activePageIndex] = ensurePageStructure(studioPages[activePageIndex], activePageIndex);
        return studioPages[activePageIndex];
    }

    /* =========================================================================
       1. INITIALIZE, LOAD & SAVE POMONOTE STUDIO (INDEXEDDB)
       ========================================================================= */
    window.initPomoNoteStudioDock = async function(bookId) {
        currentBookId = bookId || (window.getActiveReaderBook && window.getActiveReaderBook()?.id) || 'general_notes';
        await loadNotesFromIDB();
        renderPomoNoteStudioDOM();
    };
    // Alias for backward compatibility with 04-reader-pro.js
    window.initOnenoteStudioDock = window.initPomoNoteStudioDock;

    window.closePomoNoteStudioDock = function() {
        const dock = document.getElementById('onenote-studio-dock');
        const resizer = document.getElementById('onenote-split-resizer');
        if (dock) dock.classList.add('hidden');
        if (resizer) resizer.classList.add('hidden');
    };
    window.closeOnenoteStudioDock = window.closePomoNoteStudioDock;

    async function loadNotesFromIDB() {
        try {
            const stored = await window.idbGet('bookFiles', 'notes_' + currentBookId);
            legacyCanvasPathsMap = stored?.canvasPathsMap || {};
            if (stored && Array.isArray(stored.studioPages) && stored.studioPages.length > 0) {
                studioPages = stored.studioPages.map((p, i) => ensurePageStructure(p, i));
            } else {
                studioPages = [ensurePageStructure(null, 0)];
            }
        } catch (e) {
            studioPages = [ensurePageStructure(null, 0)];
        }
        activePageIndex = 0;
        selectedCanvasItemId = null;
    }

    window.savePomoNoteToIDB = async function(silent = false) {
        if (!currentBookId) return;
        try {
            await window.idbPut('bookFiles', {
                id: 'notes_' + currentBookId,
                studioPages,
                updatedAt: Date.now()
            });
            if (!silent) window.showToast("💾 PomoNote saved (Typed Notes + Drawings + Diagrams)!");
        } catch (e) {}
    };
    window.saveNotesToIDB = window.savePomoNoteToIDB;
    window.saveOnenoteNotesToStorage = window.savePomoNoteToIDB;

    /* =========================================================================
       2. RENDER POMONOTE STUDIO SHELL & DRAGGABLE 50/50 SPLIT RESIZER
       ========================================================================= */
    function renderPomoNoteStudioDOM() {
        const dock = document.getElementById('onenote-studio-dock');
        const resizer = document.getElementById('onenote-split-resizer');
        if (!dock || !resizer) return;

        dock.classList.remove('hidden');
        resizer.classList.toggle('hidden', !isSplitDocked);
        dock.className = isSplitDocked
            ? "split-docked flex flex-col w-[50%] bg-slate-950 text-slate-100 overflow-hidden"
            : "floating-resizable flex flex-col bg-slate-950 text-slate-100 z-[285]";
        if (!isSplitDocked) {
            dock.style.width = '560px';
            dock.style.height = '740px';
            dock.style.top = '7vh';
            dock.style.right = '3vw';
        }

        const pg = getActivePageObj();
        currentTemplate = pg.template || currentTemplate;

        dock.innerHTML = `
            <!-- Top PomoNote Studio Header -->
            <div class="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-base">📝</span>
                    <span class="text-xs font-extrabold text-cyan-300 uppercase tracking-wider truncate">PomoNote & Hybrid Scratchpad</span>
                    <span id="onenote-page-count-badge" class="text-[9px] font-mono font-extrabold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">Page ${activePageIndex + 1}/${studioPages.length}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="window.togglePomoNoteDockMode()" class="bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold" title="Toggle Split-Screen vs Floating Window">${isSplitDocked ? '🗗 Float' : '◫ Split 50/50'}</button>
                    <button type="button" onclick="window.openPomoNotePageDrawerModal()" class="bg-slate-800 text-amber-300 px-2 py-1 rounded text-[10px] font-extrabold" title="Slide-Out A4 Pages Drawer">📚 Pages (${studioPages.length})</button>
                    <button type="button" onclick="window.closePomoNoteStudioDock()" class="bg-slate-800 text-red-400 px-2 py-1 rounded text-[10px] font-bold" title="Close PomoNote Studio">✕</button>
                </div>
            </div>

            <!-- Mode & A4 Paper Template Bar -->
            <div class="bg-slate-900/80 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div class="flex gap-1">
                    <button type="button" onclick="window.setPomoNoteStudioMode('hybrid')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'hybrid' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">✍️ Hybrid (Draw+Type)</button>
                    <button type="button" onclick="window.setPomoNoteStudioMode('notes')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'notes' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">📝 Type Only</button>
                    <button type="button" onclick="window.setPomoNoteStudioMode('canvas')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold ${studioMode === 'canvas' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400'}">✏️ Draw Only</button>
                </div>
                <div class="flex items-center gap-1">
                    <select id="onenote-template-sel" onchange="window.setPomoNotePaperTemplate(this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-300">
                        <option value="ruled" ${currentTemplate === 'ruled' ? 'selected' : ''}>📝 Ruled A4</option>
                        <option value="grid" ${currentTemplate === 'grid' ? 'selected' : ''}>⊞ Dot-Grid</option>
                        <option value="graph" ${currentTemplate === 'graph' ? 'selected' : ''}>📈 Graph Grid</option>
                        <option value="cornell" ${currentTemplate === 'cornell' ? 'selected' : ''}>📐 Cornell Notes</option>
                        <option value="white" ${currentTemplate === 'white' ? 'selected' : ''}>☀️ White Paper</option>
                    </select>
                </div>
            </div>

            <!-- 11-Tool Handwriting & Shape Studio Bar -->
            <div id="onenote-handwriting-toolbar-slot"></div>

            <!-- Specialized Chemistry, Vector Rings, Math/Physics & Medical Toolbars -->
            <div id="onenote-symbol-toolbars-slot"></div>

            <!-- Main Hybrid A4 Editor Stage -->
            <div class="flex-1 native-scroll p-3 flex flex-col bg-slate-950 relative" id="onenote-editor-stage"></div>

            <!-- Bottom Action Footer -->
            <div class="bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div class="flex gap-1.5">
                    <button type="button" onclick="window.addNewPomoNoteA4Page()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">➕ Add A4 Page</button>
                    <button type="button" onclick="window.exportPomoNoteAsPdf()" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">📦 Export Revision PDF</button>
                </div>
                <div class="flex gap-1.5">
                    <button type="button" onclick="window.savePomoNoteToIDB(false)" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold">💾 Save PomoNote</button>
                    <button type="button" onclick="window.purgeAllPomoNotesForBook()" class="bg-red-950/80 text-red-300 hover:bg-red-700 hover:text-white border border-red-800/50 px-2.5 py-1.5 rounded-xl text-xs font-bold" title="Delete all saved PomoNote pages for this book to free local storage">🗑️ Purge Notes</button>
                </div>
            </div>
        `;

        bindResizerEvents();
        renderHandwritingToolbar();
        renderSymbolToolbars();
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
        resizer.onpointerup = () => {
            isDragging = false;
            resizer.classList.remove('dragging');
        };
    }

    window.togglePomoNoteDockMode = function() {
        isSplitDocked = !isSplitDocked;
        renderPomoNoteStudioDOM();
        window.showToast(isSplitDocked ? "◫ PomoNote Split 50/50 Mode Active" : "🗗 PomoNote Floating Window Active");
    };
    window.toggleOnenoteDockMode = window.togglePomoNoteDockMode;

    window.setPomoNoteStudioMode = function(m) {
        studioMode = m;
        renderPomoNoteStudioDOM();
    };
    window.setOnenoteStudioMode = window.setPomoNoteStudioMode;

    window.setPomoNotePaperTemplate = function(tpl) {
        currentTemplate = tpl;
        const pg = getActivePageObj();
        pg.template = tpl;
        window.savePomoNoteToIDB(true);
        renderActivePageEditor();
    };
    window.setOnenotePaperTemplate = window.setPomoNotePaperTemplate;

    /* =========================================================================
       3. 11-TOOL HANDWRITING BAR & CHEM / MATH / PHYSICS / MED TOOLBARS
       ========================================================================= */
    function renderHandwritingToolbar() {
        const slot = document.getElementById('onenote-handwriting-toolbar-slot');
        if (!slot) return;

        if (studioMode === 'notes') {
            slot.innerHTML = '';
            return;
        }

        const tools = [
            { id: 'select', icon: '🖐️', title: 'Move / Resize Shapes, Rings & Diagrams' },
            { id: 'pen', icon: '✏️', title: 'Freehand Pen' },
            { id: 'hl', icon: '🖍️', title: 'Highlighter' },
            { id: 'line', icon: '📏', title: 'Straight Line' },
            { id: 'arrow', icon: '↗️', title: 'Reaction Arrow' },
            { id: 'darrow', icon: '↔️', title: 'Double / Resonance Arrow' },
            { id: 'rect', icon: '▭', title: 'Rectangle / Box' },
            { id: 'circle', icon: '⭕', title: 'Circle / Orbit' },
            { id: 'text', icon: '🔤', title: 'Place Floating Canvas Label' },
            { id: 'occlusion', icon: '🎭', title: 'Image Occlusion Mask (Click to Reveal!)' },
            { id: 'eraser', icon: '🧽', title: 'Eraser' }
        ];
        const colors = ['#38bdf8', '#34d399', '#facc15', '#fb7185', '#a78bfa', '#fb923c', '#ffffff', '#0f172a'];

        slot.innerHTML = `
            <div class="bg-slate-950 border-b border-slate-800 px-2.5 py-1.5 flex flex-col gap-1.5 shrink-0">
                <div class="flex items-center justify-between gap-1.5 flex-wrap">
                    <div class="flex items-center gap-1 flex-wrap">
                        ${studioMode === 'hybrid' ? `
                            <button type="button" onclick="window.togglePomoNoteHybridLayer()" class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${hybridPointerTarget === 'draw' ? 'bg-emerald-600 text-white border-emerald-400 shadow' : 'bg-blue-600 text-white border-blue-400 shadow'}" title="Switch whether mouse clicks Draw on top or Type text underneath (Stylus Pen always draws!)">
                                ${hybridPointerTarget === 'draw' ? '✏️ Draw Layer (Click for ⌨️ Type)' : '⌨️ Type Cursor (Click for ✏️ Draw)'}
                            </button>
                        ` : ''}
                        ${tools.map(t => `
                            <button type="button" onclick="window.setPomoNoteCanvasTool('${t.id}')" title="${t.title}" class="px-2 py-1 rounded-lg text-xs font-extrabold transition-all ${activeTool === t.id && (studioMode !== 'hybrid' || hybridPointerTarget === 'draw') ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}">
                                ${t.icon}
                            </button>
                        `).join('')}
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="window.undoPomoNoteCanvasItem()" class="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold" title="Undo Stroke/Shape">↩️</button>
                        <button type="button" onclick="window.redoPomoNoteCanvasItem()" class="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold" title="Redo Stroke/Shape">↪️</button>
                        <button type="button" onclick="window.clearPomoNotePageCanvas()" class="bg-slate-900 hover:bg-red-950 text-red-400 border border-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold" title="Clear All Drawings on This Page">🧹</button>
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-mono text-slate-400">Size:</span>
                        <input type="range" min="1" max="14" value="${activeWidth}" oninput="window.setPomoNoteStrokeWidth(this.value)" class="w-16 accent-amber-400 cursor-pointer">
                        <div class="flex items-center gap-1 ml-1">
                            ${colors.map(c => `
                                <button type="button" onclick="window.setPomoNotePenColor('${c}')" class="w-4 h-4 rounded-full border-2 transition-transform ${activeColor === c ? 'border-white scale-125 shadow' : 'border-slate-700'}" style="background:${c}"></button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="window.pasteLastSnippedBookDiagram()" class="bg-pink-600/25 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/40 px-2 py-0.5 rounded-lg text-[10px] font-extrabold" title="Paste Last Snipped Diagram from Book (📸 Snip)">📸 Paste Snip</button>
                        <button type="button" onclick="window.sendCurrentPomoNotePageToVault()" class="bg-purple-600/25 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 px-2 py-0.5 rounded-lg text-[10px] font-extrabold" title="Save this A4 Page into Memory Beast Study Vault">📌 To Vault</button>
                        <button type="button" onclick="window.sendCurrentPomoNotePageToFlashcard()" class="bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-2 py-0.5 rounded-lg text-[10px] font-extrabold" title="Convert this A4 Note into an FSRS Flashcard">🃏 +Card</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderSymbolToolbars() {
        const slot = document.getElementById('onenote-symbol-toolbars-slot');
        if (!slot) return;

        let bodyHtml = '';
        if (activeSymbolTab === 'math') {
            bodyHtml = `
                <div class="flex items-center gap-1 flex-wrap">
                    ${MATH_PHYSICS_SYMBOLS.map(sym => `<button type="button" onclick="window.insertSymbolIntoPomoNote('${escapeJsStr(sym)}')" class="px-1.5 py-0.5 bg-slate-900 hover:bg-cyan-600 hover:text-white text-cyan-300 border border-slate-800 rounded font-mono text-[11px] font-bold">${sym}</button>`).join('')}
                </div>
                <div class="flex items-center gap-1 flex-wrap pt-1 border-t border-slate-900">
                    ${PHYSICS_CONSTANTS.map(c => `<button type="button" onclick="window.insertSymbolIntoPomoNote('${escapeJsStr(c.val)}')" class="px-2 py-0.5 bg-slate-900 hover:bg-blue-600 text-blue-300 hover:text-white border border-slate-800 rounded font-mono text-[10px] font-bold">${escapeHtml(c.label)}</button>`).join('')}
                </div>
            `;
        } else if (activeSymbolTab === 'chem') {
            bodyHtml = `
                <div class="flex items-center gap-1 flex-wrap">
                    ${CHEM_SYMBOLS.map(sym => `<button type="button" onclick="window.insertSymbolIntoPomoNote('${escapeJsStr(sym)}')" class="px-2 py-0.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-slate-800 rounded font-mono text-[11px] font-bold">${escapeHtml(sym)}</button>`).join('')}
                </div>
            `;
        } else if (activeSymbolTab === 'stamps') {
            bodyHtml = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono text-emerald-400">1-Click Vector Stamps (Movable & Resizable on Canvas):</span>
                    ${CHEM_BIO_STAMPS.map(st => `
                        <button type="button" onclick="window.stampPomoNoteStructure('${st.id}')" class="px-2 py-1 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                            <span>${st.icon}</span><span>${escapeHtml(st.label)}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            bodyHtml = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${MED_TEMPLATES.map(m => `
                        <button type="button" onclick="window.insertSymbolIntoPomoNote('${escapeJsStr(m.text)}')" class="px-2 py-1 bg-slate-900 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-slate-800 rounded-lg text-[10px] font-bold">
                            ${escapeHtml(m.label)}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        slot.innerHTML = `
            <div class="bg-slate-950 border-b border-slate-800 px-2.5 py-1.5 flex flex-col gap-1.5 shrink-0">
                <div class="flex items-center gap-1">
                    <button type="button" onclick="window.setPomoNoteSymbolTab('chem')" class="px-2 py-0.5 rounded text-[10px] font-extrabold ${activeSymbolTab === 'chem' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-300'}">🧪 Chem Symbols & Eq</button>
                    <button type="button" onclick="window.setPomoNoteSymbolTab('stamps')" class="px-2 py-0.5 rounded text-[10px] font-extrabold ${activeSymbolTab === 'stamps' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-emerald-300'}">⬡ Chem Rings & Graphs</button>
                    <button type="button" onclick="window.setPomoNoteSymbolTab('math')" class="px-2 py-0.5 rounded text-[10px] font-extrabold ${activeSymbolTab === 'math' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-cyan-300'}">📐 Math & Physics</button>
                    <button type="button" onclick="window.setPomoNoteSymbolTab('med')" class="px-2 py-0.5 rounded text-[10px] font-extrabold ${activeSymbolTab === 'med' ? 'bg-purple-500 text-white' : 'bg-slate-900 text-purple-300'}">🩺 Medical & Bio</button>
                </div>
                <div class="max-h-20 native-scroll">${bodyHtml}</div>
            </div>
        `;
    }

    window.setPomoNoteSymbolTab = function(tab) {
        activeSymbolTab = tab;
        renderSymbolToolbars();
    };

    window.togglePomoNoteHybridLayer = function() {
        hybridPointerTarget = hybridPointerTarget === 'draw' ? 'type' : 'draw';
        renderHandwritingToolbar();
        applyHybridPointerLayering();
        if (hybridPointerTarget === 'type') {
            document.getElementById('onenote-textarea-main')?.focus();
        }
    };

    function applyHybridPointerLayering() {
        const canvas = document.getElementById('onenote-stylus-canvas');
        const ta = document.getElementById('onenote-textarea-main');
        if (!canvas || !ta) return;

        if (studioMode === 'notes') {
            canvas.style.pointerEvents = 'none';
            ta.style.pointerEvents = 'auto';
        } else if (studioMode === 'canvas') {
            canvas.style.pointerEvents = 'auto';
            ta.style.pointerEvents = 'none';
        } else {
            canvas.style.pointerEvents = hybridPointerTarget === 'draw' ? 'auto' : 'none';
            ta.style.pointerEvents = hybridPointerTarget === 'type' ? 'auto' : 'none';
        }
    }

    window.setPomoNoteCanvasTool = function(t) {
        activeTool = t;
        selectedCanvasItemId = null;
        hybridPointerTarget = 'draw';
        renderHandwritingToolbar();
        applyHybridPointerLayering();
        redrawActivePageCanvas();
    };

    window.setPomoNoteStrokeWidth = function(w) { activeWidth = Math.max(1, Math.min(16, parseInt(w) || 3)); };
    window.setPomoNotePenColor = function(c) {
        activeColor = c;
        if (selectedCanvasItemId) {
            const pg = getActivePageObj();
            const it = pg.items.find(x => x.id === selectedCanvasItemId);
            if (it) { it.color = c; redrawActivePageCanvas(); }
        }
        renderHandwritingToolbar();
    };

    window.insertSymbolIntoPomoNote = function(sym) {
        const pg = getActivePageObj();
        if (studioMode === 'canvas') {
            pg.items.push({
                id: 'it_' + Date.now(),
                tool: 'text',
                color: activeColor,
                width: activeWidth,
                x1: 80, y1: 120 + (pg.items.length * 24) % 400,
                x2: 260, y2: 150 + (pg.items.length * 24) % 400,
                text: sym.trim()
            });
            redrawActivePageCanvas();
            window.savePomoNoteToIDB(true);
            return;
        }

        hybridPointerTarget = 'type';
        renderHandwritingToolbar();
        applyHybridPointerLayering();

        const ta = document.getElementById('onenote-textarea-main');
        if (!ta) return;
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + sym + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + sym.length;
        ta.focus();
        pg.content = ta.value;
    };

    /* =========================================================================
       4. UNIFIED HYBRID A4 PAGE STAGE & INTERACTIVE 11-TOOL CANVAS
       ========================================================================= */
    function renderActivePageEditor() {
        const stage = document.getElementById('onenote-editor-stage');
        if (!stage) return;
        const pg = getActivePageObj();
        const tpl = pg.template || currentTemplate;

        const badge = document.getElementById('onenote-page-count-badge');
        if (badge) badge.textContent = `Page ${activePageIndex + 1}/${studioPages.length}`;

        stage.innerHTML = `
            <div class="mb-2 flex items-center justify-between gap-2 shrink-0">
                <div class="flex items-center gap-1.5 flex-1">
                    <button type="button" onclick="window.stepPomoNotePage(-1)" class="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold" title="Previous A4 Page">◀</button>
                    <input type="text" id="onenote-page-title-inp" value="${escapeHtml(pg.title || `PomoNote Revision Sheet ${activePageIndex + 1}`)}" onchange="window.updatePomoNotePageTitle(this.value)" placeholder="A4 Page Title (e.g. Cardiac Cycle, Organic SN1/SN2, Wave Optics)..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none">
                    <button type="button" onclick="window.stepPomoNotePage(1)" class="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold" title="Next A4 Page">▶</button>
                </div>
            </div>
            <div id="onenote-hybrid-sheet-wrap" class="relative w-full min-h-[880px] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                <textarea id="onenote-textarea-main"
                    oninput="window.updatePomoNotePageText(this.value)"
                    placeholder="Type structured study notes, equations & clinical pearls here — AND draw freehand diagrams, reaction arrows, chemical rings, or occlusion masks directly on top of this same A4 sheet!"
                    class="onenote-a4-page a4-tpl-${tpl} absolute inset-0 w-full h-full resize-none focus:outline-none font-mono z-10"
                    style="background-attachment: local;">${escapeHtml(pg.content || '')}</textarea>
                <canvas id="onenote-stylus-canvas" class="absolute inset-0 w-full h-full z-20 touch-none ${studioMode === 'notes' ? 'pointer-events-none' : 'cursor-crosshair'}"></canvas>
            </div>
        `;

        setTimeout(() => {
            initHybridA4Canvas();
            applyHybridPointerLayering();
        }, 40);
    }
    window.renderActivePageEditor = renderActivePageEditor;

    window.stepPomoNotePage = function(dir) {
        const next = activePageIndex + dir;
        if (next >= 0 && next < studioPages.length) {
            activePageIndex = next;
            selectedCanvasItemId = null;
            renderActivePageEditor();
        } else if (next >= studioPages.length) {
            window.addNewPomoNoteA4Page();
        }
    };

    window.updatePomoNotePageTitle = function(val) {
        const pg = getActivePageObj();
        pg.title = val;
        window.savePomoNoteToIDB(true);
    };

    window.updatePomoNotePageText = function(val) {
        const pg = getActivePageObj();
        pg.content = val;
    };

    function initHybridA4Canvas() {
        const canvas = document.getElementById('onenote-stylus-canvas');
        const wrap = document.getElementById('onenote-hybrid-sheet-wrap');
        const ta = document.getElementById('onenote-textarea-main');
        if (!canvas || !wrap) return;

        canvas.width = Math.max(520, wrap.clientWidth || 640);
        canvas.height = Math.max(880, wrap.clientHeight || 880);

        wrap.addEventListener('pointerdown', (ev) => {
            if (ev.pointerType === 'pen' && hybridPointerTarget !== 'draw') {
                hybridPointerTarget = 'draw';
                renderHandwritingToolbar();
                applyHybridPointerLayering();
            }
        }, { capture: true });

        canvas.ondblclick = () => {
            if (studioMode === 'hybrid') {
                hybridPointerTarget = 'type';
                renderHandwritingToolbar();
                applyHybridPointerLayering();
                ta?.focus();
                window.showToast("⌨️ Switched to Type Cursor (Click '✏️ Draw Layer' to draw)");
            }
        };

        let drawing = false;
        let draggingItem = null;
        let resizingItem = null;
        let startPt = { x: 0, y: 0 };
        let currentStroke = null;

        const getPt = (e) => {
            const r = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - r.left) * (canvas.width / Math.max(1, r.width)),
                y: (e.clientY - r.top) * (canvas.height / Math.max(1, r.height))
            };
        };

        canvas.onpointerdown = (e) => {
            if (studioMode === 'notes') return;
            const pt = getPt(e);
            const pg = getActivePageObj();

            // 1. Occlusion Mask Click-to-Reveal
            for (let i = pg.items.length - 1; i >= 0; i--) {
                const it = pg.items[i];
                if (it.tool === 'occlusion' && activeTool !== 'eraser' && activeTool !== 'select') {
                    const rx = Math.min(it.x1, it.x2), ry = Math.min(it.y1, it.y2);
                    const rw = Math.abs(it.x2 - it.x1), rh = Math.abs(it.y2 - it.y1);
                    if (pt.x >= rx && pt.x <= rx + rw && pt.y >= ry && pt.y <= ry + rh) {
                        it.revealed = !it.revealed;
                        redrawActivePageCanvas();
                        window.savePomoNoteToIDB(true);
                        return;
                    }
                }
            }

            // 2. Resize Handle Drag
            if (selectedCanvasItemId) {
                const selIt = pg.items.find(x => x.id === selectedCanvasItemId);
                if (selIt && selIt.x2 !== undefined && Math.hypot(pt.x - selIt.x2, pt.y - selIt.y2) <= 16) {
                    resizingItem = selIt;
                    canvas.setPointerCapture(e.pointerId);
                    return;
                }
            }

            // 3. Move/Select Tool
            if (activeTool === 'select') {
                const hit = findHitCanvasItem(pg.items, pt);
                if (hit) {
                    selectedCanvasItemId = hit.id;
                    draggingItem = hit;
                    startPt = pt;
                    canvas.setPointerCapture(e.pointerId);
                    redrawActivePageCanvas();
                } else {
                    selectedCanvasItemId = null;
                    redrawActivePageCanvas();
                }
                return;
            }

            // 4. Floating Canvas Text Label
            if (activeTool === 'text') {
                const label = prompt("Enter text or formula label to place on PomoNote canvas:");
                if (label && label.trim()) {
                    pg.items.push({
                        id: 'it_' + Date.now(),
                        tool: 'text',
                        color: activeColor,
                        width: activeWidth,
                        x1: pt.x, y1: pt.y,
                        x2: pt.x + 140, y2: pt.y + 28,
                        text: label.trim()
                    });
                    pg.redoStack = [];
                    redrawActivePageCanvas();
                    window.savePomoNoteToIDB(true);
                }
                return;
            }

            drawing = true;
            startPt = pt;
            canvas.setPointerCapture(e.pointerId);

            if (activeTool === 'eraser') {
                eraseCanvasItemsNear(pg, pt);
                redrawActivePageCanvas();
                return;
            }

            currentStroke = {
                id: 'it_' + Date.now(),
                tool: activeTool,
                color: activeColor,
                width: activeWidth,
                x1: pt.x, y1: pt.y,
                x2: pt.x, y2: pt.y,
                revealed: false,
                points: [pt]
            };
            pg.items.push(currentStroke);
            pg.redoStack = [];
            selectedCanvasItemId = currentStroke.id;
        };

        canvas.onpointermove = (e) => {
            const pt = getPt(e);
            const pg = getActivePageObj();

            if (resizingItem) {
                resizingItem.x2 = pt.x;
                resizingItem.y2 = pt.y;
                redrawActivePageCanvas();
                return;
            }

            if (draggingItem) {
                const dx = pt.x - startPt.x;
                const dy = pt.y - startPt.y;
                startPt = pt;
                if (draggingItem.x1 !== undefined) {
                    draggingItem.x1 += dx; draggingItem.y1 += dy;
                    if (draggingItem.x2 !== undefined) { draggingItem.x2 += dx; draggingItem.y2 += dy; }
                }
                if (Array.isArray(draggingItem.points)) {
                    draggingItem.points.forEach(p => { p.x += dx; p.y += dy; });
                }
                redrawActivePageCanvas();
                return;
            }

            if (!drawing) return;

            if (activeTool === 'eraser') {
                eraseCanvasItemsNear(pg, pt);
                redrawActivePageCanvas();
                return;
            }

            if (!currentStroke) return;
            if (activeTool === 'pen' || activeTool === 'hl') {
                currentStroke.points.push(pt);
            } else {
                currentStroke.x2 = pt.x;
                currentStroke.y2 = pt.y;
            }
            redrawActivePageCanvas();
        };

        canvas.onpointerup = () => {
            if (resizingItem || draggingItem || drawing) {
                resizingItem = null;
                draggingItem = null;
                drawing = false;
                currentStroke = null;
                window.savePomoNoteToIDB(true);
            }
        };

        redrawActivePageCanvas();
    }

    function findHitCanvasItem(items, pt) {
        for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            if (Array.isArray(it.points) && it.points.length > 1 && (it.tool === 'pen' || it.tool === 'hl')) {
                if (it.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) <= 16)) return it;
            } else if (it.x1 !== undefined && it.x2 !== undefined) {
                const minX = Math.min(it.x1, it.x2) - 12, maxX = Math.max(it.x1, it.x2) + 12;
                const minY = Math.min(it.y1, it.y2) - 12, maxY = Math.max(it.y1, it.y2) + 12;
                if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) return it;
            }
        }
        return null;
    }

    function eraseCanvasItemsNear(pg, pt) {
        pg.items = pg.items.filter(it => {
            if (Array.isArray(it.points) && it.points.length > 1 && (it.tool === 'pen' || it.tool === 'hl')) {
                return !it.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < 18);
            }
            const cx = ((it.x1 || 0) + (it.x2 || it.x1 || 0)) / 2;
            const cy = ((it.y1 || 0) + (it.y2 || it.y1 || 0)) / 2;
            return Math.hypot(cx - pt.x, cy - pt.y) >= 28;
        });
    }

    function drawArrowHead(ctx, x1, y1, x2, y2, size = 10) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    function drawChemicalOrBioStamp(ctx, it) {
        const x = Math.min(it.x1, it.x2), y = Math.min(it.y1, it.y2);
        const w = Math.max(40, Math.abs(it.x2 - it.x1)), h = Math.max(40, Math.abs(it.y2 - it.y1));
        const cx = x + w / 2, cy = y + h / 2;
        const r = Math.min(w, h) / 2;

        ctx.strokeStyle = it.color || '#34d399';
        ctx.fillStyle = it.color || '#34d399';
        ctx.lineWidth = it.width || 2.5;

        if (it.stampType === 'benzene' || it.stampType === 'cyclohexane') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            if (it.stampType === 'benzene') {
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (it.stampType === 'cyclopentane') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
                const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (it.stampType === 'chair') {
            ctx.beginPath();
            ctx.moveTo(x + w * 0.05, cy - h * 0.15);
            ctx.lineTo(x + w * 0.35, cy + h * 0.25);
            ctx.lineTo(x + w * 0.65, cy + h * 0.05);
            ctx.lineTo(x + w * 0.95, cy + h * 0.18);
            ctx.lineTo(x + w * 0.65, cy - h * 0.22);
            ctx.lineTo(x + w * 0.35, cy - h * 0.02);
            ctx.closePath();
            ctx.stroke();
        } else if (it.stampType === 'newman') {
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const a1 = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + r * 0.92 * Math.cos(a1), cy + r * 0.92 * Math.sin(a1));
                ctx.stroke();
                const a2 = a1 + Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(cx + r * 0.55 * Math.cos(a2), cy + r * 0.55 * Math.sin(a2));
                ctx.lineTo(cx + r * 0.95 * Math.cos(a2), cy + r * 0.95 * Math.sin(a2));
                ctx.stroke();
            }
        } else if (it.stampType === 'fischer') {
            ctx.beginPath();
            ctx.moveTo(cx, y); ctx.lineTo(cx, y + h);
            ctx.moveTo(x, y + h * 0.33); ctx.lineTo(x + w, y + h * 0.33);
            ctx.moveTo(x, y + h * 0.66); ctx.lineTo(x + w, y + h * 0.66);
            ctx.stroke();
        } else if (it.stampType === 'octahedral') {
            ctx.beginPath();
            ctx.moveTo(cx, y); ctx.lineTo(cx, y + h);
            ctx.moveTo(x, cy); ctx.lineTo(x + w, cy);
            ctx.moveTo(x + w * 0.2, y + h * 0.25); ctx.lineTo(x + w * 0.8, y + h * 0.75);
            ctx.moveTo(x + w * 0.8, y + h * 0.25); ctx.lineTo(x + w * 0.2, y + h * 0.75);
            ctx.stroke();
            ctx.font = 'bold 13px monospace';
            ctx.fillText('M', cx - 5, cy + 4);
        } else if (it.stampType === 'energy_curve' || it.stampType === 'action_pot' || it.stampType === 'axes_xy') {
            ctx.beginPath();
            ctx.moveTo(x + 12, y + 8);
            ctx.lineTo(x + 12, y + h - 12);
            ctx.lineTo(x + w - 8, y + h - 12);
            ctx.stroke();
            if (it.stampType === 'energy_curve') {
                ctx.beginPath();
                ctx.moveTo(x + 16, y + h * 0.65);
                ctx.bezierCurveTo(x + w * 0.35, y + h * 0.65, x + w * 0.4, y + 10, x + w * 0.5, y + 14);
                ctx.bezierCurveTo(x + w * 0.6, y + 18, x + w * 0.65, y + h * 0.82, x + w - 14, y + h * 0.82);
                ctx.stroke();
            } else if (it.stampType === 'action_pot') {
                ctx.beginPath();
                ctx.moveTo(x + 16, y + h * 0.75);
                ctx.lineTo(x + w * 0.28, y + h * 0.72);
                ctx.lineTo(x + w * 0.38, y + 14);
                ctx.lineTo(x + w * 0.55, y + h * 0.88);
                ctx.lineTo(x + w - 12, y + h * 0.75);
                ctx.stroke();
            }
        }
    }

    function renderItemsOntoContext(ctx, w, h, items, showSelectionHandles = true) {
        (items || []).forEach(it => {
            ctx.save();
            const col = it.color || '#38bdf8';
            ctx.strokeStyle = col;
            ctx.fillStyle = col;
            ctx.lineWidth = it.tool === 'hl' ? 22 : (it.width || 3);
            ctx.globalAlpha = it.tool === 'hl' ? 0.34 : 1.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if ((it.tool === 'pen' || it.tool === 'hl') && Array.isArray(it.points) && it.points.length > 0) {
                ctx.beginPath();
                it.points.forEach((pt, idx) => {
                    if (idx === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                });
                ctx.stroke();
            } else if (it.tool === 'line' || it.tool === 'arrow' || it.tool === 'darrow') {
                ctx.beginPath();
                ctx.moveTo(it.x1, it.y1);
                ctx.lineTo(it.x2, it.y2);
                ctx.stroke();
                if (it.tool === 'arrow' || it.tool === 'darrow') drawArrowHead(ctx, it.x1, it.y1, it.x2, it.y2, 11);
                if (it.tool === 'darrow') drawArrowHead(ctx, it.x2, it.y2, it.x1, it.y1, 11);
            } else if (it.tool === 'rect') {
                const rx = Math.min(it.x1, it.x2), ry = Math.min(it.y1, it.y2);
                const rw = Math.abs(it.x2 - it.x1), rh = Math.abs(it.y2 - it.y1);
                ctx.strokeRect(rx, ry, rw, rh);
            } else if (it.tool === 'circle') {
                const rx = Math.abs(it.x2 - it.x1) / 2, ry = Math.abs(it.y2 - it.y1) / 2;
                const cx = Math.min(it.x1, it.x2) + rx, cy = Math.min(it.y1, it.y2) + ry;
                ctx.beginPath();
                ctx.ellipse(cx, cy, Math.max(4, rx), Math.max(4, ry), 0, 0, Math.PI * 2);
                ctx.stroke();
            } else if (it.tool === 'text' && it.text) {
                ctx.font = `bold ${Math.max(14, (it.width || 3) * 5)}px ui-monospace, monospace`;
                ctx.fillText(it.text, it.x1, it.y1);
            } else if (it.tool === 'occlusion') {
                const rx = Math.min(it.x1, it.x2), ry = Math.min(it.y1, it.y2);
                const rw = Math.max(36, Math.abs(it.x2 - it.x1)), rh = Math.max(24, Math.abs(it.y2 - it.y1));
                if (it.revealed) {
                    ctx.strokeStyle = '#f59e0b';
                    ctx.setLineDash([6, 4]);
                    ctx.strokeRect(rx, ry, rw, rh);
                } else {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(rx, ry, rw, rh);
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(rx, ry, rw, rh);
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText('🎭 CLICK TO REVEAL', rx + 8, ry + rh / 2 + 4);
                }
            } else if (it.tool === 'stamp') {
                drawChemicalOrBioStamp(ctx, it);
            } else if (it.tool === 'image' && it.dataUrl) {
                let img = imageElementCache[it.dataUrl];
                if (!img) {
                    img = new Image();
                    img.onload = () => redrawActivePageCanvas();
                    img.src = it.dataUrl;
                    imageElementCache[it.dataUrl] = img;
                } else if (img.complete) {
                    const rx = Math.min(it.x1, it.x2), ry = Math.min(it.y1, it.y2);
                    const rw = Math.max(60, Math.abs(it.x2 - it.x1)), rh = Math.max(60, Math.abs(it.y2 - it.y1));
                    ctx.drawImage(img, rx, ry, rw, rh);
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(rx, ry, rw, rh);
                }
            }

            if (showSelectionHandles && selectedCanvasItemId === it.id && it.x2 !== undefined && it.y2 !== undefined) {
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(Math.min(it.x1, it.x2) - 4, Math.min(it.y1, it.y2) - 4, Math.abs(it.x2 - it.x1) + 8, Math.abs(it.y2 - it.y1) + 8);
                ctx.setLineDash([]);
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.arc(it.x2, it.y2, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    function redrawActivePageCanvas() {
        const canvas = document.getElementById('onenote-stylus-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pg = getActivePageObj();
        renderItemsOntoContext(ctx, canvas.width, canvas.height, pg.items, true);
    }

    /* =========================================================================
       5. STAMPERS, SNIPPED DIAGRAM PASTER, DRAWER, PURGER & A4 PDF EXPORTER
       ========================================================================= */
    window.stampPomoNoteStructure = function(stampType) {
        const pg = getActivePageObj();
        const offset = (pg.items.length * 22) % 260;
        const newItem = {
            id: 'stamp_' + Date.now(),
            tool: 'stamp',
            stampType,
            color: activeColor,
            width: Math.max(2, activeWidth),
            x1: 180 + offset,
            y1: 120 + offset,
            x2: 310 + offset,
            y2: 250 + offset
        };
        pg.items.push(newItem);
        selectedCanvasItemId = newItem.id;
        activeTool = 'select';
        hybridPointerTarget = 'draw';
        renderHandwritingToolbar();
        applyHybridPointerLayering();
        redrawActivePageCanvas();
        window.savePomoNoteToIDB(true);
        window.showToast(`⬡ Stamped ${stampType.toUpperCase()} — Drag to move or pull blue corner to resize!`);
    };

    window.insertSnippedDiagramIntoPomoNote = function(dataUrl, caption = '') {
        const dock = document.getElementById('onenote-studio-dock');
        if (dock && dock.classList.contains('hidden')) {
            const book = window.getActiveReaderBook ? window.getActiveReaderBook() : null;
            window.initPomoNoteStudioDock(book ? book.id : 'general_notes');
        }
        setTimeout(() => {
            const pg = getActivePageObj();
            const newItem = {
                id: 'img_' + Date.now(),
                tool: 'image',
                dataUrl,
                caption,
                x1: 60, y1: 140,
                x2: 380, y2: 360
            };
            pg.items.push(newItem);
            selectedCanvasItemId = newItem.id;
            activeTool = 'select';
            hybridPointerTarget = 'draw';
            renderHandwritingToolbar();
            applyHybridPointerLayering();
            redrawActivePageCanvas();
            window.savePomoNoteToIDB(true);
            window.showToast("📸 Snipped Diagram placed on PomoNote Page (Drag to position/resize)!");
        }, 120);
    };
    window.insertSnippedDiagramIntoOnenote = window.insertSnippedDiagramIntoPomoNote;

    window.pasteLastSnippedBookDiagram = function() {
        if (window.lastSnippedDiagramDataUrl) {
            window.insertSnippedDiagramIntoPomoNote(window.lastSnippedDiagramDataUrl, 'Snipped Figure');
        } else {
            window.showToast("Use '📸 Snip' on the bottom reader bar first to capture a book diagram!", true);
        }
    };

    window.undoPomoNoteCanvasItem = function() {
        const pg = getActivePageObj();
        if (pg.items.length > 0) {
            pg.redoStack.push(pg.items.pop());
            selectedCanvasItemId = null;
            redrawActivePageCanvas();
            window.savePomoNoteToIDB(true);
        }
    };

    window.redoPomoNoteCanvasItem = function() {
        const pg = getActivePageObj();
        if (pg.redoStack && pg.redoStack.length > 0) {
            pg.items.push(pg.redoStack.pop());
            redrawActivePageCanvas();
            window.savePomoNoteToIDB(true);
        }
    };

    window.clearPomoNotePageCanvas = function() {
        const pg = getActivePageObj();
        pg.items = [];
        pg.redoStack = [];
        selectedCanvasItemId = null;
        redrawActivePageCanvas();
        window.savePomoNoteToIDB(true);
        window.showToast("🧹 Cleared drawings on this PomoNote A4 page");
    };

    window.sendCurrentPomoNotePageToVault = function() {
        const pg = getActivePageObj();
        const book = window.getActiveReaderBook ? window.getActiveReaderBook() : null;
        if (window.saveNotebookLmReportToVault) {
            window.saveNotebookLmReportToVault(
                pg.title || 'PomoNote Revision Sheet',
                window.activeTaskSubj || 'Biology',
                pg.content || 'Visual A4 Revision Note',
                book?.id || null,
                book?.currentPage || 1
            );
        }
    };

    window.sendCurrentPomoNotePageToFlashcard = function() {
        const pg = getActivePageObj();
        const cards = JSON.parse(safeGet('pages_pomodoro_fsrs_cards_v15', '[]'));
        cards.unshift({
            id: 'fc_' + Date.now(),
            topic: window.activeTaskSubj || 'PomoNote Studio',
            front: pg.title || 'Explain this PomoNote Revision Sheet:',
            back: (pg.content || '').trim() || `Review visual diagram notes on ${pg.title}`,
            intervalDays: 1,
            stabilityPct: 95,
            lastReviewed: Date.now()
        });
        safeSet('pages_pomodoro_fsrs_cards_v15', JSON.stringify(cards));
        PomoEventBus.emit('vault:updated');
        window.showToast(`🃏 Saved "${pg.title}" to Memory Beast FSRS Flashcards!`);
    };

    window.addNewPomoNoteA4Page = function() {
        studioPages.push(ensurePageStructure({
            id: 'p_' + Date.now(),
            title: `PomoNote Revision Sheet ${studioPages.length + 1}`,
            content: '',
            template: currentTemplate,
            items: [],
            redoStack: []
        }, studioPages.length));
        activePageIndex = studioPages.length - 1;
        selectedCanvasItemId = null;
        window.savePomoNoteToIDB(true);
        renderPomoNoteStudioDOM();
        window.showToast(`➕ Added PomoNote A4 Page #${studioPages.length}!`);
    };
    window.addNewOnenoteA4Page = window.addNewPomoNoteA4Page;

    window.openPomoNotePageDrawerModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = `📚 PomoNote Slide-Out A4 Pages Drawer (${studioPages.length} Pages)`;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-2 max-h-72 native-scroll">
                ${studioPages.map((pg, idx) => `
                    <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border ${idx === activePageIndex ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800'}">
                        <div class="min-w-0 flex-1 cursor-pointer pr-2" onclick="window.switchActivePomoNotePage(${idx}); document.getElementById('reader-suboptions-modal').classList.add('hidden');">
                            <span class="text-[10px] font-mono text-cyan-400 font-extrabold">Page #${idx + 1} • ${(pg.items || []).length} Drawings</span>
                            <p class="text-xs font-bold text-white truncate mt-0.5">${escapeHtml(pg.title || 'Untitled Note')} (${(pg.content || '').length} chars)</p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="window.switchActivePomoNotePage(${idx}); document.getElementById('reader-suboptions-modal').classList.add('hidden');" class="bg-cyan-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg">📖 Open</button>
                            ${studioPages.length > 1 ? `<button type="button" onclick="window.deletePomoNoteA4Page(${idx}); window.openPomoNotePageDrawerModal();" class="text-red-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-xs">🗑️</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button type="button" onclick="document.getElementById('reader-suboptions-modal').classList.add('hidden'); window.addNewPomoNoteA4Page();" class="w-full bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs mt-2 shadow">➕ Create New PomoNote A4 Page</button>
        `;
        modal.classList.remove('hidden');
    };
    window.openOnenotePageDrawerModal = window.openPomoNotePageDrawerModal;

    window.switchActivePomoNotePage = function(idx) {
        if (studioPages[idx]) {
            activePageIndex = idx;
            selectedCanvasItemId = null;
            renderPomoNoteStudioDOM();
        }
    };
    window.switchActiveOnenotePage = window.switchActivePomoNotePage;

    window.deletePomoNoteA4Page = function(idx) {
        if (studioPages.length <= 1) return;
        studioPages.splice(idx, 1);
        if (activePageIndex >= studioPages.length) activePageIndex = studioPages.length - 1;
        window.savePomoNoteToIDB(true);
        renderPomoNoteStudioDOM();
        window.showToast("🗑️ PomoNote A4 Page deleted");
    };
    window.deleteOnenoteA4Page = window.deletePomoNoteA4Page;

    window.purgeAllPomoNotesForBook = async function() {
        if (!confirm("Are you sure you want to permanently delete all saved PomoNote A4 revision notes for this book?")) return;
        studioPages = [ensurePageStructure(null, 0)];
        activePageIndex = 0;
        selectedCanvasItemId = null;
        await window.idbDelete('bookFiles', 'notes_' + currentBookId);
        renderPomoNoteStudioDOM();
        window.showToast("🗑️ All saved PomoNote pages purged to free storage!");
    };
    window.purgeAllOnenoteNotesForBook = window.purgeAllPomoNotesForBook;

    window.exportPomoNoteAsPdf = async function() {
        if (!studioPages.length) return;

        if (typeof PDFLib === 'undefined') {
            const fullTxt = studioPages.map((pg, idx) => `==================== PAGE ${idx + 1}: ${pg.title} ====================\n\n${pg.content || ''}`).join('\n\n\n\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([fullTxt], { type: 'text/plain;charset=utf-8' }));
            a.download = `PomoNote_Revision_${currentBookId}_${getLocalTodayString()}.txt`;
            a.click();
            return;
        }

        window.showToast(`📦 Compiling ${studioPages.length} PomoNote Hybrid A4 Page(s) into PDF...`);
        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            const offCanvas = document.createElement('canvas');
            offCanvas.width = 794;
            offCanvas.height = 1123;
            const ctx = offCanvas.getContext('2d');

            for (let i = 0; i < studioPages.length; i++) {
                const pg = ensurePageStructure(studioPages[i], i);
                const isWhite = pg.template === 'white';
                ctx.fillStyle = isWhite ? '#fcfaf2' : '#0f172a';
                ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

                ctx.strokeStyle = isWhite ? 'rgba(59,130,246,0.18)' : 'rgba(56,189,248,0.14)';
                ctx.lineWidth = 1;
                for (let y = 70; y < offCanvas.height - 40; y += 28) {
                    ctx.beginPath();
                    ctx.moveTo(40, y);
                    ctx.lineTo(offCanvas.width - 40, y);
                    ctx.stroke();
                }

                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText(`📘 ${pg.title || `PomoNote Page ${i + 1}`}`, 42, 46);

                ctx.fillStyle = isWhite ? '#0f172a' : '#f8fafc';
                ctx.font = '14px monospace';
                const rawLines = (pg.content || '').split('\n');
                let cursorY = 92;
                rawLines.forEach(ln => {
                    const words = ln.split(' ');
                    let curLine = '';
                    words.forEach(w => {
                        if ((curLine + w).length > 78) {
                            ctx.fillText(curLine, 44, cursorY);
                            cursorY += 28;
                            curLine = w + ' ';
                        } else {
                            curLine += w + ' ';
                        }
                    });
                    if (curLine) {
                        ctx.fillText(curLine, 44, cursorY);
                        cursorY += 28;
                    }
                });

                renderItemsOntoContext(ctx, offCanvas.width, offCanvas.height, pg.items || [], false);

                const jpgUrl = offCanvas.toDataURL('image/jpeg', 0.9);
                const jpgBytes = await fetch(jpgUrl).then(r => r.arrayBuffer());
                const jpgEmbed = await pdfDoc.embedJpg(jpgBytes);
                const page = pdfDoc.addPage([595.28, 841.89]);
                page.drawImage(jpgEmbed, { x: 0, y: 0, width: 595.28, height: 841.89 });
            }

            const pdfBytes = await pdfDoc.save();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
            a.download = `PomoNote_Revision_Deck_${getLocalTodayString()}.pdf`;
            a.click();
            window.showToast(`✅ Exported ${studioPages.length}-Page PomoNote Revision PDF!`);
        } catch (err) {
            window.showToast("PDF export encountered an error", true);
        }
    };
    window.exportOnenoteNotesAsPdf = window.exportPomoNoteAsPdf;

    // Public Extension API for adding future PomoNote Studio features
    window.PomoNoteStudio = {
        open: window.initPomoNoteStudioDock,
        close: window.closePomoNoteStudioDock,
        addPage: window.addNewPomoNoteA4Page,
        stampStructure: window.stampPomoNoteStructure,
        insertSnip: window.insertSnippedDiagramIntoPomoNote,
        exportPdf: window.exportPomoNoteAsPdf,
        save: window.savePomoNoteToIDB
    };
})();
// ✅ END OF FILE (06-onenote-studio.js — PomoNote Studio v17.2 Standalone) — 100% COMPLETE & UNCUT
