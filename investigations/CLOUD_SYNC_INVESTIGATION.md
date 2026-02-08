# Cloud Sync Investigation (Feb 2026)

## Goal

Replace the URL hash as the sole persistence mechanism for checkbox selections. Currently, every selection change requires re-bookmarking. Want cross-device sync without maintaining a server.

## Current Architecture

- Single HTML file (`2026_olympics.html`), all inline CSS/JS, no dependencies
- 180 checkboxes across 7 card categories
- State encoded as a base64 URL-safe bit array (~32 chars) in the URL hash
- `encodeState()` / `decodeState()` convert between checkboxes and hash
- Hosted on GitHub Pages (static)
- localStorage was previously used but removed in commit `dba1565` due to dual-state confusion between hash and localStorage

## Services Evaluated

### jsonstorage.net - SELECTED
- Free tier: ~512 req/day, 32 KB/request
- CORS: **Working** — `Access-Control-Allow-Origin: *` present on actual GET/POST/PUT responses (verified Feb 2026)
- API key passed as `?apiKey=...` query parameter; required for POST (create) and PUT (update), not needed for GET (read)
- Keys generated at https://app.jsonstorage.net (no account signup, just generate from dashboard)
- POST to `https://api.jsonstorage.net/v1/json?apiKey={key}` → returns `{"uri": ".../{userId}/{itemId}"}`
- GET `/{userId}/{itemId}` → returns stored JSON (no key needed)
- PUT `/{userId}/{itemId}?apiKey={key}` → updates blob
- Approach: each user supplies their own API key via UI, stored in localStorage

### jsonblob.com - BLOCKED: CORS broken
- No auth required for any operation (POST/GET/PUT/DELETE)
- API: `https://jsonblob.com/api/jsonBlob`
  - POST to create (returns blob ID in `X-jsonblob-id` header)
  - GET `/{blobId}` to read
  - PUT `/{blobId}` to update
- Blobs expire after 30 days of inactivity
- **Problem**: CORS is broken. The OPTIONS preflight returns `Access-Control-Allow-Origin: *` but the actual GET/POST/PUT responses do NOT include the header. Browsers block the response.
- Confirmed via `curl -H "Origin: http://localhost:9214"` — 201 response has no ACAO header
- Works fine from curl/server-side, just not from browser JS
### npoint.io - NOT FULLY TESTED
- Has `Access-Control-Allow-Origin: *` on responses
- POST to `https://api.npoint.io` returned 500 during quick test
- May have different create endpoint; needs further investigation
- Has a web editor UI which could be useful

### Services NOT tested but worth trying next
- **extendsclass.com/json-storage.html** — free JSON storage with HTTP API, claims CORS support
- **getpantry.cloud** — free cloud JSON storage API
- **myjson.online** — JSON storage service
- **jsonbin.io** — well-documented, free tier 10K req/month, but requires account + API key (same issue as jsonstorage.net)

## Implementation That Was Built (then reverted)

A working implementation was written and reverted. Key design decisions for whoever picks this up:

### UI Added
- "Save to Cloud" / "Sync to Cloud" button (next to existing Share/Clear buttons)
- "Cloud Settings" collapsible panel with:
  - Cloud ID text field (displays the blob/storage ID)
  - "Copy ID" button
  - "Load from ID" button (for pasting ID from another device)
  - "Disconnect" button (clears localStorage)
- Status message area for feedback

### JS Architecture
- `CLOUD_STORAGE_KEY` in localStorage stores the blob/storage ID
- `cloudCreate()` — POST to create new remote blob, returns ID
- `cloudUpdate(id)` — PUT to update existing blob
- `cloudFetch(id)` — GET to read blob
- `cloudSaveDebounced()` — 1s debounce wrapper around cloudUpdate, called on every checkbox change
- `updateCloudUI()` — syncs button text and input field with stored ID

### State Priority on Page Load
1. URL hash (if present) — authoritative, for share links
2. Cloud storage (if ID in localStorage) — cross-device persistence
3. Blank state — fresh start

### State Payload Format
`{"state": "<base64-encoded-bit-array>"}` — reuses existing `encodeState()` output

### Key Consideration
`loadState()` was made `async` to support the cloud fetch on startup. The init sequence changed from:
```js
loadState();
updateHash();
updateCounts();
```
to:
```js
loadState().then(() => {
    updateHash();
    updateCounts();
    updateCloudUI();
});
```

## What To Do Next

1. Find a free JSON storage service that actually has working browser CORS support (test with `curl -H "Origin: http://localhost:8000"` and verify the ACAO header appears on the actual response, not just OPTIONS)
2. Or: set up a minimal Cloudflare Worker (~20 lines) as a CORS proxy in front of jsonblob.com
3. Or: use a Cloudflare Worker with KV storage directly (free tier: 100K reads/day, 1K writes/day)
4. The UI and JS architecture above can be reused — just swap the API calls

## Testing Notes

- Cannot test CORS from `file://` — must use a local HTTP server (`python3 -m http.server 8000`)
- When testing, verify CORS on the actual response, not just the preflight
