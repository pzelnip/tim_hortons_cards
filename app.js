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
            label.appendChild(document.createTextNode(' ' + labelText));
            li.appendChild(label);
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

// --- State encode/decode ---

function encodeState() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const bytes = new Uint8Array(Math.ceil(checkboxes.length / 8));
    checkboxes.forEach((cb, i) => {
        if (cb.checked) bytes[i >> 3] |= (1 << (7 - (i & 7)));
    });
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeState(hash) {
    const b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb, i) => {
        cb.checked = !!(bytes[i >> 3] & (1 << (7 - (i & 7))));
    });
}

async function loadState() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        decodeState(hash);
        // Still fetch cloud state to set lastSyncedState for dirty tracking
        const apiKey = localStorage.getItem(JSONSTORAGE_API_KEY_LS);
        const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
        if (apiKey && blobUri) {
            try {
                const res = await fetch(blobUri);
                if (res.ok) {
                    const data = await res.json();
                    lastSyncedState = data.state;
                }
            } catch (err) {
                console.warn('Cloud fetch for sync tracking failed:', err.message);
            }
        }
        return;
    }

    // No hash — try cloud
    const apiKey = localStorage.getItem(JSONSTORAGE_API_KEY_LS);
    const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
    if (apiKey && blobUri) {
        try {
            const res = await fetch(blobUri);
            if (!res.ok) throw new Error('GET failed: ' + res.status);
            const data = await res.json();
            decodeState(data.state);
            lastSyncedState = data.state;
            return;
        } catch (err) {
            console.warn('Cloud load failed:', err.message);
        }
    }
}

function updateHash() {
    const encoded = encodeState();
    history.replaceState(null, "", window.location.pathname + window.location.search + "#" + encoded);
}

function saveState() {
    updateHash();
}

function updateCounts() {
    let grandTotal = 0;
    let grandChecked = 0;

    document.querySelectorAll("h2").forEach(h2 => {
        const list = h2.nextElementSibling;
        if (!list || !["UL", "OL"].includes(list.tagName)) return;

        const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        const checked = list.querySelectorAll('input[type="checkbox"]:checked');

        const total = checkboxes.length;
        const checkedCount = checked.length;
        const percent = total === 0 ? 0 : Math.round((checkedCount / total) * 100);

        grandTotal += total;
        grandChecked += checkedCount;

        let countSpan = h2.querySelector(".count");
        if (!countSpan) {
            countSpan = document.createElement("span");
            countSpan.className = "count";
            h2.appendChild(countSpan);
        }

        countSpan.textContent = `(${checkedCount}/${total} — ${percent}%)`;

        // Update badge on corresponding tab button
        const tabDiv = h2.closest('.tab-content');
        if (tabDiv) {
            const navBtn = document.querySelector(`#category-nav .filter-seg[data-target="${tabDiv.id}"]`);
            if (navBtn) {
                const badge = navBtn.querySelector('.badge');
                if (badge) badge.textContent = `${checkedCount}/${total}`;
            }
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

const JSONSTORAGE_API_KEY_LS = 'jsonstorage_api_key';
let JSONSTORAGE_BLOB_URI_LS = 'jsonstorage_blob_uri';
const JSONSTORAGE_BASE = 'https://api.jsonstorage.net/v1/json';
let lastSyncedState = null;

function isCloudDirty() {
    if (lastSyncedState === null) return false;
    return encodeState() !== lastSyncedState;
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
    const apiKey = localStorage.getItem(JSONSTORAGE_API_KEY_LS);
    const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
    const input = document.getElementById('api-key-input');
    const syncBtn = document.getElementById('sync-btn');
    const loadBtn = document.getElementById('load-btn');

    if (apiKey) {
        input.value = apiKey;
        syncBtn.disabled = false;
        loadBtn.disabled = !blobUri;
        document.getElementById('clear-cloud-btn').style.display = '';
    }
}

function saveApiKey() {
    const input = document.getElementById('api-key-input');
    const key = input.value.trim();
    const status = document.getElementById('cloud-status');

    if (!key) {
        status.textContent = 'Please enter an API key.';
        status.style.color = '#d71920';
        return;
    }

    localStorage.setItem(JSONSTORAGE_API_KEY_LS, key);
    document.getElementById('sync-btn').disabled = false;
    document.getElementById('load-btn').disabled = !localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
    document.getElementById('clear-cloud-btn').style.display = '';
    status.textContent = 'API key saved.';
    status.style.color = '#2a7d2a';
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
            resolve(result);
        }
        function onYes() { cleanup(true); }
        function onNo() { cleanup(false); }
        function onOverlay(e) { if (e.target === overlay) cleanup(false); }

        yes.addEventListener('click', onYes);
        no.addEventListener('click', onNo);
        overlay.addEventListener('click', onOverlay);
    });
}

async function clearCloudSettings() {
    if (!await showConfirmModal()) return;

    const apiKey = localStorage.getItem(JSONSTORAGE_API_KEY_LS);
    const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
    const status = document.getElementById('cloud-status');
    const btn = document.getElementById('clear-cloud-btn');

    btn.disabled = true;
    btn.textContent = 'Clearing...';

    if (apiKey && blobUri) {
        try {
            const res = await fetch(
                blobUri + '?apiKey=' + encodeURIComponent(apiKey),
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('DELETE failed: ' + res.status);
        } catch (err) {
            console.warn('Failed to delete remote blob:', err.message);
        }
    }

    localStorage.removeItem(JSONSTORAGE_API_KEY_LS);
    localStorage.removeItem(JSONSTORAGE_BLOB_URI_LS);
    lastSyncedState = null;
    document.getElementById('api-key-input').value = '';
    document.getElementById('sync-btn').disabled = true;
    document.getElementById('load-btn').disabled = true;
    btn.style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Clear Cloud Settings';
    updateSyncIndicator();
    status.textContent = 'Cloud settings cleared.';
    status.style.color = '#2a7d2a';
}

async function cloudSync() {
    const apiKey = localStorage.getItem(JSONSTORAGE_API_KEY_LS);
    const status = document.getElementById('cloud-status');
    const syncBtn = document.getElementById('sync-btn');

    if (!apiKey) {
        status.textContent = 'No API key set.';
        status.style.color = '#d71920';
        return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    status.textContent = '';

    const state = encodeState();
    const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);

    try {
        if (blobUri) {
            const res = await fetch(blobUri + '?apiKey=' + encodeURIComponent(apiKey), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: state }),
            });
            if (!res.ok) throw new Error('PUT failed: ' + res.status);
            lastSyncedState = state;
            status.textContent = 'Synced to cloud.';
            status.style.color = '#2a7d2a';
        } else {
            const res = await fetch(JSONSTORAGE_BASE + '?apiKey=' + encodeURIComponent(apiKey), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: state }),
            });
            if (!res.ok) throw new Error('POST failed: ' + res.status);
            const data = await res.json();
            localStorage.setItem(JSONSTORAGE_BLOB_URI_LS, data.uri);
            document.getElementById('load-btn').disabled = false;
            lastSyncedState = state;
            status.textContent = 'Synced to cloud.';
            status.style.color = '#2a7d2a';
        }
    } catch (err) {
        status.textContent = 'Sync failed: ' + err.message;
        status.style.color = '#d71920';
    } finally {
        syncBtn.disabled = false;
        updateSyncIndicator();
    }
}

