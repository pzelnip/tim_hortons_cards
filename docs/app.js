let currentData = null;
let currentSetName = null;

// --- Rendering ---

function renderSet(data) {
    document.getElementById('page-title').textContent = data.title;
    document.title = data.title;

    // Build nav tabs
    const nav = document.getElementById('category-nav');
    data.categories.forEach((cat, i) => {
        const btn = document.createElement('button');
        btn.className = 'filter-seg' + (i === 0 ? ' active' : '');
        btn.dataset.target = cat.tabId;
        btn.dataset.tooltip = `Show ${cat.name} cards`;
        const badge = document.createElement('span');
        badge.className = 'badge';
        btn.appendChild(document.createTextNode(cat.name + ' '));
        btn.appendChild(badge);
        nav.appendChild(btn);
    });

    // Build tab content panels
    const content = document.getElementById('card-content');
    data.categories.forEach((cat, i) => {
        const div = document.createElement('div');
        div.className = 'tab-content' + (i === 0 ? ' active' : '');
        div.id = cat.tabId;

        // Section heading
        const h2 = document.createElement('h2');
        const endNum = cat.cards.length;
        let rangeStr;
        if (cat.showPrefix) {
            rangeStr = cat.prefix + '-1\u2013' + cat.prefix + '-' + endNum;
        } else {
            rangeStr = '1\u2013' + endNum;
        }
        let headingText = cat.name + ' Cards (' + rangeStr + ')';
        if (cat.odds) headingText += ' ' + cat.odds;
        const titleSpan = document.createElement('span');
        titleSpan.textContent = headingText;
        h2.appendChild(titleSpan);
        const countSpan = document.createElement('span');
        countSpan.className = 'count';
        h2.appendChild(countSpan);
        div.appendChild(h2);

        // Card list
        const ul = document.createElement('ul');
        cat.cards.forEach((name, idx) => {
            const num = idx + 1;
            const checkboxId = cat.prefix + '-' + num;
            let labelText;
            if (cat.showPrefix) {
                labelText = cat.prefix + '-' + num + ' ' + name;
            } else {
                labelText = num + ' - ' + name;
            }

            const li = document.createElement('li');
            li.dataset.name = labelText.toLowerCase();
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            label.appendChild(checkbox);
            const numSpan = document.createElement('span');
            // Skins decorate "plain" (unprefixed) numbers, e.g. "#14" or "14 -"
            numSpan.className = cat.showPrefix ? 'card-num' : 'card-num plain';
            numSpan.textContent = cat.showPrefix ? cat.prefix + '-' + num : String(num);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'card-name';
            nameSpan.textContent = name;
            label.appendChild(numSpan);
            label.appendChild(nameSpan);
            li.appendChild(label);
            li.appendChild(buildExtrasControl(labelText));
            ul.appendChild(li);
        });
        div.appendChild(ul);
        const noResults = document.createElement('p');
        noResults.className = 'no-results';
        noResults.textContent = 'No matches found.';
        div.appendChild(noResults);
        content.appendChild(div);
    });
}

// --- Extras (duplicate copies of owned cards) ---

const MAX_EXTRAS = 99;

function buildExtrasControl(labelText) {
    const wrap = document.createElement('span');
    wrap.className = 'extras';
    const sub = document.createElement('button');
    sub.type = 'button';
    sub.className = 'extras-sub';
    sub.textContent = '−';
    sub.setAttribute('aria-label', 'Remove an extra of ' + labelText);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'extras-add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Add an extra of ' + labelText);
    wrap.appendChild(sub);
    wrap.appendChild(add);
    return wrap;
}

function getExtras(cb) {
    return Number(cb.closest('li').dataset.extras || 0);
}

function setExtras(cb, n) {
    const li = cb.closest('li');
    n = Math.max(0, Math.min(MAX_EXTRAS, n));
    li.dataset.extras = n;
    li.classList.toggle('has-extras', n > 0);
    li.querySelector('.extras-add').textContent = n > 0 ? '+' + n : '+';
}

// --- State encode/decode ---
//
// Format: "<owned>" or "<owned>.<extras>", both URL-safe base64.
// <owned> is 1 bit per card. <extras> is only present when some card has
// extras, so hashes without extras keep their original format. It is a list
// of varint pairs: (card index delta from the previous card with extras, count).

