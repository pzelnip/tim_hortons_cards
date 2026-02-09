# Cross-Device Cloud Sync — Blob URI Discovery Problem

## Problem Statement

Cloud sync currently requires the user to enter only their jsonstorage.net API key.
On the first device, syncing creates a blob and stores its URI in localStorage.
On a second device (or incognito window), the user enters the same API key, but
there is no blob URI in localStorage — and no way to discover it from the API key
alone. The "Load from Cloud" button stays disabled because no blob URI is known.

**Result**: Cloud sync only works on the device that originally created the blob.
Cross-device sync — the primary goal — doesn't work.

## Root Cause

jsonstorage.net assigns random blob URIs on creation:
- POST to `https://api.jsonstorage.net/v1/json?apiKey={key}` returns
  `{"uri": "https://api.jsonstorage.net/v1/json/{userId}/{itemId}"}`
- Both `userId` and `itemId` are server-assigned, not user-controlled
- There is no endpoint to list blobs by API key
- There is no way to specify a custom key/name for a blob
- You must know the full URI to GET or PUT a blob

## Current Architecture

```
Device A:
  localStorage: { api_key: "abc123", blob_uri: "https://.../{userId}/{itemId}" }
  → can sync (knows the URI)

Device B:
  localStorage: { api_key: "abc123" }
  → cannot load (no blob_uri, no way to discover it)
```

## Constraints

- No server-side component (static GitHub Pages site)
- User should only need to enter one credential
- Free tier services only
- Must work from browser JS (CORS required)
- Staying on jsonstorage.net

## Possible Approaches

### 1. Registry blob pattern

Create a single "registry" blob on first sync that maps set names to data blob
URIs. Store the registry blob URI alongside the API key as a combined "sync code".

```
Registry blob: { "2026_olympics": "https://.../{userId}/{itemId1}",
                 "2025_cardset":  "https://.../{userId}/{itemId2}" }
```

**Problem**: The registry blob URI itself is randomly assigned, so we're back to
the same discovery problem — just one level up. The user would need to transfer
both the API key and the registry URI to the second device.

**Mitigation**: Encode both as a single string the user copies:
`btoa(JSON.stringify({key: "abc123", registry: "https://..."}))`

This is better than two separate fields but violates the "just enter the API key"
requirement.

### 2. Embed blob URI in the API key field

Instead of having the user enter just the API key, have them enter a combined
string that includes both the API key and blob URI. On the first device, after
the first sync, show a "Copy Sync Code" button that produces this combined string.

**UX flow:**
1. Device A: User enters API key → syncs → "Copy Sync Code" button appears
2. Device B: User pastes sync code → API key and blob URI are both extracted

**Tradeoff**: Simple to implement, but the "sync code" is a long opaque string
(API key ~36 chars + blob URI ~80 chars). Not a great experience. Also requires
the user to understand that after first sync they need a different string than
their API key.

### 3. Store blob URI in URL hash / share link

After first sync, include the blob URI in the share link hash alongside the state.
When device B opens the share link, it gets both the state AND the blob URI.

**Problem**: Doesn't help with the "enter API key on device B" flow — only helps
if the user explicitly shares a link. Also bloats the share URL.

### 4. Use the API key to derive a deterministic identifier

Hash the API key + set name to create a predictable string, then store it inside
the blob payload. On device B, iterate... no, we can't iterate blobs.

**Dead end** — jsonstorage.net has no search/filter capability.

## Recommendation

**Approach 2 (sync code)** is the best jsonstorage.net-compatible option. The
tradeoff is that the user copies a longer opaque string instead of just the API
key, but it's a single copy-paste operation and avoids multiple input fields.

Alternatively, **Approach 1 (registry blob)** combined with Approach 2 gives the
best of both: a single sync code that works across all card sets, not just one.
The sync code would encode `{apiKey, registryUri}`, and the registry blob would
map each set name to its data blob URI. Adding a new card set would auto-register
in the registry on first sync.
