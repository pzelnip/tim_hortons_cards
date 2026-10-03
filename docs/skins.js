// Skin registry. Loaded synchronously in <head>, right after the
// <link id="skin-css"> tag, so the saved skin is applied before first paint.

const SKINS = {
    classic: { name: 'Classic', href: 'skins/classic.css' },
    rink: { name: 'Rink Night', href: 'skins/rink.css' },
};
const DEFAULT_SKIN = 'classic';
const SKIN_LS = 'skin';
const SKIN_CHANGED_AT_LS = 'skin_changed_at';

function getLocalSkin() {
    try {
        const skin = localStorage.getItem(SKIN_LS);
        return SKINS[skin] ? skin : DEFAULT_SKIN;
    } catch (e) {
        return DEFAULT_SKIN;
    }
}

function getLocalSkinChangedAt() {
    try {
        return Number(localStorage.getItem(SKIN_CHANGED_AT_LS)) || 0;
    } catch (e) {
        return 0;
    }
}

function saveLocalSkin(skin, changedAt) {
    try {
        localStorage.setItem(SKIN_LS, skin);
        localStorage.setItem(SKIN_CHANGED_AT_LS, String(changedAt));
    } catch (e) {
        // Storage unavailable; the skin still applies for this page view
    }
}

function applySkin(skin) {
    if (!SKINS[skin]) skin = DEFAULT_SKIN;
    document.getElementById('skin-css').href = SKINS[skin].href;
    document.documentElement.dataset.skin = skin;
}

applySkin(getLocalSkin());