function toBase64Url(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
    const binary = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function pushVarint(out, n) {
    while (n >= 0x80) {
        out.push((n & 0x7f) | 0x80);
        n >>>= 7;
    }
    out.push(n);
}

function readVarints(bytes) {
    const values = [];
    let n = 0, shift = 0;
    for (const b of bytes) {
        n |= (b & 0x7f) << shift;
        if (b & 0x80) {
            shift += 7;
        } else {
            values.push(n);
            n = 0;
            shift = 0;
        }
    }
    return values;
}

function encodeState() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const bytes = new Uint8Array(Math.ceil(checkboxes.length / 8));
    const extras = [];
    let prevExtrasIdx = -1;
    checkboxes.forEach((cb, i) => {
        if (cb.checked) bytes[i >> 3] |= (1 << (7 - (i & 7)));
        const n = getExtras(cb);
        if (n > 0) {
            pushVarint(extras, i - prevExtrasIdx);
            pushVarint(extras, n);
            prevExtrasIdx = i;
        }
    });
    const owned = toBase64Url(bytes);
    return extras.length ? owned + '.' + toBase64Url(extras) : owned;
}

function decodeState(hash) {
    const [owned, extras = ''] = hash.split('.');
    const bytes = fromBase64Url(owned);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb, i) => {
        cb.checked = !!(bytes[i >> 3] & (1 << (7 - (i & 7))));
        setExtras(cb, 0);
    });
    const values = readVarints(fromBase64Url(extras));
    let idx = -1;
    for (let i = 0; i + 1 < values.length; i += 2) {
        idx += values[i];
        if (checkboxes[idx]) setExtras(checkboxes[idx], values[i + 1]);
    }
}

async function loadState() {
    const pantryId = localStorage.getItem(PANTRY_ID_LS);
    if (pantryId) {
        try {
            const res = await fetch(pantryBasketUrl(pantryId));
            if (res.ok) {
                const data = await res.json();
                decodeState(data.state);
                lastSyncedState = data.state;
                return;
            }
        } catch (err) {
            console.warn('Cloud load failed:', err.message);
        }
    }

    // Fall back to URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
        decodeState(hash);
    }
}

function updateHash() {
    const encoded = encodeState();
    history.replaceState(null, "", window.location.pathname + window.location.search + "#" + encoded);
}

function updateCounts() {
    let grandTotal = 0;
    let grandChecked = 0;

    document.querySelectorAll('.tab-content').forEach(tab => {
        const list = tab.querySelector('ul');
        const h2 = tab.querySelector('h2');
        if (!list || !h2) return;

        const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        const checked = list.querySelectorAll('input[type="checkbox"]:checked');

        const total = checkboxes.length;
        const checkedCount = checked.length;
        const percent = total === 0 ? 0 : Math.round((checkedCount / total) * 100);

        grandTotal += total;
        grandChecked += checkedCount;

        const countSpan = h2.querySelector(".count");
        if (countSpan) {
            countSpan.textContent = `(${checkedCount}/${total} — ${percent}%)`;
        }

        // Update badge on corresponding tab button
        const navBtn = document.querySelector(`#category-nav .filter-seg[data-target="${tab.id}"]`);
        if (navBtn) {
            const badge = navBtn.querySelector('.badge');
            if (badge) badge.textContent = `${checkedCount}/${total}`;
        }
    });

    // Update progress bar and label
    const overallPercent = grandTotal === 0 ? 0 : Math.round((grandChecked / grandTotal) * 100);
    const progressBar = document.getElementById("progress-bar");
    if (progressBar) progressBar.style.width = overallPercent + "%";
    const progressLabel = document.getElementById("progress-label");
    if (progressLabel) progressLabel.textContent = `${grandChecked}/${grandTotal} (${overallPercent}%)`;
}

// --- Search ---

function applySearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    document.getElementById('search-clear').style.display = query ? 'block' : 'none';

    document.querySelectorAll('#card-content li').forEach(li => {
        if (!query || li.dataset.name.includes(query)) {
            li.classList.remove('search-hidden');
        } else {
            li.classList.add('search-hidden');
        }
    });

    updateNoResults();
}

