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

async function cloudSync() {
    const pantryId = localStorage.getItem(PANTRY_ID_LS);
    const syncBtn = document.getElementById('sync-btn');

    if (!pantryId) {
        setCloudStatus('No Pantry ID set.', true);
        return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = 'Syncing...';
    setCloudStatus('');

    const state = encodeState();

    try {
        const res = await fetch(pantryBasketUrl(pantryId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: state }),
        });
        if (!res.ok) throw new Error('POST failed: ' + res.status);
        lastSyncedState = state;
        setCloudStatus('Synced to cloud.');
    } catch (err) {
        setCloudStatus('Sync failed: ' + err.message, true);
    } finally {
        syncBtn.disabled = false;
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

// --- Event listeners ---

function attachEventListeners() {
    // Save state and update counts on checkbox changes
    document.addEventListener("change", e => {
        if (e.target.matches('input[type="checkbox"]')) {
            updateHash();
            updateCounts();
            updateNoResults();
            updateSyncIndicator();
        }
    });

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
            previousHash = null;
            clearBtn.textContent = "Clear Selections";
        } else {
            previousHash = encodeState();
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            updateHash();
            updateCounts();
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

    // Cloud sync buttons
    document.getElementById('save-pantry-id-btn').addEventListener('click', savePantryId);
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

    renderSet(data);
    await loadState();
    updateHash();
    updateCounts();
    attachEventListeners();
    initCloudUI();
}

init();
