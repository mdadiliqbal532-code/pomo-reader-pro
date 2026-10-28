/* =========================================================================
   04-READER-PRO.JS (v17.2 FULL MASTER RESTORATION — ZERO FEATURES REMOVED)
   3D WOODEN BOOKSHELF (DRAG-DROP, SEQUENCE ◀/▶, SECTIONS/GRID, 0MB OFFLOAD),
   MULTI-BOOK IMPORT (PDF/EPUB/DOCX/MD/TXT) + PRIORITY GENRE LOCK,
   REAL PDFLIB ANNOTATION BAKING, TELEGRAM TDLIB / GDRIVE / DROPBOX CLOUD SYNC,
   SETTINGS 1–10 MASTER CONTROL CENTER, 6-MONTH BAR CHART & CALENDAR,
   CALIBRATED PDF TEXT LAYER, 9-ACTION FLOATING DOCK, 60FPS PENCIL & SHAPE
   STUDIO WITH MOVE/RESIZE HANDLES, 100% TRANSPARENT OCCLUSION REVEAL, TOC, TTS
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
       1. UNIFIED READER STATE, POLYMATH GENRES & AUTO-ADAPTIVE HARDWARE SCALER
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
            dropbox: { name: 'Dropbox', icon: '📦', connected: false, folderName: '', token: '', status: 'Not Connected' },
            onedrive: { name: 'OneDrive', icon: '☁️', connected: false, folderName: '', token: '', status: 'Not Connected' },
            mega: { name: 'Mega Storage', icon: 'Ⓜ️', connected: false, folderName: '', token: '', status: 'Not Connected' }
        }
    };

    if (!readerSettings.booksPerRow) readerSettings.booksPerRow = 'auto';
    if (!readerSettings.txtBgTheme) readerSettings.txtBgTheme = 'default';
    if (!readerSettings.txtSelColor) readerSettings.txtSelColor = 'rgba(37, 99, 235, 0.55)';
    if (!readerSettings.pdfSelColor) readerSettings.pdfSelColor = 'rgba(37, 99, 235, 0.32)';

    readerBooks.forEach((b, idx) => {
        if (typeof b.readSeq !== 'number') b.readSeq = idx + 1;
        if (!Array.isArray(b.annotations)) b.annotations = [];
        if (!Array.isArray(b.deletedAnnotationIds)) b.deletedAnnotationIds = [];
        if (!Array.isArray(b.sources)) b.sources = ['local'];
    });

    function applyHighlightColorVariables() {
        document.documentElement.style.setProperty('--pdf-sel-bg', readerSettings.pdfSelColor || 'rgba(37, 99, 235, 0.32)');
        document.documentElement.style.setProperty('--txt-sel-bg', readerSettings.txtSelColor || 'rgba(37, 99, 235, 0.55)');
    }
    applyHighlightColorVariables();

    async function detectAndApplyReaderHardwareTier() {
        const rawRam = navigator.deviceMemory || 8;
        const cores = navigator.hardwareConcurrency || 8;
        const heapLimitBytes = window.performance?.memory?.jsHeapSizeLimit || 0;
        const heapLimitGb = heapLimitBytes / (1024 * 1024 * 1024);

        let quotaGb = 0;
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const est = await navigator.storage.estimate();
                if (est && est.quota) quotaGb = Math.round(est.quota / (1024 * 1024 * 1024));
            }
        } catch (e) {}

        if ((rawRam >= 8 && cores >= 12) || heapLimitGb >= 3.5 || quotaGb >= 200) {
            window.pomoHardwareTier = 1;
            window.pomoMaxPageBufferWindow = 40;
            window.pomoOptimalPdfScale = 2.0;
        } else if (rawRam >= 8 && cores >= 8) {
            window.pomoHardwareTier = 2;
            window.pomoMaxPageBufferWindow = 22;
            window.pomoOptimalPdfScale = 1.75;
        } else if (rawRam >= 6) {
            window.pomoHardwareTier = 3;
            window.pomoMaxPageBufferWindow = 12;
            window.pomoOptimalPdfScale = 1.45;
        } else {
            window.pomoHardwareTier = 4;
            window.pomoMaxPageBufferWindow = 5;
            window.pomoOptimalPdfScale = 1.15;
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
    let activeA10Source = 'local';

    let activeReaderBook = null;
    let activePdfDoc = null;
    let activeExtractedPages = [];
    let activeStructuredPages = [];
    let readerZoom = 1.0;
    let studioActive = false;
    let studioTool = 'line';
    let studioStrokeWidth = 4;
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
    let activeLineViewerAnnId = null;
    let activeTocDrawerTab = 'chapters';
    let a9CalendarCursor = new Date();
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    // Global State Bridges for 05-pomodoc-forge.js & 06-onenote-studio.js
    window.getActiveReaderBook = () => activeReaderBook;
    window.getActivePdfDoc = () => activePdfDoc;
    window.getRenderedCanvasPages = () => renderedCanvasPages;
    window.getPageTextItemsCache = () => pageTextItemsCache;
    window.getActiveExtractedPages = () => activeExtractedPages;
    window.getActiveStructuredPages = () => activeStructuredPages;
    window.getReaderSelectionMode = () => readerSelectionMode;
    window.setReaderSelectionMode = (m) => {
        readerSelectionMode = m;
        document.querySelectorAll('.pomo-pdf-text-layer').forEach(layer => {
            layer.classList.toggle('disabled-layer', studioActive || occlusionModeActive || readerSelectionMode === 'direct');
        });
        document.querySelectorAll('.v4-interactive-svg').forEach(svg => {
            const act = studioActive || occlusionModeActive || readerSelectionMode === 'direct';
            svg.classList.toggle('active-draw-layer', act);
        });
    };
    window.getOcclusionModeActive = () => occlusionModeActive;
    window.setOcclusionModeActive = (val) => {
        occlusionModeActive = Boolean(val);
        window.setReaderSelectionMode(readerSelectionMode);
    };
    window.getBionicReadingActive = () => bionicReadingActive;
    window.setBionicReadingActive = (val) => {
        bionicReadingActive = Boolean(val);
        if (activeReaderBook) buildBookStageAndObserver().then(() => jumpToReaderPage(activeReaderBook.currentPage || 1));
    };
    window.getReaderZoom = () => readerZoom;
    window.setReaderZoom = (z) => {
        readerZoom = Math.max(0.5, Math.min(2.6, z));
        const lbl = document.getElementById('reader-zoom-label');
        if (lbl) lbl.textContent = `${Math.round(readerZoom * 100)}%`;
        applyZoomToExistingPages();
    };
    window.rebuildActiveReaderStage = async (targetPage = null) => {
        if (!activeReaderBook) return;
        await buildBookStageAndObserver();
        jumpToReaderPage(targetPage || activeReaderBook.currentPage || 1);
    };
    window.refreshSingleReaderPageSvg = (pageNum) => updateSinglePageSvg(pageNum);

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

                const pagesPerChunk = 25;
                const totalChunks = Math.ceil(pagesTextArray.length / pagesPerChunk);
                await indexRef.set({
                    bookId: b.id, title: b.title, shelfName: b.shelfName || 'General Shelf',
                    readSeq: b.readSeq || 1, totalPages: b.totalPages || pagesTextArray.length,
                    totalChunks, telegramFileId: b.telegramFileId || '', gdriveFileId: b.gdriveFileId || '',
                    dropboxPath: b.dropboxPath || '', outline: b.outline || [], updatedAt: Date.now()
                }, { merge: true });

                for (let c = 0; c < totalChunks; c++) {
                    const slice = pagesTextArray.slice(c * pagesPerChunk, (c + 1) * pagesPerChunk).map((txt, idx) => ({
                        p: (c * pagesPerChunk) + idx + 1, t: String(txt || '').slice(0, 12000)
                    }));
                    await indexRef.collection('page_chunks').doc(String(c)).set({
                        chunkIndex: c, startPage: c * pagesPerChunk + 1,
                        endPage: Math.min(pagesTextArray.length, (c + 1) * pagesPerChunk), pages: slice
                    });
                }
                b.hasCloudPageIndex = true;
                saveReaderMeta(true);
                return true;
            } catch (e) { return false; }
        },

        async getPageRangeText(bookId, startPage = 1, endPage = 5) {
            const stored = await idbGet('bookFiles', bookId);
            const s = Math.max(1, parseInt(startPage) || 1);
            const e = Math.max(s, parseInt(endPage) || s);
            if (stored && Array.isArray(stored.extractedPagesText) && stored.extractedPagesText.length >= s) {
                return stored.extractedPagesText.slice(s - 1, e).map((t, i) => `--- PAGE ${s + i} ---\n${t}`).join('\n\n');
            }
            return '';
        },

        async sendSelectionToExternalStudio(payload) {
            const packet = {
                id: 'bridge_' + Date.now(),
                bookId: payload.bookId || activeReaderBook?.id || '',
                bookTitle: payload.bookTitle || activeReaderBook?.title || 'Book Passage',
                shelfName: payload.shelfName || activeReaderBook?.shelfName || 'General Shelf',
                startPage: payload.startPage || activeReaderBook?.currentPage || 1,
                endPage: payload.endPage || payload.startPage || activeReaderBook?.currentPage || 1,
                selectedText: payload.selectedText || '',
                telegramFileId: payload.telegramFileId || activeReaderBook?.telegramFileId || '',
                gdriveFileId: payload.gdriveFileId || activeReaderBook?.gdriveFileId || '',
                dropboxPath: payload.dropboxPath || activeReaderBook?.dropboxPath || '',
                timestamp: Date.now()
            };
            try { studioBroadcastChan?.postMessage({ type: 'STUDIO_IMPORT_PASSAGE', packet }); } catch (e) {}
            try {
                const inbox = JSON.parse(safeGet('pages_pomodoro_studio_bridge_inbox_v1', '[]'));
                inbox.unshift(packet);
                safeSet('pages_pomodoro_studio_bridge_inbox_v1', JSON.stringify(inbox.slice(0, 30)));
            } catch (e) {}

            const citationStr = `📘 [${packet.shelfName}] ${packet.bookTitle} (Page ${packet.startPage}${packet.endPage > packet.startPage ? `–${packet.endPage}` : ''}):\n"${packet.selectedText}"`;
            try { await navigator.clipboard.writeText(citationStr); } catch (e) {}
            showToast(`📤 Sent to External Studio Bridge & Copied Citation (p.${packet.startPage})!`);
        },

        async writeDesktopFolderLibraryIndex() {
            if (!mainDirectoryHandle) return;
            try {
                const fh = await mainDirectoryHandle.getFileHandle('pomo-library-index.json', { create: true });
                const wr = await fh.createWritable();
                const payload = { updatedAt: Date.now(), customShelves, readerBooks: readerBooks.map(b => ({ ...b, coverDataUrl: '' })) };
                await wr.write(JSON.stringify(payload, null, 2));
                await wr.close();
            } catch (e) {}
        }
    };

    window.updatePendingSyncBadge = function() {
        const count = (window.readerBooks || []).filter(b => b.pendingCloudSync).length;
        const badge = document.getElementById('pending-sync-count-badge');
        if (badge) badge.textContent = count;
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
        updatePendingSyncBadge();
        updateHomeContinueReadingWidget();
        PomoEventBus.emit('reader:updated', { booksCount: readerBooks.length });
        if (!skipCloudBroadcast && !isApplyingRemoteReaderSync) broadcastReaderLedgerToCloud();
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
        try {
            const savedMain = await idbGet('handles', 'mainFolder');
            if (savedMain && savedMain.handle) {
                mainDirectoryHandle = savedMain.handle;
                readerSettings.mainFolderName = savedMain.name || mainDirectoryHandle.name;
                updateMainFolderUI();
            }
            const cloudKeys = ['gdrive', 'dropbox', 'onedrive', 'mega', 'telegram'];
            for (const ck of cloudKeys) {
                const hObj = await idbGet('handles', 'cloud_' + ck);
                if (hObj && hObj.handle) {
                    cloudDirectoryHandles[ck] = hObj.handle;
                    if (readerSettings.clouds[ck]) {
                        readerSettings.clouds[ck].connected = true;
                        readerSettings.clouds[ck].folderName = hObj.name;
                        readerSettings.clouds[ck].status = `Synced Folder: ${hObj.name}`;
                    }
                }
            }
        } catch (e) {}
        saveReaderMeta(true);
        renderCustomShelvesBar();
        renderWoodenShelf();
    }

    function updateMainFolderUI() {
        const lbl = document.getElementById('reader-main-folder-label');
        const st = document.getElementById('settings-main-folder-status');
        if (readerSettings.mainFolderName) {
            if (lbl) lbl.textContent = `📂 Main Folder: ${readerSettings.mainFolderName} • Auto-Import ${readerSettings.autoFolderImport ? 'ON' : 'OFF'} • Bridge Ready`;
            if (st) st.textContent = `Connected Main Folder: "${readerSettings.mainFolderName}" (Respects Manual Genre Locks)`;
        }
    }

    /* =========================================================================
       2. REAL PDFLIB ANNOTATION BAKING & MULTI-CLOUD SYNC (TG, GDRIVE, DROPBOX)
       ========================================================================= */
    function hexToRgb01(hex) {
        const clean = (hex || '#facc15').replace('#', '');
        const num = parseInt(clean, 16) || 0xfacc15;
        return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
    }

    window.bakeAnnotationsIntoPdfBytes = async function(book) {
        const stored = await idbGet('bookFiles', book.id);
        if (!stored || !stored.originalBytes) return null;
        if (book.format !== 'pdf' || typeof PDFLib === 'undefined') {
            return new Uint8Array(stored.originalBytes);
        }
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(stored.originalBytes, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            pdfDoc.setTitle(book.title || 'PomoReader Book');
            pdfDoc.setAuthor(book.author || 'PomoReader Pro');
            pdfDoc.setSubject(JSON.stringify({ pomoBookId: book.id, rev: book.rev || 1, currentPage: book.currentPage }));

            (book.annotations || []).forEach(ann => {
                const pIdx = Math.max(0, Math.min(pages.length - 1, (ann.page || 1) - 1));
                const page = pages[pIdx];
                if (!page) return;
                const { width, height } = page.getSize();
                const c = hexToRgb01(ann.color || '#facc15');
                const pdfColor = PDFLib.rgb(c.r, c.g, c.b);

                if (ann.type === 'highlight' || ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment') {
                    const rects = (Array.isArray(ann.rects) && ann.rects.length > 0) ? ann.rects : [{ x: 0.08, y: ann.yNorm || 0.2, w: 0.84, h: 0.024 }];
                    rects.forEach(rc => {
                        const rw = Math.max(12, rc.w * width);
                        const rh = Math.max(10, rc.h * height);
                        const rx = rc.x * width;
                        const ry = height - (rc.y * height) - rh;
                        page.drawRectangle({ x: rx, y: Math.max(4, ry), width: rw, height: rh, color: pdfColor, opacity: 0.34 });
                    });
                    if (ann.note || ann.type === 'bookmark') {
                        const firstY = rects[0] ? rects[0].y : (ann.yNorm || 0.2);
                        const by = Math.max(15, Math.min(height - 20, height - (firstY * height)));
                        page.drawText(`[${(ann.type || 'NOTE').toUpperCase()}] ${(ann.note || ann.text || '').slice(0, 75)}`, {
                            x: Math.max(12, width - 210), y: by, size: 7.5, color: PDFLib.rgb(0.85, 0.15, 0.15)
                        });
                    }
                } else if (ann.type === 'drawing') {
                    const sw = ann.strokeWidth || 3;
                    if ((ann.tool === 'pen' || ann.tool === 'hl') && Array.isArray(ann.points) && ann.points.length > 1) {
                        for (let i = 1; i < ann.points.length; i++) {
                            const p0 = ann.points[i - 1], p1 = ann.points[i];
                            page.drawLine({
                                start: { x: p0.x * width, y: height - (p0.y * height) },
                                end: { x: p1.x * width, y: height - (p1.y * height) },
                                thickness: ann.tool === 'hl' ? 14 : sw,
                                color: pdfColor,
                                opacity: ann.tool === 'hl' ? 0.32 : 0.9
                            });
                        }
                    } else if (ann.tool === 'line' || ann.tool === 'arrow' || ann.tool === 'darrow') {
                        page.drawLine({
                            start: { x: (ann.x1 || 0.1) * width, y: height - ((ann.y1 || 0.1) * height) },
                            end: { x: (ann.x2 || 0.3) * width, y: height - ((ann.y2 || 0.3) * height) },
                            thickness: sw, color: pdfColor, opacity: 0.92
                        });
                    } else if (ann.tool === 'rect') {
                        const rx = Math.min(ann.x1, ann.x2) * width;
                        const rw = Math.max(8, Math.abs(ann.x2 - ann.x1) * width);
                        const rh = Math.max(8, Math.abs(ann.y2 - ann.y1) * height);
                        const ry = height - (Math.max(ann.y1, ann.y2) * height);
                        page.drawRectangle({ x: rx, y: ry, width: rw, height: rh, borderColor: pdfColor, borderWidth: sw, opacity: 0.1 });
                    } else if (ann.tool === 'text' && ann.text) {
                        page.drawText(String(ann.text).slice(0, 90), {
                            x: (ann.x1 || 0.1) * width, y: height - ((ann.y1 || 0.1) * height),
                            size: Math.max(8, (ann.fontSize || 20) * 0.65), color: pdfColor
                        });
                    }
                }
            });

            const bakedUint8 = await pdfDoc.save();
            stored.bakedBytes = bakedUint8.buffer;
            await idbPut('bookFiles', stored);
            return bakedUint8;
        } catch (e) {
            return new Uint8Array(stored.originalBytes);
        }
    };

    async function writeBakedPdfToFolderHandle(dirHandle, fileName, uint8Bytes) {
        if (!dirHandle || !uint8Bytes) return false;
        try {
            let perm = await dirHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') perm = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') return false;
            const fh = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fh.createWritable();
            await writable.write(uint8Bytes);
            await writable.close();
            return true;
        } catch (e) { return false; }
    }

    async function syncBookWithTelegramCloud(book, bakedUint8) {
        const token = safeGet('pages_pomodoro_tg_token', '');
        const chatId = safeGet('pages_pomodoro_tg_chatid', '');
        const tdlibUrl = (readerSettings.clouds.telegram?.tdlibUrl || '').trim();
        if ((!token || !chatId) && !tdlibUrl) return false;
        if (!navigator.onLine) { book.pendingCloudSync = true; return false; }

        try {
            const form = new FormData();
            form.append('chat_id', chatId);
            const blob = new Blob([bakedUint8], { type: 'application/pdf' });
            form.append('document', blob, book.fileName || `${book.title}.pdf`);
            form.append('caption', `📘 *${book.title}*\n📊 Progress: ${book.progressPct || 0}% (Page ${book.currentPage}/${book.totalPages})\n🔖 Annotations: ${(book.annotations || []).length}`);
            form.append('parse_mode', 'Markdown');

            const endpoint = tdlibUrl ? `${tdlibUrl.replace(/\/$/, '')}/bot${token}/sendDocument` : `${HTTPS}api.telegram.org/bot${token}/sendDocument`;
            const res = await fetch(endpoint, { method: 'POST', body: form });
            const json = await res.json();
            if (json && json.ok) {
                book.telegramMsgId = json.result?.message_id;
                if (json.result?.document?.file_id) book.telegramFileId = json.result.document.file_id;
                if (!book.sources.includes('telegram')) book.sources.push('telegram');
                readerSettings.clouds.telegram.connected = true;
                readerSettings.clouds.telegram.status = `Synced (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                return true;
            }
        } catch (e) { book.pendingCloudSync = true; }
        return false;
    }

    async function syncBookWithGoogleDriveApi(book, bakedUint8) {
        const gd = readerSettings.clouds.gdrive;
        if (!gd || !gd.token || !navigator.onLine) return false;
        try {
            const metadata = { name: book.fileName || `${book.title}.pdf`, mimeType: 'application/pdf', description: `PomoReader Sync rev ${book.rev || 1}` };
            if (gd.folderId && !book.gdriveFileId) metadata.parents = [gd.folderId];
            const boundary = '-------PomoReaderGDriveBoundary' + Date.now();
            const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
            const closePart = `\r\n--${boundary}--`;
            const bodyBlob = new Blob([metaPart, bakedUint8, closePart], { type: `multipart/related; boundary=${boundary}` });

            const url = book.gdriveFileId
                ? `${HTTPS}www.googleapis.com/upload/drive/v3/files/${book.gdriveFileId}?uploadType=multipart`
                : `${HTTPS}www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
            const res = await fetch(url, {
                method: book.gdriveFileId ? 'PATCH' : 'POST',
                headers: { 'Authorization': `Bearer ${gd.token}` },
                body: bodyBlob
            });
            if (res.ok) {
                const data = await res.json();
                if (data.id) book.gdriveFileId = data.id;
                if (!book.sources.includes('gdrive')) book.sources.push('gdrive');
                gd.connected = true;
                gd.status = `API Synced (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                return true;
            }
        } catch (e) {}
        return false;
    }

    async function syncBookWithDropboxApi(book, bakedUint8) {
        const dbx = readerSettings.clouds.dropbox;
        if (!dbx || !dbx.token || !navigator.onLine) return false;
        try {
            const dropboxPath = `/PomoReader/${book.fileName || (book.title + '.pdf')}`;
            const res = await fetch(`${HTTPS}content.dropboxapi.com/2/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${dbx.token}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath, mode: 'overwrite', autorename: false, mute: true }),
                    'Content-Type': 'application/octet-stream'
                },
                body: bakedUint8
            });
            if (res.ok) {
                book.dropboxPath = dropboxPath;
                if (!book.sources.includes('dropbox')) book.sources.push('dropbox');
                dbx.connected = true;
                dbx.status = `API Synced (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                return true;
            }
        } catch (e) {}
        return false;
    }

    window.syncSingleBookEverywhere = async function(bookId, manualTrigger = false) {
        const book = readerBooks.find(x => x.id === bookId);
        if (!book) return;
        const bakedUint8 = await window.bakeAnnotationsIntoPdfBytes(book);
        if (!bakedUint8) return;

        let syncedTargets = 0;
        const bookHandleObj = await idbGet('handles', 'book_' + book.id);
        if (bookHandleObj && bookHandleObj.handle) {
            try {
                const wr = await bookHandleObj.handle.createWritable();
                await wr.write(bakedUint8);
                await wr.close();
                syncedTargets++;
            } catch (e) {}
        } else if (mainDirectoryHandle) {
            const ok = await writeBakedPdfToFolderHandle(mainDirectoryHandle, book.fileName, bakedUint8);
            if (ok) syncedTargets++;
        }

        for (const [ck, dirH] of Object.entries(cloudDirectoryHandles)) {
            if (dirH && (book.sources.includes(ck) || book.autoSync)) {
                const ok = await writeBakedPdfToFolderHandle(dirH, book.fileName, bakedUint8);
                if (ok) syncedTargets++;
            }
        }

        if (book.sources.includes('gdrive') || readerSettings.clouds.gdrive?.token) {
            if (await syncBookWithGoogleDriveApi(book, bakedUint8)) syncedTargets++;
        }
        if (book.sources.includes('dropbox') || readerSettings.clouds.dropbox?.token) {
            if (await syncBookWithDropboxApi(book, bakedUint8)) syncedTargets++;
        }
        if (book.sources.includes('telegram') || safeGet('pages_pomodoro_tg_token', '')) {
            if (await syncBookWithTelegramCloud(book, bakedUint8)) syncedTargets++;
        }

        await window.uploadBookBinaryToWirelessCloud(book.id);
        book.pendingCloudSync = false;
        saveReaderMeta();
        if (manualTrigger) showToast(`☁️ Baked PDF & annotations synced (${syncedTargets} targets)!`);
    };

    window.syncAllPendingReaderBooks = async function() {
        const list = readerBooks.filter(b => b.pendingCloudSync);
        if (!list.length) { showToast("All books are already in sync!"); return; }
        showToast(`🔄 Syncing ${list.length} book(s) across clouds...`);
        for (const b of list) await window.syncSingleBookEverywhere(b.id, false);
        saveReaderMeta();
        showToast("✅ All pending books synced!");
    };
    document.getElementById('sync-all-clouds-now-btn')?.addEventListener('click', window.syncAllPendingReaderBooks);

    function broadcastReaderLedgerToCloud() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || isApplyingRemoteReaderSync || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        clearTimeout(readerWirelessSyncTimer);
        readerWirelessSyncTimer = setTimeout(async () => {
            try {
                const db = firebase.firestore();
                const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                    .collection('public').doc('data').collection('sync_rooms').doc(roomId)
                    .collection('reader_pro').doc('ledger');
                const slimBooks = readerBooks.map(b => ({ ...b, coverDataUrl: '' }));
                await ledgerDoc.set({
                    booksJson: JSON.stringify(slimBooks), shelvesJson: JSON.stringify(customShelves),
                    readingLogJson: JSON.stringify(readerReadingLog), updatedAt: Date.now()
                }, { merge: true });
                window.PomoStudioBridge.writeDesktopFolderLibraryIndex();
            } catch (e) {}
        }, 450);
    }

    function mergeRemoteReaderBookCRDT(localBook, remoteBook) {
        if (!localBook) return remoteBook;
        const merged = { ...localBook };
        if ((remoteBook.lastModified || 0) >= (localBook.lastModified || 0)) {
            merged.title = remoteBook.title || localBook.title;
            merged.author = remoteBook.author || localBook.author;
            merged.shelfName = remoteBook.shelfName || localBook.shelfName;
            merged.readSeq = remoteBook.readSeq || localBook.readSeq;
            merged.category = remoteBook.category || localBook.category;
            merged.favorite = remoteBook.favorite ?? localBook.favorite;
        }
        if ((remoteBook.lastOpened || 0) > (localBook.lastOpened || 0)) {
            merged.currentPage = remoteBook.currentPage || localBook.currentPage;
            merged.progressPct = remoteBook.progressPct || localBook.progressPct;
            merged.lastOpened = remoteBook.lastOpened;
        }
        merged.readingMins = Math.max(localBook.readingMins || 0, remoteBook.readingMins || 0);
        const delSet = new Set([...(localBook.deletedAnnotationIds || []), ...(remoteBook.deletedAnnotationIds || [])]);
        merged.deletedAnnotationIds = Array.from(delSet);
        const annMap = new Map();
        (localBook.annotations || []).forEach(a => { if (a && a.id && !delSet.has(a.id)) annMap.set(a.id, a); });
        (remoteBook.annotations || []).forEach(ra => {
            if (!ra || !ra.id || delSet.has(ra.id)) return;
            const la = annMap.get(ra.id);
            if (!la || (ra.updatedAt || ra.createdAt || 0) >= (la.updatedAt || la.createdAt || 0)) annMap.set(ra.id, ra);
        });
        merged.annotations = Array.from(annMap.values());
        return merged;
    }

    function setupWirelessReaderCloudSync() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        try {
            if (readerCloudUnsubscribe) readerCloudUnsubscribe();
            const db = firebase.firestore();
            const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data').collection('sync_rooms').doc(roomId)
                .collection('reader_pro').doc('ledger');

            readerCloudUnsubscribe = ledgerDoc.onSnapshot((snap) => {
                if (!snap.exists) return;
                const data = snap.data();
                isApplyingRemoteReaderSync = true;
                try {
                    if (data.booksJson) {
                        const remoteBooks = JSON.parse(data.booksJson);
                        if (Array.isArray(remoteBooks)) {
                            const localMap = new Map(readerBooks.map(b => [b.id, b]));
                            remoteBooks.forEach(rb => {
                                localMap.set(rb.id, mergeRemoteReaderBookCRDT(localMap.get(rb.id), rb));
                            });
                            window.readerBooks = Array.from(localMap.values());
                        }
                    }
                    saveReaderMeta(true);
                    renderCustomShelvesBar();
                    renderWoodenShelf();
                    if (activeReaderBook) {
                        const updatedActive = readerBooks.find(b => b.id === activeReaderBook.id);
                        if (updatedActive) {
                            activeReaderBook = updatedActive;
                            updateSinglePageSvg(activeReaderBook.currentPage || 1);
                        }
                    }
                } catch (err) {}
                isApplyingRemoteReaderSync = false;
            });
        } catch (e) {}
    }

    window.offloadBookBinaryToSaveLocalSpace = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || (!stored.originalBytes && !stored.bakedBytes)) {
            showToast("☁️ Book PDF binary is already offloaded (0 MB local use)!");
            return;
        }
        await idbPut('bookFiles', {
            id: b.id, originalBytes: null, bakedBytes: null,
            structuredPages: stored.structuredPages || null, extractedPagesText: stored.extractedPagesText || []
        });
        b.isOffloadedZeroStorage = true;
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`☁️ Offloaded "${b.title}" PDF binary! Local storage freed.`);
    };

    window.uploadBookBinaryToWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored) { showToast("Book binary not found.", true); return; }
        if (Array.isArray(stored.extractedPagesText) && stored.extractedPagesText.length > 0) {
            await window.PomoStudioBridge.syncBookPageIndexToCloud(b.id, stored.extractedPagesText);
        }
        showToast(`✅ "${b.title}" synced & indexed for Studio Bridge!`);
    };

    window.downloadBookBinaryFromWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return null;
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') return null;
        try {
            showToast(`📲 Streaming "${b.title}" from PomoCloud Room...`);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data').collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);
            const metaSnap = await binRef.get();
            if (!metaSnap.exists) return null;
            const chunksSnap = await binRef.collection('chunks').get();
            const chunks = [];
            chunksSnap.forEach(doc => chunks.push(doc.data()));
            chunks.sort((a, b) => a.idx - b.idx);
            const bin = atob(chunks.map(c => c.data).join(''));
            const len = bin.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);

            const record = { id: b.id, originalBytes: bytes.buffer, bakedBytes: null, extractedPagesText: [] };
            await idbPut('bookFiles', record);
            b.isOffloadedZeroStorage = false;
            renderWoodenShelf();
            showToast(`✅ "${b.title}" streamed wirelessly!`);
            return record;
        } catch (e) { return null; }
    };

    function mountHomeContinueReadingWidget() {
        const rightCol = document.querySelector('#page-timer .cockpit-right');
        if (!rightCol || document.getElementById('home-reader-widget-card')) return;
        const widget = document.createElement('div');
        widget.id = 'home-reader-widget-card';
        widget.className = "w-full bg-slate-900/90 border border-slate-800/90 p-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 min-w-0 max-w-full overflow-hidden";
        rightCol.appendChild(widget);
        updateHomeContinueReadingWidget();
    }

    function updateHomeContinueReadingWidget() {
        const widget = document.getElementById('home-reader-widget-card');
        if (!widget) return;
        const sorted = [...readerBooks].sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
        const latest = sorted[0];

        if (!latest) {
            widget.innerHTML = `
                <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span class="text-xl shrink-0">📖</span>
                    <div class="min-w-0 flex-1 overflow-hidden">
                        <p class="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 truncate">PomoReader Pro</p>
                        <p class="text-xs font-bold text-slate-300 truncate">No books imported yet — Click to open Shelf</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="switchPage('page-reader')" class="bg-blue-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold">Shelf</button>
                </div>
            `;
            return;
        }

        const pct = Math.min(100, Math.round(((latest.currentPage || 1) / Math.max(1, latest.totalPages || 1)) * 100));
        const shortTitle = String(latest.title || 'Book').length > 44 ? String(latest.title).slice(0, 42) + '…' : String(latest.title || 'Book');
        const safeLatestId = escapeJsStr(latest.id);

        widget.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden cursor-pointer" onclick="openBookAtPage('${safeLatestId}', ${latest.currentPage || 1})">
                <div class="w-8 h-11 rounded-lg bg-slate-950 border border-amber-500/40 shrink-0 bg-cover bg-center flex items-center justify-center text-xs" style="${coverMemoryCache[latest.id] ? `background-image:url('${coverMemoryCache[latest.id]}')` : ''}">
                    ${coverMemoryCache[latest.id] ? '' : '📘'}
                </div>
                <div class="min-w-0 flex-1 overflow-hidden">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 shrink-0">📖 Continue Reading</span>
                        <span class="text-[9px] font-mono text-emerald-400 font-bold shrink-0">${pct}% • p.${latest.currentPage}/${latest.totalPages}</span>
                    </div>
                    <p class="text-xs font-extrabold text-white truncate block max-w-full" title="${escapeHtml(latest.title)}">${escapeHtml(shortTitle)}</p>
                    <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                        <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="openBookAtPage('${safeLatestId}', ${latest.currentPage || 1})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold shadow">Resume ➔</button>
            </div>
        `;
    }

    /* =========================================================================
       3. MULTI-BOOK IMPORT (PDF, EPUB, DOCX, MD, TXT) & PRIORITY GENRE MODAL
       ========================================================================= */
    async function computeBookFingerprint(file, arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        let hash = 2166136261;
        const step = Math.max(1, Math.floor(bytes.length / 4096));
        for (let i = 0; i < bytes.length; i += step) {
            hash ^= bytes[i];
            hash = Math.imul(hash, 16777619);
        }
        return 'book_' + (hash >>> 0).toString(16) + '_' + bytes.length;
    }

    async function extractOutlineFromPdf(pdf) {
        const list = [];
        try {
            const rawOutline = await pdf.getOutline();
            if (rawOutline && rawOutline.length) {
                for (const item of rawOutline) {
                    let pageNum = 1;
                    try {
                        if (typeof item.dest === 'string') {
                            const dest = await pdf.getDestination(item.dest);
                            if (dest && dest[0]) pageNum = (await pdf.getPageIndex(dest[0])) + 1;
                        } else if (Array.isArray(item.dest) && item.dest[0]) {
                            pageNum = (await pdf.getPageIndex(item.dest[0])) + 1;
                        }
                    } catch (e) {}
                    list.push({ id: 'ch_' + Math.random().toString(36).slice(2, 8), title: item.title || `Section (p.${pageNum})`, page: pageNum });
                }
            }
        } catch (e) {}
        return list;
    }

    async function generatePdfCoverAndMeta(arrayBuffer) {
        const info = { totalPages: 1, author: '', creator: '', producer: '', coverDataUrl: '', outline: [], pagesText: [] };
        if (typeof pdfjsLib === 'undefined') return info;
        let pdf = null;
        try {
            pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            info.totalPages = pdf.numPages || 1;
            try {
                const meta = await pdf.getMetadata();
                if (meta && meta.info) {
                    info.author = meta.info.Author || '';
                    info.creator = meta.info.Creator || '';
                    info.producer = meta.info.Producer || '';
                }
            } catch (e) {}
            info.outline = await extractOutlineFromPdf(pdf);

            const scanLimit = Math.min(info.totalPages, 35);
            for (let p = 1; p <= scanLimit; p++) {
                try {
                    const pg = await pdf.getPage(p);
                    const tc = await pg.getTextContent();
                    info.pagesText.push(tc.items.map(i => i.str).join(' '));
                    try { pg.cleanup(); } catch (e) {}
                } catch (e) {}
            }
            const page = await pdf.getPage(1);
            const vp = page.getViewport({ scale: 0.45 });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            info.coverDataUrl = canvas.toDataURL('image/jpeg', 0.78);
            try { page.cleanup(); } catch (e) {}
        } catch (e) {
        } finally {
            if (pdf) { try { await pdf.destroy(); } catch (err) {} }
        }
        return info;
    }

    async function extractTextFromDocx(arrayBuffer) {
        if (typeof JSZip === 'undefined') return ['DOCX loaded.'];
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const docXml = await zip.file('word/document.xml')?.async('string');
            if (!docXml) return ['Empty DOCX document.'];
            const fullText = docXml.replace(/<\/w:p>/g, '\n\n').replace(/<[^>]+>/g, '');
            const pages = [];
            for (let i = 0; i < fullText.length; i += 2400) pages.push(fullText.slice(i, i + 2400));
            return pages.length ? pages : ['Empty DOCX'];
        } catch (e) { return ['Could not parse DOCX file.']; }
    }

    async function extractTextFromEpub(arrayBuffer) {
        if (typeof JSZip === 'undefined') return { pages: ['EPUB loaded.'], outline: [] };
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            const pages = [], outline = [];
            const htmlFiles = Object.keys(zip.files).filter(f => /\.(xhtml|html|htm)$/i.test(f)).sort();
            for (const fName of htmlFiles) {
                const rawHtml = await zip.file(fName).async('string');
                const hMatch = rawHtml.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
                const cleanTxt = rawHtml.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleanTxt.length > 60) {
                    const startPage = pages.length + 1;
                    if (hMatch && hMatch[1]) outline.push({ id: 'ch_' + startPage, title: hMatch[1].replace(/<[^>]+>/g, '').trim(), page: startPage });
                    for (let i = 0; i < cleanTxt.length; i += 2200) pages.push(cleanTxt.slice(i, i + 2200));
                }
            }
            return { pages: pages.length ? pages : ['EPUB Content'], outline };
        } catch (e) { return { pages: ['Could not parse EPUB archive.'], outline: [] }; }
    }

    function autoCategorizeBookGenre(title, fileName) {
        const hay = `${title} ${fileName}`.toLowerCase();
        if (/quran|tafseer|hadith|salah|namaz|deen|islam|fiqh|seerah|dua|bukhari/i.test(hay)) {
            return { category: 'deen', shelfName: 'Quran, Tafseer & Hadith' };
        }
        if (/history|empire|civilization|war|dynasty|century|ancient|ottoman|revolution/i.test(hay)) {
            return { category: 'study', shelfName: 'World History & Civilizations' };
        }
        if (/behavior|psychology|habit|mindset|cognitive|brain|persuasion|human|emotion/i.test(hay)) {
            return { category: 'side', shelfName: 'Human Behavior & Psychology' };
        }
        if (/universe|cosmos|quantum|relativity|astrophysics|existence|philosophy|space/i.test(hay)) {
            return { category: 'side', shelfName: 'Universe & Existence Purpose' };
        }
        return { category: 'study', shelfName: customShelves[0]?.name || 'Medical Science & Anatomy' };
    }

    window.importBookFileObject = async function(file, sourceTag = 'local', fileHandle = null, manualChoice = null) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!['pdf', 'epub', 'txt', 'md', 'docx', 'html', 'htm'].includes(ext)) return null;

        const arrayBuffer = await file.arrayBuffer();
        const bookId = await computeBookFingerprint(file, arrayBuffer);

        let existing = readerBooks.find(b => b.id === bookId || (b.fileName === file.name && b.fileSize === file.size));
        if (existing) {
            if (!existing.sources.includes(sourceTag)) existing.sources.push(sourceTag);
            if (manualChoice && manualChoice.isManual) {
                existing.shelfName = manualChoice.shelfName;
                existing.category = manualChoice.category;
                existing.manualGenreLock = true;
                existing.lastOpened = Date.now();
                existing.lastModified = Date.now();
            }
            existing.isOffloadedZeroStorage = false;
            const prevStored = await idbGet('bookFiles', existing.id);
            await idbPut('bookFiles', {
                id: existing.id, originalBytes: arrayBuffer, bakedBytes: null,
                structuredPages: prevStored?.structuredPages || null, extractedPagesText: prevStored?.extractedPagesText || []
            });
            if (fileHandle) await idbPut('handles', { key: 'book_' + existing.id, handle: fileHandle, name: file.name });
            saveReaderMeta();
            return existing;
        }

        let totalPages = 1, author = 'Unknown Author', creator = 'Standard File', producer = ext.toUpperCase(), coverDataUrl = '', outline = [];
        let extractedPagesText = [];

        if (ext === 'pdf') {
            const pdfMeta = await generatePdfCoverAndMeta(arrayBuffer);
            totalPages = pdfMeta.totalPages;
            if (pdfMeta.author) author = pdfMeta.author;
            if (pdfMeta.creator) creator = pdfMeta.creator;
            if (pdfMeta.producer) producer = pdfMeta.producer;
            coverDataUrl = pdfMeta.coverDataUrl;
            outline = pdfMeta.outline;
            extractedPagesText = pdfMeta.pagesText || [];
        } else if (ext === 'docx') {
            extractedPagesText = await extractTextFromDocx(arrayBuffer);
            totalPages = extractedPagesText.length;
        } else if (ext === 'epub') {
            const ep = await extractTextFromEpub(arrayBuffer);
            extractedPagesText = ep.pages;
            outline = ep.outline;
            totalPages = extractedPagesText.length;
        } else {
            const text = new TextDecoder('utf-8').decode(arrayBuffer);
            for (let i = 0; i < text.length; i += 2400) extractedPagesText.push(text.slice(i, i + 2400));
            if (!extractedPagesText.length) extractedPagesText.push('Empty file');
            totalPages = extractedPagesText.length;
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const autoGenre = autoCategorizeBookGenre(cleanTitle, file.name);
        const finalShelfName = (manualChoice && manualChoice.shelfName) ? manualChoice.shelfName : autoGenre.shelfName;
        const finalCategory = (manualChoice && manualChoice.category) ? manualChoice.category : autoGenre.category;

        if (!customShelves.some(s => s.name.toLowerCase() === finalShelfName.toLowerCase())) {
            customShelves.push({ id: 'shelf_' + Date.now() + '_' + Math.floor(Math.random() * 99), name: finalShelfName, category: finalCategory });
        }

        const shelfBooksCount = readerBooks.filter(b => b.shelfName === finalShelfName).length;

        const newBook = {
            id: bookId, title: cleanTitle, author,
            description: `Imported from ${sourceTag.toUpperCase()} (${(file.size / 1048576).toFixed(2)} MB)`,
            fileName: file.name, format: ext, fileSize: file.size,
            totalPages, currentPage: 1, progressPct: 0,
            category: finalCategory, shelfName: finalShelfName,
            readSeq: shelfBooksCount + 1,
            manualGenreLock: Boolean(manualChoice && manualChoice.isManual),
            favorite: false, rating: 5, creator, producer,
            sources: [sourceTag], coverDataUrl, readingMins: 0, dailyTargetMins: 30,
            remindOnTarget: true, openMode: 'last', autoSync: true, manualSyncOnly: false,
            pendingCloudSync: false, cloudBinaryAvailable: false, isOffloadedZeroStorage: false,
            telegramFileId: '', gdriveFileId: '', dropboxPath: '',
            rev: 1, lastModified: Date.now(), lastOpened: Date.now(),
            outline, annotations: [], deletedAnnotationIds: []
        };

        await idbPut('bookFiles', { id: bookId, originalBytes: arrayBuffer, bakedBytes: null, extractedPagesText });
        if (coverDataUrl) {
            coverMemoryCache[bookId] = coverDataUrl;
            await idbPut('bookCovers', { id: bookId, coverDataUrl });
        }
        if (fileHandle) await idbPut('handles', { key: 'book_' + bookId, handle: fileHandle, name: file.name });

        readerBooks.unshift(newBook);
        saveReaderMeta();
        if (extractedPagesText.length > 0) window.PomoStudioBridge.syncBookPageIndexToCloud(bookId, extractedPagesText);
        return newBook;
    };

    window.handleMultipleBookImport = async function(fileList, sourceTag = 'local', manualChoice = null) {
        const filesArray = Array.from(fileList || []);
        if (!filesArray.length) return;
        showToast(`📥 Importing ${filesArray.length} book(s)...`);
        let count = 0;
        for (const f of filesArray) {
            try {
                const added = await importBookFileObject(f, sourceTag, null, manualChoice);
                if (added) count++;
            } catch (err) {
                console.warn('[Book Import Error]:', f?.name, err);
            }
        }
        renderCustomShelvesBar();
        renderWoodenShelf();
        showToast(`✅ ${count} of ${filesArray.length} book(s) added to Wooden Shelf!`);
    };

    function openManualImportModal() {
        const modal = document.getElementById('v45-manual-import-modal');
        const sel = document.getElementById('v45-import-genre-select');
        const newInp = document.getElementById('v45-import-new-genre-inp');
        if (!modal || !sel) {
            document.getElementById('reader-book-file-input')?.click();
            return;
        }
        sel.innerHTML = customShelves.map(s => `<option value="${escapeHtml(s.name)}" data-cat="${s.category}">${escapeHtml(s.name)}</option>`).join('');
        if (newInp) newInp.value = '';
        modal.classList.remove('hidden');
    }

    document.getElementById('v45-close-manual-import')?.addEventListener('click', () => {
        document.getElementById('v45-manual-import-modal')?.classList.add('hidden');
    });

    document.getElementById('v45-proceed-file-pick-btn')?.addEventListener('click', () => {
        const sel = document.getElementById('v45-import-genre-select');
        const newGenre = (document.getElementById('v45-import-new-genre-inp')?.value || '').trim();
        const cat = document.getElementById('v45-import-cat-select')?.value || 'study';
        const chosenShelf = newGenre || sel?.value || customShelves[0]?.name || 'Medical Science & Anatomy';
        pendingManualGenreChoice = { shelfName: chosenShelf, category: cat, isManual: true };
        document.getElementById('v45-manual-import-modal')?.classList.add('hidden');
        document.getElementById('reader-book-file-input')?.click();
    });

    document.getElementById('shelf-quick-import-btn')?.addEventListener('click', openManualImportModal);
    document.getElementById('settings-import-books-btn')?.addEventListener('click', openManualImportModal);

    document.getElementById('reader-book-file-input')?.addEventListener('change', async (e) => {
        const filesClone = Array.from(e.target.files || []);
        const choice = pendingManualGenreChoice;
        pendingManualGenreChoice = null;
        e.target.value = '';
        await handleMultipleBookImport(filesClone, 'local', choice);
    });

    async function selectMainDesktopFolder() {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                mainDirectoryHandle = dirHandle;
                readerSettings.mainFolderName = dirHandle.name;
                await idbPut('handles', { key: 'mainFolder', handle: dirHandle, name: dirHandle.name });
                saveReaderMeta();
                updateMainFolderUI();
                await scanMainFolderAndImport();
                return;
            } catch (e) { if (e.name === 'AbortError') return; }
        }
        document.getElementById('reader-folder-fallback-input')?.click();
    }

    document.getElementById('reader-folder-fallback-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length) {
            const relPath = files[0].webkitRelativePath || '';
            readerSettings.mainFolderName = relPath.split('/')[0] || 'Selected Folder';
            saveReaderMeta();
            updateMainFolderUI();
            await handleMultipleBookImport(files, 'local', null);
        }
    });

    async function scanMainFolderAndImport() {
        if (!mainDirectoryHandle) { await selectMainDesktopFolder(); return; }
        try {
            let perm = await mainDirectoryHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') perm = await mainDirectoryHandle.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') { showToast("Grant folder permission to scan books", true); return; }

            let importedCount = 0;
            for await (const entry of mainDirectoryHandle.values()) {
                if (entry.kind === 'file') {
                    const ext = (entry.name.split('.').pop() || '').toLowerCase();
                    if (['pdf', 'epub', 'txt', 'md', 'docx', 'html', 'htm'].includes(ext)) {
                        const file = await entry.getFile();
                        const added = await importBookFileObject(file, 'local', entry, null);
                        if (added) importedCount++;
                    }
                }
            }
            renderCustomShelvesBar();
            renderWoodenShelf();
            showToast(`📂 Main Folder Scanned (${importedCount} book files verified)!`);
        } catch (e) { showToast("Folder scan requires re-selecting Main Folder", true); }
    }

    document.getElementById('shelf-scan-folder-btn')?.addEventListener('click', selectMainDesktopFolder);
    document.getElementById('settings-select-main-folder-btn')?.addEventListener('click', selectMainDesktopFolder);
    document.getElementById('settings-rescan-main-folder-btn')?.addEventListener('click', scanMainFolderAndImport);

    // Drag & Drop Books Directly Onto Wooden Bookshelf
    const shelfWrapperEl = document.getElementById('wooden-bookshelf-wrapper');
    if (shelfWrapperEl) {
        shelfWrapperEl.addEventListener('dragover', (e) => { e.preventDefault(); shelfWrapperEl.style.borderColor = '#38bdf8'; });
        shelfWrapperEl.addEventListener('dragleave', () => { shelfWrapperEl.style.borderColor = '#5c3a21'; });
        shelfWrapperEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            shelfWrapperEl.style.borderColor = '#5c3a21';
            if (e.dataTransfer?.files?.length) {
                await handleMultipleBookImport(Array.from(e.dataTransfer.files), 'local', null);
            }
        });
    }

    /* =========================================================================
       4. CUSTOM SHELVES BAR, SORTING & 3D WOODEN BOOKSHELF (SECTIONS + GRID)
       ========================================================================= */
    window.renderCustomShelvesBar = function() {
        const bar = document.getElementById('custom-shelves-bar');
        if (!bar) return;
        const wrapMode = Boolean(readerSettings.shelfWrapMode);

        let pillsHtml = `
            <button type="button" onclick="window.setCustomShelfFilter('all')" class="shelf-pill-item px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${activeCustomShelfFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-950 text-slate-300 border border-slate-800'}">
                🪵 All Genres (${readerBooks.length})
            </button>
        `;

        customShelves.forEach(s => {
            const cnt = readerBooks.filter(b => (b.shelfName || '') === s.name).length;
            const act = activeCustomShelfFilter === s.name;
            const safeName = escapeJsStr(s.name);
            pillsHtml += `
                <button type="button" onclick="window.setCustomShelfFilter('${safeName}')" class="shelf-pill-item px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${act ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-950 text-amber-200/90 border border-slate-800 hover:border-amber-500/40'}">
                    📚 ${escapeHtml(s.name)} <span class="opacity-75 font-mono text-[10px]">(${cnt})</span>
                </button>
            `;
        });

        bar.innerHTML = `
            <div class="flex items-center justify-between gap-2 mb-1.5 px-1 flex-wrap">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">🪵 Genre Shelves</span>
                    <button type="button" onclick="window.openAddCustomShelfModal()" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold">➕ New Genre Shelf</button>
                    <button type="button" onclick="window.toggleShelfDisplayLayout()" class="bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">${shelfDisplayLayout === 'sections' ? '🪵 View: Sections' : '⊞ View: Unified Grid'}</button>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-bold text-slate-400">Books/Row:</span>
                    <select onchange="window.setShelfBooksPerRow(this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                        <option value="auto" ${readerSettings.booksPerRow === 'auto' ? 'selected' : ''}>Auto (6–8)</option>
                        <option value="5" ${readerSettings.booksPerRow === '5' ? 'selected' : ''}>5 / Row</option>
                        <option value="6" ${readerSettings.booksPerRow === '6' ? 'selected' : ''}>6 / Row</option>
                        <option value="7" ${readerSettings.booksPerRow === '7' ? 'selected' : ''}>7 / Row</option>
                        <option value="8" ${readerSettings.booksPerRow === '8' ? 'selected' : ''}>8 / Row</option>
                    </select>
                    <button type="button" onclick="window.toggleShelfWrapMode()" class="bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">${wrapMode ? '↔️ Slide' : '⊞ Wrap'}</button>
                </div>
            </div>
            <div class="${wrapMode ? 'shelves-wrap-grid' : 'shelves-scroll-strip'}">${pillsHtml}</div>
        `;
    };

    window.toggleShelfDisplayLayout = function() {
        shelfDisplayLayout = shelfDisplayLayout === 'sections' ? 'grid' : 'sections';
        renderCustomShelvesBar();
        renderWoodenShelf();
    };

    window.setCustomShelfFilter = function(name) {
        activeCustomShelfFilter = name;
        renderCustomShelvesBar();
        renderWoodenShelf();
    };

    window.setShelfBooksPerRow = function(val) {
        readerSettings.booksPerRow = val;
        saveReaderMeta();
        renderWoodenShelf();
    };

    window.toggleShelfWrapMode = function() {
        readerSettings.shelfWrapMode = !readerSettings.shelfWrapMode;
        saveReaderMeta();
        renderCustomShelvesBar();
    };

    window.openAddCustomShelfModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;
        titleEl.textContent = "🪵 Create or Manage Wooden Genre Shelves";
        bodyEl.innerHTML = `
            <div class="flex gap-2">
                <input type="text" id="new-custom-shelf-inp" placeholder="New Genre Name (e.g. Physiology / Cardiology)..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <select id="new-custom-shelf-cat" class="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold">
                    <option value="study">🧠 Study</option><option value="deen">🕌 Deen</option><option value="side">🚀 Side</option>
                </select>
                <button type="button" id="confirm-create-shelf-btn" class="bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs">＋ Add</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-60 native-scroll mt-2">
                ${customShelves.map((s, idx) => `
                    <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                        <span class="text-xs font-bold text-amber-200">📚 ${escapeHtml(s.name)}</span>
                        ${customShelves.length > 1 ? `<button type="button" onclick="window.deleteCustomShelf(${idx})" class="text-red-400 text-xs font-bold">🗑️ Remove</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('confirm-create-shelf-btn').onclick = () => {
            const name = (document.getElementById('new-custom-shelf-inp')?.value || '').trim();
            const cat = document.getElementById('new-custom-shelf-cat')?.value || 'study';
            if (name && !customShelves.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                customShelves.push({ id: 'shelf_' + Date.now(), name, category: cat });
                saveReaderMeta();
                renderCustomShelvesBar();
                renderWoodenShelf();
                window.openAddCustomShelfModal();
                showToast(`🪵 Shelf "${name}" created!`);
            }
        };
    };

    window.deleteCustomShelf = function(idx) {
        if (customShelves.length <= 1) return;
        customShelves.splice(idx, 1);
        activeCustomShelfFilter = 'all';
        saveReaderMeta();
        renderCustomShelvesBar();
        renderWoodenShelf();
        window.openAddCustomShelfModal();
    };

    document.querySelectorAll('.shelf-filter-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeShelfFilter = e.currentTarget.getAttribute('data-filter') || 'all';
            document.querySelectorAll('.shelf-filter-tab').forEach(b => {
                b.className = "shelf-filter-tab bg-slate-950 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0";
            });
            e.currentTarget.className = "shelf-filter-tab bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shrink-0";
            renderWoodenShelf();
        });
    });

    document.getElementById('shelf-search-input')?.addEventListener('input', () => renderWoodenShelf());
    document.getElementById('shelf-sort-select')?.addEventListener('change', (e) => {
        readerSettings.sortBy = e.target.value;
        saveReaderMeta();
        renderWoodenShelf();
    });

    function applyWoodThemeStyle() {
        const wrap = document.getElementById('wooden-bookshelf-wrapper');
        if (!wrap) return;
        const styles = {
            walnut: 'linear-gradient(180deg, #2b1d12 0%, #1a110a 100%)',
            oak: 'linear-gradient(180deg, #4a3219 0%, #2d1e0f 100%)',
            mahogany: 'linear-gradient(180deg, #3b1614 0%, #210b0a 100%)',
            ebony: 'linear-gradient(180deg, #171c26 0%, #0b0e14 100%)'
        };
        wrap.style.background = styles[readerSettings.woodStyle] || styles.walnut;
    }

    function computeExactShelfBooksPerRow() {
        const pref = readerSettings.booksPerRow || 'auto';
        if (pref !== 'auto') {
            const manualCols = Math.max(4, Math.min(8, parseInt(pref) || 7));
            document.documentElement.style.setProperty('--shelf-cols', String(manualCols));
            return manualCols;
        }
        const rowsEl = document.getElementById('wooden-bookshelf-rows');
        const availW = rowsEl?.clientWidth || window.innerWidth || 1366;
        let autoCols = 7;
        if (availW >= 1580) autoCols = 8;
        else if (availW >= 1220) autoCols = 7;
        else if (availW >= 920) autoCols = 6;
        else autoCols = 4;

        document.documentElement.style.setProperty('--shelf-cols', String(autoCols));
        return autoCols;
    }

    window.moveBookInShelfSequence = function(bookId, delta) {
        const target = readerBooks.find(b => b.id === bookId);
        if (!target) return;
        const shelfName = target.shelfName || 'General Shelf';
        const peerBooks = readerBooks.filter(b => (b.shelfName || 'General Shelf') === shelfName).sort((a, b) => (a.readSeq || 999) - (b.readSeq || 999));
        peerBooks.forEach((b, i) => b.readSeq = i + 1);
        const curIdx = peerBooks.findIndex(b => b.id === bookId);
        const nextIdx = curIdx + delta;
        if (nextIdx < 0 || nextIdx >= peerBooks.length) return;
        const temp = peerBooks[curIdx].readSeq;
        peerBooks[curIdx].readSeq = peerBooks[nextIdx].readSeq;
        peerBooks[nextIdx].readSeq = temp;
        saveReaderMeta();
        renderWoodenShelf();
    };

    window.renderWoodenShelf = function() {
        applyWoodThemeStyle();
        const rowsContainer = document.getElementById('wooden-bookshelf-rows');
        if (!rowsContainer) return;

        document.getElementById('shelf-count-all').textContent = readerBooks.length;
        document.getElementById('shelf-count-fav').textContent = readerBooks.filter(b => b.favorite).length;

        const searchQ = (document.getElementById('shelf-search-input')?.value || '').trim().toLowerCase();
        let filtered = readerBooks.filter(b => {
            if (activeShelfFilter === 'fav' && !b.favorite) return false;
            if (activeShelfFilter === 'study' && b.category !== 'study') return false;
            if (activeShelfFilter === 'deen' && b.category !== 'deen') return false;
            if (activeShelfFilter === 'reading' && ((b.progressPct || 0) <= 0 || (b.progressPct || 0) >= 100)) return false;
            if (activeShelfFilter === 'completed' && (b.progressPct || 0) < 100) return false;
            if (activeCustomShelfFilter !== 'all' && (b.shelfName || 'General Shelf') !== activeCustomShelfFilter) return false;
            if (searchQ && !`${b.title} ${b.author} ${b.shelfName}`.toLowerCase().includes(searchQ)) return false;
            return true;
        });

        const sortMode = readerSettings.sortBy || 'sequence';
        filtered.sort((a, b) => {
            if (sortMode === 'recent') return (b.lastOpened || 0) - (a.lastOpened || 0);
            if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortMode === 'author') return (a.author || '').localeCompare(b.author || '');
            if (sortMode === 'storage') return ((a.sources && a.sources[0]) || 'local').localeCompare((b.sources && b.sources[0]) || 'local');
            if (sortMode === 'progress') return (b.progressPct || 0) - (a.progressPct || 0);
            return (a.readSeq || 999) - (b.readSeq || 999);
        });

        rowsContainer.innerHTML = '';

        if (!filtered.length) {
            rowsContainer.innerHTML = `<div class="py-16 text-center flex flex-col items-center justify-center gap-2"><span class="text-4xl">📚</span><p class="text-sm font-bold text-amber-200">No books on this shelf yet. Click "➕ Import Books" or Drag & Drop files here!</p></div>`;
            return;
        }

        const groups = {};
        if (shelfDisplayLayout === 'sections' && activeCustomShelfFilter === 'all') {
            filtered.forEach(b => {
                const s = b.shelfName || 'General Shelf';
                if (!groups[s]) groups[s] = [];
                groups[s].push(b);
            });
        } else {
            groups[activeCustomShelfFilter === 'all' ? 'All Library Books' : activeCustomShelfFilter] = filtered;
        }

        const perRow = computeExactShelfBooksPerRow();
        const spineColors = { study: '#3b82f6', deen: '#10b981', side: '#a855f7' };

        Object.entries(groups).forEach(([shelfName, gBooks], sectionIdx) => {
            const sec = document.createElement('div');
            sec.className = "mb-3";
            sec.innerHTML = `
                <div class="shelf-genre-header">
                    <div class="flex items-center gap-2">
                        <span class="bg-amber-500 text-slate-950 font-mono font-extrabold text-xs px-2 py-0.5 rounded-lg shadow">#${sectionIdx + 1}</span>
                        <span class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-200">${escapeHtml(shelfName)}</span>
                        <span class="text-[10px] font-mono font-bold bg-black/40 text-amber-300 px-2 py-0.5 rounded-full">${gBooks.length}</span>
                    </div>
                </div>
            `;
            rowsContainer.appendChild(sec);

            for (let i = 0; i < gBooks.length; i += perRow) {
                const slice = gBooks.slice(i, i + perRow);
                const rowEl = document.createElement('div');
                rowEl.className = "wood-shelf-row";
                rowEl.style.gridTemplateColumns = `repeat(${perRow}, minmax(0, 1fr))`;

                slice.forEach((book, idxInSlice) => {
                    const seqNum = book.readSeq || (i + idxInSlice + 1);
                    const curP = Math.max(1, book.currentPage || 1);
                    const totP = Math.max(1, book.totalPages || 1);
                    const pct = Math.min(100, Math.round((curP / totP) * 100));
                    const coverUrl = coverMemoryCache[book.id] || book.coverDataUrl || '';
                    const safeBookId = escapeJsStr(book.id);

                    const card = document.createElement('div');
                    card.className = "book-card-3d group";
                    card.style.borderLeftColor = spineColors[book.category] || '#3b82f6';
                    if (coverUrl) {
                        card.style.backgroundImage = `linear-gradient(180deg, rgba(2,6,23,0.22) 0%, rgba(2,6,23,0.94) 84%), url('${coverUrl}')`;
                        card.style.backgroundSize = 'cover';
                        card.style.backgroundPosition = 'center';
                    }
                    card.onclick = () => openBookInReader(book.id);
                    card.innerHTML = `
                        <button class="book-corner-menu-btn" title="Book Details & Cover" onclick="event.stopPropagation(); window.openBookCornerModal('${safeBookId}')">⋮</button>
                        <div class="p-1.5 flex flex-col gap-0.5">
                            <div class="flex items-center gap-1 flex-wrap pr-5">
                                <span class="bg-slate-950/90 text-[8px] font-mono font-extrabold text-amber-300 px-1 py-0.5 rounded">#${seqNum}</span>
                                <span class="bg-slate-950/90 text-[8px] font-extrabold px-1.5 py-0.5 rounded text-white">${(book.format || 'pdf').toUpperCase()}</span>
                                ${book.isOffloadedZeroStorage ? `<span class="bg-cyan-950/95 border border-cyan-400/50 text-[8px] font-bold text-cyan-300 px-1 py-0.5 rounded">☁️ 0MB</span>` : ''}
                                ${book.hasCloudPageIndex ? `<span class="bg-purple-950/95 border border-purple-400/50 text-[8px] font-bold text-purple-300 px-1 py-0.5 rounded">⚡Idx</span>` : ''}
                                ${book.favorite ? `<span class="text-[10px]">❤️</span>` : ''}
                            </div>
                        </div>
                        <div class="p-1.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-0.5">
                            <h4 class="text-[11px] font-extrabold text-white line-clamp-2 leading-tight">${escapeHtml(book.title)}</h4>
                            <p class="text-[9px] text-slate-300 truncate">${escapeHtml(book.author || 'Unknown')}</p>
                            <div class="flex items-center justify-between text-[9px] font-mono mt-0.5">
                                <span class="text-emerald-400 font-bold">${pct}%</span>
                                <span class="text-slate-400">p.${curP}/${totP}</span>
                            </div>
                            <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style="width: ${pct}%"></div>
                            </div>
                            <div class="flex items-center justify-between gap-1 mt-0.5">
                                <div class="flex gap-0.5">
                                    <button type="button" onclick="event.stopPropagation(); window.moveBookInShelfSequence('${safeBookId}', -1)" class="bg-slate-900/90 hover:bg-amber-600 text-slate-300 hover:text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-700" title="Move Earlier (#)">◀</button>
                                    <button type="button" onclick="event.stopPropagation(); window.moveBookInShelfSequence('${safeBookId}', 1)" class="bg-slate-900/90 hover:bg-amber-600 text-slate-300 hover:text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-700" title="Move Later (#)">▶</button>
                                </div>
                                ${book.isOffloadedZeroStorage ? `<button type="button" onclick="event.stopPropagation(); window.downloadBookBinaryFromWirelessCloud('${safeBookId}')" class="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-cyan-500/40">📥 Stream</button>` : `<span class="text-[8px] font-mono text-amber-300/80">🔖 ${(book.annotations || []).length}</span>`}
                            </div>
                        </div>
                    `;
                    rowEl.appendChild(card);
                });
                rowsContainer.appendChild(rowEl);
            }
        });

        const totalRowsCount = rowsContainer.children.length;
        if (totalRowsCount < 5) {
            for (let e = 0; e < (5 - totalRowsCount); e++) {
                const emptyPlank = document.createElement('div');
                emptyPlank.className = "wood-shelf-empty-plank";
                emptyPlank.textContent = "🪵 Empty Study Shelf — Click '➕ Import Books' or Drag & Drop Books Here";
                rowsContainer.appendChild(emptyPlank);
            }
        }
    };

    /* =========================================================================
       5. BOOK 3-CORNER METADATA MODAL (#book-corner-modal)
       ========================================================================= */
    window.openBookCornerModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        activeCornerBookId = bookId;
        const modal = document.getElementById('book-corner-modal');
        if (!modal) return;

        document.getElementById('corner-book-title-input').value = b.title || '';
        document.getElementById('corner-book-author-input').value = b.author || '';
        document.getElementById('corner-book-category-select').value = b.category || 'study';
        document.getElementById('corner-book-source-select').value = b.sources?.[0] || 'local';
        document.getElementById('corner-book-desc-input').value = b.description || '';

        const pct = Math.min(100, Math.round(((b.currentPage || 1) / Math.max(1, b.totalPages || 1)) * 100));
        document.getElementById('corner-progress-label').textContent = `${pct}% (Page ${b.currentPage || 1} of ${b.totalPages || 1})`;
        document.getElementById('corner-progress-bar').style.width = `${pct}%`;

        const favBtn = document.getElementById('corner-toggle-fav-btn');
        if (favBtn) favBtn.textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';

        const covPrev = document.getElementById('corner-modal-cover-preview');
        const covUrl = coverMemoryCache[b.id] || b.coverDataUrl || '';
        if (covPrev) {
            if (covUrl) {
                covPrev.style.backgroundImage = `url('${covUrl}')`;
                covPrev.textContent = '';
            } else {
                covPrev.style.backgroundImage = 'none';
                covPrev.textContent = 'No Cover';
            }
        }
        modal.classList.remove('hidden');
    };

    document.getElementById('close-book-corner-modal-btn')?.addEventListener('click', () => {
        document.getElementById('book-corner-modal')?.classList.add('hidden');
    });

    document.getElementById('corner-toggle-fav-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.favorite = !b.favorite;
        document.getElementById('corner-toggle-fav-btn').textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';
        saveReaderMeta();
        renderWoodenShelf();
    });

    document.getElementById('corner-upload-cover-btn')?.addEventListener('click', () => {
        document.getElementById('book-cover-file-input')?.click();
    });

    document.getElementById('book-cover-file-input')?.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || !activeCornerBookId) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            coverMemoryCache[activeCornerBookId] = dataUrl;
            await idbPut('bookCovers', { id: activeCornerBookId, coverDataUrl: dataUrl });
            const covPrev = document.getElementById('corner-modal-cover-preview');
            if (covPrev) { covPrev.style.backgroundImage = `url('${dataUrl}')`; covPrev.textContent = ''; }
            renderWoodenShelf();
            showToast("🖼️ Custom cover updated!");
        };
        reader.readAsDataURL(f);
    });

    document.getElementById('corner-auto-cover-btn')?.addEventListener('click', async () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored?.originalBytes) { showToast("PDF binary required for auto-cover", true); return; }
        const meta = await generatePdfCoverAndMeta(stored.originalBytes);
        if (meta.coverDataUrl) {
            coverMemoryCache[b.id] = meta.coverDataUrl;
            await idbPut('bookCovers', { id: b.id, coverDataUrl: meta.coverDataUrl });
            const covPrev = document.getElementById('corner-modal-cover-preview');
            if (covPrev) { covPrev.style.backgroundImage = `url('${meta.coverDataUrl}')`; covPrev.textContent = ''; }
            renderWoodenShelf();
            showToast("⚡ Cover extracted from Page 1!");
        }
    });

    document.getElementById('corner-add-todo-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        const today = getLocalTodayString();
        todos.unshift({
            id: Date.now(),
            title: `📖 Read: ${b.title} (from p.${b.currentPage || 1})`,
            completed: false, important: true, myDayDate: today, createdDate: today, dueDate: today,
            durationMins: b.dailyTargetMins || 45, repeat: { type: 'none' }, steps: [],
            note: `Shelf: ${b.shelfName}`, listId: 'tasks', bookId: b.id, bookPage: b.currentPage || 1
        });
        saveTodos(); renderTodos();
        showToast("☑️ Book added to PomoTasks!");
    });

    document.getElementById('corner-add-plan-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        const newBlk = {
            id: Date.now(), type: 'work', category: b.category === 'deen' ? 'deen' : 'study',
            title: `📖 Read: ${b.title} (p.${b.currentPage || 1})`, duration: (b.dailyTargetMins || 50) * 60
        };
        schedule.push(newBlk);
        if (window.ensureProtocolBlockSyncedToTodo) window.ensureProtocolBlockSyncedToTodo(newBlk);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        renderSchedule();
        showToast("⚡ Reading block added to Live Protocol!");
    });

    document.getElementById('corner-delete-book-btn')?.addEventListener('click', async () => {
        if (!activeCornerBookId) return;
        window.readerBooks = readerBooks.filter(x => x.id !== activeCornerBookId);
        await idbDelete('bookFiles', activeCornerBookId);
        await idbDelete('bookCovers', activeCornerBookId);
        saveReaderMeta();
        renderCustomShelvesBar();
        renderWoodenShelf();
        document.getElementById('book-corner-modal')?.classList.add('hidden');
        showToast("🗑️ Book removed from shelf");
    });

    document.getElementById('corner-save-meta-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.title = document.getElementById('corner-book-title-input').value.trim() || b.title;
        b.author = document.getElementById('corner-book-author-input').value.trim() || 'Unknown Author';
        b.category = document.getElementById('corner-book-category-select').value || 'study';
        b.sources = [document.getElementById('corner-book-source-select').value || 'local'];
        b.description = document.getElementById('corner-book-desc-input').value;
        b.lastModified = Date.now();
        saveReaderMeta();
        renderWoodenShelf();
        document.getElementById('book-corner-modal')?.classList.add('hidden');
        showToast("✅ Book details saved!");
    });

    document.getElementById('corner-open-book-now-btn')?.addEventListener('click', () => {
        const id = activeCornerBookId;
        document.getElementById('book-corner-modal')?.classList.add('hidden');
        if (id) openBookInReader(id);
    });

    /* =========================================================================
       6. ACTIVE BOOK READER, CALIBRATED PDF TEXT LAYER & 9-ACTION SELECTION BAR
       ========================================================================= */
    window.openBookAtPage = async function(bookId, targetPage = null) {
        switchPage('page-reader');
        await openBookInReader(bookId, targetPage);
    };

    function startActiveReadingTimeTracker() {
        clearInterval(activeReadingSessionTimer);
        activeReadingSessionTimer = setInterval(() => {
            if (!activeReaderBook || document.visibilityState !== 'visible') return;
            const today = getLocalTodayString();
            if (!readerReadingLog[today]) readerReadingLog[today] = { totalMins: 0, books: {} };
            readerReadingLog[today].totalMins = (readerReadingLog[today].totalMins || 0) + 1;
            readerReadingLog[today].books[activeReaderBook.id] = (readerReadingLog[today].books[activeReaderBook.id] || 0) + 1;
            activeReaderBook.readingMins = (activeReaderBook.readingMins || 0) + 1;
            saveReaderMeta(true);
            updateHeaderAndSliderForCurrentPage(activeReaderBook.currentPage || 1);
            PomoEventBus.emit('reading:minuteLogged');
        }, 60000);
    }

    async function openBookInReader(bookId, forcedPage = null) {
        const book = readerBooks.find(x => x.id === bookId);
        if (!book) { showToast("Book not found on shelf", true); return; }

        let stored = await idbGet('bookFiles', book.id);
        if (!stored || (!stored.originalBytes && !stored.structuredPages && !stored.extractedPagesText?.length)) {
            stored = await window.downloadBookBinaryFromWirelessCloud(book.id);
            if (!stored) { showToast("📲 Re-import or stream this book first.", true); return; }
        }

        if (activePdfDoc) {
            try { await activePdfDoc.destroy(); } catch (e) {}
            activePdfDoc = null;
        }

        activeReaderBook = book;
        book.lastOpened = Date.now();
        activeExtractedPages = stored.extractedPagesText || [];
        activeStructuredPages = stored.structuredPages || [];
        renderedCanvasPages.clear();
        Object.keys(pageTextItemsCache).forEach(k => delete pageTextItemsCache[k]);

        if (book.format === 'pdf' && stored.originalBytes && typeof pdfjsLib !== 'undefined') {
            try {
                activePdfDoc = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
                book.totalPages = activePdfDoc.numPages || book.totalPages;
                if (!book.outline || !book.outline.length) book.outline = await extractOutlineFromPdf(activePdfDoc);
            } catch (e) {}
        } else if (book.format === 'pbook' && activeStructuredPages.length) {
            book.totalPages = activeStructuredPages.length;
        } else if (activeExtractedPages.length) {
            book.totalPages = activeExtractedPages.length;
        }

        const defaultStart = book.openMode === 'first' ? 1 : (book.currentPage || 1);
        const targetStartPage = forcedPage !== null ? Math.max(1, Math.min(book.totalPages, parseInt(forcedPage) || 1)) : defaultStart;
        book.currentPage = targetStartPage;

        const overlay = document.getElementById('reader-fullscreen-overlay');
        overlay.classList.remove('hidden', 'theme-day', 'theme-sepia', 'theme-night', 'theme-amoled');
        overlay.classList.add(`theme-${readerSettings.theme || 'night'}`);
        document.getElementById('reader-split-host').style.flexDirection = 'row';

        // Scratchpad NEVER opens automatically—only when user clicks 📝 Scratchpad button!
        if (window.closeOnenoteStudioDock) window.closeOnenoteStudioDock();

        document.getElementById('reader-page-slider').max = book.totalPages || 1;
        document.getElementById('reader-total-pages-label').textContent = book.totalPages || 1;
        document.getElementById('reader-bottom-bar')?.classList.toggle('hidden', Boolean(readerSettings.hideBottomBar));

        if (window.mountReaderV45Upgrades) window.mountReaderV45Upgrades();
        applyBlueLightFilter();
        startActiveReadingTimeTracker();

        await buildBookStageAndObserver();
        jumpToReaderPage(targetStartPage);
        saveReaderMeta();
    }

    async function closeActiveBookReader() {
        clearInterval(activeReadingSessionTimer);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (window.closeOnenoteStudioDock) window.closeOnenoteStudioDock();
        document.getElementById('v5-clicked-ann-inspector')?.remove();
        if (activeReaderBook && activeReaderBook.pendingCloudSync && activeReaderBook.autoSync) {
            window.syncSingleBookEverywhere(activeReaderBook.id, false);
        }
        if (activePdfDoc) {
            try { await activePdfDoc.destroy(); } catch (e) {}
            activePdfDoc = null;
        }
        activeReaderBook = null;
        document.getElementById('reader-fullscreen-overlay').classList.add('hidden');
        renderWoodenShelf();
    }
    document.getElementById('reader-back-to-shelf-btn')?.addEventListener('click', closeActiveBookReader);

    setInterval(() => {
        const pillTxt = document.getElementById('reader-mini-timer-text');
        if (pillTxt && window.timeDisplay) pillTxt.textContent = window.timeDisplay.textContent || '00:00';
    }, 500);
    document.getElementById('reader-mini-timer-toggle')?.addEventListener('click', () => {
        if (window.isRunning) window.stopTimer();
        else window.startTimer();
    });

    function updateHeaderAndSliderForCurrentPage(pageNum) {
        if (!activeReaderBook) return;
        const total = Math.max(1, activeReaderBook.totalPages || 1);
        activeReaderBook.currentPage = Math.max(1, Math.min(total, pageNum));
        activeReaderBook.progressPct = Math.min(100, Math.round((activeReaderBook.currentPage / total) * 100));
        const todayMins = readerReadingLog[getLocalTodayString()]?.books?.[activeReaderBook.id] || 0;
        document.getElementById('active-book-title-bar').textContent = activeReaderBook.title;
        document.getElementById('active-book-sub-bar').textContent = `Page ${activeReaderBook.currentPage} of ${total} • ${activeReaderBook.progressPct}% • Today: ${todayMins}m`;
        document.getElementById('reader-page-slider').value = activeReaderBook.currentPage;
        document.getElementById('reader-page-num-input').value = activeReaderBook.currentPage;
        saveReaderMeta();
    }

    function formatBionicTextHtml(text) {
        return escapeHtml(text || '').replace(/\b([A-Za-z]{2,})\b/g, (word) => {
            const cut = Math.ceil(word.length * 0.45);
            return `<b>${word.slice(0, cut)}</b>${word.slice(cut)}`;
        });
    }

    async function buildBookStageAndObserver() {
        const stage = document.getElementById('reader-pages-stage');
        const viewport = document.getElementById('reader-viewport');
        if (!stage || !activeReaderBook) return;

        if (pageScrollObserver) pageScrollObserver.disconnect();
        stage.innerHTML = '';
        renderedCanvasPages.clear();

        viewport.classList.toggle('mode-dual', readerSettings.viewMode === 'dual');
        viewport.classList.toggle('lock-v-scroll', Boolean(readerSettings.lockVerticalScroll));
        viewport.classList.toggle('lock-h-scroll', Boolean(readerSettings.lockHorizontalScroll));

        const total = activeReaderBook.totalPages || 1;
        const cardWidth = Math.round(820 * readerZoom);
        const estHeight = Math.round(cardWidth * 1.38);

        for (let p = 1; p <= total; p++) {
            const card = document.createElement('div');
            card.className = "v4-page-card";
            card.setAttribute('data-page', p);
            card.style.width = `${cardWidth}px`;
            card.style.maxWidth = `${cardWidth}px`;
            card.style.minHeight = `${estHeight}px`;

            if (activePdfDoc) {
                const canvas = document.createElement('canvas');
                canvas.className = "v4-pdf-canvas";
                card.appendChild(canvas);

                const txtLayer = document.createElement('div');
                txtLayer.className = `pomo-pdf-text-layer ${(studioActive || occlusionModeActive || readerSelectionMode === 'direct') ? 'disabled-layer' : ''}`;
                txtLayer.setAttribute('data-page', p);
                card.appendChild(txtLayer);
            } else {
                const structuredPage = activeStructuredPages.find(sp => sp.page === p) || activeStructuredPages[p - 1];
                if (window.renderSemanticStructuredSheet && (structuredPage || activeExtractedPages[p - 1])) {
                    const sheet = window.renderSemanticStructuredSheet(p, structuredPage, activeExtractedPages[p - 1] || '');
                    if (bionicReadingActive) {
                        sheet.querySelectorAll('p.pbook-paragraph').forEach(pEl => { pEl.innerHTML = formatBionicTextHtml(pEl.textContent); });
                    }
                    card.appendChild(sheet);
                    card.setAttribute('data-pf-upgraded', 'true');
                } else {
                    const contentDiv = document.createElement('div');
                    contentDiv.className = "pbook-page-sheet";
                    const rawT = activeExtractedPages[p - 1] || `Page ${p}`;
                    contentDiv.innerHTML = bionicReadingActive ? `<p class="pbook-paragraph">${formatBionicTextHtml(rawT)}</p>` : escapeHtml(rawT);
                    card.appendChild(contentDiv);
                }
            }

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', `v4-interactive-svg ${(studioActive || occlusionModeActive || readerSelectionMode === 'direct') ? 'active-draw-layer' : ''}`);
            svg.setAttribute('data-page', p);
            svg.setAttribute('viewBox', '0 0 1000 1400');
            svg.setAttribute('preserveAspectRatio', 'none');
            card.appendChild(svg);

            stage.appendChild(card);
            updateSinglePageSvg(p);
            bindPageInteractiveSvg(p, svg);
        }

        pageScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const pageNum = parseInt(entry.target.getAttribute('data-page'));
                if (entry.isIntersecting) {
                    if (activePdfDoc) ensurePdfPageRendered(pageNum, entry.target);
                    if (entry.intersectionRatio >= 0.35 && !isJumpingPage) {
                        updateHeaderAndSliderForCurrentPage(pageNum);
                        if (window.runTurboRamCleaner) window.runTurboRamCleaner(true);
                    }
                }
            });
        }, { root: viewport, rootMargin: '900px 0px 900px 0px', threshold: [0.05, 0.35] });

        stage.querySelectorAll('.v4-page-card').forEach(card => pageScrollObserver.observe(card));
    }

    function applyZoomToExistingPages() {
        const cardWidth = Math.round(820 * readerZoom);
        document.querySelectorAll('#reader-pages-stage .v4-page-card').forEach(card => {
            card.style.width = `${cardWidth}px`;
            card.style.maxWidth = `${cardWidth}px`;
        });
    }

    document.getElementById('reader-zoom-in-btn')?.addEventListener('click', () => window.setReaderZoom(readerZoom + 0.15));
    document.getElementById('reader-zoom-out-btn')?.addEventListener('click', () => window.setReaderZoom(readerZoom - 0.15));

    // Isolated Ctrl+Wheel & 2-Finger Pinch Zoom inside #reader-viewport
    const readerVpEl = document.getElementById('reader-viewport');
    if (readerVpEl) {
        readerVpEl.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                window.setReaderZoom(readerZoom + (e.deltaY < 0 ? 0.1 : -0.1));
            }
        }, { passive: false });
    }

    async function renderCalibratedPdfTextLayer(page, textLayerEl, pageNum) {
        if (!textLayerEl) return;
        try {
            const unitVp = page.getViewport({ scale: 1.0 });
            const tc = await page.getTextContent();
            textLayerEl.innerHTML = '';
            const cachedItems = [];
            const frag = document.createDocumentFragment();

            tc.items.forEach(item => {
                if (!item.str || !item.str.trim()) return;
                const tx = pdfjsLib.Util.transform(unitVp.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const leftPct = (tx[4] / unitVp.width) * 100;
                const topPct = ((tx[5] - fontHeight * 0.85) / unitVp.height) * 100;
                const widthPct = (((item.width || (item.str.length * fontHeight * 0.52)) * unitVp.scale) / unitVp.width) * 100;
                const heightPct = ((fontHeight * 1.15) / unitVp.height) * 100;

                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.left = `${leftPct.toFixed(2)}%`;
                span.style.top = `${topPct.toFixed(2)}%`;
                span.style.fontSize = `${Math.max(9, fontHeight * 0.95).toFixed(1)}px`;
                frag.appendChild(span);

                cachedItems.push({
                    str: item.str,
                    x: Math.max(0, leftPct / 100),
                    y: Math.max(0, topPct / 100),
                    w: Math.min(1, widthPct / 100),
                    h: Math.min(0.12, Math.max(0.014, heightPct / 100))
                });
            });
            textLayerEl.appendChild(frag);
            pageTextItemsCache[pageNum] = cachedItems;
            if (!activeExtractedPages[pageNum - 1] && cachedItems.length) {
                activeExtractedPages[pageNum - 1] = cachedItems.map(i => i.str).join(' ');
            }
        } catch (e) {}
    }

    async function ensurePdfPageRendered(pageNum, cardEl) {
        if (!activePdfDoc || renderedCanvasPages.has(pageNum)) return;
        renderedCanvasPages.add(pageNum);
        try {
            const canvas = cardEl.querySelector('canvas.v4-pdf-canvas');
            const textLayer = cardEl.querySelector('.pomo-pdf-text-layer');
            if (!canvas) return;
            const page = await activePdfDoc.getPage(pageNum);
            const vp = page.getViewport({ scale: window.pomoOptimalPdfScale || 1.65 });
            canvas.width = vp.width; canvas.height = vp.height;
            cardEl.style.minHeight = 'auto';
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            if (textLayer) await renderCalibratedPdfTextLayer(page, textLayer, pageNum);
            try { page.cleanup(); } catch (e) {}
        } catch (e) { renderedCanvasPages.delete(pageNum); }
    }

    /* =========================================================================
       7. 60FPS PENCIL & SHAPE STUDIO (WITH MOVE/RESIZE HANDLES) & OCCLUSION
       ========================================================================= */
    function renderPencilStudioToolbar() {
        const bar = document.getElementById('reader-pencil-toolbar');
        if (!bar) return;
        const tools = [
            { id: 'select', icon: '🖐️', label: 'Move/Resize' },
            { id: 'pen', icon: '✏️', label: 'Freehand' },
            { id: 'hl', icon: '🖍️', label: 'Highlighter' },
            { id: 'line', icon: '📏', label: 'Line' },
            { id: 'arrow', icon: '↗️', label: 'Arrow' },
            { id: 'darrow', icon: '↔️', label: '2-Arrow' },
            { id: 'rect', icon: '▭', label: 'Box' },
            { id: 'circle', icon: '⭕', label: 'Circle' },
            { id: 'text', icon: '🔤', label: 'Text' },
            { id: 'laser', icon: '🔦', label: 'Laser Select' },
            { id: 'eraser', icon: '🧽', label: 'Eraser' }
        ];
        const colors = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c', '#c084fc', '#ef4444', '#ffffff'];

        bar.innerHTML = `
            <div class="flex items-center gap-1 flex-wrap">
                ${tools.map(t => `
                    <button type="button" onclick="window.setReaderStudioTool('${t.id}')" class="px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${studioTool === t.id ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300 hover:text-white'}">
                        <span>${t.icon}</span><span class="text-[10px]">${t.label}</span>
                    </button>
                `).join('')}
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
                <input type="range" min="2" max="14" value="${studioStrokeWidth}" onchange="window.setReaderStudioStrokeWidth(this.value)" class="w-16 accent-amber-400" title="Stroke Width">
                ${colors.map(c => `
                    <button type="button" onclick="window.setReaderStudioColor('${c}')" class="w-5 h-5 rounded-full border-2 ${activeHighlightColor === c ? 'border-white scale-110' : 'border-slate-700'}" style="background:${c}"></button>
                `).join('')}
                <button type="button" onclick="window.undoLastReaderAnnotation()" class="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold" title="Undo Last Annotation (Ctrl+Z)">↩️ Undo</button>
                <button type="button" onclick="document.getElementById('reader-pencil-toggle-btn').click()" class="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-extrabold">✓ Done</button>
            </div>
        `;
    }

    window.setReaderStudioTool = function(t) {
        studioTool = t;
        selectedShapeId = null;
        renderPencilStudioToolbar();
        document.querySelectorAll('.v4-interactive-svg').forEach(svg => {
            svg.classList.toggle('mode-select', studioTool === 'select');
        });
        if (activeReaderBook) updateSinglePageSvg(activeReaderBook.currentPage || 1);
    };

    window.setReaderStudioStrokeWidth = function(w) {
        studioStrokeWidth = Math.max(2, Math.min(16, parseInt(w) || 4));
    };

    window.setReaderStudioColor = function(c) {
        activeHighlightColor = c;
        renderPencilStudioToolbar();
    };

    window.undoLastReaderAnnotation = function() {
        if (!activeReaderBook || !Array.isArray(activeReaderBook.annotations) || !activeReaderBook.annotations.length) return;
        const popped = activeReaderBook.annotations.pop();
        if (popped?.id) activeReaderBook.deletedAnnotationIds.push(popped.id);
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();
        updateSinglePageSvg(popped?.page || activeReaderBook.currentPage || 1);
        showToast("↩️ Undid last annotation");
    };

    document.getElementById('reader-pencil-toggle-btn')?.addEventListener('click', () => {
        studioActive = !studioActive;
        const bar = document.getElementById('reader-pencil-toolbar');
        const btn = document.getElementById('reader-pencil-toggle-btn');
        if (bar) {
            bar.classList.toggle('hidden', !studioActive);
            bar.classList.toggle('flex', studioActive);
            if (studioActive) renderPencilStudioToolbar();
        }
        if (btn) btn.className = studioActive
            ? "bg-amber-500 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow"
            : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1";
        window.setReaderSelectionMode(readerSelectionMode);
    });

    function updateSinglePageSvg(pageNum) {
        if (!activeReaderBook) return;
        const card = document.querySelector(`.v4-page-card[data-page="${pageNum}"]`);
        if (!card) return;
        const svg = card.querySelector('svg.v4-interactive-svg');
        if (!svg) return;
        svg.innerHTML = '';
        card.querySelectorAll('.v4-margin-chip').forEach(c => c.remove());

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `<marker id="pomo-arrow-${pageNum}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#facc15"/></marker>`;
        svg.appendChild(defs);

        const pageAnns = (activeReaderBook.annotations || []).filter(a => (a.page || 1) === pageNum);

        pageAnns.forEach(ann => {
            const color = ann.color || '#facc15';
            const sw = ann.strokeWidth || 4;
            const isSelected = (selectedShapeId === ann.id);

            // 100% Transparent Occlusion Click-to-Reveal (Never triggers shape inspector!)
            if (ann.type === 'occlusion') {
                const rc = (Array.isArray(ann.rects) && ann.rects[0]) ? ann.rects[0] : { x: 0.1, y: 0.1, w: 0.25, h: 0.05 };
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'v4-occlusion-node');
                g.setAttribute('data-ann-id', ann.id);
                g.setAttribute('data-revealed', ann.revealed ? 'true' : 'false');

                const x = rc.x * 1000, y = rc.y * 1400, w = Math.max(30, rc.w * 1000), h = Math.max(26, rc.h * 1400);
                g.innerHTML = `
                    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
                    <text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="800" font-family="monospace" style="display:${ann.revealed ? 'none' : 'block'};pointer-events:none;">🎭 ? CLICK TO REVEAL</text>
                `;
                g.onclick = (ev) => {
                    ev.stopPropagation();
                    if (studioActive && studioTool === 'eraser') {
                        deleteAnnotationById(ann.id, pageNum);
                        return;
                    }
                    ann.revealed = !ann.revealed;
                    saveReaderMeta();
                    updateSinglePageSvg(pageNum);
                };
                g.oncontextmenu = (ev) => {
                    ev.preventDefault();
                    deleteAnnotationById(ann.id, pageNum);
                    showToast("🗑️ Occlusion mask deleted");
                };
                svg.appendChild(g);
                return;
            }

            if (ann.type === 'highlight' || ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment') {
                const rects = (Array.isArray(ann.rects) && ann.rects.length > 0) ? ann.rects : [{ x: 0.08, y: ann.yNorm || 0.2, w: 0.84, h: 0.024 }];
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'v4-shape-node');
                g.setAttribute('data-ann-id', ann.id);
                g.setAttribute('data-hl', 'true');
                rects.forEach(rc => {
                    const rEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rEl.setAttribute('x', rc.x * 1000); rEl.setAttribute('y', rc.y * 1400);
                    rEl.setAttribute('width', Math.max(12, rc.w * 1000)); rEl.setAttribute('height', Math.max(12, rc.h * 1400));
                    rEl.setAttribute('fill', color); rEl.setAttribute('fill-opacity', '0.36'); rEl.setAttribute('rx', '3');
                    g.appendChild(rEl);
                });
                g.onclick = (ev) => { ev.stopPropagation(); openClickedAnnotationInspector(ann, pageNum, ev.clientX, ev.clientY); };
                svg.appendChild(g);

                if (ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment' || ann.note) {
                    const chip = document.createElement('div');
                    chip.className = "v4-margin-chip";
                    chip.style.top = `${Math.max(2, Math.min(94, ((rects[0]?.y || ann.yNorm || 0.15) * 100)))}%`;
                    chip.style.backgroundColor = color;
                    chip.innerHTML = `${ann.type === 'bookmark' ? '🔖' : (ann.attachmentId ? '📎' : '📝')} <span>${escapeHtml((ann.note || ann.text || 'Note').slice(0, 14))}</span>`;
                    chip.onclick = (ev) => { ev.stopPropagation(); openLineItemViewerModal(ann.id); };
                    card.appendChild(chip);
                }
                return;
            }

            if (ann.type === 'drawing') {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'v4-shape-node');
                g.setAttribute('data-ann-id', ann.id);
                if (ann.tool === 'hl') g.setAttribute('data-hl', 'true');

                if ((ann.tool === 'pen' || ann.tool === 'hl') && Array.isArray(ann.points) && ann.points.length > 1) {
                    const d = ann.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x * 1000).toFixed(1)} ${(pt.y * 1400).toFixed(1)}`).join(' ');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', d);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', color);
                    path.setAttribute('stroke-width', ann.tool === 'hl' ? 24 : sw);
                    path.setAttribute('stroke-opacity', ann.tool === 'hl' ? '0.38' : '0.95');
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    g.appendChild(path);
                } else if (ann.tool === 'line' || ann.tool === 'arrow' || ann.tool === 'darrow') {
                    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    ln.setAttribute('x1', (ann.x1 || 0.1) * 1000); ln.setAttribute('y1', (ann.y1 || 0.1) * 1400);
                    ln.setAttribute('x2', (ann.x2 || 0.3) * 1000); ln.setAttribute('y2', (ann.y2 || 0.3) * 1400);
                    ln.setAttribute('stroke', color); ln.setAttribute('stroke-width', sw);
                    if (ann.tool === 'arrow' || ann.tool === 'darrow') ln.setAttribute('marker-end', `url(#pomo-arrow-${pageNum})`);
                    if (ann.tool === 'darrow') ln.setAttribute('marker-start', `url(#pomo-arrow-${pageNum})`);
                    g.appendChild(ln);
                } else if (ann.tool === 'rect') {
                    const rx = Math.min(ann.x1, ann.x2) * 1000, ry = Math.min(ann.y1, ann.y2) * 1400;
                    const rw = Math.max(12, Math.abs(ann.x2 - ann.x1) * 1000), rh = Math.max(12, Math.abs(ann.y2 - ann.y1) * 1400);
                    const rEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rEl.setAttribute('x', rx); rEl.setAttribute('y', ry); rEl.setAttribute('width', rw); rEl.setAttribute('height', rh);
                    rEl.setAttribute('fill', color); rEl.setAttribute('fill-opacity', '0.08');
                    rEl.setAttribute('stroke', color); rEl.setAttribute('stroke-width', sw); rEl.setAttribute('rx', '6');
                    g.appendChild(rEl);
                } else if (ann.tool === 'circle') {
                    const cx = ((ann.x1 + ann.x2) / 2) * 1000, cy = ((ann.y1 + ann.y2) / 2) * 1400;
                    const rx = Math.max(10, (Math.abs(ann.x2 - ann.x1) / 2) * 1000), ry = Math.max(10, (Math.abs(ann.y2 - ann.y1) / 2) * 1400);
                    const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                    el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('rx', rx); el.setAttribute('ry', ry);
                    el.setAttribute('fill', color); el.setAttribute('fill-opacity', '0.08');
                    el.setAttribute('stroke', color); el.setAttribute('stroke-width', sw);
                    g.appendChild(el);
                } else if (ann.tool === 'text') {
                    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    tx.setAttribute('x', (ann.x1 || 0.1) * 1000); tx.setAttribute('y', (ann.y1 || 0.1) * 1400);
                    tx.setAttribute('fill', color); tx.setAttribute('font-size', ann.fontSize || 24);
                    tx.setAttribute('font-weight', '800');
                    tx.textContent = ann.text || '';
                    g.appendChild(tx);
                }

                // Restored Resize Handle when selected in Move/Resize mode
                if (isSelected && ann.x2 !== undefined && ann.y2 !== undefined) {
                    const hnd = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    hnd.setAttribute('class', 'v4-resize-handle');
                    hnd.setAttribute('data-resize-id', ann.id);
                    hnd.setAttribute('cx', (ann.x2 || 0.3) * 1000);
                    hnd.setAttribute('cy', (ann.y2 || 0.3) * 1400);
                    hnd.setAttribute('r', '10');
                    g.appendChild(hnd);
                }

                g.onclick = (ev) => {
                    ev.stopPropagation();
                    if (studioActive && studioTool === 'eraser') {
                        deleteAnnotationById(ann.id, pageNum);
                    } else {
                        selectedShapeId = ann.id;
                        updateSinglePageSvg(pageNum);
                        openClickedAnnotationInspector(ann, pageNum, ev.clientX, ev.clientY);
                    }
                };
                svg.appendChild(g);
            }
        });
    }

    function deleteAnnotationById(annId, pageNum) {
        if (!activeReaderBook) return;
        activeReaderBook.annotations = (activeReaderBook.annotations || []).filter(a => a.id !== annId);
        activeReaderBook.deletedAnnotationIds.push(annId);
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();
        updateSinglePageSvg(pageNum);
    }

    function openClickedAnnotationInspector(ann, pageNum, clientX, clientY) {
        document.getElementById('v5-clicked-ann-inspector')?.remove();
        const insp = document.createElement('div');
        insp.id = 'v5-clicked-ann-inspector';
        insp.className = "fixed z-[290] flex items-center gap-1 p-1.5";
        insp.style.left = `${Math.max(12, Math.min(window.innerWidth - 280, clientX - 80))}px`;
        insp.style.top = `${Math.max(12, clientY - 52)}px`;

        const colors = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#ef4444'];
        insp.innerHTML = `
            <div class="bg-slate-950/90 border border-slate-700 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xl">
                ${colors.map(c => `<button type="button" data-col="${c}" class="w-4 h-4 rounded-full border border-white/60" style="background:${c}"></button>`).join('')}
                <button type="button" id="insp-edit-note-btn" class="sym-dock-btn text-blue-300" title="Edit Note / Attach File">📝</button>
                <button type="button" id="insp-del-ann-btn" class="sym-dock-btn text-red-400" title="Delete">🗑️</button>
                <button type="button" onclick="this.closest('#v5-clicked-ann-inspector').remove()" class="text-xs font-bold text-slate-400 px-1">✕</button>
            </div>
        `;
        document.body.appendChild(insp);

        insp.querySelectorAll('button[data-col]').forEach(b => {
            b.onclick = () => {
                ann.color = b.getAttribute('data-col');
                ann.updatedAt = Date.now();
                activeReaderBook.pendingCloudSync = true;
                saveReaderMeta();
                updateSinglePageSvg(pageNum);
                insp.remove();
            };
        });
        document.getElementById('insp-edit-note-btn').onclick = () => {
            insp.remove();
            openLineItemViewerModal(ann.id);
        };
        document.getElementById('insp-del-ann-btn').onclick = () => {
            insp.remove();
            deleteAnnotationById(ann.id, pageNum);
        };
    }

    function bindPageInteractiveSvg(pageNum, svg) {
        let drawing = false;
        let movingShape = null;
        let resizingShape = null;
        let startNorm = { x: 0, y: 0 };
        let currentPoints = [];
        let previewEl = null;

        const getNorm = (e) => {
            const r = svg.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height)))
            };
        };

        svg.onpointerdown = (e) => {
            if (e.target.closest('.v4-occlusion-node')) return;

            // Check if dragging a resize handle
            const resizeHnd = e.target.closest('.v4-resize-handle');
            if (resizeHnd && activeReaderBook) {
                const rId = resizeHnd.getAttribute('data-resize-id');
                resizingShape = (activeReaderBook.annotations || []).find(a => a.id === rId);
                if (resizingShape) {
                    svg.setPointerCapture(e.pointerId);
                    return;
                }
            }

            // Check if dragging an existing shape in Move/Resize mode
            const shapeNode = e.target.closest('.v4-shape-node');
            if (shapeNode && studioActive && studioTool === 'select' && activeReaderBook) {
                const sId = shapeNode.getAttribute('data-ann-id');
                movingShape = (activeReaderBook.annotations || []).find(a => a.id === sId);
                if (movingShape) {
                    selectedShapeId = sId;
                    startNorm = getNorm(e);
                    svg.setPointerCapture(e.pointerId);
                    return;
                }
            }

            if (!studioActive && !occlusionModeActive && readerSelectionMode !== 'direct') return;
            if (studioActive && (studioTool === 'eraser' || studioTool === 'select')) return;

            startNorm = getNorm(e);
            if (studioActive && studioTool === 'text') {
                pendingTextPlacement = { pageNum, x: startNorm.x, y: startNorm.y };
                document.getElementById('v4-canvas-text-input').value = '';
                document.getElementById('v4-canvas-text-modal')?.classList.remove('hidden');
                return;
            }

            drawing = true;
            svg.setPointerCapture(e.pointerId);
            currentPoints = [startNorm];

            previewEl = document.createElementNS('http://www.w3.org/2000/svg', (studioActive && (studioTool === 'pen' || studioTool === 'hl')) ? 'path' : 'rect');
            previewEl.setAttribute('stroke', activeHighlightColor);
            previewEl.setAttribute('stroke-width', String(studioStrokeWidth));
            previewEl.setAttribute('fill', occlusionModeActive ? '#0f172a' : activeHighlightColor);
            previewEl.setAttribute('fill-opacity', (studioActive && (studioTool === 'pen' || studioTool === 'hl')) ? '0' : '0.35');
            svg.appendChild(previewEl);
        };

        svg.onpointermove = (e) => {
            const cur = getNorm(e);
            if (resizingShape) {
                resizingShape.x2 = cur.x;
                resizingShape.y2 = cur.y;
                updateSinglePageSvg(pageNum);
                return;
            }
            if (movingShape) {
                const dx = cur.x - startNorm.x;
                const dy = cur.y - startNorm.y;
                startNorm = cur;
                if (movingShape.x1 !== undefined) {
                    movingShape.x1 += dx; movingShape.y1 += dy;
                    if (movingShape.x2 !== undefined) { movingShape.x2 += dx; movingShape.y2 += dy; }
                } else if (Array.isArray(movingShape.points)) {
                    movingShape.points.forEach(pt => { pt.x += dx; pt.y += dy; });
                }
                updateSinglePageSvg(pageNum);
                return;
            }
            if (!drawing || !previewEl) return;
            if (studioActive && (studioTool === 'pen' || studioTool === 'hl')) {
                currentPoints.push(cur);
                const d = currentPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${(pt.x * 1000).toFixed(1)} ${(pt.y * 1400).toFixed(1)}`).join(' ');
                previewEl.setAttribute('d', d);
            } else {
                const x = Math.min(startNorm.x, cur.x) * 1000, y = Math.min(startNorm.y, cur.y) * 1400;
                const w = Math.max(8, Math.abs(cur.x - startNorm.x) * 1000), h = Math.max(8, Math.abs(cur.y - startNorm.y) * 1400);
                previewEl.setAttribute('x', x); previewEl.setAttribute('y', y);
                previewEl.setAttribute('width', w); previewEl.setAttribute('height', h);
            }
        };

        svg.onpointerup = (e) => {
            if (resizingShape || movingShape) {
                resizingShape = null;
                movingShape = null;
                if (activeReaderBook) activeReaderBook.pendingCloudSync = true;
                saveReaderMeta();
                return;
            }
            if (!drawing) return;
            drawing = false;
            previewEl?.remove();
            previewEl = null;
            const endNorm = getNorm(e);

            if (!activeReaderBook) return;
            const rx = Math.min(startNorm.x, endNorm.x), ry = Math.min(startNorm.y, endNorm.y);
            const rw = Math.abs(endNorm.x - startNorm.x), rh = Math.abs(endNorm.y - startNorm.y);

            // Check if Interactive Diagram Snip Mode is active (from 05-pomodoc-forge.js)
            if (window._activeDiagramSnipMode && window.completeInteractiveDiagramSnip) {
                window.completeInteractiveDiagramSnip(pageNum, rx, ry, rw, rh);
                return;
            }

            if (occlusionModeActive) {
                if (rw < 0.015 && rh < 0.01) return;
                activeReaderBook.annotations.push({
                    id: 'occ_' + Date.now(), type: 'occlusion', page: pageNum,
                    rects: [{ x: rx, y: ry, w: Math.max(0.04, rw), h: Math.max(0.022, rh) }],
                    revealed: false, createdAt: Date.now()
                });
                activeReaderBook.pendingCloudSync = true;
                saveReaderMeta();
                updateSinglePageSvg(pageNum);
                showToast("🎭 Occlusion Mask Added! Click it anytime to reveal.");
                return;
            }

            if (readerSelectionMode === 'direct' && !studioActive) {
                if (rw < 0.015 && rh < 0.01) return;
                const matchedText = (pageTextItemsCache[pageNum] || [])
                    .filter(it => (it.x + it.w >= rx && it.x <= rx + rw && it.y + it.h >= ry && it.y <= ry + rh))
                    .map(it => it.str).join(' ').trim() || `Page ${pageNum} Selection`;
                pendingLaserSelection = { pageNum, text: matchedText, rects: [{ x: rx, y: ry, w: Math.max(0.04, rw), h: Math.max(0.02, rh) }], yNorm: ry };
                showFloatingSelectionBar(e.clientX, e.clientY);
                return;
            }

            if (studioActive) {
                if (studioTool === 'laser') {
                    const matchedText = (pageTextItemsCache[pageNum] || [])
                        .filter(it => (it.x + it.w >= rx && it.x <= rx + rw && it.y + it.h >= ry && it.y <= ry + rh))
                        .map(it => it.str).join(' ').trim() || `Page ${pageNum} Region`;
                    pendingLaserSelection = { pageNum, text: matchedText, rects: [{ x: rx, y: ry, w: Math.max(0.04, rw), h: Math.max(0.02, rh) }], yNorm: ry };
                    showFloatingSelectionBar(e.clientX, e.clientY);
                    return;
                }
                const newId = 'drw_' + Date.now();
                activeReaderBook.annotations.push({
                    id: newId, type: 'drawing', tool: studioTool, page: pageNum,
                    color: activeHighlightColor, strokeWidth: studioStrokeWidth,
                    x1: startNorm.x, y1: startNorm.y, x2: endNorm.x, y2: endNorm.y,
                    points: currentPoints, createdAt: Date.now()
                });
                selectedShapeId = newId;
                activeReaderBook.pendingCloudSync = true;
                saveReaderMeta();
                updateSinglePageSvg(pageNum);
            }
        };
    }

    document.getElementById('v4-close-text-modal')?.addEventListener('click', () => {
        document.getElementById('v4-canvas-text-modal')?.classList.add('hidden');
    });
    document.getElementById('v4-confirm-text-btn')?.addEventListener('click', () => {
        const txt = (document.getElementById('v4-canvas-text-input')?.value || '').trim();
        const sz = parseInt(document.getElementById('v4-canvas-text-size')?.value) || 22;
        document.getElementById('v4-canvas-text-modal')?.classList.add('hidden');
        if (!txt || !pendingTextPlacement || !activeReaderBook) return;
        activeReaderBook.annotations.push({
            id: 'txt_' + Date.now(), type: 'drawing', tool: 'text', page: pendingTextPlacement.pageNum,
            color: activeHighlightColor, x1: pendingTextPlacement.x, y1: pendingTextPlacement.y,
            text: txt, fontSize: sz, createdAt: Date.now()
        });
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();
        updateSinglePageSvg(pendingTextPlacement.pageNum);
    });

    function showFloatingSelectionBar(clientX, clientY) {
        const bar = document.getElementById('reader-floating-sel-bar');
        if (!bar) return;
        bar.style.left = `${Math.max(12, Math.min(window.innerWidth - 360, clientX - 150))}px`;
        bar.style.top = `${Math.max(54, Math.min(window.innerHeight - 120, clientY - 85))}px`;
        bar.classList.remove('hidden');
        bar.classList.add('flex');
    }

    document.addEventListener('pointerup', (e) => {
        const overlay = document.getElementById('reader-fullscreen-overlay');
        if (!overlay || overlay.classList.contains('hidden')) return;
        if (e.target.closest('#reader-floating-sel-bar') || e.target.closest('#onenote-studio-dock')) return;

        setTimeout(() => {
            const sel = window.getSelection();
            const text = (sel?.toString() || '').trim();
            if (!text || text.length < 2) return;

            const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
            const card = range?.startContainer?.parentElement?.closest('.v4-page-card');
            if (!card) return;

            const pageNum = parseInt(card.getAttribute('data-page')) || (activeReaderBook?.currentPage || 1);
            const cardRect = card.getBoundingClientRect();
            const clientRects = Array.from(range.getClientRects());
            const normRects = clientRects.map(cr => ({
                x: Math.max(0, (cr.left - cardRect.left) / Math.max(1, cardRect.width)),
                y: Math.max(0, (cr.top - cardRect.top) / Math.max(1, cardRect.height)),
                w: Math.min(1, cr.width / Math.max(1, cardRect.width)),
                h: Math.min(0.15, Math.max(0.016, cr.height / Math.max(1, cardRect.height)))
            })).filter(r => r.w > 0.005);

            const bRect = range.getBoundingClientRect();
            pendingLaserSelection = {
                pageNum, text,
                rects: normRects.length ? normRects : [{ x: 0.08, y: 0.2, w: 0.84, h: 0.025 }],
                yNorm: normRects[0]?.y || 0.2
            };
            showFloatingSelectionBar(bRect.left + bRect.width / 2, bRect.top);
        }, 40);
    });

    document.getElementById('close-floating-sel-bar')?.addEventListener('click', () => {
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
    });

    document.querySelectorAll('.hl-color-swatch').forEach(sw => {
        sw.addEventListener('click', (e) => {
            activeHighlightColor = e.currentTarget.getAttribute('data-color') || '#facc15';
            document.querySelectorAll('.hl-color-swatch').forEach(b => b.classList.remove('border-white', 'border-2'));
            e.currentTarget.classList.add('border-white', 'border-2');
        });
    });

    function commitSelectionAnnotation(annType, openNoteModalAfter = false) {
        if (!activeReaderBook || !pendingLaserSelection) return null;
        const newAnn = {
            id: 'ann_' + Date.now(),
            type: annType,
            page: pendingLaserSelection.pageNum,
            text: pendingLaserSelection.text,
            note: '',
            color: activeHighlightColor,
            rects: pendingLaserSelection.rects,
            yNorm: pendingLaserSelection.yNorm || 0.2,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        activeReaderBook.annotations.push(newAnn);
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();
        updateSinglePageSvg(pendingLaserSelection.pageNum);
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
        try { window.getSelection()?.removeAllRanges(); } catch (e) {}
        if (openNoteModalAfter) openLineItemViewerModal(newAnn.id);
        return newAnn;
    }

    document.getElementById('sel-action-highlight')?.addEventListener('click', () => {
        commitSelectionAnnotation('highlight', false);
        showToast("🖍️ Highlight saved!");
    });
    document.getElementById('sel-action-bookmark')?.addEventListener('click', () => {
        commitSelectionAnnotation('bookmark', false);
        showToast("🔖 Selection bookmarked!");
    });
    document.getElementById('sel-action-note')?.addEventListener('click', () => {
        commitSelectionAnnotation('note', true);
    });
    document.getElementById('sel-action-copy')?.addEventListener('click', async () => {
        if (!pendingLaserSelection) return;
        try { await navigator.clipboard.writeText(pendingLaserSelection.text); } catch (e) {}
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
        showToast("📋 Selected passage copied!");
    });
    document.getElementById('sel-action-dict')?.addEventListener('click', () => {
        const txt = pendingLaserSelection?.text || '';
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
        if (window.openReaderDictionaryModal) window.openReaderDictionaryModal(txt);
    });
    document.getElementById('sel-action-attach')?.addEventListener('click', () => {
        const created = commitSelectionAnnotation('attachment', true);
        if (created) document.getElementById('line-attach-file-input')?.click();
    });
    document.getElementById('sel-action-todo')?.addEventListener('click', () => {
        if (!pendingLaserSelection || !activeReaderBook) return;
        const today = getLocalTodayString();
        todos.unshift({
            id: Date.now(),
            title: `📖 [${activeReaderBook.title} p.${pendingLaserSelection.pageNum}] ${pendingLaserSelection.text.slice(0, 90)}`,
            completed: false, important: true, myDayDate: today, createdDate: today, dueDate: today,
            durationMins: 30, repeat: { type: 'none' }, steps: [],
            note: pendingLaserSelection.text, listId: 'tasks',
            bookId: activeReaderBook.id, bookPage: pendingLaserSelection.pageNum
        });
        saveTodos(); renderTodos();
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
        showToast("☑️ Sent passage to PomoTasks!");
    });
    document.getElementById('sel-action-vault')?.addEventListener('click', () => {
        if (!pendingLaserSelection || !activeReaderBook) return;
        if (window.saveNotebookLmReportToVault) {
            window.saveNotebookLmReportToVault(
                `${activeReaderBook.title} (p.${pendingLaserSelection.pageNum}): ${pendingLaserSelection.text.slice(0, 65)}`,
                window.activeTaskSubj || 'Biology',
                pendingLaserSelection.text,
                activeReaderBook.id,
                pendingLaserSelection.pageNum
            );
        }
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
    });
    document.getElementById('sel-action-bridge')?.addEventListener('click', () => {
        if (!pendingLaserSelection || !activeReaderBook) return;
        window.PomoStudioBridge.sendSelectionToExternalStudio({
            bookId: activeReaderBook.id,
            bookTitle: activeReaderBook.title,
            shelfName: activeReaderBook.shelfName,
            startPage: pendingLaserSelection.pageNum,
            selectedText: pendingLaserSelection.text
        });
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
    });

    document.getElementById('reader-quick-bookmark-btn')?.addEventListener('click', () => {
        if (!activeReaderBook) return;
        const p = activeReaderBook.currentPage || 1;
        activeReaderBook.annotations.push({
            id: 'bm_' + Date.now(), type: 'bookmark', page: p,
            text: `Page ${p} Bookmark`, note: `Bookmarked Page ${p}`, color: '#f59e0b',
            rects: [{ x: 0.08, y: 0.06, w: 0.3, h: 0.025 }], yNorm: 0.06, createdAt: Date.now()
        });
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();
        updateSinglePageSvg(p);
        showToast(`🔖 Page ${p} Bookmarked!`);
    });

    function openLineItemViewerModal(annId) {
        if (!activeReaderBook) return;
        const ann = (activeReaderBook.annotations || []).find(a => a.id === annId);
        if (!ann) return;
        activeLineViewerAnnId = annId;
        document.getElementById('line-viewer-quote').textContent = ann.text || `Page ${ann.page} Annotation`;
        document.getElementById('line-viewer-note-input').value = ann.note || '';
        const attBox = document.getElementById('line-viewer-attachment-box');
        if (attBox) {
            if (ann.attachmentName) {
                attBox.classList.remove('hidden');
                attBox.innerHTML = `<span class="text-xs font-bold text-emerald-400">📎 Attached: ${escapeHtml(ann.attachmentName)}</span>`;
            } else {
                attBox.classList.add('hidden');
            }
        }
        document.getElementById('line-item-viewer-modal')?.classList.remove('hidden');
    }

    document.getElementById('close-line-viewer-btn')?.addEventListener('click', () => {
        document.getElementById('line-item-viewer-modal')?.classList.add('hidden');
    });
    document.getElementById('line-viewer-save-btn')?.addEventListener('click', () => {
        if (!activeReaderBook || !activeLineViewerAnnId) return;
        const ann = (activeReaderBook.annotations || []).find(a => a.id === activeLineViewerAnnId);
        if (ann) {
            ann.note = document.getElementById('line-viewer-note-input').value;
            ann.updatedAt = Date.now();
            activeReaderBook.pendingCloudSync = true;
            saveReaderMeta();
            updateSinglePageSvg(ann.page || 1);
            showToast("💾 Note saved!");
        }
        document.getElementById('line-item-viewer-modal')?.classList.add('hidden');
    });
    document.getElementById('line-viewer-delete-btn')?.addEventListener('click', () => {
        if (!activeReaderBook || !activeLineViewerAnnId) return;
        const ann = (activeReaderBook.annotations || []).find(a => a.id === activeLineViewerAnnId);
        deleteAnnotationById(activeLineViewerAnnId, ann?.page || 1);
        document.getElementById('line-item-viewer-modal')?.classList.add('hidden');
    });
    document.getElementById('line-viewer-attach-btn')?.addEventListener('click', () => {
        document.getElementById('line-attach-file-input')?.click();
    });
    document.getElementById('line-attach-file-input')?.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f || !activeReaderBook || !activeLineViewerAnnId) return;
        const ann = (activeReaderBook.annotations || []).find(a => a.id === activeLineViewerAnnId);
        if (!ann) return;
        const r = new FileReader();
        r.onload = async () => {
            const attId = 'att_' + Date.now();
            await idbPut('lineAttachments', { id: attId, name: f.name, type: f.type, dataUrl: r.result });
            ann.attachmentId = attId;
            ann.attachmentName = f.name;
            activeReaderBook.pendingCloudSync = true;
            saveReaderMeta();
            openLineItemViewerModal(ann.id);
            updateSinglePageSvg(ann.page || 1);
            showToast(`📎 Attached "${f.name}" to line!`);
        };
        r.readAsDataURL(f);
    });

    /* =========================================================================
       8. NAVIGATION, TOC DRAWER, FULL-BOOK SEARCH, TTS & FULL 3-DOTS MODALS
       ========================================================================= */
    window.jumpToReaderPage = function(pageNum) {
        if (!activeReaderBook) return;
        const target = Math.max(1, Math.min(activeReaderBook.totalPages || 1, parseInt(pageNum) || 1));
        isJumpingPage = true;
        clearTimeout(jumpUnlockTimer);
        jumpUnlockTimer = setTimeout(() => { isJumpingPage = false; }, 350);
        updateHeaderAndSliderForCurrentPage(target);
        const card = document.querySelector(`.v4-page-card[data-page="${target}"]`);
        if (card) {
            if (activePdfDoc) ensurePdfPageRendered(target, card);
            card.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    };

    document.getElementById('reader-prev-page-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage > 1) jumpToReaderPage(activeReaderBook.currentPage - 1);
    });
    document.getElementById('reader-next-page-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage < activeReaderBook.totalPages) jumpToReaderPage(activeReaderBook.currentPage + 1);
    });
    document.getElementById('reader-page-slider')?.addEventListener('input', (e) => jumpToReaderPage(parseInt(e.target.value) || 1));
    document.getElementById('reader-page-num-input')?.addEventListener('change', (e) => jumpToReaderPage(parseInt(e.target.value) || 1));

    document.getElementById('reader-toggle-bottom-bar-btn')?.addEventListener('click', () => {
        readerSettings.hideBottomBar = !readerSettings.hideBottomBar;
        document.getElementById('reader-bottom-bar')?.classList.toggle('hidden', readerSettings.hideBottomBar);
        saveReaderMeta();
    });

    function renderTocAndBookmarksDrawer() {
        const listEl = document.getElementById('book-toc-drawer-list');
        if (!listEl || !activeReaderBook) return;
        const q = (document.getElementById('book-toc-search-input')?.value || '').trim().toLowerCase();

        if (activeTocDrawerTab === 'chapters') {
            const chaps = (activeReaderBook.outline || []).filter(c => !q || (c.title || '').toLowerCase().includes(q));
            listEl.innerHTML = `
                <div class="flex gap-1.5 mb-2">
                    <input type="text" id="new-toc-chap-title" placeholder="Add Chapter / Topic Headline..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white">
                    <input type="number" id="new-toc-chap-page" value="${activeReaderBook.currentPage || 1}" class="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-mono text-white text-center">
                    <button type="button" id="add-toc-chap-btn" class="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs">＋</button>
                </div>
                ${chaps.length ? chaps.map(c => `
                    <div onclick="window.jumpToReaderPage(${c.page || 1}); document.getElementById('reader-toc-bookmarks-drawer').classList.add('hidden');" class="flex items-center justify-between bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                        <span class="text-xs font-bold text-slate-200 truncate pr-2">📑 ${escapeHtml(c.title)}</span>
                        <span class="text-[10px] font-mono font-extrabold text-blue-400 shrink-0">p.${c.page || 1}</span>
                    </div>
                `).join('') : `<p class="text-xs text-slate-400 italic text-center p-4">No chapters listed yet. Add a chapter above!</p>`}
            `;
            document.getElementById('add-toc-chap-btn').onclick = () => {
                const t = (document.getElementById('new-toc-chap-title')?.value || '').trim();
                const p = parseInt(document.getElementById('new-toc-chap-page')?.value) || 1;
                if (!t) return;
                if (!Array.isArray(activeReaderBook.outline)) activeReaderBook.outline = [];
                activeReaderBook.outline.push({ id: 'ch_' + Date.now(), title: t, page: p });
                activeReaderBook.outline.sort((a, b) => (a.page || 1) - (b.page || 1));
                saveReaderMeta();
                renderTocAndBookmarksDrawer();
            };
        } else {
            const anns = (activeReaderBook.annotations || []).filter(a => !q || `${a.text || ''} ${a.note || ''}`.toLowerCase().includes(q));
            listEl.innerHTML = anns.length ? anns.map(a => `
                <div onclick="window.jumpToReaderPage(${a.page || 1}); document.getElementById('reader-toc-bookmarks-drawer').classList.add('hidden');" class="bg-slate-950 hover:bg-slate-800 p-2.5 rounded-xl border border-slate-800 cursor-pointer flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-extrabold uppercase text-amber-400">${escapeHtml(a.type)}</span>
                        <span class="text-[10px] font-mono text-emerald-400">Page ${a.page || 1}</span>
                    </div>
                    <p class="text-xs text-slate-200 line-clamp-2">${escapeHtml(a.note || a.text || 'Annotation')}</p>
                </div>
            `).join('') : `<p class="text-xs text-slate-400 italic text-center p-4">No bookmarks or notes in this book yet.</p>`;
        }
    }

    document.getElementById('reader-bottom-toc-btn')?.addEventListener('click', () => {
        renderTocAndBookmarksDrawer();
        document.getElementById('reader-toc-bookmarks-drawer')?.classList.remove('hidden');
    });
    document.getElementById('close-toc-drawer-btn')?.addEventListener('click', () => {
        document.getElementById('reader-toc-bookmarks-drawer')?.classList.add('hidden');
    });
    document.querySelectorAll('.toc-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTocDrawerTab = e.currentTarget.getAttribute('data-tab') || 'chapters';
            document.querySelectorAll('.toc-tab-btn').forEach(b => b.className = "toc-tab-btn flex-1 bg-transparent text-slate-400 text-xs font-bold py-2 rounded-lg");
            e.currentTarget.className = "toc-tab-btn flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg";
            renderTocAndBookmarksDrawer();
        });
    });
    document.getElementById('book-toc-search-input')?.addEventListener('input', renderTocAndBookmarksDrawer);

    document.getElementById('reader-bottom-search-btn')?.addEventListener('click', () => {
        document.getElementById('reader-fullsearch-drawer')?.classList.remove('hidden');
        setTimeout(() => document.getElementById('fullbook-search-input')?.focus(), 50);
    });
    document.getElementById('close-fullsearch-drawer-btn')?.addEventListener('click', () => {
        document.getElementById('reader-fullsearch-drawer')?.classList.add('hidden');
    });

    async function executeFullBookSearch() {
        const q = (document.getElementById('fullbook-search-input')?.value || '').trim();
        const resEl = document.getElementById('fullbook-search-results');
        const stEl = document.getElementById('fullbook-search-status');
        if (!q || !resEl || !activeReaderBook) return;

        stEl.textContent = `⏳ Searching all ${activeReaderBook.totalPages} pages for "${q}"...`;
        resEl.innerHTML = '';
        const qLow = q.toLowerCase();
        const matches = [];

        for (let p = 1; p <= (activeReaderBook.totalPages || 1); p++) {
            let pageTxt = activeExtractedPages[p - 1] || '';
            if (!pageTxt && activePdfDoc) {
                try {
                    const pg = await activePdfDoc.getPage(p);
                    const tc = await pg.getTextContent();
                    pageTxt = tc.items.map(i => i.str).join(' ');
                    activeExtractedPages[p - 1] = pageTxt;
                    try { pg.cleanup(); } catch (e) {}
                } catch (e) {}
            }
            const idx = pageTxt.toLowerCase().indexOf(qLow);
            if (idx !== -1) {
                const snippet = pageTxt.slice(Math.max(0, idx - 45), Math.min(pageTxt.length, idx + q.length + 65));
                matches.push({ page: p, snippet });
            }
        }

        stEl.textContent = `✅ Found ${matches.length} page match(es) for "${q}".`;
        resEl.innerHTML = matches.map(m => {
            const safeSnip = escapeHtml(m.snippet).replace(new RegExp(escapeHtml(q), 'gi'), match => `<b class="text-red-400 underline">${match}</b>`);
            return `
                <div onclick="window.jumpToReaderPage(${m.page}); document.getElementById('reader-fullsearch-drawer').classList.add('hidden');" class="bg-slate-950 hover:bg-slate-800 p-3 rounded-xl border border-slate-800 cursor-pointer">
                    <span class="text-[10px] font-mono font-extrabold text-emerald-400">Page ${m.page}</span>
                    <p class="text-xs text-slate-200 mt-1 leading-relaxed">…${safeSnip}…</p>
                </div>
            `;
        }).join('');
    }
    document.getElementById('fullbook-search-run-btn')?.addEventListener('click', executeFullBookSearch);
    document.getElementById('fullbook-search-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeFullBookSearch(); });

    function speakCurrentReaderPage() {
        if (!('speechSynthesis' in window) || !activeReaderBook) return;
        window.speechSynthesis.cancel();
        const p = activeReaderBook.currentPage || 1;
        const txt = activeExtractedPages[p - 1] || (pageTextItemsCache[p] || []).map(i => i.str).join(' ') || activeReaderBook.title;
        const utt = new SpeechSynthesisUtterance(txt);
        utt.rate = parseFloat(document.getElementById('tts-rate-select')?.value) || 1.0;
        window.speechSynthesis.speak(utt);
    }

    document.getElementById('reader-bottom-tts-btn')?.addEventListener('click', () => {
        const bar = document.getElementById('reader-tts-bar');
        if (!bar) return;
        bar.classList.remove('hidden');
        bar.classList.add('flex');
        speakCurrentReaderPage();
    });
    document.getElementById('tts-play-pause-btn')?.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) return;
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        else if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
        else speakCurrentReaderPage();
    });
    document.getElementById('tts-prev-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage > 1) {
            jumpToReaderPage(activeReaderBook.currentPage - 1);
            speakCurrentReaderPage();
        }
    });
    document.getElementById('tts-next-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage < activeReaderBook.totalPages) {
            jumpToReaderPage(activeReaderBook.currentPage + 1);
            speakCurrentReaderPage();
        }
    });
    document.getElementById('tts-stop-close-btn')?.addEventListener('click', () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        document.getElementById('reader-tts-bar')?.classList.add('hidden');
    });

    function applyBlueLightFilter() {
        const shield = document.getElementById('reader-bluelight-shield');
        if (!shield) return;
        if (readerSettings.blueLightEnabled) {
            const alpha = Math.min(0.65, (parseInt(readerSettings.blueLightIntensity) || 30) / 100);
            shield.style.background = `rgba(255, 145, 0, ${alpha})`;
        } else {
            shield.style.background = 'rgba(255, 145, 0, 0)';
        }
    }

    document.getElementById('reader-more-dots-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('reader-three-dots-menu');
        menu?.classList.toggle('hidden');
        menu?.classList.toggle('flex');
    });
    document.addEventListener('click', () => {
        document.getElementById('reader-three-dots-menu')?.classList.add('hidden');
    });

    document.querySelectorAll('.dots-menu-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sub = e.currentTarget.getAttribute('data-sub');
            document.getElementById('reader-three-dots-menu')?.classList.add('hidden');
            openReaderSubOptionModal(sub);
        });
    });

    document.getElementById('close-suboptions-modal-btn')?.addEventListener('click', () => {
        document.getElementById('reader-suboptions-modal')?.classList.add('hidden');
    });

    function openReaderSubOptionModal(subType) {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;

        if (subType === 'sub-pdf-options') {
            titleEl.textContent = "📄 i. PDF Options & View Modes";
            bodyEl.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" onclick="window.setReaderViewMode('scroll')" class="p-3 rounded-xl border text-xs font-extrabold ${readerSettings.viewMode === 'scroll' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-950 text-slate-300 border-slate-800'}">📜 Continuous Vertical Scroll</button>
                    <button type="button" onclick="window.setReaderViewMode('dual')" class="p-3 rounded-xl border text-xs font-extrabold ${readerSettings.viewMode === 'dual' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-950 text-slate-300 border-slate-800'}">📖 Dual-Page 2-Column Spread</button>
                </div>
            `;
        } else if (subType === 'sub-control-options') {
            titleEl.textContent = "🖥️ ii. Control, Highlight Colors & Paper Background";
            bodyEl.innerHTML = `
                <div class="flex flex-col gap-2.5 text-xs">
                    <label class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="font-bold text-slate-200">🔒 Lock Horizontal Scroll</span>
                        <input type="checkbox" ${readerSettings.lockHorizontalScroll ? 'checked' : ''} onchange="window.toggleReaderScrollLock('h', this.checked)">
                    </label>
                    <label class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="font-bold text-slate-200">🔒 Lock Vertical Scroll</span>
                        <input type="checkbox" ${readerSettings.lockVerticalScroll ? 'checked' : ''} onchange="window.toggleReaderScrollLock('v', this.checked)">
                    </label>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span class="font-bold text-cyan-300">📄 .TXT / Semantic Paper Theme</span>
                        <select onchange="window.setReaderTxtPaperTheme(this.value)" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold">
                            ${['default', 'black', 'blue', 'green', 'sepia', 'paper'].map(t => `<option value="${t}" ${readerSettings.txtBgTheme === t ? 'selected' : ''}>${t.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `;
        } else if (subType === 'sub-themes-options') {
            titleEl.textContent = "🎨 Reading Themes & Blue-Light Eye Shield";
            bodyEl.innerHTML = `
                <div class="grid grid-cols-4 gap-2 text-xs">
                    ${['day', 'sepia', 'night', 'amoled'].map(th => `
                        <button type="button" onclick="window.setReaderThemeMode('${th}')" class="p-2.5 rounded-xl border font-extrabold uppercase ${readerSettings.theme === th ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-950 text-slate-300 border-slate-800'}">${th}</button>
                    `).join('')}
                </div>
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2 mt-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-amber-300">🕶️ Blue-Light Eye Shield</span>
                        <input type="checkbox" ${readerSettings.blueLightEnabled ? 'checked' : ''} onchange="window.toggleBlueLightShield(this.checked)">
                    </div>
                    <input type="range" min="10" max="75" value="${readerSettings.blueLightIntensity || 30}" oninput="window.setBlueLightIntensity(this.value)" class="w-full accent-amber-500">
                </div>
            `;
        } else if (subType === 'sub-book-info' && activeReaderBook) {
            titleEl.textContent = "ℹ️ iv. Book Information";
            bodyEl.innerHTML = `
                <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5 font-mono">
                    <p><b class="text-slate-400">Title:</b> ${escapeHtml(activeReaderBook.title)}</p>
                    <p><b class="text-slate-400">Author:</b> ${escapeHtml(activeReaderBook.author)}</p>
                    <p><b class="text-slate-400">Shelf:</b> ${escapeHtml(activeReaderBook.shelfName)} (#${activeReaderBook.readSeq || 1})</p>
                    <p><b class="text-slate-400">Format & Size:</b> ${(activeReaderBook.format || 'pdf').toUpperCase()} • ${((activeReaderBook.fileSize || 0) / 1048576).toFixed(2)} MB</p>
                    <p><b class="text-slate-400">Pages:</b> ${activeReaderBook.currentPage} / ${activeReaderBook.totalPages} (${activeReaderBook.progressPct}%)</p>
                    <p><b class="text-slate-400">Reading Time:</b> ${activeReaderBook.readingMins || 0} mins</p>
                    <p><b class="text-slate-400">Annotations:</b> ${(activeReaderBook.annotations || []).length}</p>
                </div>
            `;
        } else if (subType === 'sub-share-options' && activeReaderBook) {
            titleEl.textContent = "📤 v. Share, Sync & Export Baked PDF";
            bodyEl.innerHTML = `
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.exportBakedPdfFile()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow">⬇️ Download Real PDF with Baked Highlights & Drawings</button>
                    <button type="button" onclick="window.exportBookNotesMarkdown()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow">📝 Export Book Highlights & Notes (.MD)</button>
                    <button type="button" onclick="window.syncSingleBookEverywhere('${escapeJsStr(activeReaderBook.id)}', true)" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow">☁️ Sync Baked PDF to Connected Clouds Now</button>
                </div>
            `;
        } else {
            modal.classList.add('hidden');
            document.getElementById('reader-general-settings-btn')?.click();
            return;
        }
        modal.classList.remove('hidden');
    }

    window.setReaderViewMode = function(m) {
        readerSettings.viewMode = m;
        saveReaderMeta();
        document.getElementById('reader-viewport')?.classList.toggle('mode-dual', m === 'dual');
        document.getElementById('reader-suboptions-modal')?.classList.add('hidden');
    };
    window.toggleReaderScrollLock = function(axis, val) {
        if (axis === 'h') readerSettings.lockHorizontalScroll = Boolean(val);
        else readerSettings.lockVerticalScroll = Boolean(val);
        saveReaderMeta();
        const vp = document.getElementById('reader-viewport');
        vp?.classList.toggle('lock-h-scroll', Boolean(readerSettings.lockHorizontalScroll));
        vp?.classList.toggle('lock-v-scroll', Boolean(readerSettings.lockVerticalScroll));
    };
    window.setReaderTxtPaperTheme = function(th) {
        readerSettings.txtBgTheme = th;
        saveReaderMeta();
        if (activeReaderBook) buildBookStageAndObserver();
    };
    window.setReaderThemeMode = function(th) {
        readerSettings.theme = th;
        saveReaderMeta();
        const ov = document.getElementById('reader-fullscreen-overlay');
        if (ov) {
            ov.classList.remove('theme-day', 'theme-sepia', 'theme-night', 'theme-amoled');
            ov.classList.add(`theme-${th}`);
        }
    };
    window.toggleBlueLightShield = function(val) {
        readerSettings.blueLightEnabled = Boolean(val);
        saveReaderMeta();
        applyBlueLightFilter();
    };
    window.setBlueLightIntensity = function(val) {
        readerSettings.blueLightIntensity = parseInt(val) || 30;
        readerSettings.blueLightEnabled = true;
        saveReaderMeta();
        applyBlueLightFilter();
    };

    window.exportBakedPdfFile = async function() {
        if (!activeReaderBook) return;
        showToast("⏳ Baking highlights, drawings & notes into PDF...");
        const bakedUint8 = await window.bakeAnnotationsIntoPdfBytes(activeReaderBook);
        if (!bakedUint8) { showToast("Original PDF binary required.", true); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([bakedUint8], { type: 'application/pdf' }));
        a.download = activeReaderBook.fileName || `${activeReaderBook.title}_Annotated.pdf`;
        a.click();
        document.getElementById('reader-suboptions-modal')?.classList.add('hidden');
        showToast("📤 Baked Annotated PDF Exported!");
    };

    window.exportBookNotesMarkdown = function() {
        if (!activeReaderBook) return;
        const lines = [`# 📘 ${activeReaderBook.title} — Study Notes & Highlights\n`];
        (activeReaderBook.annotations || []).forEach(a => {
            lines.push(`### Page ${a.page || 1} [${(a.type || 'NOTE').toUpperCase()}]`);
            if (a.text) lines.push(`> ${a.text}`);
            if (a.note) lines.push(`\n**Note:** ${a.note}\n`);
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
        a.download = `${activeReaderBook.title}_Notes.md`;
        a.click();
        showToast("📝 Markdown Notes Exported!");
    };

    /* =========================================================================
       9. FULL SETTINGS 1–10 MASTER CONTROL CENTER, 6M STATS & MY FILES
       ========================================================================= */
    function openMasterReaderSettings(initialPanel = 'panel-a1') {
        const modal = document.getElementById('reader-master-settings-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        switchA10Panel(initialPanel);
    }

    function switchA10Panel(panelId) {
        document.querySelectorAll('.a10-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(panelId)?.classList.remove('hidden');
        document.querySelectorAll('.a10-nav-btn').forEach(btn => {
            const act = btn.getAttribute('data-panel') === panelId;
            btn.className = act
                ? "a10-nav-btn bg-blue-600 text-white text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0"
                : "a10-nav-btn bg-transparent text-slate-300 hover:bg-slate-900 text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0";
        });
        if (panelId === 'panel-a1') renderGlobalAnnotationsA1();
        if (panelId === 'panel-a6') renderCloudProvidersConfigA6();
        if (panelId === 'panel-a9') renderA9StatsAndCalendar();
        if (panelId === 'panel-a10') renderA10StorageExplorer();
    }

    document.querySelectorAll('.a10-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchA10Panel(e.currentTarget.getAttribute('data-panel')));
    });

    document.getElementById('reader-general-settings-btn')?.addEventListener('click', () => openMasterReaderSettings('panel-a1'));
    document.getElementById('shelf-open-a1-hub-btn')?.addEventListener('click', () => openMasterReaderSettings('panel-a1'));
    document.getElementById('shelf-open-a9-stats-btn')?.addEventListener('click', () => openMasterReaderSettings('panel-a9'));
    document.getElementById('shelf-open-a10-files-btn')?.addEventListener('click', () => openMasterReaderSettings('panel-a10'));
    document.getElementById('close-reader-master-settings-btn')?.addEventListener('click', () => {
        document.getElementById('reader-master-settings-modal')?.classList.add('hidden');
    });

    function renderGlobalAnnotationsA1() {
        const listEl = document.getElementById('a1-global-annotations-list');
        if (!listEl) return;
        const q = (document.getElementById('a1-global-search-input')?.value || '').trim().toLowerCase();
        const typeFilter = document.getElementById('a1-global-type-filter')?.value || 'all';

        const allItems = [];
        readerBooks.forEach(b => {
            (b.annotations || []).forEach(a => {
                if (typeFilter !== 'all' && a.type !== typeFilter) return;
                if (q && !`${b.title} ${a.text || ''} ${a.note || ''}`.toLowerCase().includes(q)) return;
                allItems.push({ book: b, ann: a });
            });
        });

        listEl.innerHTML = allItems.length ? allItems.map(({ book, ann }) => `
            <div onclick="document.getElementById('reader-master-settings-modal').classList.add('hidden'); window.openBookAtPage('${escapeJsStr(book.id)}', ${ann.page || 1});" class="bg-slate-950 hover:bg-slate-800 p-3 rounded-xl border border-slate-800 cursor-pointer flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <span class="text-[10px] font-extrabold text-amber-400 uppercase">[${escapeHtml(book.title)} • Page ${ann.page || 1} • ${escapeHtml(ann.type)}]</span>
                    <p class="text-xs text-slate-200 truncate mt-0.5">${escapeHtml(ann.note || ann.text || 'Visual Annotation')}</p>
                </div>
                <span class="text-xs text-blue-400 font-bold shrink-0">Jump ➔</span>
            </div>
        `).join('') : `<p class="text-xs text-slate-400 italic text-center p-6">No annotations collected yet.</p>`;
    }
    document.getElementById('a1-global-search-input')?.addEventListener('input', renderGlobalAnnotationsA1);
    document.getElementById('a1-global-type-filter')?.addEventListener('change', renderGlobalAnnotationsA1);

    document.getElementById('shelf-wood-style-select')?.addEventListener('change', (e) => {
        readerSettings.woodStyle = e.target.value;
        saveReaderMeta();
        renderWoodenShelf();
    });
    document.getElementById('settings-sort-by-select')?.addEventListener('change', (e) => {
        readerSettings.sortBy = e.target.value;
        saveReaderMeta();
        renderWoodenShelf();
    });
    document.getElementById('toggle-auto-folder-import-btn')?.addEventListener('click', (e) => {
        readerSettings.autoFolderImport = !readerSettings.autoFolderImport;
        e.currentTarget.textContent = readerSettings.autoFolderImport ? 'Enabled' : 'Disabled';
        saveReaderMeta();
        updateMainFolderUI();
    });

    function renderCloudProvidersConfigA6() {
        const grid = document.getElementById('cloud-providers-config-grid');
        if (!grid) return;
        grid.innerHTML = Object.entries(readerSettings.clouds || {}).map(([k, cl]) => `
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-white">${cl.icon} ${escapeHtml(cl.name)}</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded ${cl.connected ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-400'}">${cl.connected ? 'Connected' : 'Ready'}</span>
                </div>
                <p class="text-[10px] text-slate-400">${escapeHtml(cl.status)}</p>
                <div class="flex gap-1.5 pt-1">
                    <button type="button" onclick="window.connectCloudFolderPicker('${k}')" class="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 py-1.5 rounded-lg text-[10px] font-bold">📂 Link Folder</button>
                    ${['gdrive', 'dropbox', 'telegram'].includes(k) ? `<button type="button" onclick="window.openCloudTokenModal('${k}')" class="flex-1 bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 py-1.5 rounded-lg text-[10px] font-bold">🔑 API / Token</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    window.connectCloudFolderPicker = async function(cloudKey) {
        if (!('showDirectoryPicker' in window)) { showToast("Desktop Folder Picker requires Chromium/Edge/Tauri.", true); return; }
        try {
            const dirH = await window.showDirectoryPicker({ mode: 'readwrite' });
            cloudDirectoryHandles[cloudKey] = dirH;
            await idbPut('handles', { key: 'cloud_' + cloudKey, handle: dirH, name: dirH.name });
            if (readerSettings.clouds[cloudKey]) {
                readerSettings.clouds[cloudKey].connected = true;
                readerSettings.clouds[cloudKey].folderName = dirH.name;
                readerSettings.clouds[cloudKey].status = `Synced Folder: ${dirH.name}`;
            }
            saveReaderMeta();
            renderCloudProvidersConfigA6();
            showToast(`✅ Linked ${dirH.name} to ${cloudKey.toUpperCase()}!`);
        } catch (e) {}
    };

    window.openCloudTokenModal = function(cloudKey) {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        if (!modal || !titleEl || !bodyEl) return;
        const cl = readerSettings.clouds[cloudKey] || {};
        titleEl.textContent = `🔑 Configure ${cl.name || cloudKey.toUpperCase()} API`;
        bodyEl.innerHTML = `
            <input type="text" id="cloud-token-inp" value="${escapeHtml(cl.token || cl.tdlibUrl || '')}" placeholder="${cloudKey === 'telegram' ? 'TDLib Local Server URL (e.g. http://127.0.0.1:8081)' : 'Paste OAuth2 / Access Token'}" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono">
            <button type="button" id="save-cloud-token-btn" class="w-full bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs">💾 Save Cloud Credentials</button>
        `;
        modal.classList.remove('hidden');
        document.getElementById('save-cloud-token-btn').onclick = () => {
            const val = (document.getElementById('cloud-token-inp')?.value || '').trim();
            if (cloudKey === 'telegram') cl.tdlibUrl = val;
            else cl.token = val;
            cl.connected = Boolean(val);
            cl.status = val ? 'API Token Active ✓' : 'Not Connected';
            saveReaderMeta();
            renderCloudProvidersConfigA6();
            modal.classList.add('hidden');
            showToast("☁️ Cloud credentials saved!");
        };
    };

    function renderA9StatsAndCalendar() {
        document.getElementById('stat-books-on-shelf').textContent = readerBooks.length;
        document.getElementById('stat-books-completed').textContent = readerBooks.filter(b => (b.progressPct || 0) >= 100).length;
        let totMins = 0;
        Object.values(readerReadingLog).forEach(d => { totMins += (d.totalMins || 0); });
        document.getElementById('stat-total-reading-hours').textContent = `${(totMins / 60).toFixed(1)}h`;
        document.getElementById('stat-6m-reading-hours').textContent = `${(totMins / 60).toFixed(1)}h`;

        const now = new Date();
        document.getElementById('a9-live-clock-display').textContent = now.toLocaleTimeString();
        document.getElementById('a9-live-date-display').textContent = formatDDMMYYYY(getLocalTodayString(now));

        const barsEl = document.getElementById('a9-6month-bars');
        if (barsEl) {
            const mBuckets = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                let mMins = 0;
                Object.entries(readerReadingLog).forEach(([k, v]) => { if (k.startsWith(ym)) mMins += (v.totalMins || 0); });
                mBuckets.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), hrs: +(mMins / 60).toFixed(1) });
            }
            const maxH = Math.max(2, ...mBuckets.map(x => x.hrs));
            barsEl.innerHTML = mBuckets.map(b => `
                <div class="flex flex-col items-center justify-end h-full gap-1">
                    <span class="text-[9px] font-mono text-amber-300 font-bold">${b.hrs}h</span>
                    <div class="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg" style="height:${Math.max(8, Math.round((b.hrs / maxH) * 100))}%"></div>
                    <span class="text-[9px] font-bold text-slate-400">${b.label}</span>
                </div>
            `).join('');
        }

        const calGrid = document.getElementById('a9-calendar-days-grid');
        const calTitle = document.getElementById('cal-month-title');
        if (calGrid && calTitle) {
            const y = a9CalendarCursor.getFullYear(), m = a9CalendarCursor.getMonth();
            calTitle.textContent = a9CalendarCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const firstDay = new Date(y, m, 1).getDay();
            const daysInM = new Date(y, m + 1, 0).getDate();
            let html = '';
            for (let i = 0; i < firstDay; i++) html += `<div></div>`;
            for (let d = 1; d <= daysInM; d++) {
                const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const mins = readerReadingLog[iso]?.totalMins || 0;
                html += `<div class="p-1.5 rounded-lg text-[10px] font-mono ${mins > 0 ? 'bg-emerald-600 text-white font-extrabold' : 'bg-slate-900 text-slate-400'}" title="${mins} mins read">${d}</div>`;
            }
            calGrid.innerHTML = html;
        }
    }

    document.getElementById('cal-prev-month-btn')?.addEventListener('click', () => {
        a9CalendarCursor.setMonth(a9CalendarCursor.getMonth() - 1);
        renderA9StatsAndCalendar();
    });
    document.getElementById('cal-next-month-btn')?.addEventListener('click', () => {
        a9CalendarCursor.setMonth(a9CalendarCursor.getMonth() + 1);
        renderA9StatsAndCalendar();
    });

    function renderA10StorageExplorer() {
        const grid = document.getElementById('a10-storage-folders-grid');
        const list = document.getElementById('a10-selected-source-books');
        if (!grid || !list) return;
        grid.innerHTML = Object.entries(readerSettings.clouds || {}).map(([k, cl]) => {
            const cnt = readerBooks.filter(b => (b.sources || []).includes(k)).length;
            const act = activeA10Source === k;
            return `
                <div onclick="window.selectA10StorageSource('${k}')" class="bg-slate-950 hover:bg-slate-900 border ${act ? 'border-cyan-400' : 'border-slate-800'} rounded-2xl p-3 flex items-center justify-between cursor-pointer">
                    <span class="text-xs font-bold text-white">${cl.icon} ${escapeHtml(cl.name)}</span>
                    <span class="text-xs font-mono font-extrabold text-cyan-400">${cnt}</span>
                </div>
            `;
        }).join('');

        const sourceBooks = readerBooks.filter(b => activeA10Source === 'local' || (b.sources || []).includes(activeA10Source));
        list.innerHTML = sourceBooks.length ? sourceBooks.map(b => `
            <div class="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-xs font-bold text-white truncate">${escapeHtml(b.title)}</p>
                    <span class="text-[10px] font-mono text-slate-400">${escapeHtml(b.shelfName)} • p.${b.currentPage}/${b.totalPages} ${b.isOffloadedZeroStorage ? '• ☁️ 0MB Offloaded' : ''}</span>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button type="button" onclick="window.uploadBookBinaryToWirelessCloud('${escapeJsStr(b.id)}')" class="bg-blue-600/25 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold">☁️ Sync Index</button>
                    <button type="button" onclick="window.offloadBookBinaryToSaveLocalSpace('${escapeJsStr(b.id)}')" class="bg-amber-600/25 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold">🧹 0MB Offload</button>
                </div>
            </div>
        `).join('') : `<p class="text-xs text-slate-400 italic text-center p-4">No books linked to this storage source yet.</p>`;
    }

    window.selectA10StorageSource = function(src) {
        activeA10Source = src;
        renderA10StorageExplorer();
    };

    document.getElementById('reader-export-backup-btn')?.addEventListener('click', () => {
        const dump = { readerBooks, customShelves, readerReadingLog, readerSettings };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }));
        a.download = `PomoReader_Backup_${getLocalTodayString()}.json`;
        a.click();
    });
    document.getElementById('reader-import-backup-btn')?.addEventListener('click', () => {
        document.getElementById('reader-restore-json-input')?.click();
    });
    document.getElementById('reader-restore-json-input')?.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const parsed = JSON.parse(r.result);
                if (Array.isArray(parsed.readerBooks)) window.readerBooks = parsed.readerBooks;
                if (Array.isArray(parsed.customShelves)) window.customShelves = parsed.customShelves;
                if (parsed.readerReadingLog) window.readerReadingLog = parsed.readerReadingLog;
                if (parsed.readerSettings) window.readerSettings = parsed.readerSettings;
                saveReaderMeta();
                renderCustomShelvesBar();
                renderWoodenShelf();
                showToast("✅ Reader Library Backup Restored!");
            } catch (err) { showToast("Invalid Reader JSON file", true); }
        };
        r.readAsText(f);
    });

    PomoEventBus.on('reader:openedTab', () => { renderCustomShelvesBar(); renderWoodenShelf(); updateMainFolderUI(); });
    PomoEventBus.on('hud:rendered', () => { mountHomeContinueReadingWidget(); updateHomeContinueReadingWidget(); });

    setTimeout(() => {
        mountHomeContinueReadingWidget();
        hydrateBookCoversAndHandles();
        setupWirelessReaderCloudSync();
    }, 120);
})();
// ✅ END OF FILE (04-reader-pro.js v17.2 Full Master Restoration) — 100% RESTORED & UNCUT