function updateNoResults() {
    const filterState = document.body.classList.contains('show-unchecked') ? 'unchecked'
        : document.body.classList.contains('show-checked') ? 'checked' : 'all';

    document.querySelectorAll('.tab-content').forEach(tab => {
        const items = tab.querySelectorAll('li');
        const hasVisible = Array.from(items).some(li => {
            if (li.classList.contains('search-hidden')) return false;
            if (filterState === 'unchecked' && li.querySelector('input[type="checkbox"]:checked')) return false;
            if (filterState === 'checked' && li.querySelector('input[type="checkbox"]:not(:checked)')) return false;
            return true;
        });
        tab.querySelector('ul').style.display = hasVisible ? '' : 'none';
        tab.querySelector('.no-results').style.display = hasVisible ? 'none' : 'block';
    });
}

// --- Tab navigation ---

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('#category-nav .filter-seg').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === tabId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Cloud Sync ---

const PANTRY_ID_LS = 'pantry_id';
const PANTRY_BASE = 'https://getpantry.cloud/apiv1/pantry';
let PANTRY_BASKET_NAME = null;
let lastSyncedState = null;

function pantryBasketUrl(pantryId) {
    return PANTRY_BASE + '/' + pantryId + '/basket/' + PANTRY_BASKET_NAME;
}

function setCloudStatus(message, isError = false) {
    const el = document.getElementById('cloud-status');
    el.textContent = message;
    el.style.color = isError ? 'var(--red)' : 'var(--green)';
}

function isCloudDirty() {
    if (lastSyncedState === null) return false;
    return encodeState() !== lastSyncedState;
}

// --- Skins ---
//
// The skin is a per-browser preference kept in localStorage (applied before
// first paint by skins.js). It is not synced to Pantry.

function initSkinUI() {
    const select = document.getElementById('skin-select');
    Object.entries(SKINS).forEach(([id, skin]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = skin.name;
        select.appendChild(option);
    });
    select.value = getLocalSkin();
}

function setSkin(skin) {
    saveLocalSkin(skin);
    applySkin(skin);
}

function updateSyncIndicator() {
    const dirty = isCloudDirty();
    const syncBtn = document.getElementById('sync-btn');
    if (!syncBtn.disabled) {
        syncBtn.textContent = dirty ? 'Sync to Cloud \u2022' : 'Sync to Cloud';
    }
    document.getElementById('cloud-dirty-banner').style.display = dirty ? '' : 'none';
}

function initCloudUI() {
    const pantryId = localStorage.getItem(PANTRY_ID_LS);
    const input = document.getElementById('pantry-id-input');
    const syncBtn = document.getElementById('sync-btn');
    const loadBtn = document.getElementById('load-btn');

    if (pantryId) {
        input.value = pantryId;
        syncBtn.disabled = false;
        loadBtn.disabled = false;
        document.getElementById('clear-cloud-btn').style.display = '';
    }
}

function savePantryId() {
    const id = document.getElementById('pantry-id-input').value.trim();

    if (!id) {
        setCloudStatus('Please enter a Pantry ID.', true);
        return;
    }

    localStorage.setItem(PANTRY_ID_LS, id);
    document.getElementById('sync-btn').disabled = false;
    document.getElementById('load-btn').disabled = false;
    document.getElementById('clear-cloud-btn').style.display = '';
    setCloudStatus('Pantry ID saved.');
}

function showConfirmModal() {
    // Close settings panel so modal gets focus
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('settings-backdrop').classList.remove('open');

    return new Promise(resolve => {
        const overlay = document.getElementById('confirm-modal');
        overlay.style.display = '';
        const yes = document.getElementById('confirm-yes');
        const no = document.getElementById('confirm-no');

        function cleanup(result) {
            overlay.style.display = 'none';
            yes.removeEventListener('click', onYes);
            no.removeEventListener('click', onNo);
            overlay.removeEventListener('click', onOverlay);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        }
        function onYes() { cleanup(true); }
        function onNo() { cleanup(false); }
        function onOverlay(e) { if (e.target === overlay) cleanup(false); }
        function onKey(e) { if (e.key === 'Escape') cleanup(false); }

        yes.addEventListener('click', onYes);
        no.addEventListener('click', onNo);
        overlay.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onKey);
        no.focus();
    });
}

