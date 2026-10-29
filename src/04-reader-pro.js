/* =========================================================================
   04-READER-PRO.JS (v17.2 UNIFIED SINGLE-FILE EDITION — SEGMENT 1 OF 2)
   PASTE SEGMENT 2 DIRECTLY BELOW THIS SEGMENT IN THE SAME 04-READER-PRO.JS FILE!
   INCLUDES: STATE, HARDWARE SCALER, STUDIO BRIDGE, REAL PDFLIB BAKING,
   MULTI-CLOUD SYNC (TG TDLIB / GDRIVE / DROPBOX), CRDT SYNC, MINI-PIP,
   MULTI-BOOK IMPORT (PDF/EPUB/DOCX/MD/TXT), MAIN FOLDER SCANNER, CUSTOM SHELVES,
   CARD SIZE SCALER, COVER REBUILDER, 3D WOODEN BOOKSHELF & 3-CORNER MODAL
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

    // Shared Module-Scope Variables (Directly accessible across Segment 1 & Segment 2!)
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
    let shelfCardMaxHeight = parseInt(safeGet('pages_pomodoro_shelf_card_h_v1', '245')) || 245;
    document.documentElement.style.setProperty('--shelf-card-max-h', `${shelfCardMaxHeight}px`);

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
    let teleprompterTimer = null;
    let teleprompterSpeed = 1.2;
    let splitSecondPdfDoc = null;
    let splitSecondPageNum = 1;
    let diagramSnipModeActive = false;
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    const studioBroadcastChan = ('BroadcastChannel' in window) ? new BroadcastChannel('pomo_studio_bridge_v1') : null;

    // Expose Clean Hooks for 05-pomodoc-forge.js & 06-onenote-studio.js
    window.getActiveReaderBook = () => activeReaderBook;
    window.getActivePdfDoc = () => activePdfDoc;
    window.getRenderedCanvasPages = () => renderedCanvasPages;
    window.getPageTextItemsCache = () => pageTextItemsCache;
    window.getActiveExtractedPages = () => activeExtractedPages;
    window.getActiveStructuredPages = () => activeStructuredPages;
    window.getReaderSelectionMode = () => readerSelectionMode;
    window.getOcclusionModeActive = () => occlusionModeActive;
    window.getBionicReadingActive = () => bionicReadingActive;
    window.getReaderZoom = () => readerZoom;

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

    let pipVideoEl = null, pipCanvasEl = null, pipRenderInterval = null;
    window.launchPipMiniCockpitWidget = async function() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                clearInterval(pipRenderInterval);
                return;
            }
            if (!pipCanvasEl) {
                pipCanvasEl = document.createElement('canvas');
                pipCanvasEl.width = 420; pipCanvasEl.height = 220;
                pipVideoEl = document.createElement('video');
                pipVideoEl.muted = true; pipVideoEl.playsInline = true;
                pipVideoEl.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;';
                document.body.appendChild(pipVideoEl);
            }
            const drawPipFrame = () => {
                const ctx = pipCanvasEl.getContext('2d');
                ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, 420, 220);
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 412, 212);
                ctx.fillStyle = '#60a5fa'; ctx.font = 'bold 14px Inter, sans-serif';
                ctx.fillText(`⚡ DEENTIMER PRO  •  ${document.getElementById('current-phase-display')?.textContent || 'READY'}`, 20, 32);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px monospace';
                ctx.fillText(document.getElementById('time-display')?.textContent || '00:00', 20, 108);
                ctx.fillStyle = '#34d399'; ctx.font = 'bold 15px monospace';
                ctx.fillText(`🧠 Study: ${document.getElementById('hud-study-hours-text')?.textContent || '0.0h'}   🕋 Salah: ${document.getElementById('salah-score-badge')?.textContent || '0/5'}`, 20, 152);
            };
            drawPipFrame();
            clearInterval(pipRenderInterval);
            pipRenderInterval = setInterval(drawPipFrame, 800);
            if (!pipVideoEl.srcObject) pipVideoEl.srcObject = pipCanvasEl.captureStream(10);
            await pipVideoEl.play();
            await pipVideoEl.requestPictureInPicture();
        } catch (e) { showToast("PiP Widget requires Desktop Browser.", true); }
    };

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
       4. CUSTOM SHELVES BAR, CARD CONTROLS, 3D WOODEN SHELF & 3-CORNER MODAL
       ========================================================================= */
    document.getElementById('v5-shelf-size-down')?.addEventListener('click', () => {
        shelfCardMaxHeight = Math.max(165, shelfCardMaxHeight - 20);
        safeSet('pages_pomodoro_shelf_card_h_v1', String(shelfCardMaxHeight));
        document.documentElement.style.setProperty('--shelf-card-max-h', `${shelfCardMaxHeight}px`);
    });
    document.getElementById('v5-shelf-size-up')?.addEventListener('click', () => {
        shelfCardMaxHeight = Math.min(340, shelfCardMaxHeight + 20);
        safeSet('pages_pomodoro_shelf_card_h_v1', String(shelfCardMaxHeight));
        document.documentElement.style.setProperty('--shelf-card-max-h', `${shelfCardMaxHeight}px`);
    });
    document.getElementById('v5-shelf-cols-sel')?.addEventListener('change', (e) => {
        window.setShelfBooksPerRow(e.target.value);
    });
    document.getElementById('v5-rebuild-covers-btn')?.addEventListener('click', async () => {
        showToast("🔄 Scanning shelf & extracting Page-1 covers...");
        let fixed = 0;
        for (const b of readerBooks) {
            if (!coverMemoryCache[b.id] && b.format === 'pdf') {
                const stored = await idbGet('bookFiles', b.id);
                if (stored?.originalBytes) {
                    const meta = await generatePdfCoverAndMeta(stored.originalBytes);
                    if (meta.coverDataUrl) {
                        coverMemoryCache[b.id] = meta.coverDataUrl;
                        await idbPut('bookCovers', { id: b.id, coverDataUrl: meta.coverDataUrl });
                        fixed++;
                    }
                }
            }
        }
        renderWoodenShelf();
        showToast(`✅ Rebuilt ${fixed} book cover(s)!`);
    });

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
        const topSel = document.getElementById('v5-shelf-cols-sel');
        if (topSel) topSel.value = val;
        saveReaderMeta();
        renderCustomShelvesBar();
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
/* === PASTE SEGMENT 2 OF 04-READER-PRO.JS DIRECTLY BELOW THIS LINE! === */
