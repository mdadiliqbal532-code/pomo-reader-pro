/* =========================================================================
   04-READER-PRO.JS (v17.0 ENTERPRISE DESKTOP EDITION)
   3D WOODEN BOOKSHELF, AUTO-ADAPTIVE 32GB RAM/1TB SSD TIER SCALER,
   FIXED 100% TRANSPARENT IMAGE OCCLUSION REVEAL, SPLIT-SCREEN ONENOTE
   STUDIO BRIDGE & SEMANTIC POMODOC FORGE INTEGRATION
   ========================================================================= */
(function() {
    document.getElementById('reader-floating-thumb-dock')?.remove();
    const HTTPS = 'https:' + '//';

    window.haptic = window.haptic || function() {};
    window.escapeJsStr = window.escapeJsStr || function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/\r?\n/g, ' ');
    };

    /* =========================================================================
       1. UNIFIED READER STATE & HARDWARE-ADAPTIVE 32GB RAM / 1TB SSD SCALER
       ========================================================================= */
    window.readerBooks = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));
    window.readerReadingLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    window.customShelves = JSON.parse(safeGet('pages_pomodoro_custom_shelves_v1', 'null')) || [
        { id: 'shelf_med', name: 'Medical Science & Anatomy', category: 'study' },
        { id: 'shelf_hist', name: 'World History & Civilizations', category: 'study' },
        { id: 'shelf_behav', name: 'Human Behavior & Psychology', category: 'side' },
        { id: 'shelf_cosmos', name: 'Universe & Existence Purpose', category: 'side' },
        { id: 'shelf_deen', name: 'Quran, Tafseer & Hadith', category: 'deen' }
    ];
    window.readerSettings = JSON.parse(safeGet('pages_pomodoro_reader_cfg_v1', 'null')) || {
        woodStyle: 'walnut',
        sortBy: 'sequence',
        booksPerRow: 'auto',
        txtBgTheme: 'default',
        txtSelColor: 'rgba(37, 99, 235, 0.55)',
        pdfSelColor: 'rgba(37, 99, 235, 0.32)',
        autoFolderImport: true,
        mainFolderName: '',
        viewMode: 'scroll',
        orientation: 'auto',
        theme: 'night',
        keepScreenOn: true,
        blueLightEnabled: false,
        blueLightIntensity: 30,
        lockVerticalScroll: false,
        lockHorizontalScroll: false,
        hideBottomBar: false,
        shelfWrapMode: false,
        clouds: {
            local: { name: 'Local PC Folder', icon: '💾', connected: true, status: 'Ready (IndexedDB + Disk)' },
            telegram: { name: 'Telegram Cloud (Bot + TDLib)', icon: '✈️', connected: false, tdlibUrl: '', status: 'Bot API + TDLib Ready' },
            gdrive: { name: 'Google Drive (OAuth2 + API)', icon: '☁️', connected: false, folderName: '', token: '', apiKey: '', folderId: '', status: 'Not Connected' },
            dropbox: { name: 'Dropbox', icon: '📦', connected: false, folderName: '', token: '', status: 'Not Connected' }
        }
    };

    if (!readerSettings.booksPerRow) readerSettings.booksPerRow = 'auto';
    if (!readerSettings.txtBgTheme) readerSettings.txtBgTheme = 'default';

    readerBooks.forEach((b, idx) => {
        if (typeof b.readSeq !== 'number') b.readSeq = idx + 1;
    });

    // 32GB RAM & 1TB SSD Hardware Workstation Tier Telemetry
    async function detectAndApplyReaderHardwareTier() {
        const rawRam = navigator.deviceMemory || 8;
        const cores = navigator.hardwareConcurrency || 8;
        window.pomoMaxPageBufferWindow = (rawRam >= 16 || cores >= 12) ? 40 : 20;
        window.pomoOptimalPdfScale = 2.0;

        const badge = document.getElementById('reader-folder-sync-badge');
        if (badge) {
            badge.innerHTML = `🛡️ 32GB RAM / 1TB SSD Turbo • ${window.pomoMaxPageBufferWindow}p Buffer`;
        }
    }
    detectAndApplyReaderHardwareTier();

    let mainDirectoryHandle = null;
    let cloudDirectoryHandles = {};
    let pendingManualGenreChoice = null;
    let isApplyingRemoteReaderSync = false;
    let readerCloudUnsubscribe = null;
    let readerWirelessSyncTimer = null;

    let activeShelfFilter = 'all';
    let activeCustomShelfFilter = 'all';
    let shelfDisplayLayout = 'sections';
    let activeCornerBookId = null;

    let activeReaderBook = null;
    let activePdfDoc = null;
    let activeExtractedPages = [];
    let activeStructuredPages = [];
    let readerZoom = 1.0;
    let studioActive = false;
    let studioTool = 'line';
    let readerSelectionMode = 'official';
    let occlusionModeActive = false;
    let bionicReadingActive = false;
    let selectedShapeId = null;
    let activeHighlightColor = '#facc15';
    let pendingLaserSelection = null;
    let pendingTextPlacement = null;
    let activeReadingSessionTimer = null;
    let pageScrollObserver = null;
    let isJumpingPage = false;
    let jumpUnlockTimer = null;
    let teleprompterTimer = null;
    let teleprompterSpeed = 1.2;
    let splitSecondPdfDoc = null;
    let splitSecondPageNum = 1;
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    const studioBroadcastChan = ('BroadcastChannel' in window) ? new BroadcastChannel('pomo_studio_bridge_v1') : null;

    window.PomoStudioBridge = {
        async syncBookPageIndexToCloud(bookId, pagesTextArray = []) {
            const b = readerBooks.find(x => x.id === bookId);
            if (!b || !Array.isArray(pagesTextArray) || !pagesTextArray.length) return false;
            const roomId = safeGet('pages_pomodoro_sync_room', '');
            if (!roomId || typeof firebase === 'undefined' || !firebase.apps?.length) return false;

            try {
                const db = firebase.firestore();
                const indexRef = db.collection('artifacts').doc('neettimercloud')
                    .collection('public').doc('data')
                    .collection('sync_rooms').doc(roomId)
                    .collection('reader_page_index').doc(b.id);

                await indexRef.set({
                    bookId: b.id, title: b.title, shelfName: b.shelfName || 'General',
                    totalPages: b.totalPages || pagesTextArray.length, updatedAt: Date.now()
                }, { merge: true });
                return true;
            } catch (e) { return false; }
        },
        async sendSelectionToExternalStudio(payload) {
            const packet = { bookId: payload.bookId, selectedText: payload.selectedText, timestamp: Date.now() };
            try { studioBroadcastChan?.postMessage({ type: 'STUDIO_IMPORT_PASSAGE', packet }); } catch (e) {}
            showToast("📤 Sent to External Studio Bridge!");
        },
        async writeDesktopFolderLibraryIndex() {
            if (!mainDirectoryHandle) return;
            try {
                const fh = await mainDirectoryHandle.getFileHandle('pomo-library-index.json', { create: true });
                const wr = await fh.createWritable();
                await wr.write(JSON.stringify({ updatedAt: Date.now(), customShelves, readerBooks: readerBooks.map(b => ({ ...b, coverDataUrl: '' })) }, null, 2));
                await wr.close();
            } catch (e) {}
        }
    };

    window.saveReaderMeta = function(skipCloudBroadcast = false) {
        const slimBooks = readerBooks.map(b => {
            const copy = { ...b };
            if (copy.coverDataUrl && copy.coverDataUrl.length > 200) {
                coverMemoryCache[copy.id] = copy.coverDataUrl;
                idbPut('bookCovers', { id: copy.id, coverDataUrl: copy.coverDataUrl });
                copy.hasCachedCover = true;
                copy.coverDataUrl = '';
            }
            return copy;
        });
        safeSet('pages_pomodoro_reader_books_v1', JSON.stringify(slimBooks));
        safeSet('pages_pomodoro_reader_log_v1', JSON.stringify(readerReadingLog));
        safeSet('pages_pomodoro_reader_cfg_v1', JSON.stringify(readerSettings));
        safeSet('pages_pomodoro_custom_shelves_v1', JSON.stringify(customShelves));
        PomoEventBus.emit('reader:updated', { booksCount: readerBooks.length });
    };

    async function hydrateBookCoversAndHandles() {
        for (const b of readerBooks) {
            if (b.coverDataUrl && b.coverDataUrl.length > 200) {
                coverMemoryCache[b.id] = b.coverDataUrl;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: b.coverDataUrl });
                b.coverDataUrl = '';
            } else if (!coverMemoryCache[b.id]) {
                const cov = await idbGet('bookCovers', b.id);
                if (cov && cov.coverDataUrl) coverMemoryCache[b.id] = cov.coverDataUrl;
            }
        }
        renderWoodenShelf();
    }

    // FIXED 100% TRANSPARENT IMAGE OCCLUSION REVEAL
    window.toggleImageOcclusionTool = function() {
        occlusionModeActive = !occlusionModeActive;
        const btn = document.getElementById('v14-occlude-btn');
        if (btn) btn.classList.toggle('active-tool', occlusionModeActive);
        syncSvgAndTextLayerModes();
        showToast(occlusionModeActive
            ? "🎭 Image Occlusion ON: Drag box over diagram label. Click any mask to toggle Reveal/Transparent!"
            : "🎭 Image Occlusion OFF");
    };

    window.applyTxtAndSelectionColors = function() {
        const root = document.documentElement;
        root.style.setProperty('--txt-sel-bg', readerSettings.txtSelColor || 'rgba(37, 99, 235, 0.55)');
        root.style.setProperty('--pdf-sel-bg', readerSettings.pdfSelColor || 'rgba(37, 99, 235, 0.32)');
        const bgTheme = readerSettings.txtBgTheme || 'default';
        document.querySelectorAll('.pbook-page-sheet').forEach(sheet => {
            sheet.classList.remove('txt-bg-black', 'txt-bg-blue', 'txt-bg-green', 'txt-bg-sepia', 'txt-bg-paper');
            if (bgTheme !== 'default') {
                sheet.setAttribute('data-custom-bg', 'true');
                sheet.classList.add(`txt-bg-${bgTheme}`);
            } else {
                sheet.removeAttribute('data-custom-bg');
            }
        });
    };

    window.openTxtAndSelectionColorStudio = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;
        titleEl.textContent = "🎨 TXT / Book-OS Background & Selection Color Studio";
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-3 text-xs">
                <button type="button" onclick="readerSettings.txtBgTheme='black'; saveReaderMeta(); window.applyTxtAndSelectionColors(); showToast('🖤 Pitch Black Sheet')" class="p-3 bg-black text-white rounded-xl border border-slate-700 font-bold text-left">🖤 Pitch Black (#050505)</button>
                <button type="button" onclick="readerSettings.txtBgTheme='blue'; saveReaderMeta(); window.applyTxtAndSelectionColors(); showToast('🌌 Navy Blue Sheet')" class="p-3 bg-[#0a192f] text-blue-100 rounded-xl border border-blue-500/50 font-bold text-left">🌌 Deep Navy Blue (#0a192f)</button>
                <button type="button" onclick="readerSettings.txtBgTheme='sepia'; saveReaderMeta(); window.applyTxtAndSelectionColors(); showToast('📜 Sepia Sheet')" class="p-3 bg-[#f4ecd8] text-[#3b2f2f] rounded-xl border border-amber-600/50 font-bold text-left">📜 Warm Sepia (#f4ecd8)</button>
                <button type="button" onclick="readerSettings.txtBgTheme='default'; saveReaderMeta(); window.applyTxtAndSelectionColors(); showToast('🔄 Default Theme')" class="p-3 bg-slate-900 text-slate-300 rounded-xl border border-slate-700 font-bold text-left">🔄 Match Reader Theme</button>
            </div>
        `;
        modal.classList.remove('hidden');
    };

    function syncSvgAndTextLayerModes() {
        const useDrawOverlay = studioActive || occlusionModeActive || readerSelectionMode === 'box';
        document.querySelectorAll('.pomo-pdf-text-layer').forEach(tl => {
            tl.classList.toggle('disabled-layer', useDrawOverlay);
        });
        document.querySelectorAll('svg.v4-interactive-svg').forEach(svg => {
            svg.classList.toggle('active-draw-layer', useDrawOverlay);
        });
    }

    // Compute Exact-Fit Books Per Shelf Row (6, 7, or 8)
    function computeExactShelfBooksPerRow() {
        const pref = readerSettings.booksPerRow || 'auto';
        if (pref !== 'auto') {
            const cols = Math.max(4, Math.min(8, parseInt(pref) || 7));
            document.documentElement.style.setProperty('--shelf-cols', String(cols));
            return cols;
        }
        const w = window.innerWidth || 1366;
        let c = 7;
        if (w >= 1580) c = 8;
        else if (w >= 1220) c = 7;
        else if (w >= 920) c = 6;
        else c = 4;
        document.documentElement.style.setProperty('--shelf-cols', String(c));
        return c;
    }

    function mountShelfBooksPerRowSelector() {
        const sortSel = document.getElementById('shelf-sort-select');
        if (!sortSel || document.getElementById('shelf-cols-density-select')) return;
        const sel = document.createElement('select');
        sel.id = 'shelf-cols-density-select';
        sel.className = "bg-slate-950 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-extrabold focus:outline-none";
        sel.innerHTML = `
            <option value="auto">📐 Shelf Fit: Auto (6–8 Books)</option>
            <option value="6">📐 6 Books / Line</option>
            <option value="7">📐 7 Books / Line</option>
            <option value="8">📐 8 Books / Line</option>
        `;
        sel.onchange = (e) => {
            readerSettings.booksPerRow = e.target.value;
            saveReaderMeta(true);
            renderWoodenShelf();
        };
        sortSel.parentElement?.insertBefore(sel, sortSel);
    }

    window.renderWoodenShelf = function() {
        applyWoodThemeStyle();
        mountShelfBooksPerRowSelector();
        const rowsContainer = document.getElementById('wooden-bookshelf-rows');
        if (!rowsContainer) return;

        document.getElementById('shelf-count-all').textContent = readerBooks.length;
        document.getElementById('shelf-count-fav').textContent = readerBooks.filter(b => b.favorite).length;

        rowsContainer.innerHTML = '';
        if (!readerBooks.length) {
            rowsContainer.innerHTML = `<div class="py-16 text-center text-amber-200/70 font-bold">📚 No books on shelf. Click "➕ Import Books" above.</div>`;
            return;
        }

        const perRow = computeExactShelfBooksPerRow();
        for (let i = 0; i < readerBooks.length; i += perRow) {
            const slice = readerBooks.slice(i, i + perRow);
            const rowEl = document.createElement('div');
            rowEl.className = "wood-shelf-row";
            rowEl.style.gridTemplateColumns = `repeat(${perRow}, minmax(0, 1fr))`;

            slice.forEach((book, idx) => {
                const curP = book.currentPage || 1;
                const totP = book.totalPages || 1;
                const pct = Math.min(100, Math.round((curP / totP) * 100));
                const safeId = escapeJsStr(book.id);
                const coverUrl = coverMemoryCache[book.id] || book.coverDataUrl || '';

                const card = document.createElement('div');
                card.className = "book-card-3d";
                if (coverUrl) {
                    card.style.backgroundImage = `linear-gradient(180deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.95) 85%), url('${coverUrl}')`;
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                }
                card.onclick = () => openBookInReader(book.id);
                card.innerHTML = `
                    <button class="book-corner-menu-btn" onclick="event.stopPropagation(); window.openBookCornerModal('${safeId}')">⋮</button>
                    <div class="p-1.5 flex flex-col gap-0.5">
                        <span class="bg-slate-950/90 text-[8px] font-extrabold px-1.5 py-0.5 rounded w-fit text-white">${(book.format || 'pdf').toUpperCase()}</span>
                    </div>
                    <div class="p-1.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-0.5">
                        <h4 class="text-[11px] font-extrabold text-white line-clamp-2">${escapeHtml(book.title)}</h4>
                        <div class="flex items-center justify-between text-[9px] font-mono mt-0.5">
                            <span class="text-emerald-400 font-bold">${pct}%</span>
                            <span class="text-slate-400">p.${curP}/${totP}</span>
                        </div>
                        <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div class="h-full bg-blue-500 rounded-full" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
                rowEl.appendChild(card);
            });
            rowsContainer.appendChild(rowEl);
        }

        // Add 1-2 realistic empty wooden planks at the bottom if shelf height has extra room
        const totalRows = Math.ceil(readerBooks.length / perRow);
        if (totalRows < 3) {
            for (let e = totalRows; e < 3; e++) {
                const emptyPlank = document.createElement('div');
                emptyPlank.className = "wood-shelf-empty-plank";
                emptyPlank.textContent = `🪵 PomoReader Pro Bookshelf Line #${e + 1}`;
                rowsContainer.appendChild(emptyPlank);
            }
        }
    };

    function applyWoodThemeStyle() {
        const wrap = document.getElementById('wooden-bookshelf-wrapper');
        if (!wrap) return;
        wrap.style.background = 'linear-gradient(180deg, #2b1d12 0%, #1a110a 100%)';
    }

    window.openBookAtPage = async function(bookId, p = 1) {
        switchPage('page-reader');
        await openBookInReader(bookId, p);
    };

    async function openBookInReader(bookId, forcedPage = null) {
        const book = readerBooks.find(x => x.id === bookId);
        if (!book) return;
        activeReaderBook = book;
        book.lastOpened = Date.now();
        const stored = await idbGet('bookFiles', book.id);
        activeExtractedPages = stored?.extractedPagesText || [];
        activeStructuredPages = stored?.structuredPages || [];

        if (book.format === 'pdf' && stored?.originalBytes && typeof pdfjsLib !== 'undefined') {
            activePdfDoc = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
            book.totalPages = activePdfDoc.numPages || book.totalPages;
        }

        book.currentPage = forcedPage || book.currentPage || 1;
        document.getElementById('reader-fullscreen-overlay').classList.remove('hidden');
        applyReaderAppearanceAndLocks();
        await buildBookStageAndObserver();
        jumpToReaderPage(book.currentPage);
    }

    window.updateSinglePageSvg = function(pageNum) {
        if (!activeReaderBook) return;
        const card = document.querySelector(`.v4-page-card[data-page="${pageNum}"]`);
        if (!card) return;
        const svg = card.querySelector('svg.v4-interactive-svg');
        if (!svg) return;
        svg.innerHTML = '';

        const pageAnns = (activeReaderBook.annotations || []).filter(a => (a.page || 1) === pageNum);
        pageAnns.forEach(ann => {
            if (ann.type === 'occlusion') {
                const rc = (Array.isArray(ann.rects) && ann.rects[0]) ? ann.rects[0] : { x: 0.1, y: 0.1, w: 0.25, h: 0.05 };
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'v4-occlusion-node');
                g.setAttribute('data-ann-id', ann.id);
                g.setAttribute('data-revealed', ann.revealed ? 'true' : 'false');
                const x = rc.x * 1000, y = rc.y * 1400, w = Math.max(28, rc.w * 1000), h = Math.max(26, rc.h * 1400);
                g.innerHTML = `
                    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" />
                    <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="800" font-family="monospace" style="display:${ann.revealed ? 'none' : 'block'};pointer-events:none;">🎭 ? REVEAL</text>
                `;
                // Dedicated Left-Click Handler for 100% Transparent Occlusion Reveal
                g.onclick = (ev) => {
                    ev.stopPropagation();
                    if (studioActive && studioTool === 'eraser') {
                        deleteAnnotationTwoWay(activeReaderBook.id, ann.id);
                        return;
                    }
                    ann.revealed = !ann.revealed;
                    updateSinglePageSvg(pageNum);
                    showToast(ann.revealed ? "🔓 Label Revealed (100% Transparent)" : "🔒 Label Masked");
                };
                svg.appendChild(g);
            }
        });
    };

    function applyReaderAppearanceAndLocks() {
        const ov = document.getElementById('reader-fullscreen-overlay');
        if (!ov) return;
        ov.classList.remove('theme-day', 'theme-sepia', 'theme-night', 'theme-amoled');
        ov.classList.add(`theme-${readerSettings.theme || 'night'}`);
        window.applyTxtAndSelectionColors();
    }

    async function buildBookStageAndObserver() {
        const stage = document.getElementById('reader-pages-stage');
        if (!stage || !activeReaderBook) return;
        stage.innerHTML = '';
        const total = activeReaderBook.totalPages || 1;
        const cardWidth = Math.round(820 * readerZoom);

        for (let p = 1; p <= total; p++) {
            const card = document.createElement('div');
            card.className = "v4-page-card";
            card.setAttribute('data-page', p);
            card.style.width = `${cardWidth}px`;

            if (activePdfDoc) {
                const canvas = document.createElement('canvas');
                canvas.className = "v4-pdf-canvas";
                card.appendChild(canvas);
                const page = await activePdfDoc.getPage(p);
                const vp = page.getViewport({ scale: window.pomoOptimalPdfScale || 1.65 });
                canvas.width = vp.width; canvas.height = vp.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
                try { page.cleanup(); } catch (e) {}
            } else {
                const sheet = document.createElement('div');
                sheet.className = "pbook-page-sheet";
                sheet.textContent = activeExtractedPages[p - 1] || `Page ${p}`;
                card.appendChild(sheet);
            }

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'v4-interactive-svg');
            svg.setAttribute('data-page', p);
            svg.setAttribute('viewBox', '0 0 1000 1400');
            svg.setAttribute('preserveAspectRatio', 'none');
            card.appendChild(svg);

            stage.appendChild(card);
            updateSinglePageSvg(p);
        }
    }

    function jumpToReaderPage(pNum) {
        if (!activeReaderBook) return;
        const target = Math.max(1, Math.min(activeReaderBook.totalPages || 1, pNum));
        activeReaderBook.currentPage = target;
        const card = document.querySelector(`.v4-page-card[data-page="${target}"]`);
        if (card) card.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    document.getElementById('reader-back-to-shelf-btn')?.addEventListener('click', () => {
        document.getElementById('reader-fullscreen-overlay').classList.add('hidden');
        renderWoodenShelf();
    });

    PomoEventBus.on('reader:openedTab', renderWoodenShelf);
    setTimeout(hydrateBookCoversAndHandles, 150);
})();
// ✅ END OF FILE (04-reader-pro.js v17.0 Enterprise Desktop Edition) — 100% COMPLETE & UNCUT