async function clearCloudSettings() {
    if (!await showConfirmModal()) return;

    const pantryId = localStorage.getItem(PANTRY_ID_LS);
    const btn = document.getElementById('clear-cloud-btn');

    btn.disabled = true;
    btn.textContent = 'Clearing...';

    if (pantryId) {
        try {
            const res = await fetch(pantryBasketUrl(pantryId), {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('DELETE failed: ' + res.status);
        } catch (err) {
            console.warn('Failed to delete remote basket:', err.message);
        }
    }

    localStorage.removeItem(PANTRY_ID_LS);
    lastSyncedState = null;
    document.getElementById('pantry-id-input').value = '';
    document.getElementById('sync-btn').disabled = true;
    document.getElementById('load-btn').disabled = true;
    btn.style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Clear Cloud Settings';
    updateSyncIndicator();
    setCloudStatus('Cloud settings cleared.');
}

const SYNC_RETRY_DELAY_SECONDS = 5;
const SYNC_MAX_RETRIES = 3;
const SPINNER_HTML = '<span class="spinner" aria-hidden="true"></span>';
let syncInProgress = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Updates both the settings panel and the unsaved-changes banner sync buttons
function setSyncButtons(label, busy) {
    ['sync-btn', 'banner-sync-btn'].forEach(id => {
        const btn = document.getElementById(id);
        btn.disabled = busy;
        if (busy) {
            btn.innerHTML = SPINNER_HTML;
            btn.appendChild(document.createTextNode(label));
        } else {
            btn.textContent = label;
        }
    });
}

async function cloudSync() {
    const pantryId = localStorage.getItem(PANTRY_ID_LS);

    if (!pantryId) {
        setCloudStatus('No Pantry ID set.', true);
        return;
    }
    if (syncInProgress) return;

    syncInProgress = true;
    setSyncButtons('Syncing...', true);
    setCloudStatus('');

    try {
        for (let attempt = 0; ; attempt++) {
            // Re-encode each attempt so changes made while waiting are included
            const state = encodeState();
            let res = null;
            try {
                res = await fetch(pantryBasketUrl(pantryId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: state }),
                });
            } catch (err) {
                // Pantry's 429 responses lack CORS headers, so a rate limit
                // surfaces here as a network error rather than a readable status
                console.warn('Sync attempt failed:', err.message);
            }
            if (res && res.ok) {
                lastSyncedState = state;
                setCloudStatus('Synced to cloud.');
                return;
            }
            const retryable = !res || res.status === 429;
            if (!retryable || attempt >= SYNC_MAX_RETRIES) {
                throw new Error(res ? 'POST failed: ' + res.status : 'Pantry is unreachable or rate limiting requests.');
            }
            for (let s = SYNC_RETRY_DELAY_SECONDS; s > 0; s--) {
                setSyncButtons('Retrying in ' + s + 's...', true);
                setCloudStatus('Pantry is busy, retrying in ' + s + 's...');
                await sleep(1000);
            }
            setSyncButtons('Syncing...', true);
            setCloudStatus('');
        }
    } catch (err) {
        setCloudStatus('Sync failed: ' + err.message, true);
    } finally {
        syncInProgress = false;
        setSyncButtons('Sync to Cloud', false);
        // Clear Cloud Settings may have been used while retrying
        document.getElementById('sync-btn').disabled = !localStorage.getItem(PANTRY_ID_LS);
        updateSyncIndicator();
    }
}

async function cloudLoad() {
    const pantryId = localStorage.getItem(PANTRY_ID_LS);
    const loadBtn = document.getElementById('load-btn');

    if (!pantryId) {
        setCloudStatus('No Pantry ID set.', true);
        return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading...';
    setCloudStatus('');

    try {
        const res = await fetch(pantryBasketUrl(pantryId));
        if (!res.ok) throw new Error('GET failed: ' + res.status);
        const data = await res.json();
        decodeState(data.state);
        lastSyncedState = data.state;
        updateHash();
        updateCounts();
        updateSyncIndicator();
        setCloudStatus('Loaded from cloud.');
    } catch (err) {
        setCloudStatus('Load failed: ' + err.message, true);
    } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load from Cloud';
    }
}