async function cloudLoad() {
    const blobUri = localStorage.getItem(JSONSTORAGE_BLOB_URI_LS);
    const status = document.getElementById('cloud-status');
    const loadBtn = document.getElementById('load-btn');

    if (!blobUri) {
        status.textContent = 'No cloud data found. Sync first.';
        status.style.color = '#d71920';
        return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading...';
    status.textContent = '';

    try {
        const res = await fetch(blobUri);
        if (!res.ok) throw new Error('GET failed: ' + res.status);
        const data = await res.json();
        decodeState(data.state);
        lastSyncedState = data.state;
        saveState();
        updateCounts();
        updateSyncIndicator();
        status.textContent = 'Loaded from cloud.';
        status.style.color = '#2a7d2a';
    } catch (err) {
        status.textContent = 'Load failed: ' + err.message;
        status.style.color = '#d71920';
    } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Load from Cloud';
    }
}

// --- Event listeners ---

function attachEventListeners() {
    // Save state and update counts on checkbox changes
    document.addEventListener("change", e => {
        if (e.target.matches('input[type="checkbox"]')) {
            saveState();
            updateCounts();
            updateNoResults();
            updateSyncIndicator();
        }
    });

    // Copy share link button
    document.getElementById("share-btn").addEventListener("click", () => {
        const btn = document.getElementById("share-btn");
        navigator.clipboard.writeText(window.location.href).then(() => {
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = "Copy Share Link"; }, 2000);
        });
    });

    // Clear all selections / Undo
    let previousHash = null;
    document.getElementById("clear-btn").addEventListener("click", () => {
        const btn = document.getElementById("clear-btn");
        if (previousHash !== null) {
            decodeState(previousHash);
            saveState();
            updateCounts();
            previousHash = null;
            btn.textContent = "Clear Selections";
        } else {
            previousHash = encodeState();
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            saveState();
            updateCounts();
            btn.textContent = "Undo";
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
    document.querySelector('.help-icon').addEventListener('click', () => {
        document.getElementById('api-key-help').classList.toggle('visible');
    });
    document.querySelector('.help-icon').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('api-key-help').classList.toggle('visible');
        }
    });

    // Cloud sync buttons
    document.getElementById('save-api-key-btn').addEventListener('click', saveApiKey);
    document.getElementById('clear-cloud-btn').addEventListener('click', clearCloudSettings);
    document.getElementById('sync-btn').addEventListener('click', cloudSync);
    document.getElementById('banner-sync-btn').addEventListener('click', cloudSync);
    document.getElementById('load-btn').addEventListener('click', cloudLoad);

    // Warn before leaving with unsynced cloud changes
    window.addEventListener('beforeunload', (e) => {
        if (isCloudDirty()) {
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
    JSONSTORAGE_BLOB_URI_LS = 'jsonstorage_blob_uri_' + setName;

    // Migrate legacy unscoped blob URI
    if (!localStorage.getItem(JSONSTORAGE_BLOB_URI_LS)) {
        const legacy = localStorage.getItem('jsonstorage_blob_uri');
        if (legacy) {
            localStorage.setItem(JSONSTORAGE_BLOB_URI_LS, legacy);
            localStorage.removeItem('jsonstorage_blob_uri');
        }
    }

    const response = await fetch('data/' + setName + '.json');
    if (!response.ok) {
        document.getElementById('page-title').textContent = 'Error: Card set not found';
        return;
    }
    const data = await response.json();

    renderSet(data);
    await loadState();
    updateHash();
    updateCounts();
    attachEventListeners();
    initCloudUI();
}

init();
