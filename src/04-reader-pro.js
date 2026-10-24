/* =========================================================================
   04-READER-PRO.JS (v5.1 COMPLETE: ZERO MISSING FUNCTIONS, PAGE ZOOM & SYNC)
   ========================================================================= */
(function() {
    if (!document.getElementById('v5-reader-zoom-fix-css')) {
        const st = document.createElement('style');
        st.id = 'v5-reader-zoom-fix-css';
        st.textContent = `
            #reader-viewport {
                display: block !important;
                overflow: auto !important;
                text-align: center;
                position: relative;
            }
            #reader-pages-stage {
                display: inline-flex !important;
                flex-direction: column;
                align-items: center;
                max-width: none !important;
                width: auto !important;
                min-width: 100%;
                padding: 1rem 1.5rem 5rem 1.5rem !important;
            }
            #reader-viewport.mode-dual #reader-pages-stage {
                display: inline-grid !important;
                grid-template-columns: repeat(2, auto);
                justify-content: center;
                gap: 1.25rem;
            }
        `;
        document.head.appendChild(st);
    }

    /* =========================================================================
       1. READER STATE, CUSTOM GENRES & UNLIMITED APPDATA STORAGE
       ========================================================================= */
    window.readerBooks = JSON.parse(safeGet('pages_pomodoro_reader_books_v1', '[]'));
    window.readerReadingLog = JSON.parse(safeGet('pages_pomodoro_reader_log_v1', '{}'));
    window.customShelves = JSON.parse(safeGet('pages_pomodoro_custom_shelves_v1', 'null')) || [
        { id: 'shelf_study', name: 'Core Academic & Exam Prep', category: 'study' },
        { id: 'shelf_deen', name: 'Quran, Tafseer & Hadith', category: 'deen' },
        { id: 'shelf_life', name: 'Mindset, Skills & Life', category: 'side' }
    ];
    window.readerSettings = JSON.parse(safeGet('pages_pomodoro_reader_cfg_v1', 'null')) || {
        woodStyle: 'walnut',
        sortBy: 'recent',
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
        clouds: {
            local: { name: 'Local Storage / AppData', icon: '💾', connected: true, status: 'Ready (IndexedDB + Disk)' },
            telegram: { name: 'Telegram Cloud', icon: '✈️', connected: false, status: 'Uses Bot Token & Chat ID' },
            gdrive: { name: 'Google Drive', icon: '☁️', connected: false, folderName: '', token: '', status: 'Wireless API / Folder' },
            dropbox: { name: 'Dropbox', icon: '📦', connected: false, folderName: '', token: '', status: 'Wireless API / Folder' },
            onedrive: { name: 'OneDrive', icon: '☁️', connected: false, folderName: '', token: '', status: 'Wireless API / Folder' },
            mega: { name: 'Mega Storage', icon: 'Ⓜ️', connected: false, folderName: '', status: 'Synced Folder' }
        }
    };

    let mainDirectoryHandle = null;
    let cloudDirectoryHandles = {};
    let pendingManualGenreChoice = null;
    let isApplyingRemoteReaderSync = false;
    let readerCloudUnsubscribe = null;
    let readerWirelessSyncTimer = null;

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
        pushNativeAndroidWidgetPayload();
        PomoEventBus.emit('reader:updated', { booksCount: readerBooks.length });
        if (!skipCloudBroadcast && !isApplyingRemoteReaderSync) {
            broadcastReaderLedgerToCloud();
        }
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
            for (const cKey of ['gdrive', 'dropbox', 'onedrive', 'mega']) {
                const cSaved = await idbGet('handles', 'cloud_' + cKey);
                if (cSaved && cSaved.handle) {
                    cloudDirectoryHandles[cKey] = cSaved.handle;
                    readerSettings.clouds[cKey].connected = true;
                    readerSettings.clouds[cKey].folderName = cSaved.name;
                    readerSettings.clouds[cKey].status = `Synced Folder: ${cSaved.name}`;
                }
            }
        } catch (e) {}
        saveReaderMeta(true);
        renderWoodenShelf();
    }

    function updateMainFolderUI() {
        const lbl = document.getElementById('reader-main-folder-label');
        const st = document.getElementById('settings-main-folder-status');
        if (readerSettings.mainFolderName) {
            if (lbl) lbl.textContent = `📂 Main Folder: ${readerSettings.mainFolderName} • Auto-Import ${readerSettings.autoFolderImport ? 'ON' : 'OFF'}`;
            if (st) st.textContent = `Connected Main Folder: "${readerSettings.mainFolderName}" (Respects Manual Genre Locks)`;
        }
        const autoBtn = document.getElementById('toggle-auto-folder-import-btn');
        if (autoBtn) {
            autoBtn.textContent = readerSettings.autoFolderImport ? 'Enabled' : 'Disabled';
            autoBtn.className = readerSettings.autoFolderImport
                ? 'bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl'
                : 'bg-slate-800 text-slate-400 text-xs font-bold px-4 py-1.5 rounded-xl';
        }
    }

    /* =========================================================================
       2. ZERO-CONTRADICTION CRDT WIRELESS BOOK & ANNOTATION SYNC ENGINE
       ========================================================================= */
    function mergeSingleBookCRDT(localBook, remoteBook) {
        if (!localBook) return remoteBook;
        if (!remoteBook) return localBook;

        const mergedDeleted = Array.from(new Set([
            ...(localBook.deletedAnnotationIds || []),
            ...(remoteBook.deletedAnnotationIds || [])
        ]));

        const annMap = new Map();
        (localBook.annotations || []).forEach(a => {
            if (a && a.id && !mergedDeleted.includes(a.id)) annMap.set(a.id, a);
        });
        (remoteBook.annotations || []).forEach(rAnn => {
            if (!rAnn || !rAnn.id || mergedDeleted.includes(rAnn.id)) return;
            const existing = annMap.get(rAnn.id);
            if (!existing) {
                annMap.set(rAnn.id, rAnn);
            } else {
                const rTime = rAnn.updatedAt || rAnn.createdAt || 0;
                const lTime = existing.updatedAt || existing.createdAt || 0;
                if (rTime >= lTime) annMap.set(rAnn.id, rAnn);
            }
        });

        const mergedAnns = Array.from(annMap.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const rMod = remoteBook.lastModified || 0;
        const lMod = localBook.lastModified || 0;
        const newerMeta = rMod > lMod ? remoteBook : localBook;

        let finalShelf = newerMeta.shelfName || localBook.shelfName || 'General Shelf';
        let finalLock = Boolean(localBook.manualGenreLock || remoteBook.manualGenreLock);
        if (remoteBook.manualGenreLock && (!localBook.manualGenreLock || rMod >= lMod)) {
            finalShelf = remoteBook.shelfName;
        } else if (localBook.manualGenreLock) {
            finalShelf = localBook.shelfName;
        }

        const mergedSources = Array.from(new Set([...(localBook.sources || []), ...(remoteBook.sources || [])]));
        const finalPage = rMod > lMod ? (remoteBook.currentPage || localBook.currentPage || 1) : (localBook.currentPage || remoteBook.currentPage || 1);
        const finalTotal = Math.max(1, localBook.totalPages || remoteBook.totalPages || 1);

        return {
            ...localBook,
            ...newerMeta,
            id: localBook.id,
            shelfName: finalShelf,
            manualGenreLock: finalLock,
            totalPages: finalTotal,
            currentPage: finalPage,
            progressPct: Math.min(100, Math.round((finalPage / finalTotal) * 100)),
            readingMins: Math.max(localBook.readingMins || 0, remoteBook.readingMins || 0),
            rev: Math.max(localBook.rev || 1, remoteBook.rev || 1),
            cloudBinaryAvailable: Boolean(localBook.cloudBinaryAvailable || remoteBook.cloudBinaryAvailable),
            dropboxPath: remoteBook.dropboxPath || localBook.dropboxPath || '',
            sources: mergedSources,
            annotations: mergedAnns,
            deletedAnnotationIds: mergedDeleted,
            lastModified: Math.max(lMod, rMod)
        };
    }

    function broadcastReaderLedgerToCloud() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || isApplyingRemoteReaderSync || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        clearTimeout(readerWirelessSyncTimer);
        readerWirelessSyncTimer = setTimeout(async () => {
            try {
                const db = firebase.firestore();
                const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                    .collection('public').doc('data')
                    .collection('sync_rooms').doc(roomId)
                    .collection('reader_pro').doc('ledger');

                const slimBooks = readerBooks.map(b => ({ ...b, coverDataUrl: '' }));
                await ledgerDoc.set({
                    booksJson: JSON.stringify(slimBooks),
                    shelvesJson: JSON.stringify(customShelves),
                    readingLogJson: JSON.stringify(readerReadingLog),
                    updatedAt: Date.now()
                }, { merge: true });
            } catch (e) {}
        }, 450);
    }

    function attachWirelessReaderCloudListener() {
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined' || !firebase.apps?.length) return;
        try {
            if (readerCloudUnsubscribe) readerCloudUnsubscribe();
            const db = firebase.firestore();
            const ledgerDoc = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_pro').doc('ledger');

            readerCloudUnsubscribe = ledgerDoc.onSnapshot((snap) => {
                if (!snap.exists) return;
                const data = snap.data();
                isApplyingRemoteReaderSync = true;
                try {
                    if (data.shelvesJson) {
                        const rShelves = JSON.parse(data.shelvesJson);
                        rShelves.forEach(rs => {
                            if (!customShelves.some(cs => cs.name.toLowerCase() === rs.name.toLowerCase())) {
                                customShelves.push(rs);
                            }
                        });
                    }
                    if (data.readingLogJson) {
                        const rLog = JSON.parse(data.readingLogJson);
                        Object.entries(rLog).forEach(([dateKey, dayVal]) => {
                            if (!readerReadingLog[dateKey]) readerReadingLog[dateKey] = dayVal;
                            else readerReadingLog[dateKey].totalMins = Math.max(readerReadingLog[dateKey].totalMins || 0, dayVal.totalMins || 0);
                        });
                    }
                    if (data.booksJson) {
                        const remoteBooks = JSON.parse(data.booksJson);
                        const bookMap = new Map();
                        readerBooks.forEach(lb => bookMap.set(lb.id, lb));
                        remoteBooks.forEach(rb => {
                            if (!rb || !rb.id) return;
                            const existing = bookMap.get(rb.id);
                            bookMap.set(rb.id, existing ? mergeSingleBookCRDT(existing, rb) : rb);
                        });
                        window.readerBooks = Array.from(bookMap.values());
                    }

                    saveReaderMeta(true);
                    renderWoodenShelf();

                    if (activeReaderBook) {
                        const updatedActive = readerBooks.find(x => x.id === activeReaderBook.id);
                        if (updatedActive) {
                            activeReaderBook = updatedActive;
                            refreshVisiblePageSvgs();
                        }
                    }
                } catch (err) {}
                isApplyingRemoteReaderSync = false;
            });
        } catch (e) {}
    }
    setTimeout(attachWirelessReaderCloudListener, 900);
    document.getElementById('login-sync-btn')?.addEventListener('click', () => setTimeout(attachWirelessReaderCloudListener, 1200));

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i += 8192) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(len, i + 8192)));
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }

    window.uploadBookBinaryToWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) {
            showToast("Book binary is not on this device yet.", true);
            return;
        }
        const bakedBytes = await bakeAnnotationsIntoPdfBytes(b, stored.originalBytes);

        const dbxToken = readerSettings.clouds?.dropbox?.token?.trim();
        if (dbxToken) {
            try {
                showToast(`📦 Uploading "${b.title}" to Dropbox Wireless Cloud...`);
                const dbxPath = `/PomoReader/${b.fileName}`;
                const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${dbxToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'overwrite', autorename: false, mute: true }),
                        'Content-Type': 'application/octet-stream'
                    },
                    body: bakedBytes
                });
                if (res.ok) {
                    b.dropboxPath = dbxPath;
                    b.cloudBinaryAvailable = true;
                    if (!b.sources.includes('dropbox')) b.sources.push('dropbox');
                    b.lastModified = Date.now();
                    saveReaderMeta();
                    showToast(`✅ "${b.title}" synced to Dropbox!`);
                    return;
                }
            } catch (e) {}
        }

        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') {
            showToast("Connect your Cloud Room ID (in Profile -> Cloud) first!", true);
            return;
        }
        if (bakedBytes.byteLength > 15 * 1024 * 1024) {
            showToast("Book > 15MB: Add a free Dropbox Token in 'My Files' for large PDF cloud transfers!", true);
            return;
        }

        try {
            showToast(`☁️ Uploading "${b.title}" to Wireless Cloud Room...`);
            const b64 = arrayBufferToBase64(bakedBytes);
            const chunkSize = 650000;
            const totalChunks = Math.ceil(b64.length / chunkSize);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);

            await binRef.set({ fileName: b.fileName, totalChunks, byteLength: bakedBytes.byteLength, updatedAt: Date.now() });
            for (let c = 0; c < totalChunks; c++) {
                await binRef.collection('chunks').doc(String(c)).set({ idx: c, data: b64.slice(c * chunkSize, (c + 1) * chunkSize) });
            }
            b.cloudBinaryAvailable = true;
            b.lastModified = Date.now();
            saveReaderMeta();
            showToast(`✅ "${b.title}" uploaded to Wireless Room!`);
        } catch (err) {
            showToast("Wireless upload interrupted.", true);
        }
    };

    window.downloadBookBinaryFromWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return null;

        const dbxToken = readerSettings.clouds?.dropbox?.token?.trim();
        if (b.dropboxPath && dbxToken) {
            try {
                showToast(`📲 Downloading "${b.title}" from Dropbox...`);
                const res = await fetch('https://content.dropboxapi.com/2/files/download', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${dbxToken}`,
                        'Dropbox-API-Arg': JSON.stringify({ path: b.dropboxPath })
                    }
                });
                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const pdfMeta = b.format === 'pdf' ? await generatePdfCoverAndMeta(arrayBuffer) : {};
                    if (pdfMeta.coverDataUrl) {
                        coverMemoryCache[b.id] = pdfMeta.coverDataUrl;
                        await idbPut('bookCovers', { id: b.id, coverDataUrl: pdfMeta.coverDataUrl });
                    }
                    const record = { id: b.id, originalBytes: arrayBuffer, bakedBytes: arrayBuffer, extractedPagesText: [] };
                    await idbPut('bookFiles', record);
                    showToast(`✅ "${b.title}" downloaded!`);
                    return record;
                }
            } catch (e) {}
        }

        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') return null;
        try {
            showToast(`📲 Downloading "${b.title}" from Wireless Room...`);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);

            const metaSnap = await binRef.get();
            if (!metaSnap.exists) return null;
            const chunksSnap = await binRef.collection('chunks').get();
            const chunks = [];
            chunksSnap.forEach(doc => chunks.push(doc.data()));
            chunks.sort((a, b) => a.idx - b.idx);
            const arrayBuffer = base64ToArrayBuffer(chunks.map(c => c.data).join(''));

            if (b.format === 'pdf') {
                const pdfMeta = await generatePdfCoverAndMeta(arrayBuffer);
                if (pdfMeta.coverDataUrl) {
                    coverMemoryCache[b.id] = pdfMeta.coverDataUrl;
                    await idbPut('bookCovers', { id: b.id, coverDataUrl: pdfMeta.coverDataUrl });
                }
            }
            const record = { id: b.id, originalBytes: arrayBuffer, bakedBytes: arrayBuffer, extractedPagesText: [] };
            await idbPut('bookFiles', record);
            renderWoodenShelf();
            showToast(`✅ "${b.title}" downloaded wirelessly!`);
            return record;
        } catch (e) { return null; }
    };

    /* =========================================================================
       3. HOME WIDGET, FLOATING PiP MINI-COCKPIT & NATIVE APK WIDGET BRIDGE
       ========================================================================= */
    function mountHomeContinueReadingWidget() {
        const rightCol = document.querySelector('#page-timer .cockpit-right');
        if (!rightCol || document.getElementById('home-reader-widget-card')) return;
        const widget = document.createElement('div');
        widget.id = 'home-reader-widget-card';
        widget.className = "w-full bg-slate-900/90 border border-slate-800/90 p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3";
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
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-2xl">📖</span>
                    <div>
                        <p class="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Reader Pro Widget</p>
                        <p class="text-xs font-bold text-slate-300">No books imported yet — Tap to open Wooden Shelf</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold">🖼️ PiP Widget</button>
                    <button type="button" onclick="switchPage('page-reader')" class="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">Open Shelf</button>
                </div>
            `;
            return;
        }

        const pct = Math.min(100, Math.round(((latest.currentPage || 1) / Math.max(1, latest.totalPages || 1)) * 100));
        widget.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onclick="openBookAtPage('${latest.id}', ${latest.currentPage || 1})">
                <div class="w-9 h-12 rounded-lg bg-slate-950 border border-amber-500/40 shrink-0 bg-cover bg-center flex items-center justify-center text-xs" style="${coverMemoryCache[latest.id] ? `background-image:url('${coverMemoryCache[latest.id]}')` : ''}">
                    ${coverMemoryCache[latest.id] ? '' : '📘'}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-extrabold uppercase tracking-wider text-amber-400">📖 Continue Reading</span>
                        <span class="text-[9px] font-mono text-emerald-400 font-bold">${pct}% • p.${latest.currentPage}/${latest.totalPages}</span>
                    </div>
                    <p class="text-xs font-extrabold text-white truncate">${escapeHtml(latest.title)}</p>
                    <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                        <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-2 rounded-xl text-[10px] font-bold">🖼️ PiP</button>
                <button type="button" onclick="openBookAtPage('${latest.id}', ${latest.currentPage || 1})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow">Resume ➔</button>
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
                const latestBook = readerBooks[0];
                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Inter, sans-serif';
                ctx.fillText(latestBook ? `📖 ${latestBook.title.slice(0, 32)} (p.${latestBook.currentPage}/${latestBook.totalPages})` : '📖 Reader Pro Ready', 20, 188);
            };
            drawPipFrame();
            clearInterval(pipRenderInterval);
            pipRenderInterval = setInterval(drawPipFrame, 800);
            if (!pipVideoEl.srcObject) pipVideoEl.srcObject = pipCanvasEl.captureStream(10);
            await pipVideoEl.play();
            await pipVideoEl.requestPictureInPicture();
        } catch (e) {
            showToast("PiP Widget requires Chrome/Edge desktop or Android PiP permission.", true);
        }
    };

    function pushNativeAndroidWidgetPayload() {
        try {
            const rpg = window.calculateLifetimeRPGStats ? window.calculateLifetimeRPGStats() : { level: 0 };
            const latestBook = readerBooks[0] || null;
            const payload = JSON.stringify({
                timer: document.getElementById('time-display')?.textContent || '00:00',
                studyHours: (getTodayStudyMinutes() / 60).toFixed(1),
                deenHours: (getTodayDeenMinutes() / 60).toFixed(1),
                salahScore: `${getTodaySalahDoneCount()}/5`,
                rpgLevel: rpg.level,
                activeBookTitle: latestBook ? latestBook.title : 'No Active Book',
                activeBookPage: latestBook ? `${latestBook.currentPage}/${latestBook.totalPages}` : '0/0',
                updatedAt: Date.now()
            });
            localStorage.setItem('pages_pomodoro_android_widget_payload', payload);
            if (window.AndroidBridge && typeof window.AndroidBridge.updateHomeWidgets === 'function') {
                window.AndroidBridge.updateHomeWidgets(payload);
            }
        } catch (e) {}
    }

    /* =========================================================================
       4. MANUAL-PRIORITY VS. AUTO BOOK IMPORT ENGINE (A3, A4, A5)
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

    async function generatePdfCoverAndMeta(arrayBuffer) {
        const info = { totalPages: 1, author: '', creator: '', producer: '', coverDataUrl: '', outline: [] };
        if (typeof pdfjsLib === 'undefined') return info;
        try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            info.totalPages = pdf.numPages || 1;
            try {
                const meta = await pdf.getMetadata();
                if (meta?.info) {
                    info.author = meta.info.Author || '';
                    info.creator = meta.info.Creator || '';
                    info.producer = meta.info.Producer || '';
                }
            } catch (e) {}
            try {
                const outline = await pdf.getOutline();
                if (Array.isArray(outline)) {
                    info.outline = outline.slice(0, 80).map((o, idx) => ({ title: o.title || `Section ${idx + 1}`, page: idx + 1 }));
                }
            } catch (e) {}
            const page = await pdf.getPage(1);
            const vp = page.getViewport({ scale: 0.45 });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            info.coverDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        } catch (e) {}
        return info;
    }

    function openManualImportPriorityModal() {
        const sel = document.getElementById('v45-import-genre-select');
        const newInp = document.getElementById('v45-import-new-genre-inp');
        if (!sel) { document.getElementById('reader-book-file-input').click(); return; }
        if (newInp) newInp.value = '';
        sel.innerHTML = customShelves.map(sh => `<option value="${escapeHtml(sh.name)}" data-cat="${sh.category}">🪵 ${escapeHtml(sh.name)} (${sh.category.toUpperCase()})</option>`).join('');
        document.getElementById('v45-manual-import-modal').classList.remove('hidden');
    }

    document.getElementById('v45-close-manual-import')?.addEventListener('click', () => document.getElementById('v45-manual-import-modal').classList.add('hidden'));
    document.getElementById('v45-proceed-file-pick-btn')?.addEventListener('click', () => {
        const newGenreName = (document.getElementById('v45-import-new-genre-inp')?.value || '').trim();
        const catVal = document.getElementById('v45-import-cat-select')?.value || 'study';
        const existingSel = document.getElementById('v45-import-genre-select');
        let chosenShelf = existingSel?.value || (customShelves[0]?.name || 'General Shelf');
        let chosenCat = existingSel?.selectedOptions?.[0]?.getAttribute('data-cat') || catVal;

        if (newGenreName) {
            chosenShelf = newGenreName;
            chosenCat = catVal;
            if (!customShelves.some(s => s.name.toLowerCase() === newGenreName.toLowerCase())) {
                customShelves.push({ id: 'sh_' + Date.now(), name: newGenreName, category: chosenCat });
                saveReaderMeta();
            }
        }
        pendingManualGenreChoice = { shelfName: chosenShelf, category: chosenCat, isManual: true };
        document.getElementById('v45-manual-import-modal').classList.add('hidden');
        document.getElementById('reader-book-file-input').click();
    });

    async function importBookFileObject(file, sourceTag = 'local', fileHandle = null, manualChoice = null) {
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
            await idbPut('bookFiles', { id: existing.id, originalBytes: arrayBuffer, bakedBytes: arrayBuffer, extractedPagesText: [] });
            if (fileHandle) await idbPut('handles', { key: 'file_' + existing.id, handle: fileHandle });
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
        } else if (['txt', 'md', 'html', 'htm'].includes(ext)) {
            const text = new TextDecoder('utf-8').decode(arrayBuffer);
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i += 42) extractedPagesText.push(lines.slice(i, i + 42).join('\n'));
            if (!extractedPagesText.length) extractedPagesText.push(text || 'Empty file');
            totalPages = extractedPagesText.length;
        } else if (['epub', 'docx'].includes(ext) && typeof JSZip !== 'undefined') {
            try {
                const zip = await JSZip.loadAsync(arrayBuffer);
                const fNames = Object.keys(zip.files).filter(n => /\.(xhtml|html|xml)$/i.test(n));
                for (const fn of fNames.slice(0, 60)) {
                    const raw = await zip.files[fn].async('string');
                    const stripped = raw.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    if (stripped.length > 80) {
                        for (let c = 0; c < stripped.length; c += 1800) extractedPagesText.push(stripped.slice(c, c + 1800));
                    }
                }
            } catch (e) {}
            if (!extractedPagesText.length) extractedPagesText.push(`Loaded ${file.name}`);
            totalPages = extractedPagesText.length;
        }

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        const isDeenGuess = /quran|tafseer|hadith|seerah|fiqh|islam|deen|salah|dua|ummah|kathir|bidaya/i.test(cleanTitle);
        const finalShelfName = (manualChoice && manualChoice.shelfName) ? manualChoice.shelfName : (isDeenGuess ? 'Quran, Tafseer & Hadith' : (customShelves[0]?.name || 'Core Academic & Exam Prep'));
        const finalCategory = (manualChoice && manualChoice.category) ? manualChoice.category : (isDeenGuess ? 'deen' : 'study');

        const newBook = {
            id: bookId, title: cleanTitle, author,
            description: `Imported from ${sourceTag.toUpperCase()} (${(file.size / 1048576).toFixed(2)} MB)`,
            fileName: file.name, format: ext, fileSize: file.size,
            totalPages, currentPage: 1, progressPct: Math.min(100, Math.round((1 / Math.max(1, totalPages)) * 100)),
            category: finalCategory, shelfName: finalShelfName,
            manualGenreLock: Boolean(manualChoice && manualChoice.isManual),
            favorite: false, rating: 5, creator, producer,
            locationPath: readerSettings.mainFolderName ? `${readerSettings.mainFolderName}/${file.name}` : `${sourceTag.toUpperCase()}://${file.name}`,
            sources: [sourceTag], coverDataUrl, readingMins: 0, dailyTargetMins: 30,
            remindOnTarget: true, openMode: 'last', autoSync: true, manualSyncOnly: false,
            pendingCloudSync: false, cloudBinaryAvailable: false,
            rev: 1, lastModified: Date.now(), lastOpened: Date.now(),
            outline, annotations: [], deletedAnnotationIds: []
        };

        await idbPut('bookFiles', { id: bookId, originalBytes: arrayBuffer, bakedBytes: arrayBuffer, extractedPagesText });
        if (coverDataUrl) {
            coverMemoryCache[bookId] = coverDataUrl;
            await idbPut('bookCovers', { id: bookId, coverDataUrl });
        }
        if (fileHandle) await idbPut('handles', { key: 'file_' + bookId, handle: fileHandle });

        readerBooks.unshift(newBook);
        saveReaderMeta();
        return newBook;
    }

    window.handleMultipleBookImport = async function(fileList, sourceTag = 'local', manualChoice = null) {
        if (!fileList || !fileList.length) return;
        const choiceToUse = manualChoice || pendingManualGenreChoice;
        pendingManualGenreChoice = null;
        showToast(`📥 Importing ${fileList.length} book(s)...`);
        let count = 0;
        for (const f of Array.from(fileList)) {
            const added = await importBookFileObject(f, sourceTag, null, choiceToUse);
            if (added) count++;
        }
        renderWoodenShelf();
        renderA9StatsAndClock();
        renderA10MyFiles();
        showToast(`✅ ${count} book(s) ready!`);
    };

    document.getElementById('shelf-quick-import-btn')?.addEventListener('click', openManualImportPriorityModal);
    document.getElementById('settings-import-books-btn')?.addEventListener('click', openManualImportPriorityModal);
    document.getElementById('reader-book-file-input')?.addEventListener('change', (e) => {
        handleMultipleBookImport(e.target.files, 'local', pendingManualGenreChoice);
        e.target.value = '';
    });

    async function pickAndScanMainFolder() {
        if (window.showDirectoryPicker) {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                mainDirectoryHandle = dirHandle;
                readerSettings.mainFolderName = dirHandle.name;
                await idbPut('handles', { key: 'mainFolder', handle: dirHandle, name: dirHandle.name });
                saveReaderMeta();
                updateMainFolderUI();
                await scanDirectoryForBooks(dirHandle, 'local');
                return;
            } catch (e) { if (e.name === 'AbortError') return; }
        }
        document.getElementById('reader-folder-fallback-input').click();
    }

    async function scanDirectoryForBooks(dirHandle, sourceTag = 'local') {
        if (!dirHandle) return;
        try {
            const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') {
                const req = await dirHandle.requestPermission({ mode: 'readwrite' });
                if (req !== 'granted') return;
            }
            let imported = 0;
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const ext = (entry.name.split('.').pop() || '').toLowerCase();
                    if (['pdf', 'epub', 'txt', 'md', 'docx', 'html'].includes(ext)) {
                        const file = await entry.getFile();
                        const prevLen = readerBooks.length;
                        await importBookFileObject(file, sourceTag, entry, null);
                        if (readerBooks.length > prevLen) imported++;
                    }
                }
            }
            renderWoodenShelf();
            renderA10MyFiles();
            showToast(imported > 0 ? `📂 Auto-Imported ${imported} new book(s)` : `📂 Folder "${dirHandle.name}" is up to date.`);
        } catch (e) { showToast("Click 'Scan Now' to grant folder read access.", true); }
    }

    document.getElementById('shelf-scan-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-select-main-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-rescan-main-folder-btn')?.addEventListener('click', () => {
        if (mainDirectoryHandle) scanDirectoryForBooks(mainDirectoryHandle, 'local');
        else pickAndScanMainFolder();
    });
    document.getElementById('reader-folder-fallback-input')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleMultipleBookImport(e.target.files, 'local', null);
    });
    document.getElementById('toggle-auto-folder-import-btn')?.addEventListener('click', () => {
        readerSettings.autoFolderImport = !readerSettings.autoFolderImport;
        saveReaderMeta();
        updateMainFolderUI();
    });

    /* =========================================================================
       5. 3D WOODEN BOOKSHELF & CUSTOM GENRE MANAGER
       ========================================================================= */
    let activeShelfFilter = 'all';
    let activeCustomShelfFilter = 'all';
    let shelfDisplayLayout = 'sections';
    let activeCornerBookId = null;

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

    function renderCustomShelvesBar() {
        const bar = document.getElementById('custom-shelves-bar');
        if (!bar) return;

        const pills = customShelves.map(sh => {
            const cnt = readerBooks.filter(b => b.shelfName === sh.name).length;
            const act = activeCustomShelfFilter === sh.name;
            return `
                <div class="inline-flex items-center rounded-xl overflow-hidden border ${act ? 'bg-amber-600 border-amber-400 text-white shadow' : 'bg-slate-950 border-slate-800 text-amber-200/90'}">
                    <button type="button" onclick="window.selectCustomShelfFilter('${escapeHtml(sh.name)}')" class="px-2.5 py-1.5 text-xs font-bold whitespace-nowrap flex items-center gap-1.5">
                        <span>🪵 ${escapeHtml(sh.name)}</span>
                        <span class="text-[10px] font-mono px-1.5 rounded-full bg-black/30">${cnt}</span>
                    </button>
                    <button type="button" onclick="event.stopPropagation(); window.deleteGenreShelfByName('${escapeHtml(sh.name)}')" class="px-1.5 py-1.5 text-[10px] hover:bg-red-600 hover:text-white transition-all" title="Delete this Genre Shelf">✕</button>
                </div>
            `;
        }).join('');

        bar.innerHTML = `
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
                <button type="button" onclick="window.toggleShelfLayoutMode()" class="px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap border ${shelfDisplayLayout === 'sections' && activeCustomShelfFilter === 'all' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-950 text-slate-300 border-slate-800'}">🏛️ ${shelfDisplayLayout === 'sections' ? 'Genre Sections' : 'Flat Grid'}</button>
                <button type="button" onclick="window.selectCustomShelfFilter('all')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${activeCustomShelfFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'}">All (${readerBooks.length})</button>
                ${pills}
            </div>
            <button type="button" onclick="window.openManageShelvesModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shrink-0">➕ Manage Genres / Shelves</button>
        `;
    }

    window.selectCustomShelfFilter = function(name) { activeCustomShelfFilter = name; renderWoodenShelf(); };
    window.toggleShelfLayoutMode = function() { shelfDisplayLayout = shelfDisplayLayout === 'sections' ? 'grid' : 'sections'; activeCustomShelfFilter = 'all'; renderWoodenShelf(); };

    window.deleteGenreShelfByName = function(genreName) {
        window.customShelves = customShelves.filter(s => s.name !== genreName);
        readerBooks.forEach(b => { if (b.shelfName === genreName) b.shelfName = customShelves[0]?.name || 'General Shelf'; });
        if (activeCustomShelfFilter === genreName) activeCustomShelfFilter = 'all';
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`🗑️ Genre "${genreName}" deleted`);
    };

    window.addBookDirectlyToGenre = function(genreName, cat = 'study') {
        pendingManualGenreChoice = { shelfName: genreName, category: cat, isManual: true };
        document.getElementById('reader-book-file-input').click();
    };

    window.renderWoodenShelf = function() {
        applyWoodThemeStyle();
        renderCustomShelvesBar();
        const rowsContainer = document.getElementById('wooden-bookshelf-rows');
        if (!rowsContainer) return;

        document.getElementById('shelf-count-all').textContent = readerBooks.length;
        document.getElementById('shelf-count-fav').textContent = readerBooks.filter(b => b.favorite).length;

        const searchQ = (document.getElementById('shelf-search-input')?.value || '').trim().toLowerCase();
        const sortMode = document.getElementById('shelf-sort-select')?.value || readerSettings.sortBy || 'recent';

        let filtered = readerBooks.filter(b => {
            if (activeShelfFilter === 'fav' && !b.favorite) return false;
            if (activeShelfFilter === 'study' && b.category !== 'study') return false;
            if (activeShelfFilter === 'deen' && b.category !== 'deen') return false;
            if (activeShelfFilter === 'reading' && ((b.progressPct || 0) <= 0 || (b.progressPct || 0) >= 100)) return false;
            if (activeShelfFilter === 'completed' && (b.progressPct || 0) < 100) return false;
            if (activeCustomShelfFilter !== 'all' && (b.shelfName || 'General Shelf') !== activeCustomShelfFilter) return false;
            if (searchQ) {
                const hay = `${b.title} ${b.author} ${b.description} ${b.fileName} ${b.shelfName || 'General Shelf'}`.toLowerCase();
                if (!hay.includes(searchQ)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            if (sortMode === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortMode === 'author') return (a.author || '').localeCompare(b.author || '');
            if (sortMode === 'storage') return ((a.sources && a.sources[0]) || '').localeCompare((b.sources && b.sources[0]) || '');
            if (sortMode === 'progress') return (b.progressPct || 0) - (a.progressPct || 0);
            return (b.lastOpened || 0) - (a.lastOpened || 0);
        });

        rowsContainer.innerHTML = '';
        if (!filtered.length) {
            rowsContainer.innerHTML = `<div class="wood-shelf-row py-12 text-center flex flex-col items-center justify-center gap-2"><span class="text-4xl">📚</span><p class="text-sm font-bold text-amber-200">No books in this genre view yet.</p><p class="text-xs text-amber-100/60">Click "➕ Import Books" above to add books!</p></div>`;
            return;
        }

        if ((shelfDisplayLayout === 'sections' && activeCustomShelfFilter === 'all') || searchQ) {
            const groups = {};
            filtered.forEach(b => {
                const s = b.shelfName || 'General Shelf';
                if (!groups[s]) groups[s] = [];
                groups[s].push(b);
            });
            Object.entries(groups).forEach(([shelfName, gBooks]) => {
                const sec = document.createElement('div');
                sec.className = "mb-4";
                sec.innerHTML = `
                    <div class="shelf-genre-header">
                        <div class="flex items-center gap-2">
                            <span>🏷️</span>
                            <span class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-200">${escapeHtml(shelfName)}</span>
                            <span class="text-[10px] font-mono font-bold bg-black/40 text-amber-300 px-2 py-0.5 rounded-full">${gBooks.length}</span>
                        </div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <button type="button" onclick="window.addBookDirectlyToGenre('${escapeHtml(shelfName)}')" class="bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">➕ Add Book Here</button>
                            <button type="button" onclick="window.syncShelfToTodo('${escapeHtml(shelfName)}')" class="bg-blue-950/90 hover:bg-blue-800 text-blue-200 border border-blue-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">☑️ To-Do</button>
                            <button type="button" onclick="window.startBookFocusSession('${gBooks[0].id}')" class="bg-emerald-950/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">⏱️ Focus</button>
                            <button type="button" onclick="window.deleteGenreShelfByName('${escapeHtml(shelfName)}')" class="bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white border border-red-600/40 text-[10px] font-bold px-2 py-1 rounded-lg">🗑️</button>
                        </div>
                    </div>
                `;
                rowsContainer.appendChild(sec);
                renderPlankCards(sec, gBooks);
            });
        } else {
            renderPlankCards(rowsContainer, filtered);
        }
    };

    function renderPlankCards(parentEl, list) {
        const perRow = window.innerWidth >= 900 ? 4 : (window.innerWidth >= 640 ? 3 : 2);
        for (let i = 0; i < list.length; i += perRow) {
            const slice = list.slice(i, i + perRow);
            const rowEl = document.createElement('div');
            rowEl.className = "wood-shelf-row grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 px-2 pt-2";
            slice.forEach(book => {
                const curP = Math.max(1, book.currentPage || 1);
                const totP = Math.max(1, book.totalPages || 1);
                const pct = Math.min(100, Math.round((curP / totP) * 100));
                const catBadge = book.category === 'deen' ? '🕌' : (book.category === 'study' ? '🧠' : '🚀');
                const coverUrl = coverMemoryCache[book.id] || book.coverDataUrl || '';
                const card = document.createElement('div');
                card.className = "book-card-3d group";
                if (coverUrl) {
                    card.style.backgroundImage = `linear-gradient(180deg, rgba(2,6,23,0.28) 0%, rgba(2,6,23,0.95) 82%), url('${coverUrl}')`;
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                }
                card.onclick = () => openBookInReader(book.id);
                card.innerHTML = `
                    <button class="book-corner-menu-btn" title="Book Details, Cover & Genre" onclick="event.stopPropagation(); window.openBookCornerModal('${book.id}')">⋮</button>
                    <div class="p-2.5 flex flex-col gap-1">
                        <div class="flex items-center gap-1 flex-wrap pr-7">
                            <span class="bg-slate-950/90 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-slate-700 text-white">${catBadge} ${(book.format || 'pdf').toUpperCase()}</span>
                            ${book.cloudBinaryAvailable ? '<span class="bg-cyan-950/90 text-cyan-300 border border-cyan-600/40 text-[8px] font-bold px-1 rounded">☁️ Wireless</span>' : ''}
                            ${book.favorite ? '<span class="text-xs">❤️</span>' : ''}
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window.openAssignShelfModal('${book.id}')" class="bg-amber-950/90 hover:bg-amber-700 text-amber-300 hover:text-white border border-amber-500/50 text-[9px] font-extrabold px-2 py-0.5 rounded-md w-fit max-w-full truncate flex items-center gap-1">
                            <span>🪵 ${escapeHtml(book.shelfName || 'General Shelf')}</span> <span>⇄</span>
                        </button>
                    </div>
                    <div class="p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-1">
                        <h4 class="text-xs font-extrabold text-white line-clamp-2 leading-snug">${escapeHtml(book.title)}</h4>
                        <p class="text-[10px] text-slate-300 truncate">${escapeHtml(book.author || 'Unknown Author')}</p>
                        <div class="flex items-center justify-between text-[10px] font-mono mt-0.5">
                            <span class="text-emerald-400 font-bold">${pct}%</span>
                            <span class="text-slate-400">p.${curP}/${totP}</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style="width: ${pct}%"></div>
                        </div>
                        <div class="flex items-center gap-1 mt-1.5 pt-1 border-t border-slate-800/80">
                            <button type="button" onclick="event.stopPropagation(); window.startBookFocusSession('${book.id}')" class="flex-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[9px] font-bold py-1 rounded">⏱️ Focus</button>
                            <button type="button" onclick="event.stopPropagation(); window.uploadBookBinaryToWirelessCloud('${book.id}')" class="flex-1 bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-[9px] font-bold py-1 rounded">☁️ Push</button>
                        </div>
                    </div>
                `;
                rowEl.appendChild(card);
            });
            parentEl.appendChild(rowEl);
        }
    }

    document.querySelectorAll('.shelf-filter-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeShelfFilter = e.currentTarget.getAttribute('data-filter');
            document.querySelectorAll('.shelf-filter-tab').forEach(b => {
                b.className = "shelf-filter-tab bg-slate-950 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl";
            });
            e.currentTarget.className = "shelf-filter-tab bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow";
            renderWoodenShelf();
        });
    });
    document.getElementById('shelf-search-input')?.addEventListener('input', renderWoodenShelf);
    document.getElementById('shelf-sort-select')?.addEventListener('change', (e) => {
        readerSettings.sortBy = e.target.value;
        saveReaderMeta();
        renderWoodenShelf();
    });

    window.openManageShelvesModal = function() {
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        titleEl.textContent = "🪵 Create, Rename or Delete Genres / Shelves";
        bodyEl.innerHTML = `
            <div class="flex gap-2">
                <input type="text" id="new-shelf-inp" placeholder="New Genre / Shelf Name..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <select id="new-shelf-cat" class="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-bold">
                    <option value="study">🧠 Study</option><option value="deen">🕌 Deen</option><option value="side">🚀 Life</option>
                </select>
                <button type="button" id="create-shelf-btn" class="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs">＋ Create</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-60 native-scroll mt-2">
                ${customShelves.map((sh, i) => `
                    <div class="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                        <div>
                            <span class="text-xs font-bold text-amber-300">🪵 ${escapeHtml(sh.name)}</span>
                            <span class="text-[10px] text-slate-500 ml-1">(${readerBooks.filter(b => b.shelfName === sh.name).length} books)</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="document.getElementById('reader-suboptions-modal').classList.add('hidden'); window.addBookDirectlyToGenre('${escapeHtml(sh.name)}', '${sh.category}')" class="text-[10px] bg-blue-950 text-blue-300 border border-blue-700/50 px-2 py-1 rounded font-bold">➕ Add Book</button>
                            <button type="button" onclick="window.deleteCustomShelf(${i})" class="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded bg-slate-900 border border-slate-800">🗑️ Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('create-shelf-btn').onclick = () => {
            const name = (document.getElementById('new-shelf-inp').value || '').trim();
            const cat = document.getElementById('new-shelf-cat').value;
            if (name && !customShelves.some(s => s.name.toLowerCase() === name.toLowerCase())) {
                customShelves.push({ id: 'sh_' + Date.now(), name, category: cat });
                saveReaderMeta();
                renderWoodenShelf();
                window.openManageShelvesModal();
            }
        };
    };

    window.deleteCustomShelf = function(idx) {
        const removed = customShelves.splice(idx, 1)[0];
        if (removed) {
            readerBooks.forEach(b => { if (b.shelfName === removed.name) b.shelfName = customShelves[0]?.name || 'General Shelf'; });
            if (activeCustomShelfFilter === removed.name) activeCustomShelfFilter = 'all';
        }
        saveReaderMeta();
        renderWoodenShelf();
        window.openManageShelvesModal();
    };

    window.openAssignShelfModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const modal = document.getElementById('reader-suboptions-modal');
        const titleEl = document.getElementById('suboptions-modal-title');
        const bodyEl = document.getElementById('suboptions-modal-body');
        titleEl.textContent = `🪵 Move "${b.title}" to Genre / Shelf`;
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-1.5 max-h-60 native-scroll">
                ${customShelves.map(sh => `
                    <button type="button" onclick="window.assignBookToShelf('${b.id}', '${escapeHtml(sh.name)}', '${sh.category}')" class="w-full p-3 rounded-xl border text-left text-xs font-bold flex justify-between ${b.shelfName === sh.name ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-amber-500/50'}">
                        <span>🪵 ${escapeHtml(sh.name)}</span><span>${b.shelfName === sh.name ? '✓ Current Shelf' : 'Move Here ➔'}</span>
                    </button>
                `).join('')}
            </div>
            <div class="flex gap-2 mt-2 pt-2 border-t border-slate-800">
                <input type="text" id="move-new-genre-inp" placeholder="Or type a new Genre to move into..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <button type="button" id="move-new-genre-btn" class="bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs">＋ Move</button>
            </div>
        `;
        modal.classList.remove('hidden');
        document.getElementById('move-new-genre-btn').onclick = () => {
            const newG = (document.getElementById('move-new-genre-inp').value || '').trim();
            if (newG) {
                if (!customShelves.some(s => s.name.toLowerCase() === newG.toLowerCase())) {
                    customShelves.push({ id: 'sh_' + Date.now(), name: newG, category: b.category || 'study' });
                }
                window.assignBookToShelf(b.id, newG, b.category || 'study');
            }
        };
    };

    window.assignBookToShelf = function(bookId, shelfName, cat) {
        const b = readerBooks.find(x => x.id === bookId);
        if (b) {
            b.shelfName = shelfName;
            if (cat) b.category = cat;
            b.manualGenreLock = true;
            b.lastModified = Date.now();
            saveReaderMeta();
            renderWoodenShelf();
            showToast(`📘 Moved "${b.title}" to "${shelfName}"`);
        }
        document.getElementById('reader-suboptions-modal').classList.add('hidden');
    };

    window.quickAddBookToTodo = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const today = getLocalTodayString();
        todos.unshift({
            id: Date.now(),
            title: `📖 [${b.shelfName || 'Shelf'}] Read ${b.title} (p.${b.currentPage || 1})`,
            completed: false, important: true, myDayDate: today, dueDate: today,
            repeat: { type: 'none' }, steps: [], note: `Genre: ${b.shelfName || 'General'}`,
            listId: 'tasks', bookId: b.id, bookPage: b.currentPage || 1
        });
        saveTodos(); renderTodos();
        showToast(`☑️ "${b.title}" added to To-Do!`);
    };

    window.syncShelfToTodo = function(shelfName) {
        const books = readerBooks.filter(b => (b.shelfName || 'General Shelf') === shelfName);
        if (!books.length) return;
        let listObj = todoLists.find(l => l.name.toLowerCase() === shelfName.toLowerCase());
        if (!listObj) {
            listObj = { id: 'list_' + Date.now(), name: shelfName };
            todoLists.push(listObj);
        }
        const today = getLocalTodayString();
        books.forEach((b, i) => {
            if (!todos.some(t => t.bookId === b.id && !t.completed)) {
                todos.unshift({
                    id: Date.now() + i,
                    title: `📖 ${b.title} (p.${b.currentPage || 1}/${b.totalPages || 1})`,
                    completed: false, important: false, myDayDate: today, dueDate: today,
                    repeat: { type: 'none' }, steps: [], note: `Genre: ${shelfName}`,
                    listId: listObj.id, bookId: b.id, bookPage: b.currentPage || 1
                });
            }
        });
        saveTodos(); renderTodoListsBar(); renderTodos();
        showToast(`☑️ Synced Genre "${shelfName}" to To-Do List!`);
    };

    window.startBookFocusSession = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const durMins = b.dailyTargetMins || 45;
        schedule.splice(currentStepIndex, 0, {
            id: Date.now(), type: 'work',
            category: b.category === 'deen' ? 'deen' : 'study',
            title: `📖 ${b.title}`, duration: durMins * 60, bookId: b.id
        });
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(currentStepIndex, false);
        startTimer();
        openBookInReader(b.id, b.currentPage || 1);
    };

    window.openBookCornerModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        activeCornerBookId = bookId;
        document.getElementById('corner-book-title-input').value = b.title || '';
        document.getElementById('corner-book-author-input').value = b.author || '';
        document.getElementById('corner-book-desc-input').value = b.description || '';
        document.getElementById('corner-book-category-select').value = b.category || 'study';
        document.getElementById('corner-book-source-select').value = (b.sources && b.sources[0]) || 'local';
        const pct = Math.min(100, Math.round(((b.currentPage || 1) / Math.max(1, b.totalPages || 1)) * 100));
        document.getElementById('corner-progress-label').textContent = `${pct}% (${b.currentPage} / ${b.totalPages} pages)`;
        document.getElementById('corner-progress-bar').style.width = `${pct}%`;

        const cov = document.getElementById('corner-modal-cover-preview');
        const cUrl = coverMemoryCache[b.id] || b.coverDataUrl || '';
        if (cUrl) { cov.style.backgroundImage = `url('${cUrl}')`; cov.textContent = ''; }
        else { cov.style.backgroundImage = 'none'; cov.textContent = b.title.slice(0, 18); }
        document.getElementById('corner-toggle-fav-btn').textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';
        document.getElementById('book-corner-modal').classList.remove('hidden');
    };

    document.getElementById('close-book-corner-modal-btn')?.addEventListener('click', () => document.getElementById('book-corner-modal').classList.add('hidden'));
    document.getElementById('corner-toggle-fav-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.favorite = !b.favorite;
        b.lastModified = Date.now();
        document.getElementById('corner-toggle-fav-btn').textContent = b.favorite ? '❤️ Favorited' : '🤍 Favorite';
        saveReaderMeta(); renderWoodenShelf();
    });
    document.getElementById('corner-upload-cover-btn')?.addEventListener('click', () => document.getElementById('book-cover-file-input').click());
    document.getElementById('book-cover-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !activeCornerBookId) return;
        const r = new FileReader();
        r.onload = async () => {
            const b = readerBooks.find(x => x.id === activeCornerBookId);
            if (b) {
                coverMemoryCache[b.id] = r.result;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: r.result });
                saveReaderMeta(); window.openBookCornerModal(b.id); renderWoodenShelf();
            }
        };
        r.readAsDataURL(file);
    });
    document.getElementById('corner-auto-cover-btn')?.addEventListener('click', async () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (stored && stored.originalBytes && b.format === 'pdf') {
            const meta = await generatePdfCoverAndMeta(stored.originalBytes);
            if (meta.coverDataUrl) {
                coverMemoryCache[b.id] = meta.coverDataUrl;
                await idbPut('bookCovers', { id: b.id, coverDataUrl: meta.coverDataUrl });
                saveReaderMeta(); window.openBookCornerModal(b.id); renderWoodenShelf();
                showToast("⚡ Cover auto-detected from Page 1!");
            }
        }
    });
    document.getElementById('corner-save-meta-btn')?.addEventListener('click', () => {
        const b = readerBooks.find(x => x.id === activeCornerBookId);
        if (!b) return;
        b.title = document.getElementById('corner-book-title-input').value.trim() || b.title;
        b.author = document.getElementById('corner-book-author-input').value.trim() || 'Unknown Author';
        b.description = document.getElementById('corner-book-desc-input').value.trim();
        b.category = document.getElementById('corner-book-category-select').value;
        b.manualGenreLock = true;
        b.lastModified = Date.now();
        saveReaderMeta(); renderWoodenShelf();
        document.getElementById('book-corner-modal').classList.add('hidden');
        showToast("✅ Book details saved!");
    });
    document.getElementById('corner-open-book-now-btn')?.addEventListener('click', () => {
        document.getElementById('book-corner-modal').classList.add('hidden');
        if (activeCornerBookId) openBookInReader(activeCornerBookId);
    });
    document.getElementById('corner-delete-book-btn')?.addEventListener('click', async () => {
        if (!activeCornerBookId) return;
        window.readerBooks = readerBooks.filter(x => x.id !== activeCornerBookId);
        await idbDelete('bookFiles', activeCornerBookId);
        await idbDelete('bookCovers', activeCornerBookId);
        saveReaderMeta(); renderWoodenShelf();
        document.getElementById('book-corner-modal').classList.add('hidden');
        showToast("🗑️ Book deleted");
    });
    document.getElementById('corner-add-todo-btn')?.addEventListener('click', () => { if (activeCornerBookId) window.quickAddBookToTodo(activeCornerBookId); });
    document.getElementById('corner-add-plan-btn')?.addEventListener('click', () => { if (activeCornerBookId) window.startBookFocusSession(activeCornerBookId); });

    /* =========================================================================
       6. REAL PDF BINARY BAKING (pdf-lib) & NATIVE APK / BROWSER FILE DOWNLOAD
       ========================================================================= */
    function hexToRgb01(hex) {
        const clean = (hex || '#facc15').replace('#', '');
        const num = parseInt(clean, 16) || 0xfacc15;
        return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
    }

    function downloadBufferOrDataUrl(arrayBuffer, fileName, mimeType) {
        if (window.AndroidBridge && typeof window.AndroidBridge.saveBase64File === 'function') {
            const b64 = arrayBufferToBase64(arrayBuffer);
            window.AndroidBridge.saveBase64File(b64, fileName, mimeType);
            return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([arrayBuffer], { type: mimeType }));
        a.download = fileName;
        a.click();
    }

    async function bakeAnnotationsIntoPdfBytes(book, originalBuffer) {
        if (typeof PDFLib === 'undefined' || book.format !== 'pdf') return originalBuffer;
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(originalBuffer, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            for (const ann of (book.annotations || [])) {
                const pIdx = Math.max(0, Math.min(pages.length - 1, (ann.page || 1) - 1));
                const page = pages[pIdx];
                if (!page) continue;
                const { width, height } = page.getSize();
                const c = hexToRgb01(ann.color || '#facc15');
                const rgbColor = PDFLib.rgb(c.r, c.g, c.b);

                if (ann.type === 'highlight' || ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment') {
                    const rc = (Array.isArray(ann.rects) && ann.rects[0]) ? ann.rects[0] : { x: 0.08, y: ann.yNorm || 0.2, w: 0.84, h: 0.025 };
                    page.drawRectangle({
                        x: rc.x * width,
                        y: (1 - rc.y - rc.h) * height,
                        width: rc.w * width,
                        height: rc.h * height,
                        color: rgbColor,
                        opacity: 0.35
                    });
                } else if (ann.type === 'drawing') {
                    const sw = ann.strokeWidth || 3;
                    const pts = ann.points || [];
                    if (ann.shapeType === 'pencil' && pts.length > 1) {
                        for (let i = 0; i < pts.length - 1; i++) {
                            page.drawLine({
                                start: { x: pts[i].x * width, y: (1 - pts[i].y) * height },
                                end: { x: pts[i + 1].x * width, y: (1 - pts[i + 1].y) * height },
                                thickness: sw, color: rgbColor
                            });
                        }
                    } else if ((ann.shapeType === 'line' || ann.shapeType === 'arrow') && pts.length >= 2) {
                        page.drawLine({
                            start: { x: pts[0].x * width, y: (1 - pts[0].y) * height },
                            end: { x: pts[1].x * width, y: (1 - pts[1].y) * height },
                            thickness: sw, color: rgbColor
                        });
                    } else if (ann.shapeType === 'rect' && pts.length >= 2) {
                        page.drawRectangle({
                            x: Math.min(pts[0].x, pts[1].x) * width,
                            y: (1 - Math.max(pts[0].y, pts[1].y)) * height,
                            width: Math.abs(pts[1].x - pts[0].x) * width,
                            height: Math.abs(pts[1].y - pts[0].y) * height,
                            borderColor: rgbColor, borderWidth: sw
                        });
                    } else if (ann.shapeType === 'circle' && pts.length >= 2) {
                        page.drawEllipse({
                            x: ((pts[0].x + pts[1].x) / 2) * width,
                            y: (1 - ((pts[0].y + pts[1].y) / 2)) * height,
                            xScale: (Math.abs(pts[1].x - pts[0].x) / 2) * width,
                            yScale: (Math.abs(pts[1].y - pts[0].y) / 2) * height,
                            borderColor: rgbColor, borderWidth: sw
                        });
                    }
                }
            }
            const savedUint8 = await pdfDoc.save();
            return savedUint8.buffer;
        } catch (e) { return originalBuffer; }
    }

    window.syncSingleBookToAllSources = async function(bookId, silent = false) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const stored = await idbGet('bookFiles', b.id);
        if (!stored || !stored.originalBytes) return;

        const bakedBuffer = await bakeAnnotationsIntoPdfBytes(b, stored.originalBytes);
        stored.bakedBytes = bakedBuffer;
        await idbPut('bookFiles', stored);
        b.pendingCloudSync = false;
        b.lastModified = Date.now();
        saveReaderMeta();
        if (!silent) showToast(`✅ "${b.title}" baked into real PDF & synced!`);
    };

    /* =========================================================================
       7. FULL-SCREEN READER, ISOLATED PAGE ZOOM & 1-CLICK DELETE INSPECTOR
       ========================================================================= */
    let activeReaderBook = null;
    let activePdfDoc = null;
    let activeExtractedPages = [];
    let readerZoom = 1.0;
    let studioActive = false;
    let studioTool = 'line';
    let touchInteractionMode = 'scroll';
    let selectedShapeId = null;
    let activeHighlightColor = '#facc15';
    let pendingLaserSelection = null;
    let pendingTextPlacement = null;
    let activeReadingSessionTimer = null;
    let pageScrollObserver = null;
    let isJumpingPage = false;
    let jumpUnlockTimer = null;
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    function buildStudioToolbarAndTopUndo() {
        const topRight = document.getElementById('reader-pencil-toggle-btn')?.parentElement;
        if (topRight && !document.getElementById('reader-top-quick-undo-btn')) {
            const undoTopBtn = document.createElement('button');
            undoTopBtn.id = 'reader-top-quick-undo-btn';
            undoTopBtn.type = 'button';
            undoTopBtn.className = "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95";
            undoTopBtn.title = "Undo Last Highlight or Drawing (Ctrl+Z)";
            undoTopBtn.innerHTML = "↩️ Undo";
            undoTopBtn.onclick = () => window.undoLastReaderAnnotation();
            topRight.insertBefore(undoTopBtn, document.getElementById('reader-quick-bookmark-btn'));
        }

        const toolbar = document.getElementById('reader-pencil-toolbar');
        if (!toolbar) return;
        toolbar.innerHTML = `
            <div class="flex items-center gap-1 flex-wrap">
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg" data-tool="select">🖐️ Select / Move / Resize</button>
                <button type="button" class="v4-tool-btn bg-amber-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow" data-tool="pencil">✍️ Freehand</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="line">📏 Line</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="arrow">➔ Arrow</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="rect">⬜ Square</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="circle">⭕ Circle</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="text">🔤 Text</button>
                <button type="button" class="v4-tool-btn bg-slate-800 text-red-300 text-xs font-bold px-2.5 py-1.5 rounded-lg" data-tool="eraser">🗑️ Click-Delete</button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <label class="text-[10px] font-bold text-slate-400">Color:</label>
                <input type="color" id="v4-pencil-color" value="#ef4444" class="w-7 h-7 rounded cursor-pointer border border-slate-700 bg-transparent">
                <label class="text-[10px] font-bold text-slate-400">Size:</label>
                <input type="range" id="v4-pencil-size" min="2" max="24" value="4" class="w-20 accent-amber-500">
                <button type="button" id="v4-delete-sel-btn" class="hidden bg-red-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg">🗑️ Delete Selected</button>
                <button type="button" id="v4-undo-btn" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-lg">↩️ Undo</button>
                <button type="button" id="v4-save-pdf-btn" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow">💾 Save to PDF</button>
            </div>
        `;

        toolbar.querySelectorAll('.v4-tool-btn').forEach(btn => {
            btn.onclick = () => {
                studioTool = btn.getAttribute('data-tool');
                selectedShapeId = null;
                hideClickedItemInspectorBar();
                toolbar.querySelectorAll('.v4-tool-btn').forEach(b => {
                    b.className = "v4-tool-btn bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg";
                });
                btn.className = "v4-tool-btn bg-amber-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow";
                refreshVisiblePageSvgs();
            };
        });

        document.getElementById('v4-pencil-color').oninput = (e) => {
            if (selectedShapeId && activeReaderBook) {
                const ann = activeReaderBook.annotations.find(a => a.id === selectedShapeId);
                if (ann) { ann.color = e.target.value; ann.updatedAt = Date.now(); saveReaderMeta(); updateSinglePageSvg(ann.page); }
            }
        };
        document.getElementById('v4-pencil-size').oninput = (e) => {
            if (selectedShapeId && activeReaderBook) {
                const ann = activeReaderBook.annotations.find(a => a.id === selectedShapeId);
                if (ann) { ann.strokeWidth = parseInt(e.target.value) || 4; ann.updatedAt = Date.now(); saveReaderMeta(); updateSinglePageSvg(ann.page); }
            }
        };
        document.getElementById('v4-delete-sel-btn').onclick = () => {
            if (selectedShapeId && activeReaderBook) {
                deleteAnnotationTwoWay(activeReaderBook.id, selectedShapeId);
                selectedShapeId = null;
                hideClickedItemInspectorBar();
            }
        };
        document.getElementById('v4-undo-btn').onclick = () => window.undoLastReaderAnnotation();
        document.getElementById('v4-save-pdf-btn').onclick = () => {
            if (activeReaderBook) window.syncSingleBookToAllSources(activeReaderBook.id, false);
        };
    }
    buildStudioToolbarAndTopUndo();

    window.undoLastReaderAnnotation = function() {
        if (!activeReaderBook || !activeReaderBook.annotations?.length) {
            showToast("Nothing to undo on this book", true);
            return;
        }
        const removed = activeReaderBook.annotations.pop();
        if (removed && removed.id) {
            if (!Array.isArray(activeReaderBook.deletedAnnotationIds)) activeReaderBook.deletedAnnotationIds = [];
            activeReaderBook.deletedAnnotationIds.push(removed.id);
        }
        selectedShapeId = null;
        hideClickedItemInspectorBar();
        activeReaderBook.lastModified = Date.now();
        saveReaderMeta();
        if (removed) updateSinglePageSvg(removed.page || activeReaderBook.currentPage);
        showToast("↩️ Undid last highlight / drawing!");
    };

    function showClickedItemInspectorBar(ann, clientX, clientY) {
        let bar = document.getElementById('v5-clicked-ann-inspector');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'v5-clicked-ann-inspector';
            bar.className = "fixed z-[295] bg-slate-950/98 border border-amber-500/70 rounded-2xl shadow-2xl p-2 flex items-center gap-2";
            document.getElementById('reader-fullscreen-overlay')?.appendChild(bar);
        }
        const colors = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c', '#ef4444'];
        bar.innerHTML = `
            <span class="text-[10px] font-extrabold text-amber-300 px-1">${ann.type === 'drawing' ? '✏️ Shape' : '🖍️ Highlight'}</span>
            <div class="flex items-center gap-1 border-r border-slate-800 pr-2">
                ${colors.map(c => `<button type="button" onclick="window.recolorSelectedAnnotation('${ann.id}', '${c}')" class="w-4 h-4 rounded-full border ${ann.color === c ? 'border-white scale-110' : 'border-transparent'}" style="background:${c}"></button>`).join('')}
            </div>
            <button type="button" onclick="window.openSelectedAnnNoteModal('${ann.id}')" class="bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-bold px-2.5 py-1 rounded-xl">📝 Note</button>
            <button type="button" onclick="window.deleteAnnotationTwoWay('${activeReaderBook.id}', '${ann.id}')" class="bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow">🗑️ Delete</button>
            <button type="button" onclick="window.hideClickedItemInspectorBar()" class="text-slate-400 hover:text-white text-xs font-bold px-1">✕</button>
        `;
        bar.classList.remove('hidden');
        bar.style.left = `${Math.max(12, Math.min(window.innerWidth - 340, clientX - 150))}px`;
        bar.style.top = `${Math.max(58, Math.min(window.innerHeight - 100, clientY - 62))}px`;
    }

    window.hideClickedItemInspectorBar = function() {
        document.getElementById('v5-clicked-ann-inspector')?.classList.add('hidden');
    };

    window.recolorSelectedAnnotation = function(annId, newColor) {
        if (!activeReaderBook) return;
        const ann = activeReaderBook.annotations.find(a => a.id === annId);
        if (ann) {
            ann.color = newColor;
            ann.updatedAt = Date.now();
            activeReaderBook.lastModified = Date.now();
            saveReaderMeta();
            updateSinglePageSvg(ann.page);
        }
    };

    window.openSelectedAnnNoteModal = function(annId) {
        hideClickedItemInspectorBar();
        openLineItemViewerModal(annId);
    };

    document.getElementById('reader-pencil-toggle-btn')?.addEventListener('click', () => {
        studioActive = !studioActive;
        touchInteractionMode = studioActive ? 'draw' : 'scroll';
        const bar = document.getElementById('reader-pencil-toolbar');
        bar.classList.toggle('hidden', !studioActive);
        bar.classList.toggle('flex', studioActive);
        selectedShapeId = null;
        hideClickedItemInspectorBar();
        renderFloatingReaderThumbDock();
        refreshVisiblePageSvgs();
        showToast(studioActive ? "✏️ Live Pencil & Shape Studio Active" : "🖍️ Smart Highlight & Reading Mode Active");
    });

    function mountFloatingReaderThumbDock() {
        const overlay = document.getElementById('reader-fullscreen-overlay');
        if (!overlay || document.getElementById('reader-floating-thumb-dock')) return;
        const dock = document.createElement('div');
        dock.id = 'reader-floating-thumb-dock';
        dock.className = "fixed right-3 bottom-20 z-[275] bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1.5";
        overlay.appendChild(dock);
        renderFloatingReaderThumbDock();
    }

    function renderFloatingReaderThumbDock() {
        const dock = document.getElementById('reader-floating-thumb-dock');
        if (!dock) return;
        const modes = [
            { id: 'scroll', icon: '📜', label: 'Scroll' },
            { id: 'highlight', icon: '🖍️', label: 'Highlight' },
            { id: 'draw', icon: '✏️', label: 'Draw' },
            { id: 'select', icon: '🖐️', label: 'Move/Del' }
        ];
        dock.innerHTML = modes.map(m => {
            const isAct = (touchInteractionMode === m.id);
            return `
                <button type="button" onclick="window.setReaderTouchMode('${m.id}')" class="px-2.5 py-2 rounded-xl text-[10px] font-extrabold flex flex-col items-center gap-0.5 transition-all ${isAct ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-900 text-slate-400 hover:text-white'}">
                    <span class="text-sm leading-none">${m.icon}</span>
                    <span>${m.label}</span>
                </button>
            `;
        }).join('') + `
            <div class="h-px bg-slate-800 my-0.5"></div>
            <button type="button" onclick="window.undoLastReaderAnnotation()" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-[10px] font-bold flex flex-col items-center">
                <span>↩️</span><span>Undo</span>
            </button>
        `;
    }

    window.setReaderTouchMode = function(mode) {
        touchInteractionMode = mode;
        const bar = document.getElementById('reader-pencil-toolbar');
        if (mode === 'draw') {
            studioActive = true;
            if (studioTool === 'select' || studioTool === 'eraser') studioTool = 'pencil';
            bar?.classList.remove('hidden'); bar?.classList.add('flex');
        } else if (mode === 'select') {
            studioActive = true;
            studioTool = 'select';
            bar?.classList.remove('hidden'); bar?.classList.add('flex');
        } else {
            studioActive = false;
            bar?.classList.add('hidden'); bar?.classList.remove('flex');
        }
        renderFloatingReaderThumbDock();
        refreshVisiblePageSvgs();
    };

    function applyIsolatedPageZoom(newZoom) {
        if (!activeReaderBook) return;
        const viewport = document.getElementById('reader-viewport');
        const scrollRatioY = viewport ? (viewport.scrollTop / Math.max(1, viewport.scrollHeight)) : 0;

        readerZoom = Math.max(0.55, Math.min(3.0, +newZoom.toFixed(2)));
        const lbl = document.getElementById('reader-zoom-label');
        if (lbl) lbl.textContent = `${Math.round(readerZoom * 100)}%`;

        const newCardWidth = Math.round(820 * readerZoom);
        document.querySelectorAll('.v4-page-card').forEach(card => {
            card.style.width = `${newCardWidth}px`;
            card.style.maxWidth = `${newCardWidth}px`;
            card.style.minHeight = 'auto';
        });

        if (viewport && scrollRatioY > 0) {
            viewport.scrollTop = scrollRatioY * viewport.scrollHeight;
        }

        clearTimeout(window._zoomCrispTimer);
        window._zoomCrispTimer = setTimeout(() => {
            renderedCanvasPages.clear();
            const curCard = document.querySelector(`.v4-page-card[data-page="${activeReaderBook.currentPage}"]`);
            if (curCard) ensurePdfPageRendered(activeReaderBook.currentPage, curCard);
        }, 220);
    }

    document.getElementById('reader-fullscreen-overlay')?.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 0.12 : -0.12;
            applyIsolatedPageZoom(readerZoom + delta);
        }
    }, { passive: false });

    let pinchStartDist = 0, pinchStartZoom = 1.0;
    const readerVpEl = document.getElementById('reader-viewport');
    readerVpEl?.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            pinchStartDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchStartZoom = readerZoom;
        }
    }, { passive: false });

    readerVpEl?.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinchStartDist > 20) {
            e.preventDefault();
            const curDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            applyIsolatedPageZoom(pinchStartZoom * (curDist / pinchStartDist));
        }
    }, { passive: false });

    document.getElementById('reader-zoom-in-btn')?.addEventListener('click', () => applyIsolatedPageZoom(readerZoom + 0.15));
    document.getElementById('reader-zoom-out-btn')?.addEventListener('click', () => applyIsolatedPageZoom(readerZoom - 0.15));

    document.getElementById('v4-close-text-modal')?.addEventListener('click', () => document.getElementById('v4-canvas-text-modal').classList.add('hidden'));
    document.getElementById('v4-confirm-text-btn')?.addEventListener('click', () => {
        const txt = (document.getElementById('v4-canvas-text-input').value || '').trim();
        const fSize = parseInt(document.getElementById('v4-canvas-text-size').value) || 22;
        const color = document.getElementById('v4-pencil-color')?.value || '#ef4444';
        if (txt && pendingTextPlacement && activeReaderBook) {
            const newId = 'draw_' + Date.now();
            activeReaderBook.annotations.push({
                id: newId, page: pendingTextPlacement.page, type: 'drawing', shapeType: 'text',
                text: txt, color, fontSize: fSize, strokeWidth: Math.round(fSize / 4),
                points: [{ x: pendingTextPlacement.x, y: pendingTextPlacement.y }],
                createdAt: Date.now(), updatedAt: Date.now()
            });
            selectedShapeId = newId;
            saveReaderMeta();
            updateSinglePageSvg(pendingTextPlacement.page);
        }
        document.getElementById('v4-canvas-text-input').value = '';
        document.getElementById('v4-canvas-text-modal').classList.add('hidden');
    });

    setInterval(() => {
        const txt = document.getElementById('reader-mini-timer-text');
        if (txt && window.timeDisplay) txt.textContent = window.timeDisplay.textContent;
    }, 500);
    document.getElementById('reader-mini-timer-toggle')?.addEventListener('click', () => {
        if (window.isRunning) window.stopTimer();
        else window.startTimer();
    });

    window.openBookAtPage = async function(bookId, targetPage = null) {
        switchPage('page-reader');
        await openBookInReader(bookId, targetPage);
    };

    async function openBookInReader(bookId, forcedPage = null) {
        const book = readerBooks.find(x => x.id === bookId);
        if (!book) { showToast("Book not found on shelf", true); return; }

        let stored = await idbGet('bookFiles', book.id);
        if (!stored || !stored.originalBytes) {
            stored = await window.downloadBookBinaryFromWirelessCloud(book.id);
            if (!stored || !stored.originalBytes) {
                showToast("📲 Click '☁️ Push' on the device where you imported this book first.", true);
                return;
            }
        }

        activeReaderBook = book;
        book.lastOpened = Date.now();
        activePdfDoc = null;
        activeExtractedPages = stored.extractedPagesText || [];
        renderedCanvasPages.clear();
        Object.keys(pageTextItemsCache).forEach(k => delete pageTextItemsCache[k]);

        if (book.format === 'pdf' && typeof pdfjsLib !== 'undefined') {
            try {
                activePdfDoc = await pdfjsLib.getDocument({ data: stored.originalBytes.slice(0) }).promise;
                book.totalPages = activePdfDoc.numPages || book.totalPages;
            } catch (e) { showToast("Error loading PDF", true); }
        }

        const targetStartPage = forcedPage !== null
            ? Math.max(1, Math.min(book.totalPages, parseInt(forcedPage) || 1))
            : (book.openMode === 'beginning' ? 1 : Math.max(1, Math.min(book.totalPages, book.currentPage || 1)));

        book.currentPage = targetStartPage;

        document.getElementById('reader-fullscreen-overlay').classList.remove('hidden');
        mountFloatingReaderThumbDock();
        applyReaderAppearanceAndLocks();

        document.getElementById('reader-page-slider').max = book.totalPages;
        document.getElementById('reader-total-pages-label').textContent = book.totalPages;

        isJumpingPage = true;
        await buildBookStageAndObserver();
        jumpToReaderPage(targetStartPage);
        startActiveBookReadingClock();
        saveReaderMeta();
        renderWoodenShelf();
    }

    function closeActiveBookReader() {
        stopTtsReading();
        clearInterval(activeReadingSessionTimer);
        hideClickedItemInspectorBar();
        if (pageScrollObserver) { pageScrollObserver.disconnect(); pageScrollObserver = null; }
        if (activeReaderBook && activeReaderBook.autoSync && !activeReaderBook.manualSyncOnly && activeReaderBook.pendingCloudSync) {
            window.syncSingleBookToAllSources(activeReaderBook.id, true);
        }
        activeReaderBook = null;
        activePdfDoc = null;
        document.getElementById('reader-fullscreen-overlay').classList.add('hidden');
        document.getElementById('reader-floating-sel-bar').classList.add('hidden');
        renderWoodenShelf();
        renderHomeHUD();
    }
    document.getElementById('reader-back-to-shelf-btn')?.addEventListener('click', closeActiveBookReader);

    function updateHeaderAndSliderForCurrentPage(pageNum) {
        if (!activeReaderBook) return;
        const total = Math.max(1, activeReaderBook.totalPages || 1);
        activeReaderBook.currentPage = Math.max(1, Math.min(total, pageNum));
        const pct = Math.min(100, Math.round((activeReaderBook.currentPage / total) * 100));
        activeReaderBook.progressPct = pct;

        const today = getLocalTodayString();
        const todayMins = readerReadingLog[today]?.books?.[activeReaderBook.id] || 0;
        document.getElementById('active-book-title-bar').textContent = activeReaderBook.title;
        document.getElementById('active-book-sub-bar').textContent = `Page ${activeReaderBook.currentPage} of ${total} • ${pct}% • Today: ${todayMins}m/${activeReaderBook.dailyTargetMins || 30}m`;
        document.getElementById('reader-page-slider').value = activeReaderBook.currentPage;
        document.getElementById('reader-page-num-input').value = activeReaderBook.currentPage;
        saveReaderMeta();
    }

    async function buildBookStageAndObserver() {
        const stage = document.getElementById('reader-pages-stage');
        const viewport = document.getElementById('reader-viewport');
        if (!stage || !activeReaderBook) return;

        if (pageScrollObserver) pageScrollObserver.disconnect();
        stage.innerHTML = '';
        renderedCanvasPages.clear();

        const mode = readerSettings.viewMode || 'scroll';
        const total = activeReaderBook.totalPages || 1;
        let pagesList = [];

        if (mode === 'single' || mode === 'slide') {
            pagesList = [activeReaderBook.currentPage];
        } else if (mode === 'dual') {
            const p1 = activeReaderBook.currentPage % 2 === 0 ? activeReaderBook.currentPage - 1 : activeReaderBook.currentPage;
            pagesList = [p1];
            if (p1 + 1 <= total) pagesList.push(p1 + 1);
        } else {
            for (let p = 1; p <= total; p++) pagesList.push(p);
        }

        const cardWidth = Math.round(820 * readerZoom);
        const estHeight = Math.round(cardWidth * 1.38);

        pagesList.forEach(pageNum => {
            const card = document.createElement('div');
            card.className = "v4-page-card";
            card.setAttribute('data-page', pageNum);
            card.style.width = `${cardWidth}px`;
            card.style.maxWidth = `${cardWidth}px`;
            card.style.minHeight = `${estHeight}px`;

            const badge = document.createElement('div');
            badge.className = "absolute top-2 left-2 z-30 bg-slate-950/85 text-slate-200 text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-md border border-slate-700 pointer-events-none";
            badge.textContent = `Page ${pageNum} / ${total}`;
            card.appendChild(badge);

            if (activePdfDoc) {
                const canvas = document.createElement('canvas');
                canvas.className = "v4-pdf-canvas";
                card.appendChild(canvas);
            } else {
                const contentDiv = document.createElement('div');
                contentDiv.className = "p-8 sm:p-12 text-slate-900 bg-amber-50/95 min-h-[75vh] leading-relaxed text-left";
                contentDiv.style.fontSize = `${Math.round(16 * readerZoom)}px`;
                const rawTxt = activeExtractedPages[pageNum - 1] || '';
                let html = escapeHtml(rawTxt).replace(/\n/g, '<br>');
                if (activeReaderBook.format === 'md' && typeof marked !== 'undefined') {
                    try { html = marked.parse(rawTxt); } catch (e) {}
                }
                contentDiv.innerHTML = html;
                card.appendChild(contentDiv);
            }

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', `v4-interactive-svg ${studioActive && studioTool === 'select' ? 'mode-select' : ''}`);
            svg.setAttribute('data-page', pageNum);
            svg.setAttribute('viewBox', '0 0 1000 1400');
            svg.setAttribute('preserveAspectRatio', 'none');
            card.appendChild(svg);

            const chipsContainer = document.createElement('div');
            chipsContainer.className = "v4-chips-layer absolute inset-0 pointer-events-none z-30";
            card.appendChild(chipsContainer);

            stage.appendChild(card);
            updateSinglePageSvg(pageNum);
            bindPageInteractiveSvg(pageNum, svg);
        });

        pageScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const pageNum = parseInt(entry.target.getAttribute('data-page'));
                if (!pageNum) return;
                if (entry.isIntersecting) {
                    ensurePdfPageRendered(pageNum, entry.target);
                    if (!isJumpingPage && entry.intersectionRatio >= 0.4) {
                        updateHeaderAndSliderForCurrentPage(pageNum);
                    }
                }
            });
        }, {
            root: viewport,
            rootMargin: '800px 0px 800px 0px',
            threshold: [0.05, 0.4, 0.7]
        });

        stage.querySelectorAll('.v4-page-card').forEach(card => pageScrollObserver.observe(card));
    }

    async function ensurePdfPageRendered(pageNum, cardEl) {
        if (!activePdfDoc || renderedCanvasPages.has(pageNum)) return;
        renderedCanvasPages.add(pageNum);
        try {
            const canvas = cardEl.querySelector('canvas.v4-pdf-canvas');
            if (!canvas) return;
            const page = await activePdfDoc.getPage(pageNum);
            const vp = page.getViewport({ scale: 1.5 * Math.max(1, readerZoom) });
            canvas.width = vp.width;
            canvas.height = vp.height;
            cardEl.style.minHeight = 'auto';
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

            if (!pageTextItemsCache[pageNum]) {
                const unitVp = page.getViewport({ scale: 1.0 });
                const tc = await page.getTextContent();
                const items = [];
                tc.items.forEach(item => {
                    if (!item.str || !item.str.trim()) return;
                    const m = pdfjsLib.Util.transform(unitVp.transform, item.transform);
                    const fh = Math.hypot(m[2], m[3]);
                    const x = m[4] / unitVp.width;
                    const y = (m[5] - fh * 0.85) / unitVp.height;
                    const w = ((item.width || (item.str.length * fh * 0.5)) * unitVp.scale) / unitVp.width;
                    const h = (fh * 1.15) / unitVp.height;
                    items.push({ x, y, w, h, str: item.str });
                });
                pageTextItemsCache[pageNum] = items;
            }
        } catch (e) {
            renderedCanvasPages.delete(pageNum);
        }
    }

    function extractPdfWordsInRect(pageNum, rx, ry, rw, rh) {
        const items = pageTextItemsCache[pageNum] || [];
        const matched = items.filter(it => {
            const cx = it.x + it.w / 2;
            const cy = it.y + it.h / 2;
            return cx >= rx - 0.02 && cx <= rx + rw + 0.02 && cy >= ry - 0.015 && cy <= ry + rh + 0.015;
        });
        matched.sort((a, b) => (Math.abs(a.y - b.y) < 0.012 ? a.x - b.x : a.y - b.y));
        return matched.map(m => m.str).join(' ').trim();
    }

    function jumpToReaderPage(pageNum) {
        if (!activeReaderBook) return;
        const target = Math.max(1, Math.min(activeReaderBook.totalPages || 1, pageNum));
        isJumpingPage = true;
        clearTimeout(jumpUnlockTimer);
        updateHeaderAndSliderForCurrentPage(target);

        const mode = readerSettings.viewMode || 'scroll';
        if (mode !== 'scroll') {
            buildBookStageAndObserver().then(() => {
                jumpUnlockTimer = setTimeout(() => { isJumpingPage = false; }, 350);
            });
            return;
        }
        const card = document.querySelector(`.v4-page-card[data-page="${target}"]`);
        if (card) {
            ensurePdfPageRendered(target, card);
            card.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        jumpUnlockTimer = setTimeout(() => {
            isJumpingPage = false;
            updateHeaderAndSliderForCurrentPage(target);
        }, 400);
    }

    function updateSinglePageSvg(pageNum) {
        if (!activeReaderBook) return;
        const card = document.querySelector(`.v4-page-card[data-page="${pageNum}"]`);
        if (!card) return;
        const svg = card.querySelector('svg.v4-interactive-svg');
        const chipsLayer = card.querySelector('.v4-chips-layer');
        if (!svg || !chipsLayer) return;

        svg.innerHTML = '';
        chipsLayer.innerHTML = '';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <marker id="v4-arrow-${pageNum}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="context-stroke"></path>
            </marker>
        `;
        svg.appendChild(defs);

        const pageAnns = (activeReaderBook.annotations || []).filter(a => (a.page || 1) === pageNum);

        pageAnns.forEach(ann => {
            const isSel = (ann.id === selectedShapeId);
            const color = ann.color || '#facc15';
            const sw = (ann.strokeWidth || 4) * 2.2;

            if (ann.type === 'highlight' || ann.type === 'note' || ann.type === 'bookmark' || ann.type === 'attachment') {
                const rects = (Array.isArray(ann.rects) && ann.rects.length > 0)
                    ? ann.rects
                    : [{ x: 0.08, y: ann.yNorm || 0.2, w: 0.84, h: 0.026 }];

                rects.forEach(rc => {
                    const rEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rEl.setAttribute('x', rc.x * 1000);
                    rEl.setAttribute('y', rc.y * 1400);
                    rEl.setAttribute('width', Math.max(16, rc.w * 1000));
                    rEl.setAttribute('height', Math.max(14, rc.h * 1400));
                    rEl.setAttribute('fill', color);
                    rEl.setAttribute('fill-opacity', '0.38');
                    rEl.setAttribute('rx', '4');
                    rEl.setAttribute('class', 'v4-shape-node');
                    rEl.setAttribute('data-ann-id', ann.id);
                    if (isSel) {
                        rEl.setAttribute('stroke', '#2563eb');
                        rEl.setAttribute('stroke-width', '4');
                    }
                    svg.appendChild(rEl);

                    if (isSel) {
                        const h1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        h1.setAttribute('cx', rc.x * 1000); h1.setAttribute('cy', rc.y * 1400);
                        h1.setAttribute('r', '11'); h1.setAttribute('class', 'v4-resize-handle');
                        h1.setAttribute('data-ann-id', ann.id); h1.setAttribute('data-corner', 'tl');
                        svg.appendChild(h1);

                        const h2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        h2.setAttribute('cx', (rc.x + rc.w) * 1000); h2.setAttribute('cy', (rc.y + rc.h) * 1400);
                        h2.setAttribute('r', '11'); h2.setAttribute('class', 'v4-resize-handle');
                        h2.setAttribute('data-ann-id', ann.id); h2.setAttribute('data-corner', 'br');
                        svg.appendChild(h2);
                    }
                });

                if (ann.note || ann.attachmentId || ann.type === 'bookmark' || ann.type === 'note' || ann.type === 'attachment') {
                    const topPct = Math.max(3, Math.min(93, ((rects[0]?.y || ann.yNorm || 0.2) * 100)));
                    const chip = document.createElement('div');
                    chip.className = "v4-margin-chip pointer-events-auto";
                    chip.style.top = `${topPct}%`;
                    chip.style.backgroundColor = color;
                    const icon = ann.type === 'attachment' ? '📎' : (ann.type === 'note' ? '📝' : '🔖');
                    chip.innerHTML = `${icon} <span>${escapeHtml((ann.note || ann.attachmentName || 'Bookmark').slice(0, 18))}</span>`;
                    chip.onclick = (ev) => {
                        ev.stopPropagation();
                        openLineItemViewerModal(ann.id);
                    };
                    chipsLayer.appendChild(chip);
                }
            } else if (ann.type === 'drawing') {
                const pts = ann.points || [];
                let el = null;

                if (ann.shapeType === 'pencil' && pts.length > 1) {
                    el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    el.setAttribute('points', pts.map(p => `${p.x * 1000},${p.y * 1400}`).join(' '));
                    el.setAttribute('fill', 'none');
                    el.setAttribute('stroke', color);
                    el.setAttribute('stroke-width', sw);
                    el.setAttribute('stroke-linecap', 'round');
                    el.setAttribute('stroke-linejoin', 'round');
                } else if ((ann.shapeType === 'line' || ann.shapeType === 'arrow') && pts.length >= 2) {
                    el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    el.setAttribute('x1', pts[0].x * 1000); el.setAttribute('y1', pts[0].y * 1400);
                    el.setAttribute('x2', pts[1].x * 1000); el.setAttribute('y2', pts[1].y * 1400);
                    el.setAttribute('stroke', color); el.setAttribute('stroke-width', sw);
                    el.setAttribute('stroke-linecap', 'round');
                    if (ann.shapeType === 'arrow') el.setAttribute('marker-end', `url(#v4-arrow-${pageNum})`);
                } else if (ann.shapeType === 'rect' && pts.length >= 2) {
                    el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    el.setAttribute('x', Math.min(pts[0].x, pts[1].x) * 1000);
                    el.setAttribute('y', Math.min(pts[0].y, pts[1].y) * 1400);
                    el.setAttribute('width', Math.max(12, Math.abs(pts[1].x - pts[0].x) * 1000));
                    el.setAttribute('height', Math.max(12, Math.abs(pts[1].y - pts[0].y) * 1400));
                    el.setAttribute('fill', 'rgba(255,255,255,0.01)');
                    el.setAttribute('stroke', color);
                    el.setAttribute('stroke-width', sw);
                } else if (ann.shapeType === 'circle' && pts.length >= 2) {
                    el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                    el.setAttribute('cx', ((pts[0].x + pts[1].x) / 2) * 1000);
                    el.setAttribute('cy', ((pts[0].y + pts[1].y) / 2) * 1400);
                    el.setAttribute('rx', Math.max(8, (Math.abs(pts[1].x - pts[0].x) / 2) * 1000));
                    el.setAttribute('ry', Math.max(8, (Math.abs(pts[1].y - pts[0].y) / 2) * 1400));
                    el.setAttribute('fill', 'rgba(255,255,255,0.01)');
                    el.setAttribute('stroke', color);
                    el.setAttribute('stroke-width', sw);
                } else if (ann.shapeType === 'text' && pts.length >= 1) {
                    el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    el.setAttribute('x', pts[0].x * 1000); el.setAttribute('y', pts[0].y * 1400);
                    el.setAttribute('fill', color);
                    el.setAttribute('font-size', (ann.fontSize || 22) * 1.6);
                    el.setAttribute('font-weight', '800');
                    el.textContent = ann.text || 'Text';
                }

                if (el) {
                    el.setAttribute('class', 'v4-shape-node');
                    el.setAttribute('data-ann-id', ann.id);
                    if (isSel) el.setAttribute('filter', 'drop-shadow(0 0 8px #2563eb)');
                    svg.appendChild(el);

                    if (isSel && pts.length >= 2) {
                        [0, 1].forEach(ptIdx => {
                            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                            handle.setAttribute('cx', pts[ptIdx].x * 1000);
                            handle.setAttribute('cy', pts[ptIdx].y * 1400);
                            handle.setAttribute('r', '12');
                            handle.setAttribute('class', 'v4-resize-handle');
                            handle.setAttribute('data-ann-id', ann.id);
                            handle.setAttribute('data-pt-idx', ptIdx);
                            svg.appendChild(handle);
                        });
                    }
                }
            }
        });
    }

    function refreshVisiblePageSvgs() {
        document.querySelectorAll('svg.v4-interactive-svg').forEach(svg => {
            const p = parseInt(svg.getAttribute('data-page')) || 1;
            svg.classList.toggle('mode-select', studioActive && studioTool === 'select');
            svg.style.touchAction = (touchInteractionMode === 'scroll' && !studioActive) ? 'pan-y pan-x' : 'none';
            updateSinglePageSvg(p);
        });
        document.getElementById('v4-delete-sel-btn')?.classList.toggle('hidden', !selectedShapeId);
    }

    function bindPageInteractiveSvg(pageNum, svg) {
        let mode = null;
        let activeAnnId = null;
        let resizeIdx = 0;
        let resizeCorner = 'br';
        let startNorm = { x: 0, y: 0 };
        let lastNorm = { x: 0, y: 0 };
        let livePoints = [];
        let previewNode = null;

        svg.style.touchAction = (touchInteractionMode === 'scroll' && !studioActive) ? 'pan-y pan-x' : 'none';

        function getNorm(e) {
            const r = svg.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height)))
            };
        }

        svg.onpointerdown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            const clickedHandle = e.target.closest('.v4-resize-handle');
            const clickedShape = e.target.closest('.v4-shape-node');

            if (e.pointerType === 'touch' && touchInteractionMode === 'scroll' && !studioActive && !clickedHandle && !clickedShape) {
                return;
            }

            e.stopPropagation();
            svg.setPointerCapture(e.pointerId);
            const pt = getNorm(e);
            startNorm = pt;
            lastNorm = pt;

            document.querySelectorAll('.v4-temp-laser-box').forEach(n => n.remove());

            if (clickedHandle) {
                activeAnnId = clickedHandle.getAttribute('data-ann-id');
                if (clickedHandle.hasAttribute('data-corner')) {
                    mode = 'resize-rect';
                    resizeCorner = clickedHandle.getAttribute('data-corner');
                } else {
                    mode = 'resize-pt';
                    resizeIdx = parseInt(clickedHandle.getAttribute('data-pt-idx')) || 0;
                }
                return;
            }

            if (clickedShape && clickedShape.getAttribute('data-ann-id')) {
                const clickedId = clickedShape.getAttribute('data-ann-id');
                if (studioActive && studioTool === 'eraser') {
                    deleteAnnotationTwoWay(activeReaderBook.id, clickedId);
                    return;
                }
                selectedShapeId = clickedId;
                activeAnnId = clickedId;
                mode = 'move';
                updateSinglePageSvg(pageNum);
                document.getElementById('v4-delete-sel-btn')?.classList.remove('hidden');
                const annObj = activeReaderBook?.annotations?.find(a => a.id === clickedId);
                if (annObj) showClickedItemInspectorBar(annObj, e.clientX, e.clientY);
                return;
            }

            hideClickedItemInspectorBar();

            if (studioActive && studioTool !== 'select' && studioTool !== 'eraser') {
                const color = document.getElementById('v4-pencil-color')?.value || '#ef4444';
                const sw = (parseInt(document.getElementById('v4-pencil-size')?.value) || 4) * 2.2;

                if (studioTool === 'text') {
                    pendingTextPlacement = { page: pageNum, x: pt.x, y: pt.y };
                    document.getElementById('v4-canvas-text-modal').classList.remove('hidden');
                    setTimeout(() => document.getElementById('v4-canvas-text-input')?.focus(), 50);
                    return;
                }

                mode = 'draw';
                livePoints = [pt, pt];

                if (studioTool === 'pencil') {
                    previewNode = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    previewNode.setAttribute('fill', 'none');
                } else if (studioTool === 'line' || studioTool === 'arrow') {
                    previewNode = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    if (studioTool === 'arrow') previewNode.setAttribute('marker-end', `url(#v4-arrow-${pageNum})`);
                } else if (studioTool === 'rect') {
                    previewNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    previewNode.setAttribute('fill', 'rgba(59, 130, 246, 0.08)');
                } else if (studioTool === 'circle') {
                    previewNode = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                    previewNode.setAttribute('fill', 'rgba(59, 130, 246, 0.08)');
                }

                if (previewNode) {
                    previewNode.setAttribute('stroke', color);
                    previewNode.setAttribute('stroke-width', sw);
                    previewNode.setAttribute('stroke-linecap', 'round');
                    svg.appendChild(previewNode);
                }
                return;
            }

            selectedShapeId = null;
            document.getElementById('v4-delete-sel-btn')?.classList.add('hidden');
            mode = 'laser-hl';
            previewNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            previewNode.setAttribute('class', 'v4-temp-laser-box');
            previewNode.setAttribute('fill', activeHighlightColor);
            previewNode.setAttribute('fill-opacity', '0.42');
            previewNode.setAttribute('stroke', activeHighlightColor);
            previewNode.setAttribute('stroke-width', '2.5');
            previewNode.setAttribute('rx', '4');
            svg.appendChild(previewNode);
        };

        svg.onpointermove = (e) => {
            if (!mode) return;
            const pt = getNorm(e);

            if (mode === 'draw' && previewNode) {
                if (studioTool === 'pencil') {
                    livePoints.push(pt);
                    previewNode.setAttribute('points', livePoints.map(p => `${p.x * 1000},${p.y * 1400}`).join(' '));
                } else if (studioTool === 'line' || studioTool === 'arrow') {
                    livePoints[1] = pt;
                    previewNode.setAttribute('x1', startNorm.x * 1000); previewNode.setAttribute('y1', startNorm.y * 1400);
                    previewNode.setAttribute('x2', pt.x * 1000); previewNode.setAttribute('y2', pt.y * 1400);
                } else if (studioTool === 'rect') {
                    livePoints[1] = pt;
                    previewNode.setAttribute('x', Math.min(startNorm.x, pt.x) * 1000);
                    previewNode.setAttribute('y', Math.min(startNorm.y, pt.y) * 1400);
                    previewNode.setAttribute('width', Math.abs(pt.x - startNorm.x) * 1000);
                    previewNode.setAttribute('height', Math.abs(pt.y - startNorm.y) * 1400);
                } else if (studioTool === 'circle') {
                    livePoints[1] = pt;
                    previewNode.setAttribute('cx', ((startNorm.x + pt.x) / 2) * 1000);
                    previewNode.setAttribute('cy', ((startNorm.y + pt.y) / 2) * 1400);
                    previewNode.setAttribute('rx', (Math.abs(pt.x - startNorm.x) / 2) * 1000);
                    previewNode.setAttribute('ry', (Math.abs(pt.y - startNorm.y) / 2) * 1400);
                }
            } else if (mode === 'move' && activeAnnId && activeReaderBook) {
                const dx = pt.x - lastNorm.x;
                const dy = pt.y - lastNorm.y;
                lastNorm = pt;
                const ann = activeReaderBook.annotations.find(a => a.id === activeAnnId);
                if (ann) {
                    if (Array.isArray(ann.points)) {
                        ann.points = ann.points.map(p => ({
                            x: Math.max(0, Math.min(1, p.x + dx)),
                            y: Math.max(0, Math.min(1, p.y + dy))
                        }));
                    }
                    if (Array.isArray(ann.rects)) {
                        ann.rects = ann.rects.map(rc => ({
                            ...rc,
                            x: Math.max(0, Math.min(1 - rc.w, rc.x + dx)),
                            y: Math.max(0, Math.min(1 - rc.h, rc.y + dy))
                        }));
                        ann.yNorm = ann.rects[0].y;
                    }
                    ann.updatedAt = Date.now();
                    updateSinglePageSvg(pageNum);
                }
            } else if (mode === 'resize-pt' && activeAnnId && activeReaderBook) {
                const ann = activeReaderBook.annotations.find(a => a.id === activeAnnId);
                if (ann && Array.isArray(ann.points) && ann.points[resizeIdx]) {
                    ann.points[resizeIdx] = { x: pt.x, y: pt.y };
                    ann.updatedAt = Date.now();
                    updateSinglePageSvg(pageNum);
                }
            } else if (mode === 'resize-rect' && activeAnnId && activeReaderBook) {
                const ann = activeReaderBook.annotations.find(a => a.id === activeAnnId);
                if (ann && Array.isArray(ann.rects) && ann.rects[0]) {
                    const rc = ann.rects[0];
                    if (resizeCorner === 'br') {
                        rc.w = Math.max(0.03, pt.x - rc.x);
                        rc.h = Math.max(0.015, pt.y - rc.y);
                    } else {
                        const oldRight = rc.x + rc.w;
                        const oldBottom = rc.y + rc.h;
                        rc.x = Math.min(oldRight - 0.03, pt.x);
                        rc.y = Math.min(oldBottom - 0.015, pt.y);
                        rc.w = oldRight - rc.x;
                        rc.h = oldBottom - rc.y;
                    }
                    ann.yNorm = rc.y;
                    ann.updatedAt = Date.now();
                    updateSinglePageSvg(pageNum);
                }
            } else if (mode === 'laser-hl' && previewNode) {
                const rx = Math.min(startNorm.x, pt.x);
                const rawRy = Math.min(startNorm.y, pt.y);
                const rw = Math.abs(pt.x - startNorm.x);
                const rawRh = Math.abs(pt.y - startNorm.y);
                const rh = rawRh < 0.022 ? 0.024 : rawRh;
                const ry = rawRh < 0.022 ? Math.max(0, startNorm.y - 0.012) : rawRy;

                previewNode.setAttribute('x', rx * 1000);
                previewNode.setAttribute('y', ry * 1400);
                previewNode.setAttribute('width', rw * 1000);
                previewNode.setAttribute('height', rh * 1400);
            }
        };

        svg.onpointerup = (e) => {
            if (!mode) return;
            const pt = getNorm(e);
            const dist = Math.hypot(pt.x - startNorm.x, pt.y - startNorm.y);

            if (mode === 'draw' && activeReaderBook) {
                if (dist > 0.01) {
                    const color = document.getElementById('v4-pencil-color')?.value || '#ef4444';
                    const sw = parseInt(document.getElementById('v4-pencil-size')?.value) || 4;
                    const newId = 'draw_' + Date.now() + '_' + Math.floor(Math.random() * 999);
                    const createdAnn = {
                        id: newId, page: pageNum, type: 'drawing', shapeType: studioTool,
                        color, strokeWidth: sw, points: livePoints,
                        createdAt: Date.now(), updatedAt: Date.now()
                    };
                    activeReaderBook.annotations.push(createdAnn);
                    selectedShapeId = newId;
                    activeReaderBook.rev = (activeReaderBook.rev || 1) + 1;
                    activeReaderBook.lastModified = Date.now();
                    activeReaderBook.pendingCloudSync = true;
                    saveReaderMeta();
                    showClickedItemInspectorBar(createdAnn, e.clientX, e.clientY);
                }
                updateSinglePageSvg(pageNum);
                document.getElementById('v4-delete-sel-btn')?.classList.toggle('hidden', !selectedShapeId);
            } else if (mode === 'move' || mode === 'resize-pt' || mode === 'resize-rect') {
                if (activeReaderBook) {
                    activeReaderBook.rev = (activeReaderBook.rev || 1) + 1;
                    activeReaderBook.lastModified = Date.now();
                    activeReaderBook.pendingCloudSync = true;
                    saveReaderMeta();
                }
            } else if (mode === 'laser-hl') {
                if (dist > 0.015) {
                    const rx = Math.min(startNorm.x, pt.x);
                    const rawRy = Math.min(startNorm.y, pt.y);
                    const rw = Math.max(0.03, Math.abs(pt.x - startNorm.x));
                    const rawRh = Math.abs(pt.y - startNorm.y);
                    const rh = rawRh < 0.022 ? 0.024 : rawRh;
                    const ry = rawRh < 0.022 ? Math.max(0, startNorm.y - 0.012) : rawRy;

                    const extractedTxt = extractPdfWordsInRect(pageNum, rx, ry, rw, rh) || `Page ${pageNum} Highlighted Passage`;
                    pendingLaserSelection = { page: pageNum, x: rx, y: ry, w: rw, h: rh, text: extractedTxt };
                    updateHeaderAndSliderForCurrentPage(pageNum);

                    const flBar = document.getElementById('reader-floating-sel-bar');
                    if (flBar) {
                        flBar.classList.remove('hidden');
                        flBar.classList.add('flex');
                        flBar.style.left = `${Math.max(16, Math.min(window.innerWidth - 340, e.clientX - 150))}px`;
                        flBar.style.top = `${Math.max(64, Math.min(window.innerHeight - 170, e.clientY - 120))}px`;
                    }
                } else {
                    previewNode?.remove();
                    document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
                }
            }

            mode = null;
            previewNode = null;
        };
    }

    function commitLaserAnnotation(type, extra = {}) {
        if (!pendingLaserSelection || !activeReaderBook) return null;
        const targetPage = pendingLaserSelection.page;
        const newAnn = {
            id: 'ann_' + Date.now() + '_' + Math.floor(Math.random() * 999),
            page: targetPage, type, color: activeHighlightColor,
            text: pendingLaserSelection.text || `Highlighted Passage on Page ${targetPage}`,
            note: extra.note || '',
            attachmentId: extra.attachmentId || '',
            attachmentName: extra.attachmentName || '',
            attachmentMime: extra.attachmentMime || '',
            yNorm: pendingLaserSelection.y,
            rects: [{
                x: pendingLaserSelection.x,
                y: pendingLaserSelection.y,
                w: pendingLaserSelection.w,
                h: pendingLaserSelection.h
            }],
            createdAt: Date.now(), updatedAt: Date.now()
        };

        if (!Array.isArray(activeReaderBook.annotations)) activeReaderBook.annotations = [];
        activeReaderBook.annotations.push(newAnn);
        activeReaderBook.rev = (activeReaderBook.rev || 1) + 1;
        activeReaderBook.lastModified = Date.now();
        activeReaderBook.pendingCloudSync = true;
        saveReaderMeta();

        document.querySelectorAll('.v4-temp-laser-box').forEach(n => n.remove());
        document.getElementById('reader-floating-sel-bar')?.classList.add('hidden');
        pendingLaserSelection = null;

        updateSinglePageSvg(targetPage);
        return newAnn;
    }

    document.querySelectorAll('.hl-color-swatch').forEach(sw => {
        sw.addEventListener('click', (e) => {
            activeHighlightColor = e.currentTarget.getAttribute('data-color') || '#facc15';
            document.querySelectorAll('.hl-color-swatch').forEach(b => b.classList.remove('border-2', 'border-white'));
            e.currentTarget.classList.add('border-2', 'border-white');
            const tempBox = document.querySelector('.v4-temp-laser-box');
            if (tempBox) {
                tempBox.setAttribute('fill', activeHighlightColor);
                tempBox.setAttribute('stroke', activeHighlightColor);
            }
        });
    });

    document.getElementById('close-floating-sel-bar')?.addEventListener('click', () => {
        document.querySelectorAll('.v4-temp-laser-box').forEach(n => n.remove());
        document.getElementById('reader-floating-sel-bar').classList.add('hidden');
    });

    document.getElementById('sel-action-highlight')?.addEventListener('click', () => {
        const saved = commitLaserAnnotation('highlight');
        if (saved) showToast(`🖍️ Highlighted on Page ${saved.page}! (Click any highlight to delete/edit)`);
    });
    document.getElementById('sel-action-bookmark')?.addEventListener('click', () => {
        const saved = commitLaserAnnotation('bookmark');
        if (saved) showToast(`🔖 Page ${saved.page} Bookmarked!`);
    });
    document.getElementById('sel-action-note')?.addEventListener('click', () => {
        const saved = commitLaserAnnotation('note');
        if (saved) openLineItemViewerModal(saved.id);
    });
    document.getElementById('sel-action-attach')?.addEventListener('click', () => {
        const inp = document.getElementById('line-attach-file-input');
        inp.onchange = (ev) => {
            const file = ev.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = async () => {
                const attId = 'att_' + Date.now();
                await idbPut('lineAttachments', { id: attId, name: file.name, mime: file.type, dataUrl: r.result });
                const saved = commitLaserAnnotation('attachment', {
                    attachmentId: attId, attachmentName: file.name, attachmentMime: file.type, note: `Attached: ${file.name}`
                });
                if (saved) showToast(`📎 Attached "${file.name}" to Page ${saved.page}!`);
            };
            r.readAsDataURL(file);
            inp.value = '';
        };
        inp.click();
    });
    document.getElementById('sel-action-todo')?.addEventListener('click', () => {
        if (!pendingLaserSelection || !activeReaderBook) return;
        const p = pendingLaserSelection.page;
        const txt = pendingLaserSelection.text;
        commitLaserAnnotation('highlight');
        const today = getLocalTodayString();
        todos.unshift({
            id: Date.now(), title: `📖 ${activeReaderBook.title} (p.${p}): "${txt.slice(0, 48)}"`,
            completed: false, important: true, myDayDate: today, dueDate: today,
            repeat: { type: 'none' }, steps: [], note: txt, listId: 'tasks',
            bookId: activeReaderBook.id, bookPage: p
        });
        saveTodos(); renderTodos();
        showToast(`☑️ Added Page ${p} to To-Do List!`);
    });
    document.getElementById('sel-action-vault')?.addEventListener('click', () => {
        if (!pendingLaserSelection || !activeReaderBook) return;
        const p = pendingLaserSelection.page;
        const txt = pendingLaserSelection.text;
        commitLaserAnnotation('highlight');
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        tasks.push({
            id: Date.now(), title: `${activeReaderBook.title} (p.${p}): ${txt.slice(0, 55)}`,
            subject: activeTaskSubj || extConfig.customSubjects[0] || 'Physics',
            type: 'revision', completed: false, bookId: activeReaderBook.id, page: p
        });
        safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
        renderTasks(activeTaskTab);
        showToast(`📌 Sent Page ${p} to ${activeTaskSubj} Vault!`);
    });

    /* =========================================================================
       8. LINE NOTE VIEWER, PAGE NAV, READING CLOCK, TOC, TTS & RED SEARCH
       ========================================================================= */
    let activeViewingAnnId = null;
    async function openLineItemViewerModal(annId) {
        if (!activeReaderBook) return;
        const ann = (activeReaderBook.annotations || []).find(a => a.id === annId);
        if (!ann) return;
        activeViewingAnnId = annId;

        document.getElementById('line-viewer-title').textContent = `📝 Page ${ann.page} Annotation`;
        document.getElementById('line-viewer-quote').textContent = `"${ann.text || ''}"`;
        document.getElementById('line-viewer-note-input').value = ann.note || '';

        const attBox = document.getElementById('line-viewer-attachment-box');
        attBox.innerHTML = '';
        if (ann.attachmentId) {
            const att = await idbGet('lineAttachments', ann.attachmentId);
            if (att) {
                attBox.classList.remove('hidden'); attBox.classList.add('flex');
                let html = `<p class="text-xs font-bold text-emerald-400">📎 ${escapeHtml(att.name)}</p>`;
                if ((att.mime || '').startsWith('image/')) html += `<img src="${att.dataUrl}" class="max-h-56 rounded-xl border border-slate-700 object-contain mx-auto">`;
                else if ((att.mime || '').startsWith('audio/')) html += `<audio controls src="${att.dataUrl}" class="w-full mt-1"></audio>`;
                html += `<a href="${att.dataUrl}" download="${escapeHtml(att.name)}" class="bg-slate-800 text-blue-300 text-center py-1.5 rounded-lg text-xs font-bold">⬇️ Download File</a>`;
                attBox.innerHTML = html;
            }
        } else {
            attBox.classList.add('hidden');
        }
        document.getElementById('line-item-viewer-modal').classList.remove('hidden');
    }

    document.getElementById('close-line-viewer-btn')?.addEventListener('click', () => document.getElementById('line-item-viewer-modal').classList.add('hidden'));
    document.getElementById('line-viewer-save-btn')?.addEventListener('click', () => {
        if (!activeReaderBook || !activeViewingAnnId) return;
        const ann = activeReaderBook.annotations.find(a => a.id === activeViewingAnnId);
        if (ann) {
            ann.note = document.getElementById('line-viewer-note-input').value.trim();
            if (ann.note && ann.type === 'highlight') ann.type = 'note';
            ann.updatedAt = Date.now();
            saveReaderMeta();
            updateSinglePageSvg(ann.page);
            showToast("💾 Note saved!");
        }
        document.getElementById('line-item-viewer-modal').classList.add('hidden');
    });
    document.getElementById('line-viewer-delete-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeViewingAnnId) {
            deleteAnnotationTwoWay(activeReaderBook.id, activeViewingAnnId);
            document.getElementById('line-item-viewer-modal').classList.add('hidden');
        }
    });

    window.deleteAnnotationTwoWay = async function(bookId, annId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const idx = (b.annotations || []).findIndex(a => a.id === annId);
        if (idx === -1) return;
        const removed = b.annotations[idx];
        if (removed.attachmentId) await idbDelete('lineAttachments', removed.attachmentId);
        b.annotations.splice(idx, 1);
        if (!Array.isArray(b.deletedAnnotationIds)) b.deletedAnnotationIds = [];
        if (!b.deletedAnnotationIds.includes(annId)) b.deletedAnnotationIds.push(annId);
        if (selectedShapeId === annId) selectedShapeId = null;
        hideClickedItemInspectorBar();
        b.rev = (b.rev || 1) + 1;
        b.lastModified = Date.now();
        b.pendingCloudSync = true;
        saveReaderMeta();
        renderA1GlobalAnnotations();
        if (activeReaderBook && activeReaderBook.id === bookId) {
            updateSinglePageSvg(removed.page || 1);
            renderBookTocAndBookmarksDrawer();
        }
        showToast("🗑️ Highlight / Shape deleted!");
    };

    window.shareAnnotationItem = function(bookId, annId) {
        const b = readerBooks.find(x => x.id === bookId);
        const ann = b?.annotations?.find(a => a.id === annId);
        if (!b || !ann) return;
        const shareText = `📘 ${b.title} (Page ${ann.page})\n"${ann.text || ''}"\n${ann.note ? 'Note: ' + ann.note : ''}`;
        if (navigator.share) navigator.share({ title: b.title, text: shareText }).catch(() => {});
        else { try { navigator.clipboard.writeText(shareText); } catch (e) {} showToast("📋 Copied to clipboard!"); }
    };

    document.getElementById('reader-prev-page-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage > 1) jumpToReaderPage(activeReaderBook.currentPage - 1);
    });
    document.getElementById('reader-next-page-btn')?.addEventListener('click', () => {
        if (activeReaderBook && activeReaderBook.currentPage < activeReaderBook.totalPages) jumpToReaderPage(activeReaderBook.currentPage + 1);
    });
    document.getElementById('reader-page-slider')?.addEventListener('change', (e) => jumpToReaderPage(parseInt(e.target.value) || 1));
    document.getElementById('reader-page-num-input')?.addEventListener('change', (e) => jumpToReaderPage(parseInt(e.target.value) || 1));

    document.getElementById('reader-quick-bookmark-btn')?.addEventListener('click', () => {
        if (!activeReaderBook) return;
        pendingLaserSelection = { page: activeReaderBook.currentPage, x: 0.08, y: 0.06, w: 0.84, h: 0.025, text: `Bookmarked Page ${activeReaderBook.currentPage}` };
        commitLaserAnnotation('bookmark');
        showToast(`🔖 Page ${activeReaderBook.currentPage} Bookmarked!`);
    });

    function startActiveBookReadingClock() {
        clearInterval(activeReadingSessionTimer);
        activeReadingSessionTimer = setInterval(() => {
            if (!activeReaderBook || document.visibilityState !== 'visible') return;
            const today = getLocalTodayString();
            activeReaderBook.readingMins = (activeReaderBook.readingMins || 0) + 1;
            if (!readerReadingLog[today]) readerReadingLog[today] = { totalMins: 0, books: {} };
            readerReadingLog[today].totalMins += 1;
            readerReadingLog[today].books[activeReaderBook.id] = (readerReadingLog[today].books[activeReaderBook.id] || 0) + 1;

            if (!window.isRunning) {
                if (activeReaderBook.category === 'deen') {
                    deenHistory[today] = (deenHistory[today] || 0) + 1;
                    saveExtConfig();
                } else if (activeReaderBook.category === 'study') {
                    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
                    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
                    stats.history[today].mins += 1;
                    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
                }
            }
            updateHeaderAndSliderForCurrentPage(activeReaderBook.currentPage);
            PomoEventBus.emit('reading:minuteLogged', { bookId: activeReaderBook.id });
        }, 60000);
    }

    let activeTocDrawerTab = 'chapters';
    document.getElementById('reader-bottom-toc-btn')?.addEventListener('click', () => {
        document.getElementById('reader-toc-bookmarks-drawer').classList.remove('hidden');
        renderBookTocAndBookmarksDrawer();
    });
    document.getElementById('close-toc-drawer-btn')?.addEventListener('click', () => document.getElementById('reader-toc-bookmarks-drawer').classList.add('hidden'));
    document.querySelectorAll('.toc-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTocDrawerTab = e.currentTarget.getAttribute('data-tab');
            document.querySelectorAll('.toc-tab-btn').forEach(b => b.className = "toc-tab-btn flex-1 bg-transparent text-slate-400 text-xs font-bold py-2 rounded-lg");
            e.currentTarget.className = "toc-tab-btn flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg";
            renderBookTocAndBookmarksDrawer();
        });
    });
    document.getElementById('book-toc-search-input')?.addEventListener('input', renderBookTocAndBookmarksDrawer);

    function renderBookTocAndBookmarksDrawer() {
        const listEl = document.getElementById('book-toc-drawer-list');
        if (!listEl || !activeReaderBook) return;
        const q = (document.getElementById('book-toc-search-input')?.value || '').trim().toLowerCase();
        listEl.innerHTML = '';

        if (activeTocDrawerTab === 'chapters') {
            let chapters = activeReaderBook.outline?.length
                ? activeReaderBook.outline
                : Array.from({ length: activeReaderBook.totalPages }, (_, i) => ({ title: `Page ${i + 1}`, page: i + 1 }));
            if (q) chapters = chapters.filter(c => c.title.toLowerCase().includes(q));
            chapters.forEach(ch => {
                const row = document.createElement('button');
                row.className = "w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-200";
                row.innerHTML = `<span class="truncate pr-2">${escapeHtml(ch.title)}</span><span class="font-mono text-blue-400">p.${ch.page}</span>`;
                row.onclick = () => {
                    document.getElementById('reader-toc-bookmarks-drawer').classList.add('hidden');
                    jumpToReaderPage(ch.page);
                };
                listEl.appendChild(row);
            });
        } else {
            const items = (activeReaderBook.annotations || []).filter(a => !q || `${a.text || ''} ${a.note || ''}`.toLowerCase().includes(q));
            if (!items.length) {
                listEl.innerHTML = `<p class="text-xs text-slate-500 italic text-center p-6">No bookmarks or highlights in this book yet.</p>`;
                return;
            }
            items.forEach(ann => {
                const color = ann.color || '#facc15';
                const card = document.createElement('div');
                card.className = "bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2";
                card.style.borderLeft = `5px solid ${color}`;
                card.innerHTML = `
                    <div class="min-w-0 flex-1 cursor-pointer" onclick="document.getElementById('reader-toc-bookmarks-drawer').classList.add('hidden'); jumpToReaderPage(${ann.page || 1});">
                        <span class="text-[10px] font-mono font-extrabold" style="color:${color}">Page ${ann.page || 1} • ${ann.type.toUpperCase()}</span>
                        <p class="text-xs text-white mt-0.5 line-clamp-2">"${escapeHtml(ann.text || ann.note || ann.shapeType || 'Bookmark')}"</p>
                    </div>
                    <button onclick="deleteAnnotationTwoWay('${activeReaderBook.id}', '${ann.id}')" class="bg-slate-900 text-red-400 px-2 py-1 rounded text-xs">🗑️</button>
                `;
                listEl.appendChild(card);
            });
        }
    }

    async function extractTextOfPage(pageNum) {
        if (!activeReaderBook) return '';
        if (activePdfDoc) {
            try {
                const page = await activePdfDoc.getPage(pageNum);
                const tc = await page.getTextContent();
                return tc.items.map(i => i.str).join(' ');
            } catch (e) { return ''; }
        }
        return activeExtractedPages[pageNum - 1] || '';
    }

    async function startTtsReadingCurrentPage() {
        if (!('speechSynthesis' in window) || !activeReaderBook) return;
        window.speechSynthesis.cancel();
        const text = await extractTextOfPage(activeReaderBook.currentPage);
        if (!text.trim()) { showToast("No digital text layer on this page.", true); return; }
        const bar = document.getElementById('reader-tts-bar');
        bar.classList.remove('hidden'); bar.classList.add('flex');
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = parseFloat(document.getElementById('tts-rate-select')?.value || '1');
        window.speechSynthesis.speak(utt);
    }
    function stopTtsReading() {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        document.getElementById('reader-tts-bar')?.classList.add('hidden');
    }
    document.getElementById('reader-bottom-tts-btn')?.addEventListener('click', startTtsReadingCurrentPage);
    document.getElementById('tts-stop-close-btn')?.addEventListener('click', stopTtsReading);

    document.getElementById('reader-bottom-search-btn')?.addEventListener('click', () => {
        document.getElementById('reader-fullsearch-drawer').classList.remove('hidden');
        document.getElementById('fullbook-search-input').focus();
    });
    document.getElementById('close-fullsearch-drawer-btn')?.addEventListener('click', () => document.getElementById('reader-fullsearch-drawer').classList.add('hidden'));
    document.getElementById('fullbook-search-run-btn')?.addEventListener('click', async () => {
        const q = (document.getElementById('fullbook-search-input')?.value || '').trim();
        const resEl = document.getElementById('fullbook-search-results');
        const stEl = document.getElementById('fullbook-search-status');
        if (!q || !activeReaderBook || !resEl) return;
        resEl.innerHTML = '';
        stEl.textContent = `⏳ Scanning ${activeReaderBook.totalPages} pages...`;
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        let matches = 0;
        for (let p = 1; p <= activeReaderBook.totalPages; p++) {
            const txt = await extractTextOfPage(p);
            const idx = txt.toLowerCase().indexOf(q.toLowerCase());
            if (idx !== -1) {
                matches++;
                const snippet = escapeHtml(txt.slice(Math.max(0, idx - 40), Math.min(txt.length, idx + q.length + 60))).replace(regex, `<span class="text-red-500 font-extrabold underline bg-red-950/60 px-1 rounded">$1</span>`);
                const item = document.createElement('div');
                item.className = "bg-slate-950 hover:bg-slate-900 border border-slate-800 p-3 rounded-xl cursor-pointer";
                item.innerHTML = `<div class="flex justify-between mb-1"><span class="text-[10px] font-mono font-extrabold text-red-400">Page ${p}</span><span class="text-[10px] text-slate-400">Jump ➔</span></div><p class="text-xs text-slate-200">...${snippet}...</p>`;
                item.onclick = () => {
                    document.getElementById('reader-fullsearch-drawer').classList.add('hidden');
                    jumpToReaderPage(p);
                };
                resEl.appendChild(item);
            }
        }
        stEl.innerHTML = `Found <b class="text-red-400">${matches}</b> page(s) matching <span class="text-red-500 font-bold">"${escapeHtml(q)}"</span>.`;
    });

    /* =========================================================================
       9. SETTINGS 1–10 CONTROL CENTER & 3-DOTS MENU
       ========================================================================= */
    let selectedA10Source = 'local';
    let calViewYear = new Date().getFullYear(), calViewMonth = new Date().getMonth();

    function updatePendingSyncBadge() {
        const pending = readerBooks.filter(b => b.pendingCloudSync).length;
        const badge = document.getElementById('pending-sync-count-badge');
        if (badge) badge.textContent = pending;
    }

    function switchA10Panel(panelId) {
        document.querySelectorAll('.a10-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(panelId)?.classList.remove('hidden');
        document.querySelectorAll('.a10-nav-btn').forEach(btn => {
            btn.className = btn.getAttribute('data-panel') === panelId
                ? "a10-nav-btn bg-blue-600 text-white text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 shadow"
                : "a10-nav-btn bg-transparent text-slate-300 hover:bg-slate-900 text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0";
        });
        if (panelId === 'panel-a1') renderA1GlobalAnnotations();
        if (panelId === 'panel-a3-a4-a5') updateMainFolderUI();
        if (panelId === 'panel-a6') renderA6CloudConfig();
        if (panelId === 'panel-a9') renderA9StatsAndClock();
        if (panelId === 'panel-a10') renderA10MyFiles();
    }

    document.querySelectorAll('.a10-nav-btn').forEach(btn => btn.addEventListener('click', (e) => switchA10Panel(e.currentTarget.getAttribute('data-panel'))));
    document.getElementById('reader-general-settings-btn')?.addEventListener('click', () => { document.getElementById('reader-master-settings-modal').classList.remove('hidden'); switchA10Panel('panel-a1'); });
    document.getElementById('shelf-open-a1-hub-btn')?.addEventListener('click', () => { document.getElementById('reader-master-settings-modal').classList.remove('hidden'); switchA10Panel('panel-a1'); });
    document.getElementById('shelf-open-a9-stats-btn')?.addEventListener('click', () => { document.getElementById('reader-master-settings-modal').classList.remove('hidden'); switchA10Panel('panel-a9'); });
    document.getElementById('shelf-open-a10-files-btn')?.addEventListener('click', () => { document.getElementById('reader-master-settings-modal').classList.remove('hidden'); switchA10Panel('panel-a10'); });
    document.getElementById('close-reader-master-settings-btn')?.addEventListener('click', () => document.getElementById('reader-master-settings-modal').classList.add('hidden'));

    function renderA1GlobalAnnotations() {
        const listEl = document.getElementById('a1-global-annotations-list');
        if (!listEl) return;
        const q = (document.getElementById('a1-global-search-input')?.value || '').trim().toLowerCase();
        const typeFilter = document.getElementById('a1-global-type-filter')?.value || 'all';
        const allItems = [];
        readerBooks.forEach(b => {
            (b.annotations || []).forEach(ann => {
                if (typeFilter !== 'all' && ann.type !== typeFilter) return;
                if (q && !`${b.title} ${ann.text || ''} ${ann.note || ''}`.toLowerCase().includes(q)) return;
                allItems.push({ book: b, ann });
            });
        });
        listEl.innerHTML = allItems.length ? '' : `<p class="text-xs text-slate-500 italic text-center p-6">No annotations found.</p>`;
        allItems.forEach(({ book, ann }) => {
            const row = document.createElement('div');
            row.className = "bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-start justify-between gap-3";
            row.style.borderLeft = `5px solid ${ann.color || '#facc15'}`;
            row.innerHTML = `
                <div class="min-w-0 flex-1 cursor-pointer" onclick="document.getElementById('reader-master-settings-modal').classList.add('hidden'); openBookAtPage('${book.id}', ${ann.page || 1});">
                    <span class="text-xs font-extrabold text-white">📘 ${escapeHtml(book.title)} (Page ${ann.page || 1})</span>
                    <p class="text-xs text-slate-300 mt-1">"${escapeHtml(ann.text || ann.note || ann.shapeType || 'Annotation')}"</p>
                </div>
                <button onclick="deleteAnnotationTwoWay('${book.id}', '${ann.id}')" class="text-red-400 text-xs px-2">🗑️</button>
            `;
            listEl.appendChild(row);
        });
    }
    document.getElementById('a1-global-search-input')?.addEventListener('input', renderA1GlobalAnnotations);
    document.getElementById('a1-global-type-filter')?.addEventListener('change', renderA1GlobalAnnotations);

    function renderA6CloudConfig() {
        const grid = document.getElementById('cloud-providers-config-grid');
        if (!grid) return;
        grid.innerHTML = Object.entries(readerSettings.clouds).map(([key, cfg]) => `
            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between"><span class="text-xs font-extrabold text-white">${cfg.icon} ${escapeHtml(cfg.name)}</span><span class="text-[10px] font-bold text-emerald-400">${cfg.connected ? '✅ Ready' : '⭕ Setup'}</span></div>
                <p class="text-[11px] text-slate-400">${escapeHtml(cfg.status || '')}</p>
            </div>
        `).join('');
    }

    function renderA9StatsAndClock() {
        document.getElementById('stat-books-on-shelf').textContent = readerBooks.length;
        document.getElementById('stat-books-completed').textContent = readerBooks.filter(b => (b.progressPct || 0) >= 100).length;
        let allMins = 0;
        Object.values(readerReadingLog).forEach(d => { allMins += (d.totalMins || 0); });
        document.getElementById('stat-total-reading-hours').textContent = `${(allMins / 60).toFixed(1)}h`;
        document.getElementById('stat-6m-reading-hours').textContent = `${(allMins / 60).toFixed(1)}h`;
    }

    function renderA10MyFiles() {
        const grid = document.getElementById('a10-storage-folders-grid');
        if (!grid) return;
        grid.innerHTML = Object.entries(readerSettings.clouds).map(([k, cfg]) => {
            const cnt = readerBooks.filter(b => (b.sources || []).includes(k)).length;
            return `<div class="p-3 rounded-2xl border bg-slate-950 border-slate-800 flex flex-col gap-1"><div class="flex justify-between"><span class="text-lg">${cfg.icon}</span><span class="text-[10px] font-mono text-emerald-400">${cnt} Books</span></div><p class="text-xs font-extrabold text-white">${escapeHtml(cfg.name)}</p></div>`;
        }).join('');
    }

    function applyReaderAppearanceAndLocks() {
        const ov = document.getElementById('reader-fullscreen-overlay');
        const vp = document.getElementById('reader-viewport');
        if (!ov || !vp) return;
        ov.classList.remove('theme-day', 'theme-sepia', 'theme-night', 'theme-amoled');
        ov.classList.add(`theme-${readerSettings.theme || 'night'}`);
        vp.classList.toggle('mode-dual', readerSettings.viewMode === 'dual');
    }

    document.getElementById('reader-more-dots-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('reader-three-dots-menu');
        menu.classList.toggle('hidden'); menu.classList.toggle('flex');
    });

    document.querySelectorAll('.dots-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const sub = e.currentTarget.getAttribute('data-sub');
            document.getElementById('reader-three-dots-menu').classList.add('hidden');
            const modal = document.getElementById('reader-suboptions-modal');
            const titleEl = document.getElementById('suboptions-modal-title');
            const bodyEl = document.getElementById('suboptions-modal-body');

            if (sub === 'sub-pdf-options') {
                titleEl.textContent = "📄 i. PDF Options (View Mode)";
                bodyEl.innerHTML = ['scroll', 'dual', 'single'].map(m => `<button type="button" onclick="window.setReaderViewMode('${m}')" class="w-full p-3 rounded-xl border text-left text-xs font-bold ${readerSettings.viewMode === m ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-300 border-slate-800'}">${m.toUpperCase()} MODE</button>`).join('');
            } else if (sub === 'sub-themes-options') {
                titleEl.textContent = "🎨 Reading Themes";
                bodyEl.innerHTML = ['night', 'amoled', 'sepia', 'day'].map(t => `<button type="button" onclick="window.setReaderTheme('${t}')" class="w-full p-3 rounded-xl border text-left text-xs font-bold ${readerSettings.theme === t ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-300 border-slate-800'}">${t.toUpperCase()} THEME</button>`).join('');
            } else if (sub === 'sub-book-info' && activeReaderBook) {
                titleEl.textContent = "ℹ️ iv. Book Information";
                bodyEl.innerHTML = `<div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs flex flex-col gap-2"><div>Title: <b>${escapeHtml(activeReaderBook.title)}</b></div><div>Genre: <b class="text-amber-300">${escapeHtml(activeReaderBook.shelfName || 'General')}</b></div><div>Page: <b>${activeReaderBook.currentPage} / ${activeReaderBook.totalPages} (${activeReaderBook.progressPct}%)</b></div><div>Annotations: <b>${(activeReaderBook.annotations || []).length}</b></div></div>`;
            } else if (sub === 'sub-share-options' && activeReaderBook) {
                titleEl.textContent = "📤 v. Share & Export Options";
                bodyEl.innerHTML = `
                    <button type="button" onclick="window.sendCompleteAnnotatedBookFile()" class="w-full bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600/50 p-3.5 rounded-2xl text-left flex items-center justify-between">
                        <div><p class="text-xs font-extrabold text-emerald-300">Export Complete Annotated PDF File</p><p class="text-[10px] text-emerald-200/70">Downloads full PDF with baked-in highlights & pencil work</p></div><span>📦</span>
                    </button>
                `;
            } else {
                titleEl.textContent = "🛠️ Reader Controls";
                bodyEl.innerHTML = `<p class="text-xs text-slate-300">All standalone protections and sync rules are active.</p>`;
            }
            modal.classList.remove('hidden');
        });
    });

    window.sendCompleteAnnotatedBookFile = async function() {
        if (!activeReaderBook) return;
        const stored = await idbGet('bookFiles', activeReaderBook.id);
        if (!stored) return;
        const baked = await bakeAnnotationsIntoPdfBytes(activeReaderBook, stored.originalBytes);
        downloadBufferOrDataUrl(baked, `Annotated_${activeReaderBook.fileName}`, 'application/pdf');
        document.getElementById('reader-suboptions-modal').classList.add('hidden');
        showToast("📦 Complete Annotated Book Exported!");
    };

    window.setReaderViewMode = function(m) { readerSettings.viewMode = m; saveReaderMeta(); applyReaderAppearanceAndLocks(); buildBookStageAndObserver(); document.getElementById('reader-suboptions-modal').classList.add('hidden'); };
    window.setReaderTheme = function(t) { readerSettings.theme = t; saveReaderMeta(); applyReaderAppearanceAndLocks(); document.getElementById('reader-suboptions-modal').classList.add('hidden'); };

    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId && activeReaderBook) {
            deleteAnnotationTwoWay(activeReaderBook.id, selectedShapeId);
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && activeReaderBook) {
            window.undoLastReaderAnnotation();
        }
        if (activeReaderBook) {
            if (e.key === 'ArrowRight') jumpToReaderPage(activeReaderBook.currentPage + 1);
            if (e.key === 'ArrowLeft') jumpToReaderPage(activeReaderBook.currentPage - 1);
        }
    });

    PomoEventBus.on('reader:openedTab', renderWoodenShelf);
    PomoEventBus.on('hud:rendered', pushNativeAndroidWidgetPayload);
    mountHomeContinueReadingWidget();
    hydrateBookCoversAndHandles();
})();
