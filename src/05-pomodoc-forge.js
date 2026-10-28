/* =========================================================================
   05-POMODOC-FORGE.JS (v17.0 ENTERPRISE DESKTOP EDITION)
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
       2. DEEP LINE-BY-LINE & INLINE SEMANTIC PARSER (QUOTES, BRACKETS, MATH, ?)
       ========================================================================= */
    window.formatInlineSemanticSpans = function(rawText) {
        if (!rawText) return '';
        let safe = window.escapeHtml(rawText);

        // 1. Highlight sentences enclosed in double quotes, double-single quotes ''abc'', or curly quotes
        safe = safe.replace(/(&quot;[^&]{2,240}?&quot;|&#39;&#39;[^&]{2,240}?&#39;&#39;|“[^”]{2,240}?”|‘[^’]{2,240}?’)/g,
            '<span class="pf-quoted-span">$1</span>');

        // 2. Highlight clinical/scientific terms enclosed in parentheses (...) or square brackets [...]
        safe = safe.replace(/(\([^()]{2,140}?\)|\[[^[\]]{2,140}?\])/g,
            '<span class="pf-bracket-span">$1</span>');

        // 3. Highlight mathematical & physiological numerical data (e.g. 120/80 mmHg, 72 bpm, 5 L/min, 98.6°F, 10^-4, pH 7.4, =, →, ⇌)
        safe = safe.replace(/\b(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*(?:mmHg|bpm|mL\/min|L\/min|mL|mg\/dL|g\/dL|mmol\/L|mEq\/L|kPa|atm|Hz|kHz|ms|sec|min|hrs?|%|°C|°F|K|mol\/L|M|N|J|kJ|cal|kcal|W|V|mV|Ω|A|mA|nm|μm|mm|cm|m\/s²?|kg|g|mg|μg))\b/gi,
            '<span class="pf-math-data">$1</span>');

        safe = safe.replace(/(\b(?:pH|pKa|pKb|GFR|CO|SV|HR|MAP|BP|ATP|ADP|NADH|FADH2|ΔG|ΔH|ΔS|Kc|Kp)\s*[=≈<>≤≥]\s*[-+]?\d+(?:\.\d+)?|\b\d+(?:\.\d+)?\s*[×x*÷+\-=→⇌]\s*\d+(?:\.\d+)?(?:\s*[×x*]\s*10\^?[-+]?\d+)?)/g,
            '<span class="pf-math-data">$1</span>');

        return safe;
    };

    window.classifyAndRenderSemanticLine = function(rawLine) {
        const clean = String(rawLine || '').replace(/\s+/g, ' ').trim();
        if (!clean) return '';

        // 1. Chapter Name Detection
        if (/^(chapter|unit|part|module|section)\s+([0-9ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(clean) && clean.length < 110) {
            return `<div class="pf-chapter-banner">📘 ${window.formatInlineSemanticSpans(clean)}</div>`;
        }
        // 2. Question Line Detection (Any sentence/line ending with ?)
        if (/\?\s*$/.test(clean) && clean.length < 260) {
            return `<div class="pf-question-line">❓ ${window.formatInlineSemanticSpans(clean)}</div>`;
        }
        // 3. Main Headline (ALL CAPS heading or Markdown #)
        if (/^#\s+/.test(clean) || (clean === clean.toUpperCase() && /[A-Z]{4,}/.test(clean) && clean.length >= 5 && clean.length <= 85)) {
            return `<h2 class="pbook-headline-h1 pf-headline">${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h2>`;
        }
        // 4. Numbered Topic (e.g. 1.1 Cardiac Cycle, II. Systemic Circulation, ## Topic)
        if (/^##\s+/.test(clean) || (/^([0-9]+\.[0-9]+|[IVX]+\.)\s+[A-Z]/.test(clean) && clean.length <= 95)) {
            return `<h3 class="pbook-headline-h2 pf-topic">${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h3>`;
        }
        // 5. Subtopic (e.g. Colon-ended short header or ### Subtopic)
        if (/^###\s+/.test(clean) || (/^[A-Z][A-Za-z0-9\s\-(),/]{3,60}:$/.test(clean))) {
            return `<h4 class="pf-subtopic">▸ ${window.formatInlineSemanticSpans(clean.replace(/^#+\s*/, ''))}</h4>`;
        }
        // 6. Bullet / List Item
        if (/^[•▪▸◦❖✦★☆✓✔✗✘\-*]\s+|^\(\d+\)\s+|^[a-z0-9]\)\s+/i.test(clean)) {
            return `<div class="pbook-paragraph pl-4 border-l-2 border-blue-500/40">${window.formatInlineSemanticSpans(clean)}</div>`;
        }
        // 7. Standard Paragraph with Inline Semantic Highlighting
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
                } else if (blk.type === 'bullet') {
                    html += `<div class="pbook-paragraph pl-4 border-l-2 border-blue-500/40">${window.formatInlineSemanticSpans(cleanText)}</div>`;
                } else {
                    const isTrueQuote = (blk.align === 'center' && cleanText.length < 220 && /^["'“‘«]/.test(cleanText));
                    const hasFirstIndent = (!isTrueQuote && blk.firstLineIndent);
                    const extraCls = isTrueQuote ? 'pbook-centered-quote' : (hasFirstIndent ? 'pbook-first-indent' : '');
                    html += `<p class="pbook-paragraph ${extraCls}">${window.formatInlineSemanticSpans(cleanText)}</p>`;
                }
            });
        } else {
            const textSource = pData?.plainText || rawFallbackText || '';
            const lines = textSource.split(/\n+/);
            html = lines.map(ln => window.classifyAndRenderSemanticLine(ln)).join('');
        }

        sheet.innerHTML = html || `<p class="pbook-paragraph">Page ${pageNum}</p>`;
        return sheet;
    };

    // Automatically upgrade any .pbook or .txt page rendered in #reader-pages-stage with Semantic Styling & Tables/Diagrams
    const stageEl = document.getElementById('reader-pages-stage');
    if (stageEl) {
        let cachedBookId = null;
        let cachedStructuredMap = {};
        const obs = new MutationObserver(async () => {
            const cards = stageEl.querySelectorAll('.v4-page-card:not([data-pf-upgraded="true"])');
            if (!cards.length) return;
            const activeTitle = document.getElementById('active-book-title-bar')?.textContent || '';
            const activeBook = (window.readerBooks || []).find(b => b.title === activeTitle) || window.readerBooks?.[0];
            if (!activeBook || activeBook.format === 'pdf') return;

            if (cachedBookId !== activeBook.id) {
                cachedBookId = activeBook.id;
                const stored = await window.idbGet('bookFiles', activeBook.id);
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
       3. POMODOC FORGE MODAL & USER SEMANTIC COLOR / STYLE STUDIO
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
        window.showToast("🎨 Semantic Colors & Bolding reset to defaults!");
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
                <div class="flex items-center gap-2">
                    <span class="text-lg">📘</span>
                    <span class="text-xs font-extrabold uppercase text-slate-300">Target Book:</span>
                </div>
                <select id="ilovepdf-book-select" class="flex-1 sm:max-w-md bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white">
                    ${sortedBySeq.length ? sortedBySeq.map(b => `<option value="${escapeHtml(b.id)}" ${b.id === activeILovePdfBookId ? 'selected' : ''}>#${b.readSeq || 1} [${escapeHtml(b.shelfName || 'Shelf')}] ${escapeHtml(b.title)} (${b.totalPages}p • ${b.format.toUpperCase()})</option>`).join('') : '<option value="">No books imported yet</option>'}
                </select>
            </div>

            <!-- 1. SELECTIVE EXTRACTION MATRIX + SEMANTIC BOOK CONVERTER -->
            <div class="bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-950 border border-emerald-500/50 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <span class="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">🧬 PomoDoc Forge v17.0 — Selective Visual Extractor & Deep Line-by-Line Semantic Styler</span>
                        <h4 class="text-sm font-extrabold text-white mt-1">1. Tick What to Keep & Convert PDF to Rich Semantic Book (.pbook) or Styled .TXT</h4>
                    </div>
                </div>

                <!-- TICK WHAT TO KEEP MATRIX -->
                <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                    <span class="text-[10px] font-extrabold uppercase text-cyan-400">☑️ Tick Elements to Keep During Conversion (Preserves Circulatory System Diagrams, Tables & Mind Maps):</span>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.diagrams ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('diagrams', this.checked)" class="accent-emerald-500">
                            <span>🖼️ Diagrams & Anatomy</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.tables ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('tables', this.checked)" class="accent-emerald-500">
                            <span>📊 Data Tables</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.charts ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('charts', this.checked)" class="accent-emerald-500">
                            <span>📈 Charts & ECGs</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.mindmaps ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('mindmaps', this.checked)" class="accent-emerald-500">
                            <span>🧠 Mind Maps & Flows</span>
                        </label>
                        <label class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer font-bold text-slate-200">
                            <input type="checkbox" ${km.formulas ? 'checked' : ''} onchange="window.toggleKeepMatrixOption('formulas', this.checked)" class="accent-emerald-500">
                            <span>📐 Math & Formulas</span>
                        </label>
                    </div>
                </div>

                <!-- MANUAL USER SEMANTIC COLOR & BOLDING CUSTOMIZER -->
                <div class="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-extrabold uppercase text-purple-300">🎨 Manual Semantic Line Color & Bolding Studio (Applies Live to All Converted Books & .TXT):</span>
                        <button type="button" onclick="window.resetSemanticStylesToDefault()" class="text-[10px] font-bold text-slate-400 hover:text-white underline">↺ Reset Colors</button>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.chapterColor}">📘 Chapter Name</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.chapterColor}" oninput="window.updateSemanticStyleProp('chapterColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.chapterBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('chapterBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.headlineColor}">🔖 Main Headline</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.headlineColor}" oninput="window.updateSemanticStyleProp('headlineColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.headlineBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('headlineBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.topicColor}">📗 Topic Header</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.topicColor}" oninput="window.updateSemanticStyleProp('topicColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.topicBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('topicBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.subtopicColor}">▸ Subtopic</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.subtopicColor}" oninput="window.updateSemanticStyleProp('subtopicColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.subtopicBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('subtopicBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.questionColor}">❓ Question (?)</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.questionColor}" oninput="window.updateSemanticStyleProp('questionColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.questionBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('questionBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.mathColor}">🧮 Math & Data</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.mathColor}" oninput="window.updateSemanticStyleProp('mathColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.mathBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('mathBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.quoteColor}">💬 Quotes (''abc'')</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.quoteColor}" oninput="window.updateSemanticStyleProp('quoteColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.quoteBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('quoteBold', this.checked)" title="Bold">
                            </div>
                        </div>
                        <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                            <span class="font-bold" style="color:${st.bracketColor}">🟣 Brackets (...)</span>
                            <div class="flex items-center gap-1">
                                <input type="color" value="${st.bracketColor}" oninput="window.updateSemanticStyleProp('bracketColor', this.value)" class="w-5 h-5 rounded cursor-pointer bg-transparent">
                                <input type="checkbox" ${st.bracketBold ? 'checked' : ''} onchange="window.updateSemanticStyleProp('bracketBold', this.checked)" title="Bold">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onclick="window.convertPdfToStructuredBook('replace')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow active:scale-95">
                        🔄 Convert in Same Book (Keep Ticked Visuals, Tables & Semantic Colors)
                    </button>
                    <button type="button" onclick="window.convertPdfToStructuredBook('add')" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow active:scale-95">
                        ➕ Add as New Semantic Book on Shelf
                    </button>
                    <button type="button" onclick="window.convertPdfToStructuredBook('txt')" class="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs active:scale-95">
                        ⬇️ Export Clean Semantic .TXT
                    </button>
                </div>
                <div id="pbook-convert-status" class="hidden text-xs font-mono font-bold text-emerald-400 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30"></div>
            </div>

            <!-- 2. SPLIT, PAGE OPS, MERGE & IMAGE TOOLS -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-rose-400">✂️ 2. Split / Extract Chapter Into New Shelf Book</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Extract a page range into a lightweight book on your #1 Top Wooden Shelf.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-[9px] font-bold uppercase text-slate-400">From Page</label><input type="number" id="ilove-split-start" value="${curP}" min="1" max="${totP}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white text-center"></div>
                        <div><label class="text-[9px] font-bold uppercase text-slate-400">To Page</label><input type="number" id="ilove-split-end" value="${defaultEndP}" min="1" max="${totP}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white text-center"></div>
                    </div>
                    <input type="text" id="ilove-split-title" placeholder="New Chapter Book Name" value="${targetBook ? `${escapeHtml(targetBook.title)} (p.${curP}-${defaultEndP})` : ''}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white">
                    <div class="flex gap-2">
                        <button type="button" onclick="window.runILovePdfSplit(true)" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-2 rounded-xl text-xs shadow">🪵 Extract to #1 Shelf</button>
                        <button type="button" onclick="window.runILovePdfSplit(false)" class="bg-slate-800 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs">⬇️ Download</button>
                    </div>
                </div>

                <div class="bg-slate-950 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5">
                    <div>
                        <span class="text-xs font-extrabold text-amber-400">📄 3. Add Page, Rotate 90° or Delete Page</span>
                        <p class="text-[11px] text-slate-400 mt-0.5">Insert a Ruled/Grid Note Page or rotate/delete Target Page #:</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-300">Page #:</span>
                        <input type="number" id="ilove-pageop-num" value="${curP}" min="1" max="${totP}" class="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs font-mono text-white text-center">
                        <select id="ilove-blank-style-sel" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] font-bold text-emerald-300">
                            <option value="ruled">📝 Ruled Note Page</option>
                            <option value="grid">⊞ Dot-Grid Diagram Page</option>
                            <option value="blank">⬜ Pure Blank Page</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-3 gap-1.5">
                        <button type="button" onclick="window.runILovePdfPageOp('insertBlank')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded-xl text-[11px]">➕ Add Page</button>
                        <button type="button" onclick="window.runILovePdfPageOp('rotate90')" class="bg-amber-600/25 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 font-extrabold py-2 rounded-xl text-[11px]">🔄 Rotate 90°</button>
                        <button type="button" onclick="window.runILovePdfPageOp('delete')" class="bg-red-600/25 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 font-extrabold py-2 rounded-xl text-[11px]">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('ilovepdf-book-select')?.addEventListener('change', (e) => {
            window.openILovePdfStudioModal(e.target.value);
        });
        modal.classList.remove('hidden');
    };

    document.getElementById('shelf-open-ilovepdf-btn')?.addEventListener('click', () => window.openILovePdfStudioModal(window.readerBooks?.[0]?.id || null));
    document.getElementById('reader-open-ilovepdf-btn')?.addEventListener('click', () => window.openILovePdfStudioModal(activeILovePdfBookId));
    document.getElementById('close-ilovepdf-modal-btn')?.addEventListener('click', () => document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden'));

    /* =========================================================================
       4. SELECTIVE VISUAL, TABLE & SEMANTIC CONVERSION ENGINE
       ========================================================================= */
    window.convertPdfToStructuredBook = async function(actionMode = 'replace') {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId) || window.readerBooks?.[0];
        if (!b) { window.showToast("Select a book first!", true); return; }
        const stored = await window.idbGet('bookFiles', b.id);
        if (!stored || (!stored.originalBytes && !stored.structuredPages)) {
            window.showToast("Book binary not found in local storage.", true);
            return;
        }

        const statusEl = document.getElementById('pbook-convert-status');
        const km = window.pomoForgeKeepMatrix;
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = `⏳ Analyzing ${b.totalPages} pages (Extracting Ticked Visuals, Data Tables & Semantic Hierarchy)...`;
        }

        let pdf = null;
        try {
            let structuredPages = [];
            let extractedPlain = [];
            const autoChapters = [];
            const seenChapKeys = new Set();

            if (stored.originalBytes && typeof pdfjsLib !== 'undefined') {
                pdf = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
                const numPages = pdf.numPages || b.totalPages;

                for (let p = 1; p <= numPages; p++) {
                    if (p % 4 === 0) {
                        if (statusEl) statusEl.textContent = `⏳ Deep-Scanning Page ${p} / ${numPages} (Tables, Diagrams & Line Semantics)...`;
                        await new Promise(r => setTimeout(r, 0));
                    }
                    const page = await pdf.getPage(p);
                    const unitVp = page.getViewport({ scale: 1.0 });
                    const tc = await page.getTextContent();

                    // Check Operator List for Embedded Images, Charts, or Vector Diagrams
                    let hasRasterImageOps = false, vectorPathCount = 0;
                    if ((km.diagrams || km.charts || km.mindmaps) && page.getOperatorList) {
                        try {
                            const opList = await page.getOperatorList();
                            const OPS = pdfjsLib.OPS || {};
                            (opList.fnArray || []).forEach(fn => {
                                if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) hasRasterImageOps = true;
                                if (fn === OPS.constructPath || fn === OPS.stroke || fn === OPS.fill) vectorPathCount++;
                            });
                        } catch (e) {}
                    }

                    const rawItems = [];
                    let totalFh = 0;
                    tc.items.forEach(it => {
                        if (!it.str || !it.str.trim()) return;
                        const m = pdfjsLib.Util.transform(unitVp.transform, it.transform);
                        const fh = Math.hypot(m[2], m[3]);
                        const fhNorm = fh / unitVp.height;
                        const w = ((it.width || (it.str.length * fh * 0.5)) * unitVp.scale) / unitVp.width;
                        totalFh += fh;
                        rawItems.push({ str: it.str.trim(), x: m[4] / unitVp.width, y: m[5] / unitVp.height, w, fh, fhNorm });
                    });

                    const avgFh = rawItems.length ? (totalFh / rawItems.length) : 12;
                    rawItems.sort((a, b) => (Math.abs(a.y - b.y) < 0.009 ? a.x - b.x : a.y - b.y));

                    // Group items into horizontal rows (preserving column cells for Data Table reconstruction)
                    const rows = [];
                    rawItems.forEach(item => {
                        const last = rows[rows.length - 1];
                        const sameLineTol = Math.max(0.008, item.fhNorm * 0.65);
                        if (last && Math.abs(last.y - item.y) < sameLineTol) {
                            const xGap = item.x - last.xEnd;
                            if (xGap > 0.055) {
                                last.cells.push(item.str);
                            } else {
                                last.cells[last.cells.length - 1] += (xGap >= 0.003 ? ' ' : '') + item.str;
                            }
                            last.text += (xGap >= 0.003 ? ' ' : '') + item.str;
                            last.xEnd = Math.max(last.xEnd, item.x + item.w);
                            last.maxFh = Math.max(last.maxFh, item.fh);
                        } else {
                            rows.push({
                                y: item.y, xStart: item.x, xEnd: item.x + item.w,
                                text: item.str, cells: [item.str], maxFh: item.fh
                            });
                        }
                    });

                    const blocks = [];
                    let curPara = null;
                    let tableBuffer = [];

                    const flushTable = () => {
                        if (tableBuffer.length >= 2 && km.tables) {
                            blocks.push({ type: 'table', rows: tableBuffer.map(r => r.cells) });
                        } else if (tableBuffer.length > 0) {
                            tableBuffer.forEach(r => blocks.push({ type: 'p', text: r.cells.join('   '), align: 'justify' }));
                        }
                        tableBuffer = [];
                    };

                    const flushPara = () => {
                        if (curPara && curPara.text.trim()) {
                            blocks.push({
                                type: /\?\s*$/.test(curPara.text.trim()) ? 'question' : 'p',
                                text: curPara.text.replace(/\s{2,}/g, ' ').trim(),
                                align: 'justify'
                            });
                            curPara = null;
                        }
                    };

                    rows.forEach(ln => {
                        const t = ln.text.replace(/\s+/g, ' ').trim();
                        if (!t) return;

                        // Check if row is part of a multi-column Data Table
                        if (km.tables && ln.cells.length >= 3) {
                            flushPara();
                            tableBuffer.push(ln);
                            return;
                        } else if (tableBuffer.length > 0) {
                            flushTable();
                        }

                        const isChapter = /^(chapter|unit|part|module)\s+([0-9ivx]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(t) && t.length < 105;
                        const isH1 = !isChapter && (ln.maxFh >= avgFh * 1.28 || (t === t.toUpperCase() && /[A-Z]{4,}/.test(t) && t.length >= 5 && t.length <= 85));
                        const isH2 = !isChapter && !isH1 && (ln.maxFh >= avgFh * 1.14 || (/^([0-9]+\.[0-9]+|[IVX]+\.)\s+[A-Z]/.test(t) && t.length < 95));
                        const isSubtopic = !isChapter && !isH1 && !isH2 && /^[A-Z][A-Za-z0-9\s\-(),/]{3,55}:$/.test(t);
                        const isQuestion = /\?\s*$/.test(t) && t.length < 240;
                        const isBullet = /^[•▪▸◦❖✦★☆✓✔✗✘\-*]\s+|^\(\d+\)\s+|^[a-z0-9]\)\s+/i.test(t);

                        if (isChapter) {
                            flushPara();
                            blocks.push({ type: 'chapter', text: t });
                            const ck = t.toLowerCase().slice(0, 30);
                            if (!seenChapKeys.has(ck)) { seenChapKeys.add(ck); autoChapters.push({ id: 'ch_' + Date.now() + '_' + autoChapters.length, title: t, page: p, level: 1 }); }
                        } else if (isH1) {
                            flushPara();
                            blocks.push({ type: 'h1', text: t });
                            const ck = t.toLowerCase().slice(0, 30);
                            if (!seenChapKeys.has(ck)) { seenChapKeys.add(ck); autoChapters.push({ id: 'ch_' + Date.now() + '_' + autoChapters.length, title: t, page: p, level: 1 }); }
                        } else if (isH2) {
                            flushPara();
                            blocks.push({ type: 'h2', text: t });
                        } else if (isSubtopic) {
                            flushPara();
                            blocks.push({ type: 'subtopic', text: t });
                        } else if (isQuestion) {
                            flushPara();
                            blocks.push({ type: 'question', text: t });
                        } else if (isBullet) {
                            flushPara();
                            blocks.push({ type: 'bullet', text: t });
                        } else {
                            if (!curPara) {
                                curPara = { text: t };
                            } else {
                                if (/[a-z]-\s*$/i.test(curPara.text) && /^[a-z]/.test(t)) {
                                    curPara.text = curPara.text.replace(/-\s*$/, '') + t;
                                } else {
                                    curPara.text += ' ' + t;
                                }
                            }
                        }
                    });
                    flushTable();
                    flushPara();

                    // Embed Visual Figure / Diagram / Chart / Mind Map if page contains graphics or figure captions
                    const pageHasVisualCaption = rows.some(r => /\b(fig\.?|figure|diagram|chart|graph|ecg|flowchart|mind\s*map|pathway|circulation|anatomy)\b/i.test(r.text));
                    const shouldCaptureVisual = (km.diagrams && (hasRasterImageOps || pageHasVisualCaption))
                        || (km.charts && vectorPathCount > 60)
                        || (km.mindmaps && (vectorPathCount > 45 || /\b(flowchart|mind\s*map|pathway|cycle)\b/i.test(rows.map(r => r.text).join(' '))));

                    if (shouldCaptureVisual) {
                        try {
                            const renderVp = page.getViewport({ scale: 1.25 });
                            const offCanvas = document.createElement('canvas');
                            offCanvas.width = renderVp.width;
                            offCanvas.height = renderVp.height;
                            await page.render({ canvasContext: offCanvas.getContext('2d'), viewport: renderVp }).promise;
                            const visType = km.mindmaps && /\b(flowchart|mind\s*map|pathway|cycle)\b/i.test(rows.map(r => r.text).join(' '))
                                ? 'mindmap'
                                : (km.charts && /\b(chart|graph|ecg|curve)\b/i.test(rows.map(r => r.text).join(' ')) ? 'chart' : 'diagram');
                            blocks.push({
                                type: visType,
                                dataUrl: offCanvas.toDataURL('image/jpeg', 0.82),
                                caption: `Page ${p} Preserved Visual (${b.title})`
                            });
                        } catch (e) {}
                    }

                    const plainTxt = blocks.map(blk => {
                        if (blk.type === 'table') return blk.rows.map(r => r.join(' | ')).join('\n');
                        return blk.text || '';
                    }).filter(Boolean).join('\n\n');

                    structuredPages.push({ page: p, blocks, plainText: plainTxt });
                    extractedPlain.push(plainTxt);
                    try { page.cleanup(); } catch (e) {}
                }
            }

            if (actionMode === 'txt') {
                const fullTxt = structuredPages.map(sp => `==================== PAGE ${sp.page} ====================\n\n${sp.plainText}`).join('\n\n\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([fullTxt], { type: 'text/plain;charset=utf-8' }));
                a.download = `${b.title}_SemanticFormat.txt`;
                a.click();
                if (statusEl) statusEl.textContent = `✅ Exported Clean Semantic .TXT (${structuredPages.length} pages)!`;
                window.showToast("⬇️ Semantic .TXT Downloaded!");
                return;
            }

            if (autoChapters.length > 0) b.outline = autoChapters;

            if (actionMode === 'replace') {
                b.format = 'pbook';
                b.totalPages = structuredPages.length;
                b.lastModified = Date.now();
                await window.idbPut('bookFiles', {
                    id: b.id, originalBytes: stored.originalBytes || null, bakedBytes: null,
                    structuredPages, extractedPagesText: extractedPlain
                });
                window.saveReaderMeta();
                window.renderWoodenShelf();
                document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
                window.openBookAtPage(b.id, b.currentPage || 1);
                window.showToast(`🔄 Converted "${b.title}" with Semantic Colors, Tables & Diagrams!`);
            } else {
                const newBookId = 'pbook_' + Date.now();
                const newBook = {
                    ...JSON.parse(JSON.stringify(b)),
                    id: newBookId,
                    title: `${b.title} [📖 Semantic Book-OS]`,
                    fileName: b.fileName.replace(/\.[^/.]+$/, '') + '.pbook',
                    format: 'pbook',
                    totalPages: structuredPages.length,
                    outline: autoChapters.length ? autoChapters : (b.outline || []),
                    lastOpened: Date.now(),
                    lastModified: Date.now()
                };
                await window.idbPut('bookFiles', {
                    id: newBookId, originalBytes: null, bakedBytes: null,
                    structuredPages, extractedPagesText: extractedPlain
                });
                window.readerBooks.unshift(newBook);
                window.saveReaderMeta();
                window.renderWoodenShelf();
                document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
                window.showToast(`➕ Added "${newBook.title}" to Wooden Shelf!`);
            }
        } catch (err) {
            window.showToast("Conversion encountered an issue on this PDF.", true);
        } finally {
            if (pdf) { try { await pdf.destroy(); } catch (e) {} }
        }
    };

    window.runILovePdfSplit = async function(addToShelf = true) {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await window.idbGet('bookFiles', b.id);
        if (!stored?.originalBytes) { window.showToast("Requires a PDF binary book.", true); return; }

        const startP = Math.max(1, parseInt(document.getElementById('ilove-split-start')?.value) || 1);
        const endP = Math.min(b.totalPages, Math.max(startP, parseInt(document.getElementById('ilove-split-end')?.value) || startP));
        const customTitle = (document.getElementById('ilove-split-title')?.value || '').trim() || `${b.title} (p.${startP}-${endP})`;

        try {
            const srcDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const newDoc = await PDFLib.PDFDocument.create();
            const indices = [];
            for (let i = startP - 1; i <= endP - 1; i++) indices.push(i);
            const copied = await newDoc.copyPages(srcDoc, indices);
            copied.forEach(p => newDoc.addPage(p));
            const newUint8 = await newDoc.save();

            if (!addToShelf) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([newUint8], { type: 'application/pdf' }));
                a.download = `${customTitle.replace(/\s+/g, '_')}.pdf`;
                a.click();
                return;
            }
            const fileObj = new File([newUint8], `${customTitle}.pdf`, { type: 'application/pdf' });
            await window.importBookFileObject(fileObj, 'local', null, { shelfName: b.shelfName, category: b.category, isManual: true });
            window.renderWoodenShelf();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            window.showToast(`✂️ Extracted "${customTitle}" onto Shelf!`);
        } catch (e) { window.showToast("PDF Split failed.", true); }
    };

    window.runILovePdfPageOp = async function(opType) {
        const b = (window.readerBooks || []).find(x => x.id === activeILovePdfBookId);
        if (!b || typeof PDFLib === 'undefined') return;
        const stored = await window.idbGet('bookFiles', b.id);
        if (!stored?.originalBytes) return;
        const targetP = Math.max(1, Math.min(b.totalPages, parseInt(document.getElementById('ilove-pageop-num')?.value) || 1));

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
            await window.idbPut('bookFiles', stored);
            b.totalPages = pdfDoc.getPageCount();
            window.saveReaderMeta();
            document.getElementById('ilovepdf-studio-modal')?.classList.add('hidden');
            window.openBookAtPage(b.id, targetP);
        } catch (e) {}
    };
})();
// ✅ END OF FILE (05-pomodoc-forge.js v17.0 Enterprise Desktop Edition) — 100% COMPLETE & UNCUT