// --- Export ---

function getActiveFilter() {
    if (document.body.classList.contains('show-unchecked')) return 'unchecked';
    if (document.body.classList.contains('show-checked')) return 'checked';
    return 'all';
}

function buildExportRows() {
    const filter = getActiveFilter();
    const rows = [];
    currentData.categories.forEach(cat => {
        cat.cards.forEach((name, idx) => {
            const num = idx + 1;
            const checkboxId = cat.prefix + '-' + num;
            const cardNumber = cat.showPrefix ? cat.prefix + '-' + num : String(num);
            const cb = document.getElementById(checkboxId);
            const isChecked = cb.checked;
            if (filter === 'checked' && !isChecked) return;
            if (filter === 'unchecked' && isChecked) return;
            const selected = isChecked ? 'Y' : 'N';
            rows.push({ number: cardNumber, category: cat.name, name, selected, extras: String(getExtras(cb)) });
        });
    });
    return rows;
}

function csvEscape(field) {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
}

function exportCards() {
    const format = document.getElementById('export-format').value;
    const rows = buildExportRows();
    let content, filename, mimeType;

    if (format === 'csv') {
        const lines = ['Card Number,Category,Name,Selected,Extras'];
        rows.forEach(r => {
            lines.push([r.number, r.category, r.name, r.selected, r.extras].map(csvEscape).join(','));
        });
        content = lines.join('\n');
        filename = currentSetName + '_checklist.csv';
        mimeType = 'text/csv';
    } else if (format === 'tsv') {
        const lines = ['Card Number\tCategory\tName\tSelected\tExtras'];
        rows.forEach(r => {
            lines.push([r.number, r.category, r.name, r.selected, r.extras].join('\t'));
        });
        content = lines.join('\n');
        filename = currentSetName + '_checklist.tsv';
        mimeType = 'text/tab-separated-values';
    } else if (format === 'markdown') {
        const lines = [
            '| Card Number | Category | Name | Selected | Extras |',
            '| --- | --- | --- | --- | --- |'
        ];
        rows.forEach(r => {
            const esc = s => s.replace(/\|/g, '\\|');
            lines.push('| ' + esc(r.number) + ' | ' + esc(r.category) + ' | ' + esc(r.name) + ' | ' + esc(r.selected) + ' | ' + r.extras + ' |');
        });
        content = lines.join('\n');
        filename = currentSetName + '_checklist.md';
        mimeType = 'text/markdown';
    } else if (format === 'json') {
        const data = rows.map(r => ({
            cardNumber: r.number,
            category: r.category,
            name: r.name,
            selected: r.selected === 'Y',
            extras: Number(r.extras)
        }));
        content = JSON.stringify(data, null, 2);
        filename = currentSetName + '_checklist.json';
        mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Event listeners ---

function attachEventListeners() {
    // Save state and update counts on checkbox changes
    document.addEventListener("change", e => {
        if (e.target.matches('input[type="checkbox"]')) {
            // Extras only make sense for cards you have
            if (!e.target.checked) setExtras(e.target, 0);
            updateHash();
            updateCounts();
            updateNoResults();
            updateSyncIndicator();
        }
    });

    // Extras +/- buttons
    document.getElementById('card-content').addEventListener('click', e => {
        const btn = e.target.closest('.extras-add, .extras-sub');
        if (!btn) return;
        const cb = btn.closest('li').querySelector('input[type="checkbox"]');
        setExtras(cb, getExtras(cb) + (btn.classList.contains('extras-add') ? 1 : -1));
        updateHash();
        updateSyncIndicator();
    });

    // Skin picker
    document.getElementById('skin-select').addEventListener('change', e => setSkin(e.target.value));

    // Copy share link button
    const shareBtn = document.getElementById("share-btn");
    shareBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            shareBtn.textContent = "Copied!";
            setTimeout(() => { shareBtn.textContent = "Copy Share Link"; }, 2000);
        });
    });

    // Clear all selections / Undo
    let previousHash = null;
    const clearBtn = document.getElementById("clear-btn");
    clearBtn.addEventListener("click", () => {
        if (previousHash !== null) {
            decodeState(previousHash);
            updateHash();
            updateCounts();
            updateSyncIndicator();
            previousHash = null;
            clearBtn.textContent = "Clear Selections";
        } else {
            previousHash = encodeState();
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                setExtras(cb, 0);
            });
            updateHash();
            updateCounts();
            updateSyncIndicator();
            clearBtn.textContent = "Undo";
        }
    });

    // Filter segmented control
    document.querySelectorAll('#status-filter .filter-seg').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#status-filter .filter-seg').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.classList.remove('show-unchecked', 'show-checked');
            const filter = btn.dataset.filter;
            if (filter !== 'all') document.body.classList.add('show-' + filter);
            updateNoResults();
            const activeUl = document.querySelector('.tab-content.active ul');
            if (activeUl) {
                activeUl.classList.remove('fade-in');
                void activeUl.offsetWidth;
                activeUl.classList.add('fade-in');
            }
        });
    });

    // Search input
    document.getElementById('search-input').addEventListener('input', applySearch);
    document.getElementById('search-clear').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        applySearch();
        document.getElementById('search-input').focus();
    });

    // Settings panel toggle
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-panel').classList.add('open');
        document.getElementById('settings-backdrop').classList.add('open');
    });
    function closeSettings() {
        document.getElementById('settings-panel').classList.remove('open');
        document.getElementById('settings-backdrop').classList.remove('open');
    }
    document.getElementById('settings-close').addEventListener('click', closeSettings);
    document.getElementById('settings-backdrop').addEventListener('click', closeSettings);

    // Help icon toggle
    const helpIcon = document.querySelector('.help-icon');
    function toggleHelp() {
        document.getElementById('pantry-id-help').classList.toggle('visible');
    }
    helpIcon.addEventListener('click', toggleHelp);
    helpIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleHelp();
        }
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', exportCards);

    // Cloud sync buttons
    document.getElementById('save-pantry-id-btn').addEventListener('click', savePantryId);
    document.getElementById('clear-cloud-btn').addEventListener('click', clearCloudSettings);
    document.getElementById('sync-btn').addEventListener('click', cloudSync);
    document.getElementById('banner-sync-btn').addEventListener('click', cloudSync);
    document.getElementById('load-btn').addEventListener('click', cloudLoad);

    // Warn before leaving with unsynced cloud changes or a sync still retrying
    window.addEventListener('beforeunload', (e) => {
        if (syncInProgress || isCloudDirty()) {
            e.preventDefault();
        }
    });

    // Handle hash changes (e.g. user pastes a new hash in the address bar)
    window.addEventListener("hashchange", () => {
        loadState();
        updateCounts();
    });

    // Category navigation tabs
    document.getElementById('category-nav').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-target]');
        if (btn) openTab(btn.dataset.target);
    });

    // Keyboard navigation for tabs (arrow keys)
    document.getElementById('category-nav').addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const buttons = Array.from(document.querySelectorAll('#category-nav .filter-seg'));
        const current = buttons.indexOf(document.activeElement);
        if (current === -1) return;
        const next = e.key === 'ArrowRight'
            ? (current + 1) % buttons.length
            : (current - 1 + buttons.length) % buttons.length;
        buttons[next].focus();
        openTab(buttons[next].dataset.target);
    });
}

// --- Init ---

async function init() {
    const setName = window.location.pathname.split('/').pop().replace(/\.html$/, '');
    PANTRY_BASKET_NAME = (window.location.host + window.location.pathname)
        .replace(/\.html$/, '')
        .replace(/\//g, '_')
        .replace(/:/g, '-')
        .replace(/\./g, '_');

    const response = await fetch('data/' + setName + '.json');
    if (!response.ok) {
        document.getElementById('page-title').textContent = 'Error: Card set not found';
        return;
    }
    const data = await response.json();
    currentData = data;
    currentSetName = setName;

    renderSet(data);
    initSkinUI();
    await loadState();
    updateHash();
    updateCounts();
    attachEventListeners();
    initCloudUI();
}

init();
