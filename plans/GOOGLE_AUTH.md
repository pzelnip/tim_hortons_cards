# Google Sign-In Login Gate

## Context

The Tim Hortons card checklist is a static site (GitHub Pages, vanilla JS, no backend). Previously anyone with the URL could view and use the checklist. A Google Sign-In gate was added so users must authenticate with a Google account before seeing the card list UI. Any Google account can sign in -- the login is a gate, not a restriction to specific users.

## Approach: Google Identity Services (GIS)

Uses Google's [Sign In with Google](https://developers.google.com/identity/gsi/web) library. A single `<script>` tag, works entirely client-side in popup mode, requires no backend, and returns a JWT ID token. No additional dependencies beyond the Google-hosted script.

**Alternatives considered:**
- Firebase Auth: ~100KB+ SDK, overkill for this use case
- OAuth 2.0 implicit flow: deprecated by Google; GIS is the replacement

## Google Cloud Console Setup

1. Created a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Navigated to **APIs & Services > Credentials**
3. Created **OAuth client ID** (type: Web application)
4. Added **Authorized JavaScript origins**:
   - `https://pzelnip.github.io` (GitHub Pages)
   - `http://localhost:9214` (local dev)
5. Configured **OAuth consent screen**: External, app name, support email
6. Client ID stored in `app.js` as `GOOGLE_CLIENT_ID`

**Cost: $0** -- Google Identity Services / Sign In with Google is free. No paid APIs are involved. The GIS library handles authentication entirely client-side.

## What Was Changed

### `2026_olympics.html`

- Added GIS script to `<head>`: `<script src="https://accounts.google.com/gsi/client" async defer></script>`
- Added `<div id="login-screen">` before existing content with heading, subtitle, and Google sign-in button container
- Wrapped all existing body content in `<div id="app-content" style="display: none;">`
- Added user bar inside `#app-content` (before `<h1>`) showing avatar, name, and sign-out button

### `style.css`

Added styles for:
- `#login-screen` -- centered flex layout, vertically centered on page
- `#user-bar` -- right-aligned bar with avatar, name, sign-out button
- `#user-avatar` -- small circular image
- `#signout-btn` -- styled to match existing red theme

### `app.js`

Added auth module at the top of the file:

- `GOOGLE_CLIENT_ID` -- OAuth client ID constant
- `AUTH_TOKEN_KEY` -- localStorage key for cached JWT
- `decodeJwtPayload(jwt)` -- decode JWT payload without any library (base64url to JSON)
- `isTokenValid(jwt)` -- check `exp` (not expired), `aud` (matches client ID), `iss` (Google)
- `handleCredentialResponse(response)` -- store JWT in localStorage, show app, trigger `initApp()` if not already initialized
- `showApp(jwt)` -- decode JWT, populate user bar (avatar, name), hide login screen, show app content
- `showLogin()` -- hide app content, show login screen, clear stored token
- `handleSignOut()` -- call `google.accounts.id.disableAutoSelect()`, then `showLogin()`
- `initAuth()` -- initialize GIS with client ID, callback, `auto_select: true`; render sign-in button

Refactored init flow:
- Renamed original `init()` to `initApp()` (existing card-loading logic)
- New `init()` checks for cached valid token in localStorage; if valid, shows app immediately; otherwise shows login screen
- Changed to `window.addEventListener('load', init)` since GIS script loads async
- `appInitialized` flag prevents `initApp()` from running more than once

## Auth Flow

1. Page loads, GIS library loads async
2. `init()` fires on `load` event, calls `initAuth()` to set up GIS
3. Checks localStorage for cached JWT
4. If valid token exists: decode it, populate user bar, show app content, run `initApp()`
5. If no token or expired: show login screen with "Sign In with Google" button
6. On sign-in: Google popup appears, user authenticates, callback receives JWT
7. JWT stored in localStorage, app content revealed
8. On sign-out: `disableAutoSelect()` called, token cleared, login screen shown

## Token Expiration

Google ID tokens expire after ~1 hour.
- On page load/refresh: cached token is validated, login shown if expired
- Mid-session: no action taken -- content is already rendered, no API calls use the token
- `auto_select: true` means returning users often get re-authenticated automatically

## Security Notes

- **Client ID is public**: expected and fine -- Google's security relies on origin restrictions, not client ID secrecy.
- **localStorage token storage**: safe since there are no third-party scripts on the page.
- **Card data JSON remains publicly accessible**: the auth only gates the UI, not the data files.

### No server-side JWT verification

The JWT signature is **not** cryptographically verified. A Google ID token has three parts: header, payload, and signature. Normally a backend server would fetch Google's public keys from `https://www.googleapis.com/oauth2/v3/certs` and verify the signature proves the token was genuinely issued by Google. We skip this because there is no backend.

`isTokenValid()` (app.js:18-26) only checks the payload claims (`exp`, `aud`, `iss`). It does not verify the signature. This means anyone can bypass the login gate by crafting a fake JWT in the browser console:

```js
const fakePayload = btoa(JSON.stringify({
    exp: 9999999999,
    aud: '<client-id>',
    iss: 'https://accounts.google.com',
    name: 'Fake User', email: 'fake@gmail.com', picture: ''
}));
localStorage.setItem('th_auth_token',
    'eyJhbGciOiJSUzI1NiJ9.' + fakePayload + '.fakesig');
location.reload();
```

**Why this is acceptable:** The login gate is cosmetic, not a security boundary. The card data JSON is publicly accessible regardless, and checklist state lives in the URL hash with no private data involved. The gate keeps casual visitors out but does not protect secrets.

**What would be needed for real security:** A backend (even a minimal serverless function) that receives the JWT, verifies the signature against Google's public keys, and only returns protected data if verification passes.
