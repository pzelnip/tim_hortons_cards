// Skin registry. Loaded synchronously in <head>, right after the
// <link id="skin-css"> tag, so the saved skin is applied before first paint.

const SKINS = {
    classic: { name: 'Classic', href: 'skins/classic.css' },
    rink: { name: 'Rink Night', href: 'skins/rink.css' },
    cardboard: { name: 'Vintage Cardboard', href: 'skins/cardboard.css' },
    oilcountry: { name: 'Oil Country', href: 'skins/oilcountry.css' },
    geocities: { name: "GeoCities '98", href: 'skins/geocities.css' },
};
const DEFAULT_SKIN = 'classic';
const SKIN_LS = 'skin';

function getLocalSkin() {
    try {
        const skin = localStorage.getItem(SKIN_LS);
        return SKINS[skin] ? skin : DEFAULT_SKIN;
    } catch (e) {
        return DEFAULT_SKIN;
    }
}

function saveLocalSkin(skin) {
    try {
        localStorage.setItem(SKIN_LS, skin);
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
