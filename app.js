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

function loadState() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        decodeState(hash);
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

    // Show/hide "no matches" message and card list per tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        const hasVisible = tab.querySelector('li:not(.search-hidden)');
        const noMatch = query && !hasVisible;
        tab.querySelector('ul').style.display = noMatch ? 'none' : '';
        tab.querySelector('.no-results').style.display = noMatch ? 'block' : 'none';
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

// --- Event listeners ---

function attachEventListeners() {
    // Save state and update counts on checkbox changes
    document.addEventListener("change", e => {
        if (e.target.matches('input[type="checkbox"]')) {
            saveState();
            updateCounts();
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
    const params = new URLSearchParams(window.location.search);
    const setName = params.get('set') || '2026_olympics';

    const response = await fetch('data/' + setName + '.json');
    if (!response.ok) {
        document.getElementById('page-title').textContent = 'Error: Card set not found';
        return;
    }
    const data = await response.json();

    renderSet(data);
    loadState();
    updateHash();
    updateCounts();
    attachEventListeners();
}

init();
