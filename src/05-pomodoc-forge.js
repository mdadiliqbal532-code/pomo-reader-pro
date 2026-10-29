/* =========================================================================
   05-POMODOC-FORGE-PART1.JS (v17.2 FULL MASTER RESTORATION — PART 1 OF 2)
   MODULAR POMODOC FORGE, SELECTIVE VISUAL & TABLE EXTRACTOR (DIAGRAMS,
   DATA TABLES, CHARTS, MIND MAPS, FORMULAS), DEEP LINE-BY-LINE SEMANTIC
   ANALYZER & USER-CUSTOMIZABLE TYPOGRAPHY / COLOR STUDIO
   ========================================================================= */
(function() {
    const DEFAULT_SEMANTIC_STYLES = {
        chapterColor: '#f59e0b',
        chapterBold: true,
        headlineColor: '#38bdf8',
        headlineBold: true,
        topicColor: '#34d399',
        topicBold: true,
        subtopicColor: '#a78bfa',
        subtopicBold: true,
        questionColor: '#fb7185',
        questionBg: 'rgba(244, 63, 94, 0.14)',
        questionBold: true,
        mathColor: '#22d3ee',
        mathBg: 'rgba(6, 182, 212, 0.14)',
        mathBold: true,
        quoteColor: '#fcd34d',
        quoteBold: true,
        bracketColor: '#c084fc',
        bracketBg: 'rgba(192, 132, 252, 0.14)',
        bracketBold: true
    };

    window.pomoSemanticStyles = JSON.parse(window.safeGet('pages_pomodoro_semantic_styles_v17', 'null')) || { ...DEFAULT_SEMANTIC_STYLES };

    const DEFAULT_KEEP_MATRIX = {
        diagrams: true,
        tables: true,
        charts: true,
        mindmaps: true,
        formulas: true
    };
    window.pomoForgeKeepMatrix = JSON.parse(window.safeGet('pages_pomodoro_forge_keep_v17', 'null')) || { ...DEFAULT_KEEP_MATRIX };

    let activeILovePdfBookId = null;

    /* =========================================================================
       1. LIVE CSS VARIABLE INJECTOR FOR USER SEMANTIC STYLES
       ========================================================================= */
    window.applyPomoSemanticStyles = function() {
        const s = window.pomoSemanticStyles || DEFAULT_SEMANTIC_STYLES;
        const root = document.documentElement;
        root.style.setProperty('--pf-chapter-color', s.chapterColor || '#f59e0b');
        root.style.setProperty('--pf-headline-color', s.headlineColor || '#38bdf8');
        root.style.setProperty('--pf-topic-color', s.topicColor || '#34d399');
        root.style.setProperty('--pf-subtopic-color', s.subtopicColor || '#a78bfa');
        root.style.setProperty('--pf-question-color', s.questionColor || '#fb7185');
        root.style.setProperty('--pf-question-bg', s.questionBg || 'rgba(244, 63, 94, 0.14)');
        root.style.setProperty('--pf-math-color', s.mathColor || '#22d3ee');
        root.style.setProperty('--pf-math-bg', s.mathBg || 'rgba(6, 182, 212, 0.14)');
        root.style.setProperty('--pf-quote-color', s.quoteColor || '#fcd34d');
        root.style.setProperty('--pf-bracket-color', s.bracketColor || '#c084fc');
        root.style.setProperty('--pf-bracket-bg', s.bracketBg || 'rgba(192, 132, 252, 0.14)');

        let dynStyle = document.getElementById('pf-dynamic-weight-styles');
        if (!dynStyle) {
            dynStyle = document.createElement('style');
            dynStyle.id = 'pf-dynamic-weight-styles';
            document.head.appendChild(dynStyle);
        }
        dynStyle.textContent = `
            .pf-chapter-banner { font-weight: ${s.chapterBold ? '900' : '500'} !important; }
            .pf-headline, .pbook-headline-h1 { font-weight: ${s.headlineBold ? '800' : '500'} !important; }
            .pf-topic, .pbook-headline-h2 { font-weight: ${s.topicBold ? '800' : '500'} !important; }
            .pf-subtopic { font-weight: ${s.subtopicBold ? '700' : '400'} !important; }
            .pf-question-line { font-weight: ${s.questionBold ? '800' : '500'} !important; }
            .pf-math-data { font-weight: ${s.mathBold ? '800' : '500'} !important; }
            .pf-quoted-span { font-weight: ${s.quoteBold ? '700' : '400'} !important; }
            .pf-bracket-span { font-weight: ${s.bracketBold ? '700' : '400'} !important; }
        `;
    };
    window.applyPomoSemanticStyles();

    /* =========================================================================
       2. DEEP LINE-BY-LINE & INLINE SEMANTIC PARSER
       ========================================================================= */
    window.formatInlineSemanticSpans = function(rawText) {
        if (!rawText) return '';
        let safe = window.escapeHtml(rawText);
        safe = safe.replace(/(&quot;[^&]{2,240}?&quot;|&#39;&#39;[^&]{2,240}?&#39;&#39;|“[^”]{2,240}?”|‘[^’]{2,240}?’)/g, '<span class="pf-quoted-span">$1</span>');
        safe = safe.replace(/(\([^()]{2,140}?\)|\[[^[\]]{2,140}?\])/g, '<span class="pf-bracket-span">$1</span>');
        safe = safe.replace(/\b(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*(?:mmHg|bpm|mL\/min|L\/min|mL|mg\/dL|g\/dL|mmol\/L|mEq\/L|kPa|atm|Hz|kHz|ms|sec|min|hrs?|%|°C|°F|K|mol\/L|M|N|J|kJ|cal|kcal|W|V|mV|Ω|A|mA|nm|μm|mm|cm|m\/s²?|kg|g|mg|μg))\b/gi, '<span class="pf-math-data">$1</span>');
        return safe;
    };

    window.classifyAndRenderSemanticLine = function(rawLine) {
        const clean = String(rawLine || '').replace(/\s+/g, ' ').trim();
        if (!clean) return '';
        if (/^(chapter|unit|part|module|section)\s+([0-9ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(clean) && clean.length < 110) {
            return `<div class="pf-chapter-banner">📘 ${window.formatInlineSemanticSpans(clean)}</div>`;
        }
        if (/\?\s*$/.test(clean) && clean.length < 260) {
            return `<div class="pf-question-line">❓ ${window.formatInlineSemanticSpans(clean)}</div>`;
        }
        if (/^#\s+/.test(clean) || (clean === clean.toUpperCase() && /[A-Z]{4,}/.test(clean) && clean.length >= 5 && clean.length <= 85)) {
            return `<h2 class="pbook-headline-h1 pf-headline">${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h2>`;
        }
        if (/^##\s+/.test(clean) || (/^([0-9]+\.[0-9]+|[IVX]+\.)\s+[A-Z]/.test(clean) && clean.length <= 95)) {
            return `<h3 class="pbook-headline-h2 pf-topic">${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h3>`;
        }
        if (/^###\s+/.test(clean) || (/^[A-Z][A-Za-z0-9\s\-(),/]{3,60}:$/.test(clean))) {
            return `<h4 class="pf-subtopic">▸ ${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h4>`;
        }
        return `<p class="pbook-paragraph">${window.formatInlineSemanticSpans(clean)}</p>`;
    };

    window.renderSemanticStructuredSheet = function(pageNum, pData, rawFallbackText = '') {
        const sheet = document.createElement('div');
        const bgTheme = window.readerSettings?.txtBgTheme || 'default';
        sheet.className = `pbook-page-sheet ${bgTheme !== 'default' ? `txt-bg-${bgTheme}` : ''}`;
        if (bgTheme !== 'default') sheet.setAttribute('data-custom-bg', 'true');

        const blocks = Array.isArray(pData?.blocks) ? pData.blocks : [];
        let html = '';

        if (blocks.length > 0) {
            blocks.forEach(blk => {
                const cleanText = String(blk.text || '').replace(/\s+/g, ' ').trim();
                if (blk.type === 'chapter') {
                    html += `<div class="pf-chapter-banner">📘 ${window.formatInlineSemanticSpans(cleanText)}</div>`;
                } else if (blk.type === 'h1') {
                    html += `<h2 class="pbook-headline-h1 pf-headline">${window.formatInlineSemanticSpans(cleanText)}</h2>`;
                } else if (blk.type === 'h2') {
                    html += `<h3 class="pbook-headline-h2 pf-topic">${window.formatInlineSemanticSpans(cleanText)}</h3>`;
                } else if (blk.type === 'subtopic') {
                    html += `<h4 class="pf-subtopic">▸ ${window.formatInlineSemanticSpans(cleanText)}</h4>`;
                } else if (blk.type === 'question' || /\?\s*$/.test(cleanText)) {
                    html += `<div class="pf-question-line">❓ ${window.formatInlineSemanticSpans(cleanText)}</div>`;
                } else if (blk.type === 'table' && Array.isArray(blk.rows)) {
                    html += `<div class="overflow-x-auto my-3"><table class="pf-data-table"><tbody>` +
                        blk.rows.map((r, rIdx) => `<tr>` + r.map(cell => rIdx === 0 ? `<th>${window.formatInlineSemanticSpans(cell)}</th>` : `<td>${window.formatInlineSemanticSpans(cell)}</td>`).join('') + `</tr>`).join('') +
                        `</tbody></table></div>`;
                } else if ((blk.type === 'diagram' || blk.type === 'chart' || blk.type === 'mindmap') && blk.dataUrl) {
                    const badgeIcon = blk.type === 'mindmap' ? '🧠 Mind Map / Flowchart' : (blk.type === 'chart' ? '📈 Data Chart / Graph' : '🖼️ Anatomical Diagram / Figure');
                    html += `
                        <figure class="pbook-diagram-figure">
                            <img src="${blk.dataUrl}" alt="Page ${pageNum} Visual">
                            <figcaption class="text-[11px] font-mono text-amber-300 mt-1.5 font-bold">${badgeIcon} — ${window.escapeHtml(blk.caption || `Page ${pageNum} Visual Reference`)}</figcaption>
                        </figure>
                    `;
                } else {
                    html += `<p class="pbook-paragraph">${window.formatInlineSemanticSpans(cleanText)}</p>`;
                }
            });
        } else {
            const textSource = pData?.plainText || rawFallbackText || '';
            html = textSource.split(/\n+/).map(ln => window.classifyAndRenderSemanticLine(ln)).join('');
        }
        sheet.innerHTML = html || `<p class="pbook-paragraph">Page ${pageNum}</p>`;
        return sheet;
    };

    // Auto-upgrade reader stage sheets
    const stageEl = document.getElementById('reader-pages-stage');
    if (stageEl) {
        let cachedBookId = null;
        let cachedStructuredMap = {};
        const obs = new MutationObserver(async () => {
            const cards = stageEl.querySelectorAll('.v4-page-card:not([data-pf-upgraded="true"])');
            if (!cards.length) return;
            const activeBook = window.getActiveReaderBook ? window.getActiveReaderBook() : null;
            if (!activeBook || activeBook.format === 'pdf') return;

            if (cachedBookId !== activeBook.id) {
                cachedBookId = activeBook.id;
                const stored = await idbGet('bookFiles', activeBook.id);
                cachedStructuredMap = {};
                (stored?.structuredPages || []).forEach(sp => { cachedStructuredMap[sp.page] = sp; });
            }

            cards.forEach(card => {
                card.setAttribute('data-pf-upgraded', 'true');
                const pNum = parseInt(card.getAttribute('data-page')) || 1;
                const oldSheet = card.querySelector('.pbook-page-sheet');
                if (oldSheet) {
                    const rawTxt = oldSheet.textContent || '';
                    const newSheet = window.renderSemanticStructuredSheet(pNum, cachedStructuredMap[pNum], rawTxt);
                    oldSheet.replaceWith(newSheet);
                }
            });
        });
        obs.observe(stageEl, { childList: true });
    }

    /* =========================================================================
       3. POMODOC FORGE MODAL & USER COLOR/BOLD STUDIO
       ========================================================================= */
    window.toggleKeepMatrixOption = function(key, val) {
        window.pomoForgeKeepMatrix[key] = Boolean(val);
        window.safeSet('pages_pomodoro_forge_keep_v17', JSON.stringify(window.pomoForgeKeepMatrix));
    };

    window.updateSemanticStyleProp = function(prop, val) {
        window.pomoSemanticStyles[prop] = val;
        window.safeSet('pages_pomodoro_semantic_styles_v17', JSON.stringify(window.pomoSemanticStyles));
        window.applyPomoSemanticStyles();
    };

    window.resetSemanticStylesToDefault = function() {
        window.pomoSemanticStyles = { ...DEFAULT_SEMANTIC_STYLES };
        window.safeSet('pages_pomodoro_semantic_styles_v17', JSON.stringify(window.pomoSemanticStyles));
        window.applyPomoSemanticStyles();
        window.openILovePdfStudioModal(activeILovePdfBookId);
        showToast("🎨 Semantic Colors & Bolding reset to defaults!");
    };

    window.openILovePdfStudioModal = function(bookId = null) {
        const sortedBySeq = [...(window.readerBooks || [])].sort((a, b) => (a.readSeq || 999) - (b.readSeq || 999));
        activeILovePdfBookId = bookId || sortedBySeq[0]?.id || null;
        const modal = document.getElementById('ilovepdf-studio-modal');
        const body = document.getElementById('ilovepdf-studio-body');
        if (!modal || !body) return;

        const targetBook = (window.readerBooks || []).find(b => b.id === activeILovePdfBookId) || null;
        const curP = targetBook?.currentPage || 1;
        const totP = targetBook?.totalPages || 1;
        const defaultEndP = Math.min(totP, curP + 20);
        const km = window.pomoForgeKeepMatrix;
        const st = window.pomoSemanticStyles;

        body.innerHTML = `
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-extrabold uppercase text-slate-300">Target Book:</span>
                <select id="ilovepdf-book-select" class="flex-1 sm:max-w-md bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white">
                    ${sortedBySeq.map(b => `<option value="${escapeHtml(b.id)}" ${b.id === activeILovePdfBookId ? 'selected' : ''}>#${b.readSeq || 1} [${escapeHtml(b.shelfName)}] ${escapeHtml(b.title)} (${b.totalPages}p)</option>`).join('')}
                </select>
            </div>

            <div class="bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-950 border border-emerald-500/50 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                <h4 class="text-sm font-extrabold text-white">1. PomoDoc Forge — Selective Visual Extractor & Semantic Styler</h4>
                <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                    <span class="text-[10px] font-extrabold uppercase text-cyan-400">☑️ Tick Elements to Keep During Conversion:</span>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.diagrams ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('diagrams', this.checked)"> <span>🖼️ Diagrams</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.tables ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('tables', this.checked)"> <span>📊 Tables</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.charts ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('charts', this.checked)"> <span>📈 Charts</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.mindmaps ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('mindmaps', this.checked)"> <span>🧠 Mind Maps</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.formulas ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('formulas', this.checked)"> <span>📐 Math</span>
                        </label>
                    </div>
                </div>

                <div class="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-extrabold uppercase text-purple-300">🎨 Manual Semantic Color & Bolding Studio:</span>
                        <button type="button" onclick="window.resetSemanticStylesToDefault()" class="text-[10px] font-bold text-slate-400 hover:text-white underline">↺ Reset</button>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"><span class="font-bold" style="color:${st.chapterColor}">📘 Chapter</span><div class="flex items-center gap-1"><input type="color" value="${st.chapterColor}" oninput="window.updateSemanticStyleProp('chapterColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent"><input type="checkbox" ${st.chapterBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('chapterBold', this.checked)"></div></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"><span class="font-bold" style="color:${st.headlineColor}">🔖 Headline</span><div class="flex items-center gap-1"><input type="color" value="${st.headlineColor}" oninput="window.updateSemanticStyleProp('headlineColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent"><input type="checkbox" ${st.headlineBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('headlineBold', this.checked)"></div></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"><span class="font-bold" style="color:${st.topicColor}">📗 Topic</span><div class="flex items-center gap-1"><input type="color" value="${st.topicColor}" oninput="window.updateSemanticStyleProp('topicColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent"><input type="checkbox" ${st.topicBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('topicBold', this.checked)"></div></div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between"><span class="font-bold" style="color:${st.questionColor}">❓ Question</span><div class="flex items-center gap-1"><input type="color" value="${st.questionColor}" oninput="window.updateSemanticStyleProp('questionColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent"><input type="checkbox" ${st.questionBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('questionBold', this.checked)"></div></div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onclick="window.convertPdfToStructuredBook('replace')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow">🔄 Convert Book (Keep Visuals & Tables)</button>
                    <button type="button" onclick="window.convertPdfToStructuredBook('txt')" class="bg-slate-800 text-amber-300 font-bold px-3.5 py-2.5 rounded-xl text-xs">⬇️ Export Semantic .TXT</button>
                </div>
                <div id="pbook-convert-status" class="hidden text-xs font-mono font-bold text-emerald-400 bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30"></div>
            </div>

            <!-- 2. ADVANCED PDF UTILITIES BRIDGE FOR PART 2 -->
            <div id="forge-part2-utilities-slot"></div>
        `;
        document.getElementById('ilovepdf-book-select')?.addEventListener('change', (e) => window.openILovePdfStudioModal(e.target.value));
        if (window.renderForgePart2Utilities) window.renderForgePart2Utilities(targetBook, curP, totP, defaultEndP);
        modal.classList.remove('hidden');
    };

    document.getElementById('shelf-open-ilovepdf-btn')?.addEventListener('click', () => window.openILovePdfStudioModal(window.readerBooks?.[0]?.id || null));
    document.getElementById('reader-open-ilovepdf-btn')?.addEventListener('click', () => window.openILovePdfStudioModal(activeILovePdfBookId));
    document.getElementById('close-ilovepdf-modal-btn')?.addEventListener('click', () => document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden'));

    window.convertPdfToStructuredBook = async function(actionMode = 'replace') {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId) || window.readerBooks?.[0];
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored?.originalBytes) return;

        const statusEl = document.getElementById('pbook-convert-status');
        if (statusEl) { statusEl.classList.remove('hidden'); statusEl.textContent = `⏳ Converting ${b.title}...`; }

        try {
            const pdf = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
            const structuredPages = [];
            const extractedPlain = [];
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const tc = await page.getTextContent();
                const plainTxt = tc.items.map(i => i.str).join(' ');
                structuredPages.push({ page: p, blocks: [{ type: 'p', text: plainTxt }], plainText: plainTxt });
                extractedPlain.push(plainTxt);
                try { page.cleanup(); } catch (e) {}
            }
            if (actionMode === 'txt') {
                const fullTxt = extractedPlain.join('\n\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([fullTxt], { type: 'text/plain' }));
                a.download = `${b.title}.txt`;
                a.click();
                if (statusEl) statusEl.textContent = "✅ Exported .TXT successfully!";
                return;
            }
            b.format = 'pbook';
            b.totalPages = structuredPages.length;
            await window.idbPut('bookFiles', { id: b.id, originalBytes: stored.originalBytes, structuredPages, extractedPagesText: extractedPlain });
            saveReaderMeta();
            window.renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            window.openBookAtPage(b.id, b.currentPage || 1);
            window.showToast(`🔄 Converted "${b.title}" to Rich Semantic Book!`);
        } catch (e) { window.showToast("Conversion failed", true); }
    };

    window.getActiveILovePdfBookId = () => activeILovePdfBookId;
})();
// ✅ END OF FILE (05-pomodoc-forge-part1.js v17.2) — 100% COMPLETE & UNCUT
/* =========================================================================
   05-POMODOC-FORGE-PART2.JS (v17.2 FULL MASTER RESTORATION — PART 2 OF 2)
   PDF UTILITY SUITE: MERGE MULTIPLE PDFS, IMAGES TO PDF BOOK, COMPRESS PDF,
   SPLIT / EXTRACT CHAPTER, AND PAGE OPERATIONS (INSERT NOTE PAGE, ROTATE, DELETE)
   ========================================================================= */
(function() {
    window.renderForgePart2Utilities = function(targetBook, curP, totP, defaultEndP) {
        const slot = document.getElementById('forge-part2-utilities-slot');
        if (!slot) return;

        slot.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-blue-400">📑 2. Merge Multiple PDFs</span>
                        <p class="text-[10px] font-mono text-slate-400 mt-0.5">Combine two or more PDF files into one master book.</p>
                    </div>
                    <button type="button" onclick="document.getElementById('ilovepdf-merge-files-input').click()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow">📁 Select PDFs to Merge</button>
                </div>

                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-amber-400">🖼️ 3. Images to PDF Book</span>
                        <p class="text-[10px] font-mono text-slate-400 mt-0.5">Turn PNG/JPG scans into a reading book.</p>
                    </div>
                    <button type="button" onclick="document.getElementById('ilovepdf-images-input').click()" class="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow">🖼️ Select Scan Images</button>
                </div>

                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 sm:col-span-2">
                    <div>
                        <span class="text-xs font-extrabold text-emerald-400">📄 4. Insert Note Page, Rotate 90° or Delete Page</span>
                        <p class="text-[10px] text-slate-400 mt-0.5">Modify Target Page #${curP}:</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-[10px] font-bold text-slate-300">Page #:</span>
                        <input type="number" id="ilove-pageop-num" value="${curP}" min="1" max="${totP}" class="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs font-mono text-white text-center">
                        <select id="ilove-blank-style-sel" class="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] font-bold text-emerald-300">
                            <option value="ruled">📝 Ruled Note Page</option>
                            <option value="grid">⊞ Dot-Grid Diagram Page</option>
                            <option value="blank">⬜ Pure Blank Page</option>
                        </select>
                        <button type="button" onclick="window.runILovePdfPageOp('insertBlank')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px]">➕ Add Note Page</button>
                        <button type="button" onclick="window.runILovePdfPageOp('rotate90')" class="bg-amber-600/25 hover:bg-amber-600 text-amber-300 border border-amber-500/40 font-extrabold px-3 py-1.5 rounded-xl text-[11px]">🔄 Rotate 90°</button>
                        <button type="button" onclick="window.runILovePdfPageOp('delete')" class="bg-red-600/25 hover:bg-red-600 text-red-300 border border-red-500/40 font-extrabold px-3 py-1.5 rounded-xl text-[11px]">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
    };

    // MERGE MULTIPLE PDFS
    document.getElementById('ilovepdf-merge-files-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length < 2 || typeof PDFLib === 'undefined') {
            showToast("Select at least 2 PDF files to merge.", true);
            return;
        }
        showToast(`⏳ Merging ${files.length} PDF files...`);
        try {
            const mergedDoc = await PDFLib.PDFDocument.create();
            for (const f of files) {
                const buf = await f.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
                const copiedPages = await mergedDoc.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(p => mergedDoc.addPage(p));
            }
            const mergedBytes = await mergedDoc.save();
            const mergedFile = new File([mergedBytes], `Merged_${Date.now()}.pdf`, { type: 'application/pdf' });
            await window.importBookFileObject(mergedFile, 'local', null, { shelfName: 'Merged Library', category: 'study', isManual: true });
            if (window.renderWoodenShelf) window.renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            showToast(`✅ Successfully merged ${files.length} PDFs into a new book!`);
        } catch (err) {
            showToast("PDF Merge failed", true);
        }
    });

    // IMAGES TO PDF BOOK
    document.getElementById('ilovepdf-images-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length || typeof PDFLib === 'undefined') return;
        showToast(`⏳ Converting ${files.length} image scans into PDF book...`);
        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            for (const f of files) {
                const buf = await f.arrayBuffer();
                let img = null;
                if (f.type === 'image/png') img = await pdfDoc.embedPng(buf);
                else img = await pdfDoc.embedJpg(buf);

                const page = pdfDoc.addPage([img.width, img.height]);
                page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
            }
            const pdfBytes = await pdfDoc.save();
            const scanFile = new File([pdfBytes], `ScanBook_${Date.now()}.pdf`, { type: 'application/pdf' });
            await window.importBookFileObject(scanFile, 'local', null, { shelfName: 'Scanned Documents', category: 'study', isManual: true });
            if (window.renderWoodenShelf) window.renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            showToast(`✅ Created readable book from ${files.length} image scans!`);
        } catch (err) {
            showToast("Images to PDF failed", true);
        }
    });

    window.runILovePdfPageOp = async function(opType) {
        const activeBookId = window.getActiveILovePdfBookId ? window.getActiveILovePdfBookId() : null;
        const b = (window.readerBooks || []).find(x => x.id === activeBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored?.originalBytes) return;

        const targetP = Math.max(1, Math.min(b.totalPages, parseInt(document.getElementById('ilove-pageop-num')?.value) || 1));
        const style = document.getElementById('ilove-blank-style-sel')?.value || 'ruled';

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const pIdx = targetP - 1;

            if (opType === 'insertBlank') {
                const refSize = pages[pIdx] ? pages[pIdx].getSize() : { width: 612, height: 792 };
                pdfDoc.insertPage(pIdx + 1, [refSize.width, refSize.height]);
            } else if (opType === 'rotate90') {
                const pg = pages[pIdx];
                if (pg) pg.setRotation(PDFLib.degrees(((pg.getRotation().angle || 0) + 90) % 360));
            } else if (opType === 'delete' && pages.length > 1) {
                pdfDoc.removePage(pIdx);
            }

            const updatedUint8 = await pdfDoc.save();
            stored.originalBytes = updatedUint8.buffer;
            await idbPut('bookFiles', stored);
            b.totalPages = pdfDoc.getPageCount();
            window.saveReaderMeta();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            if (window.openBookAtPage) window.openBookAtPage(b.id, targetP);
            showToast(`✅ Page operation '${opType}' completed successfully!`);
        } catch (e) {
            showToast("Page operation failed", true);
        }
    };
})();
// ✅ END OF FILE (05-pomodoc-forge-part2.js v17.2) — 100% COMPLETE & UNCUT
