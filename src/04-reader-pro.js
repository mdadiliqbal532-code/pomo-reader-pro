/* =========================================================================
   04-READER-PRO.JS (PHASE 2: ANDROID TOUCH/STYLUS, CRDT WIRELESS SYNC & WIDGETS)
   ========================================================================= */
(function() {
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

    /* =========================================================================
       2. ZERO-CONTRADICTION CRDT WIRELESS BOOK & ANNOTATION SYNC ENGINE
       ========================================================================= */
    // Merges annotations from Desktop & Android by Unique ID + Timestamp + Tombstones
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

        // Manual Genre Priority Lock always wins over automatic categorization
        let finalShelf = newerMeta.shelfName || localBook.shelfName || 'General Shelf';
        let finalLock = Boolean(localBook.manualGenreLock || remoteBook.manualGenreLock);
        if (remoteBook.manualGenreLock && (!localBook.manualGenreLock || rMod >= lMod)) {
            finalShelf = remoteBook.shelfName;
        } else if (localBook.manualGenreLock) {
            finalShelf = localBook.shelfName;
        }

        const mergedSources = Array.from(new Set([...(localBook.sources || []), ...(remoteBook.sources || [])]));

        return {
            ...localBook,
            ...newerMeta,
            id: localBook.id,
            shelfName: finalShelf,
            manualGenreLock: finalLock,
            currentPage: rMod > lMod ? (remoteBook.currentPage || localBook.currentPage) : (localBook.currentPage || remoteBook.currentPage),
            progressPct: Math.max(localBook.progressPct || 0, remoteBook.progressPct || 0),
            readingMins: Math.max(localBook.readingMins || 0, remoteBook.readingMins || 0),
            rev: Math.max(localBook.rev || 1, remoteBook.rev || 1),
            cloudBinaryAvailable: Boolean(localBook.cloudBinaryAvailable || remoteBook.cloudBinaryAvailable),
            dropboxPath: remoteBook.dropboxPath || localBook.dropboxPath || '',
            gdriveFileId: remoteBook.gdriveFileId || localBook.gdriveFileId || '',
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

                const slimBooks = readerBooks.map(b => ({
                    ...b,
                    coverDataUrl: ''
                }));

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

            readerCloudUnsubscribe = ledgerDoc.onSnapshot(async (snap) => {
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
                            if (!readerReadingLog[dateKey]) {
                                readerReadingLog[dateKey] = dayVal;
                            } else {
                                readerReadingLog[dateKey].totalMins = Math.max(readerReadingLog[dateKey].totalMins || 0, dayVal.totalMins || 0);
                            }
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

                    // Live-update open book page if currently reading on this device!
                    if (activeReaderBook) {
                        const updatedActive = readerBooks.find(x => x.id === activeReaderBook.id);
                        if (updatedActive) {
                            activeReaderBook = updatedActive;
                            refreshVisiblePageSvgs();
                            updateHeaderAndSliderForCurrentPage(activeReaderBook.currentPage);
                        }
                    }
                } catch (err) {}
                isApplyingRemoteReaderSync = false;
            });
        } catch (e) {}
    }
    setTimeout(attachWirelessReaderCloudListener, 900);
    document.getElementById('login-sync-btn')?.addEventListener('click', () => setTimeout(attachWirelessReaderCloudListener, 1200));

    // Wireless Book Binary Cloud Relay (Upload Book from PC -> Download on Android via Room ID or Dropbox!)
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
            showToast("Book file is not on this device yet.", true);
            return;
        }
        const bakedBytes = await bakeAnnotationsIntoPdfBytes(b, stored.originalBytes);

        // 1. If Dropbox Token is configured, upload unlimited-size PDF directly to Dropbox App Folder
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
                    showToast(`✅ "${b.title}" synced to Dropbox! Ready to open on Android/PC.`);
                    return;
                }
            } catch (e) {}
        }

        // 2. Built-in Zero-Config Firebase Chunked Binary Vault (For books up to 15 MB)
        const roomId = safeGet('pages_pomodoro_sync_room', '');
        if (!roomId || typeof firebase === 'undefined') {
            showToast("Connect your Cloud Room ID (in Profile -> Cloud) or add a Dropbox Token first!", true);
            return;
        }
        if (bakedBytes.byteLength > 15 * 1024 * 1024) {
            showToast("Book is over 15MB: Add a free Dropbox Token in 'My Files' for large wireless PDF transfers!", true);
            return;
        }

        try {
            showToast(`☁️ Uploading "${b.title}" to Wireless Cloud Room...`);
            const b64 = arrayBufferToBase64(bakedBytes);
            const chunkSize = 650000; // ~650KB per Firestore chunk
            const totalChunks = Math.ceil(b64.length / chunkSize);
            const db = firebase.firestore();
            const binRef = db.collection('artifacts').doc('neettimercloud')
                .collection('public').doc('data')
                .collection('sync_rooms').doc(roomId)
                .collection('reader_binaries').doc(b.id);

            await binRef.set({ fileName: b.fileName, totalChunks, byteLength: bakedBytes.byteLength, updatedAt: Date.now() });
            for (let c = 0; c < totalChunks; c++) {
                const slice = b64.slice(c * chunkSize, (c + 1) * chunkSize);
                await binRef.collection('chunks').doc(String(c)).set({ idx: c, data: slice });
            }
            b.cloudBinaryAvailable = true;
            b.lastModified = Date.now();
            saveReaderMeta();
            showToast(`✅ "${b.title}" uploaded to Wireless Room! Open it on your Android device now.`);
        } catch (err) {
            showToast("Wireless upload interrupted. Check connection.", true);
        }
    };

    window.downloadBookBinaryFromWirelessCloud = async function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return null;

        // 1. Try Dropbox Wireless Download if dropboxPath is present
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
                    showToast(`✅ "${b.title}" downloaded to device!`);
                    return record;
                }
            } catch (e) {}
        }

        // 2. Try Built-in Firebase Wireless Chunked Vault
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
            const fullB64 = chunks.map(c => c.data).join('');
            const arrayBuffer = base64ToArrayBuffer(fullB64);

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
       3. ANDROID & DESKTOP WIDGETS (HOME WIDGET + FLOATING PiP +APK BRIDGE)
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
                    <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold" title="Pop Out Floating Mini Widget">🖼️ PiP Widget</button>
                    <button type="button" onclick="switchPage('page-reader')" class="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">Open Shelf</button>
                </div>
            `;
            return;
        }

        const pct = Math.min(100, Math.round(latest.progressPct || 0));
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
                <button type="button" onclick="window.launchPipMiniCockpitWidget()" class="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-2.5 py-2 rounded-xl text-[10px] font-bold" title="Pop Out Floating Mini-Cockpit Over Other Apps">🖼️ PiP</button>
                <button type="button" onclick="openBookAtPage('${latest.id}', ${latest.currentPage || 1})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow">Resume ➔</button>
            </div>
        `;
    }

    // Floating Picture-in-Picture (PiP) Mini-Cockpit Widget (Stays on top of all windows on Android & Desktop!)
    let pipVideoEl = null;
    let pipCanvasEl = null;
    let pipRenderInterval = null;

    window.launchPipMiniCockpitWidget = async function() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                clearInterval(pipRenderInterval);
                return;
            }
            if (!pipCanvasEl) {
                pipCanvasEl = document.createElement('canvas');
                pipCanvasEl.width = 420;
                pipCanvasEl.height = 220;
                pipVideoEl = document.createElement('video');
                pipVideoEl.muted = true;
                pipVideoEl.playsInline = true;
                pipVideoEl.style.position = 'fixed';
                pipVideoEl.style.width = '1px';
                pipVideoEl.style.height = '1px';
                pipVideoEl.style.opacity = '0.01';
                pipVideoEl.style.pointerEvents = 'none';
                document.body.appendChild(pipVideoEl);
            }

            const drawPipFrame = () => {
                const ctx = pipCanvasEl.getContext('2d');
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, 420, 220);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 4;
                ctx.strokeRect(4, 4, 412, 212);

                const timerStr = document.getElementById('time-display')?.textContent || '00:00';
                const phaseStr = document.getElementById('current-phase-display')?.textContent || 'READY';
                const studyStr = document.getElementById('hud-study-hours-text')?.textContent || '0.0h';
                const salahStr = document.getElementById('salah-score-badge')?.textContent || '0/5';
                const lvStr = document.getElementById('top-rpg-lv-text')?.textContent || 'Lv.0';

                ctx.fillStyle = '#60a5fa';
                ctx.font = 'bold 14px Inter, sans-serif';
                ctx.fillText(`⚡ DEENTIMER PRO  •  ${phaseStr}`, 20, 32);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 64px monospace';
                ctx.fillText(timerStr, 20, 108);

                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 15px monospace';
                ctx.fillText(`🧠 Study: ${studyStr}   🕋 Salah: ${salahStr}   ⚔️ ${lvStr}`, 20, 152);

                const latestBook = readerBooks[0];
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.fillText(latestBook ? `📖 ${latestBook.title.slice(0, 32)} (p.${latestBook.currentPage}/${latestBook.totalPages})` : '📖 Reader Pro Ready', 20, 188);
            };

            drawPipFrame();
            clearInterval(pipRenderInterval);
            pipRenderInterval = setInterval(drawPipFrame, 800);

            if (!pipVideoEl.srcObject) {
                pipVideoEl.srcObject = pipCanvasEl.captureStream(10);
            }
            await pipVideoEl.play();
            await pipVideoEl.requestPictureInPicture();
            showToast("🖼️ Floating Mini-Cockpit Widget Active!");
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
       4. SMART ANDROID TOUCH VS. STYLUS (S-PEN) VS. MOUSE & THUMB DOCK
       ========================================================================= */
    let activeReaderBook = null;
    let activePdfDoc = null;
    let activeExtractedPages = [];
    let readerZoom = 1.0;
    let studioActive = false;
    let studioTool = 'line';
    // touchInteractionMode controls what 1-finger touch does on Android: 'scroll' | 'highlight' | 'draw' | 'select'
    let touchInteractionMode = 'scroll';
    let selectedShapeId = null;
    let activeHighlightColor = '#facc15';
    let pendingLaserSelection = null;
    let pendingTextPlacement = null;
    let activeReadingSessionTimer = null;
    let pageScrollObserver = null;
    const pageTextItemsCache = {};
    const renderedCanvasPages = new Set();

    // Inject Floating One-Handed Android & Desktop Thumb Dock inside #reader-fullscreen-overlay
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
            { id: 'select', icon: '🖐️', label: 'Move' }
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
            <button type="button" onclick="document.getElementById('v4-undo-btn')?.click()" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-[10px] font-bold flex flex-col items-center">
                <span>↩️</span><span>Undo</span>
            </button>
            <button type="button" onclick="window.syncActiveBookWirelessNow()" class="px-2.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-700 text-emerald-300 hover:text-white border border-emerald-600/40 text-[10px] font-bold flex flex-col items-center">
                <span>☁️</span><span>Sync</span>
            </button>
        `;
    }

    window.setReaderTouchMode = function(mode) {
        touchInteractionMode = mode;
        const bar = document.getElementById('reader-pencil-toolbar');
        if (mode === 'draw') {
            studioActive = true;
            if (studioTool === 'select' || studioTool === 'eraser') studioTool = 'pencil';
            bar?.classList.remove('hidden');
            bar?.classList.add('flex');
        } else if (mode === 'select') {
            studioActive = true;
            studioTool = 'select';
            bar?.classList.remove('hidden');
            bar?.classList.add('flex');
        } else {
            studioActive = false;
            bar?.classList.add('hidden');
            bar?.classList.remove('flex');
        }
        renderFloatingReaderThumbDock();
        refreshVisiblePageSvgs();
    };

    window.syncActiveBookWirelessNow = async function() {
        if (!activeReaderBook) return;
        await window.syncSingleBookToAllSources(activeReaderBook.id, false);
        broadcastReaderLedgerToCloud();
    };

    // 2-Finger Pinch-to-Zoom Gesture Support for Android Phones & Tablets
    let pinchStartDist = 0;
    let pinchStartZoom = 1.0;
    const readerVpEl = document.getElementById('reader-viewport');
    readerVpEl?.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            pinchStartDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchStartZoom = readerZoom;
        }
    }, { passive: true });

    readerVpEl?.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && pinchStartDist > 20) {
            const curDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = curDist / pinchStartDist;
            readerZoom = Math.max(0.65, Math.min(2.2, +(pinchStartZoom * ratio).toFixed(2)));
            document.getElementById('reader-zoom-label').textContent = `${Math.round(readerZoom * 100)}%`;
        }
    }, { passive: true });

    readerVpEl?.addEventListener('touchend', (e) => {
        if (pinchStartDist > 20 && e.touches.length < 2) {
            pinchStartDist = 0;
            const curP = activeReaderBook?.currentPage || 1;
            buildBookStageAndObserver().then(() => jumpToReaderPage(curP));
        }
    });

    /* =========================================================================
       5. MANUAL-PRIORITY VS. AUTO BOOK IMPORT ENGINE (A3, A4, A5)
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
            canvas.width = vp.width;
            canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            info.coverDataUrl = canvas.toDataURL('image/jpeg', 0.78);
        } catch (e) {}
        return info;
    }

    function openManualImportPriorityModal() {
        const sel = document.getElementById('v45-import-genre-select');
        const newInp = document.getElementById('v45-import-new-genre-inp');
        if (!sel) {
            document.getElementById('reader-book-file-input').click();
            return;
        }
        if (newInp) newInp.value = '';
        sel.innerHTML = customShelves.map(sh => `<option value="${escapeHtml(sh.name)}" data-cat="${sh.category}">🪵 ${escapeHtml(sh.name)} (${sh.category.toUpperCase()})</option>`).join('');
        document.getElementById('v45-manual-import-modal').classList.remove('hidden');
    }

    document.getElementById('v45-close-manual-import')?.addEventListener('click', () => {
        document.getElementById('v45-manual-import-modal').classList.add('hidden');
    });

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
            await idbPut('bookFiles', {
                id: existing.id,
                originalBytes: arrayBuffer,
                bakedBytes: arrayBuffer,
                extractedPagesText: []
            });
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

        const finalShelfName = (manualChoice && manualChoice.shelfName)
            ? manualChoice.shelfName
            : (isDeenGuess ? 'Quran, Tafseer & Hadith' : (customShelves[0]?.name || 'Core Academic & Exam Prep'));
        const finalCategory = (manualChoice && manualChoice.category)
            ? manualChoice.category
            : (isDeenGuess ? 'deen' : 'study');

        const newBook = {
            id: bookId,
            title: cleanTitle,
            author,
            description: `Imported from ${sourceTag.toUpperCase()} (${(file.size / 1048576).toFixed(2)} MB)`,
            fileName: file.name,
            format: ext,
            fileSize: file.size,
            totalPages,
            currentPage: 1,
            progressPct: 0,
            category: finalCategory,
            shelfName: finalShelfName,
            manualGenreLock: Boolean(manualChoice && manualChoice.isManual),
            favorite: false,
            rating: 5,
            creator,
            producer,
            locationPath: readerSettings.mainFolderName ? `${readerSettings.mainFolderName}/${file.name}` : `${sourceTag.toUpperCase()}://${file.name}`,
            sources: [sourceTag],
            coverDataUrl,
            readingMins: 0,
            dailyTargetMins: 30,
            remindOnTarget: true,
            openMode: 'last',
            autoSync: true,
            manualSyncOnly: false,
            pendingCloudSync: false,
            cloudBinaryAvailable: false,
            rev: 1,
            lastModified: Date.now(),
            lastOpened: Date.now(),
            outline,
            annotations: [],
            deletedAnnotationIds: []
        };

        await idbPut('bookFiles', {
            id: bookId,
            originalBytes: arrayBuffer,
            bakedBytes: arrayBuffer,
            extractedPagesText
        });
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

        showToast(`📥 Importing ${fileList.length} book(s)${choiceToUse ? ` into "${choiceToUse.shelfName}"` : ''}...`);
        let count = 0;
        for (const f of Array.from(fileList)) {
            const added = await importBookFileObject(f, sourceTag, null, choiceToUse);
            if (added) count++;
        }
        renderWoodenShelf();
        renderA9StatsAndClock();
        renderA10MyFiles();
        showToast(`✅ ${count} book(s) ready${choiceToUse ? ` in "${choiceToUse.shelfName}"` : ''}!`);
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
        } catch (e) {
            showToast("Click 'Scan Now' to grant folder read access.", true);
        }
    }

    document.getElementById('shelf-scan-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-select-main-folder-btn')?.addEventListener('click', pickAndScanMainFolder);
    document.getElementById('settings-rescan-main-folder-btn')?.addEventListener('click', () => {
        if (mainDirectoryHandle) scanDirectoryForBooks(mainDirectoryHandle, 'local');
        else pickAndScanMainFolder();
    });
    document.getElementById('reader-folder-fallback-input')?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const rel = e.target.files[0].webkitRelativePath || '';
            if (rel.includes('/')) {
                readerSettings.mainFolderName = rel.split('/')[0];
                saveReaderMeta();
                updateMainFolderUI();
            }
            handleMultipleBookImport(e.target.files, 'local', null);
        }
    });
    document.getElementById('toggle-auto-folder-import-btn')?.addEventListener('click', () => {
        readerSettings.autoFolderImport = !readerSettings.autoFolderImport;
        saveReaderMeta();
        updateMainFolderUI();
    });

    /* =========================================================================
       6. 3D WOODEN BOOKSHELF & CUSTOM GENRE MANAGER
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

    window.selectCustomShelfFilter = function(name) {
        activeCustomShelfFilter = name;
        renderWoodenShelf();
    };
    window.toggleShelfLayoutMode = function() {
        shelfDisplayLayout = shelfDisplayLayout === 'sections' ? 'grid' : 'sections';
        activeCustomShelfFilter = 'all';
        renderWoodenShelf();
    };

    window.deleteGenreShelfByName = function(genreName) {
        window.customShelves = customShelves.filter(s => s.name !== genreName);
        readerBooks.forEach(b => {
            if (b.shelfName === genreName) {
                b.shelfName = customShelves[0]?.name || 'General Shelf';
            }
        });
        if (activeCustomShelfFilter === genreName) activeCustomShelfFilter = 'all';
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`🗑️ Genre "${genreName}" deleted (Books safely kept on shelf)`);
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
            rowsContainer.innerHTML = `<div class="wood-shelf-row py-12 text-center flex flex-col items-center justify-center gap-2"><span class="text-4xl">📚</span><p class="text-sm font-bold text-amber-200">No books in this genre view yet.</p><p class="text-xs text-amber-100/60">Click "➕ Import Books" above (or drag & drop any PDF/EPUB file) to add books!</p></div>`;
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
                            <button type="button" onclick="window.deleteGenreShelfByName('${escapeHtml(shelfName)}')" class="bg-red-950/80 hover:bg-red-700 text-red-300 hover:text-white border border-red-600/40 text-[10px] font-bold px-2 py-1 rounded-lg" title="Delete Genre Shelf">🗑️</button>
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
                const pct = Math.min(100, Math.max(0, Math.round(book.progressPct || 0)));
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
                    <button class="book-corner-menu-btn" title="Book Details, Wireless Sync & Genre" onclick="event.stopPropagation(); window.openBookCornerModal('${book.id}')">⋮</button>
                    <div class="p-2.5 flex flex-col gap-1">
                        <div class="flex items-center gap-1 flex-wrap pr-7">
                            <span class="bg-slate-950/90 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-slate-700 text-white">${catBadge} ${(book.format || 'pdf').toUpperCase()}</span>
                            ${book.cloudBinaryAvailable ? '<span class="bg-cyan-950/90 text-cyan-300 border border-cyan-600/40 text-[8px] font-bold px-1 rounded" title="Available Across Devices Wirelessly">☁️ Wireless</span>' : ''}
                            ${book.favorite ? '<span class="text-xs">❤️</span>' : ''}
                        </div>
                        <button type="button" onclick="event.stopPropagation(); window.openAssignShelfModal('${book.id}')" class="bg-amber-950/90 hover:bg-amber-700 text-amber-300 hover:text-white border border-amber-500/50 text-[9px] font-extrabold px-2 py-0.5 rounded-md w-fit max-w-full truncate flex items-center gap-1" title="Move Book to Another Genre Shelf">
                            <span>🪵 ${escapeHtml(book.shelfName || 'General Shelf')}</span> <span>⇄</span>
                        </button>
                    </div>
                    <div class="p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-1">
                        <h4 class="text-xs font-extrabold text-white line-clamp-2 leading-snug">${escapeHtml(book.title)}</h4>
                        <p class="text-[10px] text-slate-300 truncate">${escapeHtml(book.author || 'Unknown Author')}</p>
                        <div class="flex items-center justify-between text-[10px] font-mono mt-0.5">
                            <span class="text-emerald-400 font-bold">${pct}%</span>
                            <span class="text-slate-400">p.${book.currentPage || 1}/${book.totalPages || 1}</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style="width: ${pct}%"></div>
                        </div>
                        <div class="flex items-center gap-1 mt-1.5 pt-1 border-t border-slate-800/80">
                            <button type="button" onclick="event.stopPropagation(); window.startBookFocusSession('${book.id}')" class="flex-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[9px] font-bold py-1 rounded">⏱️ Focus</button>
                            <button type="button" onclick="event.stopPropagation(); window.uploadBookBinaryToWirelessCloud('${book.id}')" class="flex-1 bg-cyan-600/25 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-[9px] font-bold py-1 rounded" title="Push Book File + Edits to Wireless Cloud Room">☁️ Push</button>
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
            <p class="text-xs text-slate-400">Create custom genres/shelves, add books directly into a genre, or delete any genre anytime.</p>
            <div class="flex gap-2">
                <input type="text" id="new-shelf-inp" placeholder="New Genre / Shelf Name..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                <select id="new-shelf-cat" class="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white font-bold">
                    <option value="study">🧠 Study</option>
                    <option value="deen">🕌 Deen</option>
                    <option value="side">🚀 Life</option>
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
                showToast(`🪵 Genre "${name}" created!`);
            }
        };
    };

    window.deleteCustomShelf = function(idx) {
        const removed = customShelves.splice(idx, 1)[0];
        if (removed) {
            readerBooks.forEach(b => {
                if (b.shelfName === removed.name) b.shelfName = customShelves[0]?.name || 'General Shelf';
            });
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
            showToast(`📘 Moved "${b.title}" to "${shelfName}" (Manual Lock Active)`);
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
            completed: false,
            important: true,
            myDayDate: today,
            dueDate: today,
            repeat: { type: 'none' },
            steps: [],
            note: `Genre: ${b.shelfName || 'General'}`,
            listId: 'tasks',
            bookId: b.id,
            bookPage: b.currentPage || 1
        });
        saveTodos();
        renderTodos();
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
                    completed: false,
                    important: false,
                    myDayDate: today,
                    dueDate: today,
                    repeat: { type: 'none' },
                    steps: [],
                    note: `Genre: ${shelfName}`,
                    listId: listObj.id,
                    bookId: b.id,
                    bookPage: b.currentPage || 1
                });
            }
        });
        saveTodos();
        renderTodoListsBar();
        renderTodos();
        showToast(`☑️ Synced Genre "${shelfName}" to To-Do List!`);
    };

    window.startBookFocusSession = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        const durMins = b.dailyTargetMins || 45;
        schedule.splice(currentStepIndex, 0, {
            id: Date.now(),
            type: 'work',
            category: b.category === 'deen' ? 'deen' : 'study',
            title: `📖 ${b.title}`,
            duration: durMins * 60,
            bookId: b.id
        });
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(currentStepIndex, false);
        startTimer();
        openBookInReader(b.id, b.currentPage || 1);
    };

    // 3-Corner Book Metadata Modal
    window.openBookCornerModal = function(bookId) {
        const b = readerBooks.find(x => x.id === bookId);
        if (!b) return;
        activeCornerBookId = bookId;
        document.getElementById('corner-book-title-input').value = b.title || '';
        document.getElementById('corner-book-author-input').value = b.author || '';
        document.getElementById('corner-book-desc-input').value = b.description || '';
        document.getElementById('corner-book-category-select').value = b.category || 'study';
        document.getElementById('corner-book-source-select').value = (b.sources && b.sources[0]) || 'local';
        const pct = Math.min(100, Math.round(b.progressPct || 0));
        document.getElementById('corner-progress-label').textContent = `${pct}% (${b.currentPage} / ${b.totalPages} pages)`;
        document.getElementById('corner-progress-bar').style.width = `${pct}%`;

        const cov = document.getElementById('corner-modal-cover-preview');
        const cUrl = coverMemoryCache[b.id] || b.coverDataUrl || '';
        if (cUrl) {
            cov.style.backgroundImage = `url('${cUrl}')`;
            cov.textContent = '';
        } else {
            cov.style.backgroundImage = 'none';
            cov.textContent = b.title.slice(0, 18);
        }
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
        saveReaderMeta();
        renderWoodenShelf();
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
                saveReaderMeta();
                window.openBookCornerModal(b.id);
                renderWoodenShelf();
                showToast("🖼️ Custom book cover updated!");
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
                saveReaderMeta();
                window.openBookCornerModal(b.id);
                renderWoodenShelf();
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
        const src = document.getElementById('corner-book-source-select').value;
        if (!b.sources.includes(src)) b.sources.unshift(src);
        b.manualGenreLock = true;
        b.lastModified = Date.now();
        saveReaderMeta();
        renderWoodenShelf();
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
        saveReaderMeta();
        renderWoodenShelf();
        document.getElementById('book-corner-modal').classList.add('hidden');
        showToast("🗑️ Book deleted");
    });
    document.getElementById('corner-add-todo-btn')?.addEventListener('click', () => {
        if (activeCornerBookId) window.quickAddBookToTodo(activeCornerBookId);
    });
    document.getElementById('corner-add-plan-btn')?.addEventListener('click', () => {
        if (activeCornerBookId) window.startBookFocusSession(activeCornerBookId);
    });

    /* =========================================================================
       7. OPEN BOOK IN READER (WITH AUTOMATIC WIRELESS BINARY FETCH IF NEEDED)
       ========================================================================= */
    async function openBookInReader(bookId, forcedPage = null) {
        const book = readerBooks.find(x => x.id === bookId);
        if (!book) { showToast("Book not found on shelf", true); return; }

        let stored = await idbGet('bookFiles', book.id);
        if (!stored || !stored.originalBytes) {
            // Try downloading the binary wirelessly from Cloud Room / Dropbox!
            stored = await window.downloadBookBinaryFromWirelessCloud(book.id);
            if (!stored || !stored.originalBytes) {
                showToast("📲 Click '☁️ Push' on the device where you imported this book, or select the file once to cache it locally.", true);
                return;
            }
        }

        activeReaderBook = book;
        book.lastOpened = Date.now();
        if (forcedPage !== null) {
            book.currentPage = Math.max(1, Math.min(book.totalPages, parseInt(forcedPage) || 1));
        } else if (book.openMode === 'beginning') {
            book.currentPage = 1;
        } else {
            book.currentPage = Math.max(1, Math.min(book.totalPages, book.currentPage || 1));
        }

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

        document.getElementById('reader-fullscreen-overlay').classList.remove('hidden');
        mountFloatingReaderThumbDock();
        applyReaderAppearanceAndLocks();

        document.getElementById('reader-page-slider').max = book.totalPages;
        document.getElementById('reader-page-slider').value = book.currentPage;
        document.getElementById('reader-page-num-input').value = book.currentPage;
        document.getElementById('reader-total-pages-label').textContent = book.totalPages;

        await buildBookStageAndObserver();
        jumpToReaderPage(book.currentPage);
        startActiveBookReadingClock();
        saveReaderMeta();
        renderWoodenShelf();
    }

    // Interactive SVG Pointer Handler: Smart Finger vs. S-Pen Stylus vs. Mouse
    function bindPageInteractiveSvg(pageNum, svg) {
        let mode = null;
        let activeAnnId = null;
        let resizeIdx = 0;
        let resizeCorner = 'br';
        let startNorm = { x: 0, y: 0 };
        let lastNorm = { x: 0, y: 0 };
        let livePoints = [];
        let previewNode = null;

        // If on Android Touch and in 'scroll' mode, allow native 1-finger touch scrolling!
        svg.style.touchAction = (touchInteractionMode === 'scroll' && !studioActive) ? 'pan-y pinch-zoom' : 'none';

        function getNorm(e) {
            const r = svg.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width))),
                y: Math.max(0, Math.min(1, (e.clientY - r.top) / Math.max(1, r.height)))
            };
        }

        svg.onpointerdown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            // SMART ANDROID FINGER SCROLL PROTECTION:
            // If user is touching with a finger ('touch') and Thumb Dock is in 'scroll' mode (and not clicking a shape/handle), let the browser scroll naturally!
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
                return;
            }

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
                    previewNode.setAttribute('x1', startNorm.x * 1000);
                    previewNode.setAttribute('y1', startNorm.y * 1400);
                    previewNode.setAttribute('x2', pt.x * 1000);
                    previewNode.setAttribute('y2', pt.y * 1400);
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
                    activeReaderBook.annotations.push({
                        id: newId,
                        page: pageNum,
                        type: 'drawing',
                        shapeType: studioTool,
                        color,
                        strokeWidth: sw,
                        points: livePoints,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                    selectedShapeId = newId;
                    activeReaderBook.rev = (activeReaderBook.rev || 1) + 1;
                    activeReaderBook.lastModified = Date.now();
                    activeReaderBook.pendingCloudSync = true;
                    saveReaderMeta();
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
                if (dist < 0.006 && mode === 'move') {
                    const ann = activeReaderBook?.annotations?.find(a => a.id === activeAnnId);
                    if (ann && (ann.note || ann.attachmentId)) {
                        openLineItemViewerModal(ann.id);
                    }
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
            page: targetPage,
            type,
            color: activeHighlightColor,
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
            createdAt: Date.now(),
            updatedAt: Date.now()
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
        b.rev = (b.rev || 1) + 1;
        b.lastModified = Date.now();
        b.pendingCloudSync = true;
        saveReaderMeta();
        renderA1GlobalAnnotations();
        if (activeReaderBook && activeReaderBook.id === bookId) {
            updateSinglePageSvg(removed.page || 1);
            renderBookTocAndBookmarksDrawer();
        }
        showToast("🗑️ Deleted annotation across devices");
    };

    function refreshVisiblePageSvgs() {
        document.querySelectorAll('svg.v4-interactive-svg').forEach(svg => {
            const p = parseInt(svg.getAttribute('data-page')) || 1;
            svg.classList.toggle('mode-select', studioActive && studioTool === 'select');
            svg.style.touchAction = (touchInteractionMode === 'scroll' && !studioActive) ? 'pan-y pinch-zoom' : 'none';
            updateSinglePageSvg(p);
        });
        document.getElementById('v4-delete-sel-btn')?.classList.toggle('hidden', !selectedShapeId);
    }

    // Boot Phase 2 Engine
    PomoEventBus.on('reader:openedTab', renderWoodenShelf);
    PomoEventBus.on('hud:rendered', pushNativeAndroidWidgetPayload);
    mountHomeContinueReadingWidget();
    hydrateBookCoversAndHandles();
})();
