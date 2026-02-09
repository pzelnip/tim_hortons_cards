# Tim Hortons Hockey Cards Checklist

A static single-page app for tracking hockey card collections. Hosted on GitHub Pages at https://pzelnip.github.io/tim_hortons_cards/. No backend — pure HTML/CSS/JS.

## Project Structure

```
docs/
  template.html        # Source of truth for all card set pages
  app.js               # All application logic (rendering, state, sync, events)
  style.css            # All styles (Canadian red theme, progress bar, filters)
  data/
    2026_olympics.json # Card set: 2026 Olympics (200 cards, 7 categories)
    test.json          # Card set: test/demo (41 cards, 3 categories)
  2026_olympics.html   # GENERATED - do not edit directly
  test.html            # GENERATED - do not edit directly
generate.sh            # Copies template.html -> <setname>.html for each data/*.json
new_series.py          # Interactive script to scaffold a new card set JSON file
dev_server.sh          # Starts local server on port 9214
```

## How It Works

### Routing
`docs/app.js:init()` extracts the set name from the URL filename (e.g. `2026_olympics.html` -> `2026_olympics`) and fetches `data/<setname>.json`. The per-set HTML files are identical copies of `docs/template.html` — they exist solely for GitHub Pages URL routing.

### Adding a New Card Set
1. Run `python3 new_series.py` — prompts for series name, slug, and category details, then writes a skeleton `docs/data/<slug>.json` with empty `cards` arrays. For the base category, answer "y" to the base prompt and all fields are auto-filled.
2. Edit the generated JSON to add card names to each category's `cards` array
3. Run `./generate.sh` to create the HTML page
4. Commit the JSON and generated HTML

### Data Format (JSON)
```json
{
  "title": "Display title",
  "categories": [
    {
      "name": "Category Name",
      "tabId": "tab-unique-id",
      "prefix": "XX",
      "showPrefix": true,
      "odds": "1:10",
      "cards": ["Player 1", "Player 2"]
    }
  ]
}
```
- `prefix`: used for checkbox IDs (e.g. `XX-1`). Base cards use `"base"`.
- `showPrefix`: if true, labels show "XX-1 Player Name"; if false, "1 - Player Name"
- `odds`: pull rate string, or `null` for base cards

### State Management
- Checkbox states are bit-packed into a URL-safe base64 hash (1 bit per card)
- URL hash is the shareable state (e.g. `#VnTU0RV0sulk0VEVwASAC0xM3znJ_-A`)
- `encodeState()` / `decodeState()` handle the bit packing
- Priority on load: cloud sync > URL hash > empty state

### Cloud Sync
- Uses [Pantry](https://getpantry.cloud) (free JSON storage API)
- Pantry ID stored in `localStorage` (key: `pantry_id`)
- Basket name is domain+path specific (prevents collisions between local dev and prod)
- Stores `{ "state": "<encoded-hash>" }` in the basket
- Dirty indicator shows unsaved banner + warns on beforeunload

### Key Functions in docs/app.js
- `renderSet(data)` — builds DOM from JSON (tabs, card lists, badges)
- `encodeState()` / `decodeState(hash)` — bit-pack checkbox states to/from base64
- `loadState()` — async, loads from cloud or hash
- `updateCounts()` — recalculates progress for each category + overall bar
- `applySearch()` — filters cards by name (CSS class toggling)
- `openTab(tabId)` — switches category tabs
- `cloudSync()` / `cloudLoad()` / `clearCloudSettings()` — Pantry API operations
- `attachEventListeners()` — all UI event wiring
- `init()` — entry point, determines set name, fetches JSON, orchestrates setup

## Development

Run `./dev_server.sh` to start a local HTTP server (required — `file://` breaks fetch and CORS). Serves from `docs/` and opens `2026_olympics.html` on port 9214.

## GitHub

- Repo: https://github.com/pzelnip/tim_hortons_cards
- Live: https://tinyurl.com/timmyshockey
